"use client";

import { Controller, type UseFormReturn } from "react-hook-form";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { STUDY_DAYS } from "@/modules/schedule-ai/schedule-ai.types";
import type { AiPreference } from "@/modules/schedule-ai/schedule-ai.types";

type StepBasicProps = {
  form: UseFormReturn<AiPreference>;
};

/** Step 1 — target SKS + preferred study days. */
export default function StepBasic({ form }: StepBasicProps) {
  const { control, watch, register, formState } = form;
  const mode = watch("target_sks.mode");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h4 className="font-black uppercase tracking-wide text-sm mb-2">
          Target SKS
        </h4>
        <Controller
          control={control}
          name="target_sks.mode"
          render={({ field }) => (
            <div className="flex flex-col gap-2">
              {(["max", "custom"] as const).map((option) => (
                <label
                  key={option}
                  className={cn(
                    "flex items-center gap-3 border-2 border-black px-3 py-2 cursor-pointer",
                    field.value === option ? "bg-black text-white" : "bg-white",
                  )}
                >
                  <input
                    type="radio"
                    className="accent-[#FF3000]"
                    checked={field.value === option}
                    onChange={() => field.onChange(option)}
                  />
                  <span className="text-sm font-semibold">
                    {option === "max" ? "Maksimal Tersedia" : "Jumlah Kustom"}
                  </span>
                </label>
              ))}
            </div>
          )}
        />

        {mode === "custom" && (
          <div className="mt-2">
            <Input
              type="number"
              min={1}
              max={24}
              placeholder="Contoh: 20"
              className="rounded-none border-2 border-black"
              {...register("target_sks.value", { valueAsNumber: true })}
            />
            {formState.errors.target_sks?.value && (
              <p className="text-xs text-destructive mt-1">
                {formState.errors.target_sks.value.message}
              </p>
            )}
          </div>
        )}
      </div>

      <div>
        <h4 className="font-black uppercase tracking-wide text-sm mb-2">
          Hari Kuliah yang Diinginkan
        </h4>
        <p className="text-xs text-muted-foreground mb-2">
          Kosongkan jika tidak ada preferensi hari tertentu.
        </p>
        <Controller
          control={control}
          name="preferred_days"
          render={({ field }) => (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {STUDY_DAYS.map((day) => {
                const checked = field.value.includes(day);
                return (
                  <label
                    key={day}
                    className="flex items-center gap-2 border-2 border-black px-3 py-2 cursor-pointer bg-white"
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(value) => {
                        field.onChange(
                          value
                            ? [...field.value, day]
                            : field.value.filter((d) => d !== day),
                        );
                      }}
                    />
                    <span className="text-sm font-semibold">{day}</span>
                  </label>
                );
              })}
            </div>
          )}
        />
      </div>
    </div>
  );
}
