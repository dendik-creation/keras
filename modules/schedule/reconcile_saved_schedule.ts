import { CourseSchedule, OfferingCourse } from "@/types/course_schedule";
import { generateShareCourseId } from "@/helper/share_schedule_validation";

export type ReconcileSummary = {
  matched: number;
  updated: number;
  unchanged: number;
  obsolete: number;
  manual_review: number;
  removed: number;
};

export type ReconcileResult = {
  success: boolean;
  reconciledSchedule: CourseSchedule[];
  summary: ReconcileSummary;
  error?: string;
};

function normalizeText(text?: string): string {
  return (text || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

function normalizeCode(code?: string): string {
  return (code || "").toUpperCase().trim().replace(/[\s-]/g, "");
}

function normalizeClass(cls?: string): string {
  return (cls || "").toUpperCase().trim().replace(/[\s-]/g, "");
}

function normalizeSks(sks?: string | number): string {
  return String(sks || "").trim();
}

/**
 * Calculates string similarity between 0.0 and 1.0 using Levenshtein distance.
 */

export function stringSimilarity(str1: string, str2: string): number {
  const s1 = normalizeText(str1);
  const s2 = normalizeText(str2);
  if (s1 === s2) return 1.0;
  if (!s1 || !s2) return 0.0;

  const len1 = s1.length;
  const len2 = s2.length;
  const matrix: number[][] = Array.from({ length: len1 + 1 }, () =>
    new Array(len2 + 1).fill(0),
  );

  for (let i = 0; i <= len1; i++) matrix[i][0] = i;
  for (let j = 0; j <= len2; j++) matrix[0][j] = j;

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      );
    }
  }

  const distance = matrix[len1][len2];
  return 1 - distance / Math.max(len1, len2);
}

/**
 * Reconciles saved schedule against new offering courses using multi-layer matching:
 * Layer 1: share_course_id + class
 * Layer 2: course_code + class
 * Layer 3: Fingerprint (normalized course + class + semester + sks)
 * Layer 4: Fuzzy Match (same semester + class, course similarity >= 0.92)
 */

