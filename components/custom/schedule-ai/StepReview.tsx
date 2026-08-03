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

  const rows: { label: string; value: string; note?: string }[] = [
    { label: "Target SKS", value: targetSksLabel },
    {
      label: "Prioritas Semester",
      value: values.preferred_semester ?? "Tanpa preferensi",
    },
    {
      label: "Hari Kuliah",
      value:
        values.preferred_days.length > 0
          ? values.preferred_days.join(" / ")
          : "Semua hari",
    },
    {
      label: "Jam Kelas",
      value: `${values.earliest_start} — ${values.latest_end}`,
    },
    {
      label: "Mata Kuliah",
      value: `${values.preferred_courses.length} diprioritaskan`,
      note: `${values.avoid_courses.length} dihindari`,
    },
    {
      label: "Dosen",
      value: `${values.preferred_lecturers.length} diprioritaskan`,
      note: `${values.avoid_lecturers.length} dihindari`,
    },
    { label: "Pengoptimalan", value: GOAL_LABELS[values.goal] },
  ];

  return (
    <div className="border-2 border-black bg-white">
      <div className="flex items-baseline justify-between gap-2 border-b-2 border-black bg-black px-4 py-2.5">
        <h4 className="font-medium uppercase tracking-wide text-xs text-white">
          Ringkasan Preferensi
        </h4>
        <span className="font-medium text-xs text-[#FF3000]">
          {String(rows.length).padStart(2, "0")} Poin
        </span>
      </div>
      <dl>
        {rows.map((row, index) => (
          <div
            key={row.label}
            className="grid grid-cols-[2.5rem_1fr_auto] items-center gap-3 border-b-2 border-black px-4 py-3 last:border-b-0 sm:grid-cols-[3rem_10rem_1fr]"
          >
            <span className="font-bold text-lg text-[#FF3000] tabular-nums">
              {String(index + 1).padStart(2, "0")}
            </span>
            <dt className="text-[11px] font-bold uppercase tracking-wide text-[#555555]">
              {row.label}
            </dt>
            <dd className="text-right text-sm font-semibold text-black sm:text-left">
              {row.value}
              {row.note && (
                <span className="block text-[11px] font-medium text-[#555555] sm:inline sm:pl-2">
                  {row.note}
                </span>
              )}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
