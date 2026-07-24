import { HttpError } from "@/lib/server/http-error";
import type { CourseSchedule } from "@/types/course_schedule";
import {
  buildSystemPrompt,
  buildUserPrompt,
  MAX_AI_RETRIES,
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
import { prefilterCourses, toLightweightPayload } from "@/modules/schedule-ai/schedule-ai.utils";
import { runGreedyBacktrackOptimizer } from "@/modules/schedule-ai/schedule-ai.optimizer";

const AI_API_KEY = process.env.AI_API_KEY;
const AI_BASE_URL = process.env.AI_BASE_URL || "https://api.openai.com/v1";
const AI_MODEL = process.env.AI_MODEL || "gpt-4o-mini";
const REQUEST_TIMEOUT_MS = 25_000;

/** Call an OpenAI-compatible chat completions endpoint and return the raw text reply. */
async function callAiModel(
  systemPrompt: string,
  userPrompt: string,
  temperature: number,
): Promise<string> {
  if (!AI_API_KEY) {
    console.error("[schedule-ai] AI_API_KEY not configured");
    throw new HttpError(500, "Fitur AI belum dikonfigurasi di server.");
  }

  console.log("[schedule-ai] calling AI provider", {
    baseUrl: AI_BASE_URL,
    model: AI_MODEL,
    temperature,
    userPromptChars: userPrompt.length,
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
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
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
 * Generate a schedule for the given offering + preferences. Retries up to
 * MAX_AI_RETRIES times, feeding the previous failure reason back into the
 * prompt each time so a retry has a real chance of converging.
 */
export async function generateScheduleWithAI(
  availableCourses: CourseWithSemester[],
  preference: AiPreference,
): Promise<{ courses: CourseSchedule[] }> {
  // Deterministic pre-filter: drop every class that's hard-impossible for
  // this request (wrong day, outside the allowed time window) before the
  // AI or the fallback optimizer ever sees it. Smaller, conflict-reduced
  // search space for both.
  const candidateCourses = prefilterCourses(availableCourses, preference);
  const { payload, idMap } = toLightweightPayload(candidateCourses);
  const systemPrompt = buildSystemPrompt();

  console.log("[schedule-ai] payload built", {
    rawCourses: availableCourses.length,
    prefilteredCourses: candidateCourses.length,
    lightweightCourses: payload.courses.length,
  });

  if (payload.courses.length === 0) {
    console.error("[schedule-ai] no lightweight courses — nothing to schedule", {
      rawCourses: availableCourses.length,
      hint: "check that offeringCourses' courses have both day and hour filled in, and that preferred_days/earliest_start/latest_end aren't excluding everything",
    });
    throw new HttpError(422, "Tidak ada jadwal yang tersedia untuk dijadwalkan.");
  }

  let lastReason = "";
  let lastIssues: ScheduleValidationIssues | undefined;
  const attemptHistory: { attempt: number; reason: string }[] = [];

  for (let attempt = 0; attempt < MAX_AI_RETRIES; attempt++) {
    const userPrompt = buildUserPrompt(
      payload,
      preference,
      attempt > 0 ? lastIssues : undefined,
    );
    // Keep near-zero for determinism; nudge slightly on retries so a failed
    // attempt doesn't just repeat itself.
    const temperature = attempt === 0 ? 0 : Math.min(0.2 * attempt, 0.4);

    console.log(`[schedule-ai] attempt ${attempt + 1}/${MAX_AI_RETRIES} — calling AI`, {
      temperature,
      correctionIssues: attempt > 0 ? lastIssues : undefined,
    });

    let selectedIds: string[];
    try {
      const startedAt = Date.now();
      const raw = await callAiModel(systemPrompt, userPrompt, temperature);
      console.log(`[schedule-ai] attempt ${attempt + 1} — AI responded`, {
        ms: Date.now() - startedAt,
        rawPreview: raw.slice(0, 1500),
      });
      const parsedJson = extractJson(raw);
      const shortIds = parseAiRawResponse(parsedJson);
      console.log(`[schedule-ai] attempt ${attempt + 1} — parsed selection`, {
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
        console.warn(`[schedule-ai] attempt ${attempt + 1} — unknown id token(s)`, {
          unknownTokens,
        });
        attemptHistory.push({ attempt: attempt + 1, reason: lastReason });
        continue;
      }
    } catch (err) {
      const detail = err instanceof Error ? err.message : "unknown error";
      lastReason = `Output AI tidak valid: ${detail}`;
      lastIssues = undefined;
      console.error(`[schedule-ai] attempt ${attempt + 1} — AI call/parse failed`, {
        detail,
      });
      attemptHistory.push({ attempt: attempt + 1, reason: lastReason });
      continue;
    }

    const result = validateGeneratedSchedule(selectedIds, candidateCourses, preference);
    if (result.valid && result.courses.length > 0) {
      console.log(`[schedule-ai] attempt ${attempt + 1} — validation passed`, {
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
    console.warn(`[schedule-ai] attempt ${attempt + 1} — validation failed`, {
      reason: lastReason,
      selectedIds,
    });
    attemptHistory.push({ attempt: attempt + 1, reason: lastReason });
  }

  console.warn("[schedule-ai] AI attempts exhausted — running deterministic fallback optimizer", {
    attemptHistory,
  });

  // Deterministic fallback: AI preference-optimization gave up, but a valid
  // schedule can still be built without it. Greedy + backtracking over the
  // same pre-filtered candidates, never violating a hard constraint by
  // construction — this is what keeps the user from seeing an error in
  // practice.
  const fallbackCourses = runGreedyBacktrackOptimizer(candidateCourses, preference);
  if (fallbackCourses.length > 0) {
    console.log("[schedule-ai] fallback optimizer produced a schedule", {
      courses: fallbackCourses.length,
    });
    return { courses: fallbackCourses };
  }

  console.error("[schedule-ai] all attempts and fallback exhausted", { attemptHistory });

  throw new HttpError(422, "Tidak ada jadwal yang cocok dengan preferensimu.", {
    detail: lastReason,
    attemptHistory,
  });
}
