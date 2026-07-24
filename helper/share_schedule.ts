import { CourseSchedule, OfferingCourse } from "@/types/course_schedule";

/**
 * Helpers for the "bagikan jadwal" feature: a schedule is shared as a link
 * carrying the selected courses' `code`+`class` pairs plus the sharer's NIM
 * and name. The recipient's browser matches those pairs against the
 * offered-course list to rebuild the exact schedule, then adopts it into
 * local storage.
 *
 * `code`+`class` is used instead of `schedule_id` because `schedule_id` is
 * the raw `data-id` scraped from the campus KRS portal per-session — it is
 * not guaranteed stable across two different students' sessions, even when
 * both see the exact same offering. `code`+`class` is the visible, stable
 * identity of a course offering.
 */

const ID_SEP = ",";
const PAIR_SEP = "::";

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
    .filter((c) => c.code && c.class)
    .map((c) => `${c.code}${PAIR_SEP}${c.class}`);

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
 *
 * Used for intra-session lookups (e.g. schedule-ai) where the ids and the
 * offering array come from the same student's own fetch, so `schedule_id` is
 * a valid stable key. For cross-student sharing, use
 * `matchCoursesByCodeClass` instead — see the module doc comment above.
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

/**
 * Match shared `code::class` pairs (see `ShareInfo.ids`) against the
 * offered-course list. Used by the adopt-schedule flow so matching survives
 * across two different students' sessions, where raw `schedule_id`s are not
 * guaranteed to line up.
 */
export function matchCoursesByCodeClass(
  ids: string[],
  offering: OfferingCourse[],
): CourseSchedule[] {
  const byPair = new Map<string, CourseSchedule>();
  for (const group of offering) {
    for (const course of group.courses) {
      if (course.code && course.class) {
        byPair.set(`${course.code}${PAIR_SEP}${course.class}`, course);
      }
    }
  }

  const matched: CourseSchedule[] = [];
  for (const id of ids) {
    const course = byPair.get(id);
    if (course) matched.push(course);
  }
  return matched;
}
