import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

interface SurveyNavigationProps {
  currentStepIndex: number;
  totalSteps: number;
  isSubmitting: boolean;
  onPrev: () => void;
  onNext: () => void;
  onSubmit: () => void;
}

export function SurveyNavigation({
  currentStepIndex,
  totalSteps,
  isSubmitting,
  onPrev,
  onNext,
  onSubmit,
}: SurveyNavigationProps) {
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === totalSteps - 1;

  return (
    <div className="flex md:flex-row flex-col justify-between items-center pt-6 border-t-2 border-black dark:border-zinc-700 mt-8 gap-4">
      <Button
        type="button"
        variant="outline"
        onClick={onPrev}
        disabled={isFirstStep || isSubmitting}
        className="uppercase hover:text-black! w-full md:w-fit font-bold tracking-wider rounded-none border-2 border-black dark:border-zinc-700 hover:bg-gray-100 dark:hover:bg-zinc-800 text-black dark:text-white px-6 disabled:opacity-40"
      >
        <ChevronLeft className="w-4 h-4 mr-2" /> Sebelumnya
      </Button>

      {!isLastStep ? (
        <Button
          type="button"
          onClick={onNext}
          className="uppercase w-full md:w-fit font-bold tracking-wider rounded-none px-6 bg-black dark:bg-white text-white dark:text-black hover:bg-zinc-800 dark:hover:bg-zinc-200 border-2 border-black dark:border-zinc-700 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,0.2)]"
        >
          Selanjutnya <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      ) : (
        <Button
          type="button"
          disabled={isSubmitting}
          onClick={onSubmit}
          className="uppercase font-bold tracking-wider w-full md:w-fit rounded-none px-8 bg-[#FF3000] hover:bg-black dark:hover:bg-zinc-800 text-white border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,0.2)]"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Mengirim...
            </>
          ) : (
            "Kirim Survei"
          )}
        </Button>
      )}
    </div>
  );
}
