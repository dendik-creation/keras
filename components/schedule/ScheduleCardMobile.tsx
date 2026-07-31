"use client";

import React, { memo, useState, useRef, useEffect, useCallback } from "react";
import { motion, type Variants, type Transition } from "motion/react";
import { Clock, Building2, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CourseSchedule } from "@/types/course_schedule";
import { cn } from "@/lib/utils";
import { useSwipedCardContext } from "./ScheduleCardContext";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { BorderTrail } from "@/components/ui/BorderTrail";

export interface ScheduleCardMobileProps {
  course: CourseSchedule;
  onRemove?: (course: CourseSchedule) => void;
  onCardClick?: (course: CourseSchedule) => void;
  isSubmitMode?: boolean;
  isSelectedForRelease?: boolean;
  isSubmitting?: boolean;
  shouldReduceMotion?: boolean;
  isConflicting?: boolean;
}

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 12, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring", stiffness: 380, damping: 26, mass: 0.8 },
  },
  exit: {
    opacity: 0,
    scale: 0.9,
    y: -8,
    transition: { duration: 0.15, ease: [0.4, 0, 1, 1] },
  },
};

const reducedVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.05 } },
  exit: { opacity: 0, transition: { duration: 0.05 } },
};

const DELETE_AREA_WIDTH = 90; // width of revealed delete area in px

