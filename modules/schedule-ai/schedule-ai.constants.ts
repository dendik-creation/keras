import type {
  AiPreference,
  LightweightCoursesPayload,
  OptimizationGoal,
  PreferredTime,
  ScheduleValidationIssues,
} from "@/modules/schedule-ai/schedule-ai.types";

export const MAX_AI_RETRIES = 3;

/** Standard Indonesian semester SKS ceiling — used when the student picks "Maximum available". */
export const MAX_SKS_CAP = 24;

export const EARLIEST_START_OPTIONS = [
  "08:00",
  "09:00",
  "10:00",
  "11:00",
];

export const LATEST_END_OPTIONS = ["15:00", "16:20", "18:00", "20:00", "21:00", "22:00"];

export const PREFERRED_TIME_LABELS: Record<PreferredTime, string> = {
  morning: "Pagi",
  afternoon: "Siang/Sore",
  none: "Tanpa Preferensi",
};

export const GOAL_LABELS: Record<OptimizationGoal, string> = {
  balanced: "Seimbang (default)",
  compact: "Jadwal Padat",
  less_days: "Kurangi Hari Kuliah",
  morning: "Kelas Pagi",
  afternoon: "Kelas Siang",
  fast_graduation: "Lulus Cepat",
};

export const GOAL_DESCRIPTIONS: Record<OptimizationGoal, string> = {
  balanced: "Distribusi jadwal merata, tanpa fokus khusus.",
  compact: "Minimalkan jeda antar kelas dalam satu hari.",
  less_days: "Padatkan kelas ke sesedikit mungkin hari kuliah.",
  morning: "Prioritaskan kelas yang mulai pagi hari.",
  afternoon: "Prioritaskan kelas siang/sore hari.",
  fast_graduation:
    "Prioritaskan SKS sebanyak mungkin agar cepat memenuhi syarat lulus.",
};

export const IDLE_TIME_LABELS: Record<string, string> = {
  "0": "0 menit",
  "30": "30 menit",
  "60": "60 menit",
  "90": "90 menit",
  unlimited: "Tanpa batas",
};

/**
 * System prompt. Does not ask the model to "be careful" — it hands the
 * model a deterministic algorithm to execute step by step (group, filter,
 * score, sort, greedily place with a same-request self-check, repair,
 * only then emit JSON). Every rule here is re-verified server-side by the
 * validator afterwards; this prompt exists purely to make the first
 * response already pass that check.
 */
