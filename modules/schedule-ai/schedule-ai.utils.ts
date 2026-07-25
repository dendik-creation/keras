import type { OfferingCourse } from "@/types/course_schedule";
import {
  STUDY_DAYS,
  type AiPreference,
  type CourseWithSemester,
} from "@/modules/schedule-ai/schedule-ai.types";

/** "08:00" -> minutes-since-midnight. */
export function timeToMinutes(t: string): number {
  const [h, m] = (t || "0:0").split(":").map(Number);
  return h * 60 + m;
}

/** "08:00 - 09:40" -> minutes-since-midnight tuple. Mirrors helper/frontend_helper's parseTimeRange. */
export function timeRangeToMinutes(hour: string): { start: number; end: number } {
  if (!hour) return { start: 0, end: 0 };
  const [startStr, endStr] = hour.split(" - ");
  return { start: timeToMinutes(startStr), end: timeToMinutes(endStr) };
}

/** Flatten every semester's courses, tagging each with its semester group. */
export function flattenOfferingCourses(
  offeringCourses: OfferingCourse[],
): CourseWithSemester[] {
  return offeringCourses.flatMap((group) =>
    group.courses.map((course) => ({ ...course, semester: group.semester })),
  );
}

/** Unique, offer-order semester labels — used for the "prioritize semester" step. */
export function buildSemesterOptions(offeringCourses: OfferingCourse[]): string[] {
  const seen = new Set<string>();
  const semesters: string[] = [];
  for (const group of offeringCourses) {
    if (!group.semester || seen.has(group.semester)) continue;
    seen.add(group.semester);
    semesters.push(group.semester);
  }
  return semesters;
}

/**
 * Deterministic hard-constraint pre-filter. Drops every class that can
 * never be legal under the student's request — wrong weekday, starts too
 * early, ends too late, an explicitly avoided lecturer/course, or a dead
 * duplicate schedule_id — before the AI or the fallback optimizer ever
 * sees it. Fewer, only-possible candidates means a smaller prompt and a
 * search space where every remaining pick is already day/time/avoid-legal,
 * so the model only has to reason about preference and the remaining
 * combination constraints (overlap, duplicate-course, SKS).
 */
export function prefilterCourses(
  courses: CourseWithSemester[],
  preference: AiPreference,
): CourseWithSemester[] {
  const allowedDays = new Set<string>(
    preference.preferred_days.length > 0 ? preference.preferred_days : STUDY_DAYS,
  );
  const earliestMinutes = timeToMinutes(preference.earliest_start);
  const latestMinutes = timeToMinutes(preference.latest_end);
  const avoidLecturers = new Set(preference.avoid_lecturers);
  const avoidCourses = new Set(preference.avoid_courses);

  const seen = new Set<string>();
  const filtered: CourseWithSemester[] = [];
  for (const course of courses) {
    if (!course.schedule_id || seen.has(course.schedule_id)) continue;
    if (!course.day || !course.hour || !course.code || !course.lecture) continue;
    if (!allowedDays.has(course.day)) continue;
    if (avoidLecturers.has(course.lecture)) continue;
    if (avoidCourses.has(course.code)) continue;

    const { start, end } = timeRangeToMinutes(course.hour);
    if (start < earliestMinutes || end > latestMinutes) continue;

    seen.add(course.schedule_id);
    filtered.push(course);
  }
  return filtered;
}

export type SelectOption = {
  value: string;
  label: string;
  sublabel?: string;
  group?: string;
};

/** Unique course options (by code), tagged with their semester for grouped display. */
export function buildCourseOptions(offeringCourses: OfferingCourse[]): SelectOption[] {
  const byCode = new Map<string, SelectOption>();
  for (const course of flattenOfferingCourses(offeringCourses)) {
    if (!course.code || byCode.has(course.code)) continue;
    byCode.set(course.code, {
      value: course.code,
      label: course.course,
      sublabel: `${course.code} • ${course.sks} SKS • ${course.category}`,
      group: course.semester,
    });
  }
  return Array.from(byCode.values());
}

/** Unique lecturer options for the lecturer-preference step. */
export function buildLecturerOptions(offeringCourses: OfferingCourse[]): SelectOption[] {
  const names = new Set<string>();
  for (const course of flattenOfferingCourses(offeringCourses)) {
    if (course.lecture) names.add(course.lecture);
  }
  return Array.from(names)
    .sort((a, b) => a.localeCompare(b))
    .map((name) => ({ value: name, label: name }));
}
