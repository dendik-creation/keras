"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  CheckCircle2,
  Swords,
  Sword,
  CircleX,
  Trash2,
  BadgeQuestionMark,
  Search,
  PauseCircle,
  Clock,
  SkipForward,
} from "lucide-react";
import ProgressBorder from "@/components/ProgressBorder";

import AppLayout from "@/components/partials/AppLayout";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ymdToIdDate } from "@/helper/frontend_helper";
import { Alert, AlertDescription } from "@/components/ui/alert";
import AuthAccess from "@/components/middleware_wrapper/AuthAccess";
import ConfirmDialog from "@/components/custom/ConfirmDialog";
import { gooeyToast } from "@/components/ui/goey-toaster";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSubmitWarEngine, TOTAL_ATTEMPTS } from "@/hooks/useSubmitWarEngine";
import WarTestDebugPanel from "@/components/custom/WarTestDebugPanel";
import { ScheduleBoard } from "@/components/schedule/ScheduleBoard";
import { SegmentedSchedulePreview } from "@/components/schedule/SegmentedSchedulePreview";
import { cn } from "@/lib/utils";
import { AttemptStatus } from "@/types/submit_log";
import {
  trackWarPageOpened,
  trackWarScheduleLoaded,
  trackWarValidationCompleted,
} from "@/lib/analytics/events";

type Props = {
  warTestMode: boolean;
};

function getStatusText(status: AttemptStatus): string {
  switch (status) {
    case "waiting":
      return "Waiting";
    case "processing":
      return "Processing";
    case "submitting":
      return "Submitting";
    case "completed":
    case "success":
      return "Completed";
    case "failed":
      return "Failed";
    case "pending":
      return "Pending";
    case "skipped":
      return "Skipped";
    default:
      return status;
  }
}

function getBadgeIcon(status: AttemptStatus) {
  switch (status) {
    case "waiting":
      return <Clock className="w-3.5 h-3.5 text-black/60 shrink-0" />;
    case "processing":
      return <Loader2 className="w-3.5 h-3.5 text-blue-700 shrink-0 animate-spin" />;
    case "submitting":
      return <Swords className="w-3.5 h-3.5 text-white shrink-0 animate-pulse" />;
    case "completed":
    case "success":
      return <CheckCircle2 className="w-3.5 h-3.5 text-black shrink-0" />;
    case "failed":
      return <CircleX className="w-3.5 h-3.5 text-[#FF3000] shrink-0" />;
    case "skipped":
      return <SkipForward className="w-3.5 h-3.5 text-slate-600 shrink-0" />;
    default:
      return <Clock className="w-3.5 h-3.5 text-black/60 shrink-0" />;
  }
}

function getBadgeStyle(status: AttemptStatus): string {
  switch (status) {
    case "completed":
    case "success":
      return "bg-black text-white";
    case "submitting":
    case "processing":
      return "bg-[#0066FF] text-white";
    case "failed":
      return "bg-[#FF3000] text-white";
    case "skipped":
      return "bg-slate-200 text-slate-800 border border-slate-400 font-bold";
    case "waiting":
    default:
      return "bg-[#E5E7EB] text-black border border-black/30";
  }
}

