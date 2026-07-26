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
import { compareScheduleMetrics, targetSksFor } from "@/modules/schedule-ai/schedule-ai.scoring";
import { parseAiRankResponse, validateGeneratedSchedule } from "@/modules/schedule-ai/schedule-ai.validator";
import { prefilterCourses } from "@/modules/schedule-ai/schedule-ai.utils";
import { reduceCandidates } from "@/modules/schedule-ai/schedule-ai.reduce";
import { buildCompactPayload } from "@/modules/schedule-ai/schedule-ai.compact";
import { runGreedyBacktrackOptimizer, type OptimizerResult } from "@/modules/schedule-ai/schedule-ai.optimizer";
import { callAiModel, extractJson } from "@/modules/schedule-ai/schedule-ai.provider";
import {
  logOptimizationSummary,
  logRequestSummary,
  logSelection,
  logValidationSummary,
  type ExecutionMode,
} from "@/modules/schedule-ai/schedule-ai.log";

export type GenerateProgress = { stage: "filtering" | "optimizing" | "ranking" | "validating" };
export type GenerateResult = { courses: CourseSchedule[]; mode: ExecutionMode };

/**
 * Generate a schedule for the given offering + preferences.
 *
 * Pipeline: deterministic hard-filter -> deterministic candidate reduction
 * -> deterministic optimizer (baseline — this alone is already a complete,
 * valid answer) -> one optional AI "rank these candidates by preference"
 * call -> deterministic optimizer again, informed by that ranking as its
 * lowest-priority tie-break -> keep whichever of the two optimizer runs
 * scores better -> validate. The AI is never the thing that builds or
 * selects a schedule; it can only nudge which of several already-tied
 * options the optimizer prefers. This means an AI outage, timeout, or
 * malformed reply costs nothing but the ranking nuance — there's no
 * "AI failed, panic-build something" path because the deterministic engine
 * already ran first.
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
  const targetSks = targetSksFor(preference);

  if (candidateCourses.length === 0) {
    logger.error("[schedule-ai] no candidates — nothing to schedule", {
      requestId,
      rawCourses: availableCourses.length,
      hint: "check that offeringCourses' courses have both day and hour filled in, and that preferred_days/earliest_start/latest_end/avoid_* aren't excluding everything",
    });
    throw new HttpError(422, "Tidak ada jadwal yang tersedia untuk dijadwalkan.", { requestId });
  }

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

  // Denominator for the "coverage" log line — distinct preferred-semester courses still in play after hard-filtering.
  const semesterTotal = preference.preferred_semester
    ? new Set(
        candidateCourses
          .filter((c) => c.semester === preference.preferred_semester)
          .map((c) => c.code),
      ).size
    : 0;

  let aiLatencyMs = 0;
  let optimizerMs = 0;
  let validationMs = 0;
  let promptTokens: number | null = null;
  let completionTokens: number | null = null;

  const runOptimizer = (aiRank?: Map<string, number>): OptimizerResult => {
    const startedAt = Date.now();
    const result = runGreedyBacktrackOptimizer(candidateCourses, preference, aiRank);
    optimizerMs += Date.now() - startedAt;
    return result;
  };

  const semesterDistributionOf = (courses: CourseSchedule[]): Record<string, number> => {
    const distribution: Record<string, number> = {};
    for (const course of courses as CourseWithSemester[]) {
      distribution[course.semester] = (distribution[course.semester] ?? 0) + 1;
    }
    return distribution;
  };

  const finish = (result: OptimizerResult, mode: ExecutionMode): GenerateResult => {
    if (result.courses.length > 0) {
      logOptimizationSummary({
        metrics: result.metrics,
        semesterTotal,
        semesterDistribution: semesterDistributionOf(result.courses),
        targetSks,
        finalCourseCount: result.courses.length,
        mode,
        stats: result.stats,
      });
    }
    logRequestSummary({
      requestId,
      mode,
      promptTokens,
      completionTokens,
      aiLatencyMs,
      optimizerMs,
      validationMs,
      totalMs: Date.now() - totalStartedAt,
      result: "SUCCESS",
    });
    return { courses: result.courses, mode };
  };

  const fail = (message: string, detail?: unknown): never => {
    logRequestSummary({
      requestId,
      mode: "deterministic",
      promptTokens,
      completionTokens,
      aiLatencyMs,
      optimizerMs,
      validationMs,
      totalMs: Date.now() - totalStartedAt,
      result: "FAILED",
    });
    throw new HttpError(422, message, { detail, requestId });
  };

  // Baseline: the deterministic optimizer alone, no AI input at all. This is already a complete, hard-constraint-valid answer — everything after this is strictly optional refinement.
  onProgress?.({ stage: "optimizing" });
  const baseline = runOptimizer();

  let winner = baseline;
  let mode: ExecutionMode = "deterministic";

  // No real choice left for the optimizer to be nudged on — skip the AI call entirely.
  if (!allSingleChoice && reducedCourses.length > 0) {
    onProgress?.({ stage: "ranking" });
    try {
      const { payload, idMap } = buildCompactPayload(reducedCourses, preference);
      const tier = pickPromptTier(reducedCourses.length);
      const systemPrompt = buildSystemPrompt(tier);
      const userPrompt = buildUserPrompt(payload);

      const startedAt = Date.now();
      const { content, usage } = await callAiModel(systemPrompt, userPrompt, 0, GENERATE_TIMEOUT_MS);
      aiLatencyMs += Date.now() - startedAt;
      promptTokens = (promptTokens ?? 0) + (usage.promptTokens ?? 0);
      completionTokens = (completionTokens ?? 0) + (usage.completionTokens ?? 0);

      const rankedShortIds = parseAiRankResponse(extractJson(content));
      logSelection("rank: preference order", rankedShortIds);

      const aiRank = new Map<string, number>();
      rankedShortIds.forEach((shortId, position) => {
        const realId = idMap.get(shortId);
        if (realId) aiRank.set(realId, position);
      });

      onProgress?.({ stage: "optimizing" });
      const ranked = runOptimizer(aiRank);

      if (compareScheduleMetrics(ranked.metrics, baseline.metrics, preference) <= 0) {
        winner = ranked;
        mode = "ai_ranked";
      }
    } catch (err) {
      const detail = err instanceof Error ? err.message : "unknown error";
      logger.warn("[schedule-ai] ranking call failed — using deterministic baseline", {
        requestId,
        detail,
      });
    }
  }

  if (winner.courses.length === 0) {
    logger.error("[schedule-ai] optimizer found no feasible schedule", { requestId });
    return fail("Tidak ada jadwal yang cocok dengan preferensimu.");
  }

  onProgress?.({ stage: "validating" });
  const validationStartedAt = Date.now();
  const result = validateGeneratedSchedule(winner.courses, preference);
  validationMs += Date.now() - validationStartedAt;
  logValidationSummary(result.issues, result.valid);

  if (result.valid) {
    return finish(winner, mode);
  }

  // The optimizer enforces every one of these constraints by construction — reaching here means a real bug, not an expected path. Fall back to the untouched baseline once before giving up.
  logger.error("[schedule-ai] optimizer output failed its own validation — this should not happen", {
    requestId,
    reason: result.reason,
  });
  if (winner !== baseline) {
    const baselineValidation = validateGeneratedSchedule(baseline.courses, preference);
    if (baselineValidation.valid && baseline.courses.length > 0) {
      return finish(baseline, "deterministic");
    }
  }

  return fail("Tidak ada jadwal yang cocok dengan preferensimu.", { reason: result.reason });
}
