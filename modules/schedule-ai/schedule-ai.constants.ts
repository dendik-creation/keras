import type {
  CompactPayload,
  OptimizationGoal,
  PreferredTime,
  ScheduleValidationIssues,
} from "@/modules/schedule-ai/schedule-ai.types";

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
 * The whole pipeline now makes at most two AI calls: one full "generate"
 * and, only if that's close but not valid, one tiny "repair". Neither may
 * block the deterministic fallback for long — a reverse proxy's idle-read
 * timeout is the real ceiling here, not how thorough the model wants to be.
 */
export const GENERATE_TIMEOUT_MS = 15_000;
export const REPAIR_TIMEOUT_MS = 10_000;

type PromptTier = "full" | "compact" | "ultra";

/** More candidates means a terser, less explanatory system prompt for the one generate call. */
export function pickPromptTier(candidateRows: number): PromptTier {
  if (candidateRows < 20) return "full";
  if (candidateRows < 40) return "compact";
  return "ultra";
}

const SCHEMA_LINE =
  'row=[id,courseId,classId,lecturerId,semesterId,day,start,end,sks]. day: 1=Senin..5=Jumat. start/end: minutes since midnight. courseId/lecturerId/semesterId are opaque tokens — match them by equality against prefs, you don\'t need the real name.';

const HARD_RULES = [
  "pick at most one row per courseId",
  "picked rows must not overlap in time on the same day",
  "total sks must not exceed prefs.sks unless prefs.sks is \"max\"",
  "only use ids that appear in data",
];

const OUTPUT_LINE =
  'Reply with raw JSON only, no markdown, no explanation: {"selected_schedule_ids": ["<id>", ...]}';

/**
 * The candidates you receive are already deterministically filtered and
 * ranked server-side — every row is already a legal option for at least
 * one course. Your only job is preference reasoning: which combination
 * best fits prefs. The server re-validates every hard rule below; a minor
 * violation gets a tiny follow-up repair request instead of you seeing it.
 */
export function buildSystemPrompt(tier: PromptTier = "full"): string {
  if (tier === "ultra") {
    return [
      `KeRaS schedule picker. ${SCHEMA_LINE}`,
      `Hard rules: ${HARD_RULES.join("; ")}.`,
      "Prefer rows matching prefs (semester/lecturer/course/time/goal).",
      OUTPUT_LINE,
    ].join("\n");
  }

  if (tier === "compact") {
    return [
      "You pick the best course schedule for a student from already-filtered, already-ranked candidates.",
      SCHEMA_LINE,
      `Hard rules (server re-checks these): ${HARD_RULES.join("; ")}.`,
      "Among rows that satisfy the hard rules, prefer the combination that best matches prefs: semester, preferred lecturer/course, preferred_time, and the requested goal.",
      OUTPUT_LINE,
    ].join("\n\n");
  }

  return [
    "You are the schedule-selection engine for KeRaS, a course-planning tool. The candidates you receive are already deterministically filtered and ranked by the server — every row is a legal option for at least one course. Your job is preference reasoning, not constraint solving.",
    `Data encoding: ${SCHEMA_LINE}`,
    `Hard rules the server re-checks after you answer: ${HARD_RULES.join("; ")}.`,
    "Among the rows that satisfy the hard rules, prefer the combination that best matches prefs: matching preferred semester, preferred lecturer, preferred course, the requested preferred_time, and the requested optimization goal (balanced, compact schedule, fewer campus days, morning classes, afternoon classes, or maximizing sks for fast_graduation).",
    OUTPUT_LINE,
  ].join("\n\n");
}

/** Strip a validation-issues object down to only the fields that actually found something. */
export function compactIssues(issues: ScheduleValidationIssues): Record<string, unknown> {
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

/** Compact, token-cheap user message: preferences + candidate rows, no repeated keys. */
export function buildUserPrompt(payload: CompactPayload): string {
  return [`prefs=${JSON.stringify(payload.prefs)}`, `data=${JSON.stringify(payload.rows)}`].join(
    "\n",
  );
}

const REPAIR_OUTPUT_LINE =
  'Reply with raw JSON only: {"selected_schedule_ids": ["<id>", ...]} — the repaired list, nothing else.';

/**
 * Fixed, tiny system prompt for the repair call — deliberately not tiered
 * or dataset-size-dependent, since a repair request never carries the
 * candidate rows in the first place.
 */
export function buildRepairSystemPrompt(): string {
  return [
    "You repair an already-selected course schedule for KeRaS. You are given the ids you selected last time and the problems the server found with them.",
    "Remove ONLY the entries responsible for a listed problem. Do not add ids that weren't already selected, do not reconsider other candidates, do not regenerate from scratch — just return the previous list minus the offending entries.",
    REPAIR_OUTPUT_LINE,
  ].join("\n\n");
}

/** <300-token repair request: previously selected short ids + the problems found, nothing else. */
export function buildRepairUserPrompt(
  selectedShortIds: string[],
  issues: ScheduleValidationIssues,
): string {
  return [
    `selected=${JSON.stringify(selectedShortIds)}`,
    `problems=${JSON.stringify(compactIssues(issues))}`,
  ].join("\n");
}
