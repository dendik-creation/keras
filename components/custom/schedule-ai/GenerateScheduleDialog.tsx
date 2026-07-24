"use client";

import { useEffect } from "react";
import type { Path } from "react-hook-form";
import { ChevronLeft, ChevronRight, Loader2, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { CourseSchedule, OfferingCourse } from "@/types/course_schedule";
import { useGenerateSchedule, AI_STEP_COUNT } from "@/hooks/useGenerateSchedule";
import type { AiPreference } from "@/modules/schedule-ai/schedule-ai.types";
import StepBasic from "@/components/custom/schedule-ai/StepBasic";
import StepTime from "@/components/custom/schedule-ai/StepTime";
import StepCourse from "@/components/custom/schedule-ai/StepCourse";
import StepLecturer from "@/components/custom/schedule-ai/StepLecturer";
import StepGoal from "@/components/custom/schedule-ai/StepGoal";
import StepReview from "@/components/custom/schedule-ai/StepReview";

type GenerateScheduleDialogProps = {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  offeringCourses: OfferingCourse[];
  onGenerated: (courses: CourseSchedule[]) => void;
};

const STEP_TITLES = [
  "Preferensi Dasar",
  "Preferensi Waktu",
  "Preferensi Mata Kuliah",
  "Preferensi Dosen",
  "Pengoptimalan",
  "Ringkasan Preferensi",
];

const STEP_VALIDATION_FIELDS: Path<AiPreference>[][] = [
  ["target_sks", "preferred_days"],
  ["earliest_start", "latest_end", "preferred_time", "max_idle_minutes"],
  [],
  [],
  ["goal"],
  [],
];

export default function GenerateScheduleDialog({
  open,
  onOpenChange,
  offeringCourses,
  onGenerated,
}: GenerateScheduleDialogProps) {
  const { form, step, goNext, goBack, reset, generate, loading, error } =
    useGenerateSchedule(offeringCourses, onGenerated);

  useEffect(() => {
    if (!open) reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const isLastStep = step === AI_STEP_COUNT - 1;

  const handlePrimaryAction = async () => {
    if (!isLastStep) {
      goNext(STEP_VALIDATION_FIELDS[step]);
      return;
    }
    const success = await generate();
    if (success) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-none border-2 border-black bg-white max-w-[calc(100%-1.5rem)] sm:max-w-2xl md:max-w-3xl lg:max-w-4xl xl:max-w-5xl 2xl:max-w-6xl">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <DialogTitle className="font-black tracking-tight text-black">
              Buat Jadwal Dengan AI
            </DialogTitle>
          </div>
          <div className="w-full h-0.5 bg-[#FF3000]" />
          <DialogDescription className="text-[#555555] leading-relaxed pt-2 font-medium">
            {STEP_TITLES[step]} {"(Step "} {step + 1} / {AI_STEP_COUNT} {")"}
          </DialogDescription>
        </DialogHeader>

        <div className="w-full h-1 bg-[#F2F2F2]">
          <div
            className="h-full bg-black transition-all duration-200"
            style={{ width: `${((step + 1) / AI_STEP_COUNT) * 100}%` }}
          />
        </div>

        <ScrollArea className="max-h-[50vh] pr-2">
          <div className="py-1">
            {step === 0 && (
              <StepBasic form={form} offeringCourses={offeringCourses} />
            )}
            {step === 1 && <StepTime form={form} />}
            {step === 2 && (
              <StepCourse form={form} offeringCourses={offeringCourses} />
            )}
            {step === 3 && (
              <StepLecturer form={form} offeringCourses={offeringCourses} />
            )}
            {step === 4 && <StepGoal form={form} />}
            {step === 5 && <StepReview form={form} />}
          </div>
        </ScrollArea>

        {error && (
          <p className="text-sm text-destructive font-medium border-2 border-destructive px-3 py-2">
            {error}
          </p>
        )}

        <DialogFooter className="flex-row justify-between sm:justify-between">
          <Button
            type="button"
            variant="outline"
            className="rounded-none"
            disabled={step === 0 || loading}
            onClick={goBack}
          >
            <ChevronLeft className="w-4 h-4" />
            Kembali
          </Button>
          <Button
            type="button"
            className="rounded-none"
            disabled={loading}
            onClick={handlePrimaryAction}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Membuat Jadwal...
              </>
            ) : isLastStep ? (
              <>
                <Sparkles className="w-4 h-4" />
                Buat Jadwal
              </>
            ) : (
              <>
                Lanjut
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
