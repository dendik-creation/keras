import type {
  AiPreference,
  LightweightCoursesPayload,
  OptimizationGoal,
  PreferredTime,
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
 * Strict system prompt. Forces the model into a single JSON-only output and
 * spells out every hard guardrail — the validator re-checks all of this
 * server-side afterwards, this is just to keep the model on the rails.
 */
export function buildSystemPrompt(): string {
  return `You are a deterministic university course-schedule optimizer for KeRaS, an Indonesian KRS (study plan) planning tool.

ROLE
You choose a subset of already-offered class schedules that best fits a student's stated preferences. You do not create, invent, or modify any data.

INPUT
You receive a JSON list of available classes ("courses"), each with a unique "id" (schedule_id), plus the student's preferences (hard and soft constraints).

ABSOLUTE GUARDRAILS
- Only choose "id" values that literally appear in the provided course list.
- Never invent, guess, or fabricate an id.
- Never invent a course, class, lecturer, schedule, or SKS value that is not in the input.
- Never modify course names, lecturer names, SKS numbers, days, or times.
- Choose only from the provided data — nothing else exists.

HARD CONSTRAINTS (must ALL be satisfied by the final selection)
1. No two selected classes may overlap in time on the same day.
2. No duplicate course: at most one class per unique course.
3. Every selected id must exist in the provided course list.
4. No classes on Saturday or Sunday.
5. If preferred study days are given, only select classes on those days.
6. Every selected class must start at or after the earliest allowed start time.
7. Every selected class must end at or before the latest allowed end time.
8. Total SKS of the selection must not exceed the target SKS.

SOFT CONSTRAINTS (optimize for these, in order of the given goal, without breaking any hard constraint)
- Prefer classes taught by preferred lecturers; avoid classes taught by lecturers to avoid.
- Prefer preferred courses; avoid courses marked "avoid if possible" when an equally valid alternative exists.
- Minimize idle time between classes on the same day, honoring the given maximum idle time.
- Favor the requested time-of-day preference (morning/afternoon/no preference).
- Favor the requested optimization goal (balanced, compact schedule, fewer campus days, morning classes, afternoon classes, or fast graduation via higher SKS).
- When multiple valid selections exist, pick the highest-scoring one against these soft constraints.

FAILURE BEHAVIOR
If no combination of the provided classes can satisfy every hard constraint, return the best partial selection you can that still satisfies all hard constraints (it may be an empty list). Never violate a hard constraint to fit more classes in.

OUTPUT
Return ONLY raw JSON, nothing else. No markdown, no code fences, no explanation, no extra keys.
Exact schema:
{"selected_schedule_ids": ["<id>", "<id>", ...]}

Temperature is fixed near zero — be maximally deterministic: given the same input, always return the same answer.`;
}

/** Compact, token-cheap user message describing this specific request. */
export function buildUserPrompt(
  payload: LightweightCoursesPayload,
  preference: AiPreference,
  correctionHint?: string,
): string {
  const targetSks =
    preference.target_sks.mode === "custom" && preference.target_sks.value
      ? preference.target_sks.value
      : "maximum available";

  const preferences = {
    target_sks: targetSks,
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

  if (correctionHint) {
    lines.unshift(
      `Your previous answer was rejected for this reason: "${correctionHint}". Fix it and answer again, respecting every hard constraint.`,
    );
  }

  return lines.join("\n");
}
