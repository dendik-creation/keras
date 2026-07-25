import { HttpError } from "@/lib/server/http-error";
import type { CourseSchedule } from "@/types/course_schedule";
import {
  buildSystemPrompt,
  buildUserPrompt,
  escalateTier,
  MAX_AI_RETRIES,
  pickPromptTier,
  timeoutForCandidates,
} from "@/modules/schedule-ai/schedule-ai.constants";
import type {
  AiPreference,
  CourseWithSemester,
  ScheduleValidationIssues,
} from "@/modules/schedule-ai/schedule-ai.types";
import {
  emptyValidationIssues,
  parseAiRawResponse,
  validateGeneratedSchedule,
} from "@/modules/schedule-ai/schedule-ai.validator";
import { prefilterCourses } from "@/modules/schedule-ai/schedule-ai.utils";
import { reduceCandidates } from "@/modules/schedule-ai/schedule-ai.reduce";
import { buildCompactPayload } from "@/modules/schedule-ai/schedule-ai.compact";
import { runGreedyBacktrackOptimizer } from "@/modules/schedule-ai/schedule-ai.optimizer";
import { logger } from "@/lib/logger";

const AI_API_KEY = process.env.AI_API_KEY;
const AI_BASE_URL = process.env.AI_BASE_URL || "https://api.openai.com/v1";
const AI_MODEL = process.env.AI_MODEL || "gpt-4o-mini";

/** Call an OpenAI-compatible chat completions endpoint and return the raw text reply. */
async function callAiModel(
  systemPrompt: string,
  userPrompt: string,
  temperature: number,
  timeoutMs: number,
): Promise<string> {
  if (!AI_API_KEY) {
    logger.error("[schedule-ai] AI_API_KEY not configured");
    throw new HttpError(500, "Fitur AI belum dikonfigurasi di server.");
  }

  const payloadBytes =
    Buffer.byteLength(systemPrompt, "utf8") + Buffer.byteLength(userPrompt, "utf8");

  logger.log("[schedule-ai] calling AI provider", {
    baseUrl: AI_BASE_URL,
    model: AI_MODEL,
    temperature,
    timeoutMs,
    userPromptChars: userPrompt.length,
    payloadBytes,
    estimatedTokens: Math.ceil(payloadBytes / 4),
  });

  const response = await fetch(`${AI_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${AI_API_KEY}`,
    },
    body: JSON.stringify({
      model: AI_MODEL,
      temperature,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`AI provider error (${response.status}): ${detail.slice(0, 300)}`);
  }

  const json = await response.json();
  const content = json?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    throw new Error("AI provider returned an empty response");
  }
  return content;
}

/** Strip stray markdown fences in case the model ignores the "JSON only" instruction. */
function extractJson(raw: string): unknown {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const candidate = fenced ? fenced[1] : trimmed;
  return JSON.parse(candidate);
}

/**
 * Generate a schedule for the given offering + preferences.
 *
 * Pipeline: deterministic hard-filter -> deterministic candidate reduction
 * (top-N per course, ranked by the same scoring engine the fallback
 * optimizer uses) -> either skip the AI entirely when there's no real
 * choice left to make, or call it with a compact, dictionary-free, tiered
 * prompt and validate its answer server-side. Retries up to MAX_AI_RETRIES
 * times, escalating to a terser prompt tier and feeding the previous
 * failure back in each time. Falls back to the same deterministic
 * optimizer if every attempt fails.
 */
