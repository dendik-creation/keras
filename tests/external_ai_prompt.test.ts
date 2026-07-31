import { describe, it, expect } from "bun:test";
import {
  buildExternalAiPrompt,
  parseCourseIdentifiers,
  parseAndReconstructSchedule,
} from "@/modules/schedule-ai/external-prompt";
import type { CourseSchedule, OfferingCourse } from "@/types/course_schedule";

function makeTestCourse(
  code: string,
  cls: string,
  course: string,
  scheduleId: string,
  overrides?: Partial<CourseSchedule>,
): CourseSchedule {
  return {
    code,
    class: cls,
    course,
    category: "Wajib",
    sks: "3",
    lecture: "Dosen A",
    schedule_id: scheduleId,
    day: "Senin",
    hour: "08:00 - 10:30",
    classroom: "A301",
    semester: "Semester 5",
    ...overrides,
  };
}

const mockOffering: OfferingCourse[] = [
  {
    latest_update: new Date().toISOString(),
    semester: "Semester 5",
    courses: [
      makeTestCourse("IFE101", "A", "Matematika", "101A", { day: "Senin", hour: "08:00 - 10:30" }),
      makeTestCourse("IFE101", "B", "Matematika", "101B", { day: "Selasa", hour: "08:00 - 10:30" }),
      makeTestCourse("IFE103", "A", "Fisika", "103A", { day: "Rabu", hour: "10:30 - 13:00" }),
      makeTestCourse("IFE107", "B", "Algoritma", "107B", { day: "Kamis", hour: "13:00 - 15:30" }),
      makeTestCourse("IFE109", "A", "Basis Data", "109A", { day: "Senin", hour: "09:00 - 11:30" }),
    ],
  },
];

describe("External AI Prompt Builder", () => {
  it("generates a Bahasa Indonesia conversational prompt", () => {
    const prompt = buildExternalAiPrompt(mockOffering);
    expect(prompt).toContain("TUJUAN");
    expect(prompt).toContain("DATA MATA KULIAH");
    expect(prompt).toContain("CARA MENJAWAB");
    expect(prompt).toContain("PREFERENSI MAHASISWA");
    expect(prompt).toContain("IFE101-A|3|Sen|08:00-10:30|Dosen A");
    expect(prompt).toContain("Belum ditentukan");
  });

  it("injects known preferences dynamically", () => {
    const prompt = buildExternalAiPrompt(mockOffering, {
      preferred_semester: "Semester 5",
      target_sks: { mode: "custom", value: 24 },
      earliest_start: "08:00",
      latest_end: "15:00",
      goal: "balanced",
    });
    expect(prompt).toContain("1. Semester: Semester 5");
    expect(prompt).toContain("2. Target SKS: 24 SKS");
    expect(prompt).toContain("3. Jam kuliah paling awal: 08:00");
  });
});

describe("Course Identifier Parser", () => {
  it("parses comma-separated values correctly", () => {
    const ids = parseCourseIdentifiers("IFE101-A, IFE103-A, IFE107-B");
    expect(ids).toEqual(["IFE101-A", "IFE103-A", "IFE107-B"]);
  });

  it("handles newlines and mixed separators", () => {
    const ids = parseCourseIdentifiers("IFE101-A\nIFE103-A; IFE107-B");
    expect(ids).toEqual(["IFE101-A", "IFE103-A", "IFE107-B"]);
  });

  it("handles markdown fences and bullet lists", () => {
    const input = "```\n- IFE101-A\n- IFE103-A\n- IFE107-B\n```";
    const ids = parseCourseIdentifiers(input);
    expect(ids).toEqual(["IFE101-A", "IFE103-A", "IFE107-B"]);
  });
});

describe("Schedule Reconstruction", () => {
  it("reconstructs valid courses from catalog", () => {
    const res = parseAndReconstructSchedule("IFE101-A, IFE103-A, IFE107-B", mockOffering);
    expect(res.success).toBe(true);
    expect(res.courses.length).toBe(3);
    expect(res.courses.map((c) => `${c.code}-${c.class}`)).toEqual([
      "IFE101-A",
      "IFE103-A",
      "IFE107-B",
    ]);
  });

  it("rejects unknown course codes", () => {
    const res = parseAndReconstructSchedule("UNKNOWN-99", mockOffering);
    expect(res.success).toBe(false);
    expect(res.errors.length).toBeGreaterThan(0);
    expect(res.errors[0]).toContain("tidak ditemukan");
  });

  it("rejects duplicate course code selection", () => {
    const res = parseAndReconstructSchedule("IFE101-A, IFE101-B", mockOffering);
    expect(res.success).toBe(false);
    expect(res.errors.length).toBeGreaterThan(0);
    expect(res.errors[0].toLowerCase()).toContain("duplikat");
  });

  it("rejects schedules with time conflicts", () => {
    const res = parseAndReconstructSchedule("IFE101-A, IFE109-A", mockOffering);
    expect(res.success).toBe(false);
    expect(res.errors.length).toBeGreaterThan(0);
    expect(res.errors[0]).toContain("bentrok");
  });
});
