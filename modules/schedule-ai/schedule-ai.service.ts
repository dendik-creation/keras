import { HttpError } from "@/lib/server/http-error";
import { logger } from "@/lib/logger";
import type { CourseSchedule } from "@/types/course_schedule";
import {
  buildSystemPrompt,
  buildUserPrompt,
  GENERATE_TIMEOUT_MS,
  pickPromptTier,
} from "@/modules/schedule-ai/schedule-ai.constants";
import type { AiPreference, CourseWithSemester } from "@/modules/schedule-ai/schedule-ai.types";
import { parseAiRawResponse, validateGeneratedSchedule } from "@/modules/schedule-ai/schedule-ai.validator";
import { prefilterCourses } from "@/modules/schedule-ai/schedule-ai.utils";
import { reduceCandidates } from "@/modules/schedule-ai/schedule-ai.reduce";
import { buildCompactPayload } from "@/modules/schedule-ai/schedule-ai.compact";
import { runGreedyBacktrackOptimizer } from "@/modules/schedule-ai/schedule-ai.optimizer";
import { callAiModel, extractJson } from "@/modules/schedule-ai/schedule-ai.provider";
import { attemptRepair, isRepairable } from "@/modules/schedule-ai/schedule-ai.repair";
import {
  describeSelection,
  logRequestSummary,
  logSelection,
  logValidationSummary,
  type ExecutionMode,
} from "@/modules/schedule-ai/schedule-ai.log";

export type GenerateProgress = { stage: "filtering" | "generating" | "repairing" | "fallback" };
export type GenerateResult = { courses: CourseSchedule[]; mode: ExecutionMode };

/**
 * Generate a schedule for the given offering + preferences.
 *
 * Pipeline: deterministic hard-filter -> deterministic candidate reduction
 * -> either skip the AI entirely when there's no real choice left, or make
 * one full "generate" call. If that's invalid only because of a fixable
 * combination problem (overlap/duplicate-course/SKS), one tiny "repair"
 * call asks the model to remove just the offending entries — never a full
 * regenerate. Anything else (AI unavailable, timeout, unrepairable
 * failure) falls back to the deterministic optimizer immediately; AI
 * quality is a bonus, never a blocker for a response.
 */
