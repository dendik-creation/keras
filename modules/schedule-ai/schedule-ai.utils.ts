import type { CourseSchedule, OfferingCourse } from "@/types/course_schedule";
import { matchCoursesByIds } from "@/helper/share_schedule";
import type {
  LightweightCoursesPayload,
  LightweightCourse,
} from "@/modules/schedule-ai/schedule-ai.types";

/** "08:00 - 09:40" -> minutes-since-midnight tuple. Mirrors helper/frontend_helper's parseTimeRange. */
export function timeRangeToMinutes(hour: string): { start: number; end: number } {
  if (!hour) return { start: 0, end: 0 };
  const [startStr, endStr] = hour.split(" - ");
  const toMinutes = (t: string) => {
    const [h, m] = (t || "0:0").split(":").map(Number);
    return h * 60 + m;
  };
  return { start: toMinutes(startStr), end: toMinutes(endStr) };
}

/** Flatten every semester's courses that actually have a usable schedule slot. */
export function flattenOfferingCourses(
  offeringCourses: OfferingCourse[],
): CourseSchedule[] {
  return offeringCourses.flatMap((group) => group.courses);
}

/** Strip an offering down to only the fields the model needs to schedule. Keeps the prompt cheap. */
export function toLightweightPayload(
  courses: CourseSchedule[],
): LightweightCoursesPayload {
  const seen = new Set<string>();
  const lightweight: LightweightCourse[] = [];

  for (const course of courses) {
    if (!course.schedule_id || seen.has(course.schedule_id)) continue;
    if (!course.day || !course.hour) continue;
    seen.add(course.schedule_id);

    lightweight.push({
      id: course.schedule_id,
      course: course.course,
      class: course.class,
      lecture: course.lecture,
      day: course.day,
      time: course.hour.replace(/\s*-\s*/, "-"),
      sks: Number(course.sks) || 0,
    });
  }

  return { courses: lightweight };
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
