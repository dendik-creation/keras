import type { CompactPayload, OptimizationGoal, PreferredTime } from "@/modules/schedule-ai/schedule-ai.types";

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
 * The pipeline makes at most one AI call now — a ranking request, not a
 * selection request. The deterministic optimizer runs before and after it
 * (schedule-ai.service.ts) and is what actually builds and validates the
 * schedule, so there's nothing left for the AI to time out on that would
 * lose real work; the timeout just bounds how long a slow provider can hold
 * the request open.
 */
export const GENERATE_TIMEOUT_MS = 15_000;

type PromptTier = "full" | "compact" | "ultra";

/** More candidates means a terser, less explanatory system prompt for the one ranking call. */
export function pickPromptTier(candidateRows: number): PromptTier {
  if (candidateRows < 20) return "full";
  if (candidateRows < 40) return "compact";
  return "ultra";
}

const SCHEMA_LINE =
  'row=[id,courseId,classId,lecturerId,semesterId,day,start,end,sks]. day: 1=Senin..5=Jumat. start/end: minutes since midnight. courseId/lecturerId/semesterId are opaque tokens — match them by equality against prefs, you don\'t need the real name.';

const RANK_OUTPUT_LINE =
  'Reply with raw JSON only, no markdown, no explanation: {"ranked_ids": ["<id>", ...]} — every id you were given, ordered best-to-worst by preference fit. Ids you leave out are treated as least preferred.';

const RANK_CRITERIA = [
  "matches prefs.semester",
  "lecturerId is in prefs.pref_l",
  "courseId is in prefs.pref_c",
  "fits prefs.time / prefs.goal",
];

/**
 * The AI never builds or selects a schedule — it only orders the candidate
 * rows by how well they fit the student's stated preferences. The server's
 * deterministic optimizer (schedule-ai.optimizer.ts) is the only thing that
 * picks a final combination, re-checks every hard rule (no overlaps, no
 * duplicate courses, SKS cap), and decides semester coverage / SKS / active
 * days / idle time — none of which a single ranked row can determine in
 * isolation, so don't ask the model to reason about them.
 */
export function buildSystemPrompt(tier: PromptTier = "full"): string {
  if (tier === "ultra") {
    return [
      `KeRaS preference ranker. ${SCHEMA_LINE}`,
      `Rank rows best-to-worst by: ${RANK_CRITERIA.map((c, i) => `${i + 1}) ${c}`).join("; ")}.`,
      "You are not building a schedule — ignore overlaps, duplicate courses, and SKS totals, the server's optimizer handles those.",
      RANK_OUTPUT_LINE,
    ].join("\n");
  }

  if (tier === "compact") {
    return [
      "You rank course-schedule candidates for KeRaS by how well they fit a student's preferences. You are not choosing which ones end up in the schedule.",
      SCHEMA_LINE,
      `Rank in this order of importance: ${RANK_CRITERIA.map((c, i) => `${i + 1}) ${c}`).join("; ")}.`,
      "Ignore overlaps, duplicate courses, and SKS totals entirely — the server's deterministic optimizer resolves those and only uses your ranking as one input.",
      RANK_OUTPUT_LINE,
    ].join("\n\n");
  }

  return [
    "You are the preference-ranking engine for KeRaS, a course-planning tool. You never build or select a final schedule — the server's deterministic optimizer does that, re-checks every hard rule, and is the only source of truth for whether a schedule is valid. Your only job is to order the given candidate rows by preference fit.",
    `Data encoding: ${SCHEMA_LINE}`,
    [
      `Rank best-to-worst using these criteria in order of importance:`,
      ...RANK_CRITERIA.map((c, i) => `${i + 1}. ${c}`),
    ].join("\n"),
    "Do not reason about overlaps, duplicate courses, active days, idle time, or SKS totals — those are combination-level decisions only the server's optimizer can make, and it ignores anything you say about them.",
    RANK_OUTPUT_LINE,
  ].join("\n\n");
}

/** Compact, token-cheap user message: preferences + candidate rows, no repeated keys. */
export function buildUserPrompt(payload: CompactPayload): string {
  return [`prefs=${JSON.stringify(payload.prefs)}`, `data=${JSON.stringify(payload.rows)}`].join(
    "\n",
  );
}
