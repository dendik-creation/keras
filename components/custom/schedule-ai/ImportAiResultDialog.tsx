"use client";

import { useState } from "react";
import { AlertCircle, FileText, CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { CourseSchedule, OfferingCourse } from "@/types/course_schedule";
import { parseAndReconstructSchedule } from "@/modules/schedule-ai/external-prompt";

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
  const [errors, setErrors] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleReset = () => {
    setPastedText("");
    setErrors([]);
    setIsProcessing(false);
  };

  const handleClose = (value: boolean) => {
    if (!value) handleReset();
    onOpenChange(value);
  };

  const handleImport = () => {
    if (!pastedText.trim()) {
      setErrors(["Format tidak valid. Tempelkan daftar kode kelas terlebih dahulu."]);
      return;
    }

    setIsProcessing(true);
    const result = parseAndReconstructSchedule(pastedText, offeringCourses);

    if (!result.success || result.errors.length > 0) {
      setErrors(result.errors);
      setIsProcessing(false);
      return;
    }

    setErrors([]);
    setIsProcessing(false);
    onImport(result.courses);
    handleReset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="rounded-none border-2 border-black bg-white max-w-[calc(100%-1.5rem)] sm:max-w-xl">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <FileText className="w-5 h-5 text-[#FF3000]" />
            <DialogTitle className="font-black tracking-tight text-black">
              Impor Hasil AI
            </DialogTitle>
          </div>
          <div className="w-full h-0.5 bg-[#FF3000]" />
          <DialogDescription className="text-[#555555] pt-2 font-medium">
            Tempel hasil dari AI berupa daftar kode kelas yang dipisahkan dengan koma. Contoh: <code className="bg-gray-100 px-1 py-0.5 border border-gray-300 font-mono text-black font-bold">IFE101-A,IFE103-B,IFE107-A</code>
          </DialogDescription>
        </DialogHeader>

        <div className="py-2 space-y-3">
          <textarea
            value={pastedText}
            onChange={(e) => {
              setPastedText(e.target.value);
              if (errors.length > 0) setErrors([]);
            }}
            placeholder="IFE101-A, IFE103-B, IFE107-A"
            rows={5}
            className="w-full p-3 font-mono text-sm border-2 border-black focus:outline-none focus:ring-2 focus:ring-black bg-[#FAF9F6] resize-none"
          />

          {errors.length > 0 && (
            <div className="border-2 border-destructive bg-destructive/5 p-3 text-destructive space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-xs uppercase tracking-wide">
                <AlertCircle className="w-4 h-4" />
                <span>Gagal Mengimpor Jadwal</span>
              </div>
              <ul className="list-disc list-inside text-xs font-medium space-y-0.5 pl-1">
                {errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
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
            disabled={isProcessing}
            className="rounded-none bg-[#FF3000] hover:bg-[#D92900] text-white border-2 border-black font-black"
            onClick={handleImport}
          >
            <CheckCircle2 className="w-4 h-4 mr-1.5" />
            {isProcessing ? "Memproses..." : "Impor Jadwal"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
