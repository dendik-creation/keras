import {
  extractCourseCodes,
  extractStudyProgramCode,
  makeCourseKey,
  normalizeClass,
  normalizeCode,
  parseIdPair,
  studyProgramsMatch,
} from "./share_schedule_validation";
import {
  buildAdoptPath,
  matchOfferingByCodeClass,
  parseShareParams,
} from "./share_schedule";
import { CourseSchedule, OfferingCourse } from "@/types/course_schedule";

// Helper to create mock course schedule item
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

// Helper to create mock offering course structure
function createOffering(courses: CourseSchedule[]): OfferingCourse[] {
  return [
    {
      latest_update: "2026-07-28",
      semester: "Ganjil 2026",
      courses,
    },
  ];
}

export function runRegressionTests() {
  console.log("=== RUNNING REGRESSION TESTS FOR SHARE & ADOPT SCHEDULE ===");

  const sampleOffering = createOffering([
    createCourse("GS51", "A", "Matematika Diskrit"),
    createCourse("IE51", "E", "Algoritma Pemrograman"),
    createCourse("IE52", "A", "Struktur Data"),
    createCourse("IF100", "B", "Basis Data"),
  ]);

  // Case 1: Sender and receiver same prodi. All classes available.
  {
    console.log("\n--- Case 1: Same prodi, all courses available ---");
    const senderNim = "202451001";
    const receiverNim = "202451002";
    const rawIds = ["GS51::A", "IE51::E", "IE52::A"];

    const isSameProdi = studyProgramsMatch(senderNim, receiverNim);
    const result = matchOfferingByCodeClass(rawIds, sampleOffering);

    console.assert(isSameProdi === true, "Case 1 Fail: prodi should match");
    console.assert(result.matched.length === 3, "Case 1 Fail: should match 3 courses");
    console.assert(result.missingIds.length === 0, "Case 1 Fail: missing should be 0");
    console.log("PASS: Case 1 matched all 3 courses");
  }

  // Case 2: One class not available (e.g. IE51::Z).
  {
    console.log("\n--- Case 2: One class missing ---");
    const rawIds = ["GS51::A", "IE51::Z", "IE52::A"];
    const result = matchOfferingByCodeClass(rawIds, sampleOffering);

    console.assert(result.matched.length === 2, "Case 2 Fail: should match 2 courses");
    console.assert(result.missingIds.length === 1, "Case 2 Fail: 1 missing ID");
    console.assert(result.codeExistOnly.includes("IE51"), "Case 2 Fail: IE51 code exists");
    console.log("PASS: Case 2 matched 2, missing 1");
  }

  // Case 3: Different prodi (51 vs 52).
  {
    console.log("\n--- Case 3: Different prodi ---");
    const senderNim = "202451001";
    const receiverNim = "202452001";
    const isSameProdi = studyProgramsMatch(senderNim, receiverNim);

    console.assert(isSameProdi === false, "Case 3 Fail: prodi should NOT match");
    console.log("PASS: Case 3 program mismatch detected");
  }

  // Case 4: Raw URL adoption.
  {
    console.log("\n--- Case 4: Raw URL adoption ---");
    const coursesToShare = [
      createCourse("GS51", "A", "Matematika Diskrit"),
      createCourse("IE52", "A", "Struktur Data"),
    ];
    const adoptPath = buildAdoptPath(coursesToShare, { nim: "202451001", name: "Budi" });
    const parsed = parseShareParams(adoptPath.split("?")[1]);

    const result = matchOfferingByCodeClass(parsed.ids, sampleOffering);
    console.assert(result.matched.length === 2, "Case 4 Fail: raw URL should match 2");
    console.log("PASS: Case 4 raw URL parsed & matched");
  }

  // Case 5: Short URL resolved IDs.
  {
    console.log("\n--- Case 5: Short URL resolved IDs ---");
    const resolvedSearch = "ids=GS51::A,IE51::E&nim=202451***&nama=BUD***UDI";
    const parsed = parseShareParams(resolvedSearch);
    const result = matchOfferingByCodeClass(parsed.ids, sampleOffering);

    console.assert(result.matched.length === 2, "Case 5 Fail: short URL should match 2");
    console.log("PASS: Case 5 short URL resolved & matched");
  }

  // Case 6: Lowercase class ("gs51::a").
  {
    console.log("\n--- Case 6: Lowercase class & code ---");
    const rawIds = ["gs51::a", "ie51::e"];
    const result = matchOfferingByCodeClass(rawIds, sampleOffering);

    console.assert(result.matched.length === 2, "Case 6 Fail: lowercase should match");
    console.log("PASS: Case 6 lowercase matched correctly");
  }

  // Case 7: Whitespace (" GS51 :: A ").
  {
    console.log("\n--- Case 7: Whitespace padding ---");
    const rawIds = [" GS51 :: A ", "IE51::E "];
    const result = matchOfferingByCodeClass(rawIds, sampleOffering);

    console.assert(result.matched.length === 2, "Case 7 Fail: whitespace should match");
    console.log("PASS: Case 7 whitespace trimmed & matched");
  }

  // Case 8: Encoding (%3A%3A).
  {
    console.log("\n--- Case 8: URL encoded colons ---");
    const rawIds = ["GS51%3A%3AA", "IE51%3AE"];
    const result = matchOfferingByCodeClass(rawIds, sampleOffering);

    console.assert(result.matched.length === 2, "Case 8 Fail: encoded colons should match");
    console.log("PASS: Case 8 encoded colons parsed & matched");
  }

  console.log("\n=== ALL REGRESSION TESTS PASSED! ===");
}

runRegressionTests();
