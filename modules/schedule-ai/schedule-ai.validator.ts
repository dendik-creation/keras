import { z } from "zod";
import type { CourseSchedule } from "@/types/course_schedule";
import { ValidationError } from "@/lib/server/http-error";
import { MAX_SKS_CAP } from "@/modules/schedule-ai/schedule-ai.constants";
import {
  OPTIMIZATION_GOALS,
  PREFERRED_TIME_OPTIONS,
  STUDY_DAYS,
  type AiPreference,
} from "@/modules/schedule-ai/schedule-ai.types";
import { timeRangeToMinutes } from "@/modules/schedule-ai/schedule-ai.utils";

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

const timeToMinutes = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

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
  | { valid: true; courses: CourseSchedule[] }
  | { valid: false; reason: string };

/**
 * Re-checks every hard constraint against the model's selection. The AI's
 * output is never trusted — this is the actual source of truth for whether a
 * generated schedule is acceptable.
 */
export function validateGeneratedSchedule(
  selectedIds: string[],
  availableCourses: CourseSchedule[],
  preference: AiPreference,
): ScheduleValidationResult {
  if (new Set(selectedIds).size !== selectedIds.length) {
    return { valid: false, reason: "Terdapat schedule_id duplikat pada hasil AI" };
  }

  const byId = new Map(availableCourses.map((c) => [c.schedule_id, c]));
  const courses: CourseSchedule[] = [];
  for (const id of selectedIds) {
    const course = byId.get(id);
    if (!course) {
      return { valid: false, reason: `schedule_id tidak dikenal: ${id}` };
    }
    courses.push(course);
  }

  const codeCounts = new Map<string, number>();
  for (const c of courses) {
    codeCounts.set(c.code, (codeCounts.get(c.code) || 0) + 1);
  }
  for (const [, count] of codeCounts) {
    if (count > 1) {
      return { valid: false, reason: "Ada mata kuliah yang dipilih lebih dari satu kelas" };
    }
  }

  const allowedDays = new Set<string>(
    preference.preferred_days.length > 0 ? preference.preferred_days : STUDY_DAYS,
  );
  for (const c of courses) {
    if (!(STUDY_DAYS as readonly string[]).includes(c.day)) {
      return { valid: false, reason: `Kelas di luar Senin-Jumat: ${c.course}` };
    }
    if (!allowedDays.has(c.day)) {
      return { valid: false, reason: `Kelas di luar hari yang dipilih: ${c.course}` };
    }
  }

  const earliestMinutes = timeToMinutes(preference.earliest_start);
  const latestMinutes = timeToMinutes(preference.latest_end);
  for (const c of courses) {
    const { start, end } = timeRangeToMinutes(c.hour);
    if (start < earliestMinutes || end > latestMinutes) {
      return { valid: false, reason: `Jam kelas di luar rentang waktu: ${c.course}` };
    }
  }

  for (let i = 0; i < courses.length; i++) {
    const a = timeRangeToMinutes(courses[i].hour);
    for (let j = i + 1; j < courses.length; j++) {
      if (courses[i].day !== courses[j].day) continue;
      const b = timeRangeToMinutes(courses[j].hour);
      if (a.start < b.end && a.end > b.start) {
        return {
          valid: false,
          reason: `Jadwal bentrok: ${courses[i].course} vs ${courses[j].course}`,
        };
      }
    }
  }

  const targetSks =
    preference.target_sks.mode === "custom" && preference.target_sks.value
      ? preference.target_sks.value
      : MAX_SKS_CAP;
  const totalSks = courses.reduce((acc, c) => acc + (Number(c.sks) || 0), 0);
  if (totalSks > targetSks) {
    return { valid: false, reason: `Total SKS (${totalSks}) melebihi target (${targetSks})` };
  }

  return { valid: true, courses };
}
