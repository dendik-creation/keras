import { envVariable } from "@/lib/utils";
import { HttpError } from "@/lib/server/http-error";
import { logger } from "@/lib/logger";
import type { SurveySpreadsheetPayload } from "./survey.types";

export interface SurveyRepositoryResponse {
  success: boolean;
  message?: string;
  data?: unknown;
}

const GAS_TIMEOUT_MS = 10_000;

export class SurveyRepository {
  async sendToSpreadsheet(payload: SurveySpreadsheetPayload): Promise<SurveyRepositoryResponse> {
    const SURVEY_ENDPOINT = envVariable.SURVEY_ENDPOINT;
    const SURVEY_API_KEY = envVariable.SURVEY_API_KEY;

    if (!SURVEY_ENDPOINT || !SURVEY_API_KEY) {
      logger.warn("[SurveyRepository] Survey API environment variables not configured.");
      throw new HttpError(503, "Layanan survei tidak tersedia saat ini");
    }

    const targetUrl = new URL(SURVEY_ENDPOINT);
    targetUrl.searchParams.set("key", SURVEY_API_KEY);

    logger.log("[SurveyRepository] Dispatching survey payload to Google Apps Script:", {
      endpoint: targetUrl.origin + targetUrl.pathname,
      degree: payload.degree,
      surveyVersion: payload.surveyVersion,
    });

    let response: Response;
    try {
      response = await fetch(targetUrl.toString(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(GAS_TIMEOUT_MS),
      });
    } catch (error) {
      logger.error("[SurveyRepository] Request to Google Apps Script failed:", error);
      throw new HttpError(502, "Layanan survei tidak dapat dihubungi.");
    }

    if (!response.ok) {
      logger.error("[SurveyRepository] Google Apps Script HTTP error:", response.status, response.statusText);
      throw new HttpError(502, "Google Apps Script menolak permintaan survei.");
    }

    const result = await response.json();
    logger.log("[SurveyRepository] Google Apps Script response received:", result);

    if (!result || typeof result !== "object" || !("success" in result) || !result.success) {
      logger.error("[SurveyRepository] Google Apps Script rejected payload:", result);
      throw new HttpError(502, "Google Apps Script menolak permintaan survei.");
    }

    return {
      success: true,
      message: "Survei berhasil dikirim",
      data: result,
    };
  }
}

export const surveyRepository = new SurveyRepository();
