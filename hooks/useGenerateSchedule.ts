"use client";

import { useState } from "react";
import { useForm, type Path } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import { aiPreferenceSchema } from "@/modules/schedule-ai/schedule-ai.validator";
import type { AiPreference } from "@/modules/schedule-ai/schedule-ai.types";
import type { CourseSchedule } from "@/types/course_schedule";
import { saveScheduleToStorage } from "@/helper/frontend_helper";
import { gooeyToast } from "@/components/ui/goey-toaster";
import { trackAiScheduleGenerated } from "@/lib/analytics/events";

export const AI_STEP_COUNT = 6;

const DEFAULT_PREFERENCE: AiPreference = {
  target_sks: { mode: "max", value: null },
  preferred_days: [],
  earliest_start: "08:00",
  latest_end: "15:00",
  preferred_time: "none",
  max_idle_minutes: null,
  preferred_courses: [],
  avoid_courses: [],
  preferred_lecturers: [],
  avoid_lecturers: [],
  goal: "balanced",
};

/**
 * Drives the "Generate with AI" dialog: step navigation, form state/validation
 * (react-hook-form + the shared zod schema), the generate request, and
 * writing the validated result to local storage on success. No business
 * logic lives in the dialog components themselves.
 */
export function useGenerateSchedule(onGenerated: (courses: CourseSchedule[]) => void) {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<AiPreference>({
    resolver: zodResolver(aiPreferenceSchema),
    defaultValues: DEFAULT_PREFERENCE,
    mode: "onChange",
  });

  const goNext = async (fields?: Path<AiPreference>[]) => {
    if (fields && fields.length > 0) {
      const ok = await form.trigger(fields);
      if (!ok) return;
    }
    setStep((s) => Math.min(s + 1, AI_STEP_COUNT - 1));
  };

  const goBack = () => setStep((s) => Math.max(s - 1, 0));

  const reset = () => {
    form.reset(DEFAULT_PREFERENCE);
    setStep(0);
    setError(null);
    setLoading(false);
  };

  /** Validates the whole form, calls the AI endpoint, and persists the result. Returns success. */
  const generate = async (): Promise<boolean> => {
    const valid = await form.trigger();
    if (!valid) return false;

    setLoading(true);
    setError(null);
    try {
      const values = form.getValues();
      const response = await axios.post("/api/schedule-ai", values);
      const courses: CourseSchedule[] = response.data?.data?.courses || [];

      if (courses.length === 0) {
        throw new Error("Tidak ada jadwal yang cocok dengan preferensimu.");
      }

      saveScheduleToStorage(courses);
      onGenerated(courses);
      trackAiScheduleGenerated(courses.length, values.goal);
      gooeyToast.success("Jadwal berhasil dibuat 🍳", {
        description: `${courses.length} mata kuliah dipilihkan AI sesuai preferensimu`,
      });
      return true;
    } catch (err) {
      const message: string =
        (axios.isAxiosError(err) && err.response?.data?.message) ||
        (err instanceof Error ? err.message : "") ||
        "Tidak ada jadwal yang cocok dengan preferensimu. Coba ubah preferensi.";
      setError(message);
      gooeyToast.error("Gagal Membuat Jadwal", { description: message });
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { form, step, goNext, goBack, reset, generate, loading, error };
}
