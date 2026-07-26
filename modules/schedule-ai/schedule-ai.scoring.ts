import type { CourseSchedule } from "@/types/course_schedule";
import { MAX_SKS_CAP } from "@/modules/schedule-ai/schedule-ai.constants";
import type { AiPreference, CourseWithSemester } from "@/modules/schedule-ai/schedule-ai.types";
import { timeRangeToMinutes } from "@/modules/schedule-ai/schedule-ai.utils";

/**
 * Single source of truth for "how many SKS is this request targeting" —
 * previously duplicated in the validator and the fallback optimizer.
 */
export function targetSksFor(preference: AiPreference): number {
  return preference.target_sks.mode === "custom" && preference.target_sks.value
    ? preference.target_sks.value
    : MAX_SKS_CAP;
}

/**
 * Below this fraction of target SKS, a result is treated as an
 * under-filled search — not a hard rejection (the optimizer still returns
 * its best finding, there's no better alternative to fall back to), but
 * something logOptimizationSummary flags loudly so it never goes unnoticed.
 */
export const MIN_TARGET_RATIO = 0.8;

/** Same-day half-open time-range overlap check — previously duplicated 3x across the module. */
export function coursesOverlap(
  a: Pick<CourseSchedule, "day" | "hour">,
  b: Pick<CourseSchedule, "day" | "hour">,
): boolean {
  if (a.day !== b.day) return false;
  const ra = timeRangeToMinutes(a.hour);
  const rb = timeRangeToMinutes(b.hour);
  return ra.start < rb.end && ra.end > rb.start;
}

/**
 * Per-class preference facts — never summed into one number. A single class
 * has no "active days" or "idle minutes" of its own (those are properties of
 * the whole combination, see computeScheduleMetrics below); this only
 * captures what one row contributes toward each layer, for use as a search-
 * order heuristic in reduce.ts/optimizer.ts. avoid_lecturers/avoid_courses
 * aren't included because prefilterCourses already removes them outright.
 */
export type ClassObjectives = {
  timeFit: 0 | 1;
  semesterMatch: 0 | 1;
  lecturerMatch: 0 | 1;
  courseMatch: 0 | 1;
};

export function classObjectives(course: CourseWithSemester, preference: AiPreference): ClassObjectives {
  const { start } = timeRangeToMinutes(course.hour);
  const isMorning = start < 12 * 60;
  let timeFit: 0 | 1 = 0;
  if (preference.preferred_time === "morning" && !isMorning) timeFit = 1;
  if (preference.preferred_time === "afternoon" && isMorning) timeFit = 1;

  return {
    timeFit,
    semesterMatch: preference.preferred_semester && course.semester === preference.preferred_semester ? 1 : 0,
    lecturerMatch: preference.preferred_lecturers.includes(course.lecture) ? 1 : 0,
    courseMatch: preference.preferred_courses.includes(course.code) ? 1 : 0,
  };
}

/** Whole-combination objective values — this is what the decision hierarchy actually compares. */
export type ScheduleMetrics = {
  semesterMatchCount: number;
  semesterSks: number;
  totalSks: number;
  conflictCount: number;
  activeDays: number;
  timeViolations: number;
  finishTime: number;
  startTime: number;
  idleMinutes: number;
  lecturerMatchCount: number;
  courseMatchCount: number;
  aiRankScore: number;
};

/**
 * Reduces a chosen set of classes to the numbers the lexicographic
 * comparator below reads. Called on every backtracking node, so it stays a
 * single pass over `chosen` rather than N passes per metric.
 *
 * `aiRank` is the optional AI preference ordering (schedule_id -> rank
 * position, lower = more preferred) — the AI never selects a final schedule
 * anymore (see schedule-ai.service.ts), it only ranks candidates, and that
 * ranking only ever acts as the lowest-priority tie-break below.
 */
