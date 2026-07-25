import {
  buildRepairSystemPrompt,
  buildRepairUserPrompt,
  REPAIR_TIMEOUT_MS,
} from "@/modules/schedule-ai/schedule-ai.constants";
import { callAiModel, extractJson, type AiUsage } from "@/modules/schedule-ai/schedule-ai.provider";
import { parseAiRawResponse } from "@/modules/schedule-ai/schedule-ai.validator";
import type { ScheduleValidationIssues } from "@/modules/schedule-ai/schedule-ai.types";

/**
 * Only overlap/duplicate-course/SKS problems are fixable by "remove the
 * offending entry" — an invalid_id means the model returned a token that
 * was never offered, which repair-by-removal can't meaningfully act on
 * (there's no replacement candidate in a repair prompt to swap it for), so
 * that case skips straight to the deterministic fallback instead.
 */
export function isRepairable(issues: ScheduleValidationIssues): boolean {
  return (
    issues.invalid_id.length === 0 &&
    (issues.duplicate_course.length > 0 || issues.overlap.length > 0 || issues.sks_exceeded)
  );
}

export type RepairOutcome =
  | { ok: true; shortIds: string[]; usage: AiUsage; ms: number }
  | { ok: false; detail: string; ms: number };

/**
 * One tiny follow-up AI call: previously selected short ids + the problems
 * found, nothing else — no candidate data, no full regenerate. If this
 * fails or times out, the caller falls back to the deterministic optimizer
 * immediately; there's no third AI attempt.
 */
export async function attemptRepair(
  selectedShortIds: string[],
  issues: ScheduleValidationIssues,
): Promise<RepairOutcome> {
  const startedAt = Date.now();
  try {
    const systemPrompt = buildRepairSystemPrompt();
    const userPrompt = buildRepairUserPrompt(selectedShortIds, issues);
    const { content, usage } = await callAiModel(systemPrompt, userPrompt, 0, REPAIR_TIMEOUT_MS);
    const shortIds = parseAiRawResponse(extractJson(content));
    return { ok: true, shortIds, usage, ms: Date.now() - startedAt };
  } catch (err) {
    const detail = err instanceof Error ? err.message : "unknown error";
    return { ok: false, detail, ms: Date.now() - startedAt };
  }
}
