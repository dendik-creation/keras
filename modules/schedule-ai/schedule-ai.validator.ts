import { z } from "zod";
import type { CourseSchedule, OfferingCourse } from "@/types/course_schedule";
import { ValidationError } from "@/lib/server/http-error";
import { MAX_SKS_CAP } from "@/modules/schedule-ai/schedule-ai.constants";
import {
  OPTIMIZATION_GOALS,
  PREFERRED_TIME_OPTIONS,
  STUDY_DAYS,
  type AiPreference,
  type ScheduleValidationIssues,
} from "@/modules/schedule-ai/schedule-ai.types";
import { timeRangeToMinutes, timeToMinutes } from "@/modules/schedule-ai/schedule-ai.utils";
import { coursesOverlap, targetSksFor } from "@/modules/schedule-ai/schedule-ai.scoring";

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Shared client/server schema for the multi-step "Generate with AI" form. */
export const aiPreferenceSchema = z
  .object({
    target_sks: z
      .object({
        mode: z.enum(["max", "custom"]),
        value: z.number().int().positive().max(MAX_SKS_CAP).nullable(),
      })
      .refine((v) => v.mode === "max" || v.value !== null, {
        message: "Masukkan jumlah SKS yang diinginkan",
        path: ["value"],
      }),
    preferred_semester: z.string().min(1).nullable().default(null),
    preferred_days: z.array(z.enum(STUDY_DAYS)).default([]),
    earliest_start: z.string().regex(TIME_RE, "Format waktu tidak valid"),
    latest_end: z.string().regex(TIME_RE, "Format waktu tidak valid"),
    preferred_time: z.enum(PREFERRED_TIME_OPTIONS),
    max_idle_minutes: z.union([
      z.literal(0),
      z.literal(30),
      z.literal(60),
      z.literal(90),
      z.null(),
    ]),
    preferred_courses: z.array(z.string()).default([]),
    avoid_courses: z.array(z.string()).default([]),
    preferred_lecturers: z.array(z.string()).default([]),
    avoid_lecturers: z.array(z.string()).default([]),
    goal: z.enum(OPTIMIZATION_GOALS),
  })
  .refine((v) => timeToMinutes(v.earliest_start) < timeToMinutes(v.latest_end), {
    message: "Jam mulai harus lebih awal dari jam selesai",
    path: ["latest_end"],
  });

export type AiPreferenceParsed = z.infer<typeof aiPreferenceSchema>;

/** Parse & validate the request body sent from the "Generate with AI" dialog. */
export function parseAiPreference(body: unknown): AiPreference {
  const result = aiPreferenceSchema.safeParse(body);
  if (!result.success) {
    throw new ValidationError("Preferensi tidak valid.", {
      issues: result.error.issues.map((i) => ({
        path: i.path.join("."),
        message: i.message,
      })),
    });
  }
  return result.data;
}

const offeringCourseScheduleSchema = z.object({
  code: z.string(),
  class: z.string(),
  course: z.string(),
  category: z.string(),
  sks: z.string(),
  lecture: z.string(),
  schedule_id: z.string(),
  day: z.string(),
  hour: z.string(),
  classroom: z.string(),
  schedule_submit_id: z.string().optional(),
  saved_in_submit: z.boolean().optional(),
});

const offeringCourseSchema = z.object({
  latest_update: z.string(),
  semester: z.string(),
  courses: z.array(offeringCourseScheduleSchema),
});

/**
 * Parse the offering courses the client already has cached (from the
 * "offering_course" localStorage entry) — sent along with the generate
 * request so we don't re-fetch the whole catalog from the university again.
 */
export function parseOfferingCourses(body: unknown): OfferingCourse[] {
  const result = z.array(offeringCourseSchema).safeParse(body);
  if (!result.success || result.data.length === 0) {
    throw new ValidationError(
      "Data mata kuliah tidak tersedia. Perbarui ketersediaan jadwal dulu, lalu coba lagi.",
    );
  }
  return result.data;
}

const aiRawResponseSchema = z.object({
  selected_schedule_ids: z.array(z.string().min(1)),
});

/** Parse the model's raw JSON reply — throws on anything but the exact expected shape. */
export function parseAiRawResponse(raw: unknown): string[] {
  const result = aiRawResponseSchema.safeParse(raw);
  if (!result.success) {
    throw new Error("AI response did not match the expected JSON schema");
  }
  return result.data.selected_schedule_ids;
}

