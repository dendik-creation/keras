import type { SurveyPayload, SurveySpreadsheetPayload, SurveyMetadata } from "./survey.types";
import { SURVEY_VERSION } from "./survey.constants";

export function mapSurveyToSpreadsheetPayload(
  raw: Partial<SurveyPayload>,
  fallbackMetadata?: Partial<SurveyMetadata>
): SurveySpreadsheetPayload {
  const featuresUsed: string[] = Array.isArray(raw.featuresUsed)
    ? raw.featuresUsed.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];

  const resolveRating = (featureName: string, rawRating: unknown): number | null => {
    if (!featuresUsed.includes(featureName)) return null;
    if (typeof rawRating === "number" && !isNaN(rawRating) && rawRating >= 1 && rawRating <= 5) {
      return rawRating;
    }
    return null;
  };

  const aiScheduleRating = resolveRating("AI Schedule Generator", raw.aiScheduleRating);
  const warEngineRating = resolveRating("War KRS Engine", raw.warEngineRating);
  const templateRating = resolveRating("Saved Schedule Templates", raw.templateRating);
  const shareScheduleRating = resolveRating("Share & Adopt Schedule", raw.shareScheduleRating);
  const submissionHistoryRating = resolveRating("Submission History", raw.submissionHistoryRating);
  const sessionCheckerRating = resolveRating("SSO Session Checker", raw.sessionCheckerRating);

  const painPoints: string[] = Array.isArray(raw.painPoints)
    ? raw.painPoints.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];

  const requestedFeatures: string[] = Array.isArray(raw.requestedFeatures)
    ? raw.requestedFeatures.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];

  const userId = typeof raw.userId === "string" ? raw.userId.trim() : "";
  const degree = typeof raw.degree === "string" && raw.degree.trim().length > 0 ? raw.degree.trim() : "S1";
  const studyProgram = typeof raw.studyProgram === "string" ? raw.studyProgram.trim() : "";

  const overallSatisfaction = typeof raw.overallSatisfaction === "number" ? raw.overallSatisfaction : 0;
  const easeOfUse = typeof raw.easeOfUse === "number" ? raw.easeOfUse : 0;
  const helpfulness = typeof raw.helpfulness === "number" ? raw.helpfulness : 0;
  const nps = typeof raw.nps === "number" ? raw.nps : 0;

  const queueExperience = typeof raw.queueExperience === "string" ? raw.queueExperience.trim() : "";
  const warSuccess = typeof raw.warSuccess === "string" ? raw.warSuccess.trim() : "";
  const feedback = typeof raw.feedback === "string" ? raw.feedback.trim() : "";

  const browser = typeof raw.browser === "string" && raw.browser.trim().length > 0
    ? raw.browser.trim()
    : (fallbackMetadata?.browser || "Lainnya");

  const os = typeof raw.os === "string" && raw.os.trim().length > 0
    ? raw.os.trim()
    : (fallbackMetadata?.os || "Lainnya");

  const device = typeof raw.device === "string" && raw.device.trim().length > 0
    ? raw.device.trim()
    : (fallbackMetadata?.device || "Desktop");

  const screenWidth = typeof raw.screenWidth === "number" && !isNaN(raw.screenWidth)
    ? raw.screenWidth
    : (fallbackMetadata?.screenWidth ?? 0);

  const language = typeof raw.language === "string" && raw.language.trim().length > 0
    ? raw.language.trim()
    : (fallbackMetadata?.language || "id-ID");

  const payload: SurveySpreadsheetPayload = {
    userId,
    degree,
    studyProgram,

    overallSatisfaction,
    easeOfUse,
    helpfulness,
    nps,

    featuresUsed,

    aiScheduleRating,
    warEngineRating,
    templateRating,
    shareScheduleRating,
    submissionHistoryRating,
    sessionCheckerRating,

    queueExperience,
    warSuccess,

    painPoints,

    requestedFeatures,

    feedback,

    browser,
    os,
    device,
    screenWidth,
    language,

    surveyVersion: SURVEY_VERSION,
  };

  return payload;
}
