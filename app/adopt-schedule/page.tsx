"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
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
import LoadingBooks from "@/components/ui/loading-books";
import RollingNumber from "@/components/ui/rolling-number";
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

/**
 * Fetch the offered courses from the streaming NDJSON endpoint, mirroring the
 * /schedule page. The scrape takes tens of seconds and the backend keeps the
 * connection alive by emitting `progress` events; a plain buffered GET (which
 * this flow used before) reads the raw NDJSON body as a single blob and never
 * yields the final `{ type: "done", data }` object, which is why fresh-device
 * adoptions kept failing with "jadwal tidak ditemukan". Returns the offered
 * courses on success, or throws on a stream-level error.
 */
async function fetchOfferingStream(
  onProgress: (done: number, total: number) => void,
): Promise<OfferingCourse[] | null> {
  const response = await fetch("/api/schedule");
  if (!response.ok || !response.body) return null;

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let finalData: OfferingCourse[] | null = null;
  let streamError: string | null = null;

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.trim()) continue;
      const event = JSON.parse(line);
      if (event.type === "progress") {
        onProgress(event.done, event.total);
      } else if (event.type === "done") {
        finalData = event.data;
      } else if (event.type === "error") {
        streamError = event.message;
      }
    }
  }

  if (streamError) throw new Error(streamError);
  return finalData;
}

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
  const [progress, setProgress] = useState<{
    done: number;
    total: number;
  } | null>(null);
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
      console.log("[adopt-schedule] local match", {
        cachedOfferingGroups: offering.length,
        sharedIds: share.ids.length,
        matchedLocally: courses.length,
      });

      // Fresh device (or the offering has changed): pull the latest data.
      // The scrape is streamed (NDJSON) exactly like the /schedule page, so we
      // must drain the stream to completion to obtain the final data — only
      // then is it safe to run the match and the adopt action.
      if (courses.length < share.ids.length) {
        setUsingFreshFetch(true);
        console.log(
          "[adopt-schedule] local match incomplete, streaming /api/schedule",
        );
        try {
          const fresh = await fetchOfferingStream((done, total) =>
            setProgress({ done, total }),
          );
          console.log("[adopt-schedule] /api/schedule stream complete", {
            freshGroups: fresh?.length ?? 0,
          });
          if (fresh && fresh.length > 0) {
            setLocalStorage("offering_course", fresh);
            offering = fresh;
            courses = matchCoursesByCodeClass(share.ids, fresh);
            console.log("[adopt-schedule] fresh match", {
              matchedAfterFetch: courses.length,
            });
          }
        } catch (err) {
          console.error("[adopt-schedule] /api/schedule stream failed", err);
          /* keep whatever matched locally */
        } finally {
          setProgress(null);
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
          {progress ? (
            <>
              <LoadingBooks className="h-44 w-44" />
              <span className="text-sm font-semibold text-[#555555] max-w-md inline-flex items-center gap-1">
                Sedang melahap
                <RollingNumber
                  value={progress.done}
                  className="font-black tabular-nums mb-2 mx-1 text-lg text-black"
                />
                /{" "}
                <RollingNumber
                  value={progress.total}
                  className="font-black tabular-nums mb-2 mx-1 text-lg text-black"
                />{" "}
                jadwal mata kuliah
              </span>
            </>
          ) : (
            <>
              <Loader2 className="w-6 h-6 animate-spin text-[#FF3000]" />
              <p className="text-sm text-[#555555] font-medium max-w-md">
                {isValidating || !isAuthenticated
                  ? "Memeriksa sesi login kamu..."
                  : usingFreshFetch
                    ? "Menyiapkan jadwalmu (Kalau pertama kali akan lama😁)"
                    : "Menyiapkan jadwalmu..."}
              </p>
            </>
          )}
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
