import { OfferingCourse } from "@/types/course_schedule";

const PAIR_SEP = "::";

/**
 * Validation 1 helper: `ids` carries `code::class` pairs (see
 * `helper/share_schedule.ts`). This strips each pair down to the bare
 * course code, so we can check "is this course offered at all" separately
 * from "is this exact class still offered" (the latter is what
 * `matchCoursesByCodeClass` already checks downstream).
 */
export function extractCourseCodes(ids: string[]): string[] {
  const codes = new Set<string>();
  for (const id of ids) {
    const code = id.split(PAIR_SEP)[0];
    if (code) codes.add(code);
  }
  return [...codes];
}

/**
 * Study-program code is the 5th/6th digit of a NIM, e.g. `202451823` -> `51`.
 * Returns null when the NIM is too short to contain those digits (older
 * share links didn't always carry a `nim` param).
 */
export function getStudyProgramCode(nim: string): string | null {
  if (nim.length < 6) return null;
  return nim.slice(4, 6);
}

/** Validation 1: every shared course code must be offered somewhere (any class). */
export function courseCodesExistInOffering(
  codes: string[],
  offering: OfferingCourse[],
): boolean {
  const offeredCodes = new Set<string>();
  for (const group of offering) {
    for (const course of group.courses) {
      if (course.code) offeredCodes.add(course.code);
    }
  }
  return codes.every((code) => offeredCodes.has(code));
}

/**
 * Validation 2: sender and receiver must be in the same study program.
 * Returns null (unverifiable) when either NIM can't be parsed — callers
 * should treat null as "skip this check", not as a block.
 */
export function studyProgramsMatch(
  senderNim: string,
  receiverNim: string,
): boolean | null {
  const senderCode = getStudyProgramCode(senderNim);
  const receiverCode = getStudyProgramCode(receiverNim);
  if (senderCode === null || receiverCode === null) return null;
  return senderCode === receiverCode;
}
