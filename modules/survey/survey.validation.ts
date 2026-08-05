import type { SurveyFormData } from "./survey.types";

export function getStepValidationFields(stepIndex: number): (keyof SurveyFormData)[] {
  switch (stepIndex) {
    case 0:
      return ["overallSatisfaction", "easeOfUse", "helpfulness", "nps"];
    case 1:
      return ["featuresUsed"];
    case 2:
      return [];
    case 3:
      return ["queueExperience", "warSuccess", "painPoints"];
    case 4:
      return ["requestedFeatures", "feedback"];
    default:
      return [];
  }
}

export function isStepValid(stepIndex: number, values: Partial<SurveyFormData>): boolean {
  if (stepIndex === 0) {
    return Boolean(
      values.overallSatisfaction &&
        values.overallSatisfaction >= 1 &&
        values.overallSatisfaction <= 5 &&
        values.easeOfUse &&
        values.easeOfUse >= 1 &&
        values.easeOfUse <= 5 &&
        values.helpfulness &&
        values.helpfulness >= 1 &&
        values.helpfulness <= 5 &&
        typeof values.nps === "number" &&
        values.nps >= 0 &&
        values.nps <= 10
    );
  }

  if (stepIndex === 1) {
    return Boolean(values.featuresUsed && values.featuresUsed.length > 0);
  }

  if (stepIndex === 2) {
    return true;
  }

  if (stepIndex === 3) {
    return Boolean(
      values.queueExperience &&
        values.queueExperience.trim().length > 0 &&
        values.warSuccess &&
        values.warSuccess.trim().length > 0 &&
        values.painPoints &&
        values.painPoints.length > 0
    );
  }

  if (stepIndex === 4) {
    return true;
  }

  return true;
}
