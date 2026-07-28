"use client";

import React, { memo } from "react";
import { motion, type Variants, type Transition } from "motion/react";
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

const cardVariants: Variants = {
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

const reducedVariants: Variants = {
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
  const springTransition: Transition = shouldReduceMotion
    ? { duration: 0 }
    : {
        type: "spring",
        stiffness: 380,
        damping: 26,
        mass: 0.8,
      };

  const cardKey = course.schedule_id || `${course.code}-${course.class}`;
  const activeVariants: Variants = shouldReduceMotion ? reducedVariants : cardVariants;

  return (
    <motion.div
      layout="position"
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={activeVariants}
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
          <CardContent className="p-3 flex flex-col justify-between min-h-[95px]">
            {course.saved_in_submit ? (
              <div className="absolute bottom-0 left-0 w-full py-1 flex justify-center items-center transition-all bg-black text-white">
                <div className="flex w-full justify-center items-center">
                  <p className="m-0 text-[10px] w-full text-center uppercase tracking-wide font-bold">
                    Sudah punya
                  </p>
                </div>
              </div>
            ) : (
              <div className="absolute bottom-0 left-0 w-full py-1 flex justify-center items-center transition-all bg-[#F2F2F2] text-black border-t-2 border-black">
                <div className="flex w-full justify-center items-center">
                  <p className="m-0 text-[10px] w-full text-center uppercase tracking-wide font-bold">
                    Belum punya
                  </p>
                </div>
              </div>
            )}

            <div>
              <div className="text-sm font-black line-clamp-2 leading-snug mb-1.5 text-black">
                {course.course}
              </div>

              <div className="flex flex-wrap items-center gap-1 mb-2">
                {course.semester && (
                  <Badge variant="outline" className="h-4 px-1.5 text-[9px] font-bold border-black bg-[#F2F2F2] text-black uppercase">
                    {course.semester}
                  </Badge>
                )}
                <Badge variant="outline" className="h-4 px-1.5 text-[9px] font-bold border-black">
                  {course.code}
                </Badge>
                <Badge variant="secondary" className="h-4 px-1.5 text-[9px] font-bold bg-black text-white">
                  Kelas {course.class}
                </Badge>
              </div>
            </div>

            <div className="flex flex-col gap-1 text-[11px] text-[#555555] font-semibold items-start pt-1">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-black shrink-0" />
                <span>{course.hour}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-black shrink-0" />
                <span>{course.classroom}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="relative pt-0 pb-7 border-2 border-black overflow-hidden bg-white shadow-none min-h-[95px]">
          <CardContent className="p-3 flex flex-col justify-between min-h-[95px]">
            <div className="absolute z-20 bottom-0 left-0 w-full h-2 hover:h-8 transition-all bg-black hover:bg-[#FF3000]">
              <button
                className="text-white flex items-center justify-center gap-2 text-xs text-center w-full absolute bottom-0 cursor-pointer left-0 font-bold uppercase tracking-widest"
                style={{ minHeight: "2rem" }}
                onClick={() => onRemove?.(course)}
              >
                <span>Hapus</span>
              </button>
            </div>

            <div>
              <div className="text-sm font-black line-clamp-2 leading-snug mb-1.5 text-black">
                {course.course}
              </div>

              {course.is_removed && (
                <div className="bg-[#FF3000] text-white text-[10px] p-1.5 font-bold rounded-none mb-1.5 leading-tight border border-black">
                  Mata kuliah ini sudah tidak tersedia pada penawaran terbaru.
                </div>
              )}
              {course.is_obsolete && !course.is_removed && (
                <div className="bg-[#FED24F] text-black text-[10px] p-1.5 font-bold rounded-none mb-1.5 leading-tight border border-black">
                  Data kampus berubah. Silakan pilih ulang kelas ini.
                </div>
              )}
              {course.needs_manual_review && !course.is_removed && !course.is_obsolete && (
                <div className="bg-orange-500 text-white text-[10px] p-1.5 font-bold rounded-none mb-1.5 leading-tight border border-black">
                  Kami menemukan lebih dari satu kemungkinan kelas. Silakan pilih ulang.
                </div>
              )}

              <div className="flex flex-wrap items-center gap-1 mb-2">
                {course.semester && (
                  <Badge variant="outline" className="h-4 px-1.5 text-[9px] font-bold border-black bg-[#F2F2F2] text-black uppercase">
                    {course.semester}
                  </Badge>
                )}
                <Badge variant="outline" className="h-4 px-1.5 text-[9px] font-bold border-black">
                  {course.code}
                </Badge>
                <Badge variant="secondary" className="h-4 px-1.5 text-[9px] font-bold bg-black text-white">
                  Kelas {course.class}
                </Badge>
              </div>
            </div>

            <div className="flex flex-col gap-1 text-[11px] text-[#555555] font-semibold items-start pt-1">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-black shrink-0" />
                <span>{course.hour}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-black shrink-0" />
                <span>{course.classroom}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
});