export function reconcileSavedSchedule(
  savedSchedule: CourseSchedule[] | null | undefined,
  newOffering: OfferingCourse[] | null | undefined,
): ReconcileResult {
  const initialSchedule = savedSchedule || [];
  const offeringList = newOffering || [];

  const summary: ReconcileSummary = {
    matched: 0,
    updated: 0,
    unchanged: 0,
    obsolete: 0,
    manual_review: 0,
    removed: 0,
  };

  if (initialSchedule.length === 0) {
    return {
      success: true,
      reconciledSchedule: [],
      summary,
    };
  }

  // Flatten and enrich offering courses
  const allOfferingCourses: CourseSchedule[] = [];
  const offeredCodes = new Set<string>();

  for (const group of offeringList) {
    for (const c of group.courses || []) {
      const semesterName = group.semester || c.semester || "";
      const shareId =
        c.share_course_id ||
        generateShareCourseId({
          courseName: c.course,
          sks: c.sks,
          category: c.category,
        });

      const enriched: CourseSchedule = {
        ...c,
        semester: semesterName,
        share_course_id: shareId,
      };

      allOfferingCourses.push(enriched);
      if (c.code) offeredCodes.add(normalizeCode(c.code));
    }
  }

  // Build O(1) lookup maps
  const mapShareIdClass = new Map<string, CourseSchedule>();
  const mapCodeClass = new Map<string, CourseSchedule>();
  const mapFingerprint = new Map<string, CourseSchedule>();

  for (const course of allOfferingCourses) {
    const cls = normalizeClass(course.class);
    const code = normalizeCode(course.code);
    const shareId = normalizeCode(course.share_course_id);

    if (shareId && cls) {
      mapShareIdClass.set(`${shareId}::${cls}`, course);
    }
    if (code && cls) {
      mapCodeClass.set(`${code}::${cls}`, course);
    }

    const fpKey = `${normalizeText(course.course)}::${cls}::${normalizeText(course.semester)}::${normalizeSks(course.sks)}`;
    mapFingerprint.set(fpKey, course);
  }

  const reconciledSchedule: CourseSchedule[] = [];

  for (const savedCourse of initialSchedule) {
    let matchedOffering: CourseSchedule | null = null;

    const savedClass = normalizeClass(savedCourse.class);
    const savedCode = normalizeCode(savedCourse.code);
    const savedShareId = normalizeCode(savedCourse.share_course_id);

    // Layer 1: share_course_id + class
    if (savedShareId && savedClass) {
      const key = `${savedShareId}::${savedClass}`;
      if (mapShareIdClass.has(key)) {
        matchedOffering = mapShareIdClass.get(key)!;
      }
    }

    // Layer 2: course_code + class (backward compatibility)
    if (!matchedOffering && savedCode && savedClass) {
      const key = `${savedCode}::${savedClass}`;
      if (mapCodeClass.has(key)) {
        matchedOffering = mapCodeClass.get(key)!;
      }
    }

    // Layer 3: Fingerprint (exact match)
    if (!matchedOffering) {
      const fpKey = `${normalizeText(savedCourse.course)}::${savedClass}::${normalizeText(savedCourse.semester)}::${normalizeSks(savedCourse.sks)}`;
      if (mapFingerprint.has(fpKey)) {
        matchedOffering = mapFingerprint.get(fpKey)!;
      }
    }

    // Layer 4: Fuzzy match
    if (!matchedOffering) {
      const candidates: CourseSchedule[] = [];
      for (const off of allOfferingCourses) {
        const offClass = normalizeClass(off.class);
        if (savedClass && offClass !== savedClass) continue;

        const sameSem =
          !savedCourse.semester ||
          !off.semester ||
          normalizeText(savedCourse.semester) === normalizeText(off.semester);

        if (!sameSem) continue;

        const sim = stringSimilarity(savedCourse.course, off.course);
        if (sim >= 0.92) {
          candidates.push(off);
        }
      }

      if (candidates.length === 1) {
        matchedOffering = candidates[0];
      } else if (candidates.length > 1) {
        summary.manual_review++;
        reconciledSchedule.push({
          ...savedCourse,
          needs_manual_review: true,
          saved_in_submit: false,
          schedule_submit_id: "",
        });
        continue;
      }
    }

    if (matchedOffering) {
      summary.matched++;

      const isScheduleIdChanged =
        savedCourse.schedule_id !== matchedOffering.schedule_id;

      const hasDynamicChange =
        isScheduleIdChanged ||
        savedCourse.code !== matchedOffering.code ||
        savedCourse.course !== matchedOffering.course ||
        savedCourse.category !== matchedOffering.category ||
        savedCourse.lecture !== matchedOffering.lecture ||
        savedCourse.day !== matchedOffering.day ||
        savedCourse.hour !== matchedOffering.hour ||
        savedCourse.classroom !== matchedOffering.classroom ||
        savedCourse.semester !== matchedOffering.semester ||
        savedCourse.sks !== matchedOffering.sks;

      if (hasDynamicChange) {
        summary.updated++;
      } else {
        summary.unchanged++;
      }

      const preservedShareId =
        savedCourse.share_course_id || matchedOffering.share_course_id;

      const reconciledCourse: CourseSchedule = {
        ...matchedOffering,
        share_course_id: preservedShareId,
        saved_in_submit: savedCourse.saved_in_submit ?? false,
        schedule_submit_id: savedCourse.saved_in_submit
          ? savedCourse.schedule_submit_id || matchedOffering.schedule_id
          : "",
      };

      // Clean runtime flags
      delete reconciledCourse.is_obsolete;
      delete reconciledCourse.needs_manual_review;
      delete reconciledCourse.is_removed;

      reconciledSchedule.push(reconciledCourse);
    } else {
      // Unmatched handling
      const codeExistsInOffering = offeredCodes.has(savedCode);
      if (!codeExistsInOffering && savedCode) {
        summary.removed++;
        reconciledSchedule.push({
          ...savedCourse,
          is_removed: true,
          saved_in_submit: false,
          schedule_submit_id: "",
        });
      } else {
        summary.obsolete++;
        reconciledSchedule.push({
          ...savedCourse,
          is_obsolete: true,
          saved_in_submit: false,
          schedule_submit_id: "",
        });
      }
    }
  }

  // Atomic Validation Check
  for (const item of reconciledSchedule) {
    if (!item.is_removed && !item.is_obsolete && !item.needs_manual_review) {
      if (
        !item.schedule_id ||
        !item.share_course_id ||
        !item.semester ||
        !item.day ||
        !item.hour
      ) {
        return {
          success: false,
          reconciledSchedule: initialSchedule,
          summary,
          error: `Validation failed for course ${item.course}`,
        };
      }
    }
  }

  return {
    success: true,
    reconciledSchedule,
    summary,
  };
}
