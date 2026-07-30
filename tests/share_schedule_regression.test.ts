import { describe, test, expect } from "bun:test";
import {
  studyProgramsMatch,
} from "@/helper/share_schedule_validation";
import {
  buildAdoptPath,
  matchOfferingByCodeClass,
  matchSharedCourses,
  parseShareParams,
} from "@/helper/share_schedule";
import { CourseSchedule, OfferingCourse } from "@/types/course_schedule";

function createCourse(code: string, cls: string, name: string): CourseSchedule {
  return {
    code,
    class: cls,
    course: name,
    category: "Wajib",
    sks: "3",
    lecture: "Dr. Dosen",
    schedule_id: `${code}_${cls}`,
    day: "Senin",
    hour: "08:00",
    classroom: "Lab 1",
  };
}

function createOffering(courses: CourseSchedule[]): OfferingCourse[] {
  return [
    {
      latest_update: "2026-07-28",
      semester: "Ganjil 2026",
      courses,
    },
  ];
}

describe("Share & Adopt Schedule Regression Tests (v1)", () => {
  const sampleOffering = createOffering([
    createCourse("GS51", "A", "Matematika Diskrit"),
    createCourse("IE51", "E", "Algoritma Pemrograman"),
    createCourse("IE52", "A", "Struktur Data"),
    createCourse("IF100", "B", "Basis Data"),
  ]);

  test("Case 1: Same prodi, all courses available", () => {
    const senderNim = "202451001";
    const receiverNim = "202451002";
    const rawIds = ["GS51::A", "IE51::E", "IE52::A"];

    const isSameProdi = studyProgramsMatch(senderNim, receiverNim);
    const result = matchOfferingByCodeClass(rawIds, sampleOffering);

    expect(isSameProdi).toBe(true);
    expect(result.matched.length).toBe(3);
    expect(result.missingIds.length).toBe(0);
  });

  test("Case 2: One class missing", () => {
    const rawIds = ["GS51::A", "IE51::Z", "IE52::A"];
    const result = matchOfferingByCodeClass(rawIds, sampleOffering);

    expect(result.matched.length).toBe(2);
    expect(result.missingIds.length).toBe(1);
    expect(result.codeExistOnly).toContain("IE51");
  });

  test("Case 3: Different prodi", () => {
    const senderNim = "202451001";
    const receiverNim = "202452001";
    const isSameProdi = studyProgramsMatch(senderNim, receiverNim);

    expect(isSameProdi).toBe(false);
  });

  test("Case 4: Raw URL adoption", () => {
    const coursesToShare = [
      createCourse("GS51", "A", "Matematika Diskrit"),
      createCourse("IE52", "A", "Struktur Data"),
    ];
    const adoptPath = buildAdoptPath(coursesToShare, { nim: "202451001", name: "Budi" });
    const parsed = parseShareParams(adoptPath.split("?")[1]);

    const result = matchSharedCourses(parsed.ids, sampleOffering, "202451001", parsed.version);
    expect(result.matched.length).toBe(2);
  });

  test("Case 5: Short URL resolved IDs", () => {
    const resolvedSearch = "ids=GS51::A,IE51::E&nim=202451***&nama=BUD***UDI";
    const parsed = parseShareParams(resolvedSearch);
    const result = matchOfferingByCodeClass(parsed.ids, sampleOffering);

    expect(result.matched.length).toBe(2);
  });

  test("Case 6: Lowercase class & code", () => {
    const rawIds = ["gs51::a", "ie51::e"];
    const result = matchOfferingByCodeClass(rawIds, sampleOffering);

    expect(result.matched.length).toBe(2);
  });

  test("Case 7: Whitespace padding", () => {
    const rawIds = [" GS51 :: A ", "IE51::E "];
    const result = matchOfferingByCodeClass(rawIds, sampleOffering);

    expect(result.matched.length).toBe(2);
  });

  test("Case 8: URL encoded colons", () => {
    const rawIds = ["GS51%3A%3AA", "IE51%3AE"];
    const result = matchOfferingByCodeClass(rawIds, sampleOffering);

    expect(result.matched.length).toBe(2);
  });
});
