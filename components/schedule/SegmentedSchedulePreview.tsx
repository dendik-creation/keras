"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { CalendarSearch, Clock } from "lucide-react";
import { CourseSchedule } from "@/types/course_schedule";
import { parseTimeRange } from "@/helper/frontend_helper";
import { ScheduleCard } from "./ScheduleCard";
import { cn } from "@/lib/utils";

interface SegmentedSchedulePreviewProps {
  selectedCourses?: CourseSchedule[];
  courses?: CourseSchedule[];
  onRemoveCourse?: (course: CourseSchedule) => void;
  onCardClick?: (course: CourseSchedule) => void;
  isSubmitMode?: boolean;
  readyReleases?: { course_code: string; course_class: string }[];
  isSubmitting?: boolean;
  className?: string;
}

const DAYS = [
  { key: "senin", label: "Sen", full: "Senin" },
  { key: "selasa", label: "Sel", full: "Selasa" },
  { key: "rabu", label: "Rab", full: "Rabu" },
  { key: "kamis", label: "Kam", full: "Kamis" },
  { key: "jumat", label: "Jum", full: "Jumat" },
];

export function SegmentedSchedulePreview({
  selectedCourses,
  courses,
  onRemoveCourse,
  onCardClick,
  isSubmitMode = false,
  readyReleases = [],
  isSubmitting = false,
  className,
}: SegmentedSchedulePreviewProps) {
  const [activeDay, setActiveDay] = useState<string>("senin");
  const activeCourses = courses ?? selectedCourses ?? [];

  // Derived state: calculate courses grouped by day directly without useEffect race conditions
  const coursesByDay = useMemo(() => {
    const map: Record<string, CourseSchedule[]> = {
      senin: [],
      selasa: [],
      rabu: [],
      kamis: [],
      jumat: [],
    };

    activeCourses.forEach((c) => {
      if (!c.day) return;
      const dayKey = c.day.trim().toLowerCase();
      if (map[dayKey]) {
        map[dayKey].push(c);
      }
    });

    Object.keys(map).forEach((dayKey) => {
      map[dayKey].sort(
        (a, b) =>
          parseTimeRange(a.hour).start - parseTimeRange(b.hour).start,
      );
    });

    return map;
  }, [activeCourses]);

  const activeDayObj = DAYS.find((d) => d.key === activeDay) || DAYS[0];
  const dayCourses = useMemo(() => {
    return coursesByDay[activeDay] || [];
  }, [coursesByDay, activeDay]);

  return (
    <div className={cn("flex flex-col gap-3 w-full", className)}>
      {/* Segmented Day Selector: Swiss Style with top red indicator for active state */}
      <div className="grid grid-cols-5 gap-1.5 p-1 bg-white border-2 border-black">
        {DAYS.map((d) => {
          const count = (coursesByDay[d.key] || []).length;
          const isActive = d.key === activeDay;
          return (
            <button
              key={d.key}
              type="button"
              onClick={() => setActiveDay(d.key)}
              className={cn(
                "relative flex flex-col items-center justify-center py-2 px-1 text-xs font-black uppercase tracking-wider transition-all duration-150 border-2 select-none",
                isActive
                  ? "bg-black text-white border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                  : "bg-white text-black border-black hover:bg-black/5",
              )}
            >
              {isActive && (
                <span className="absolute top-0 inset-x-0 h-1 bg-[#FF3000]" />
              )}
              <span>{d.label}</span>
              {count > 0 && (
                <span
                  className={cn(
                    "text-[9px] px-1 py-0.2 font-bold mt-0.5 border",
                    isActive
                      ? "bg-white text-black border-white"
                      : "bg-black text-white border-black",
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Active Day Header: Swiss Style clean white/grey header with thin border */}
      <div className="flex justify-between items-center px-3.5 py-2 bg-[#F2F2F2] text-black border-2 border-black">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-[#FF3000]" />
          <h4 className="font-black text-sm uppercase tracking-widest text-black">
            {activeDayObj.full}
          </h4>
        </div>
        <span className="text-xs font-bold uppercase tracking-wider text-[#555555]">
          {dayCourses.length} Mata Kuliah
        </span>
      </div>

      {/* Animated Day Content */}
      <div className="relative min-h-[160px] bg-white border-2 border-black p-3 overflow-hidden">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeDay}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="space-y-2.5"
          >
            {dayCourses.length > 0 ? (
              dayCourses.map((course) => {
                const isSelectedForRelease = readyReleases.some(
                  (item) =>
                    item.course_code === course.code &&
                    item.course_class === course.class,
                );

                return (
                  <ScheduleCard
                    key={course.schedule_id || `${course.code}-${course.class}`}
                    course={course}
                    onRemove={onRemoveCourse}
                    onCardClick={onCardClick}
                    isSubmitMode={isSubmitMode}
                    isSelectedForRelease={isSelectedForRelease}
                    isSubmitting={isSubmitting}
                  />
                );
              })
            ) : (
              <div className="min-h-[140px] flex flex-col items-center justify-center gap-2 text-center bg-[#F2F2F2] border border-black/20 p-6">
                <CalendarSearch className="w-7 h-7 text-[#FF3000]" />
                <span className="font-black text-xs uppercase tracking-widest text-black">
                  Tidak Ada Kuliah
                </span>
                <span className="text-[11px] text-muted-foreground font-medium">
                  Hari {activeDayObj.full} kamu bebas tugas!
                </span>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
