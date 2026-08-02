import { describe, it, expect } from "bun:test";
import {
  buildExternalAiPrompt,
  parseCourseIdentifiers,
  parseAndReconstructSchedule,
  parseMultipleRecommendations,
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
  it("generates a Bahasa Indonesia prompt with strict section ordering", () => {
    const prompt = buildExternalAiPrompt(mockOffering);
    expect(prompt).toContain("### TUJUAN");
    expect(prompt).toContain("### ATURAN WAJIB");
    expect(prompt).toContain("### COURSE LIST");
    expect(prompt).toContain("### AVAILABLE CLASSES");
    expect(prompt).toContain("### FORMAT JAWABAN");
    expect(prompt).toContain("### PREFERENSI MAHASISWA");

    // Check order: TUJUAN -> ATURAN WAJIB -> COURSE LIST -> AVAILABLE CLASSES -> FORMAT JAWABAN -> PREFERENSI MAHASISWA
    const idxTujuan = prompt.indexOf("### TUJUAN");
    const idxAturan = prompt.indexOf("### ATURAN WAJIB");
    const idxCourseList = prompt.indexOf("### COURSE LIST");
    const idxAvailable = prompt.indexOf("### AVAILABLE CLASSES");
    const idxFormat = prompt.indexOf("### FORMAT JAWABAN");
    const idxPref = prompt.indexOf("### PREFERENSI MAHASISWA");

    expect(idxTujuan).toBeLessThan(idxAturan);
    expect(idxAturan).toBeLessThan(idxCourseList);
    expect(idxCourseList).toBeLessThan(idxAvailable);
    expect(idxAvailable).toBeLessThan(idxFormat);
    expect(idxFormat).toBeLessThan(idxPref);

    expect(prompt).toContain("IFE101 = Matematika");
    expect(prompt).toContain("IFE101-A|3|Sen|08:00-10:30|Dosen A|Semester 5");
    expect(prompt).toContain("Belum ditentukan");
  });

  it("injects mandatory constraint rules and bash format instructions", () => {
    const prompt = buildExternalAiPrompt(mockOffering, {
      preferred_semester: "Semester 5",
      target_sks: { mode: "custom", value: 24 },
      earliest_start: "08:00",
      latest_end: "15:00",
      goal: "balanced",
    });
    expect(prompt).toContain("DILARANG membuat jadwal bentrok");
    expect(prompt).toContain("DILARANG memilih lebih dari satu kelas");
    expect(prompt).toContain("DILARANG mengarang, menambah, atau mengubah kode/kelas");
    expect(prompt).toContain("```bash");
    expect(prompt).toContain("1. Semester: Semester 5");
    expect(prompt).toContain("2. Target SKS: 24 SKS");
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

describe("Schedule Reconstruction & Multi-Recommendation Parser", () => {
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

  it("parses multi-recommendation bash output correctly", () => {
    const input = `
## Rekomendasi 1
Alasan: Kombinasi paling seimbang dengan jeda kuliah minimal.
\`\`\`bash
IFE101-A,IFE103-A
\`\`\`

## Rekomendasi 2
Alasan: Hari kuliah lebih sedikit.
\`\`\`bash
IFE101-B,IFE107-B
\`\`\`
    `;

    const recs = parseMultipleRecommendations(input, mockOffering);
    expect(recs.length).toBe(2);
    expect(recs[0].title).toBe("Rekomendasi 1");
    expect(recs[0].reason).toContain("seimbang");
    expect(recs[0].reconstruction.success).toBe(true);
    expect(recs[0].reconstruction.courses.length).toBe(2);

    expect(recs[1].title).toBe("Rekomendasi 2");
    expect(recs[1].reason).toContain("lebih sedikit");
    expect(recs[1].reconstruction.success).toBe(true);
  });

  it("maintains backward compatibility with raw comma-separated lists", () => {
    const recs = parseMultipleRecommendations("IFE101-A, IFE103-A", mockOffering);
    expect(recs.length).toBe(1);
    expect(recs[0].reconstruction.success).toBe(true);
    expect(recs[0].rawIdentifiers).toEqual(["IFE101-A", "IFE103-A"]);
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
