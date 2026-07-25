import type { AiPreference, CourseWithSemester } from "@/modules/schedule-ai/schedule-ai.types";
import { scoreClass } from "@/modules/schedule-ai/schedule-ai.scoring";

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
 * candidates — the AI never needs to see a class that already scores worse
 * than another option for the same course. Shrinks from top-3 to top-2 per
 * course once there are enough course groups that top-3 would still blow
 * up the prompt.
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

  const reduced: CourseWithSemester[] = [];
  let allSingleChoice = true;
  for (const bucket of groups.values()) {
    if (bucket.length > 1) allSingleChoice = false;
    const ranked = bucket
      .map((course) => ({ course, score: scoreClass(course, preference) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, perCourseLimit);
    for (const { course } of ranked) reduced.push(course);
  }

  return { courses: reduced, groupCount: groups.size, allSingleChoice };
}
