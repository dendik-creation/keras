import type { AiPreference, CourseWithSemester } from "@/modules/schedule-ai/schedule-ai.types";
import { classObjectives } from "@/modules/schedule-ai/schedule-ai.scoring";
import { timeRangeToMinutes } from "@/modules/schedule-ai/schedule-ai.utils";

const TOP_PER_COURSE_SMALL = 3;
const TOP_PER_COURSE_LARGE = 2;
const GROUP_COUNT_SHRINK_THRESHOLD = 25;

export type ReducedCandidates = {
  courses: CourseWithSemester[];
  groupCount: number;
  /** True only when every course group already had at most one real option — not an artifact of the top-N cut. */
  allSingleChoice: boolean;
};

/**
 * Ranks every class within its course group and keeps only the top
 * candidates — the AI never needs to see a class that already loses on
 * every layer to another option for the same course. Shrinks from top-3 to
 * top-2 per course once there are enough course groups that top-3 would
 * still blow up the prompt.
 *
 * Ranking is staged, not a single summed score, so a layer never gets
 * outvoted by the sum of lower ones:
 *   1. weekly layout  — prefer days already shared by many other candidates,
 *      so the surviving pool naturally converges on fewer distinct days.
 *   2. preferred time window fit.
 *   3. idle-friendliness proxy — starting closer to earliest_start clusters
 *      classes together instead of spreading them across the day.
 *   4. lecturer preference.
 *   5. course preference.
 * Semester preference isn't a per-class reduction stage: with only one
 * class per course surviving here, which semester "wins" is a combination
 * decision the optimizer makes (schedule-ai.scoring.ts computeScheduleMetrics),
 * not something a single row can be ranked on in isolation.
 */
export function reduceCandidates(
  courses: CourseWithSemester[],
  preference: AiPreference,
): ReducedCandidates {
  const groups = new Map<string, CourseWithSemester[]>();
  for (const course of courses) {
    const bucket = groups.get(course.code);
    if (bucket) bucket.push(course);
    else groups.set(course.code, [course]);
  }

  const perCourseLimit =
    groups.size > GROUP_COUNT_SHRINK_THRESHOLD ? TOP_PER_COURSE_LARGE : TOP_PER_COURSE_SMALL;

  const dayFrequency = new Map<string, number>();
  for (const course of courses) {
    dayFrequency.set(course.day, (dayFrequency.get(course.day) ?? 0) + 1);
  }

  const reduced: CourseWithSemester[] = [];
  let allSingleChoice = true;
  for (const bucket of groups.values()) {
    if (bucket.length > 1) allSingleChoice = false;
    const ranked = bucket
      .map((course) => ({
        course,
        obj: classObjectives(course, preference),
        dayShare: dayFrequency.get(course.day) ?? 0,
        start: timeRangeToMinutes(course.hour).start,
      }))
      .sort((a, b) => {
        if (a.dayShare !== b.dayShare) return b.dayShare - a.dayShare; // stage 1
        if (a.obj.timeFit !== b.obj.timeFit) return a.obj.timeFit - b.obj.timeFit; // stage 2
        if (a.start !== b.start) return a.start - b.start; // stage 3
        if (a.obj.lecturerMatch !== b.obj.lecturerMatch) return b.obj.lecturerMatch - a.obj.lecturerMatch; // stage 4
        return b.obj.courseMatch - a.obj.courseMatch; // stage 5
      })
      .slice(0, perCourseLimit);
    for (const { course } of ranked) reduced.push(course);
  }

  return { courses: reduced, groupCount: groups.size, allSingleChoice };
}
