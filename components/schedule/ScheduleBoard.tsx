"use client";

import React, { useMemo } from "react";
import { motion, useReducedMotion, type Transition } from "motion/react";
import { CourseSchedule } from "@/types/course_schedule";
import { parseTimeRange } from "@/helper/frontend_helper";
import { ScheduleDayColumn } from "./ScheduleDayColumn";
import { SwipedCardProvider } from "./ScheduleCardContext";

interface ScheduleBoardProps {
  selectedCourses?: CourseSchedule[];
  courses?: CourseSchedule[];
  onRemoveCourse?: (course: CourseSchedule) => void;
  onCardClick?: (course: CourseSchedule) => void;
  isSubmitMode?: boolean;
  readyReleases?: { course_code: string; course_class: string }[];
  isSubmitting?: boolean;
  conflictingCourseIds?: string[];
}

const DAYS = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"];

export function ScheduleBoard(props: ScheduleBoardProps) {
  const {
    selectedCourses,
    courses,
    onRemoveCourse,
    onCardClick,
    isSubmitMode = false,
    readyReleases = [],
    isSubmitting = false,
    conflictingCourseIds = [],
  } = props;
  const shouldReduceMotion = useReducedMotion() ?? false;
  const activeCourses = courses ?? selectedCourses ?? [];

  const coursesByDay = useMemo(() => {
    const map: Record<string, CourseSchedule[]> = {
      senin: [],
      selasa: [],
      rabu: [],
      kamis: [],
      jumat: [],
    };

    activeCourses.forEach((c) => {
      const dayKey = c.day.toLowerCase();
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

  const transitionConfig: Transition = shouldReduceMotion
    ? { duration: 0 }
    : {
        type: "spring",
        stiffness: 380,
        damping: 26,
        mass: 0.8,
      };

  return (
    <SwipedCardProvider>
      <motion.div
        layout
        transition={transitionConfig}
        className="grid grid-cols-1 md:grid-cols-5 gap-2 md:min-w-150"
      >
        {DAYS.map((day) => {
          const dayCourses = coursesByDay[day.toLowerCase()] || [];
          return (
            <ScheduleDayColumn
              key={day}
              day={day}
              courses={dayCourses}
              onRemoveCourse={onRemoveCourse}
              onCardClick={onCardClick}
              isSubmitMode={isSubmitMode}
              readyReleases={readyReleases}
              isSubmitting={isSubmitting}
              shouldReduceMotion={shouldReduceMotion}
              conflictingCourseIds={conflictingCourseIds}
            />
          );
        })}
      </motion.div>
    </SwipedCardProvider>
  );
}
