import { OfferingCourse } from "@/types/course_schedule";

export const PAIR_SEP = "::";

/**
 * Normalizes a course code string by trimming whitespace and converting to uppercase.
 */
export function normalizeCode(code: string | undefined | null): string {
  return (code || "").trim().toUpperCase();
}

/**
 * Normalizes a class string by trimming whitespace and converting to uppercase.
 */
export function normalizeClass(cls: string | undefined | null): string {
  return (cls || "").trim().toUpperCase();
}

/**
 * Creates a unique combined key for a course code and class.
 * e.g. ("gs51 ", " a") -> "GS51::A"
 */
export function makeCourseKey(
  code: string | undefined | null,
  cls: string | undefined | null,
): string {
  return `${normalizeCode(code)}${PAIR_SEP}${normalizeClass(cls)}`;
}

/**
 * Parses a raw ID pair string into normalized code and class.
 * Supports both "CODE::CLASS" and fallback "CODE:CLASS", including URL-encoded colons (%3A).
 * Returns null if either code or class is missing/invalid.
 */
export function parseIdPair(
  rawId: string,
): { code: string; class: string; key: string } | null {
  if (!rawId) return null;

  let decoded = rawId.trim();
  try {
    decoded = decodeURIComponent(decoded);
  } catch {
    // If decode fails, use raw string as fallback
  }

  // Support "::" as primary separator, fallback to ":"
  let parts: string[];
  if (decoded.includes(PAIR_SEP)) {
    parts = decoded.split(PAIR_SEP);
  } else if (decoded.includes(":")) {
    parts = decoded.split(":");
  } else {
    return null;
  }

  const code = normalizeCode(parts[0]);
  const cls = normalizeClass(parts[1]);

  if (!code || !cls) return null;

  return {
    code,
    class: cls,
    key: `${code}${PAIR_SEP}${cls}`,
  };
}

/**
 * Extracts study program code (5th and 6th digits) from a NIM string.
 * Example: `202451823` -> `51`.
 * Trims whitespace and strips non-alphanumeric characters first.
 * Returns null when the NIM is invalid or too short.
 */
export function extractStudyProgramCode(nim: string | undefined | null): string | null {
  if (!nim) return null;
  const cleanNim = nim.trim().replace(/[^a-zA-Z0-9*]/g, "");
  if (cleanNim.length < 6) return null;
  const code = cleanNim.slice(4, 6);
  // Ensure the extracted code contains valid digits or mask chars
  return code || null;
}

/**
 * Legacy alias for extractStudyProgramCode.
 */
export function getStudyProgramCode(nim: string | undefined | null): string | null {
  return extractStudyProgramCode(nim);
}

/**
 * Helper: extracts normalized course codes from raw ID strings.
 */
export function extractCourseCodes(ids: string[]): string[] {
  const codes = new Set<string>();
  for (const id of ids) {
    const parsed = parseIdPair(id);
    if (parsed) {
      codes.add(parsed.code);
    }
  }
  return [...codes];
}

/**
 * Validation: checks if course codes exist anywhere in the offering list.
 */
export function courseCodesExistInOffering(
  codes: string[],
  offering: OfferingCourse[],
): boolean {
  if (codes.length === 0) return false;
  const offeredCodes = new Set<string>();
  for (const group of offering) {
    for (const course of group.courses || []) {
      const normalized = normalizeCode(course.code);
      if (normalized) offeredCodes.add(normalized);
    }
  }
  const normCodes = codes.map(normalizeCode);
  return normCodes.every((code) => offeredCodes.has(code));
}

/**
 * Validation: sender and receiver must be in the same study program.
 * Returns null (unverifiable) when either NIM can't be parsed.
 */
export function studyProgramsMatch(
  senderNim: string | undefined | null,
  receiverNim: string | undefined | null,
): boolean | null {
  const senderCode = extractStudyProgramCode(senderNim);
  const receiverCode = extractStudyProgramCode(receiverNim);
  if (senderCode === null || receiverCode === null) return null;
  return senderCode === receiverCode;
}

/**
 * Normalizes course name by converting to lowercase and stripping non-alphanumeric chars.
 * e.g. "Pengembangan Diri dan Bimbingan Karir" -> "pengembangandiridanbimbingankarir"
 */
export function normalizeCourseName(name: string | undefined | null): string {
  if (!name) return "";
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Pure JS FNV-1a 64-bit string hashing algorithm yielding a 16-character hex string.
 * Deterministic across all environments (Browser, SSR, Node).
 */
export function generateHash16(input: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0xcbf29ce4;
  for (let i = 0; i < input.length; i++) {
    const charCode = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ charCode, 0x01000193);
    h2 = Math.imul(h2 ^ charCode, 0x100000001b3);
  }
  const p1 = (h1 >>> 0).toString(16).padStart(8, "0");
  const p2 = (h2 >>> 0).toString(16).padStart(8, "0");
  return `${p1}${p2}`.slice(0, 16);
}

export type GenerateShareCourseIdArgs = {
  studyProgramCode?: string | null;
  courseName: string;
  sks?: string | number | null;
  category?: string | null;
  nim?: string | null;
};

/**
 * Generates immutable `share_course_id` based on study program code and course fingerprint.
 * Format: `<studyProgramCode>_<16-char-hash>` (e.g., `51_83ab7d9248cfab12`).
 * Deterministic for all students in the same study program regardless of mutable course_code.
 */
export function generateShareCourseId(args: GenerateShareCourseIdArgs): string {
  const prodiCode =
    args.studyProgramCode ||
    extractStudyProgramCode(args.nim) ||
    "00";
  const normName = normalizeCourseName(args.courseName);
  const sks = String(args.sks || "").trim();
  const category = (args.category || "").trim().toLowerCase();

  const fingerprint = `${prodiCode}|${normName}|${sks}|${category}`;
  const hash = generateHash16(fingerprint);
  return `${prodiCode}_${hash}`;
}

/**
 * Calculates string similarity using Levenshtein distance (returns 0.0 to 1.0).
 */
export function calculateStringSimilarity(str1: string, str2: string): number {
  const s1 = normalizeCourseName(str1);
  const s2 = normalizeCourseName(str2);
  if (s1 === s2) return 1.0;
  if (!s1 || !s2) return 0.0;

  const m = s1.length;
  const n = s2.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost,
      );
    }
  }
  const dist = dp[m][n];
  return 1.0 - dist / Math.max(m, n);
}

/**
 * Automatically enriches offering course objects with `share_course_id` if missing.
 * Idempotent: skips courses that already have `share_course_id`.
 */
export function enrichOfferingCourses(
  offering: OfferingCourse[],
  userNim?: string | null,
): OfferingCourse[] {
  if (!offering || offering.length === 0) return offering;

  let changed = false;
  const enriched = offering.map((group) => {
    let groupChanged = false;
    const courses = (group.courses || []).map((course) => {
      if (course.share_course_id) return course;
      groupChanged = true;
      changed = true;
      const shareCourseId = generateShareCourseId({
        courseName: course.course,
        sks: course.sks,
        category: course.category,
        nim: userNim,
      });
      return {
        ...course,
        share_course_id: shareCourseId,
      };
    });

    return groupChanged ? { ...group, courses } : group;
  });

  return changed ? enriched : offering;
}


