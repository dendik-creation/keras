import type { CourseSchedule, OfferingCourse } from "@/types/course_schedule";
import { matchCoursesByIds } from "@/helper/share_schedule";
import {
  STUDY_DAYS,
  type AiPreference,
  type LightweightCoursesPayload,
  type LightweightCourse,
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
 * early, ends too late, or a dead duplicate schedule_id — before the AI or
 * the fallback optimizer ever sees it. Fewer, only-possible candidates
 * means a smaller prompt and a search space where every remaining pick is
 * already day/time-legal, so the model only has to reason about overlap,
 * duplicate-course, and SKS.
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

  const seen = new Set<string>();
  const filtered: CourseWithSemester[] = [];
  for (const course of courses) {
    if (!course.schedule_id || seen.has(course.schedule_id)) continue;
    if (!course.day || !course.hour) continue;
    if (!allowedDays.has(course.day)) continue;

    const { start, end } = timeRangeToMinutes(course.hour);
    if (start < earliestMinutes || end > latestMinutes) continue;

    seen.add(course.schedule_id);
    filtered.push(course);
  }
  return filtered;
}

/**
 * Strip an offering down to only the fields the model needs to schedule.
 * Real schedule_id values are long opaque hashes (100+ chars) — asking an
 * LLM to transcribe those verbatim in JSON is unreliable (models garble
 * long strings under json mode). So each course gets a short sequential
 * token as its "id" instead; idMap translates that token back to the real
 * schedule_id after the model responds.
 */
export function toLightweightPayload(
  courses: CourseWithSemester[],
): { payload: LightweightCoursesPayload; idMap: Map<string, string> } {
  const seen = new Set<string>();
  const lightweight: LightweightCourse[] = [];
  const idMap = new Map<string, string>();

  for (const course of courses) {
    if (!course.schedule_id || seen.has(course.schedule_id)) continue;
    if (!course.day || !course.hour) continue;
    seen.add(course.schedule_id);

    const shortId = String(idMap.size + 1);
    idMap.set(shortId, course.schedule_id);

    const [start, end] = course.hour.split(" - ");
    lightweight.push({
      id: shortId,
      course: course.course,
      class: course.class,
      lecture: course.lecture,
      day: course.day,
      start: start || "",
      end: end || "",
      sks: Number(course.sks) || 0,
      semester: course.semester,
    });
  }

  return { payload: { courses: lightweight }, idMap };
}

/** Rebuild full CourseSchedule records from the ids the model selected. */
export function mapSelectedIdsToCourses(
  ids: string[],
  offeringCourses: OfferingCourse[],
): CourseSchedule[] {
  return matchCoursesByIds(ids, offeringCourses);
}

export type SelectOption = { value: string; label: string; sublabel?: string };

/** Unique course options (by code) for the course-preference step. */
export function buildCourseOptions(offeringCourses: OfferingCourse[]): SelectOption[] {
  const byCode = new Map<string, SelectOption>();
  for (const course of flattenOfferingCourses(offeringCourses)) {
    if (!course.code || byCode.has(course.code)) continue;
    byCode.set(course.code, {
      value: course.code,
      label: course.course,
      sublabel: `${course.code} • ${course.sks} SKS`,
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
