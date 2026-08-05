import { Controller, Control } from "react-hook-form";
import { Checkbox } from "@/components/ui/checkbox";
import { SURVEY_REQUESTED_FEATURES } from "../survey.constants";
import type { SurveyFormData } from "../survey.types";

interface RequestedFeatureSelectorProps {
  control: Control<SurveyFormData>;
}

export function RequestedFeatureSelector({ control }: RequestedFeatureSelectorProps) {
  return (
    <div className="space-y-3">
      <label className="font-bold uppercase text-sm text-black dark:text-white block">
        Fitur yang Diharapkan ke Depan
      </label>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {SURVEY_REQUESTED_FEATURES.map((feat) => (
          <Controller
            key={feat.id}
            control={control}
            name="requestedFeatures"
            render={({ field }) => {
              const isChecked = field.value?.includes(feat.id);
              return (
                <label
                  className={`flex items-center space-x-3 border-2 p-3 cursor-pointer transition-colors ${
                    isChecked
                      ? "border-black dark:border-zinc-500 bg-gray-100 dark:bg-zinc-800 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,0.1)]"
                      : "border-black dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-gray-50 dark:hover:bg-zinc-800"
                  }`}
                >
                  <Checkbox
                    id={`rf-${feat.id}`}
                    checked={isChecked}
                    onCheckedChange={(checked) => {
                      const val = field.value || [];
                      if (checked) {
                        field.onChange([...val, feat.id]);
                      } else {
                        field.onChange(val.filter((v) => v !== feat.id));
                      }
                    }}
                  />
                  <span className="text-sm font-semibold cursor-pointer w-full text-black dark:text-white select-none">
                    {feat.label}
                  </span>
                </label>
              );
            }}
          />
        ))}
      </div>
    </div>
  );
}
