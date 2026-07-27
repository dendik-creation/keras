"use client";

import { useMemo, useState } from "react";
import {
  Loader2,
  CheckCircle2,
  Swords,
  Sword,
  CircleX,
  Trash2,
  BadgeQuestionMark,
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
import { cn } from "@/lib/utils";

const isWarTestModeClient = process.env.NEXT_PUBLIC_WAR_TEST_MODE === "true";

export default function Page() {
  const isMobile = useIsMobile();
  const war = useSubmitWarEngine();
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

  if (!war.isHydrated) return null;

  return (
    <AuthAccess>
      <AppLayout
        pageTitleHeader="Perang KRS"
        pageDescriptionHeader="Otomatiskan perang KRS kamu dengan sekali klik!"
      >
        <div className="flex flex-col h-[calc(100dvh-160px)] md:h-[calc(100vh-100px)]">
          <div className="grow mt-4 border-2 border-black overflow-hidden bg-white">
            <ResizablePanelGroup
              direction={isMobile ? "vertical" : "horizontal"}
            >
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
                    <div data-tour="war-control-panel" className="p-4 border-b-2 border-black bg-white space-y-4">
                      <div className="">
                        <h3 className="font-black text-lg uppercase tracking-tight flex items-center gap-2">
                          <Sword className="w-5 h-5" /> Ayo Perang KRS
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          Perang submit krs otomatis sebanyak {TOTAL_ATTEMPTS}{" "}
                          kali
                        </p>
                      </div>

                      {war.totalCount > 0 && (
                        <div className="border-2 border-black bg-[#F2F2F2] px-3 py-2">
                          <div className="flex items-center justify-between text-xs font-bold tracking-widest">
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

                  <div data-tour="war-activity-log" className="grow overflow-auto flex flex-col">
                    <div className="px-4 py-2 bg-[#F2F2F2] border-b-2 border-black">
                      <span className="text-xs font-black uppercase tracking-widest text-black">
                        Aktivitas perang ({war.logs.length} aktivitas)
                      </span>
                    </div>
                    <ScrollArea className="grow p-4">
                      {war.logs.length === 0 && (
                        <div className="h-40 flex flex-col items-center justify-center text-muted-foreground opacity-60 gap-2 border-2 border-dashed border-black uppercase tracking-widest text-xs font-bold">
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
                            className={`border-2 px-3 bg-white ${
                              log.status === "success"
                                ? "border-black bg-white"
                                : "border-[#555555] bg-[#F2F2F2]"
                            }`}
                          >
                            <AccordionTrigger className="hover:no-underline py-3">
                              <div className="flex items-center justify-between w-full pr-2">
                                <div className="flex items-center gap-3">
                                  {log.status === "pending" && (
                                    <Loader2 className="w-4 h-4 text-[#FF3000] animate-spin" />
                                  )}
                                  {log.status === "success" && (
                                    <CheckCircle2 className="w-4 h-4 text-black" />
                                  )}

                                  <span className="text-sm font-medium">
                                    Fase {log.attempt} - Klik untuk detail
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
                                  <span className="text-[10px] text-muted-foreground">
                                    {ymdToIdDate(log.timestamp, true)}
                                  </span>
                                </div>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent className="pt-0 pb-3">
                              <div className="mt-2 text-xs space-y-2">
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
                                  log.status !== "pending" && (
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
                <div data-tour="war-schedule-table" className="flex flex-col h-full bg-white">
                  <div className="p-4 border-b-2 border-black flex justify-between items-center bg-[#F2F2F2]">
                    <div>
                      <h3 className="font-black text-lg uppercase tracking-tight">
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
                              data-tour="war-remove-selected"
                              variant={"destructive"}
                              size={"sm"}
                              type="button"
                              disabled={
                                readyReleases.length == 0 || war.isSubmitting
                              }
                              className="rounded-none uppercase font-bold tracking-widest"
                            >
                              <Trash2 />
                              <span>Hapus Terpilih</span>
                            </Button>
                          </span>
                        }
                        confirmAction={handleSubmitRelease}
                      />
                      <div className="text-right">
                        <span className="text-xs text-muted-foreground block uppercase tracking-widest">
                          Total SKS
                        </span>
                        <span className="font-black text-lg text-[#FF3000] tabular-nums">
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

      {isWarTestModeClient && (
        <WarTestDebugPanel
          attempt={war.attempt}
          courses={war.courses}
          inFlight={war.inFlight}
          remaining={war.remaining}
          isSubmitting={war.isSubmitting}
          startedAt={war.startedAt}
        />
      )}
    </AuthAccess>
  );
}
