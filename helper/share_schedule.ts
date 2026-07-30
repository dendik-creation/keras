import { CourseSchedule, OfferingCourse } from "@/types/course_schedule";
import { maskNim } from "@/lib/analytics/identity";
import {
  calculateStringSimilarity,
  enrichOfferingCourses,
  generateShareCourseId,
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
  version: number;
};

export type MatchStrategy =
  | "share_course_id"
  | "course_code"
  | "fingerprint"
  | "fuzzy"
  | "none";

export type MatchSharedCoursesResult = {
  matched: CourseSchedule[];
  missingIds: string[];
  corruptedIds: string[];
  codeExistOnly: string[];
  strategiesUsed: Record<string, MatchStrategy>;
  summary: {
    totalShared: number;
    totalOffering: number;
    matchedCount: number;
    missingCount: number;
    corruptedCount: number;
  };
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

/** Relative adopt URL carrying the selected schedule IDs + sharer identity (v2). */
export function buildAdoptPath(
  courses: CourseSchedule[],
  user: { nim?: string; name?: string } | null,
): string {
  const ids = courses
    .filter((c) => c.class && (c.share_course_id || c.code || c.course))
    .map((c) => {
      const courseId =
        c.share_course_id ||
        generateShareCourseId({
          courseName: c.course,
          sks: c.sks,
          category: c.category,
          nim: user?.nim,
        });
      return `${courseId}${PAIR_SEP}${normalizeClass(c.class)}`;
    });

  const params = new URLSearchParams();
  params.set("ids", ids.join(ID_SEP));
  params.set("v", "2");
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

/** Parse the adopt-schedule query string into structured share info (v1/v2). */
export function parseShareParams(search: string): ShareInfo {
  const params = new URLSearchParams(search);
  const rawIdsParam = params.get("ids") || "";
  const version = parseInt(params.get("v") || "1", 10);

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
    version,
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
 * Multi-level matching strategy engine for Share & Adopt Schedule v2:
 * Level 1: `share_course_id + class`
 * Level 2: `course_code + class` (backward compatibility)
 * Level 3: Fingerprint recalculation
 * Level 4: Fuzzy matching (course name similarity >= 0.90)
 */
export function matchSharedCourses(
  rawIds: string[],
  offering: OfferingCourse[],
  receiverNim?: string | null,
  version: number = 2,
): MatchSharedCoursesResult {
  const isDev = process.env.NODE_ENV !== "production";
  if (isDev) {
    console.log(`[share] Starting matchSharedCourses (v${version}) with raw IDs:`, rawIds);
  }

  const enrichedOffering = enrichOfferingCourses(offering || [], receiverNim);
  const allCourses: CourseSchedule[] = [];
  for (const group of enrichedOffering) {
    for (const c of group.courses || []) {
      allCourses.push(c);
    }
  }

  const byShareCourseIdPair = new Map<string, CourseSchedule>();
  const byCodeClassPair = new Map<string, CourseSchedule>();
  const byFingerprintPair = new Map<string, CourseSchedule>();

  for (const course of allCourses) {
    const cls = normalizeClass(course.class);
    const code = normalizeCode(course.code);
    const shareId = normalizeCode(
      course.share_course_id ||
      generateShareCourseId({
        courseName: course.course,
        sks: course.sks,
        category: course.category,
        nim: receiverNim,
      })
    );

    if (shareId && cls) {
      byShareCourseIdPair.set(`${shareId}${PAIR_SEP}${cls}`, course);
    }
    if (code && cls) {
      byCodeClassPair.set(`${code}${PAIR_SEP}${cls}`, course);
    }

    const fpId = normalizeCode(
      generateShareCourseId({
        courseName: course.course,
        sks: course.sks,
        category: course.category,
        nim: receiverNim,
      })
    );
    if (fpId && cls) {
      byFingerprintPair.set(`${fpId}${PAIR_SEP}${cls}`, course);
    }
  }

  const matched: CourseSchedule[] = [];
  const missingIds: string[] = [];
  const corruptedIds: string[] = [];
  const codeExistOnly: string[] = [];
  const strategiesUsed: Record<string, MatchStrategy> = {};

  const offeredCodes = new Set<string>(allCourses.map((c) => normalizeCode(c.code)));

  for (const rawId of rawIds) {
    const parsed = parseIdPair(rawId);
    if (!parsed) {
      corruptedIds.push(rawId);
      strategiesUsed[rawId] = "none";
      if (isDev) console.log(`[share] ✗ CORRUPTED ID: "${rawId}"`);
      continue;
    }

    const { code: rawCodeOrShareId, class: targetClass, key } = parsed;
    let foundCourse: CourseSchedule | null = null;
    let strategy: MatchStrategy = "none";

    // Level 1: share_course_id + class
    const shareIdKey = `${rawCodeOrShareId}${PAIR_SEP}${targetClass}`;
    if (byShareCourseIdPair.has(shareIdKey)) {
      foundCourse = byShareCourseIdPair.get(shareIdKey)!;
      strategy = "share_course_id";
    }

    // Level 2: course_code + class (backward compatibility for v1 / legacy)
    if (!foundCourse) {
      const codeKey = `${normalizeCode(rawCodeOrShareId)}${PAIR_SEP}${targetClass}`;
      if (byCodeClassPair.has(codeKey)) {
        foundCourse = byCodeClassPair.get(codeKey)!;
        strategy = "course_code";
      }
    }

    // Level 3: Fingerprint recalculation match
    if (!foundCourse) {
      if (byFingerprintPair.has(shareIdKey)) {
        foundCourse = byFingerprintPair.get(shareIdKey)!;
        strategy = "fingerprint";
      }
    }

    // Level 4: Fuzzy matching (course name similarity >= 0.90)
    if (!foundCourse) {
      for (const course of allCourses) {
        if (normalizeClass(course.class) !== targetClass) continue;
        const sim = calculateStringSimilarity(course.course, rawCodeOrShareId);
        if (sim >= 0.90) {
          foundCourse = course;
          strategy = "fuzzy";
          if (isDev) {
            console.log(`[share] Fuzzy matched "${rawCodeOrShareId}" to "${course.course}" (similarity: ${(sim * 100).toFixed(1)}%)`);
          }
          break;
        }
      }
    }

    if (foundCourse) {
      matched.push(foundCourse);
      strategiesUsed[key] = strategy;
      if (isDev) {
        console.log(`[share] Matching ${key} -> Strategy: ${strategy} -> FOUND ("${foundCourse.course}")`);
      }
    } else {
      missingIds.push(key);
      if (offeredCodes.has(normalizeCode(rawCodeOrShareId))) {
        codeExistOnly.push(rawCodeOrShareId);
      }
      strategiesUsed[key] = "none";
      if (isDev) {
        console.log(`[share] Matching ${key} -> NOT FOUND`);
      }
    }
  }

  const summary = {
    totalShared: rawIds.length,
    totalOffering: allCourses.length,
    matchedCount: matched.length,
    missingCount: missingIds.length,
    corruptedCount: corruptedIds.length,
  };

  if (isDev) {
    console.log("[share] Match Summary:", summary);
  }

  return {
    matched,
    missingIds,
    corruptedIds,
    codeExistOnly,
    strategiesUsed,
    summary,
  };

}

/**
 * Legacy wrapper around matchSharedCourses.
 */
export function matchOfferingByCodeClass(
  rawIds: string[],
  offering: OfferingCourse[],
): MatchOfferingResult {
  const res = matchSharedCourses(rawIds, offering);
  return {
    matched: res.matched,
    missingIds: res.missingIds,
    corruptedIds: res.corruptedIds,
    codeExistOnly: res.codeExistOnly,
    summary: res.summary,
  };
}

/**
 * Legacy wrapper around matchSharedCourses.
 */
export function matchCoursesByCodeClass(
  ids: string[],
  offering: OfferingCourse[],
): CourseSchedule[] {
  return matchSharedCourses(ids, offering).matched;
}


