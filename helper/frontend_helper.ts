import { CourseSchedule } from "@/types/course_schedule";
import { format } from "date-fns";
import { id } from "date-fns/locale";

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
