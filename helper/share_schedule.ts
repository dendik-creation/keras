import { CourseSchedule, OfferingCourse } from "@/types/course_schedule";

/**
 * Helpers for the "bagikan jadwal" feature: a schedule is shared as a link
 * carrying the selected `schedule_id`s plus the sharer's NIM and name. The
 * recipient's browser matches those IDs against the offered-course list to
 * rebuild the exact schedule, then adopts it into local storage.
 */

const ID_SEP = ",";

export type ShareInfo = {
  ids: string[];
  nim: string;
  nama: string;
};

/** Relative adopt URL carrying the selected schedule IDs + sharer identity. */
export function buildAdoptPath(
  courses: CourseSchedule[],
  user: { nim?: string; name?: string } | null,
): string {
  const ids = courses
    .map((c) => c.schedule_id)
    .filter((id): id is string => Boolean(id));

  const params = new URLSearchParams();
  params.set("ids", ids.join(ID_SEP));
  if (user?.nim) params.set("nim", user.nim);
  if (user?.name) params.set("nama", user.name);

  return `/adopt-schedule?${params.toString()}`;
}

/** Absolute share link. Client-only — relies on window.location.origin. */
export function buildShareUrl(
  courses: CourseSchedule[],
  user: { nim?: string; name?: string } | null,
): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return origin + buildAdoptPath(courses, user);
}

/** Parse the adopt-schedule query string into structured share info. */
export function parseShareParams(search: string): ShareInfo {
  const params = new URLSearchParams(search);
  const rawIds = params.get("ids") || "";
  const ids = rawIds
    .split(ID_SEP)
    .map((s) => s.trim())
    .filter(Boolean);

  return {
    ids,
    nim: params.get("nim") || "",
    nama: params.get("nama") || "",
  };
}

/**
 * Match the shared IDs against the offered-course list and return the matching
 * courses in the order the IDs were shared. Missing IDs (e.g. the offering has
 * since changed) are simply skipped — the caller compares lengths to warn.
 */
export function matchCoursesByIds(
  ids: string[],
  offering: OfferingCourse[],
): CourseSchedule[] {
  const byId = new Map<string, CourseSchedule>();
  for (const group of offering) {
    for (const course of group.courses) {
      if (course.schedule_id) byId.set(course.schedule_id, course);
    }
  }

  const matched: CourseSchedule[] = [];
  for (const id of ids) {
    const course = byId.get(id);
    if (course) matched.push(course);
  }
  return matched;
}
