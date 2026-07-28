import { CourseSchedule, OfferingCourse } from "@/types/course_schedule";
import { maskNim } from "@/lib/analytics/identity";
import {
  makeCourseKey,
  normalizeClass,
  normalizeCode,
  PAIR_SEP,
  parseIdPair,
} from "./share_schedule_validation";

const ID_SEP = ",";

export type ShareInfo = {
  ids: string[];
  nim: string;
  nama: string;
};

export type MatchOfferingResult = {
  matched: CourseSchedule[];
  missingIds: string[];
  corruptedIds: string[];
  codeExistOnly: string[];
  summary: {
    totalShared: number;
    totalOffering: number;
    matchedCount: number;
    missingCount: number;
    corruptedCount: number;
  };
};

/**
 * Masks a name to its first 3 and last 3 characters, starring out
 * everything in between. e.g. `SENDY PRABOWO` -> `SEN*******OWO`.
 */
export function maskNama(nama: string): string {
  if (nama.length <= 6) return nama;
  return (
    nama.slice(0, 3) + "*".repeat(nama.length - 6) + nama.slice(-3)
  );
}

/** Relative adopt URL carrying the selected schedule IDs + sharer identity. */
export function buildAdoptPath(
  courses: CourseSchedule[],
  user: { nim?: string; name?: string } | null,
): string {
  const ids = courses
    .filter((c) => c.code && c.class)
    .map((c) => makeCourseKey(c.code, c.class));

  const params = new URLSearchParams();
  params.set("ids", ids.join(ID_SEP));
  if (user?.nim) params.set("nim", maskNim(user.nim));
  if (user?.name) params.set("nama", maskNama(user.name));

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
  const rawIdsParam = params.get("ids") || "";

  let rawIds: string[] = [];
  try {
    const decoded = decodeURIComponent(rawIdsParam);
    rawIds = decoded.split(ID_SEP).map((s) => s.trim()).filter(Boolean);
  } catch {
    rawIds = rawIdsParam.split(ID_SEP).map((s) => s.trim()).filter(Boolean);
  }

  const nim = params.get("nim") || "";
  const nama = params.get("nama") || "";

  return {
    ids: rawIds,
    nim: maskNim(nim),
    nama: maskNama(nama),
  };
}

/**
 * Match the shared IDs against the offered-course list by schedule_id (intra-session).
 */
export function matchCoursesByIds(
  ids: string[],
  offering: OfferingCourse[],
): CourseSchedule[] {
  const byId = new Map<string, CourseSchedule>();
  for (const group of offering || []) {
    for (const course of group.courses || []) {
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
 * Unified matching engine for Share & Adopt Schedule.
 * Normalizes all identifiers (trim & uppercase) and matches code::class pairs against offering courses.
 * Logs detailed progress in development mode.
 */
export function matchOfferingByCodeClass(
  rawIds: string[],
  offering: OfferingCourse[],
): MatchOfferingResult {
  const isDev = process.env.NODE_ENV !== "production";
  if (isDev) {
    console.log("[adopt] Starting matchOfferingByCodeClass with raw IDs:", rawIds);
  }

  const byPair = new Map<string, CourseSchedule>();
  const byCode = new Set<string>();
  let totalOfferingCourses = 0;

  for (const group of offering || []) {
    for (const course of group.courses || []) {
      const code = normalizeCode(course.code);
      const cls = normalizeClass(course.class);

      if (code && cls) {
        totalOfferingCourses++;
        byPair.set(makeCourseKey(code, cls), course);
        byCode.add(code);
      }
    }
  }

  const matched: CourseSchedule[] = [];
  const missingIds: string[] = [];
  const corruptedIds: string[] = [];
  const codeExistOnly: string[] = [];

  for (const rawId of rawIds) {
    const parsed = parseIdPair(rawId);
    if (!parsed) {
      corruptedIds.push(rawId);
      if (isDev) {
        console.log(`[adopt] ✗ CORRUPTED ID: "${rawId}"`);
      }
      continue;
    }

    const course = byPair.get(parsed.key);
    if (course) {
      matched.push(course);
      if (isDev) {
        console.log(`[adopt] ✓ FOUND: ${parsed.key} -> "${course.course}"`);
      }
    } else {
      missingIds.push(parsed.key);
      if (byCode.has(parsed.code)) {
        codeExistOnly.push(parsed.code);
        if (isDev) {
          console.log(`[adopt] ✗ CLASS NOT FOUND: ${parsed.key} (Course ${parsed.code} exists in offering, but class ${parsed.class} missing)`);
        }
      } else {
        if (isDev) {
          console.log(`[adopt] ✗ CODE NOT FOUND: ${parsed.key} (Course ${parsed.code} not offered at all)`);
        }
      }
    }
  }

  const summary = {
    totalShared: rawIds.length,
    totalOffering: totalOfferingCourses,
    matchedCount: matched.length,
    missingCount: missingIds.length,
    corruptedCount: corruptedIds.length,
  };

  if (isDev) {
    console.log("[adopt] Match Summary:", summary);
  }

  return {
    matched,
    missingIds,
    corruptedIds,
    codeExistOnly,
    summary,
  };
}

/**
 * Legacy wrapper around matchOfferingByCodeClass.
 */
export function matchCoursesByCodeClass(
  ids: string[],
  offering: OfferingCourse[],
): CourseSchedule[] {
  return matchOfferingByCodeClass(ids, offering).matched;
}