export async function generateScheduleWithAI(
  availableCourses: CourseWithSemester[],
  preference: AiPreference,
): Promise<{ courses: CourseSchedule[] }> {
  // Deterministic pre-filter: drop every class that's hard-impossible for
  // this request (wrong day, outside the allowed time window, avoided
  // lecturer/course) before the AI or the fallback optimizer ever sees it.
  const candidateCourses = prefilterCourses(availableCourses, preference);

  // Deterministic candidate reduction: rank classes within each course and
  // keep only the top few — the AI never needs to weigh every section.
  const { courses: reducedCourses, groupCount, allSingleChoice } = reduceCandidates(
    candidateCourses,
    preference,
  );

  logger.log("[schedule-ai] payload built", {
    rawCourses: availableCourses.length,
    prefilteredCourses: candidateCourses.length,
    courseGroups: groupCount,
    reducedCandidates: reducedCourses.length,
  });

  if (reducedCourses.length === 0) {
    logger.error("[schedule-ai] no candidates — nothing to schedule", {
      rawCourses: availableCourses.length,
      hint: "check that offeringCourses' courses have both day and hour filled in, and that preferred_days/earliest_start/latest_end/avoid_* aren't excluding everything",
    });
    throw new HttpError(422, "Tidak ada jadwal yang tersedia untuk dijadwalkan.");
  }

  // Phase 12 local heuristic: every course already has at most one
  // surviving candidate, so there's no preference trade-off left for an
  // LLM to reason about — skip the network call entirely.
  if (allSingleChoice) {
    const heuristicCourses = runGreedyBacktrackOptimizer(candidateCourses, preference);
    logger.log("[schedule-ai] deterministic heuristic — skipping AI", {
      courses: heuristicCourses.length,
    });
    if (heuristicCourses.length > 0) {
      return { courses: heuristicCourses };
    }
  }

  const { payload, idMap } = buildCompactPayload(reducedCourses, preference);
  const baseTier = pickPromptTier(reducedCourses.length);
  const timeoutMs = timeoutForCandidates(reducedCourses.length);

  let lastReason = "";
  let lastIssues: ScheduleValidationIssues | undefined;
  const attemptHistory: { attempt: number; reason: string }[] = [];

  for (let attempt = 0; attempt < MAX_AI_RETRIES; attempt++) {
    const tier = escalateTier(baseTier, attempt);
    const systemPrompt = buildSystemPrompt(tier);
    const userPrompt = buildUserPrompt(payload, attempt > 0 ? lastIssues : undefined);
    // Keep near-zero for determinism; nudge slightly on retries so a failed
    // attempt doesn't just repeat itself.
    const temperature = attempt === 0 ? 0 : Math.min(0.2 * attempt, 0.4);

    logger.log(`[schedule-ai] attempt ${attempt + 1}/${MAX_AI_RETRIES} — calling AI`, {
      tier,
      temperature,
      correctionIssues: attempt > 0 ? lastIssues : undefined,
    });

    let selectedIds: string[];
    try {
      const startedAt = Date.now();
      const raw = await callAiModel(systemPrompt, userPrompt, temperature, timeoutMs);
      logger.log(`[schedule-ai] attempt ${attempt + 1} — AI responded`, {
        ms: Date.now() - startedAt,
        rawPreview: raw.slice(0, 1500),
      });
      const parsedJson = extractJson(raw);
      const shortIds = parseAiRawResponse(parsedJson);
      logger.log(`[schedule-ai] attempt ${attempt + 1} — parsed selection`, {
        selectedCount: shortIds.length,
        shortIds,
      });

      // Translate the model's short reference tokens back into real
      // schedule_ids. An unknown token here means the model invented or
      // mangled a token — treat it the same as an invalid selection.
      selectedIds = [];
      const unknownTokens: string[] = [];
      for (const shortId of shortIds) {
        const realId = idMap.get(shortId);
        if (!realId) {
          unknownTokens.push(shortId);
          continue;
        }
        selectedIds.push(realId);
      }
      if (unknownTokens.length > 0) {
        lastReason = `AI mengembalikan id yang tidak dikenal: ${unknownTokens.join(", ")}`;
        lastIssues = emptyValidationIssues({ invalid_id: unknownTokens });
        logger.warn(`[schedule-ai] attempt ${attempt + 1} — unknown id token(s)`, {
          unknownTokens,
        });
        attemptHistory.push({ attempt: attempt + 1, reason: lastReason });
        continue;
      }
    } catch (err) {
      const detail = err instanceof Error ? err.message : "unknown error";
      lastReason = `Output AI tidak valid: ${detail}`;
      lastIssues = undefined;
      logger.error(`[schedule-ai] attempt ${attempt + 1} — AI call/parse failed`, {
        detail,
      });
      attemptHistory.push({ attempt: attempt + 1, reason: lastReason });
      continue;
    }

    const validationStartedAt = Date.now();
    const result = validateGeneratedSchedule(selectedIds, candidateCourses, preference);
    logger.log(`[schedule-ai] attempt ${attempt + 1} — validation`, {
      valid: result.valid,
      ms: Date.now() - validationStartedAt,
    });
    if (result.valid && result.courses.length > 0) {
      logger.log(`[schedule-ai] attempt ${attempt + 1} — validation passed`, {
        courses: result.courses.length,
      });
      return { courses: result.courses };
    }
    if (result.valid) {
      lastReason = "AI tidak menemukan kombinasi jadwal yang memenuhi preferensimu";
      lastIssues = undefined;
    } else {
      lastReason = result.reason;
      lastIssues = result.issues;
    }
    logger.warn(`[schedule-ai] attempt ${attempt + 1} — validation failed`, {
      reason: lastReason,
      selectedIds,
    });
    attemptHistory.push({ attempt: attempt + 1, reason: lastReason });
  }

  logger.warn("[schedule-ai] AI attempts exhausted — running deterministic fallback optimizer", {
    attemptHistory,
  });

  // Deterministic fallback: AI preference-optimization gave up, but a valid
  // schedule can still be built without it. Greedy + backtracking over the
  // full pre-filtered candidate set (not just the reduced top-N, to
  // preserve schedule quality), never violating a hard constraint by
  // construction — this is what keeps the user from seeing an error in
  // practice.
  const fallbackCourses = runGreedyBacktrackOptimizer(candidateCourses, preference);
  if (fallbackCourses.length > 0) {
    logger.log("[schedule-ai] fallback optimizer produced a schedule", {
      courses: fallbackCourses.length,
      fallbackTriggered: true,
    });
    return { courses: fallbackCourses };
  }

  logger.error("[schedule-ai] all attempts and fallback exhausted", {
    attemptHistory,
    fallbackTriggered: true,
  });

  throw new HttpError(422, "Tidak ada jadwal yang cocok dengan preferensimu.", {
    detail: lastReason,
    attemptHistory,
  });
}
