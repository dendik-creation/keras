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
  Swords,
  Sword,
  CircleX,
  Trash2,
  BadgeQuestionMark,
} from "lucide-react";
import ElectricBorder from "@/components/ElectricBorder";

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
import { getLocalStorage, setLocalStorage } from "@/helper/local_storage";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SubmitLog } from "@/types/submit_log";
import AuthAccess from "@/components/middleware_wrapper/AuthAccess";
import ConfirmDialog from "@/components/custom/ConfirmDialog";

const TOTAL_ATTEMPTS = 10;
const DELAY_MS = 300;

export default function Page() {
  const [isWarStarted, setWarStarted] = useState(false);
  const [isFindActualSchedule, setFindActualSchedule] = useState(false);
  const [selectedCourses, setSelectedCourses] = useState<CourseSchedule[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitLogs, setSubmitLogs] = useState<SubmitLog[]>([]);
  const [readyReleases, setReadyReleases] = useState<
    {
      course_code: string;
      course_class: string;
    }[]
  >([]);

  const findActualScheduleIds = async (courses_info?: CourseSchedule[]) => {
    const courses = courses_info || selectedCourses;
    const allHaveSubmitId = courses.every(
      (course) => course?.schedule_submit_id && course?.saved_in_submit,
    );
    if (allHaveSubmitId) {
      return courses;
    }

    try {
      setFindActualSchedule(true);
      const params = courses.map((course) => ({
        code: course.code,
        class: course.class,
      }));

      const response = await axios.get("/api/submit", {
        params: {
          courses: JSON.stringify(params),
        },
      });

      if (!response.data.success) {
        toast.error(response.data.message, { richColors: true });
        setWarStarted(false);
        return false;
      }

      const data = response.data.data;
      const updatedCourses = courses.map((course) => {
        const matched = Array.isArray(data)
          ? data.find(
              (item: any) =>
                item.code === course.code && item.class === course.class,
            )
          : null;

        if (matched && matched.schedule_submit_id) {
          // course found and ready for war submit
          return {
            ...course,
            schedule_submit_id: matched.schedule_submit_id,
            saved_in_submit: false,
          };
        } else {
          return {
            // Course has been saved before (win the war this class)
            ...course,
            schedule_submit_id: "",
            saved_in_submit: true,
          };
        }
      });

      setLocalStorage("krs_saved_schedule", updatedCourses);
      setSelectedCourses(updatedCourses);
      setWarStarted(true);

      return true;
    } catch (error) {
      return false;
    } finally {
      setFindActualSchedule(false);
    }
  };

  useEffect(() => {
    const savedCourses = getLocalStorage("krs_saved_schedule");
    if (savedCourses && Array.isArray(savedCourses)) {
      setSelectedCourses(savedCourses);
      findActualScheduleIds(savedCourses);
    }
    setIsHydrated(true);
  }, []);

  const handleStartWar = async () => {
    if (!isWarStarted) {
      toast.error("Waktu perang KRS belum dimulai", { richColors: true });
      return;
    }
    if (selectedCourses.length === 0) {
      toast.error("Pilih jadwal dulu sebelum mulai War!");
      return;
    }
    setIsSubmitting(true);
    setSubmitLogs([]);
    const scheduleIds = selectedCourses
      .filter((c) => c.saved_in_submit === false && c.schedule_submit_id != "")
      .map((c) => c.schedule_submit_id as string);

    if (scheduleIds.length === 0) {
      toast.success("Tidak ada jadwal lagi yang perlu di ikutkan perang", {
        richColors: true,
      });
      setIsSubmitting(false);
      return;
    }

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
      toast.success("Perang berhasil diselesaikan", { richColors: true });
    }, 1000);
  };

  const handleAlertType = (message: string) => {
    const lowerMsg = message.toLowerCase();
    if (
      lowerMsg.includes("bukan periode") ||
      lowerMsg.includes("gagal") ||
      lowerMsg.includes("bentrok") ||
      lowerMsg.includes("penuh")
    ) {
      return "error";
    } else if (
      lowerMsg.includes("berhasil") ||
      lowerMsg.includes("sukses") ||
      lowerMsg.includes("terdaftar") ||
      lowerMsg.includes("tersimpan") ||
      lowerMsg.includes("simpan")
    ) {
      return "success";
    }
  };

  const processSubmitRequest = async (attemptId: number, ids: string[]) => {
    const scheduleIds = getLocalStorage("krs_saved_schedule")
      .filter((c) => c.saved_in_submit === false && c.schedule_submit_id != "")
      .map((c) => c.schedule_submit_id as string);
    if (scheduleIds.length === 0) {
      updateLogStatus(attemptId, {
        status: "success",
        messages: [
          {
            status: "success",
            message: "Kamu menang dalam perang KRS. Semua jadwalmu telah aman",
          },
        ],
        statusCode: 200,
      });
      return;
    } else {
      try {
        const response = await axios.post("/api/submit", {
          schedule_ids: ids,
        });

        const data = response.data;

        updateLogStatus(attemptId, {
          status: "success",
          messages:
            data.messages?.map((msg: string) => ({
              status: handleAlertType(msg) || "error",
              message: msg,
            })) || [],
          statusCode: data.status_code,
        });

        // Mark saved_in_submit and empty schedule_submit_id for successfully saved courses
        let updatedCourses = [...selectedCourses];
        if (Array.isArray(data.messages)) {
          data.messages.forEach((msg: string) => {
            const lowerMsg = msg.toLowerCase();

            if (lowerMsg.includes("tersimpan")) {
              const match = msg.match(
                /Tersimpan\s*:\s*([A-Z0-9]+)\s+([A-Z])\s*-/i,
              );
              if (match) {
                const code = match[1];
                const className = match[2];
                updatedCourses = updatedCourses.map((course) => {
                  if (course.code === code && course.class === className) {
                    return {
                      ...course,
                      saved_in_submit: true,
                      schedule_submit_id: "",
                    };
                  }
                  return course;
                });
              }
            }
          });

          setSelectedCourses(updatedCourses);
          setLocalStorage("krs_saved_schedule", updatedCourses);
        }
      } catch (error: any) {
        const errorMsg =
          error.response?.data?.message ||
          error.message ||
          "Error tidak dikenal";
        updateLogStatus(attemptId, {
          status: "success",
          messages: [errorMsg],
          statusCode: error.response?.status,
        });
      }
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

  const handleReadyReleases = (course_code: string, course_class: string) => {
    setReadyReleases((prev) => {
      // Check if the item already exists
      const exists = prev.some(
        (item) =>
          item.course_code === course_code &&
          item.course_class === course_class,
      );
      if (exists) {
        // Remove it
        return prev.filter(
          (item) =>
            !(
              item.course_code === course_code &&
              item.course_class === course_class
            ),
        );
      } else {
        // Add it
        return [...prev, { course_code, course_class }];
      }
    });
  };

  const SubmitReleaseCourse = async () => {
    if (readyReleases.length === 0) {
      toast.error("Tidak ada jadwal yang dipilih untuk dihapus.");
      return;
    }

    const releasableCourses = readyReleases.filter((item) => {
      const course = selectedCourses.find(
        (c) =>
          c.code === item.course_code &&
          c.class === item.course_class &&
          c.saved_in_submit === true,
      );
      return course !== undefined;
    });

    const removableCourses = readyReleases.filter((item) => {
      const course = selectedCourses.find(
        (c) =>
          c.code === item.course_code &&
          c.class === item.course_class &&
          c.saved_in_submit === false,
      );
      return course !== undefined;
    });

    if (releasableCourses.length > 0) {
      let response;
      try {
        response = await axios.delete("/api/submit", {
          data: { courses: JSON.stringify(releasableCourses) },
        });
      } catch (error) {
        toast.error("Gagal melepas jadwal yang dipilih");
        return;
      }
      const isSuccess = response.data.success;
      if (isSuccess) {
        const updatedCourses = selectedCourses.map((course) => {
          const shouldUpdate = releasableCourses.some(
            (item) =>
              item.course_code === course.code &&
              item.course_class === course.class,
          );
          if (shouldUpdate) {
            return {
              ...course,
              saved_in_submit: false,
              schedule_submit_id: "",
            };
          }
          return course;
        });
        setSelectedCourses(updatedCourses);
        setLocalStorage("krs_saved_schedule", updatedCourses);
        setReadyReleases([]);
        toast.success("Jadwal terpilih telah dilepaskan.", {
          richColors: true,
        });
      } else {
        toast.error("Gagal melepas jadwal yang dipilih.");
      }
    }

    if (removableCourses.length > 0) {
      const updatedCourses = selectedCourses.filter((course) => {
        const shouldRemove = removableCourses.some(
          (item) =>
            item.course_code === course.code &&
            item.course_class === course.class,
        );
        return !shouldRemove;
      });
      setSelectedCourses(updatedCourses);
      setLocalStorage("krs_saved_schedule", updatedCourses);
      setReadyReleases([]);
      toast.success("Jadwal terpilih telah dihapus.", { richColors: true });
    }
    window.location.reload();
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
                  <ElectricBorder
                    color={isSubmitting ? "#4c1d95" : "#14532d"}
                    speed={isSubmitting ? 4 : 1}
                    chaos={0.15}
                    style={{
                      padding: "10px",
                      width: "100%",
                    }}
                  >
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
                        {isWarStarted ? (
                          <Button
                            size="lg"
                            variant={"green"}
                            onClick={handleStartWar}
                            disabled={
                              isSubmitting ||
                              selectedCourses.length === 0 ||
                              !isWarStarted
                            }
                            className={`w-full font-bold text-md transition-all ${isSubmitting ? "animate-pulse" : ""}`}
                          >
                            {isSubmitting ? (
                              <>
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                Berdoalah...
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
                            variant={"yellow"}
                            onClick={() => findActualScheduleIds()}
                            disabled={isFindActualSchedule}
                            className={`w-full font-bold text-md transition-all ${isFindActualSchedule ? "animate-pulse" : ""}`}
                          >
                            {isFindActualSchedule ? (
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
                  </ElectricBorder>

                  <div className="grow overflow-auto flex flex-col">
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
                              log.status === "success"
                                ? "border-green-200 bg-green-50/50"
                                : "border-yellow-200 bg-yellow-50/50"
                            }`}
                          >
                            <AccordionTrigger className="hover:no-underline py-3">
                              <div className="flex items-center justify-between w-full pr-2">
                                <div className="flex items-center gap-3">
                                  {log.status === "pending" && (
                                    <Loader2 className="w-4 h-4 text-yellow-500 animate-spin" />
                                  )}
                                  {log.status === "success" && (
                                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                                  )}

                                  <span className="text-sm font-medium">
                                    Fase {log.attempt} - Klik untuk detail
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
                                      {msg.status == "error" ? (
                                        <CircleX className="w-4 h-4 inline mr-1 text-red-600" />
                                      ) : (
                                        <CheckCircle2 className="w-4 h-4 inline mr-1 text-green-600" />
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
                <div className="flex flex-col h-full bg-white">
                  <div className="p-4 border-b flex justify-between items-center bg-slate-50">
                    <div>
                      <h3 className="font-bold text-lg">Tabel Jadwal</h3>
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
                              variant={"red"}
                              size={"sm"}
                              disabled={readyReleases.length == 0}
                            >
                              <Trash2 />
                              <span>Hapus Terpilih</span>
                            </Button>
                          </span>
                        }
                        confirmAction={SubmitReleaseCourse}
                      />
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
                                    onClick={() =>
                                      handleReadyReleases(
                                        course.code,
                                        course.class,
                                      )
                                    }
                                    key={course.schedule_id}
                                    className="relative cursor-pointer pt-0 hover:shadow-md transition-shadow overflow-hidden"
                                  >
                                    {readyReleases.some(
                                      (item) =>
                                        item.course_code === course.code &&
                                        item.course_class === course.class,
                                    ) && (
                                      <div className="absolute bottom-0 left-0 w-full py-1 flex justify-center items-center z-10 transition-all bg-red-500 text-white">
                                        <div className="flex w-full justify-center items-center">
                                          <p className="m-0 text-xs w-full text-center">
                                            Siap dihapus
                                          </p>
                                        </div>
                                      </div>
                                    )}
                                    <CardContent className="p-2">
                                      {course.saved_in_submit ? (
                                        <div className="absolute bottom-0 left-0 w-full py-1 flex justify-center items-center transition-all bg-violet-500 text-white">
                                          <div className="flex w-full justify-center items-center">
                                            <p className="m-0 text-xs w-full text-center">
                                              Sudah punya
                                            </p>
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="absolute bottom-0 left-0 w-full py-1 flex justify-center items-center transition-all bg-yellow-300 text-black">
                                          <div className="flex w-full justify-center items-center">
                                            <p className="m-0 text-xs w-full text-center">
                                              Belum punya
                                            </p>
                                          </div>
                                        </div>
                                      )}
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
