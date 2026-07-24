"use client";

import type { UseFormReturn } from "react-hook-form";
import { GOAL_LABELS } from "@/modules/schedule-ai/schedule-ai.constants";
import type { AiPreference } from "@/modules/schedule-ai/schedule-ai.types";

type StepReviewProps = {
  form: UseFormReturn<AiPreference>;
};

/** Step 6 — final summary of every preference before generating. */
export default function StepReview({ form }: StepReviewProps) {
  const values = form.watch();

  const targetSksLabel =
    values.target_sks.mode === "max"
      ? "Maksimal tersedia"
      : `${values.target_sks.value ?? "-"} SKS`;

  return (
    <div className="border-2 border-black bg-[#F2F2F2] p-3">
      <h4 className="font-black uppercase tracking-wide text-xs mb-2">
        Ringkasan Preferensi
      </h4>
      <ul className="text-xs space-y-1 text-[#555555]">
        <li>Target SKS: {targetSksLabel}</li>
        <li>
          Prioritas semester: {values.preferred_semester ?? "Tanpa preferensi"}
        </li>
        <li>
          Hari kuliah:{" "}
          {values.preferred_days.length > 0
            ? values.preferred_days.join(", ")
            : "Semua hari"}
        </li>
        <li>
          Jam kelas: {values.earliest_start} - {values.latest_end}
        </li>
        <li>
          Mata kuliah diprioritaskan: {values.preferred_courses.length},
          dihindari: {values.avoid_courses.length}
        </li>
        <li>
          Dosen diprioritaskan: {values.preferred_lecturers.length}, dihindari:{" "}
          {values.avoid_lecturers.length}
        </li>
        <li>Pengoptimalan: {GOAL_LABELS[values.goal]}</li>
      </ul>
    </div>
  );
}