export const ScheduleCardMobile = memo(function ScheduleCardMobile({
  course,
  onRemove,
  onCardClick,
  isSubmitMode = false,
  isSelectedForRelease = false,
  isSubmitting = false,
  shouldReduceMotion = false,
  isConflicting = false,
}: ScheduleCardMobileProps) {
  const cardKey = course.schedule_id || `${course.code}-${course.class}`;
  const { activeSwipedId, setActiveSwipedId } = useSwipedCardContext();

  const [offsetX, setOffsetX] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState<boolean>(false);
  const [showBottomSheet, setShowBottomSheet] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const touchInitialOffsetRef = useRef<number>(0);
  const touchLockedRef = useRef<"horizontal" | "vertical" | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);

  const isOpen = activeSwipedId === cardKey;

  // Sync open state with context
  useEffect(() => {
    if (!isOpen && !isDragging) {
      setOffsetX(0);
    } else if (isOpen && !isDragging) {
      setOffsetX(-DELETE_AREA_WIDTH);
    }
  }, [isOpen, isDragging]);

  const clearLongPressTimer = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const handleConfirmDelete = useCallback(() => {
    setShowConfirmDialog(false);
    setShowBottomSheet(false);
    setActiveSwipedId(null);
    onRemove?.(course);
  }, [course, onRemove, setActiveSwipedId]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isSubmitMode) return;
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    touchInitialOffsetRef.current = offsetX;
    touchLockedRef.current = null;
    setIsDragging(true);

    // Setup 500ms long press for accessibility bottom sheet
    clearLongPressTimer();
    longPressTimerRef.current = setTimeout(() => {
      touchLockedRef.current = "vertical"; // cancel swipe
      setIsDragging(false);
      setOffsetX(0);
      if (typeof window !== "undefined" && navigator.vibrate) {
        try {
          navigator.vibrate(40);
        } catch (_) {}
      }
      setShowBottomSheet(true);
    }, 500);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isSubmitMode || !isDragging) return;
    const touch = e.touches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;

    // Clear long press if movement detected > 8px
    if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
      clearLongPressTimer();
    }

    // Direction locking check
    if (!touchLockedRef.current) {
      if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 5) {
        touchLockedRef.current = "vertical";
        setIsDragging(false);
        setOffsetX(touchInitialOffsetRef.current);
        return;
      } else if (Math.abs(dx) >= Math.abs(dy) && Math.abs(dx) > 5) {
        touchLockedRef.current = "horizontal";
      }
    }

    if (touchLockedRef.current === "horizontal") {
      const containerWidth = containerRef.current?.offsetWidth || 300;
      const targetX = touchInitialOffsetRef.current + dx;
      // Clamp drag range: from -DELETE_AREA_WIDTH * 1.3 to 0
      const clampedX = Math.min(0, Math.max(-DELETE_AREA_WIDTH * 1.3, targetX));
      setOffsetX(clampedX);
    }
  };

  const handleTouchEnd = () => {
    clearLongPressTimer();
    if (!isDragging) return;
    setIsDragging(false);

    if (touchLockedRef.current === "horizontal") {
      const containerWidth = containerRef.current?.offsetWidth || 300;
      // Threshold: 35-45% of width or dragged > 50px left
      const threshold = Math.min(containerWidth * 0.38, 65);

      if (Math.abs(offsetX) >= threshold) {
        setOffsetX(-DELETE_AREA_WIDTH);
        setActiveSwipedId(cardKey);
      } else {
        setOffsetX(0);
        if (isOpen) {
          setActiveSwipedId(null);
        }
      }
    } else {
      setOffsetX(isOpen ? -DELETE_AREA_WIDTH : 0);
    }
  };

  const springTransition: Transition = shouldReduceMotion
    ? { duration: 0 }
    : {
        type: "spring",
        stiffness: 400,
        damping: 30,
        mass: 0.8,
      };

  const activeVariants: Variants = shouldReduceMotion ? reducedVariants : cardVariants;

  return (
    <>
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
            className={cn(
              "relative border-2 overflow-hidden bg-white shadow-none",
              isSubmitting ? "cursor-not-allowed opacity-90" : "cursor-pointer",
              isConflicting ? "border-[#FF3000] ring-2 ring-[#FF3000]" : "border-black"
            )}
          >
            {isConflicting && <BorderTrail duration={0.5} />}
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
            <CardContent className="p-3 flex flex-col justify-between min-h-[90px]">
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
          /* Mobile Swipe Container with Reveal Background */
          <div
            ref={containerRef}
            className={cn(
              "relative overflow-hidden w-full border-2 bg-[#E53935] select-none",
              isConflicting ? "border-[#FF3000] ring-2 ring-[#FF3000]" : "border-black"
            )}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchEnd}
          >
            {isConflicting && <BorderTrail duration={0.5} />}
            {/* Stationary Red Background Delete Reveal Area */}
            <div
              onClick={() => setShowConfirmDialog(true)}
              className="absolute inset-0 bg-[#E53935] flex items-center justify-end pr-4 text-white cursor-pointer z-0"
            >
              <div className="flex items-center gap-1.5 font-bold uppercase text-xs tracking-wider text-white">
                <Trash2 className="w-5 h-5 text-white" />
                <span>Hapus</span>
              </div>
            </div>

            {/* Sliding Foreground Course Card */}
            <motion.div
              animate={{ x: offsetX }}
              transition={isDragging ? { type: "tween", duration: 0 } : springTransition}
              className="relative z-10 bg-white"
            >
              <Card className="border-0 py-2 shadow-none bg-white rounded-none">
                <CardContent className="px-2 flex flex-col justify-between min-h-[90px]">
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
                    <span className="mt-3 text-slate-400">
                        Tahan untuk menghapus
                    </span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        )}
      </motion.div>

      {/* Confirmation Alert Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Jadwal?</AlertDialogTitle>
            <AlertDialogDescription>
              Mata kuliah ini akan dihapus dari jadwal KRS-mu.{"\n\n"}
              Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setShowConfirmDialog(false);
                setActiveSwipedId(null);
              }}
            >
              Batal
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete}>
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Accessibility Fallback: Bottom Sheet on Long Press */}
      <Sheet open={showBottomSheet} onOpenChange={setShowBottomSheet}>
        <SheetContent
          side="bottom"
          className="border-t-2 border-black rounded-none p-4 bg-white space-y-4"
        >
          <SheetHeader className="p-0 border-b-2 border-black pb-2 text-left">
            <SheetTitle className="font-black text-sm uppercase tracking-wider text-black line-clamp-1">
              {course.course}
            </SheetTitle>
          </SheetHeader>

          <div className="text-xs text-[#555555] font-semibold space-y-1 py-1">
            <p>
              {course.code} • Kelas {course.class} ({course.sks} SKS)
            </p>
            <p>
              {course.day}, {course.hour} • {course.classroom}
            </p>
          </div>

          <div className="flex flex-col gap-2 pt-2 border-t-2 border-black">
            <Button
              variant="destructive"
              className="w-full justify-start rounded-none font-bold uppercase tracking-wider text-xs h-11 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
              onClick={() => {
                setShowBottomSheet(false);
                setShowConfirmDialog(true);
              }}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Hapus Jadwal
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start border-2 border-black rounded-none font-bold uppercase tracking-wider text-xs h-11 bg-white text-black hover:bg-black/5"
              onClick={() => setShowBottomSheet(false)}
            >
              Batal
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
});
