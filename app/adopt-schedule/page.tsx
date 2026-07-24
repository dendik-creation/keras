"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import Image from "next/image";
import {
  CalendarCheck2,
  CalendarX2,
  Loader2,
  TriangleAlert,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useSessionCheck } from "@/hooks/useSessionCheck";
import { getLocalStorage, setLocalStorage } from "@/helper/local_storage";
import {
  matchCoursesByCodeClass,
  parseShareParams,
  ShareInfo,
} from "@/helper/share_schedule";
import { CourseSchedule, OfferingCourse } from "@/types/course_schedule";
import { gooeyToast } from "@/components/ui/goey-toaster";
import { trackScheduleAdopted } from "@/lib/analytics/events";

type Phase = "checking" | "resolving" | "ready" | "empty" | "error";

export default function AdoptSchedulePage() {
  const { isAuthenticated, isValidating } = useSessionCheck();
  const router = useRouter();

  const [sharer, setSharer] = useState<ShareInfo | null>(null);
  const [phase, setPhase] = useState<Phase>("checking");
  const [matched, setMatched] = useState<CourseSchedule[]>([]);
  const [missingCount, setMissingCount] = useState(0);
  const [hasExisting, setHasExisting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [usingFreshFetch, setUsingFreshFetch] = useState(false);
  const resolvedRef = useRef(false);

  // Rule 1: guests must log in first — preserve where to return afterwards.
  useEffect(() => {
    if (isValidating || isAuthenticated) return;
    const callback = window.location.pathname + window.location.search;
    router.replace(`/login?callbackUrl=${encodeURIComponent(callback)}`);
  }, [isValidating, isAuthenticated, router]);

  // Once authenticated, parse the share link and resolve its IDs into courses.
  useEffect(() => {
    if (!isAuthenticated || resolvedRef.current) return;
    resolvedRef.current = true;

    const resolve = async () => {
      const share = parseShareParams(window.location.search);
      setSharer(share);
      setPhase("resolving");

      if (share.ids.length === 0) {
        setPhase("empty");
        return;
      }

      let offering =
        (getLocalStorage("offering_course") as OfferingCourse[] | null) || [];
      let courses = matchCoursesByCodeClass(share.ids, offering);

      // Fresh device (or the offering has changed): pull the latest data.
      if (courses.length < share.ids.length) {
        setUsingFreshFetch(true);
        try {
          const res = await axios.get("/api/schedule");
          const fresh: OfferingCourse[] = res.data?.data || [];
          if (fresh.length > 0) {
            setLocalStorage("offering_course", fresh);
            offering = fresh;
            courses = matchCoursesByCodeClass(share.ids, fresh);
          }
        } catch {
          /* keep whatever matched locally */
        }
      }

      if (courses.length === 0) {
        setPhase("empty");
        return;
      }

      const existing = getLocalStorage("krs_saved_schedule");
      setHasExisting(Array.isArray(existing) && existing.length > 0);
      setMatched(courses);
      setMissingCount(share.ids.length - courses.length);
      setPhase("ready");
      setDialogOpen(true); // Rule 2: confirm adoption
    };

    resolve().catch(() => setPhase("error"));
  }, [isAuthenticated]);

  const handleAdopt = () => {
    const toSave = matched.map((course) => ({
      ...course,
      schedule_submit_id: "",
      saved_in_submit: false,
    }));
    setLocalStorage("krs_saved_schedule", toSave);
    trackScheduleAdopted(toSave.length, hasExisting);
    gooeyToast.success("Jadwal Diadopsi", {
      description: `${toSave.length} mata kuliah berhasil disalin ke jadwalmu`,
    });
    router.push("/schedule");
  };

  const totalSks = matched.reduce((acc, c) => acc + Number(c.sks || 0), 0);
  const showLoader = isValidating || !isAuthenticated || phase === "resolving";

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
      {sharer && (sharer.nama || sharer.nim) && (
        <div className="flex items-center gap-2 border-2 border-black bg-[#F2F2F2] px-4 py-2 text-sm font-medium">
          <User className="w-4 h-4 text-[#FF3000]" />
          <span>
            Dibagikan oleh{" "}
            <span className="font-black">{sharer.nama || "Mahasiswa"}</span>
            {sharer.nim ? ` • ${sharer.nim}` : ""}
          </span>
        </div>
      )}

      {showLoader && (
        <div className="flex flex-col items-center gap-3 text-center">
          <Loader2 className="w-6 h-6 animate-spin text-[#FF3000]" />
          <p className="text-sm text-[#555555] font-medium max-w-md">
            {isValidating || !isAuthenticated
              ? "Memeriksa sesi login kamu..."
              : usingFreshFetch
                ? "Menyiapkan ketersediaan jadwal & jadwal yang dibagikan... (Cukup lama, hehe)"
                : "Menyiapkan jadwal yang dibagikan..."}
          </p>
        </div>
      )}

      {!showLoader && phase === "empty" && (
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

      {!showLoader && phase === "error" && (
        <div className="flex flex-col items-center gap-4 text-center max-w-md">
          <TriangleAlert className="w-8 h-8 text-[#FF3000]" />
          <h1 className="text-2xl md:text-3xl font-black tracking-tighter uppercase leading-[0.95]">
            Terjadi Kesalahan
          </h1>
          <p className="text-sm text-[#555555] font-medium">
            Gagal memproses jadwal yang dibagikan. Silakan coba buka link lagi.
          </p>
          <Button
            onClick={() => router.push("/schedule")}
            className="rounded-none bg-black text-white hover:bg-[#FF3000] uppercase font-black tracking-widest transition-colors duration-200 h-12 px-8"
          >
            Ke Jadwalku
          </Button>
        </div>
      )}

      {!showLoader && phase === "ready" && (
        <div className="flex flex-col items-center gap-4 text-center max-w-md">
          <h1 className="text-3xl md:text-4xl font-black tracking-tighter uppercase leading-[0.9]">
            Siap <span className="text-[#FF3000]">Adopsi</span>
          </h1>
          <p className="text-sm text-[#555555] font-medium">
            Jadwal ini berisi{" "}
            <span className="text-black font-bold">
              {matched.length} mata kuliah
            </span>{" "}
            ({totalSks} SKS).
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {matched.map((c) => (
              <Badge
                key={c.schedule_id}
                variant="outline"
                className="rounded-none border-2 border-black text-xs"
              >
                {c.code} • {c.class}
              </Badge>
            ))}
          </div>
          <Button
            onClick={() => setDialogOpen(true)}
            className="rounded-none bg-black text-white hover:bg-[#FF3000] uppercase font-black tracking-widest transition-colors duration-200 h-12 px-8 mt-2"
          >
            <CalendarCheck2 className="w-4 h-4 mr-2" />
            Adopsi Jadwal
          </Button>
        </div>
      )}

      <div className="w-full h-2 bg-[#FF3000] absolute bottom-0 left-0" />

      {/* Rule 2 & 3: confirmation dialog with a replace warning when needed */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
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
              onClick={() => setDialogOpen(false)}
              className="rounded-none border-2 border-black uppercase font-black tracking-widest"
            >
              Batal
            </Button>
            <Button
              onClick={handleAdopt}
              className="rounded-none bg-black text-white hover:bg-[#FF3000] uppercase font-black tracking-widest transition-colors duration-200"
            >
              {hasExisting ? "Ganti & Adopsi" : "Adopsi Jadwal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
