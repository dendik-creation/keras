import type { CourseSchedule } from "@/types/course_schedule";
import { MAX_SKS_CAP } from "@/modules/schedule-ai/schedule-ai.constants";
import type { AiPreference, CourseWithSemester } from "@/modules/schedule-ai/schedule-ai.types";
import { timeRangeToMinutes } from "@/modules/schedule-ai/schedule-ai.utils";

/**
 * Last-resort deterministic scheduler. Runs only when the AI exhausts its
 * retries — it never talks to the LLM and can never violate a hard
 * constraint by construction, so it exists to guarantee the user almost
 * never sees an outright failure. It optimizes the same soft-preference
 * score the prompt asks the model for, just with a plain greedy +
 * backtracking search instead of an LLM call.
 */

const CALL_BUDGET = 200_000;

function targetSksFor(preference: AiPreference): number {
  return preference.target_sks.mode === "custom" && preference.target_sks.value
    ? preference.target_sks.value
    : MAX_SKS_CAP;
}

function scoreClass(course: CourseWithSemester, preference: AiPreference): number {
  let score = 0;
  if (preference.preferred_lecturers.includes(course.lecture)) score += 5;
  if (preference.avoid_lecturers.includes(course.lecture)) score -= 5;
  if (preference.preferred_courses.includes(course.code)) score += 5;
  if (preference.avoid_courses.includes(course.code)) score -= 5;
  if (preference.preferred_semester && course.semester === preference.preferred_semester) {
    score += 3;
  }

  const { start } = timeRangeToMinutes(course.hour);
  const isMorning = start < 12 * 60;
  if (preference.preferred_time === "morning" && isMorning) score += 2;
  if (preference.preferred_time === "afternoon" && !isMorning) score += 2;
  if (preference.goal === "morning" && isMorning) score += 2;
  if (preference.goal === "afternoon" && !isMorning) score += 2;
  if (preference.goal === "fast_graduation") score += Number(course.sks) || 0;

  return score;
}

function overlaps(a: CourseWithSemester, b: CourseWithSemester): boolean {
  if (a.day !== b.day) return false;
  const ra = timeRangeToMinutes(a.hour);
  const rb = timeRangeToMinutes(b.hour);
  return ra.start < rb.end && ra.end > rb.start;
}

function groupByCourse(courses: CourseWithSemester[]): CourseWithSemester[][] {
  const map = new Map<string, CourseWithSemester[]>();
  for (const course of courses) {
    const bucket = map.get(course.code);
    if (bucket) bucket.push(course);
    else map.set(course.code, [course]);
  }
  return Array.from(map.values());
}

/**
 * Greedy + backtracking scheduler: groups classes by course, drops nothing
 * (candidates are assumed already hard-filtered by the caller), then
 * depth-first-searches course groups in best-first order, trying each
 * group's highest-scoring class first and backtracking to the next
 * candidate — or skipping the course entirely — whenever a pick would
 * exceed target SKS, duplicate a course, or overlap an already-placed
 * class. A call budget bounds worst-case runtime so this can never hang a
 * request; because branches are explored best-score-first, a strong
 * schedule is typically found within the first few thousand calls.
 */
export function runGreedyBacktrackOptimizer(
  courses: CourseWithSemester[],
  preference: AiPreference,
): CourseSchedule[] {
  const targetSks = targetSksFor(preference);

  const groups = groupByCourse(courses)
    .map((classes) => ({
      classes: classes
        .map((course) => ({ course, score: scoreClass(course, preference) }))
        .sort((a, b) => b.score - a.score),
    }))
    .map((group) => ({ ...group, bestScore: group.classes[0]?.score ?? -Infinity }))
    .sort((a, b) => b.bestScore - a.bestScore);

  let best: CourseWithSemester[] = [];
  let bestScore = -Infinity;
  let callBudget = CALL_BUDGET;

  function backtrack(
    index: number,
    chosen: CourseWithSemester[],
    usedSks: number,
    score: number,
  ) {
    if (callBudget-- <= 0) return;
    if (chosen.length > 0 && score > bestScore) {
      bestScore = score;
      best = [...chosen];
    }
    if (index >= groups.length) return;

    for (const { course, score: classScore } of groups[index].classes) {
      const sks = Number(course.sks) || 0;
      if (usedSks + sks > targetSks) continue;
      if (chosen.some((c) => overlaps(c, course))) continue;

      chosen.push(course);
      backtrack(index + 1, chosen, usedSks + sks, score + classScore);
      chosen.pop();
    }

    // Skip this course entirely — always a valid branch, mirrors "return fewer courses" in the prompt.
    backtrack(index + 1, chosen, usedSks, score);
  }

  backtrack(0, [], 0, 0);

  return best;
}
