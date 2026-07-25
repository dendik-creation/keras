"use client";

import { CalendarCheck2, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CourseSchedule } from "@/types/course_schedule";
import { ShareInfo } from "@/helper/share_schedule";

type AdoptConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sharer: ShareInfo | null;
  matched: CourseSchedule[];
  missingCount: number;
  hasExisting: boolean;
  onConfirm: () => void;
};

/**
 * Shared by /adopt-schedule and /share-schedule — same confirm/overwrite/
 * partial-match copy either way, they only differ in how `matched` was
 * produced (direct query string vs. resolved Shlink shortcode).
 */
export default function AdoptConfirmDialog({
  open,
  onOpenChange,
  sharer,
  matched,
  missingCount,
  hasExisting,
  onConfirm,
}: AdoptConfirmDialogProps) {
  const totalSks = matched.reduce((acc, c) => acc + Number(c.sks || 0), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-none border-2 border-black bg-white max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 bg-black flex items-center justify-center flex-shrink-0">
              <CalendarCheck2 className="text-white w-4 h-4" />
            </div>
            <DialogTitle className="font-black uppercase tracking-tight text-black">
              Adopsi Jadwal Ini?
            </DialogTitle>
          </div>
          <div className="w-full h-0.5 bg-[#FF3000]" />
          <DialogDescription className="text-[#555555] leading-relaxed pt-3 font-medium">
            {sharer?.nama ? (
              <>
                Jadwal dari{" "}
                <span className="text-black font-bold">{sharer.nama}</span>
                {sharer?.nim ? ` (${sharer.nim})` : ""} berisi{" "}
              </>
            ) : (
              "Jadwal ini berisi "
            )}
            <span className="text-black font-bold">
              {matched.length} mata kuliah
            </span>{" "}
            ({totalSks} SKS) dan akan disimpan sebagai jadwal KRS-mu.
          </DialogDescription>
        </DialogHeader>

        {missingCount > 0 && (
          <div className="flex items-start gap-2 border-2 border-black bg-[#F2F2F2] p-3 text-xs font-medium text-[#555555]">
            <TriangleAlert className="w-4 h-4 text-[#FF3000] flex-shrink-0 mt-0.5" />
            <span>
              {missingCount} mata kuliah tidak ditemukan pada data terbaru dan
              dilewati.
            </span>
          </div>
        )}

        {hasExisting && (
          <div className="flex items-start gap-2 border-2 border-[#FF3000] bg-[#FF3000]/5 p-3 text-xs font-bold text-black">
            <TriangleAlert className="w-4 h-4 text-[#FF3000] flex-shrink-0 mt-0.5" />
            <span>
              Kamu sudah punya jadwal tersimpan. Mengadopsi jadwal ini akan
              MENGGANTI jadwal lamamu.
            </span>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-none border-2 border-black uppercase font-black tracking-widest"
          >
            Batal
          </Button>
          <Button
            onClick={onConfirm}
            className="rounded-none bg-black text-white hover:bg-[#FF3000] uppercase font-black tracking-widest transition-colors duration-200"
          >
            {hasExisting ? "Ganti & Adopsi" : "Adopsi Jadwal"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