export default function SubmitClientPage({ warTestMode }: Props) {
  const router = useRouter();
  const isMobile = useIsMobile();
  const war = useSubmitWarEngine(warTestMode);
  const pageTrackedRef = useRef(false);
  const hasWarnedRef = useRef(false);

  useEffect(() => {
    if (!war.isHydrated) return;

    if (!war.courses || war.courses.length === 0) {
      if (!hasWarnedRef.current) {
        hasWarnedRef.current = true;
        gooeyToast.error("Tidak boleh perang", {
          description: "Siapkan jadwalmu terlebih dahulu",
        });
        router.push("/schedule");
      }
      return;
    }

    if (pageTrackedRef.current) return;
    pageTrackedRef.current = true;
    const warMode = warTestMode ? "test" : "production";
    const totalCourses = war.courses.length;
    const hasSchedule = totalCourses > 0;
    const totalSks = war.courses.reduce(
      (acc, curr) => acc + Number(curr.sks || 0),
      0,
    );

    trackWarPageOpened({
      war_mode: warMode,
      total_courses: totalCourses,
      has_schedule: hasSchedule,
    });

    trackWarScheduleLoaded({
      war_mode: warMode,
      total_courses: totalCourses,
      total_sks: totalSks,
      has_schedule: hasSchedule,
    });

    trackWarValidationCompleted({
      war_mode: warMode,
      total_courses: totalCourses,
      is_valid: true,
      validation_duration_ms: 0,
    });
  }, [war.isHydrated, war.courses, warTestMode, router]);

  const [readyReleases, setReadyReleases] = useState<
    {
      course_code: string;
      course_class: string;
    }[]
  >([]);

  const handleReadyReleases = (course_code: string, course_class: string) => {
    if (war.isSubmitting) return;
    setReadyReleases((prev) => {
      const exists = prev.some(
        (item) =>
          item.course_code === course_code &&
          item.course_class === course_class,
      );
      if (exists) {
        return prev.filter(
          (item) =>
            !(
              item.course_code === course_code &&
              item.course_class === course_class
            ),
        );
      } else {
        return [...prev, { course_code, course_class }];
      }
    });
  };

  const handleSubmitRelease = async () => {
    if (readyReleases.length === 0) {
      gooeyToast.warning("Info Bosku", {
        description: "Tidak ada jadwal yang dipilih untuk dihapus",
        action: {
          label: "Buka Jadwal",
          onClick: () => (window.location.href = "/schedule"),
          successLabel: "Utiwii",
        },
      });
      return;
    }
    const changed = await war.releaseCourses(readyReleases);
    if (changed) setReadyReleases([]);
  };

  const totalSKS = useMemo(() => {
    return war.courses.reduce((acc, curr) => acc + Number(curr.sks), 0);
  }, [war.courses]);

  if (!war.isHydrated || !war.courses || war.courses.length === 0) return null;

  return (
    <AuthAccess>
      <AppLayout
        pageTitleHeader="Perang KRS"
        pageDescriptionHeader="Otomatiskan perang KRS kamu dengan sekali klik!"
      >
        {/* MOBILE ADAPTIVE SINGLE-COLUMN LAYOUT (≤ 767px) */}
        <div className="md:hidden flex flex-col gap-5 pb-28">
          {/* 1. Progress Card */}
          <div data-tour-mobile="war-control-panel" className="bg-white text-black p-4 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-medium text-xs uppercase tracking-wider text-[#FF3000]">
                PERANG KRS
              </span>
              <Badge
                variant="outline"
                className="bg-black text-white border-black font-medium text-xs uppercase px-2 py-0.5"
              >
                {war.securedCount} / {war.totalCount} Diamankan
              </Badge>
            </div>
            <div className="text-xl font-bold text-black uppercase tracking-tight">
              {war.securedCount} / {war.totalCount} Mata Kuliah Diamankan
            </div>
            {/* Progress bar */}
            <div className="h-3 w-full border-2 border-black bg-[#F2F2F2] overflow-hidden">
              <div
                className="h-full bg-[#FF3000] transition-all duration-300"
                style={{
                  width: `${war.totalCount > 0 ? (war.securedCount / war.totalCount) * 100 : 0}%`,
                }}
              />
            </div>
          </div>

          {/* 2. Primary Action Button */}
          {war.isWarStarted ? (
            <Button
              size="lg"
              onClick={war.startWar}
              disabled={
                war.isSubmitting ||
                war.courses.length === 0 ||
                !war.isWarStarted
              }
              className={cn(
                "w-full h-13 bg-[#FF3000] hover:bg-black text-white border-2 border-black rounded-none font-bold text-base uppercase tracking-wider shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center gap-2",
                war.isSubmitting && "animate-pulse",
              )}
            >
              {war.isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Semoga Sukses😁</span>
                </>
              ) : (
                <>
                  <Swords className="w-5 h-5" />
                  <span>Mulai Perang</span>
                </>
              )}
            </Button>
          ) : (
            <Button
              size="lg"
              variant="outline"
              onClick={() => war.checkWarStatus()}
              disabled={war.isFindingSchedule}
              className={cn(
                "w-full h-13 bg-white text-black hover:bg-black hover:text-white border-2 border-black rounded-none font-semibold text-sm uppercase tracking-wider shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center gap-2",
                war.isFindingSchedule && "animate-pulse",
              )}
            >
              {war.isFindingSchedule ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Hmm.. bentar</span>
                </>
              ) : (
                <>
                  <span>Apakah Perang Sudah Dibuka?</span>
                  <BadgeQuestionMark className="w-5 h-5 text-[#FF3000]" />
                </>
              )}
            </Button>
          )}

          {/* 3. Schedule Preview (Segmented Day Selector) */}
          <div data-tour-mobile="war-schedule-table" className="flex flex-col gap-2">
            <div className="flex justify-between items-center px-1">
              <h3 className="font-semibold text-sm uppercase tracking-wider flex items-center gap-2">
                <Sword className="w-4 h-4 text-[#FF3000]" /> Jadwal Perang KRS
              </h3>
              <span className="text-[10px] font-bold text-black uppercase tracking-wider">
                Total {totalSKS} SKS
              </span>
            </div>
            <SegmentedSchedulePreview
              courses={war.courses}
              isSubmitMode={true}
              readyReleases={readyReleases}
              isSubmitting={war.isSubmitting}
              onCardClick={(course) =>
                handleReadyReleases(course.code, course.class)
              }
            />
          </div>

          {/* 4. Activity (Timeline) */}
          <div data-tour-mobile="war-activity-log" className="flex flex-col gap-2">
            <h3 className="font-semibold text-sm uppercase tracking-wider flex items-center gap-2 px-1">
              <Sword className="w-4 h-4 text-[#FF3000]" /> Aktivitas Perang (
              {war.logs.length})
            </h3>
            <div className="border-2 border-black bg-white p-3 space-y-3">
              {war.logs.length === 0 ? (
                <div className="py-6 flex flex-col items-center justify-center text-center gap-2 bg-[#F2F2F2] border-2 border-dashed border-black/30">
                  <Sword className="w-6 h-6 text-black/40" />
                  <span className="text-xs font-medium uppercase tracking-wider text-black/70">
                    Belum Ada Aktivitas Perang
                  </span>
                </div>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                  {war.logs.map((log) => (
                    <div
                      key={log.attempt}
                      className="border-2 border-black bg-[#F2F2F2] p-2.5 space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium uppercase tracking-wider text-black">
                          Fase {log.attempt}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {log.durationMs !== undefined && (
                            <Badge
                              variant="outline"
                              className="border-black text-[9px] h-4 px-1 bg-[#FFFFFF] font-bold"
                            >
                              {log.durationMs}ms
                            </Badge>
                          )}
                          <Badge
                            className={cn(
                              "text-[9px] h-4 px-1 font-bold uppercase flex items-center gap-1",
                              getBadgeStyle(log.status),
                            )}
                          >
                            {getBadgeIcon(log.status)}
                            <span>{getStatusText(log.status)}</span>
                          </Badge>
                        </div>
                      </div>

                      {log.status === "processing" && (
                        <Alert className="py-1.5 bg-blue-50 border border-blue-300">
                          <AlertDescription className="text-[11px] text-blue-900 flex items-center gap-1.5 font-bold">
                            <Loader2 className="w-3.5 h-3.5 text-blue-600 shrink-0 animate-spin" />
                            <span>Processing... Submitting payload to server</span>
                          </AlertDescription>
                        </Alert>
                      )}
                      {log.status === "submitting" && (
                        <Alert className="py-1.5 bg-blue-50 border border-blue-300">
                          <AlertDescription className="text-[11px] text-blue-900 flex items-center gap-1.5 font-bold">
                            <Swords className="w-3.5 h-3.5 text-blue-600 shrink-0 animate-pulse" />
                            <span>Submitting payload...</span>
                          </AlertDescription>
                        </Alert>
                      )}
                      {log.status === "skipped" && (
                        <div className="py-2 px-2.5 border border-slate-300 bg-slate-100 space-y-1">
                          <div className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                            <SkipForward className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                            <span>Skipped</span>
                          </div>
                          <div className="text-[10px] text-slate-600 leading-snug">
                            Reason:<br />
                            No remaining courses to submit.
                          </div>
                        </div>
                      )}

                      {log.messages.map((msg, idx) => (
                        <div
                          key={idx}
                          className="text-[11px] font-semibold flex items-start gap-1.5 text-black border-t border-black/10 pt-1"
                        >
                          {msg.status === "error" ? (
                            <CircleX className="w-3.5 h-3.5 text-[#FF3000] shrink-0 mt-0.5" />
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5 text-black shrink-0 mt-0.5" />
                          )}
                          <span>{msg.message}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 5. Delete Button (Sticky Action Bar) */}
          {readyReleases.length > 0 && (
            <div className="fixed bottom-16 inset-x-0 z-40 bg-black text-white border-t-2 border-black p-3 flex items-center justify-between shadow-2xl animate-in slide-in-from-bottom-5 duration-200">
              <div className="flex flex-col">
                <span className="font-medium text-xs uppercase tracking-wider text-[#FF3000]">
                  {readyReleases.length} Mata Kuliah Dipilih
                </span>
                <span className="text-[10px] text-white/70">
                  Siap dilepas / dihapus
                </span>
              </div>
              <ConfirmDialog
                type="danger"
                title="Konfirmasi Hapus Jadwal"
                description="Jadwal akan dihapus untuk yang belum punya (perlu membuat jadwal lagi di menu jadwalmu). Untuk yang sudah punya akan dilepaskan dari kepemilikanmu. Yakin?"
                triggerNode={
                  <Button
                    data-tour-mobile="war-remove-selected"
                    variant="destructive"
                    size="sm"
                    disabled={war.isSubmitting}
                    className="rounded-none uppercase font-medium tracking-wider text-xs h-10 border border-white"
                  >
                    <Trash2 className="w-4 h-4 mr-1.5" />
                    <span>Hapus Terpilih</span>
                  </Button>
                }
                confirmAction={handleSubmitRelease}
              />
            </div>
          )}
        </div>

        {/* DESKTOP/TABLET DUAL PANEL LAYOUT (≥ 768px) */}
        <div className="hidden md:flex flex-col h-[calc(100vh-100px)]">
          <div className="grow mt-4 border-2 border-black overflow-hidden bg-white">
            <ResizablePanelGroup direction="horizontal">
              {/* War Action & Log Activity */}
              <ResizablePanel defaultSize={40} minSize={30}>
                <div className="flex flex-col h-full bg-muted/10">
                  <ProgressBorder
                    color={war.isSubmitting ? "#FF3000" : "#000000"}
                    duration={war.isSubmitting ? 1 : 4.5}
                    thickness={5}
                    style={{
                      padding: "10px",
                      width: "100%",
                    }}
                  >
                    <div data-tour-desktop="war-control-panel" className="p-3 border-b-2 border-black bg-white space-y-4">
                      <div className="">
                        <h3 className="font-bold text-lg uppercase tracking-tight flex items-center gap-2">
                          <Sword className="w-5 h-5" /> Ayo Perang KRS
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          Perang submit krs otomatis sebanyak {TOTAL_ATTEMPTS}{" "}
                          kali
                        </p>
                      </div>

                      {war.totalCount > 0 && (
                        <div className="border-2 border-black bg-[#F2F2F2] px-3 py-2">
                          <div className="flex items-center justify-between text-xs font-medium tracking-wider">
                            <span>Diamankan</span>
                            <span className="tabular-nums">
                              {war.securedCount} / {war.totalCount} Mata Kuliah
                            </span>
                          </div>
                          <div className="mt-1.5 h-2 w-full border border-black bg-white">
                            <div
                              className="h-full bg-yellow-500 transition-all"
                              style={{
                                width: `${war.totalCount > 0 ? (war.securedCount / war.totalCount) * 100 : 0}%`,
                              }}
                            />
                          </div>
                        </div>
                      )}

                      <div className="flex flex-col gap-2">
                        {war.isWarStarted ? (
                          <Button
                            size="lg"
                            onClick={war.startWar}
                            variant="default"
                            disabled={
                              war.isSubmitting ||
                              war.courses.length === 0 ||
                              !war.isWarStarted
                            }
                            className={`w-full font-bold text-md transition-all ${war.isSubmitting ? "animate-pulse" : ""}`}
                          >
                            {war.isSubmitting ? (
                              <>
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                Semoga Sukses😁
                              </>
                            ) : (
                              <>
                                <Swords className="mr-2 h-5 w-5" />
                                Mulai perang
                              </>
                            )}
                          </Button>
                        ) : (
                          <Button
                            size="lg"
                            variant={"outline"}
                            onClick={() => war.checkWarStatus()}
                            disabled={war.isFindingSchedule}
                            className={`w-full font-bold text-md transition-all ${war.isFindingSchedule ? "animate-pulse" : ""}`}
                          >
                            {war.isFindingSchedule ? (
                              <>
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                Hmm.. bentar
                              </>
                            ) : (
                              <>
                                Apakah perang sudah dibuka
                                <BadgeQuestionMark className="ml-2 h-5 w-5" />
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  </ProgressBorder>

                  <div data-tour-desktop="war-activity-log" className="grow overflow-auto flex flex-col">
                    <div className="px-4 py-2 bg-[#F2F2F2] border-b-2 border-black">
                      <span className="text-xs font-medium uppercase tracking-wider text-black">
                        Aktivitas perang ({war.logs.length} aktivitas)
                      </span>
                    </div>
                    <ScrollArea className="grow p-4">
                      {war.logs.length === 0 && (
                        <div className="h-40 flex flex-col items-center justify-center text-muted-foreground opacity-60 gap-2 border-2 border-dashed border-black uppercase tracking-wider text-xs font-medium">
                          <Sword className="w-8 h-8" />
                          <span className="text-sm">
                            Kamu belum melakukan perang
                          </span>
                        </div>
                      )}

                      <Accordion
                        type="single"
                        collapsible
                        className="w-full space-y-2"
                      >
                        {war.logs.map((log) => (
                          <AccordionItem
                            key={log.attempt}
                            value={`item-${log.attempt}`}
                            className={`border-2 px-3 bg-white last:border-b-2 ${
                              log.status === "completed" || log.status === "success"
                                ? "border-black bg-white"
                                : log.status === "failed"
                                  ? "border-[#FF3000] bg-red-50"
                                  : log.status === "skipped"
                                    ? "border-slate-400 bg-slate-50"
                                    : "border-[#555555] bg-[#F2F2F2]"
                            }`}
                          >
                            <AccordionTrigger className="hover:no-underline py-3">
                              <div className="flex items-center justify-between w-full pr-2">
                                <div className="flex items-center gap-3">
                                  {getBadgeIcon(log.status)}
                                  <span className="text-sm font-medium">
                                    Fase {log.attempt} - {getStatusText(log.status)}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  {log.durationMs !== undefined && (
                                    <Badge
                                      variant="outline"
                                      className="text-[10px] h-5"
                                    >
                                      {log.durationMs}ms
                                    </Badge>
                                  )}
                                  {log.statusCode && (
                                    <Badge
                                      variant="outline"
                                      className="text-[10px] h-5"
                                    >
                                      HTTP {log.statusCode}
                                    </Badge>
                                  )}
                                  <Badge
                                    className={cn(
                                      "text-[10px] h-5 px-1.5 font-bold uppercase",
                                      getBadgeStyle(log.status),
                                    )}
                                  >
                                    {getStatusText(log.status)}
                                  </Badge>
                                  <span className="text-[10px] text-muted-foreground">
                                    {ymdToIdDate(log.timestamp, true)}
                                  </span>
                                </div>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent className="pt-0 pb-3">
                              <div className="mt-2 text-xs space-y-2">
                                {log.status === "processing" && (
                                  <Alert className="py-2 bg-blue-50 border border-blue-300">
                                    <AlertDescription className="text-xs text-blue-900 flex items-center gap-1.5 font-medium">
                                      <Loader2 className="w-4 h-4 text-blue-600 shrink-0 animate-spin" />
                                      <span>Processing... Submitting payload to server</span>
                                    </AlertDescription>
                                  </Alert>
                                )}
                                {log.status === "submitting" && (
                                  <Alert className="py-2 bg-blue-50 border border-blue-300">
                                    <AlertDescription className="text-xs text-blue-900 flex items-center gap-1.5 font-medium">
                                      <Loader2 className="w-4 h-4 text-blue-600 shrink-0 animate-spin" />
                                      <span>Submitting payload to server...</span>
                                    </AlertDescription>
                                  </Alert>
                                )}
                                {log.status === "skipped" && (
                                  <Alert className="py-2 bg-slate-100 border border-slate-300">
                                    <AlertDescription className="text-xs text-slate-800 flex flex-col gap-1 font-medium">
                                      <div className="flex items-center gap-1.5 font-bold text-slate-900">
                                        <SkipForward className="w-4 h-4 text-slate-700 shrink-0" />
                                        <span>Skipped</span>
                                      </div>
                                      <div className="text-slate-700 pl-5 leading-relaxed">
                                        Reason:<br />
                                        No remaining courses to submit.
                                      </div>
                                    </AlertDescription>
                                  </Alert>
                                )}

                                {log.messages.map((msg, idx) => (
                                  <Alert
                                    key={idx}
                                    variant={
                                      msg.status === "error"
                                        ? "destructive"
                                        : "default"
                                    }
                                    className="py-2 bg-white/80"
                                  >
                                    <AlertDescription className="text-xs text-black leading-relaxed">
                                      {msg.status == "error" ? (
                                        <CircleX className="w-4 h-4 inline mr-1 text-[#FF3000]" />
                                      ) : (
                                        <CheckCircle2 className="w-4 h-4 inline mr-1 text-black" />
                                      )}
                                      {msg.message}
                                    </AlertDescription>
                                  </Alert>
                                ))}
                                {log.messages.length === 0 &&
                                  log.status !== "waiting" &&
                                  log.status !== "processing" &&
                                  log.status !== "submitting" && (
                                    <p className="italic text-muted-foreground">
                                      Tidak ada pesan respon dari server.
                                    </p>
                                  )}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    </ScrollArea>
                  </div>
                </div>
              </ResizablePanel>

              <ResizableHandle withHandle />

              {/* Table Of Your Custom Schedule */}
              <ResizablePanel defaultSize={60} minSize={30}>
                <div data-tour-desktop="war-schedule-table" className="flex flex-col h-full bg-white">
                  <div className="p-4 border-b-2 border-black flex justify-between items-center bg-[#F2F2F2]">
                    <div>
                      <h3 className="font-bold text-lg uppercase tracking-tight">
                        Tabel Jadwal
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Jadwal kuliah dibawah akan disertakan pada proses perang
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <ConfirmDialog
                        type="danger"
                        title="Konfirmasi Hapus Jadwal"
                        description="Jadwal akan dihapus untuk yang belum punya (perlu membuat jadwal lagi di menu jadwalmu). Untuk yang sudah punya akan dilepaskan dari kepemilikanmu. Yakin?"
                        triggerNode={
                          <span>
                            <Button
                              data-tour-desktop="war-remove-selected"
                              variant={"destructive"}
                              size={"sm"}
                              type="button"
                              disabled={
                                readyReleases.length == 0 || war.isSubmitting
                              }
                              className="rounded-none uppercase font-semibold tracking-wider"
                            >
                              <Trash2 />
                              <span>Hapus Terpilih</span>
                            </Button>
                          </span>
                        }
                        confirmAction={handleSubmitRelease}
                      />
                      <div className="text-right">
                        <span className="text-xs text-muted-foreground block uppercase tracking-wider">
                          Total SKS
                        </span>
                        <span className="font-bold text-lg text-[#FF3000] tabular-nums">
                          {totalSKS}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grow p-4 overflow-auto">
                    <ScheduleBoard
                      courses={war.courses}
                      isSubmitMode={true}
                      readyReleases={readyReleases}
                      isSubmitting={war.isSubmitting}
                      onCardClick={(course) =>
                        handleReadyReleases(course.code, course.class)
                      }
                    />
                  </div>
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          </div>
        </div>
      </AppLayout>

      {warTestMode && (
        <WarTestDebugPanel
          attempt={war.attempt}
          courses={war.courses}
          inFlight={war.inFlight}
          remaining={war.remaining}
          isSubmitting={war.isSubmitting}
          startedAt={war.startedAt}
          onReset={war.resetWarTest}
        />
      )}
    </AuthAccess>
  );
}
