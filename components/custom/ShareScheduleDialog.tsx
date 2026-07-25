"use client";

import { useEffect, useState } from "react";
import axios from "axios";
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
  const [url, setUrl] = useState("");
  const [shortening, setShortening] = useState(false);
  // True only when Shlink itself returned a short link — not when we fell
  // back to the raw long URL after a failed request. `jadwal_dibagikan`
  // must only fire once a share link actually exists.
  const [shlinkSucceeded, setShlinkSucceeded] = useState(false);

  // Build the long URL only while open (needs window.location), then shorten
  // it via Shlink so the student never sees or shares the raw long link.
  useEffect(() => {
    if (!open) {
      setUrl("");
      setShlinkSucceeded(false);
      return;
    }

    const longUrl = buildShareUrl(courses, user);
    let cancelled = false;

    const shorten = async () => {
      setShortening(true);
      setShlinkSucceeded(false);
      try {
        const res = await axios.post("/api/share-schedule", { longUrl });
        const shortUrl = res.data?.data?.shortUrl;
        if (cancelled) return;
        if (shortUrl) {
          setUrl(shortUrl);
          setShlinkSucceeded(true);
        } else {
          setUrl(longUrl);
        }
      } catch {
        if (!cancelled) setUrl(longUrl);
      } finally {
        if (!cancelled) setShortening(false);
      }
    };

    shorten();
    return () => {
      cancelled = true;
    };
  }, [open, courses, user]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      if (shlinkSucceeded) trackScheduleShared(courses.length, "copy_link");
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
        if (shlinkSucceeded) trackScheduleShared(courses.length, "native_share");
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
            value={shortening ? "Membuat link..." : url}
            onFocus={(e) => e.currentTarget.select()}
            className="rounded-none border-2 border-black bg-[#F2F2F2] font-medium text-sm h-11"
          />
          <Button
            onClick={handleCopy}
            disabled={shortening || !url}
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
            disabled={shortening || !url}
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
