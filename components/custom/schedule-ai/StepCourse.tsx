"use client";

import { useMemo } from "react";
import type { UseFormReturn } from "react-hook-form";
import type { OfferingCourse } from "@/types/course_schedule";
import { buildCourseOptions } from "@/modules/schedule-ai/schedule-ai.utils";
import type { AiPreference } from "@/modules/schedule-ai/schedule-ai.types";
import SearchMultiSelect from "@/components/custom/schedule-ai/SearchMultiSelect";

type StepCourseProps = {
  form: UseFormReturn<AiPreference>;
  offeringCourses: OfferingCourse[];
};

/** Step 3 — mark preferred / avoided courses. */
export default function StepCourse({ form, offeringCourses }: StepCourseProps) {
  const options = useMemo(() => buildCourseOptions(offeringCourses), [offeringCourses]);
  const preferred = form.watch("preferred_courses");
  const avoid = form.watch("avoid_courses");

  return (
    <div className="flex flex-col gap-2">
      <h4 className="font-black uppercase tracking-wide text-sm">
        Preferensi Mata Kuliah
      </h4>
      <p className="text-xs text-muted-foreground mb-2">
        Tandai mata kuliah yang ingin diprioritaskan atau dihindari. Boleh
        dikosongkan.
      </p>
      <SearchMultiSelect
        options={options}
        preferred={preferred}
        avoid={avoid}
        onChange={({ preferred, avoid }) => {
          form.setValue("preferred_courses", preferred, { shouldDirty: true });
          form.setValue("avoid_courses", avoid, { shouldDirty: true });
        }}
        searchPlaceholder="Cari mata kuliah..."
        emptyLabel="Belum ada data mata kuliah. Perbarui ketersediaan jadwal dulu."
      />
    </div>
  );
}
