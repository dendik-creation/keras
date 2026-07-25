import {
  STUDY_DAYS,
  type AiPreference,
  type CompactPayload,
  type CompactRow,
  type CourseWithSemester,
} from "@/modules/schedule-ai/schedule-ai.types";
import { timeRangeToMinutes, timeToMinutes } from "@/modules/schedule-ai/schedule-ai.utils";

const DAY_NUMBER = new Map<string, number>(STUDY_DAYS.map((day, i) => [day, i + 1]));

function tokenizer(prefix: string): (value: string) => string {
  const tokens = new Map<string, string>();
  return (value: string) => {
    let token = tokens.get(value);
    if (!token) {
      token = `${prefix}${tokens.size + 1}`;
      tokens.set(value, token);
    }
    return token;
  };
}

/**
 * Builds the compact payload sent to the AI: long repeated strings
 * (lecturer names, course codes) become short per-request tokens, times
 * become minutes-since-midnight, days become 1-5, and each class is a
 * positional array instead of a repeated-keys object. No token->name
 * dictionary is sent — the model only ever compares tokens for equality
 * against prefs.pref_c/pref_l, never needs the real name, so shipping one
 * would just be wasted tokens. idMap (short row id -> real schedule_id)
 * stays server-side to translate the model's answer back afterwards.
 */
export function buildCompactPayload(
  courses: CourseWithSemester[],
  preference: AiPreference,
): {
  payload: CompactPayload;
  idMap: Map<string, string>;
  courseByShortId: Map<string, CourseWithSemester>;
} {
  const lecturerToken = tokenizer("L");
  const courseToken = tokenizer("C");
  const semesterToken = tokenizer("S");
  const idMap = new Map<string, string>();
  const courseByShortId = new Map<string, CourseWithSemester>();

  const rows: CompactRow[] = [];
  for (const course of courses) {
    if (!course.schedule_id) continue;
    const shortId = String(idMap.size + 1);
    idMap.set(shortId, course.schedule_id);
    courseByShortId.set(shortId, course);

    const { start, end } = timeRangeToMinutes(course.hour);
    rows.push([
      shortId,
      courseToken(course.code),
      course.class,
      lecturerToken(course.lecture),
      semesterToken(course.semester),
      DAY_NUMBER.get(course.day) ?? 0,
      start,
      end,
      Number(course.sks) || 0,
    ]);
  }

  const payload: CompactPayload = {
    prefs: {
      sks:
        preference.target_sks.mode === "custom" && preference.target_sks.value
          ? preference.target_sks.value
          : "max",
      semester: preference.preferred_semester ? semesterToken(preference.preferred_semester) : null,
      days: preference.preferred_days.map((d) => DAY_NUMBER.get(d) ?? 0),
      start: timeToMinutes(preference.earliest_start),
      end: timeToMinutes(preference.latest_end),
      time: preference.preferred_time,
      idle: preference.max_idle_minutes,
      pref_c: preference.preferred_courses.map(courseToken),
      pref_l: preference.preferred_lecturers.map(lecturerToken),
      goal: preference.goal,
    },
    rows,
  };

  return { payload, idMap, courseByShortId };
}
