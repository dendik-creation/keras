"use client";

import React, { memo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { CalendarSearch } from "lucide-react";
import { CourseSchedule } from "@/types/course_schedule";
import { ScheduleCard } from "./ScheduleCard";

interface ScheduleDayColumnProps {
  day: string;
  courses: CourseSchedule[];
  onRemoveCourse?: (course: CourseSchedule) => void;
  onCardClick?: (course: CourseSchedule) => void;
  isSubmitMode?: boolean;
  readyReleases?: { course_code: string; course_class: string }[];
  isSubmitting?: boolean;
  shouldReduceMotion?: boolean;
}

const emptyStateVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.15 } },
};

export const ScheduleDayColumn = memo(function ScheduleDayColumn({
  day,
  courses,
  onRemoveCourse,
  onCardClick,
  isSubmitMode = false,
  readyReleases = [],
  isSubmitting = false,
  shouldReduceMotion = false,
}: ScheduleDayColumnProps) {
  const transitionConfig = shouldReduceMotion
    ? { duration: 0 }
    : {
        type: "spring",
        stiffness: 380,
        damping: 26,
        mass: 0.8,
      };

  return (
    <motion.div
      layout
      transition={transitionConfig}
      className="flex flex-col gap-2"
    >
      <div className="text-center font-black py-2 border-b-2 border-black text-black uppercase tracking-widest">
        {day}
      </div>
      <motion.div
        layout
        transition={transitionConfig}
        className="space-y-2 h-full min-h-[80px] md:min-h-100 bg-white rounded-md p-2 flex flex-col"
      >
        <AnimatePresence mode="popLayout" initial={false}>
          {courses.length > 0 ? (
            courses.map((course) => {
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
                  shouldReduceMotion={shouldReduceMotion}
                />
              );
            })
          ) : (
            <motion.div
              key={`empty-${day}`}
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={shouldReduceMotion ? {} : emptyStateVariants}
              layout
              className="h-full min-h-[120px] text-sm gap-3 flex-col bg-[#F2F2F2] flex items-center justify-center text-muted-foreground uppercase tracking-widest text-xs font-bold grow rounded"
            >
              <CalendarSearch className="w-5 h-5" />
              <span>Mau Libur Ya?</span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
});
