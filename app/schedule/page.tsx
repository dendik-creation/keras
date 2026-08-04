"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  CalendarClock,
  Clock,
  Building2,
  User,
  BookOpen,
  CalendarSearch,
  Save,
  Trash2,
  ChevronDown,
  ScanTextIcon,
  Loader2,
  SearchX,
  Share2,
  Sparkles,
  Copy,
} from "lucide-react";

import AppLayout from "@/components/partials/AppLayout";
import { ScheduleLoadingProgress } from "@/components/schedule/ScheduleLoadingProgress";
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
import {
  checkConflict,
  checkAllConflicts,
  fetchOfferingCourses,
  parseTimeRange,
  stampForAdoption,
  ymdToIdDate,
} from "@/helper/frontend_helper";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { getLocalStorage, setLocalStorage } from "@/helper/local_storage";
import { reconcileSavedSchedule } from "@/modules/schedule/reconcile_saved_schedule";
import ConfirmDialog from "@/components/custom/ConfirmDialog";
import ShareScheduleDialog from "@/components/custom/ShareScheduleDialog";
import GenerateScheduleDialog from "@/components/custom/schedule-ai/GenerateScheduleDialog";
import ImportAiResultDialog from "@/components/custom/schedule-ai/ImportAiResultDialog";
import { buildExternalAiPrompt } from "@/modules/schedule-ai/external-prompt";
import { AppLoader } from "@/components/ui/app-loader";
import RollingNumber from "@/components/ui/rolling-number";
import AuthAccess from "@/components/middleware_wrapper/AuthAccess";
import { gooeyToast } from "@/components/ui/goey-toaster";
import { useIsMobile } from "@/hooks/use-mobile";
import { useLocalStorageContext } from "@/providers/LocalStorageProvider";
import { useResumeAdoptToast } from "@/hooks/useResumeAdoptToast";
import { motion } from "motion/react";
import { ActionDrawer } from "@/components/schedule/ActionDrawer";
import { SegmentedSchedulePreview } from "@/components/schedule/SegmentedSchedulePreview";
import { cn } from "@/lib/utils";
import { ScheduleBoard } from "@/components/schedule/ScheduleBoard";
import { AnimatePresence } from "motion/react";

