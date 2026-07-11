"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, Copy, Share2 } from "lucide-react";
import { CourseSchedule } from "@/types/course_schedule";
import { buildShareUrl } from "@/helper/share_schedule";
import { gooeyToast } from "@/components/ui/goey-toaster";
import { trackScheduleShared } from "@/lib/analytics/events";

type ShareScheduleDialogProps = {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  courses: CourseSchedule[];
  user: { nim?: string; name?: string } | null;
};

/**
 * Generates a shareable link for the current schedule selection and lets the
 * student copy it or trigger the native share sheet. The link carries the
 * selected schedule IDs plus the sharer's NIM and name so a friend can adopt
 * the exact same schedule on any device.
 */
export default function ShareScheduleDialog({
  open,
  onOpenChange,
  courses,
  user,
}: ShareScheduleDialogProps) {
  const [copied, setCopied] = useState(false);
  // Build only while open so window.location is available on the client.
  const url = open ? buildShareUrl(courses, user) : "";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      trackScheduleShared(courses.length);
      gooeyToast.success("Link Disalin", {
        description: "Bagikan link ini ke temanmu untuk adopsi jadwal",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      gooeyToast.error("Gagal Menyalin", {
        description: "Salin link secara manual dari kolom di atas",
      });
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: "Jadwal KRS — KeRaS",
          text: "Adopsi jadwal KRS-ku di KeRaS",
          url,
        });
        trackScheduleShared(courses.length);
      } catch {
        /* user dismissed the share sheet */
      }
    } else {
      handleCopy();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-none border-2 border-black bg-white max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 bg-black flex items-center justify-center flex-shrink-0">
              <Share2 className="text-white w-4 h-4" />
            </div>
            <DialogTitle className="font-black uppercase tracking-tight text-black">
              Bagikan Jadwal
            </DialogTitle>
          </div>
          <div className="w-full h-0.5 bg-[#FF3000]" />
          <DialogDescription className="text-[#555555] leading-relaxed pt-3 font-medium">
            Link berisi {courses.length} mata kuliah pilihanmu. Temanmu cukup
            membuka link ini untuk mengadopsi jadwal yang sama.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2">
          <Input
            readOnly
            value={url}
            onFocus={(e) => e.currentTarget.select()}
            className="rounded-none border-2 border-black bg-[#F2F2F2] font-medium text-sm h-11"
          />
          <Button
            onClick={handleCopy}
            className="rounded-none bg-black text-white hover:bg-[#FF3000] h-11 w-11 flex-shrink-0"
            aria-label="Salin link"
          >
            {copied ? (
              <Check className="w-4 h-4" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </Button>
        </div>

        <DialogFooter>
          <Button
            onClick={handleNativeShare}
            className="rounded-none bg-black text-white hover:bg-[#FF3000] uppercase font-black tracking-widest transition-colors duration-200 w-full"
          >
            <Share2 className="w-4 h-4 mr-2" />
            Bagikan Link
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
