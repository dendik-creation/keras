"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import Image from "next/image";
import { CalendarCheck2, CalendarX2, Loader2, TriangleAlert, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSessionCheck } from "@/hooks/useSessionCheck";
import { parseShareParams, ShareInfo } from "@/helper/share_schedule";
import { stampForAdoption, checkAllConflicts } from "@/helper/frontend_helper";
import { gooeyToast } from "@/components/ui/goey-toaster";
import { trackScheduleAdopted } from "@/lib/analytics/events";
import { useLocalStorageContext } from "@/providers/LocalStorageProvider";
import { useAdoptScheduleFlow } from "@/hooks/useAdoptScheduleFlow";
import AdoptConfirmDialog from "@/components/custom/AdoptConfirmDialog";
import { BorderTrail } from "@/components/ui/BorderTrail";
import { CourseSchedule } from "@/types/course_schedule";
import { cn } from "@/lib/utils";

type ResolvePhase = "checking" | "resolving" | "resolved" | "error";

type ShareScheduleClientProps = {
  shortCode: string;
};

const BLOCK_MESSAGES = {
  "program-mismatch":
    "Jadwal ini hanya bisa diadopsi sesama mahasiswa program studi yang sama, karena tiap program studi punya penawaran mata kuliah yang berbeda.",
  "codes-not-found":
    "Mata kuliah pada link ini tidak ditemukan sama sekali di penawaranmu. Jadwal yang dibagikan kemungkinan berasal dari program studi lain.",
  "classes-not-found":
    "Mata kuliah ditemukan di penawaranmu, namun kelas spesifik yang dipilih pada link ini tidak tersedia lagi.",
  "corrupted-link":
    "Link adopsi ini tidak valid atau mengalami kerusakan format data.",
} as const;


/**
 * Same adoption flow as /adopt-schedule, but the share IDs come from resolving
 * a Shlink shortCode server-side instead of the browser's own query string —
 * so the URL stays /share-schedule/[shortCode] with no redirect. Resolution
 * is the only thing unique to this page; everything after (offering check,
 * validation, matching, adoption) is the shared `useAdoptScheduleFlow`.
 */
