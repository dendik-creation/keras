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
import { AppLoader } from "@/components/ui/app-loader";
import RollingNumber from "@/components/ui/rolling-number";
import AuthAccess from "@/components/middleware_wrapper/AuthAccess";
import { gooeyToast } from "@/components/ui/goey-toaster";
import { useIsMobile } from "@/hooks/use-mobile";
import { useLocalStorageContext } from "@/providers/LocalStorageProvider";
import { useResumeAdoptToast } from "@/hooks/useResumeAdoptToast";
import { motion } from "motion/react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { SegmentedSchedulePreview } from "@/components/schedule/SegmentedSchedulePreview";
import { cn } from "@/lib/utils";
import { ScheduleBoard } from "@/components/schedule/ScheduleBoard";

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
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(
    null,
  );
  const [openRemoveSchedule, setOpenRemoveSchedule] = useState(false);
  const [openShareSchedule, setOpenShareSchedule] = useState(false);
  const [openGenerateAi, setOpenGenerateAi] = useState(false);
  const [selectedCourses, setSelectedCourses] = useState<CourseSchedule[]>([]);
  const [resumeAdopt, setResumeAdopt] = useState<string | null>(null);
  const isMobile = useIsMobile();

  useResumeAdoptToast({ resumeAdopt, isHydrated, offeringCourse });

  const findAvailableSchedules = async () => {
    setLoading(true);
    setProgress(null);
    try {
      const finalData = await fetchOfferingCourses((done, total) =>
        setProgress({ done, total }),
      );

      if (!finalData || finalData.length === 0) {
        gooeyToast.error("Terjadi Kesalahan", {
          description: "Gagal mengambil jadwal kuliah",
        });
        return;
      }

      const reconcileResult = reconcileSavedSchedule(savedSchedule, finalData);

      if (!reconcileResult.success) {
        gooeyToast.error("Gagal Sinkronisasi Jadwal", {
          description:
            reconcileResult.error || "Validasi data penawaran terbaru gagal",
        });
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
    } finally {
      setLoading(false);
      setProgress(null);
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
    const isSelected = selectedCourses.find(
      (c) => c.schedule_id === course.schedule_id,
    );
    if (isSelected) {
      setSelectedCourses((prev) =>
        prev.filter((c) => c.schedule_id !== course.schedule_id),
      );
      return;
    }
    const sameCourseCodeIndex = selectedCourses.findIndex(
      (c) => c.code === course.code,
    );

    const conflict = checkConflict(course, selectedCourses);
    if (conflict) {
      gooeyToast.error(
        `Jadwal bentrok dengan kelas ${conflict.class} ${conflict.course}`,
      );
      return;
    }
    const newSelection = [...selectedCourses];

    if (sameCourseCodeIndex !== -1) {
      newSelection.splice(sameCourseCodeIndex, 1);
    }

    newSelection.push(course);
    setSelectedCourses(newSelection);
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
              <span className="text-[10px] font-black uppercase tracking-widest text-[#555555] block">
                TOTAL SKS
              </span>
              <div className="text-3xl font-black text-[#FF3000] tabular-nums tracking-tight flex items-baseline gap-1">
                {totalSKS}{" "}
                <span className="text-xs font-semibold text-black/60">
                  / 24 SKS
                </span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <Badge
                variant="outline"
                className="bg-black text-white border-black font-bold text-xs uppercase px-2.5 py-0.5"
              >
                {selectedCourses.length} Matkul
              </Badge>
              <span className="text-[10px] text-[#555555] font-semibold">
                Jadwal Terpilih
              </span>
            </div>
          </div>

          {/* 2. Primary Action Button */}
          <Button
            data-tour="schedule-refresh-button"
            disabled={loading}
            onClick={handleFindSchedules}
            className="w-full h-12 bg-black text-white hover:bg-[#FF3000] border-2 border-black rounded-none uppercase font-bold tracking-widest text-sm flex items-center justify-center gap-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
          >
            {loading ? (
              <Loader2 className="animate-spin w-5 h-5" />
            ) : (
              <ScanTextIcon className="w-5 h-5 text-[#FF3000]" />
            )}
            <span>Perbarui Ketersediaan Jadwal</span>
          </Button>

          {/* Mobile Actions Menu (Bottom Sheet) */}
          <div className="flex items-center justify-between border-b-2 border-black pb-2 pt-1">
            <span className="font-black text-xs uppercase tracking-widest text-black">
              Aksi & Navigasi
            </span>
            <Sheet open={openMobileSheet} onOpenChange={setOpenMobileSheet}>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-2 border-black rounded-none uppercase font-bold text-xs tracking-wider"
                >
                  Aksi Jadwal{" "}
                  <ChevronDown className="w-4 h-4 ml-1 text-[#FF3000]" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="bottom"
                className="border-t-2 border-black rounded-none p-4 bg-white space-y-3"
              >
                <SheetHeader className="p-0 border-b-2 border-black pb-2 text-left">
                  <SheetTitle className="font-black text-base uppercase tracking-widest">
                    Aksi Jadwal KRS
                  </SheetTitle>
                </SheetHeader>
                <div className="flex flex-col gap-2 pt-2">
                  <Button
                    variant="outline"
                    className="w-full justify-start border-2 border-black rounded-none font-bold uppercase tracking-wider text-xs h-11"
                    onClick={(e) => {
                      setOpenMobileSheet(false);
                      openGenerateAiDialog(e);
                    }}
                    disabled={isWarInProgress}
                  >
                    <Sparkles className="w-4 h-4 mr-2 text-[#FF3000]" />
                    Generate Jadwal AI
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start border-2 border-black rounded-none font-bold uppercase tracking-wider text-xs h-11"
                    onClick={(e) => {
                      setOpenMobileSheet(false);
                      openShareScheduleDialog(e);
                    }}
                  >
                    <Share2 className="w-4 h-4 mr-2" />
                    Bagikan Jadwal
                  </Button>
                  <Button
                    className="w-full justify-start bg-black text-white hover:bg-[#FF3000] border-2 border-black rounded-none font-bold uppercase tracking-wider text-xs h-11"
                    onClick={() => {
                      setOpenMobileSheet(false);
                      handleSaveKRS();
                    }}
                    disabled={isWarInProgress}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Simpan Jadwal
                  </Button>
                  <Button
                    variant="destructive"
                    className="w-full justify-start rounded-none font-bold uppercase tracking-wider text-xs h-11"
                    onClick={(e) => {
                      setOpenMobileSheet(false);
                      openRemoveScheduleDialog(e);
                    }}
                    disabled={isWarInProgress}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Bersihkan / Hapus Jadwal
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>

          {/* 3. Semester Filter Chips */}
          {groupedData.length > 0 && (
            <div className="sticky top-0 z-20 bg-[#F2F2F2] py-2 border-b-2 border-black/20 overflow-x-auto scrollbar-none flex gap-2">
              <button
                type="button"
                onClick={() => setSelectedSemFilter("ALL")}
                className={cn(
                  "px-3 py-1.5 text-xs font-black uppercase tracking-wider border-2 whitespace-nowrap transition-all",
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
                      "px-3 py-1.5 text-xs font-black uppercase tracking-wider border-2 whitespace-nowrap transition-all",
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
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center px-1">
              <h3 className="font-black text-sm uppercase tracking-wider flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#FF3000]" /> Daftar Mata
                Kuliah
              </h3>
              {data[0]?.latest_update && (
                <span className="text-[10px] text-muted-foreground font-semibold">
                  Update: {ymdToIdDate(data[0].latest_update, true)}
                </span>
              )}
            </div>

            {loading ? (
              <ScheduleLoadingProgress progress={progress} className="min-h-[220px]" />
            ) : filteredGroupedData.length === 0 ? (
              <div className="p-8 border-2 border-dashed border-black bg-white flex flex-col items-center justify-center gap-2 text-center">
                <SearchX className="w-8 h-8 text-[#FF3000]" />
                <span className="text-xs font-bold uppercase tracking-wider">
                  Tidak ada mata kuliah
                </span>
              </div>
            ) : (
              <Accordion type="multiple" className="w-full space-y-2">
                {filteredGroupedData.map((sem, semIdx) => (
                  <AccordionItem
                    key={semIdx}
                    value={`sem-${semIdx}`}
                    className="border-2 border-black bg-white"
                  >
                    <AccordionTrigger className="font-black text-xs uppercase tracking-wide hover:no-underline bg-[#F2F2F2] px-3 py-2 border-b-2 border-black">
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
                                className="border-2 border-black bg-white"
                              >
                                <AccordionTrigger className="px-3 py-2 hover:no-underline text-left">
                                  <div className="flex items-center justify-between w-full pr-2 gap-2">
                                    <div className="flex flex-col text-left overflow-hidden">
                                      <span className="font-bold text-xs text-black truncate">
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
            )}
          </div>

          {/* 5. Schedule Preview (Segmented Day Selector) */}
          <div className="flex flex-col gap-2 mt-2">
            <h3 className="font-black text-sm uppercase tracking-wider flex items-center gap-2">
              <CalendarClock className="w-4 h-4 text-[#FF3000]" /> Preview
              Jadwal Mobile
            </h3>
            <SegmentedSchedulePreview
              selectedCourses={selectedCourses}
              onRemoveCourse={handleSelectCourse}
            />
          </div>

          {/* 6. Floating AI Button (FAB) */}
          <motion.button
            type="button"
            whileTap={{ scale: 0.9 }}
            whileHover={{ scale: 1.05 }}
            onClick={(e) => openGenerateAiDialog(e)}
            disabled={isWarInProgress}
            className="fixed bottom-20 right-4 z-40 bg-[#FF3000] text-white px-3.5 py-2.5 border-2 border-black flex items-center gap-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] font-black text-xs uppercase tracking-wider"
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
                  <div data-tour="schedule-course-list" className="p-4 space-y-4">
                    <div className="flex flex-col gap-2">
                      <h3 className="font-black text-lg uppercase tracking-tight flex items-center gap-2">
                        <BookOpen className="w-5 h-5" /> Daftar Mata Kuliah
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {data[0]?.latest_update &&
                          `Data terbaru pada ${ymdToIdDate(data[0].latest_update, true)}`}
                      </p>
                      <Button
                        data-tour="schedule-refresh-button"
                        disabled={loading}
                        onClick={handleFindSchedules}
                        size={"sm"}
                        className="bg-black text-white hover:bg-[#FF3000] rounded-none uppercase font-bold tracking-widest"
                      >
                        {loading ? (
                          <Loader2 className="animate-spin" />
                        ) : (
                          <ScanTextIcon />
                        )}
                        <span>Perbarui ketersediaan jadwal</span>
                      </Button>
                    </div>

                    {!loading && data.length === 0 && isHydrated && (
                      <div className="flex flex-col h-150 gap-3 justify-center items-center">
                        <SearchX className="text-[#FF3000]" />
                        <div className="text-center">
                          Lakukan pencarian jadwal untuk menampilkan
                          ketersediaan jadwal terbaru
                        </div>
                      </div>
                    )}

                    {loading ? (
                      <ScheduleLoadingProgress progress={progress} className="min-h-[360px]" />
                    ) : (
                      <Accordion type="multiple" className="w-full">
                        {groupedData.length > 0 &&
                          groupedData.map((sem, semIdx) => (
                            <AccordionItem key={semIdx} value={`sem-${semIdx}`}>
                              <AccordionTrigger className="font-black text-md uppercase tracking-wide hover:no-underline bg-[#F2F2F2] px-4 mb-2 border-2 border-black">
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
                                          className="border-2 border-black bg-white"
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
                    )}
                  </div>
                </ScrollArea>
              </ResizablePanel>

              <ResizableHandle withHandle />

              {/* Table Of Your Custom Schedule */}
              <ResizablePanel defaultSize={60} minSize={30}>
                <div data-tour="schedule-timetable" className="flex flex-col h-full bg-white">
                  <div className="p-4 border-b-2 border-black flex justify-between items-center bg-[#F2F2F2]">
                    <div>
                      <h3 className="font-black text-lg uppercase tracking-tight">
                        Tabel Jadwal
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Preview jadwal kamu
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-xs text-muted-foreground block uppercase tracking-widest">
                          Total SKS
                        </span>
                        <span className="font-black text-lg text-[#FF3000] tabular-nums">
                          {totalSKS}
                        </span>
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            data-tour="schedule-actions"
                            size="sm"
                            variant="outline"
                            className="rounded-none border-2 border-black uppercase font-bold tracking-widest"
                          >
                            Aksi Jadwal
                            <ChevronDown className="ml-2" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={handleSaveKRS}
                            disabled={isWarInProgress}
                            className="flex items-center gap-2"
                          >
                            <Save className="w-4 h-4" />
                            Simpan Jadwal
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={openGenerateAiDialog}
                            disabled={isWarInProgress}
                            className="flex items-center gap-2"
                          >
                            <Sparkles className="w-4 h-4" />
                            Buat dengan AI
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
          onGenerated={setSelectedCourses}
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
