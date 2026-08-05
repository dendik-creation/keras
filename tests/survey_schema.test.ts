import { test, expect } from "bun:test";
import { surveyFormSchema, surveyIncomingPayloadSchema } from "@/modules/survey/survey.schema";

const validPayload = {
  overallSatisfaction: 5,
  easeOfUse: 4,
  helpfulness: 5,
  nps: 10,
  featuresUsed: ["AI Schedule Generator"],
  queueExperience: "Sangat Baik",
  warSuccess: "Berhasil",
  painPoints: ["Tidak ada kendala"],
  requestedFeatures: [],
  userId: "202101001",
  degree: "S1",
  studyProgram: "Teknik Informatika",
};

test("surveyFormSchema accepts a fully valid payload", () => {
  expect(() => surveyFormSchema.parse(validPayload)).not.toThrow();
});

test("surveyFormSchema rejects missing userId", () => {
  const { userId, ...rest } = validPayload;
  expect(() => surveyFormSchema.parse(rest)).toThrow();
});

test("surveyFormSchema rejects empty-string userId", () => {
  expect(() => surveyFormSchema.parse({ ...validPayload, userId: "" })).toThrow();
});

test("surveyFormSchema rejects nps outside 0-10 range", () => {
  expect(() => surveyFormSchema.parse({ ...validPayload, nps: 11 })).toThrow();
  expect(() => surveyFormSchema.parse({ ...validPayload, nps: -1 })).toThrow();
});

test("surveyFormSchema rejects star ratings outside 1-5 range", () => {
  expect(() => surveyFormSchema.parse({ ...validPayload, overallSatisfaction: 0 })).toThrow();
  expect(() => surveyFormSchema.parse({ ...validPayload, overallSatisfaction: 6 })).toThrow();
});

test("surveyFormSchema rejects empty featuresUsed/painPoints arrays", () => {
  expect(() => surveyFormSchema.parse({ ...validPayload, featuresUsed: [] })).toThrow();
  expect(() => surveyFormSchema.parse({ ...validPayload, painPoints: [] })).toThrow();
});

test("surveyFormSchema allows optional degree/studyProgram to be omitted", () => {
  const { degree, studyProgram, ...rest } = validPayload;
  expect(() => surveyFormSchema.parse(rest)).not.toThrow();
});

test("surveyIncomingPayloadSchema accepts extended metadata fields", () => {
  const withMetadata = {
    ...validPayload,
    browser: "Chrome",
    os: "Windows",
    device: "Desktop",
    screenWidth: 1920,
    language: "id-ID",
  };
  expect(() => surveyIncomingPayloadSchema.parse(withMetadata)).not.toThrow();
});

test("surveyIncomingPayloadSchema still enforces required base fields", () => {
  const { userId, ...rest } = validPayload;
  expect(() => surveyIncomingPayloadSchema.parse(rest)).toThrow();
});