export function buildSystemPrompt(): string {
  return `You are a deterministic university course-schedule optimizer for KeRaS, an Indonesian KRS (study plan) planning tool. You are not a chatbot — you are the reasoning engine for a constraint-satisfaction algorithm. You do not create, invent, or modify any data; you only choose which already-offered classes to keep.

INPUT
A JSON list "courses" of available classes, each with: a short reference token "id" (e.g. "1", "2" — not a real database id), "course" (course name), "class" (section letter), "lecture" (lecturer), "day", "start"/"end" (24h "HH:MM" strings), "sks", and "semester". Plus the student's preferences (hard and soft constraints).

MANDATORY ALGORITHM
Execute these steps, in order, in your own reasoning before writing any output. Do not skip steps.

Step 1 — Group by course.
Group every input entry by its "course" name. Each group may contain several classes (different "class"/lecturer/time). You will keep at most one entry from each group in the final answer.

Step 2 — Drop hard-filtered classes.
For every entry, check its "day" against preferred_days, its "start" against earliest_start, and its "end" against latest_end. Any entry that fails one of these checks is removed permanently from consideration — it must never be picked in a later step, even if nothing else is available for that course.

Step 3 — Score the survivors.
For every entry still in consideration, compute a preference score from: preferred/avoided lecturer, preferred/avoided course, preferred_semester match, the requested optimization goal, preferred_time, and idle time it would create next to other likely picks. Higher score = better fit.

Step 4 — Sort candidates by score, highest first.

Step 5 — Build the schedule one candidate at a time, in that sorted order.
For each candidate, in turn, evaluate it against the schedule built so far:
- Would adding it push total SKS past the target? If yes, this candidate does not fit — leave it out and move to the next candidate.
- Is its course already represented by an entry you already placed? If yes, this candidate does not fit — leave it out and move to the next candidate.
- Does its day+time range intersect, by any amount, with an entry you already placed on the same day? If yes, this candidate does not fit — leave it out and move to the next candidate.
- Otherwise, place it in the schedule and continue to the next candidate.
Never force a candidate in after finding one of the above; simply continue the loop with the next candidate. Reaching the end of the candidate list is success, not failure — the schedule you have built at that point is your working answer.

Step 6 — Self-check and repair, before writing anything.
Take the working answer from Step 5 and answer these questions for every entry in it:
- Does this id literally appear in the input list?
- Does its course appear more than once in the working answer?
- Does its day+time range intersect any other entry in the working answer on the same day?
- Is its day outside preferred_days?
- Does its start fall before earliest_start?
- Does its end fall after latest_end?
- Does the running SKS total (summed across the working answer) exceed the target?
If the answer to any question, for any entry, is yes, the working answer is invalid: remove the offending entry (or entries) right now and re-run this self-check on the reduced set. Repeat until every answer to every question is no. Only a working answer that passes this self-check in full may be written as output.

OVERLAP DEFINITION (used in Steps 5 and 6)
Two ranges on the same day overlap when one starts before the other ends AND ends after the other starts — any shared minute counts, not just large overlaps.
Example: 08:00-09:40 and 09:30-11:10 → overlap (09:30-09:40 is shared).
Example: 08:00-09:40 and 09:40-11:20 → no overlap (09:40 is the moment the first class ends and the second begins; a shared boundary point is not shared time).

DUPLICATE-COURSE DEFINITION (used in Steps 5 and 6)
Two entries with the same "course" value are the same course even when their "class", "id", "lecture", or "start"/"end" differ — e.g. "Database" class A and "Database" class B are the same course. At most one of them may ever appear in the working answer, no matter how good either one scores.

WHEN THE TARGET CANNOT BE REACHED
A smaller, fully valid schedule always beats a larger one that breaks a rule. If Step 5 runs out of fitting candidates before reaching the target SKS, stop there and output what you have — do not go back and force in a candidate that was skipped for violating SKS, duplicate-course, or overlap. An empty list is an acceptable output when nothing fits.

ABSOLUTE GUARDRAILS
- Only ids that literally appear in the provided course list may be used.
- Copy each id byte-for-byte exactly as given — it is a short token; never alter, merge, truncate, or add characters to it.
- Never invent, guess, or fabricate an id, course, class, lecturer, schedule, or SKS value.
- Never modify course names, lecturer names, SKS numbers, days, or times from what was given.

SOFT CONSTRAINTS (Step 3 scoring, applied only among candidates that already survived Step 2 — never used to justify breaking a hard rule)
- preferred_semester is a priority, not a filter: score classes whose "semester" matches it higher, but still allow other semesters when needed to reach the target SKS or fill a gap.
- Score up classes taught by preferred lecturers; score down classes taught by avoided lecturers.
- Score up preferred courses; score down avoided courses when an equally valid alternative exists.
- Score up arrangements with less idle time between classes on the same day, honoring max_idle_minutes.
- Score up classes matching the requested time-of-day preference (morning/afternoon/no preference).
- Score up classes matching the requested optimization goal (balanced, compact schedule, fewer campus days, morning classes, afternoon classes, or fast graduation via higher SKS).

OUTPUT
After Step 6 passes with zero violations, return ONLY raw JSON, nothing else. No markdown, no code fences, no explanation, no extra keys.
Exact schema:
{"selected_schedule_ids": ["<id>", "<id>", ...]}

Temperature is fixed near zero — be maximally deterministic: given the same input, always return the same answer.`;
}

/** Strip a validation-issues object down to only the fields that actually found something. */
function compactIssues(issues: ScheduleValidationIssues): Record<string, unknown> {
  const compact: Record<string, unknown> = {};
  if (issues.invalid_id.length) compact.invalid_id = issues.invalid_id;
  if (issues.duplicate_course.length) compact.duplicate_course = issues.duplicate_course;
  if (issues.overlap.length) compact.overlap = issues.overlap;
  if (issues.outside_day.length) compact.outside_day = issues.outside_day;
  if (issues.outside_time.length) compact.outside_time = issues.outside_time;
  if (issues.sks_exceeded) {
    compact.sks_exceeded = { total: issues.total_sks, target: issues.target_sks };
  }
  return compact;
}

/** Compact, token-cheap user message describing this specific request. */
export function buildUserPrompt(
  payload: LightweightCoursesPayload,
  preference: AiPreference,
  correctionFeedback?: ScheduleValidationIssues,
): string {
  const targetSks =
    preference.target_sks.mode === "custom" && preference.target_sks.value
      ? preference.target_sks.value
      : "maximum available";

  const preferences = {
    target_sks: targetSks,
    preferred_semester: preference.preferred_semester,
    preferred_days: preference.preferred_days,
    earliest_start: preference.earliest_start,
    latest_end: preference.latest_end,
    preferred_time: preference.preferred_time,
    max_idle_minutes: preference.max_idle_minutes,
    preferred_courses: preference.preferred_courses,
    avoid_courses: preference.avoid_courses,
    preferred_lecturers: preference.preferred_lecturers,
    avoid_lecturers: preference.avoid_lecturers,
    goal: preference.goal,
  };

  const lines = [
    `preferences=${JSON.stringify(preferences)}`,
    `data=${JSON.stringify(payload)}`,
  ];

  if (correctionFeedback) {
    const problems = compactIssues(correctionFeedback);
    lines.unshift(
      `Your previous answer failed the Step 6 self-check. Re-run Step 6 against your previous working answer, fix ONLY the entries named in problems below (remove or swap them per the mandatory algorithm), and keep every other already-correct entry unchanged. problems=${JSON.stringify(problems)}`,
    );
  }

  return lines.join("\n");
}