export async function generateScheduleWithAI(
  availableCourses: CourseWithSemester[],
  preference: AiPreference,
  requestId: string,
  onProgress?: (event: GenerateProgress) => void,
): Promise<GenerateResult> {
  const totalStartedAt = Date.now();
  onProgress?.({ stage: "filtering" });

  const candidateCourses = prefilterCourses(availableCourses, preference);
  const { courses: reducedCourses, groupCount, allSingleChoice } = reduceCandidates(
    candidateCourses,
    preference,
  );

  logger.log("[schedule-ai] payload built", {
    requestId,
    rawCourses: availableCourses.length,
    prefilteredCourses: candidateCourses.length,
    courseGroups: groupCount,
    reducedCandidates: reducedCourses.length,
  });

  let attemptCount = 0;
  let aiLatencyMs = 0;
  let validationMs = 0;
  let fallbackMs = 0;
  let promptTokens: number | null = null;
  let completionTokens: number | null = null;

  const addTokens = (prompt: number | null, completion: number | null) => {
    if (prompt !== null) promptTokens = (promptTokens ?? 0) + prompt;
    if (completion !== null) completionTokens = (completionTokens ?? 0) + completion;
  };

  const finish = (courses: CourseSchedule[], mode: ExecutionMode): GenerateResult => {
    logRequestSummary({
      requestId,
      mode,
      attemptCount,
      promptTokens,
      completionTokens,
      aiLatencyMs,
      validationMs,
      fallbackMs,
      totalMs: Date.now() - totalStartedAt,
      result: "SUCCESS",
    });
    return { courses, mode };
  };

  const fail = (message: string, detail?: unknown): never => {
    logRequestSummary({
      requestId,
      mode: "fallback",
      attemptCount,
      promptTokens,
      completionTokens,
      aiLatencyMs,
      validationMs,
      fallbackMs,
      totalMs: Date.now() - totalStartedAt,
      result: "FAILED",
    });
    throw new HttpError(422, message, { detail, requestId });
  };

  const runFallback = (): CourseSchedule[] => {
    onProgress?.({ stage: "fallback" });
    const fallbackStartedAt = Date.now();
    const fallbackCourses = runGreedyBacktrackOptimizer(candidateCourses, preference);
    fallbackMs += Date.now() - fallbackStartedAt;
    return fallbackCourses;
  };

  if (reducedCourses.length === 0) {
    logger.error("[schedule-ai] no candidates — nothing to schedule", {
      requestId,
      rawCourses: availableCourses.length,
      hint: "check that offeringCourses' courses have both day and hour filled in, and that preferred_days/earliest_start/latest_end/avoid_* aren't excluding everything",
    });
    return fail("Tidak ada jadwal yang tersedia untuk dijadwalkan.");
  }

  // No real choice left for the AI to make — skip it entirely.
  if (allSingleChoice) {
    const heuristicCourses = runFallback();
    logger.log("[schedule-ai] deterministic heuristic — skipping AI", {
      requestId,
      courses: heuristicCourses.length,
    });
    if (heuristicCourses.length > 0) return finish(heuristicCourses, "fallback");
    return fail("Tidak ada jadwal yang tersedia untuk dijadwalkan.");
  }

  const { payload, idMap, courseByShortId } = buildCompactPayload(reducedCourses, preference);
  const tier = pickPromptTier(reducedCourses.length);

  const resolveKnownIds = (shortIds: string[]): { known: string[]; unknown: string[] } => {
    const known: string[] = [];
    const unknown: string[] = [];
    for (const id of shortIds) {
      if (idMap.has(id)) known.push(id);
      else unknown.push(id);
    }
    return { known, unknown };
  };

  // Attempt 1: one full generate call, hard-capped so a slow provider can
  // never hold the request open anywhere near a reverse-proxy timeout.
  onProgress?.({ stage: "generating" });
  attemptCount++;
  let generatedShortIds: string[] | null = null;
  try {
    const systemPrompt = buildSystemPrompt(tier);
    const userPrompt = buildUserPrompt(payload);
    const startedAt = Date.now();
    const { content, usage } = await callAiModel(systemPrompt, userPrompt, 0, GENERATE_TIMEOUT_MS);
    aiLatencyMs += Date.now() - startedAt;
    addTokens(usage.promptTokens, usage.completionTokens);
    generatedShortIds = parseAiRawResponse(extractJson(content));
    logSelection("generate: selected", generatedShortIds);
  } catch (err) {
    const detail = err instanceof Error ? err.message : "unknown error";
    logger.warn("[schedule-ai] generate call failed — falling back to deterministic optimizer", {
      requestId,
      detail,
    });
  }

  if (generatedShortIds) {
    const { known, unknown } = resolveKnownIds(generatedShortIds);
    if (unknown.length > 0) {
      logger.warn("[schedule-ai] dropping unknown id token(s) from AI selection", {
        requestId,
        count: unknown.length,
      });
    }

    if (known.length > 0) {
      const realIds = known.map((id) => idMap.get(id)!);
      const validationStartedAt = Date.now();
      const result = validateGeneratedSchedule(realIds, candidateCourses, preference);
      validationMs += Date.now() - validationStartedAt;
      logValidationSummary(result.issues, result.valid);

      if (result.valid && result.courses.length > 0) {
        return finish(result.courses, "ai");
      }

      if (!result.valid) {
        logger.warn("[schedule-ai] generated schedule failed validation", {
          requestId,
          resolved: describeSelection(known, courseByShortId),
        });

        if (isRepairable(result.issues)) {
          onProgress?.({ stage: "repairing" });
          attemptCount++;
          const repairOutcome = await attemptRepair(known, result.issues);
          aiLatencyMs += repairOutcome.ms;

          if (repairOutcome.ok) {
            addTokens(repairOutcome.usage.promptTokens, repairOutcome.usage.completionTokens);
            logSelection("repair: selected", repairOutcome.shortIds);
            const repaired = resolveKnownIds(repairOutcome.shortIds);
            if (repaired.unknown.length > 0) {
              logger.warn("[schedule-ai] dropping unknown id token(s) from repair selection", {
                requestId,
                count: repaired.unknown.length,
              });
            }
            if (repaired.known.length > 0) {
              const repairRealIds = repaired.known.map((id) => idMap.get(id)!);
              const repairValidationStartedAt = Date.now();
              const repairResult = validateGeneratedSchedule(repairRealIds, candidateCourses, preference);
              validationMs += Date.now() - repairValidationStartedAt;
              logValidationSummary(repairResult.issues, repairResult.valid);

              if (repairResult.valid && repairResult.courses.length > 0) {
                return finish(repairResult.courses, "repair");
              }
              logger.warn("[schedule-ai] repair did not produce a valid schedule — falling back", {
                requestId,
              });
            } else {
              logger.warn("[schedule-ai] repair returned no usable ids — falling back", { requestId });
            }
          } else {
            logger.warn("[schedule-ai] repair call failed — falling back to deterministic optimizer", {
              requestId,
              detail: repairOutcome.detail,
            });
          }
        } else {
          logger.warn("[schedule-ai] validation failure not repairable — falling back", { requestId });
        }
      }
    } else {
      logger.warn("[schedule-ai] AI selection had no usable ids — falling back", { requestId });
    }
  }

  const fallbackCourses = runFallback();
  if (fallbackCourses.length > 0) {
    logger.log("[schedule-ai] fallback optimizer produced a schedule", {
      requestId,
      courses: fallbackCourses.length,
    });
    return finish(fallbackCourses, "fallback");
  }

  logger.error("[schedule-ai] AI and fallback both exhausted", { requestId });
  return fail("Tidak ada jadwal yang cocok dengan preferensimu.");
}
