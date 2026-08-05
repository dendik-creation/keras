import { test, expect } from "bun:test";
import { mapSurveyToSpreadsheetPayload } from "@/modules/survey/survey.mapper";
import type { SurveySpreadsheetPayload } from "@/types/survey";

test("mapSurveyToSpreadsheetPayload produces exact schema without undefined properties", () => {
  const rawInput = {
    overallSatisfaction: 5,
    easeOfUse: 4,
    helpfulness: 5,
    nps: 10,
    featuresUsed: ["AI Schedule Generator", "War KRS Engine", "Submission History"],
    aiScheduleRating: 5,
    warEngineRating: 4,
    submissionHistoryRating: 5,
    queueExperience: "Sangat Baik",
    warSuccess: "Berhasil",
    painPoints: ["Tidak ada kendala"],
    requestedFeatures: ["Mobile App", "Google Calendar Sync"],
    feedback: "Sangat puas dengan KeRaS v2!",
    userId: "202101001",
    degree: "S1",
    studyProgram: "Teknik Informatika",
  };

  const payload: SurveySpreadsheetPayload = mapSurveyToSpreadsheetPayload(rawInput);

  expect(payload.userId).toBe("202101001");
  expect(payload.degree).toBe("S1");
  expect(payload.studyProgram).toBe("Teknik Informatika");
  expect(payload.overallSatisfaction).toBe(5);
  expect(payload.easeOfUse).toBe(4);
  expect(payload.helpfulness).toBe(5);
  expect(payload.nps).toBe(10);

  expect(Array.isArray(payload.featuresUsed)).toBe(true);
  expect(payload.featuresUsed).toEqual(["AI Schedule Generator", "War KRS Engine", "Submission History"]);

  expect(payload.aiScheduleRating).toBe(5);
  expect(payload.warEngineRating).toBe(4);
  expect(payload.templateRating).toBeNull();
  expect(payload.shareScheduleRating).toBeNull();
  expect(payload.submissionHistoryRating).toBe(5);
  expect(payload.sessionCheckerRating).toBeNull();

  expect(payload.queueExperience).toBe("Sangat Baik");
  expect(payload.warSuccess).toBe("Berhasil");

  expect(Array.isArray(payload.painPoints)).toBe(true);
  expect(payload.painPoints).toEqual(["Tidak ada kendala"]);

  expect(Array.isArray(payload.requestedFeatures)).toBe(true);
  expect(payload.requestedFeatures).toEqual(["Mobile App", "Google Calendar Sync"]);

  expect(payload.feedback).toBe("Sangat puas dengan KeRaS v2!");
  expect(payload.surveyVersion).toBe("v2");

  // Verify property key order for exact spreadsheet column alignment
  const keys = Object.keys(payload);
  expect(keys.indexOf("feedback")).toBeLessThan(keys.indexOf("browser"));
  expect(keys.indexOf("browser")).toBeLessThan(keys.indexOf("os"));
  expect(keys.indexOf("os")).toBeLessThan(keys.indexOf("device"));
  expect(keys.indexOf("device")).toBeLessThan(keys.indexOf("screenWidth"));
  expect(keys.indexOf("screenWidth")).toBeLessThan(keys.indexOf("language"));

  // Ensure no undefined values in payload object keys
  keys.forEach((key) => {
    expect((payload as any)[key]).not.toBeUndefined();
  });
});

test("mapSurveyToSpreadsheetPayload sets null for unselected feature ratings", () => {
  const rawInput = {
    overallSatisfaction: 4,
    easeOfUse: 4,
    helpfulness: 4,
    nps: 8,
    featuresUsed: ["SSO Session Checker"],
    sessionCheckerRating: 5,
    aiScheduleRating: 5, // should become null because AI Schedule Generator was not selected
    queueExperience: "Baik",
    warSuccess: "Berhasil Sebagian",
    painPoints: ["Queue terlalu lama"],
    requestedFeatures: [],
    userId: "202101002",
    degree: "D3",
    studyProgram: "Sistem Informasi",
  };

  const payload = mapSurveyToSpreadsheetPayload(rawInput);

  expect(payload.featuresUsed).toEqual(["SSO Session Checker"]);
  expect(payload.aiScheduleRating).toBeNull();
  expect(payload.warEngineRating).toBeNull();
  expect(payload.templateRating).toBeNull();
  expect(payload.shareScheduleRating).toBeNull();
  expect(payload.submissionHistoryRating).toBeNull();
  expect(payload.sessionCheckerRating).toBe(5);
});

test("mapSurveyToSpreadsheetPayload ensures default metadata values if omitted", () => {
  const rawInput = {
    overallSatisfaction: 3,
    easeOfUse: 3,
    helpfulness: 3,
    nps: 5,
    featuresUsed: [],
    queueExperience: "Cukup",
    warSuccess: "Gagal",
    painPoints: ["Lainnya"],
  };

  const payload = mapSurveyToSpreadsheetPayload(rawInput);

  expect(payload.degree).toBe("S1");
  expect(payload.feedback).toBe("");
  expect(payload.browser).toBe("Lainnya");
  expect(payload.os).toBe("Lainnya");
  expect(payload.device).toBe("Desktop");
  expect(payload.screenWidth).toBe(0);
  expect(payload.language).toBe("id-ID");
});