export default function ShareScheduleClient({
  shortCode,
}: ShareScheduleClientProps) {
  const { user, isAuthenticated, isValidating } = useSessionCheck();
  const router = useRouter();
  const { offeringCourse, savedSchedule, isHydrated, setSavedSchedule } =
    useLocalStorageContext();

  const [share, setShare] = useState<ShareInfo | null>(null);
  const [resolvePhase, setResolvePhase] = useState<ResolvePhase>("checking");
  const [errorMessage, setErrorMessage] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const resolvedRef = useRef(false);
  const [conflictingCourseIds, setConflictingCourseIds] = useState<string[]>([]);
  const conflictTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (conflictTimerRef.current) clearTimeout(conflictTimerRef.current);
    };
  }, []);

  // Rule 1: guests must log in first — preserve where to return afterwards.
  useEffect(() => {
    if (isValidating || isAuthenticated) return;
    const callback = window.location.pathname;
    router.replace(`/login?callbackUrl=${encodeURIComponent(callback)}`);
  }, [isValidating, isAuthenticated, router]);

  // Resolve the shortCode into share params via Shlink. This is the ONLY
  // network call this page makes — no offering fetch, no /api/schedule.
  useEffect(() => {
    if (!isAuthenticated || resolvedRef.current) return;
    resolvedRef.current = true;

    const resolve = async () => {
      setResolvePhase("resolving");

      let longUrl: string;
      try {
        const res = await axios.get(`/api/share-schedule/${shortCode}`);
        longUrl = res.data?.data?.longUrl;
        if (!longUrl) throw new Error("longUrl missing from response");
      } catch (err) {
        const status = axios.isAxiosError(err)
          ? err.response?.status
          : undefined;
        setErrorMessage(
          status === 404
            ? "Link berbagi ini tidak ditemukan atau sudah kedaluwarsa."
            : status === 400
              ? "Link berbagi ini tidak valid."
              : "Gagal membuka link berbagi. Silakan coba lagi.",
        );
        setResolvePhase("error");
        return;
      }

      setShare(parseShareParams(new URL(longUrl).search));
      setResolvePhase("resolved");
    };

    resolve().catch(() => {
      setErrorMessage(
        "Gagal memproses jadwal yang dibagikan. Silakan coba buka link lagi.",
      );
      setResolvePhase("error");
    });
  }, [isAuthenticated, shortCode]);

  const flow = useAdoptScheduleFlow({
    share: resolvePhase === "resolved" ? share : null,
    resumeRedirectPath: `/share-schedule/${shortCode}`,
    offeringCourse,
    savedSchedule,
    receiverNim: user?.nim ?? null,
    isHydrated: isHydrated && isAuthenticated,
  });

  // Compute conflicting courses between flow.matched and savedSchedule or internal matched
  const existingConflicts = useMemo(() => {
    if (flow.phase !== "ready" || !flow.matched.length) return [];
    const conflicts: CourseSchedule[] = [];

    // 1. Check against existing savedSchedule
    if (savedSchedule && savedSchedule.length > 0) {
      flow.matched.forEach((m) => {
        const found = checkAllConflicts(m, savedSchedule);
        found.forEach((c) => {
          if (!conflicts.some((x) => (x.schedule_id || `${x.code}-${x.class}`) === (c.schedule_id || `${c.code}-${c.class}`))) {
            conflicts.push(c);
          }
        });
      });
    }

    // 2. Check internal conflicts within flow.matched
    for (let i = 0; i < flow.matched.length; i++) {
      for (let j = i + 1; j < flow.matched.length; j++) {
        const a = flow.matched[i];
        const b = flow.matched[j];
        const internalConflict = checkAllConflicts(a, [b]);
        if (internalConflict.length > 0) {
          if (!conflicts.some((x) => (x.schedule_id || `${x.code}-${x.class}`) === (a.schedule_id || `${a.code}-${a.class}`))) {
            conflicts.push(a);
          }
          if (!conflicts.some((x) => (x.schedule_id || `${x.code}-${x.class}`) === (b.schedule_id || `${b.code}-${b.class}`))) {
            conflicts.push(b);
          }
        }
      }
    }

    return conflicts;
  }, [flow.phase, flow.matched, savedSchedule]);

  const triggerConflictHighlight = () => {
    if (existingConflicts.length > 0) {
      const ids = existingConflicts.map(
        (c: CourseSchedule) => c.schedule_id || `${c.code}-${c.class}`,
      );
      setConflictingCourseIds(ids);

      gooeyToast.error("Jadwal Bentrok", {
        description: `Terdapat ${existingConflicts.length} mata kuliah bentrok dengan jadwalmu!`,
      });

      if (conflictTimerRef.current) clearTimeout(conflictTimerRef.current);
      conflictTimerRef.current = setTimeout(() => {
        setConflictingCourseIds([]);
      }, 2000);
    }
  };

  const hasTriggeredRef = useRef(false);
  useEffect(() => {
    if (flow.phase === "ready" && existingConflicts.length > 0 && !hasTriggeredRef.current) {
      hasTriggeredRef.current = true;
      triggerConflictHighlight();
    }
  }, [flow.phase, existingConflicts]);

  const handleReject = () => {
    router.push("/schedule");
  };

  const handleAdopt = () => {
    const toSave = stampForAdoption(flow.matched);
    setSavedSchedule(toSave);
    trackScheduleAdopted(toSave.length, flow.hasExisting);
    gooeyToast.success("Jadwal Diadopsi", {
      description: `${toSave.length} mata kuliah berhasil disalin ke jadwalmu`,
    });
    router.push("/schedule");
  };

  const handleOpenDialog = () => {
    if (existingConflicts.length > 0) {
      triggerConflictHighlight();
    }
    setDialogOpen(true);
  };

  const showLoader =
    resolvePhase !== "error" &&
    (isValidating ||
      !isAuthenticated ||
      resolvePhase === "checking" ||
      resolvePhase === "resolving" ||
      flow.phase === "waiting" ||
      flow.phase === "redirecting");

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center gap-6 bg-white swiss-grid-pattern px-6 py-16 text-black">
      <div className="w-full h-2 bg-[#FF3000] absolute top-0 left-0" />

      <Image
        src="/logo.png"
        alt="KeRaS"
        width={56}
        height={56}
        className="w-14 h-14 object-contain"
        priority
      />

      <div className="flex items-center gap-4">
        <div className="w-8 h-0.5 bg-[#FF3000]" />
        <span className="text-xs font-bold uppercase tracking-widest">
          Adopsi Jadwal
        </span>
        <div className="w-8 h-0.5 bg-[#FF3000]" />
      </div>

      {/* Sharer identity (from the share link) */}
      {share && (share.nama || share.nim) && (
        <div className="flex items-center gap-2 border-2 border-black bg-[#F2F2F2] px-4 py-2 text-sm font-medium">
          <User className="w-4 h-4 text-[#FF3000]" />
          <span>
            Dibagikan oleh{" "}
            <span className="font-black">{share.nama || "Mahasiswa"}</span>
            {share.nim ? ` • ${share.nim}` : ""}
          </span>
        </div>
      )}

      {showLoader && (
        <div className="flex flex-col items-center gap-3 text-center">
          <Loader2 className="w-6 h-6 animate-spin text-[#FF3000]" />
          <p className="text-sm text-[#555555] font-medium max-w-md">
            {isValidating || !isAuthenticated
              ? "Memeriksa sesi login kamu..."
              : "Menyiapkan jadwal yang dibagikan..."}
          </p>
        </div>
      )}

      {resolvePhase === "error" && (
        <div className="flex flex-col items-center gap-4 text-center max-w-md">
          <TriangleAlert className="w-8 h-8 text-[#FF3000]" />
          <h1 className="text-2xl md:text-3xl font-black tracking-tighter uppercase leading-[0.95]">
            Terjadi Kesalahan
          </h1>
          <p className="text-sm text-[#555555] font-medium">{errorMessage}</p>
          <Button
            onClick={() => router.push("/schedule")}
            className="rounded-none bg-black text-white hover:bg-[#FF3000] uppercase font-black tracking-widest transition-colors duration-200 h-12 px-8"
          >
            Ke Jadwalku
          </Button>
        </div>
      )}

      {!showLoader && flow.phase === "empty" && (
        <div className="flex flex-col items-center gap-4 text-center max-w-md">
          <CalendarX2 className="w-8 h-8 text-[#FF3000]" />
          <h1 className="text-2xl md:text-3xl font-black tracking-tighter uppercase leading-[0.95]">
            Jadwal Tidak Ditemukan
          </h1>
          <p className="text-sm text-[#555555] font-medium">
            Mata kuliah pada link ini tidak cocok dengan data jadwal yang
            ditawarkan saat ini. Mungkin datanya sudah berubah.
          </p>
          <Button
            onClick={() => router.push("/schedule")}
            className="rounded-none bg-black text-white hover:bg-[#FF3000] uppercase font-black tracking-widest transition-colors duration-200 h-12 px-8"
          >
            Ke Jadwalku
          </Button>
        </div>
      )}

      {!showLoader && flow.phase === "blocked" && (
        <div className="flex flex-col items-center gap-4 text-center max-w-md">
          <TriangleAlert className="w-8 h-8 text-[#FF3000]" />
          <h1 className="text-2xl md:text-3xl font-black tracking-tighter uppercase leading-[0.95]">
            Tidak Bisa Diadopsi
          </h1>
          <p className="text-sm text-[#555555] font-medium">
            {BLOCK_MESSAGES[flow.blockReason ?? "codes-not-found"]}
          </p>
          <Button
            onClick={() => router.push("/schedule")}
            className="rounded-none bg-black text-white hover:bg-[#FF3000] uppercase font-black tracking-widest transition-colors duration-200 h-12 px-8"
          >
            Ke Jadwalku
          </Button>
        </div>
      )}

      {!showLoader && flow.phase === "ready" && (
        <div className="flex flex-col items-center gap-4 text-center max-w-4xl w-full">
          <h1 className="text-3xl md:text-4xl font-black tracking-tighter uppercase leading-[0.9]">
            Siap <span className="text-[#FF3000]">Adopsi</span>
          </h1>
          <p className="text-sm text-[#555555] font-medium">
            Jadwal ini berisi{" "}
            <span className="text-black font-bold">
              {flow.matched.length} mata kuliah
            </span>{" "}
            (
            {flow.matched.reduce((acc, c) => acc + Number(c.sks || 0), 0)}{" "}
            SKS).
          </p>

          {existingConflicts.length > 0 && (
            <div
              onClick={triggerConflictHighlight}
              className="w-full flex items-center gap-2 border-2 border-[#FF3000] bg-[#FF3000]/10 p-3 text-xs font-bold text-black cursor-pointer hover:bg-[#FF3000]/20 transition-colors"
            >
              <TriangleAlert className="w-4 h-4 text-[#FF3000] flex-shrink-0" />
              <span>
                Perhatian: Terdapat {existingConflicts.length} jadwal yang bentrok dengan jadwal tersimpanmu. Klik untuk highlight!
              </span>
            </div>
          )}

          <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {flow.matched.map((c) => {
              const id = c.schedule_id || `${c.code}-${c.class}`;
              const isConflicting = conflictingCourseIds.includes(id);

              return (
                <div
                  key={c.schedule_id || `${c.code}-${c.class}`}
                  onClick={() => isConflicting && triggerConflictHighlight()}
                  className={cn(
                    "relative flex items-center justify-between gap-3 border-2 px-3 py-2 text-left bg-[#F2F2F2] transition-colors overflow-hidden",
                    isConflicting ? "border-[#FF3000] ring-2 ring-[#FF3000]" : "border-black"
                  )}
                >
                  {isConflicting && <BorderTrail duration={0.5} />}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-black">
                      {c.course}
                    </p>
                    <p className="truncate text-xs text-[#555555] font-medium">
                      {c.lecture || "-"}
                    </p>
                    <p className="truncate text-xs text-[#555555] font-medium">
                      {c.day || "-"} | {c.hour || "-"} | {c.classroom || "-"}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      "rounded-none border-2 text-xs flex-shrink-0",
                      isConflicting
                        ? "border-[#FF3000] bg-[#FF3000] text-white"
                        : "border-black bg-white text-black"
                    )}
                  >
                    {c.code} • {c.class}
                  </Badge>
                </div>
              );
            })}
          </div>
          <div className="flex flex-col sm:flex-row gap-3 mt-2">
            <Button
              onClick={handleReject}
              variant="outline"
              className="rounded-none border-2 border-black uppercase font-black tracking-widest h-12 px-8"
            >
              <CalendarX2 className="w-4 h-4 mr-2" />
              Gak Jadi
            </Button>
            <Button
              onClick={handleOpenDialog}
              className="rounded-none bg-black text-white hover:bg-[#FF3000] uppercase font-black tracking-widest transition-colors duration-200 h-12 px-8"
            >
              <CalendarCheck2 className="w-4 h-4 mr-2" />
              Adopsi Jadwal
            </Button>
          </div>
        </div>
      )}

      <div className="w-full h-2 bg-[#FF3000] absolute bottom-0 left-0" />

      <AdoptConfirmDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        sharer={share}
        matched={flow.matched}
        missingCount={flow.missingCount}
        hasExisting={flow.hasExisting}
        onConfirm={handleAdopt}
      />
    </div>
  );
}
