import { Controller, Control } from "react-hook-form";
import { Checkbox } from "@/components/ui/checkbox";
import { SURVEY_PAIN_POINTS } from "../survey.constants";
import type { SurveyFormData } from "../survey.types";

interface PainPointSelectorProps {
  control: Control<SurveyFormData>;
  error?: string;
}

export function PainPointSelector({ control, error }: PainPointSelectorProps) {
  return (
    <div className="space-y-3">
      <label className="font-bold uppercase text-sm text-black dark:text-white flex items-center gap-1">
        Kendala Utama yang Dihadapi <span className="text-[#FF3000]">*</span>
      </label>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {SURVEY_PAIN_POINTS.map((pt) => (
          <Controller
            key={pt.id}
            control={control}
            name="painPoints"
            render={({ field }) => {
              const isChecked = field.value?.includes(pt.id);
              return (
                <label
                  className={`flex items-center space-x-3 border-2 p-3 cursor-pointer transition-colors ${
                    isChecked
                      ? "border-black dark:border-zinc-500 bg-gray-100 dark:bg-zinc-800 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,0.1)]"
                      : "border-black dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-gray-50 dark:hover:bg-zinc-800"
                  }`}
                >
                  <Checkbox
                    id={`pp-${pt.id}`}
                    checked={isChecked}
                    onCheckedChange={(checked) => {
                      const val = field.value || [];
                      if (checked) {
                        field.onChange([...val, pt.id]);
                      } else {
                        field.onChange(val.filter((v) => v !== pt.id));
                      }
                    }}
                  />
                  <span className="text-sm font-semibold cursor-pointer w-full text-black dark:text-white select-none">
                    {pt.label}
                  </span>
                </label>
              );
            }}
          />
        ))}
      </div>
      {error && <p className="text-red-500 text-xs font-semibold mt-1">{error}</p>}
    </div>
  );
}
