export interface ActiveUserSession {
  userId?: string;
  nim?: string;
  degree?: string;
  studyProgram?: string;
  major?: string;
  name?: string;
}

export interface SurveyMetadata {
  browser: string;
  os: string;
  device: string;
  screenWidth: number;
  language: string;
}

export interface SurveyFormData {
  overallSatisfaction: number;
  easeOfUse: number;
  helpfulness: number;
  nps: number;

  featuresUsed: string[];

  aiScheduleRating?: number | null;
  warEngineRating?: number | null;
  templateRating?: number | null;
  shareScheduleRating?: number | null;
  submissionHistoryRating?: number | null;
  sessionCheckerRating?: number | null;

  queueExperience: string;
  warSuccess: string;

  painPoints: string[];
  requestedFeatures: string[];
  feedback?: string;

  userId?: string;
  degree?: string;
  studyProgram?: string;
}

export interface SurveyPayload extends SurveyFormData, Partial<SurveyMetadata> {}

export interface SurveySpreadsheetPayload {
  userId: string;
  degree: string;
  studyProgram: string;

  overallSatisfaction: number;
  easeOfUse: number;
  helpfulness: number;
  nps: number;

  featuresUsed: string[];

  aiScheduleRating: number | null;
  warEngineRating: number | null;
  templateRating: number | null;
  shareScheduleRating: number | null;
  submissionHistoryRating: number | null;
  sessionCheckerRating: number | null;

  queueExperience: string;
  warSuccess: string;

  painPoints: string[];

  requestedFeatures: string[];

  feedback: string;

  browser: string;
  os: string;
  device: string;
  screenWidth: number;
  language: string;

  surveyVersion: string;
}

export interface SurveyStep {
  id: string;
  title: string;
  description: string;
}

export interface FeatureOption {
  id: string;
  label: string;
  key: keyof SurveyFormData;
}

export interface OptionItem {
  id: string;
  label: string;
}
