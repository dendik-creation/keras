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

