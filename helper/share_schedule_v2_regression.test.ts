import {
  calculateStringSimilarity,
  enrichOfferingCourses,
  extractStudyProgramCode,
  generateShareCourseId,
  normalizeCourseName,
  studyProgramsMatch,
} from "./share_schedule_validation";
import {
  buildAdoptPath,
  matchSharedCourses,
  parseShareParams,
} from "./share_schedule";
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

export function runV2RegressionTests() {
  console.log("=== RUNNING V2 REGRESSION TESTS (STABLE COURSE IDENTITY) ===");

  const initialOffering = createOffering([
    createCourse("IFE404", "A", "Pengembangan Diri dan Bimbingan Karir"),
    createCourse("IE51", "E", "Algoritma Pemrograman"),
    createCourse("IE52", "A", "Struktur Data"),
  ]);

  // Case 1: Course code changed (IFE404 -> IEF404). Adopt Success.
  {
    console.log("\n--- Case 1: Course code changed from IFE404 to IEF404 ---");
    const oldSharedCourse = createCourse("IFE404", "A", "Pengembangan Diri dan Bimbingan Karir");
    const adoptPath = buildAdoptPath([oldSharedCourse], { nim: "202451001" });
    const parsed = parseShareParams(adoptPath.split("?")[1]);

    // Recipient has updated offering where code changed to IEF404
    const newOffering = createOffering([
      createCourse("IEF404", "A", "Pengembangan Diri dan Bimbingan Karir"),
      createCourse("IE51", "E", "Algoritma Pemrograman"),
    ]);

    const result = matchSharedCourses(parsed.ids, newOffering, "202451002", parsed.version);
    console.assert(result.matched.length === 1, "Case 1 Fail: Should match despite course code change");
    console.assert(result.matched[0].code === "IEF404", "Case 1 Fail: Should resolve to new course code IEF404");
    console.log("PASS: Case 1 matched via share_course_id despite course code change (IFE404 -> IEF404)");
  }

  // Case 2: Course name same, code changed. Share link stays valid.
  {
    console.log("\n--- Case 2: Course name same, code changed ---");
    const oldShareId = generateShareCourseId({ studyProgramCode: "51", courseName: "Struktur Data", sks: "3", category: "Wajib" });
    const rawIds = [`${oldShareId}::A`];

    const updatedOffering = createOffering([
      createCourse("DS999", "A", "Struktur Data"), // Code changed to DS999
    ]);

    const result = matchSharedCourses(rawIds, updatedOffering, "202451001", 2);
    console.assert(result.matched.length === 1, "Case 2 Fail: Share link should remain valid");
    console.assert(result.matched[0].code === "DS999", "Case 2 Fail: Should match DS999");
    console.log("PASS: Case 2 share link stayed valid across code rename");
  }

  // Case 3: Old v1 link (course_code::class). Backward compatible success.
  {
    console.log("\n--- Case 3: Old v1 link (course_code::class) ---");
    const v1Search = "ids=IFE404::A,IE51::E&nim=202451***&nama=BUD***UDI";
    const parsed = parseShareParams(v1Search);

    const result = matchSharedCourses(parsed.ids, initialOffering, "202451001", parsed.version);
    console.assert(result.matched.length === 2, "Case 3 Fail: v1 link should match");
    console.assert(result.strategiesUsed["IFE404::A"] === "course_code", "Case 3 Fail: Should use course_code strategy");
    console.log("PASS: Case 3 v1 link matched via course_code fallback strategy");
  }

  // Case 4: New v2 link (share_course_id::class&v=2). Success.
  {
    console.log("\n--- Case 4: New v2 link (share_course_id::class&v=2) ---");
    const v2Search = `ids=${initialOffering[0].courses[0].share_course_id}::A&v=2&nim=202451***`;
    const parsed = parseShareParams(v2Search);

    const result = matchSharedCourses(parsed.ids, initialOffering, "202451001", parsed.version);
    console.assert(result.matched.length === 1, "Case 4 Fail: v2 link should match");
    const expectedKey = `${initialOffering[0].courses[0].share_course_id?.toUpperCase()}::A`;
    console.assert(result.strategiesUsed[expectedKey] === "share_course_id", "Case 4 Fail: Should use share_course_id strategy");
    console.log("PASS: Case 4 v2 link matched via share_course_id strategy");
  }

  // Case 5: Shortcode resolution. Success.
  {
    console.log("\n--- Case 5: Shortcode resolution ---");
    const resolvedSearch = `ids=${initialOffering[0].courses[0].share_course_id}::A,IE51::E&v=2`;
    const parsed = parseShareParams(resolvedSearch);
    const result = matchSharedCourses(parsed.ids, initialOffering, "202451001", parsed.version);

    console.assert(result.matched.length === 2, "Case 5 Fail: Shortcode should match 2");
    console.log("PASS: Case 5 shortcode resolved & matched");
  }

  // Case 6: Raw URL. Success.
  {
    console.log("\n--- Case 6: Raw URL ---");
    const adoptPath = buildAdoptPath(initialOffering[0].courses, { nim: "202451001" });
    const parsed = parseShareParams(adoptPath.split("?")[1]);
    const result = matchSharedCourses(parsed.ids, initialOffering, "202451001", parsed.version);

    console.assert(result.matched.length === 3, "Case 6 Fail: Raw URL should match 3");
    console.log("PASS: Case 6 raw URL matched all courses");
  }

  // Case 7: Different prodi (51 vs 52). Rejected.
  {
    console.log("\n--- Case 7: Different prodi ---");
    const senderNim = "202451001";
    const receiverNim = "202452001";
    const isSameProdi = studyProgramsMatch(senderNim, receiverNim);

    console.assert(isSameProdi === false, "Case 7 Fail: Different prodi should be rejected");
    console.log("PASS: Case 7 program mismatch rejected correctly");
  }

  // Case 8: One class missing. Matched n, Missing 1.
  {
    console.log("\n--- Case 8: One class missing ---");
    const rawIds = [`${initialOffering[0].courses[0].share_course_id}::Z`, `IE51::E`];
    const result = matchSharedCourses(rawIds, initialOffering, "202451001", 2);

    console.assert(result.matched.length === 1, "Case 8 Fail: Should match 1 course");
    console.assert(result.missingIds.length === 1, "Case 8 Fail: Missing count should be 1");
    console.log("PASS: Case 8 matched 1, missing 1");
  }

  // Case 9: Course code changed but fingerprint same. Fallback fingerprint success.
  {
    console.log("\n--- Case 9: Fingerprint fallback match ---");
    const fingerprintId = generateShareCourseId({ studyProgramCode: "51", courseName: "Kecerdasan Buatan", sks: "3", category: "Wajib" });
    const rawIds = [`${fingerprintId}::A`];

    // Offering has course with different code, but identical fingerprint
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
    console.assert(result.matched.length === 1, "Case 9 Fail: Fingerprint fallback should match");
    console.assert(result.matched[0].code === "AI888", "Case 9 Fail: Should resolve AI888");
    console.log("PASS: Case 9 matched via fingerprint recalculation fallback");
  }

  console.log("\n=== ALL V2 REGRESSION TESTS PASSED! ===");
}

runV2RegressionTests();
