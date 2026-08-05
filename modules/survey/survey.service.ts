import { surveyIncomingPayloadSchema } from "./survey.schema";
import { mapSurveyToSpreadsheetPayload } from "./survey.mapper";
import { getServerSurveyMetadata } from "./survey.metadata";
import { surveyRepository } from "./survey.repository";
import { logger } from "@/lib/logger";
import type { SurveySpreadsheetPayload } from "./survey.types";

export interface SurveyServiceOptions {
  userAgent?: string;
  acceptLanguage?: string;
}

export interface SurveyServiceResult {
  success: boolean;
  message: string;
  payload: SurveySpreadsheetPayload;
  data?: unknown;
}

export class SurveyService {
  async handleSubmission(
    rawBody: unknown,
    options: SurveyServiceOptions = {}
  ): Promise<SurveyServiceResult> {
    const parsedBody = surveyIncomingPayloadSchema.parse(rawBody);

    const fallbackMetadata = getServerSurveyMetadata(
      options.userAgent || "",
      options.acceptLanguage || ""
    );

    const spreadsheetPayload = mapSurveyToSpreadsheetPayload(parsedBody, fallbackMetadata);

    logger.log("[SurveyService] Submitting survey:", {
      degree: spreadsheetPayload.degree,
      surveyVersion: spreadsheetPayload.surveyVersion,
      featuresUsedCount: spreadsheetPayload.featuresUsed.length,
    });

    const repoResult = await surveyRepository.sendToSpreadsheet(spreadsheetPayload);

    return {
      success: true,
      message: repoResult.message || "Survei berhasil dikirim",
      payload: spreadsheetPayload,
      data: repoResult.data,
    };
  }
}

export const surveyService = new SurveyService();
