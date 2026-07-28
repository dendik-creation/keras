import { useMemo } from "react";
import { CourseSchedule, OfferingCourse } from "@/types/course_schedule";
import {
  matchSharedCourses,
  ShareInfo,
} from "@/helper/share_schedule";
import {
  extractCourseCodes,
  studyProgramsMatch,
} from "@/helper/share_schedule_validation";

export type AdoptFlowPhase =
  | "waiting"
  | "redirecting"
  | "blocked"
  | "empty"
  | "ready";

export type AdoptFlowBlockReason =
  | "program-mismatch"
  | "codes-not-found"
  | "classes-not-found"
  | "corrupted-link";

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
 * Shared adoption state machine for /adopt-schedule and ShareScheduleClient.
 * Uses `matchSharedCourses` for multi-level matching strategy (share_course_id, course_code, fingerprint, fuzzy).
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

    // Case A: nothing to match against yet — redirect to /schedule to fetch offering
    if (offering.length === 0) {
      return {
        ...EMPTY_RESULT,
        phase: "redirecting",
        redirectTo: `/schedule?resumeAdopt=${encodeURIComponent(resumeRedirectPath)}`,
      };
    }

    // Validation 1: Same study program check (fail-open if either NIM is unparseable)
    if (receiverNim && studyProgramsMatch(share.nim, receiverNim) === false) {
      return {
        ...EMPTY_RESULT,
        phase: "blocked",
        blockReason: "program-mismatch",
      };
    }

    // Execute multi-level matching engine
    const matchResult = matchSharedCourses(
      share.ids,
      offering,
      receiverNim,
      share.version || 2,
    );


    // Case B: All shared IDs are corrupted or unparseable
    if (matchResult.corruptedIds.length > 0 && matchResult.matched.length === 0) {
      return {
        ...EMPTY_RESULT,
        phase: "blocked",
        blockReason: "corrupted-link",
      };
    }

    // Case C: No courses matched at all
    if (matchResult.matched.length === 0) {
      const extractedCodes = extractCourseCodes(share.ids);
      const codeExists = matchResult.codeExistOnly.length > 0;

      if (codeExists) {
        return {
          ...EMPTY_RESULT,
          phase: "blocked",
          blockReason: "classes-not-found",
        };
      }

      if (extractedCodes.length > 0) {
        return {
          ...EMPTY_RESULT,
          phase: "blocked",
          blockReason: "codes-not-found",
        };
      }

      return { ...EMPTY_RESULT, phase: "empty" };
    }

    const hasExisting = Array.isArray(savedSchedule) && savedSchedule.length > 0;

    return {
      phase: "ready",
      blockReason: null,
      matched: matchResult.matched,
      missingCount: matchResult.missingIds.length + matchResult.corruptedIds.length,
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

