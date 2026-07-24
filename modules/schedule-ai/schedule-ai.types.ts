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

/** Minimal per-class shape sent to the LLM — keeps the prompt cheap. Time is pre-parsed so the model never has to split a "HH:MM-HH:MM" string itself. */
export type LightweightCourse = {
  id: string;
  course: string;
  class: string;
  lecture: string;
  day: string;
  start: string;
  end: string;
  sks: number;
  semester: string;
};

export type LightweightCoursesPayload = {
  courses: LightweightCourse[];
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
