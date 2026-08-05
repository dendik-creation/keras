import { Clock } from "lucide-react";
import type { SurveyStep } from "../survey.types";

interface SurveyStepperProps {
  steps: SurveyStep[];
  currentStepIndex: number;
}

export function SurveyStepper({ steps, currentStepIndex }: SurveyStepperProps) {
  const currentStep = steps[currentStepIndex];
  if (!currentStep) return null;

  return (
    <div className="w-full mb-4 space-y-2">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs sm:text-sm font-bold uppercase tracking-wider text-black dark:text-white">
          <span className="bg-black dark:bg-white text-white dark:text-black px-2 py-0.5 border border-black dark:border-white">
            {currentStepIndex + 1} / {steps.length}
          </span>
          <span className="text-gray-400 dark:text-zinc-600">•</span>
          <span className="normal-case font-semibold text-gray-700 dark:text-zinc-300">
            {currentStep.title}
          </span>
        </div>
      </div>
    </div>
  );
}
