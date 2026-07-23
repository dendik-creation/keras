"use client";

import { Controller, type UseFormReturn } from "react-hook-form";
import { cn } from "@/lib/utils";
import {
  GOAL_DESCRIPTIONS,
  GOAL_LABELS,
} from "@/modules/schedule-ai/schedule-ai.constants";
import {
  OPTIMIZATION_GOALS,
  type AiPreference,
} from "@/modules/schedule-ai/schedule-ai.types";

type StepGoalProps = {
  form: UseFormReturn<AiPreference>;
};

/** Step 5 — optimization goal. */
export default function StepGoal({ form }: StepGoalProps) {
  const { control } = form;

  return (
    <div>
      <h4 className="font-black uppercase tracking-wide text-sm mb-2">
        Pengoptimalan
      </h4>
      <Controller
        control={control}
        name="goal"
        render={({ field }) => (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
            {OPTIMIZATION_GOALS.map((goal) => (
              <label
                key={goal}
                className={cn(
                  "flex flex-col gap-0.5 border-2 border-black px-3 py-2 cursor-pointer",
                  field.value === goal ? "bg-black text-white" : "bg-white",
                )}
              >
                <span className="flex items-center gap-3 text-sm font-semibold">
                  <input
                    type="radio"
                    className="accent-[#FF3000]"
                    checked={field.value === goal}
                    onChange={() => field.onChange(goal)}
                  />
                  {GOAL_LABELS[goal]}
                </span>
                <span
                  className={cn(
                    "text-xs pl-6",
                    field.value === goal
                      ? "text-white/70"
                      : "text-muted-foreground",
                  )}
                >
                  {GOAL_DESCRIPTIONS[goal]}
                </span>
              </label>
            ))}
          </div>
        )}
      />
    </div>
  );
}