export function computeScheduleMetrics(
  chosen: CourseWithSemester[],
  preference: AiPreference,
  aiRank?: Map<string, number>,
): ScheduleMetrics {
  const byDay = new Map<string, { start: number; end: number }[]>();
  let timeViolations = 0;
  let semesterMatchCount = 0;
  let semesterSks = 0;
  let lecturerMatchCount = 0;
  let courseMatchCount = 0;
  let totalSks = 0;
  let startTime = Infinity;
  let finishTime = 0;
  let aiRankScore = 0;

  for (const course of chosen) {
    const { start, end } = timeRangeToMinutes(course.hour);
    if (start < startTime) startTime = start;
    if (end > finishTime) finishTime = end;

    const bucket = byDay.get(course.day);
    if (bucket) bucket.push({ start, end });
    else byDay.set(course.day, [{ start, end }]);

    const { timeFit, semesterMatch, lecturerMatch, courseMatch } = classObjectives(course, preference);
    timeViolations += timeFit;

    const sks = Number(course.sks) || 0;
    totalSks += sks;
    if (semesterMatch) {
      semesterMatchCount++;
      semesterSks += sks;
    }
    lecturerMatchCount += lecturerMatch;
    courseMatchCount += courseMatch;

    if (aiRank) aiRankScore += aiRank.get(course.schedule_id) ?? aiRank.size;
  }

  let idleMinutes = 0;
  let conflictCount = 0;
  for (const slots of byDay.values()) {
    slots.sort((a, b) => a.start - b.start);
    for (let i = 1; i < slots.length; i++) {
      const gap = slots[i].start - slots[i - 1].end;
      if (gap > 0) idleMinutes += gap;
      else if (gap < 0) conflictCount++; // defensive — construction should never produce this, but "fewer conflicts (must always be zero)" is a real comparator layer, not an assumption.
    }
  }

  return {
    semesterMatchCount,
    semesterSks,
    totalSks,
    conflictCount,
    activeDays: byDay.size,
    timeViolations,
    finishTime,
    startTime: startTime === Infinity ? 0 : startTime,
    idleMinutes,
    lecturerMatchCount,
    courseMatchCount,
    aiRankScore,
  };
}

type LayerKey =
  | "semester"
  | "sks"
  | "conflicts"
  | "activeDays"
  | "timeWindow"
  | "idle"
  | "lecturer"
  | "course"
  | "aiRank";

/**
 * Exact priority order: academic quality (preferred semester, then how much
 * SKS got scheduled) always outranks schedule shape (active days, idle
 * time). A perfect 1-day 2-SKS schedule loses to a 3-day 24-SKS one — this
 * is the fix for the fallback returning near-empty schedules from a
 * completed semester instead of maximizing feasible credits.
 */
const BASE_LAYER_ORDER: LayerKey[] = [
  "semester",
  "sks",
  "conflicts",
  "activeDays",
  "timeWindow",
  "idle",
  "lecturer",
  "course",
  "aiRank",
];

/**
 * Goal only reorders the schedule-shape layers (activeDays/timeWindow/idle)
 * — it never gets to outrank semester coverage or total SKS, and it never
 * needs to: fast_graduation's "maximize SKS in preferred semester" is
 * already exactly what layers 1-2 do unconditionally now.
 */
function goalLayerOrder(goal: AiPreference["goal"]): LayerKey[] {
  if (goal === "compact") {
    return ["semester", "sks", "conflicts", "activeDays", "idle", "timeWindow", "lecturer", "course", "aiRank"];
  }
  return BASE_LAYER_ORDER;
}

/** Lower is always better for every layer value below, regardless of what it represents. */
function layerValue(key: LayerKey, m: ScheduleMetrics, preference: AiPreference): number {
  switch (key) {
    case "semester":
      return -m.semesterMatchCount;
    case "sks":
      return -m.totalSks;
    case "conflicts":
      return m.conflictCount;
    case "activeDays":
      return m.activeDays;
    case "timeWindow":
      if (preference.goal === "morning") return m.finishTime;
      if (preference.goal === "afternoon") return -m.startTime;
      return m.timeViolations;
    case "idle":
      return m.idleMinutes;
    case "lecturer":
      return -m.lecturerMatchCount;
    case "course":
      return -m.courseMatchCount;
    case "aiRank":
      return m.aiRankScore;
  }
}

/**
 * Lexicographic comparator: the decision engine. Walks the layers in
 * priority order and returns on the first layer that differs — a
 * lecturer-preference win can never compensate for a semester-coverage or
 * total-SKS loss. Negative means `a` is better. The deterministic optimizer
 * is the only engine that runs this now (schedule-ai.service.ts) — the AI
 * never picks a final schedule, so there's no second engine to keep in sync.
 */
export function compareScheduleMetrics(
  a: ScheduleMetrics,
  b: ScheduleMetrics,
  preference: AiPreference,
): number {
  for (const key of goalLayerOrder(preference.goal)) {
    const va = layerValue(key, a, preference);
    const vb = layerValue(key, b, preference);
    if (va !== vb) return va < vb ? -1 : 1;
  }

  // Equivalent under every layer — tie-break per the "Tie Breaking" rules: more SKS (already equal here in practice), earlier finish, then lecturer fit.
  if (a.finishTime !== b.finishTime) return a.finishTime < b.finishTime ? -1 : 1;
  if (a.lecturerMatchCount !== b.lecturerMatchCount) return a.lecturerMatchCount > b.lecturerMatchCount ? -1 : 1;
  return 0;
}
