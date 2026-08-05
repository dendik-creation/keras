import { Controller, Control } from "react-hook-form";
import { StarRating } from "./StarRating";
import { SURVEY_FEATURES } from "../survey.constants";
import type { SurveyFormData } from "../survey.types";

interface FeatureRatingProps {
  control: Control<SurveyFormData>;
  featuresUsed: string[];
}

export function FeatureRating({ control, featuresUsed }: FeatureRatingProps) {
  const selectedFeatureOptions = SURVEY_FEATURES.filter((f) =>
    featuresUsed.includes(f.id)
  );

  if (selectedFeatureOptions.length === 0) {
    return (
      <div className="p-4 border-2 border-dashed border-gray-300 dark:border-zinc-700 text-sm text-gray-500 dark:text-zinc-400 bg-gray-50 dark:bg-zinc-800/40">
        <p className="font-semibold uppercase tracking-wider">Tidak Ada Fitur yang Dipilih</p>
        <p className="text-xs mt-1">Anda tidak memilih fitur spesifik pada langkah sebelumnya. Silakan klik &quot;Selanjutnya&quot; untuk melanjutkan.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h3 className="font-bold uppercase text-sm text-black dark:text-white tracking-wider">
        Penilaian Fitur Spesifik ({selectedFeatureOptions.length} Fitur Dipilih)
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {selectedFeatureOptions.map((feature) => (
          <div
            key={feature.id}
            className="space-y-3 p-4 border-2 border-black dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,0.1)]"
          >
            <label className="font-bold uppercase text-sm text-black dark:text-white flex items-center justify-between">
              <span>{feature.label}</span>
            </label>
            <Controller
              control={control}
              name={feature.key}
              render={({ field }) => (
                <StarRating
                  value={(field.value as number) || 0}
                  onChange={field.onChange}
                  ariaLabel={`Rating untuk ${feature.label}`}
                />
              )}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
