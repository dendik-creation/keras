"use client";

import { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { toast } from "sonner";
import {
  Clock,
  Building2,
  CalendarSearch,
  Loader2,
  CheckCircle2,
  XCircle,
  Swords,
  Sword,
} from "lucide-react";

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
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { CourseSchedule } from "@/types/course_schedule";
import { parseTimeRange, ymdToIdDate } from "@/helper/frontend_helper";
import { getLocalStorage } from "@/helper/local_storage"; // Pastikan path import helper benar
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SubmitLog } from "@/types/submit_log";
import AuthAccess from "@/components/middleware_wrapper/AuthAccess";

const TOTAL_ATTEMPTS = 10;
const DELAY_MS = 300;

export default function Page() {
  const [selectedCourses, setSelectedCourses] = useState<CourseSchedule[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitLogs, setSubmitLogs] = useState<SubmitLog[]>([]);
  useEffect(() => {
    const savedCourses = getLocalStorage("krs_saved_schedule");
    if (savedCourses && Array.isArray(savedCourses)) {
      setSelectedCourses(savedCourses);
    }
    setIsHydrated(true);
  }, []);

  const handleStartWar = async () => {
    if (selectedCourses.length === 0) {
      toast.error("Pilih jadwal dulu sebelum mulai War!");
      return;
    }

    const scheduleIds = selectedCourses.map((c) => c.schedule_id);
    setIsSubmitting(true);
    setSubmitLogs([]);

    const wait = (ms: number) =>
      new Promise((resolve) => setTimeout(resolve, ms));

    // Loop action
    for (let i = 1; i <= TOTAL_ATTEMPTS; i++) {
      const newLog: SubmitLog = {
        attempt: i,
        status: "pending",
        messages: [],
        timestamp: new Date().toISOString(),
      };

      setSubmitLogs((prev) => [newLog, ...prev]);
      processSubmitRequest(i, scheduleIds);
      if (i < TOTAL_ATTEMPTS) {
        await wait(DELAY_MS);
      }
    }
    setTimeout(() => {
      setIsSubmitting(false);
      toast.success("Perang kamu berhasil diselesaikan", { richColors: true });
    }, 2000);
  };

  const handleAlertType = (message: string) => {
    const lowerMsg = message.toLowerCase();
    if (
      lowerMsg.includes("bukan periode") ||
      lowerMsg.includes("entri gagal") ||
      lowerMsg.includes("bentrok") ||
      lowerMsg.includes("penuh")
    ) {
      return "error";
    } else if (
      lowerMsg.includes("berhasil") ||
      lowerMsg.includes("sukses") ||
      lowerMsg.includes("terdaftar") ||
      lowerMsg.includes("diterima")
    ) {
      return "success";
    }
  };

  const processSubmitRequest = async (attemptId: number, ids: string[]) => {
    try {
      const response = await axios.post("/api/submit", {
        schedule_ids: ids,
      });

      const data = response.data;

      updateLogStatus(attemptId, {
        status: data.messages.some((msg: string) =>
          /(berhasil|sukses|terdaftar|diterima)/i.test(msg),
        )
          ? "success"
          : "error",
        messages:
          data.messages?.map((msg: string) => ({
            status: handleAlertType(msg) || "error",
            message: msg,
          })) || [],
        statusCode: data.status_code,
      });
    } catch (error: any) {
      const errorMsg =
        error.response?.data?.message || error.message || "Error tidak dikenal";
      updateLogStatus(attemptId, {
        status: "error",
        messages: [errorMsg],
        statusCode: error.response?.status,
      });
    }
  };

  const updateLogStatus = (
    attemptId: number,
    updateData: Partial<SubmitLog>,
  ) => {
    setSubmitLogs((prevLogs) =>
      prevLogs.map((log) =>
        log.attempt === attemptId ? { ...log, ...updateData } : log,
      ),
    );
  };

  const totalSKS = useMemo(() => {
    return selectedCourses.reduce((acc, curr) => acc + Number(curr.sks), 0);
  }, [selectedCourses]);
  if (!isHydrated) return null;

  return (
    <AuthAccess>
      <AppLayout
        pageTitleHeader="Perang KRS"
        pageDescriptionHeader="Otomatiskan perang KRS kamu dengan sekali klik!"
      >
        <div className="flex flex-col h-[calc(100vh-100px)]">
          <div className="grow mt-4 border rounded-lg overflow-hidden bg-background shadow-sm">
            <ResizablePanelGroup>
              {/* War Action & Log Activity */}
              <ResizablePanel defaultSize={40} minSize={30}>
                <div className="flex flex-col h-full bg-muted/10">
                  <div className="p-4 border-b bg-white space-y-4">
                    <div className="">
                      <h3 className="font-semibold text-lg flex items-center gap-2">
                        <Sword className="w-5 h-5" /> Ayo Perang KRS
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        Perang submit krs otomatis sebanyak {TOTAL_ATTEMPTS}{" "}
                        kali
                      </p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button
                        size="lg"
                        variant={"green"}
                        onClick={handleStartWar}
                        disabled={isSubmitting || selectedCourses.length === 0}
                        className={`w-full font-bold text-md transition-all ${isSubmitting ? "animate-pulse" : ""}`}
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Bantu doa untuk memenangkan perang...
                          </>
                        ) : (
                          <>
                            <Swords className="mr-2 h-5 w-5" />
                            Mulai perang
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="grow overflow-hidden flex flex-col">
                    <div className="px-4 py-2 bg-slate-50 border-b">
                      <span className="text-xs font-semibold text-slate-500">
                        Aktivitas perang ({submitLogs.length} aktivitas)
                      </span>
                    </div>
                    <ScrollArea className="grow p-4">
                      {submitLogs.length === 0 && (
                        <div className="h-40 flex flex-col items-center justify-center text-muted-foreground opacity-50 gap-2 border-2 border-dashed rounded-lg">
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
                        {submitLogs.map((log) => (
                          <AccordionItem
                            key={log.attempt}
                            value={`item-${log.attempt}`}
                            className={`border rounded-md px-3 bg-white ${
                              log.status === "error"
                                ? "border-red-200 bg-red-50/50"
                                : log.status === "success"
                                  ? "border-green-200 bg-green-50/50"
                                  : ""
                            }`}
                          >
                            <AccordionTrigger className="hover:no-underline py-3">
                              <div className="flex items-center justify-between w-full pr-2">
                                <div className="flex items-center gap-3">
                                  {log.status === "pending" && (
                                    <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                                  )}
                                  {log.status === "success" && (
                                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                                  )}
                                  {log.status === "error" && (
                                    <XCircle className="w-4 h-4 text-red-600" />
                                  )}

                                  <span className="text-sm font-medium">
                                    Fase {log.attempt}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
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
                <div className="flex flex-col h-full bg-white">
                  <div className="p-4 border-b flex justify-between items-center bg-slate-50">
                    <div>
                      <h3 className="font-bold text-lg">Tabel Jadwal</h3>
                      <p className="text-xs text-muted-foreground">
                        Jadwal kuliah dibawah akan disertakan pada proses perang
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-xs text-muted-foreground block">
                          Total SKS
                        </span>
                        <span className="font-bold text-lg text-green-500">
                          {totalSKS}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grow p-4 overflow-auto">
                    {/* Calendar Grid */}
                    <div className="grid grid-cols-5 gap-2 min-w-150">
                      {["Senin", "Selasa", "Rabu", "Kamis", "Jumat"].map(
                        (day) => (
                          <div key={day} className="flex flex-col gap-2">
                            <div className="text-center font-semibold py-2 border-b-2 border-green/20 text-muted-foreground uppercase tracking-wider">
                              {day}
                            </div>
                            <div className="space-y-2 h-full min-h-100 bg-white rounded-md p-2">
                              {selectedCourses
                                .filter(
                                  (c) =>
                                    c.day.toLowerCase() === day.toLowerCase(),
                                )
                                .sort(
                                  (a, b) =>
                                    parseTimeRange(a.hour).start -
                                    parseTimeRange(b.hour).start,
                                )
                                .map((course) => (
                                  <Card
                                    key={course.schedule_id}
                                    className="relative pt-0 hover:shadow-md transition-shadow overflow-hidden"
                                  >
                                    <CardContent className="p-2">
                                      <div className="absolute bottom-0 left-0 w-full h-1.5 transition-all bg-green-300"></div>
                                      <div className="text-sm font-bold line-clamp-2 leading-tight mb-1 pr-3">
                                        {course.course}
                                      </div>
                                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-1">
                                        <Badge
                                          variant="outline"
                                          className="h-4 px-1 text-[9px]"
                                        >
                                          {course.code}
                                        </Badge>
                                        <Badge
                                          variant="secondary"
                                          className="h-4 px-1 text-[9px]"
                                        >
                                          {course.class}
                                        </Badge>
                                      </div>
                                      <div className="text-[10px] flex items-center gap-1 text-slate-600">
                                        <Clock className="w-3 h-3" />{" "}
                                        {course.hour}
                                      </div>
                                      <div className="text-[10px] flex items-center gap-1 text-slate-600 mt-0.5">
                                        <Building2 className="w-3 h-3" />{" "}
                                        {course.classroom}
                                      </div>
                                    </CardContent>
                                  </Card>
                                ))}

                              {selectedCourses.filter(
                                (c) =>
                                  c.day.toLowerCase() === day.toLowerCase(),
                              ).length === 0 && (
                                <div className="h-full text-sm gap-3 flex-col bg-red-50 rounded-md flex items-center justify-center">
                                  <CalendarSearch />
                                  <span>Mau Libur Ya?</span>
                                </div>
                              )}
                            </div>
                          </div>
                        ),
                      )}
                    </div>
                  </div>
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          </div>
        </div>
      </AppLayout>
    </AuthAccess>
  );
}
