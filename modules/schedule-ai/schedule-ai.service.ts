import { HttpError } from "@/lib/server/http-error";
import type { CourseSchedule } from "@/types/course_schedule";
import {
  buildSystemPrompt,
  buildUserPrompt,
  MAX_AI_RETRIES,
} from "@/modules/schedule-ai/schedule-ai.constants";
import type { AiPreference } from "@/modules/schedule-ai/schedule-ai.types";
import {
  parseAiRawResponse,
  validateGeneratedSchedule,
} from "@/modules/schedule-ai/schedule-ai.validator";
import { toLightweightPayload } from "@/modules/schedule-ai/schedule-ai.utils";

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
    throw new HttpError(500, "Fitur AI belum dikonfigurasi di server.");
  }

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
  availableCourses: CourseSchedule[],
  preference: AiPreference,
): Promise<{ courses: CourseSchedule[] }> {
  const payload = toLightweightPayload(availableCourses);
  const systemPrompt = buildSystemPrompt();

  if (payload.courses.length === 0) {
    throw new HttpError(422, "Tidak ada jadwal yang tersedia untuk dijadwalkan.");
  }

  let lastReason = "";

  for (let attempt = 0; attempt < MAX_AI_RETRIES; attempt++) {
    const userPrompt = buildUserPrompt(
      payload,
      preference,
      attempt > 0 ? lastReason : undefined,
    );
    // Keep near-zero for determinism; nudge slightly on retries so a failed
    // attempt doesn't just repeat itself.
    const temperature = attempt === 0 ? 0 : Math.min(0.2 * attempt, 0.4);

    let selectedIds: string[];
    try {
      const raw = await callAiModel(systemPrompt, userPrompt, temperature);
      const parsedJson = extractJson(raw);
      selectedIds = parseAiRawResponse(parsedJson);
    } catch (err) {
      const detail = err instanceof Error ? err.message : "unknown error";
      lastReason = `Output AI tidak valid: ${detail}`;
      continue;
    }

    const result = validateGeneratedSchedule(selectedIds, availableCourses, preference);
    if (result.valid && result.courses.length > 0) {
      return { courses: result.courses };
    }
    lastReason = result.valid
      ? "AI tidak menemukan kombinasi jadwal yang memenuhi preferensimu"
      : result.reason;
  }

  throw new HttpError(422, "Tidak ada jadwal yang cocok dengan preferensimu.", {
    detail: lastReason,
  });
}
