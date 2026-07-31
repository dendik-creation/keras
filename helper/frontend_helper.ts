import { CourseSchedule, OfferingCourse } from "@/types/course_schedule";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { setLocalStorage } from "@/helper/local_storage";

export const SAVED_SCHEDULE_KEY = "krs_saved_schedule";
export const OFFERING_COURSE_KEY = "offering_course";

/**
 * Get scheduling: read the /api/schedule NDJSON stream to completion.
 * Backend keeps the connection alive with `progress` events during the
 * tens-of-seconds scrape; a plain buffered read never yields the final
 * `{ type: "done", data }` object. Shared by /schedule and /adopt-schedule
 * so both pages run the exact same get-schedule action.
 */
export async function fetchOfferingCourses(
  onProgress: (done: number, total: number) => void,
): Promise<OfferingCourse[] | null> {
  const response = await fetch("/api/schedule");
  if (response.status === 401) {
    if (typeof window !== "undefined") window.location.href = "/login";
    return null;
  }
  if (!response.ok || !response.body) return null;

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let finalData: OfferingCourse[] | null = null;
  let streamError: string | null = null;

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.trim()) continue;
      const event = JSON.parse(line);
      if (event.type === "progress") {
        onProgress(event.done, event.total);
      } else if (event.type === "done") {
        finalData = event.data;
      } else if (event.type === "error") {
        if (event.status === 401 && typeof window !== "undefined") {
          window.location.href = "/login";
        }
        streamError = event.message;
      }
    }
  }

  if (streamError) throw new Error(streamError);
  return finalData;
}

export type GenerateScheduleStage = "filtering" | "generating" | "repairing" | "fallback";

/**
 * POST /api/schedule-ai and read its NDJSON stream to completion — mirrors
 * fetchOfferingCourses above. The AI/repair/fallback pipeline streams
 * status events for the same reason the schedule scrape does: keep the
 * connection "active" past a reverse proxy's idle-read timeout instead of
 * risking a 504 on an already-successful backend result.
 */
export async function generateScheduleStream(
  body: Record<string, unknown>,
  onStage?: (stage: GenerateScheduleStage) => void,
): Promise<CourseSchedule[]> {
  const response = await fetch("/api/schedule-ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok || !response.body) {
    if (response.status === 401) {
      if (typeof window !== "undefined") window.location.href = "/login";
      throw new Error("Sesi telah habis, silakan login kembali.");
    }
    const errorBody = await response.json().catch(() => null);
    throw new Error(errorBody?.message || "Gagal menghasilkan jadwal. Silakan coba lagi.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let finalCourses: CourseSchedule[] | null = null;
  let streamError: string | null = null;

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.trim()) continue;
      const event = JSON.parse(line);
      if (event.type === "status") {
        onStage?.(event.stage);
      } else if (event.type === "done") {
        finalCourses = event.data?.courses ?? [];
      } else if (event.type === "error") {
        if (event.status === 401 && typeof window !== "undefined") {
          window.location.href = "/login";
        }
        streamError = event.message;
      }
    }
  }

  if (streamError) throw new Error(streamError);
  if (finalCourses === null) {
    throw new Error("Tidak ada jadwal yang cocok dengan preferensimu.");
  }
  return finalCourses;
}

/** Reset submit-tracking fields on courses about to become the saved schedule. */
export const stampForAdoption = (courses: CourseSchedule[]): CourseSchedule[] =>
  courses.map((course) => ({
    ...course,
    schedule_submit_id: "",
    saved_in_submit: false,
  }));

/** Persist the selected courses under the app's single saved-schedule key. */
export const saveScheduleToStorage = (courses: CourseSchedule[]): void => {
  setLocalStorage(SAVED_SCHEDULE_KEY, stampForAdoption(courses));
};

/**
 * One-time backfill: fills `semester` on courses that don't have it yet by
 * matching course code against current offering_course data. Returns the
 * same array reference when nothing changed, so callers can skip a
 * redundant write and this naturally becomes a no-op after the first run.
 */
export const backfillCourseSemesters = (
  courses: CourseSchedule[],
  offeringCourse: OfferingCourse[] | null,
): CourseSchedule[] => {
  if (!offeringCourse || offeringCourse.length === 0) return courses;

  const semesterByCode = new Map<string, string>();
  offeringCourse.forEach((group) => {
    group.courses.forEach((c) => {
      if (!semesterByCode.has(c.code)) semesterByCode.set(c.code, group.semester);
    });
  });

  let changed = false;
  const patched = courses.map((course) => {
    if (course.semester) return course;
    const semester = semesterByCode.get(course.code);
    if (!semester) return course;
    changed = true;
    return { ...course, semester };
  });

  return changed ? patched : courses;
};

export const parseTimeRange = (timeStr: string) => {
  if (!timeStr) return { start: 0, end: 0 };
  const [startStr, endStr] = timeStr.split(" - ");

  const toMinutes = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };

  return { start: toMinutes(startStr), end: toMinutes(endStr) };
};

export const ymdToIdDate = (
  dateString: string | null | undefined,
  withTime: boolean = false,
  timeOnly: boolean = false,
  withDay: boolean = false,
) => {
  if (!dateString) return null;
  const parsedDate = new Date(dateString as string);

  if (timeOnly) {
    return format(parsedDate, "HH:mm", { locale: id });
  }

  const formatString = withDay
    ? withTime
      ? "EEEE, d MMMM yyyy - HH:mm"
      : "EEEE, d MMMM yyyy"
    : withTime
      ? "d MMMM yyyy - HH:mm"
      : "d MMMM yyyy";

  return format(parsedDate, formatString, { locale: id });
};

export const checkConflict = (
  target: CourseSchedule,
  selected: CourseSchedule[],
) => {
  const targetTime = parseTimeRange(target.hour);

  for (const item of selected) {
    if (item.code === target.code) continue;

    if (item.day.toLowerCase() === target.day.toLowerCase()) {
      const itemTime = parseTimeRange(item.hour);
      if (targetTime.start < itemTime.end && targetTime.end > itemTime.start) {
        return item;
      }
    }
  }
  return null;
};

export const checkAllConflicts = (
  target: CourseSchedule,
  selected: CourseSchedule[],
): CourseSchedule[] => {
  const targetTime = parseTimeRange(target.hour);
  const conflicts: CourseSchedule[] = [];

  for (const item of selected) {
    if (item.code === target.code) continue;

    if (item.day.toLowerCase() === target.day.toLowerCase()) {
      const itemTime = parseTimeRange(item.hour);
      if (targetTime.start < itemTime.end && targetTime.end > itemTime.start) {
        conflicts.push(item);
      }
    }
  }
  return conflicts;
};