export type ScheduleValidationResult =
  | { valid: true; courses: CourseSchedule[]; issues: ScheduleValidationIssues }
  | { valid: false; reason: string; issues: ScheduleValidationIssues };

/** Zeroed issue set — start from this and only fill in what's actually broken. */
export function emptyValidationIssues(
  overrides: Partial<ScheduleValidationIssues> = {},
): ScheduleValidationIssues {
  return {
    invalid_id: [],
    duplicate_course: [],
    overlap: [],
    outside_day: [],
    outside_time: [],
    sks_exceeded: false,
    total_sks: 0,
    target_sks: 0,
    ...overrides,
  };
}

/** Human-readable summary of an issue set — for logs and the final error message, not for the model. */
function describeIssues(issues: ScheduleValidationIssues): string {
  const parts: string[] = [];
  if (issues.invalid_id.length)
    parts.push(`schedule_id tidak dikenal: ${issues.invalid_id.join(", ")}`);
  if (issues.duplicate_course.length)
    parts.push(`mata kuliah dipilih lebih dari satu kelas: ${issues.duplicate_course.join(", ")}`);
  if (issues.overlap.length)
    parts.push(
      `jadwal bentrok: ${issues.overlap.map((o) => `${o.courseA} vs ${o.courseB}`).join("; ")}`,
    );
  if (issues.outside_day.length)
    parts.push(`kelas di luar hari yang diizinkan: ${issues.outside_day.join(", ")}`);
  if (issues.outside_time.length)
    parts.push(`kelas di luar rentang waktu: ${issues.outside_time.join(", ")}`);
  if (issues.sks_exceeded)
    parts.push(`total SKS (${issues.total_sks}) melebihi target (${issues.target_sks})`);
  return parts.join(" | ");
}

/**
 * Re-checks every hard constraint against the model's selection. The AI's
 * output is never trusted — this is the actual source of truth for whether a
 * generated schedule is acceptable. Unlike a first-violation-wins check,
 * this collects every violation so a retry prompt can point at all of them
 * at once instead of trickling out one failure per attempt.
 */
export function validateGeneratedSchedule(
  selectedIds: string[],
  availableCourses: CourseSchedule[],
  preference: AiPreference,
): ScheduleValidationResult {
  const issues = emptyValidationIssues({ target_sks: targetSksFor(preference) });

  const byId = new Map(availableCourses.map((c) => [c.schedule_id, c]));
  const seenIds = new Set<string>();
  const courses: CourseSchedule[] = [];
  for (const id of selectedIds) {
    if (seenIds.has(id)) continue;
    seenIds.add(id);
    const course = byId.get(id);
    if (!course) {
      issues.invalid_id.push(id);
      continue;
    }
    courses.push(course);
  }

  const allowedDays = new Set<string>(
    preference.preferred_days.length > 0 ? preference.preferred_days : STUDY_DAYS,
  );
  const earliestMinutes = timeToMinutes(preference.earliest_start);
  const latestMinutes = timeToMinutes(preference.latest_end);

  const byCode = new Map<string, CourseSchedule[]>();
  for (const c of courses) {
    const bucket = byCode.get(c.code);
    if (bucket) bucket.push(c);
    else byCode.set(c.code, [c]);

    if (!(STUDY_DAYS as readonly string[]).includes(c.day) || !allowedDays.has(c.day)) {
      issues.outside_day.push(c.course);
    }
    const { start, end } = timeRangeToMinutes(c.hour);
    if (start < earliestMinutes || end > latestMinutes) {
      issues.outside_time.push(c.course);
    }
  }
  for (const [, bucket] of byCode) {
    if (bucket.length > 1) issues.duplicate_course.push(bucket[0].course);
  }

  for (let i = 0; i < courses.length; i++) {
    for (let j = i + 1; j < courses.length; j++) {
      if (coursesOverlap(courses[i], courses[j])) {
        issues.overlap.push({ courseA: courses[i].course, courseB: courses[j].course });
      }
    }
  }

  issues.total_sks = courses.reduce((acc, c) => acc + (Number(c.sks) || 0), 0);
  issues.sks_exceeded = issues.total_sks > issues.target_sks;

  const hasIssues =
    issues.invalid_id.length > 0 ||
    issues.duplicate_course.length > 0 ||
    issues.overlap.length > 0 ||
    issues.outside_day.length > 0 ||
    issues.outside_time.length > 0 ||
    issues.sks_exceeded;

  if (hasIssues) {
    return { valid: false, reason: describeIssues(issues), issues };
  }

  return { valid: true, courses, issues };
}
