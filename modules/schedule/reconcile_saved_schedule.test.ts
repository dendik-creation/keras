import { describe, it, expect } from "bun:test";
import { reconcileSavedSchedule } from "./reconcile_saved_schedule";
import { CourseSchedule, OfferingCourse } from "@/types/course_schedule";
import { generateShareCourseId } from "@/helper/share_schedule_validation";

function makeCourse(
  code: string,
  cls: string,
  course: string,
  scheduleId: string,
  overrides?: Partial<CourseSchedule>,
): CourseSchedule {
  const shareId = generateShareCourseId({
    courseName: course,
    sks: overrides?.sks || "3",
    category: overrides?.category || "Wajib",
  });

  return {
    code,
    class: cls,
    course,
    category: "Wajib",
    sks: "3",
    lecture: "Dosen A",
    schedule_id: scheduleId,
    day: "Senin",
    hour: "08.00-10.30",
    classroom: "A301",
    semester: "Semester 5",
    share_course_id: shareId,
    ...overrides,
  };
}

function makeOffering(courses: CourseSchedule[]): OfferingCourse[] {
  return [
    {
      latest_update: new Date().toISOString(),
      semester: "Semester 5",
      courses,
    },
  ];
}

describe("reconcileSavedSchedule", () => {
  it("Scenario 1: Layer 1 Match (share_course_id + class) when schedule_id and hour changed", () => {
    const savedItem = makeCourse("IF101", "A", "Algoritma Pemrograman", "1001", {
      saved_in_submit: true,
      schedule_submit_id: "1001",
    });
    const updatedItem = makeCourse("IF101_RENAMED", "A", "Algoritma Pemrograman", "2002", {
      hour: "13.00-15.30",
      share_course_id: savedItem.share_course_id,
    });

    const res = reconcileSavedSchedule([savedItem], makeOffering([updatedItem]));

    expect(res.success).toBe(true);
    expect(res.summary.matched).toBe(1);
    expect(res.summary.updated).toBe(1);
    expect(res.reconciledSchedule[0].schedule_id).toBe("2002");
    expect(res.reconciledSchedule[0].saved_in_submit).toBe(true);
    expect(res.reconciledSchedule[0].share_course_id).toBe(savedItem.share_course_id);
  });

  it("Scenario 2: Layer 2 Match (course_code + class) for legacy item", () => {
    const savedItem = makeCourse("IF102", "B", "Struktur Data", "1002", {
      share_course_id: "",
    });
    const updatedItem = makeCourse("IF102", "B", "Struktur Data", "3003", {
      lecture: "Dosen B Baru",
    });

    const res = reconcileSavedSchedule([savedItem], makeOffering([updatedItem]));

    expect(res.success).toBe(true);
    expect(res.summary.matched).toBe(1);
    expect(res.reconciledSchedule[0].lecture).toBe("Dosen B Baru");
  });

  it("Scenario 3: Layer 3 Fingerprint Match", () => {
    const savedItem = makeCourse("OLD_CODE", "C", "Jaringan Komputer Dasar", "1003", {
      sks: "4",
      semester: "Semester 5",
      share_course_id: "",
    });
    const updatedItem = makeCourse("NEW_CODE", "C", "Jaringan Komputer Dasar", "4004", {
      sks: "4",
      semester: "Semester 5",
    });

    const res = reconcileSavedSchedule([savedItem], makeOffering([updatedItem]));

    expect(res.success).toBe(true);
    expect(res.summary.matched).toBe(1);
    expect(res.reconciledSchedule[0].code).toBe("NEW_CODE");
  });

  it("Scenario 4: Layer 4 Fuzzy Match (Single Candidate >= 0.92)", () => {
    const savedItem = makeCourse("OLD_CODE_4", "A", "Pengembangan Web Lanjut", "1004", {
      share_course_id: "diff_id",
    });
    const updatedItem = makeCourse("NEW_CODE_4", "A", "Pengembangan Web Lanjut.", "5005");

    const res = reconcileSavedSchedule([savedItem], makeOffering([updatedItem]));

    expect(res.success).toBe(true);
    expect(res.summary.matched).toBe(1);
  });

  it("Scenario 5: Ambiguous Fuzzy Match (> 1 candidate) -> needs_manual_review", () => {
    const savedItem = makeCourse("NON_EXISTENT", "A", "Kecerdasan Terapan X", "1005", {
      share_course_id: "non_match",
    });
    const cand1 = makeCourse("CODE_1", "A", "Kecerdasan Terapan 1", "6001");
    const cand2 = makeCourse("CODE_2", "A", "Kecerdasan Terapan 2", "6002");

    const res = reconcileSavedSchedule([savedItem], makeOffering([cand1, cand2]));

    expect(res.success).toBe(true);
    expect(res.summary.manual_review).toBe(1);
    expect(res.reconciledSchedule[0].needs_manual_review).toBe(true);
    expect(res.reconciledSchedule[0].saved_in_submit).toBe(false);
  });

  it("Scenario 6: Removed Course -> is_removed = true", () => {
    const savedItem = makeCourse("DELETED101", "A", "Mata Kuliah Dihapus", "9999");
    const res = reconcileSavedSchedule([savedItem], makeOffering([]));

    expect(res.success).toBe(true);
    expect(res.summary.removed).toBe(1);
    expect(res.reconciledSchedule[0].is_removed).toBe(true);
  });

  it("Scenario 7: Class Obsolete -> is_obsolete = true", () => {
    const savedItem = makeCourse("IF500", "Z", "Sistem Terdistribusi", "7001");
    const updatedItem = makeCourse("IF500", "A", "Sistem Terdistribusi", "7002");

    const res = reconcileSavedSchedule([savedItem], makeOffering([updatedItem]));

    expect(res.success).toBe(true);
    expect(res.summary.obsolete).toBe(1);
    expect(res.reconciledSchedule[0].is_obsolete).toBe(true);
  });
});
