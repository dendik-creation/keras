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
import { getLocalStorage } from "@/helper/local_storage";
import ConfirmDialog from "@/components/custom/ConfirmDialog";
import ShareScheduleDialog from "@/components/custom/ShareScheduleDialog";
import GenerateScheduleDialog from "@/components/custom/schedule-ai/GenerateScheduleDialog";
import LoadingBooks from "@/components/ui/loading-books";
import RollingNumber from "@/components/ui/rolling-number";
import AuthAccess from "@/components/middleware_wrapper/AuthAccess";
import { gooeyToast } from "@/components/ui/goey-toaster";
import { useIsMobile } from "@/hooks/use-mobile";
import { useLocalStorageContext } from "@/providers/LocalStorageProvider";
import { useResumeAdoptToast } from "@/hooks/useResumeAdoptToast";

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

      setOfferingCourse(finalData);
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

  // Draft selection seeded from the persisted saved schedule once hydrated —
  // stays a local draft until the user explicitly clicks "Simpan Jadwal".
  useEffect(() => {
    if (!isHydrated) return;
    if (Array.isArray(savedSchedule) && savedSchedule.length > 0) {
      setSelectedCourses(savedSchedule);
    }
  }, [isHydrated, savedSchedule]);

  useEffect(() => {
    // Sent here from /adopt-schedule or /share-schedule because
    // offering_course wasn't cached yet — get-schedule only runs on this page.
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

  const openRemoveScheduleDialog = (event: Event) => {
    event.preventDefault();
    event.stopPropagation();
    if (isWarInProgress) {
      warLockToast();
      return;
    }
    setOpenRemoveSchedule(true);
  };

  const openShareScheduleDialog = (event: Event) => {
    event.preventDefault();
    event.stopPropagation();
    if (selectedCourses.length === 0) {
      gooeyToast.warning("Belum Ada Jadwal", {
        description: "Pilih minimal satu mata kuliah untuk dibagikan",
      });
      return;
    }
    setOpenShareSchedule(true);
  };

  const openGenerateAiDialog = (event: Event) => {
    event.preventDefault();
    event.stopPropagation();
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

  return (
    <AuthAccess>
      <AppLayout
        pageTitleHeader="Jadwal KRS-mu"
        pageDescriptionHeader="Siapkan jadwal kuliah kamu dengan mudah"
      >
        <div className="flex flex-col h-[calc(100dvh-160px)] md:h-[calc(100vh-100px)]">
          <div className="grow mt-4 border-2 border-black overflow-hidden bg-white">
            <ResizablePanelGroup
              direction={isMobile ? "vertical" : "horizontal"}
            >
              {/* Schedule Offer */}
              <ResizablePanel defaultSize={40} minSize={30}>
                <ScrollArea className="h-full bg-[#F2F2F2]">
                  <div className="p-4 space-y-4">
                    <div className="flex flex-col gap-2">
                      <h3 className="font-black text-lg uppercase tracking-tight flex items-center gap-2">
                        <BookOpen className="w-5 h-5" /> Daftar Mata Kuliah
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {data[0]?.latest_update &&
                          `Data terbaru pada ${ymdToIdDate(data[0].latest_update, true)}`}
                      </p>
                      <Button
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
                      <div className="flex flex-col h-150 gap-3 justify-center items-center">
                        <LoadingBooks className="h-56 w-56" />
                        <span className="text-center text-sm font-semibold text-[#555555]">
                          {progress ? (
                            <span className="inline-flex items-center gap-1">
                              Sedang melahap
                              <RollingNumber
                                value={progress.done}
                                className="font-black tabular-nums mb-2 mx-1 text-lg text-black"
                              />
                              / <RollingNumber
                                value={progress.total}
                                className="font-black tabular-nums mb-2 mx-1 text-lg text-black"
                              /> jadwal mata kuliah
                            </span>
                          ) : (
                            "Sedang mencari ketersediaan jadwal, tapi agak lama hehe..."
                          )}
                        </span>
                      </div>
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
                <div className="flex flex-col h-full bg-white">
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
                    </div>
                  </div>

                  <div className="grow p-4 overflow-auto">
                    {/* Calendar Grid — 5 columns on desktop, stacked days on mobile */}
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-2 md:min-w-150">
                      {["Senin", "Selasa", "Rabu", "Kamis", "Jumat"].map(
                        (day) => (
                          <div key={day} className="flex flex-col gap-2">
                            <div className="text-center font-black py-2 border-b-2 border-black text-black uppercase tracking-widest">
                              {day}
                            </div>
                            <div className="space-y-2 h-full min-h-[80px] md:min-h-100 bg-white rounded-md p-2">
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
                                    className="relative pt-0 border-2 border-black overflow-hidden"
                                  >
                                    <CardContent className="p-2">
                                      <div className="absolute z-20 bottom-0 left-0 w-full h-2 hover:h-8 transition-all bg-black hover:bg-[#FF3000]">
                                        <button
                                          className="text-white flex items-center justify-center gap-2 text-sm text-center w-full absolute bottom-0 cursor-pointer left-0"
                                          style={{ minHeight: "2rem" }}
                                          onClick={() =>
                                            handleSelectCourse(course)
                                          }
                                        >
                                          <span>Hapus</span>
                                        </button>
                                      </div>
                                      {course.semester && (
                                        <div className="text-[9px] uppercase tracking-wide font-bold text-black/50 mb-0.5">
                                          {course.semester}
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
                                      <div className="text-[10px] flex items-center gap-1 text-[#555555]">
                                        <Clock className="w-3 h-3" />{" "}
                                        {course.hour}
                                      </div>
                                      <div className="text-[10px] flex items-center gap-1 text-[#555555] mt-0.5">
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
                                <div className="h-full text-sm gap-3 flex-col bg-[#F2F2F2] flex items-center justify-center text-muted-foreground uppercase tracking-widest text-xs font-bold">
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
