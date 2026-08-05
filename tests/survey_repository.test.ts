import { test, expect, beforeEach, afterEach } from "bun:test";
import { surveyRepository } from "@/modules/survey/survey.repository";
import { isHttpError } from "@/lib/server/http-error";
import { envVariable } from "@/lib/utils";
import type { SurveySpreadsheetPayload } from "@/modules/survey/survey.types";

const originalFetch = globalThis.fetch;
const originalEndpoint = envVariable.SURVEY_ENDPOINT;
const originalApiKey = envVariable.SURVEY_API_KEY;

const payload: SurveySpreadsheetPayload = {
  userId: "202101001",
  degree: "S1",
  studyProgram: "Teknik Informatika",
  overallSatisfaction: 5,
  easeOfUse: 5,
  helpfulness: 5,
  nps: 10,
  featuresUsed: ["AI Schedule Generator"],
  aiScheduleRating: 5,
  warEngineRating: null,
  templateRating: null,
  shareScheduleRating: null,
  submissionHistoryRating: null,
  sessionCheckerRating: null,
  queueExperience: "Sangat Baik",
  warSuccess: "Berhasil",
  painPoints: ["Tidak ada kendala"],
  requestedFeatures: [],
  feedback: "",
  browser: "Chrome",
  os: "Windows",
  device: "Desktop",
  screenWidth: 1920,
  language: "id-ID",
  surveyVersion: "v2",
};

beforeEach(() => {
  envVariable.SURVEY_ENDPOINT = "https://script.google.com/macros/s/mock/exec";
  envVariable.SURVEY_API_KEY = "mock-key";
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  envVariable.SURVEY_ENDPOINT = originalEndpoint;
  envVariable.SURVEY_API_KEY = originalApiKey;
});

test("throws HttpError 503 when env vars are not configured", async () => {
  envVariable.SURVEY_ENDPOINT = undefined;
  envVariable.SURVEY_API_KEY = undefined;

  try {
    await surveyRepository.sendToSpreadsheet(payload);
    expect.unreachable();
  } catch (error) {
    expect(isHttpError(error)).toBe(true);
    expect((error as any).status).toBe(503);
  }
});

test("throws HttpError 502 when Apps Script responds with non-2xx", async () => {
  globalThis.fetch = (async () =>
    new Response("Internal Server Error", { status: 500, statusText: "Internal Server Error" })) as any;

  try {
    await surveyRepository.sendToSpreadsheet(payload);
    expect.unreachable();
  } catch (error) {
    expect(isHttpError(error)).toBe(true);
    expect((error as any).status).toBe(502);
  }
});

test("throws HttpError 502 when Apps Script body reports success:false", async () => {
  globalThis.fetch = (async () =>
    new Response(JSON.stringify({ success: false, message: "Sheet is full" }), { status: 200 })) as any;

  try {
    await surveyRepository.sendToSpreadsheet(payload);
    expect.unreachable();
  } catch (error) {
    expect(isHttpError(error)).toBe(true);
    expect((error as any).status).toBe(502);
    // GAS-controlled message text must not leak verbatim to the HttpError surfaced to clients.
    expect((error as any).message).not.toContain("Sheet is full");
  }
});

test("throws HttpError 502 when fetch itself rejects (network failure/timeout)", async () => {
  globalThis.fetch = (async () => {
    throw new Error("fetch failed");
  }) as any;

  try {
    await surveyRepository.sendToSpreadsheet(payload);
    expect.unreachable();
  } catch (error) {
    expect(isHttpError(error)).toBe(true);
    expect((error as any).status).toBe(502);
  }
});

test("resolves successfully when Apps Script responds with success:true", async () => {
  globalThis.fetch = (async () =>
    new Response(JSON.stringify({ success: true, row: 42 }), { status: 200 })) as any;

  const result = await surveyRepository.sendToSpreadsheet(payload);
  expect(result.success).toBe(true);
  expect(result.message).toBe("Survei berhasil dikirim");
});

test("sends the API key as a query parameter, never as a header", async () => {
  let capturedUrl = "";
  let capturedHeaders: HeadersInit | undefined;
  globalThis.fetch = (async (url: string, init?: RequestInit) => {
    capturedUrl = url;
    capturedHeaders = init?.headers;
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  }) as any;

  await surveyRepository.sendToSpreadsheet(payload);

  expect(capturedUrl).toContain("key=mock-key");
  expect(JSON.stringify(capturedHeaders || {})).not.toContain("mock-key");
});
