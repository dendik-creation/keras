import { ValidationError } from "@/lib/server/http-error";

export type SyncTargetCourse = {
  code: string;
  class: string;
  schedule_submit_id?: string;
};

export type DeleteTargetCourse = {
  course_code: string;
  course_class: string;
};

/** Parse & validate the `courses` query param for schedule sync (GET). */
export function parseSyncCourses(
  searchParams: URLSearchParams,
): SyncTargetCourse[] {
  const paramsJson = searchParams.get("courses");

  if (!paramsJson) {
    throw new ValidationError("Parameter 'courses' diperlukan.");
  }

  try {
    return JSON.parse(paramsJson);
  } catch (e) {
    throw new ValidationError("Format JSON salah.");
  }
}

/** Validate the `schedule_ids` payload for submit (POST). */
export function validateScheduleIds(body: unknown): string[] {
  const { schedule_ids } = (body ?? {}) as { schedule_ids?: unknown };

  if (
    !schedule_ids ||
    !Array.isArray(schedule_ids) ||
    schedule_ids.length === 0
  ) {
    throw new ValidationError("Tidak ada jadwal yang dipilih.");
  }

  return schedule_ids as string[];
}

/** Parse & validate the `courses` payload for release (DELETE). */
export function parseDeleteCourses(body: unknown): DeleteTargetCourse[] {
  const { courses } = (body ?? {}) as { courses?: string };

  let targetCourses: DeleteTargetCourse[] = [];
  try {
    targetCourses = JSON.parse(courses as string);
  } catch (e) {
    throw new ValidationError("Format JSON pada 'courses' salah.");
  }

  if (
    !targetCourses ||
    !Array.isArray(targetCourses) ||
    targetCourses.length === 0
  ) {
    throw new ValidationError(
      "Data mata kuliah yang akan dihapus tidak valid.",
    );
  }

  return targetCourses;
}
