"use client";

import { useState, useMemo } from "react";
import { AlertCircle, FileText, CheckCircle2, Sparkles, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { CourseSchedule, OfferingCourse } from "@/types/course_schedule";
import {
  parseMultipleRecommendations,
  type RecommendationItem,
} from "@/modules/schedule-ai/external-prompt";
import { gooeyToast } from "@/components/ui/goey-toaster";

type ImportAiResultDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  offeringCourses: OfferingCourse[];
  onImport: (courses: CourseSchedule[]) => void;
};

export default function ImportAiResultDialog({
  open,
  onOpenChange,
  offeringCourses,
  onImport,
}: ImportAiResultDialogProps) {
  const [pastedText, setPastedText] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [errorOverride, setErrorOverride] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const recommendations: RecommendationItem[] = useMemo(() => {
    if (!pastedText.trim()) return [];
    return parseMultipleRecommendations(pastedText, offeringCourses);
  }, [pastedText, offeringCourses]);

  const handleReset = () => {
    setPastedText("");
    setSelectedIndex(0);
    setErrorOverride([]);
    setIsProcessing(false);
  };

  const handleClose = (value: boolean) => {
    if (!value) handleReset();
    onOpenChange(value);
  };

  const selectedRec = recommendations[selectedIndex] || recommendations[0];

  const handleImport = () => {
    if (!pastedText.trim()) {
      setErrorOverride(["Format tidak valid. Tempelkan hasil dari AI terlebih dahulu."]);
      return;
    }

    if (!selectedRec) {
      setErrorOverride(["Format tidak valid. Tidak ada rekomendasi yang terdeteksi."]);
      return;
    }

    setIsProcessing(true);

    if (!selectedRec.reconstruction.success || selectedRec.reconstruction.errors.length > 0) {
      setErrorOverride(selectedRec.reconstruction.errors);
      setIsProcessing(false);
      return;
    }

    setErrorOverride([]);
    setIsProcessing(false);
    onImport(selectedRec.reconstruction.courses);
    gooeyToast.success("Berhasil mengimpor jadwal", {
      description: `${selectedRec.reconstruction.courses.length} mata kuliah berhasil dimuat`,
    });
    handleReset();
    onOpenChange(false);
  };

  const currentErrors = errorOverride.length > 0
    ? errorOverride
    : selectedRec && !selectedRec.reconstruction.success
      ? selectedRec.reconstruction.errors
      : [];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="rounded-none border-2 border-black bg-white max-w-[calc(100%-1.5rem)] sm:max-w-2xl md:max-w-3xl">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <FileText className="w-5 h-5 text-[#FF3000]" />
            <DialogTitle className="font-bold tracking-tight text-black">
              Import Jadwal Rekomendasi AI
            </DialogTitle>
          </div>
          <div className="w-full h-0.5 bg-[#FF3000]" />
          <DialogDescription className="text-[#555555] pt-2 font-medium">
            Tempel hasil dari AI dalam format kode kelas.
          </DialogDescription>
        </DialogHeader>

        <div className="py-2 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium uppercase tracking-wider text-black flex items-center gap-1.5">
              <span>Tempel hasil dari AI</span>
            </label>
            <textarea
              value={pastedText}
              onChange={(e) => {
                setPastedText(e.target.value);
                setSelectedIndex(0);
                if (errorOverride.length > 0) setErrorOverride([]);
              }}
              placeholder={`Misalkan IFE101-A, IFE103-B, IFE107-A`}
              rows={4}
              className="w-full p-3 font-mono text-xs border-2 border-black focus:outline-none focus:ring-2 focus:ring-black bg-[#FAF9F6] resize-none"
            />
          </div>

          {recommendations.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wider text-black flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-[#FF3000]" />
                  Pilih rekomendasi ({recommendations.length} dapat dibaca)
                </span>
              </div>

              <ScrollArea className="max-h-[32vh] pr-2">
                <div className="space-y-2.5">
                  {recommendations.map((rec, idx) => {
                    const isSelected = selectedIndex === idx;
                    const isValid = rec.reconstruction.success;
                    const totalSks = rec.reconstruction.courses.reduce(
                      (acc, c) => acc + (parseInt(c.sks, 10) || 0),
                      0,
                    );

                    return (
                      <div
                        key={rec.id || idx}
                        onClick={() => {
                          setSelectedIndex(idx);
                          setErrorOverride([]);
                        }}
                        className={`p-3 border-2 transition-all cursor-pointer ${
                          isSelected
                            ? "border-black bg-[#FAF9F6] shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
                            : "border-gray-300 bg-white hover:border-black"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                                isSelected
                                  ? "border-black bg-[#FF3000]"
                                  : "border-gray-400 bg-white"
                              }`}
                            >
                              {isSelected && <Check className="w-2.5 h-2.5 text-white stroke-[3]" />}
                            </div>
                            <span className="font-semibold text-sm text-black">{rec.title}</span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {isValid ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 border border-black bg-emerald-100 text-emerald-900">
                                Valid • {rec.reconstruction.courses.length} MK ({totalSks} SKS)
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold px-2 py-0.5 border border-black bg-rose-100 text-rose-900">
                                Ada Error
                              </span>
                            )}
                          </div>
                        </div>

                        {rec.reason && (
                          <p className="text-xs text-[#555555] font-normal mt-1 pl-6">
                            <span className="font-bold text-black">Alasan:</span> {rec.reason}
                          </p>
                        )}

                        <div className="mt-2 pl-6 flex flex-wrap gap-1">
                          {rec.rawIdentifiers.map((id, i) => (
                            <span
                              key={i}
                              className="text-[11px] font-mono px-1.5 py-0.5 border border-black bg-white text-black font-semibold"
                            >
                              {id}
                            </span>
                          ))}
                        </div>

                        {!isValid && rec.reconstruction.errors.length > 0 && (
                          <div className="mt-5 pl-6 space-y-1">
                            {rec.reconstruction.errors.map((err, errIdx) => (
                              <p key={errIdx} className="text-[11px] font-medium text-destructive flex items-start gap-1">
                                <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
                                <span>{err}</span>
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-row justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            className="rounded-none border-2 border-black font-bold"
            onClick={() => handleClose(false)}
          >
            Batal
          </Button>
          <Button
            type="button"
            disabled={isProcessing || !pastedText.trim()}
            className="rounded-none bg-[#FF3000] hover:bg-[#D92900] text-white border-2 border-black font-bold"
            onClick={handleImport}
          >
            <CheckCircle2 className="w-4 h-4 mr-1.5" />
            {isProcessing ? "Memproses..." : "Impor rekomendasi"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
