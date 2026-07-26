"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { CalendarCheck2, CalendarX2, Loader2, TriangleAlert, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSessionCheck } from "@/hooks/useSessionCheck";
import { parseShareParams } from "@/helper/share_schedule";
import { stampForAdoption } from "@/helper/frontend_helper";
import { gooeyToast } from "@/components/ui/goey-toaster";
import { trackScheduleAdopted } from "@/lib/analytics/events";
import { useLocalStorageContext } from "@/providers/LocalStorageProvider";
import { useAdoptScheduleFlow } from "@/hooks/useAdoptScheduleFlow";
import AdoptConfirmDialog from "@/components/custom/AdoptConfirmDialog";

const BLOCK_MESSAGES = {
  "program-mismatch":
    "Jadwal ini hanya bisa diadopsi sesama mahasiswa program studi yang sama, karena tiap program studi punya penawaran mata kuliah yang berbeda.",
  "codes-not-found":
    "Mata kuliah pada link ini tidak ditemukan sama sekali di penawaranmu. Jadwal yang dibagikan kemungkinan berasal dari program studi lain.",
} as const;

export default function AdoptSchedulePage() {
  const { user, isAuthenticated, isValidating } = useSessionCheck();
  const router = useRouter();
  const {
    offeringCourse,
    savedSchedule,
    isWarInProgress,
    isHydrated,
    setSavedSchedule,
  } = useLocalStorageContext();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [search, setSearch] = useState<string | null>(null);

  // Rule 1: guests must log in first — preserve where to return afterwards.
  useEffect(() => {
    if (isValidating || isAuthenticated) return;
    const callback = window.location.pathname + window.location.search;
    router.replace(`/login?callbackUrl=${encodeURIComponent(callback)}`);
  }, [isValidating, isAuthenticated, router]);

  useEffect(() => {
    setSearch(window.location.search);
  }, []);

  const share = useMemo(
    () => (search !== null ? parseShareParams(search) : null),
    [search],
  );

  const flow = useAdoptScheduleFlow({
    share,
    resumeRedirectPath: `/adopt-schedule${search ?? ""}`,
    offeringCourse,
    savedSchedule,
    receiverNim: user?.nim ?? null,
    isHydrated: isHydrated && isAuthenticated,
  });

  useEffect(() => {
    if (flow.redirectTo) router.replace(flow.redirectTo);
  }, [flow.redirectTo, router]);

  const handleReject = () => {
    router.push("/schedule");
  };

  const handleAdopt = () => {
    if (isWarInProgress) {
      gooeyToast.warning("Perang KRS sedang berlangsung", {
        description:
          "Adopsi jadwal dikunci sementara supaya tidak mengganggu jadwal yang sedang diperjuangkan.",
      });
      return;
    }
    const toSave = stampForAdoption(flow.matched);
    setSavedSchedule(toSave);
    trackScheduleAdopted(toSave.length, flow.hasExisting);
    gooeyToast.success("Jadwal Diadopsi", {
      description: `${toSave.length} mata kuliah berhasil disalin ke jadwalmu`,
    });
    router.push("/schedule");
  };

  const showLoader =
    isValidating ||
    !isAuthenticated ||
    flow.phase === "waiting" ||
    flow.phase === "redirecting";

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
          <p className="text-sm text-[#555555] font-medium">
            {isValidating || !isAuthenticated
              ? "Memeriksa sesi login kamu..."
              : "Menyiapkan jadwalmu..."}
          </p>
        </div>
      )}

      {!showLoader && flow.phase === "empty" && (
        <div className="flex flex-col items-center gap-4 text-center">
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
        <div className="flex flex-col items-center gap-4 text-center">
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
        <div className="flex flex-col items-center gap-4 text-center">
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
          <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {flow.matched.map((c) => (
              <div
                key={c.schedule_id}
                className="flex items-center justify-between gap-3 border-2 border-black bg-[#F2F2F2] px-3 py-2 text-left"
              >
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
                  className="rounded-none border-2 border-black bg-white text-xs flex-shrink-0"
                >
                  {c.code} • {c.class}
                </Badge>
              </div>
            ))}
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
              onClick={() => setDialogOpen(true)}
              disabled={isWarInProgress}
              className="rounded-none bg-black text-white hover:bg-[#FF3000] uppercase font-black tracking-widest transition-colors duration-200 h-12 px-8"
            >
              <CalendarCheck2 className="w-4 h-4 mr-2" />
              Adopsi Jadwal
            </Button>
          </div>
          {isWarInProgress && (
            <p className="text-xs text-[#555555] font-medium">
              Adopsi jadwal dikunci sementara — perang KRS sedang berlangsung.
            </p>
          )}
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
