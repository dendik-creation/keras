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
 * Deterministic preference score for one class. This is the scoring engine
 * the AI system prompt used to describe in prose and ask the model to
 * compute itself — now it's the actual ranking used to pick which
 * candidates even reach the model (schedule-ai.reduce.ts) and to drive the
 * no-AI fallback optimizer. avoid_lecturers/avoid_courses aren't scored
 * here because prefilterCourses already removes them outright — there's
 * nothing left to penalize. Idle-time/compact-schedule preference is a
 * property of the whole combination, not one class, so it's left to the
 * optimizer's search rather than scored per class.
 */
export function scoreClass(course: CourseWithSemester, preference: AiPreference): number {
  let score = 0;
  if (preference.preferred_lecturers.includes(course.lecture)) score += 100;
  if (preference.preferred_courses.includes(course.code)) score += 40;
  if (preference.preferred_semester && course.semester === preference.preferred_semester) {
    score += 30;
  }

  const { start } = timeRangeToMinutes(course.hour);
  const isMorning = start < 12 * 60;
  if (preference.preferred_time === "morning" && isMorning) score += 20;
  if (preference.preferred_time === "afternoon" && !isMorning) score += 20;
  if (preference.goal === "morning" && isMorning) score += 15;
  if (preference.goal === "afternoon" && !isMorning) score += 15;
  if (preference.goal === "fast_graduation") score += Number(course.sks) || 0;

  return score;
}
