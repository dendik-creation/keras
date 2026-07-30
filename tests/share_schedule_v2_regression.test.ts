import { describe, test, expect } from "bun:test";
import {
  generateShareCourseId,
  studyProgramsMatch,
} from "@/helper/share_schedule_validation";
import {
  buildAdoptPath,
  matchSharedCourses,
  parseShareParams,
} from "@/helper/share_schedule";
import { CourseSchedule, OfferingCourse } from "@/types/course_schedule";

function createCourse(
  code: string,
  cls: string,
  name: string,
  sks = "3",
  category = "Wajib",
): CourseSchedule {
  const shareCourseId = generateShareCourseId({
    studyProgramCode: "51",
    courseName: name,
    sks,
    category,
  });
  return {
    code,
    class: cls,
    course: name,
    category,
    sks,
    lecture: "Dr. Dosen",
    schedule_id: `${code}_${cls}`,
    day: "Senin",
    hour: "08:00",
    classroom: "Lab 1",
    share_course_id: shareCourseId,
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

describe("Share & Adopt Schedule Regression Tests (v2 Stable Identity)", () => {
  const initialOffering = createOffering([
    createCourse("IFE404", "A", "Pengembangan Diri dan Bimbingan Karir"),
    createCourse("IE51", "E", "Algoritma Pemrograman"),
    createCourse("IE52", "A", "Struktur Data"),
  ]);

  test("Case 1: Course code changed from IFE404 to IEF404", () => {
    const oldSharedCourse = createCourse("IFE404", "A", "Pengembangan Diri dan Bimbingan Karir");
    const adoptPath = buildAdoptPath([oldSharedCourse], { nim: "202451001" });
    const parsed = parseShareParams(adoptPath.split("?")[1]);

    const newOffering = createOffering([
      createCourse("IEF404", "A", "Pengembangan Diri dan Bimbingan Karir"),
      createCourse("IE51", "E", "Algoritma Pemrograman"),
    ]);

    const result = matchSharedCourses(parsed.ids, newOffering, "202451002", parsed.version);
    expect(result.matched.length).toBe(1);
    expect(result.matched[0].code).toBe("IEF404");
  });

  test("Case 2: Course name same, code changed", () => {
    const oldShareId = generateShareCourseId({ studyProgramCode: "51", courseName: "Struktur Data", sks: "3", category: "Wajib" });
    const rawIds = [`${oldShareId}::A`];

    const updatedOffering = createOffering([
      createCourse("DS999", "A", "Struktur Data"),
    ]);

    const result = matchSharedCourses(rawIds, updatedOffering, "202451001", 2);
    expect(result.matched.length).toBe(1);
    expect(result.matched[0].code).toBe("DS999");
  });

  test("Case 3: Old v1 link (course_code::class)", () => {
    const v1Search = "ids=IFE404::A,IE51::E&nim=202451***&nama=BUD***UDI";
    const parsed = parseShareParams(v1Search);

    const result = matchSharedCourses(parsed.ids, initialOffering, "202451001", parsed.version);
    expect(result.matched.length).toBe(2);
    expect(result.strategiesUsed["IFE404::A"]).toBe("course_code");
  });

  test("Case 4: New v2 link (share_course_id::class&v=2)", () => {
    const v2Search = `ids=${initialOffering[0].courses[0].share_course_id}::A&v=2&nim=202451***`;
    const parsed = parseShareParams(v2Search);

    const result = matchSharedCourses(parsed.ids, initialOffering, "202451001", parsed.version);
    expect(result.matched.length).toBe(1);
    const expectedKey = `${initialOffering[0].courses[0].share_course_id?.toUpperCase()}::A`;
    expect(result.strategiesUsed[expectedKey]).toBe("share_course_id");
  });

  test("Case 5: Shortcode resolution", () => {
    const resolvedSearch = `ids=${initialOffering[0].courses[0].share_course_id}::A,IE51::E&v=2`;
    const parsed = parseShareParams(resolvedSearch);
    const result = matchSharedCourses(parsed.ids, initialOffering, "202451001", parsed.version);

    expect(result.matched.length).toBe(2);
  });

  test("Case 6: Raw URL", () => {
    const adoptPath = buildAdoptPath(initialOffering[0].courses, { nim: "202451001" });
    const parsed = parseShareParams(adoptPath.split("?")[1]);
    const result = matchSharedCourses(parsed.ids, initialOffering, "202451001", parsed.version);

    expect(result.matched.length).toBe(3);
  });

  test("Case 7: Different prodi", () => {
    const senderNim = "202451001";
    const receiverNim = "202452001";
    const isSameProdi = studyProgramsMatch(senderNim, receiverNim);

    expect(isSameProdi).toBe(false);
  });

  test("Case 8: One class missing", () => {
    const rawIds = [`${initialOffering[0].courses[0].share_course_id}::Z`, `IE51::E`];
    const result = matchSharedCourses(rawIds, initialOffering, "202451001", 2);

    expect(result.matched.length).toBe(1);
    expect(result.missingIds.length).toBe(1);
  });

  test("Case 9: Fingerprint fallback match", () => {
    const fingerprintId = generateShareCourseId({ studyProgramCode: "51", courseName: "Kecerdasan Buatan", sks: "3", category: "Wajib" });
    const rawIds = [`${fingerprintId}::A`];

    const unEnrichedOffering = createOffering([
      {
        code: "AI888",
        class: "A",
        course: "Kecerdasan Buatan",
        category: "Wajib",
        sks: "3",
        lecture: "Dr. Dosen",
        schedule_id: "AI888_A",
        day: "Senin",
        hour: "08:00",
        classroom: "Lab 1",
      },
    ]);

    const result = matchSharedCourses(rawIds, unEnrichedOffering, "202451001", 2);
    expect(result.matched.length).toBe(1);
    expect(result.matched[0].code).toBe("AI888");
  });
});
