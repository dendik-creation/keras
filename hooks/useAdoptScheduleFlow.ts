import { useMemo } from "react";
import { CourseSchedule, OfferingCourse } from "@/types/course_schedule";
import { matchCoursesByCodeClass, ShareInfo } from "@/helper/share_schedule";
import {
  courseCodesExistInOffering,
  extractCourseCodes,
  studyProgramsMatch,
} from "@/helper/share_schedule_validation";

export type AdoptFlowPhase =
  | "waiting"
  | "redirecting"
  | "blocked"
  | "empty"
  | "ready";

export type AdoptFlowBlockReason = "program-mismatch" | "codes-not-found";

export type AdoptScheduleFlowResult = {
  phase: AdoptFlowPhase;
  blockReason: AdoptFlowBlockReason | null;
  matched: CourseSchedule[];
  missingCount: number;
  hasExisting: boolean;
  redirectTo: string | null;
};

type UseAdoptScheduleFlowArgs = {
  /** Parsed share params, or null while still being resolved (e.g. shortCode lookup). */
  share: ShareInfo | null;
  /** Full path this flow should return to once /schedule has refreshed the offering. */
  resumeRedirectPath: string;
  offeringCourse: OfferingCourse[] | null;
  savedSchedule: CourseSchedule[] | null;
  receiverNim: string | null;
  isHydrated: boolean;
};

const EMPTY_RESULT: AdoptScheduleFlowResult = {
  phase: "waiting",
  blockReason: null,
  matched: [],
  missingCount: 0,
  hasExisting: false,
  redirectTo: null,
};

/**
 * Shared adoption state machine for /adopt-schedule and ShareScheduleClient —
 * both hand it {ids, nim, nama} plus offering/saved state from
 * LocalStorageProvider and get back a phase to render. It never fetches or
 * navigates itself; callers own the router effects driven by `redirectTo`
 * and `phase === "ready"`.
 */
export function useAdoptScheduleFlow({
  share,
  resumeRedirectPath,
  offeringCourse,
  savedSchedule,
  receiverNim,
  isHydrated,
}: UseAdoptScheduleFlowArgs): AdoptScheduleFlowResult {
  return useMemo(() => {
    if (!isHydrated || !share) return EMPTY_RESULT;

    if (share.ids.length === 0) {
      return { ...EMPTY_RESULT, phase: "empty" };
    }

    const offering = offeringCourse ?? [];

    // Case A: nothing to match against yet — get-schedule only runs on
    // /schedule, so send the user there and bring them straight back.
    if (offering.length === 0) {
      return {
        ...EMPTY_RESULT,
        phase: "redirecting",
        redirectTo: `/schedule?resumeAdopt=${encodeURIComponent(resumeRedirectPath)}`,
      };
    }

    // Validation 2: same study program (fail-open when either NIM is unparseable).
    if (receiverNim && studyProgramsMatch(share.nim, receiverNim) === false) {
      return {
        ...EMPTY_RESULT,
        phase: "blocked",
        blockReason: "program-mismatch",
      };
    }

    // Validation 1: every shared course code must be offered at all (any class).
    const codes = extractCourseCodes(share.ids);
    if (!courseCodesExistInOffering(codes, offering)) {
      return {
        ...EMPTY_RESULT,
        phase: "blocked",
        blockReason: "codes-not-found",
      };
    }

    const matched = matchCoursesByCodeClass(share.ids, offering);
    if (matched.length === 0) {
      return { ...EMPTY_RESULT, phase: "empty" };
    }

    const hasExisting = Array.isArray(savedSchedule) && savedSchedule.length > 0;

    return {
      phase: "ready",
      blockReason: null,
      matched,
      missingCount: share.ids.length - matched.length,
      hasExisting,
      redirectTo: null,
    };
  }, [
    share,
    resumeRedirectPath,
    offeringCourse,
    savedSchedule,
    receiverNim,
    isHydrated,
  ]);
}
