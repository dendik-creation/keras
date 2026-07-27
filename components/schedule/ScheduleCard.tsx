"use client";

import React, { memo } from "react";
import { motion } from "motion/react";
import { Clock, Building2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CourseSchedule } from "@/types/course_schedule";
import { cn } from "@/lib/utils";

export interface ScheduleCardProps {
  course: CourseSchedule;
  onRemove?: (course: CourseSchedule) => void;
  onCardClick?: (course: CourseSchedule) => void;
  isSubmitMode?: boolean;
  isSelectedForRelease?: boolean;
  isSubmitting?: boolean;
  shouldReduceMotion?: boolean;
}

const cardVariants = {
  hidden: {
    opacity: 0,
    y: 12,
    scale: 0.95,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 380,
      damping: 26,
      mass: 0.8,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.9,
    y: -8,
    transition: {
      duration: 0.15,
      ease: [0.4, 0, 1, 1],
    },
  },
};

const reducedVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.05 } },
  exit: { opacity: 0, transition: { duration: 0.05 } },
};

export const ScheduleCard = memo(function ScheduleCard({
  course,
  onRemove,
  onCardClick,
  isSubmitMode = false,
  isSelectedForRelease = false,
  isSubmitting = false,
  shouldReduceMotion = false,
}: ScheduleCardProps) {
  const springTransition = shouldReduceMotion
    ? { duration: 0 }
    : {
        type: "spring",
        stiffness: 380,
        damping: 26,
        mass: 0.8,
      };

  const cardKey = course.schedule_id || `${course.code}-${course.class}`;

  return (
    <motion.div
      layoutId={`card-${cardKey}`}
      layout="position"
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={shouldReduceMotion ? reducedVariants : cardVariants}
      transition={springTransition}
      className="w-full"
    >
      {isSubmitMode ? (
        <Card
          onClick={() => !isSubmitting && onCardClick?.(course)}
          className={`relative border-2 pt-0 pb-6 border-black overflow-hidden bg-white shadow-none ${
            isSubmitting ? "cursor-not-allowed opacity-90" : "cursor-pointer"
          }`}
        >
          {isSelectedForRelease && (
            <div
              className={cn(
                "absolute bottom-0 left-0 w-full py-1 flex justify-center items-center z-10 transition-all",
                course.saved_in_submit
                  ? "bg-[#FED24F] text-black"
                  : "bg-[#FF3000] text-white",
              )}
            >
              <div className="flex w-full justify-center items-center">
                <p className="m-0 text-xs w-full text-center uppercase tracking-wide font-bold">
                  {course.saved_in_submit ? "Siap Dilepas" : "Siap Dihapus"}
                </p>
              </div>
            </div>
          )}
          <CardContent className="p-2">
            {course.saved_in_submit ? (
              <div className="absolute bottom-0 left-0 w-full py-1 flex justify-center items-center transition-all bg-black text-white">
                <div className="flex w-full justify-center items-center">
                  <p className="m-0 text-xs w-full text-center uppercase tracking-wide font-bold">
                    Sudah punya
                  </p>
                </div>
              </div>
            ) : (
              <div className="absolute bottom-0 left-0 w-full py-1 flex justify-center items-center transition-all bg-[#F2F2F2] text-black border-t-2 border-black">
                <div className="flex w-full justify-center items-center">
                  <p className="m-0 text-xs w-full text-center uppercase tracking-wide font-bold">
                    Belum punya
                  </p>
                </div>
              </div>
            )}
            {course.semester && (
              <div className="text-[9px] uppercase tracking-wide font-bold text-black/50 mb-0.5">
                {course.semester}
              </div>
            )}
            <div className="text-sm font-bold line-clamp-2 leading-tight mb-1 pr-3">
              {course.course}
            </div>
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-1">
              <Badge variant="outline" className="h-4 px-1 text-[9px]">
                {course.code}
              </Badge>
              <Badge variant="secondary" className="h-4 px-1 text-[9px]">
                {course.class}
              </Badge>
            </div>
            <div className="text-[10px] flex items-center gap-1 text-[#555555]">
              <Clock className="w-3 h-3" /> {course.hour}
            </div>
            <div className="text-[10px] flex items-center gap-1 text-[#555555] mt-0.5">
              <Building2 className="w-3 h-3" /> {course.classroom}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="relative pt-0 border-2 border-black overflow-hidden bg-white shadow-none">
          <CardContent className="p-2">
            <div className="absolute z-20 bottom-0 left-0 w-full h-2 hover:h-8 transition-all bg-black hover:bg-[#FF3000]">
              <button
                className="text-white flex items-center justify-center gap-2 text-sm text-center w-full absolute bottom-0 cursor-pointer left-0"
                style={{ minHeight: "2rem" }}
                onClick={() => onRemove?.(course)}
              >
                <span>Hapus</span>
              </button>
            </div>
            {course.semester && (
              <div className="text-[9px] uppercase tracking-wide font-bold text-black/50 mb-0.5">
                {course.semester}
              </div>
            )}
            <div className="text-sm font-bold line-clamp-2 leading-tight mb-1 pr-3">
              {course.course}
            </div>
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-1">
              <Badge variant="outline" className="h-4 px-1 text-[9px]">
                {course.code}
              </Badge>
              <Badge variant="secondary" className="h-4 px-1 text-[9px]">
                {course.class}
              </Badge>
            </div>
            <div className="text-[10px] flex items-center gap-1 text-[#555555]">
              <Clock className="w-3 h-3" /> {course.hour}
            </div>
            <div className="text-[10px] flex items-center gap-1 text-[#555555] mt-0.5">
              <Building2 className="w-3 h-3" /> {course.classroom}
            </div>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
});
