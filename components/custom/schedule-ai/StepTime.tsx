"use client";

import { Controller, type UseFormReturn } from "react-hook-form";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  EARLIEST_START_OPTIONS,
  IDLE_TIME_LABELS,
  LATEST_END_OPTIONS,
  PREFERRED_TIME_LABELS,
} from "@/modules/schedule-ai/schedule-ai.constants";
import {
  PREFERRED_TIME_OPTIONS,
  type AiPreference,
} from "@/modules/schedule-ai/schedule-ai.types";

const IDLE_TIME_CHOICES = [0, 30, 60, 90, null] as const;

const selectTriggerClass =
  "w-full rounded-none border-2 border-black bg-white px-3 py-2 text-sm font-semibold h-auto";

type StepTimeProps = {
  form: UseFormReturn<AiPreference>;
};

/** Step 2 — earliest/latest class time, time-of-day preference, max idle time. */
export default function StepTime({ form }: StepTimeProps) {
  const { control, formState } = form;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <h4 className="font-black uppercase tracking-wide text-sm mb-2">
            Mulai Paling Awal
          </h4>
          <Controller
            control={control}
            name="earliest_start"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className={selectTriggerClass}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-none border-2 border-black">
                  {EARLIEST_START_OPTIONS.map((time) => (
                    <SelectItem key={time} value={time}>
                      {time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div>
          <h4 className="font-black uppercase tracking-wide text-sm mb-2">
            Selesai Paling Akhir
          </h4>
          <Controller
            control={control}
            name="latest_end"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className={selectTriggerClass}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-none border-2 border-black">
                  {LATEST_END_OPTIONS.map((time) => (
                    <SelectItem key={time} value={time}>
                      {time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>
      {formState.errors.latest_end && (
        <p className="text-xs text-destructive -mt-4">
          {formState.errors.latest_end.message}
        </p>
      )}

      <div>
        <h4 className="font-black uppercase tracking-wide text-sm mb-2">
          Waktu yang Diinginkan
        </h4>
        <Controller
          control={control}
          name="preferred_time"
          render={({ field }) => (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
              {PREFERRED_TIME_OPTIONS.map((option) => (
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
                    {PREFERRED_TIME_LABELS[option]}
                  </span>
                </label>
              ))}
            </div>
          )}
        />
      </div>

      <div>
        <h4 className="font-black uppercase tracking-wide text-sm mb-2">
          Maksimal Jeda Antar Kelas
        </h4>
        <Controller
          control={control}
          name="max_idle_minutes"
          render={({ field }) => (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {IDLE_TIME_CHOICES.map((option) => {
                const key = option === null ? "unlimited" : String(option);
                const active = field.value === option;
                return (
                  <label
                    key={key}
                    className={cn(
                      "flex items-center gap-2 border-2 border-black px-3 py-2 cursor-pointer text-sm font-semibold",
                      active ? "bg-black text-white" : "bg-white",
                    )}
                  >
                    <input
                      type="radio"
                      className="accent-[#FF3000]"
                      checked={active}
                      onChange={() => field.onChange(option)}
                    />
                    {IDLE_TIME_LABELS[key]}
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
