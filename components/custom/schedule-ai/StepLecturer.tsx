"use client";

import { useMemo } from "react";
import type { UseFormReturn } from "react-hook-form";
import type { OfferingCourse } from "@/types/course_schedule";
import { buildLecturerOptions } from "@/modules/schedule-ai/schedule-ai.utils";
import type { AiPreference } from "@/modules/schedule-ai/schedule-ai.types";
import SearchMultiSelect from "@/components/custom/schedule-ai/SearchMultiSelect";

type StepLecturerProps = {
  form: UseFormReturn<AiPreference>;
  offeringCourses: OfferingCourse[];
};

/** Step 4 — mark preferred / avoided lecturers. */
export default function StepLecturer({ form, offeringCourses }: StepLecturerProps) {
  const options = useMemo(() => buildLecturerOptions(offeringCourses), [offeringCourses]);
  const preferred = form.watch("preferred_lecturers");
  const avoid = form.watch("avoid_lecturers");

  return (
    <div className="flex flex-col gap-2">
      <h4 className="font-black uppercase tracking-wide text-sm">
        Preferensi Dosen
      </h4>
      <p className="text-xs text-muted-foreground mb-2">
        Tandai dosen yang ingin diprioritaskan atau dihindari. Boleh
        dikosongkan.
      </p>
      <SearchMultiSelect
        options={options}
        preferred={preferred}
        avoid={avoid}
        onChange={({ preferred, avoid }) => {
          form.setValue("preferred_lecturers", preferred, { shouldDirty: true });
          form.setValue("avoid_lecturers", avoid, { shouldDirty: true });
        }}
        searchPlaceholder="Cari dosen..."
        emptyLabel="Belum ada data dosen. Perbarui ketersediaan jadwal dulu."
      />
    </div>
  );
}
