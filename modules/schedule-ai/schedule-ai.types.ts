import type { CourseSchedule } from "@/types/course_schedule";

/** A CourseSchedule tagged with the semester group it was offered under. */
export type CourseWithSemester = CourseSchedule & { semester: string };

/** Weekday labels the app uses everywhere else (Indonesian, Senin-Jumat only). */
export const STUDY_DAYS = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"] as const;
export type StudyDay = (typeof STUDY_DAYS)[number];

export const OPTIMIZATION_GOALS = [
  "balanced",
  "compact",
  "less_days",
  "morning",
  "afternoon",
  "fast_graduation",
] as const;
export type OptimizationGoal = (typeof OPTIMIZATION_GOALS)[number];

export const PREFERRED_TIME_OPTIONS = ["morning", "afternoon", "none"] as const;
export type PreferredTime = (typeof PREFERRED_TIME_OPTIONS)[number];

export const IDLE_TIME_OPTIONS = [0, 30, 60, 90, null] as const;
export type IdleTimeOption = 0 | 30 | 60 | 90 | null;

/** Shape collected by the multi-step "Generate with AI" form. */
export type AiPreference = {
  target_sks: { mode: "max" | "custom"; value: number | null };
  preferred_semester: string | null;
  preferred_days: StudyDay[];
  earliest_start: string;
  latest_end: string;
  preferred_time: PreferredTime;
  max_idle_minutes: IdleTimeOption;
  preferred_courses: string[];
  avoid_courses: string[];
  preferred_lecturers: string[];
  avoid_lecturers: string[];
  goal: OptimizationGoal;
};

/**
 * One class as sent to the LLM: [id, courseId, classId, lecturerId,
 * semesterId, day, start, end, sks]. courseId/lecturerId/semesterId are
 * opaque per-request tokens (see schedule-ai.compact.ts) — the model never
 * needs the real names, only token equality against prefs.pref_c/pref_l.
 * day is 1-5 (Senin..Jumat), start/end are minutes-since-midnight.
 */
export type CompactRow = [
  id: string,
  courseId: string,
  classId: string,
  lecturerId: string,
  semesterId: string,
  day: number,
  start: number,
  end: number,
  sks: number,
];

export type CompactPreferences = {
  sks: number | "max";
  semester: string | null;
  days: number[];
  start: number;
  end: number;
  time: PreferredTime;
  idle: IdleTimeOption;
  pref_c: string[];
  pref_l: string[];
  goal: OptimizationGoal;
};

export type CompactPayload = {
  prefs: CompactPreferences;
  rows: CompactRow[];
};

/** Raw, untrusted shape the model is instructed to return. */
export type AiRawResponse = {
  selected_schedule_ids: string[];
};

export type GeneratedSchedule = {
  courses: CourseSchedule[];
};

/**
 * Full structured breakdown of every hard-constraint violation found in a
 * selection. Collected exhaustively (not short-circuited) so a retry prompt
 * can tell the model exactly, and only, what to fix.
 */
export type ScheduleValidationIssues = {
  invalid_id: string[];
  duplicate_course: string[];
  overlap: { courseA: string; courseB: string }[];
  outside_day: string[];
  outside_time: string[];
  sks_exceeded: boolean;
  total_sks: number;
  target_sks: number;
};