export default function Page() {
  const [activeUser, setActiveUser] = useState<{
    nim: string;
    major: string;
    name: string;
    degree: string;
  } | null>(null);
  const {
    offeringCourse,
    savedSchedule,
    isWarInProgress,
    isHydrated,
    setOfferingCourse,
    setSavedSchedule,
  } = useLocalStorageContext();
  const data = useMemo(() => offeringCourse ?? [], [offeringCourse]);
  const [syncState, setSyncState] = useState<"idle" | "loading" | "completed">("idle");
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(
    null,
  );
  const [openRemoveSchedule, setOpenRemoveSchedule] = useState(false);
  const [openShareSchedule, setOpenShareSchedule] = useState(false);
  const [openGenerateAi, setOpenGenerateAi] = useState(false);
  const [openImportAi, setOpenImportAi] = useState(false);
  const [selectedCourses, setSelectedCourses] = useState<CourseSchedule[]>([]);
  const [conflictingCourseIds, setConflictingCourseIds] = useState<string[]>([]);
  const conflictTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const [resumeAdopt, setResumeAdopt] = useState<string | null>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    return () => {
      if (conflictTimerRef.current) clearTimeout(conflictTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (syncState === "completed") {
      const timer = setTimeout(() => setSyncState("idle"), 1000);
      return () => clearTimeout(timer);
    }
  }, [syncState]);

  useResumeAdoptToast({ resumeAdopt, isHydrated, offeringCourse });

  const findAvailableSchedules = async () => {
    if (syncState !== "idle") return;
    setSyncState("loading");
    setProgress(null);
    try {
      const finalData = await fetchOfferingCourses((done, total) =>
        setProgress({ done, total }),
      );

      if (!finalData || finalData.length === 0) {
        gooeyToast.error("Terjadi Kesalahan", {
          description: "Gagal mengambil jadwal kuliah",
        });
        setSyncState("idle");
        return;
      }

      setSyncState("completed");
      await new Promise((resolve) => setTimeout(resolve, 750));

      const reconcileResult = reconcileSavedSchedule(savedSchedule, finalData);

      if (!reconcileResult.success) {
        gooeyToast.error("Gagal Sinkronisasi Jadwal", {
          description:
            reconcileResult.error || "Validasi data penawaran terbaru gagal",
        });
        setSyncState("idle");
        return;
      }

      setOfferingCourse(finalData);
      setSavedSchedule(reconcileResult.reconciledSchedule);
      setSelectedCourses(reconcileResult.reconciledSchedule);
      setLocalStorage("last_reconciled_at", new Date().toISOString());

      const { summary } = reconcileResult;
      const totalProcessed =
        summary.matched +
        summary.obsolete +
        summary.removed +
        summary.manual_review;

      if (totalProcessed > 0 && (summary.updated > 0 || summary.unchanged > 0)) {
        gooeyToast.success("Ketersediaan Jadwal Diperbarui", {
          description: `${summary.updated + summary.unchanged} mata kuliah berhasil diselaraskan dengan data terbaru kampus.`,
        });
      } else if (totalProcessed === 0) {
        gooeyToast.success("Ketersediaan Jadwal Diperbarui", {
          description: "Data penawaran terbaru kampus berhasil ditarik.",
        });
      }

      if (summary.obsolete > 0 || summary.removed > 0) {
        gooeyToast.warning("Data Kampus Berubah", {
          description: `${summary.obsolete + summary.removed} mata kuliah perlu diperiksa karena sudah berubah.`,
        });
      }

      if (summary.manual_review > 0) {
        gooeyToast.warning("Konfirmasi Diperlukan", {
          description: `${summary.manual_review} mata kuliah membutuhkan konfirmasi ulang.`,
        });
      }
    } catch (error) {
      gooeyToast.error("Terjadi Kesalahan", {
        description: "Gagal mengambil jadwal kuliah",
      });
      setSyncState("idle");
    }
  };

  const handleFindSchedules = () => {
    findAvailableSchedules();
  };

  useEffect(() => {
    const user = getLocalStorage("active_user");
    if (activeUser == null && user != null) {
      setActiveUser(user);
    }
  }, [activeUser]);

  useEffect(() => {
    if (!isHydrated) return;
    if (Array.isArray(savedSchedule) && savedSchedule.length > 0) {
      setSelectedCourses(savedSchedule);
    }
  }, [isHydrated, savedSchedule]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setResumeAdopt(params.get("resumeAdopt"));
  }, []);

  const handleSelectCourse = (course: CourseSchedule) => {
    if (isWarInProgress) {
      warLockToast();
      return;
    }
    let newSelection: CourseSchedule[];
    const isSelected = selectedCourses.find(
      (c) => c.schedule_id === course.schedule_id,
    );
    if (isSelected) {
      newSelection = selectedCourses.filter(
        (c) => c.schedule_id !== course.schedule_id,
      );
    } else {
      const sameCourseCodeIndex = selectedCourses.findIndex(
        (c) => c.code === course.code,
      );

      const conflicts = checkAllConflicts(course, selectedCourses);
      if (conflicts.length > 0) {
        const conflictMsg = conflicts
          .map((c) => `${c.class} ${c.course}`)
          .join(", ");
        gooeyToast.error("Jadwal Bentrok", {
          description: `Bentrok dengan kelas ${conflictMsg}`,
        });

        const ids = conflicts.map(
          (c) => c.schedule_id || `${c.code}-${c.class}`,
        );
        setConflictingCourseIds(ids);

        if (conflictTimerRef.current) clearTimeout(conflictTimerRef.current);
        conflictTimerRef.current = setTimeout(() => {
          setConflictingCourseIds([]);
        }, 2000);

        return;
      }
      newSelection = [...selectedCourses];

      if (sameCourseCodeIndex !== -1) {
        newSelection.splice(sameCourseCodeIndex, 1);
      }

      newSelection.push(course);
    }

    const stamped = stampForAdoption(newSelection);
    setSelectedCourses(stamped);
    setSavedSchedule(stamped);
  };

  const warLockToast = () =>
    gooeyToast.warning("Perang KRS sedang berlangsung", {
      description:
        "Aksi ini dikunci sementara supaya tidak mengganggu jadwal yang sedang diperjuangkan.",
    });

  const openRemoveScheduleDialog = (event?: React.SyntheticEvent | Event) => {
    event?.preventDefault();
    event?.stopPropagation();
    if (isWarInProgress) {
      warLockToast();
      return;
    }
    setOpenRemoveSchedule(true);
  };

  const openShareScheduleDialog = (event?: React.SyntheticEvent | Event) => {
    event?.preventDefault();
    event?.stopPropagation();
    if (selectedCourses.length === 0) {
      gooeyToast.warning("Belum Ada Jadwal", {
        description: "Pilih minimal satu mata kuliah untuk dibagikan",
      });
      return;
    }
    setOpenShareSchedule(true);
  };

  const openGenerateAiDialog = (event?: React.SyntheticEvent | Event) => {
    event?.preventDefault();
    event?.stopPropagation();
    if (isWarInProgress) {
      warLockToast();
      return;
    }
    setOpenGenerateAi(true);
  };

  const handleCopyAiPrompt = (event?: React.SyntheticEvent | Event) => {
    event?.preventDefault();
    event?.stopPropagation();
    if (data.length === 0) {
      gooeyToast.error("Gagal Menyalin Prompt", {
        description: "Data mata kuliah tidak tersedia. Perbarui ketersediaan jadwal dulu.",
      });
      return;
    }

    const promptText = buildExternalAiPrompt(data);
    try {
      navigator.clipboard.writeText(promptText);
    } catch {}

    gooeyToast.success("Prompt AI berhasil disalin", {
      description:
        "Tempelkan ke AI pilihan Anda. Setelah AI memberikan hasil, salin hasil tersebut lalu tempelkan pada dialog yang akan terbuka.",
    });

    setOpenImportAi(true);
  };

  const handleSaveKRS = () => {
    if (isWarInProgress) {
      warLockToast();
      return;
    }
    if (selectedCourses.length === 0) {
      gooeyToast.warning("Jadwal Gagal Disimpan", {
        description: "Belum ada jadwal yang dipilih",
      });
      return;
    }

    setSavedSchedule(stampForAdoption(selectedCourses));
    gooeyToast.success("Jadwal Berhasil Disimpan", {
      description: "Jadwal berhasil disimpan, siap untuk perang",
    });
  };

  const handleClearKRS = () => {
    if (isWarInProgress) {
      warLockToast();
      return;
    }
    setSelectedCourses([]);
    setSavedSchedule([]);
    gooeyToast.success("Jadwal dikosongkan", {
      description: "Kamu bisa mulai menyusun jadwal lagi",
    });
  };

  const totalSKS = useMemo(() => {
    return selectedCourses.reduce((acc, curr) => acc + Number(curr.sks), 0);
  }, [selectedCourses]);

  const groupedData = useMemo(() => {
    return data.map((semesterGroup) => {
      const coursesByCode: Record<string, CourseSchedule[]> = {};

      semesterGroup.courses.forEach((c) => {
        if (!coursesByCode[c.code]) {
          coursesByCode[c.code] = [];
        }
        coursesByCode[c.code].push(c);
      });

      return {
        semester: semesterGroup.semester,
        groupedCourses: coursesByCode,
      };
    });
  }, [data]);

  const [selectedSemFilter, setSelectedSemFilter] = useState<string>("ALL");
  const [openMobileSheet, setOpenMobileSheet] = useState(false);

  const filteredGroupedData = useMemo(() => {
    if (selectedSemFilter === "ALL") return groupedData;
    return groupedData.filter((g) => g.semester === selectedSemFilter);
  }, [groupedData, selectedSemFilter]);

  const actionItems = [
    {
      id: "generate-ai",
      title: "Generate Jadwal AI",
      icon: <Sparkles className="w-4 h-4" />,
      variant: "primary" as const,
      disabled: isWarInProgress,
      onClick: (e: React.MouseEvent) => {
        setOpenMobileSheet(false);
        openGenerateAiDialog(e);
      },
    },
    {
      id: "copy-ai-prompt",
      title: "Salin Prompt AI",
      icon: <Copy className="w-4 h-4" />,
      variant: "default" as const,
      onClick: (e: React.MouseEvent) => {
        setOpenMobileSheet(false);
        handleCopyAiPrompt(e);
      },
    },
    {
      id: "share-schedule",
      title: "Bagikan Jadwal",
      icon: <Share2 className="w-4 h-4" />,
      variant: "default" as const,
      onClick: (e: React.MouseEvent) => {
        setOpenMobileSheet(false);
        openShareScheduleDialog(e);
      },
    },
    {
      id: "clear-schedule",
      title: "Bersihkan Jadwal",
      icon: <Trash2 className="w-4 h-4" />,
      variant: "danger" as const,
      disabled: isWarInProgress,
      onClick: (e: React.MouseEvent) => {
        setOpenMobileSheet(false);
        openRemoveScheduleDialog(e);
      },
    },
  ];

  return (
    <AuthAccess>
      <AppLayout
        pageTitleHeader="Jadwal KRS-mu"
        pageDescriptionHeader="Siapkan jadwal kuliah kamu dengan mudah"
      >
        {/* MOBILE ADAPTIVE SINGLE-COLUMN LAYOUT (≤ 767px) */}
        <div className="md:hidden flex flex-col gap-5 pb-24">
          {/* 1. Summary Card */}
          <div className="bg-white text-black p-4 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#555555] block">
                TOTAL SKS
              </span>
              <div className="text-3xl font-bold text-[#FF3000] tabular-nums tracking-tight flex items-baseline gap-1">
                {totalSKS}{" "}
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <Badge
                variant="outline"
                className="bg-black text-white border-black font-medium text-xs uppercase px-2.5 py-0.5"
              >
                {selectedCourses.length} Matkul
              </Badge>
              <span className="text-[10px] text-[#555555] font-semibold">
                Jadwal Terpilih
              </span>
            </div>
          </div>          {/* 2. Primary Action Button */}
          <Button
            data-tour-mobile="schedule-refresh-button"
            disabled={syncState !== "idle"}
            onClick={handleFindSchedules}
            className="w-full h-12 bg-black text-white hover:bg-[#FF3000] border-2 border-black rounded-none uppercase font-semibold tracking-wider text-sm flex items-center justify-center gap-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
          >
            {syncState !== "idle" ? (
              <Loader2 className="animate-spin w-5 h-5" />
            ) : (
              <ScanTextIcon className="w-5 h-5 text-[#FF3000]" />
            )}
            <span>Perbarui Ketersediaan Jadwal</span>
          </Button>

          {/* Mobile Actions Menu (Bottom Drawer) */}
          <div className="flex items-center justify-between border-b-2 border-black pb-2 pt-1">
            <span className="font-medium text-xs uppercase tracking-wider text-black">
              Aksi {"& Navigasi"}
            </span>
            <Button
              data-tour-mobile="schedule-actions"
              variant="outline"
              size="sm"
              className="border-2 border-black rounded-none uppercase font-medium text-xs tracking-wider"
              onClick={() => setOpenMobileSheet(true)}
            >
              Aksi Jadwal{" "}
              <ChevronDown className="w-4 h-4 ml-1 text-[#FF3000]" />
            </Button>

            <ActionDrawer
              open={openMobileSheet}
              onOpenChange={setOpenMobileSheet}
              actions={actionItems}
            />
          </div>

          {/* 3. Semester Filter Chips */}
          {groupedData.length > 0 && (
            <div className="sticky top-0 z-20 bg-[#F2F2F2] py-2 border-b-2 border-black/20 overflow-x-auto scrollbar-none flex gap-2">
              <button
                type="button"
                onClick={() => setSelectedSemFilter("ALL")}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium uppercase tracking-wider border-2 whitespace-nowrap transition-all",
                  selectedSemFilter === "ALL"
                    ? "bg-[#FF3000] text-white border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                    : "bg-white text-black border-black hover:bg-black/5",
                )}
              >
                Semua
              </button>
              {groupedData.map((sem) => {
                const semShort = sem.semester
                  .replace("Semester ", "SEM ")
                  .replace("SEMESTER ", "SEM ");
                const isSelected = selectedSemFilter === sem.semester;
                return (
                  <button
                    key={sem.semester}
                    type="button"
                    onClick={() => setSelectedSemFilter(sem.semester)}
                    className={cn(
                      "px-3 py-1.5 text-xs font-medium uppercase tracking-wider border-2 whitespace-nowrap transition-all",
                      isSelected
                        ? "bg-[#FF3000] text-white border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                        : "bg-white text-black border-black hover:bg-black/5",
                    )}
                  >
                    {semShort}
                  </button>
                );
              })}
            </div>
          )}

          {/* 4. Course List Accordion */}
          <div data-tour-mobile="schedule-course-list" className="flex flex-col gap-2">
            <div className="flex justify-between items-center px-1">
              <h3 className="font-semibold text-sm uppercase tracking-wider flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#FF3000]" /> Daftar Mata
                Kuliah
              </h3>
              {data[0]?.latest_update && (
                <span className="text-[10px] text-muted-foreground font-semibold">
                  Data per {ymdToIdDate(data[0].latest_update, true)}
                </span>
              )}
            </div>

            <AnimatePresence mode="wait">
              {syncState !== "idle" ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0, y: 8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.98 }}
                  transition={{ duration: 0.25 }}
                >
                  <ScheduleLoadingProgress syncState={syncState === "loading" ? "fetching" : syncState} progress={progress} className="min-h-[220px]" />
                </motion.div>
              ) : filteredGroupedData.length === 0 ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0, y: 8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.25 }}
                  className="p-8 border-2 border-dashed border-black bg-white flex flex-col items-center justify-center gap-2 text-center"
                >
                  <SearchX className="w-8 h-8 text-[#FF3000]" />
                  <span className="text-xs font-medium uppercase tracking-wider">
                    Tidak ada mata kuliah
                  </span>
                </motion.div>
              ) : (
                <motion.div
                  key="content"
                  initial={{ opacity: 0, y: 8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.25 }}
                >
                  <Accordion type="multiple" className="w-full space-y-2">
                    {filteredGroupedData.map((sem, semIdx) => (
                      <AccordionItem
                        key={semIdx}
                        value={`sem-${semIdx}`}
                        className="border-2 border-black bg-white last:border-b-2"
                      >
                        <AccordionTrigger className="font-medium text-xs uppercase tracking-wide hover:no-underline bg-[#F2F2F2] px-3 py-2 border-b-2 border-black">
                          <div className="flex justify-between items-center w-full pr-2">
                            <span>{sem.semester}</span>
                            <Badge
                              variant="outline"
                              className="border-black text-[10px] bg-white"
                            >
                              {Object.keys(sem.groupedCourses).length} Mata Kuliah
                            </Badge>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="p-2 space-y-2 bg-[#F2F2F2]">
                          {Object.entries(sem.groupedCourses).map(
                            ([code, classes]) => {
                              const courseName = classes[0].course;
                              const isCourseSelected = selectedCourses.some(
                                (sc) => sc.code === code,
                              );
                              const selectedClass = selectedCourses.find(
                                (sc) => sc.code === code,
                              )?.class;
                              return (
                                <Accordion
                                  key={code}
                                  type="single"
                                  collapsible
                                  className="w-full"
                                >
                                  <AccordionItem
                                    value={code}
                                    className="border-2 border-black bg-white last:border-b-2"
                                  >
                                    <AccordionTrigger className="px-3 py-2 hover:no-underline text-left">
                                      <div className="flex items-center justify-between w-full pr-2 gap-2">
                                        <div className="flex flex-col text-left overflow-hidden">
                                          <span className="font-medium text-xs text-black truncate">
                                            {courseName}
                                          </span>
                                          <span className="text-[10px] text-muted-foreground font-semibold">
                                            {code} • {classes[0].sks} SKS
                                          </span>
                                        </div>
                                        {isCourseSelected && (
                                          <Badge className="bg-black text-white text-[9px] uppercase font-bold shrink-0">
                                            Kelas {selectedClass}
                                          </Badge>
                                        )}
                                      </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="p-2 space-y-2 bg-[#F2F2F2] border-t-2 border-black">
                                      <div className="flex flex-col gap-2">
                                        {classes.map((cls) => {
                                          const isSelected = selectedCourses.some(
                                            (sc) =>
                                              sc.code === cls.code &&
                                              sc.class === cls.class,
                                          );
                                          return (
                                            <Card
                                              key={cls.schedule_id}
                                              onClick={() =>
                                                handleSelectCourse({
                                                  ...cls,
                                                  semester: sem.semester,
                                                })
                                              }
                                              className={cn(
                                                "cursor-pointer border-2 p-2.5 transition-all shadow-none",
                                                isSelected
                                                  ? "border-[#FF3000] bg-[#FF3000]/10 shadow-[2px_2px_0px_0px_rgba(255,48,0,1)]"
                                                  : "border-black bg-white hover:border-[#FF3000]",
                                              )}
                                            >
                                              <div className="flex justify-between items-center mb-1">
                                                <Badge
                                                  variant={
                                                    isSelected
                                                      ? "default"
                                                      : "outline"
                                                  }
                                                  className={
                                                    isSelected
                                                      ? "bg-[#FF3000] text-white"
                                                      : "border-black"
                                                  }
                                                >
                                                  Kelas {cls.class}
                                                </Badge>
                                                <span className="text-[10px] font-bold text-black">
                                                  {cls.day}, {cls.hour}
                                                </span>
                                              </div>
                                              <div className="text-[11px] text-[#555555] font-semibold flex items-center justify-between mt-1">
                                                <span className="truncate pr-2">
                                                  {cls.lecture}
                                                </span>
                                                <span className="shrink-0 font-bold text-black">
                                                  {cls.classroom}
                                                </span>
                                              </div>
                                            </Card>
                                          );
                                        })}
                                      </div>
                                    </AccordionContent>
                                  </AccordionItem>
                                </Accordion>
                              );
                            },
                          )}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* 5. Schedule Preview (Segmented Day Selector) */}
          <div data-tour-mobile="schedule-timetable" className="flex flex-col gap-2 mt-2">
            <h3 className="font-semibold text-sm uppercase tracking-wider flex items-center gap-2">
              <CalendarClock className="w-4 h-4 text-[#FF3000]" /> Preview Jadwal
            </h3>
            <SegmentedSchedulePreview
              selectedCourses={selectedCourses}
              onRemoveCourse={handleSelectCourse}
              conflictingCourseIds={conflictingCourseIds}
            />
          </div>

          {/* 6. Floating AI Button (FAB) */}
          <motion.button
            type="button"
            data-tour-mobile="schedule-fab-ai"
            whileTap={{ scale: 0.9 }}
            whileHover={{ scale: 1.05 }}
            onClick={(e) => openGenerateAiDialog(e)}
            disabled={isWarInProgress}
            className="fixed bottom-20 right-4 z-40 bg-[#FF3000] text-white px-3.5 py-2.5 border-2 border-black flex items-center gap-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] font-medium text-xs uppercase tracking-wider"
          >
            <Sparkles className="w-4 h-4 fill-white text-white animate-pulse" />
            <span>AI</span>
          </motion.button>
        </div>

        {/* DESKTOP/TABLET DUAL PANEL LAYOUT (≥ 768px) */}
        <div className="hidden md:flex flex-col h-[calc(100vh-100px)]">
          <div className="grow mt-4 border-2 border-black overflow-hidden bg-white">
            <ResizablePanelGroup direction="horizontal">
              {/* Schedule Offer */}
              <ResizablePanel defaultSize={40} minSize={30}>
                <ScrollArea className="h-full bg-[#F2F2F2]">
                  <div data-tour-desktop="schedule-course-list" className="p-4 space-y-4">
                    <div className="flex flex-col gap-2">
                      <h3 className="font-bold text-lg uppercase tracking-tight flex items-center gap-2">
                        <BookOpen className="w-5 h-5" /> Daftar Mata Kuliah
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {data[0]?.latest_update &&
                          `Data terbaru pada ${ymdToIdDate(data[0].latest_update, true)}`}
                      </p>
                      <Button
                        data-tour-desktop="schedule-refresh-button"
                        disabled={syncState !== "idle"}
                        onClick={handleFindSchedules}
                        size={"sm"}
                        className="bg-black text-white hover:bg-[#FF3000] rounded-none uppercase font-semibold tracking-wider"
                      >
                        {syncState !== "idle" ? (
                          <Loader2 className="animate-spin" />
                        ) : (
                          <ScanTextIcon />
                        )}
                        <span>Perbarui ketersediaan jadwal</span>
                      </Button>
                    </div>

                    {syncState === "idle" && data.length === 0 && isHydrated && (
                      <div className="flex flex-col h-150 gap-3 justify-center items-center">
                        <SearchX className="text-[#FF3000]" />
                        <div className="text-center">
                          Lakukan pencarian jadwal untuk menampilkan
                          ketersediaan jadwal terbaru
                        </div>
                      </div>
                    )}

                    <AnimatePresence mode="wait">
                      {syncState !== "idle" ? (
                        <motion.div
                          key="loading"
                          initial={{ opacity: 0, y: 8, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -8, scale: 0.98 }}
                          transition={{ duration: 0.25 }}
                        >
                          <ScheduleLoadingProgress progress={progress} syncState={syncState === "loading" ? "fetching" : syncState} className="min-h-[360px]" />
                        </motion.div>
                      ) : (
                        <motion.div
                          key="content"
                          initial={{ opacity: 0, y: 8, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          transition={{ duration: 0.25 }}
                        >
                          <Accordion type="multiple" className="w-full">
                        {groupedData.length > 0 &&
                          groupedData.map((sem, semIdx) => (
                            <AccordionItem key={semIdx} value={`sem-${semIdx}`}>
                              <AccordionTrigger className="font-bold text-md uppercase tracking-wide hover:no-underline bg-[#F2F2F2] px-4 mb-2 border-2 border-black">
                                {sem.semester}
                              </AccordionTrigger>
                              <AccordionContent className="px-2 pt-2">
                                <Accordion
                                  type="multiple"
                                  className="w-full space-y-2"
                                >
                                  {Object.entries(sem.groupedCourses).map(
                                    ([code, classes]) => {
                                      const courseName = classes[0].course;
                                      const courseCategory =
                                        classes[0].category;
                                      const isCourseSelected =
                                        selectedCourses.some(
                                          (sc) => sc.code === code,
                                        );
                                      const selectedClass =
                                        selectedCourses.find(
                                          (sc) => sc.code === code,
                                        )?.class;

                                      return (
                                        <AccordionItem
                                          key={code}
                                          value={code}
                                          className="border-2 border-black bg-white last:border-b-2"
                                        >
                                          <AccordionTrigger className="px-4 hover:no-underline">
                                            <div className="flex items-center justify-between w-full pr-4">
                                              <div className="flex flex-col items-start text-left">
                                                <span className="font-semibold text-sm">
                                                  {courseName}
                                                </span>
                                                <span className="text-xs text-muted-foreground">
                                                  {code} • {classes[0].sks} SKS
                                                  • {courseCategory}
                                                </span>
                                              </div>
                                              {isCourseSelected && (
                                                <Badge
                                                  variant="secondary"
                                                  className="text-xs bg-black text-white uppercase tracking-wide"
                                                >
                                                  Kelas {selectedClass}
                                                </Badge>
                                              )}
                                            </div>
                                          </AccordionTrigger>
                                          <AccordionContent className="p-2 space-y-2 bg-[#F2F2F2]">
                                            <div className="grid gap-3 grid-cols-[repeat(auto-fit,minmax(250px,1fr))] w-full">
                                              {classes.map((cls) => {
                                                const isSelected =
                                                  selectedCourses.some(
                                                    (sc) =>
                                                      sc.code === cls.code &&
                                                      sc.class === cls.class,
                                                  );
                                                return (
                                                  <Card
                                                    key={cls.schedule_id}
                                                    onClick={() =>
                                                      handleSelectCourse({
                                                        ...cls,
                                                        semester: sem.semester,
                                                      })
                                                    }
                                                    className={`cursor-pointer border-2 transition-colors duration-200 hover:border-[#FF3000] py-3 ${isSelected ? "border-[#FF3000] bg-[#FF3000]/5" : "border-black"}`}
                                                  >
                                                    <CardContent className="px-3">
                                                      <div className="flex justify-between items-start mb-2">
                                                        <div className="flex items-center gap-2">
                                                          <Badge
                                                            variant={
                                                              isSelected
                                                                ? "default"
                                                                : "outline"
                                                            }
                                                          >
                                                            Kelas {cls.class}
                                                          </Badge>
                                                        </div>
                                                      </div>

                                                      <div className="grid grid-cols-1 gap-1 text-xs text-muted-foreground">
                                                        <div className="flex items-center gap-2">
                                                          <User className="w-4 h-4" />{" "}
                                                          {cls.lecture}
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                          <CalendarClock className="w-4 h-4" />
                                                          <span
                                                            className={
                                                              isSelected
                                                                ? "font-semibold text-foreground"
                                                                : ""
                                                            }
                                                          >
                                                            {cls.day},{" "}
                                                            {cls.hour}
                                                          </span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                          <Building2 className="w-4 h-4" />{" "}
                                                          {cls.classroom}
                                                        </div>
                                                      </div>
                                                    </CardContent>
                                                  </Card>
                                                );
                                              })}
                                            </div>
                                          </AccordionContent>
                                        </AccordionItem>
                                      );
                                    },
                                  )}
                                </Accordion>
                              </AccordionContent>
                            </AccordionItem>
                          ))}
                      </Accordion>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </ScrollArea>
              </ResizablePanel>

              <ResizableHandle withHandle />

              {/* Table Of Your Custom Schedule */}
              <ResizablePanel defaultSize={60} minSize={30}>
                <div data-tour-desktop="schedule-timetable" className="flex flex-col h-full bg-white">
                  <div className="p-4 border-b-2 border-black flex justify-between items-center bg-[#F2F2F2]">
                    <div>
                      <h3 className="font-bold text-lg uppercase tracking-tight">
                        Tabel Jadwal
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Preview jadwal kamu
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-xs text-muted-foreground block uppercase tracking-wider">
                          Total SKS
                        </span>
                        <span className="font-bold text-lg text-[#FF3000] tabular-nums">
                          {totalSKS}
                        </span>
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            data-tour-desktop="schedule-actions"
                            size="sm"
                            variant="outline"
                            className="rounded-none border-2 border-black uppercase font-semibold tracking-wider"
                          >
                            Aksi Jadwal
                            <ChevronDown className="ml-2" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onSelect={openGenerateAiDialog}
                            disabled={isWarInProgress}
                            className="flex items-center gap-2"
                          >
                            <Sparkles className="w-4 h-4" />
                            Buat dengan AI
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={handleCopyAiPrompt}
                            className="flex items-center gap-2"
                          >
                            <Copy className="w-4 h-4" />
                            Salin Prompt AI
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={openShareScheduleDialog}
                            className="flex items-center gap-2"
                          >
                            <Share2 className="w-4 h-4" />
                            Bagikan Jadwal
                          </DropdownMenuItem>
                          <ConfirmDialog
                            open={openRemoveSchedule}
                            onOpenChange={(open) => setOpenRemoveSchedule(open)}
                            type="danger"
                            title="Bersihkan Jadwal KRS"
                            description="Menghapus jadwal akan mengosongkan semua matkul yang telah terpilih. Yakin?"
                            triggerNode={
                              <DropdownMenuItem
                                onSelect={openRemoveScheduleDialog}
                                disabled={isWarInProgress}
                                className="flex items-center gap-2 text-destructive focus:text-destructive"
                              >
                                <Trash2 className="w-4 h-4" />
                                Bersihkan Jadwal
                              </DropdownMenuItem>
                            }
                            confirmAction={handleClearKRS}
                          />
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  <div className="grow p-4 overflow-auto">
                    <ScheduleBoard
                      selectedCourses={selectedCourses}
                      onRemoveCourse={handleSelectCourse}
                      conflictingCourseIds={conflictingCourseIds}
                    />
                  </div>
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          </div>
        </div>

        {/* Global Dialogs */}
        <ShareScheduleDialog
          open={openShareSchedule}
          onOpenChange={setOpenShareSchedule}
          courses={selectedCourses}
          user={activeUser}
        />

        <GenerateScheduleDialog
          open={openGenerateAi}
          onOpenChange={setOpenGenerateAi}
          offeringCourses={data}
          onCopyPrompt={() => setOpenImportAi(true)}
          onGenerated={(courses) => {
            const stamped = stampForAdoption(courses);
            setSelectedCourses(stamped);
            setSavedSchedule(stamped);
            gooeyToast.success("Jadwal AI Berhasil Diterapkan", {
              description: "Jadwal otomatis tersimpan",
            });
          }}
        />

        <ImportAiResultDialog
          open={openImportAi}
          onOpenChange={setOpenImportAi}
          offeringCourses={data}
          onImport={(courses) => {
            const stamped = stampForAdoption(courses);
            setSelectedCourses(stamped);
            setSavedSchedule(stamped);
            gooeyToast.success("Berhasil mengimpor jadwal", {
              description: `${courses.length} mata kuliah berhasil dimuat`,
            });
          }}
        />

        <ConfirmDialog
          open={openRemoveSchedule}
          onOpenChange={setOpenRemoveSchedule}
          type="danger"
          title="Bersihkan Jadwal KRS"
          description="Menghapus jadwal akan mengosongkan semua matkul yang telah terpilih. Yakin?"
          confirmAction={handleClearKRS}
        />
      </AppLayout>
    </AuthAccess>
  );
}
