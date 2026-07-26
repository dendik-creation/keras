import { HttpError } from "@/lib/server/http-error";

const AI_API_KEY = process.env.AI_API_KEY;
const AI_BASE_URL = process.env.AI_BASE_URL || "https://api.openai.com/v1";
const AI_MODEL = process.env.AI_MODEL || "gpt-4o-mini";

export const AI_PROVIDER_CONFIG = { baseUrl: AI_BASE_URL, model: AI_MODEL };

export type AiUsage = { promptTokens: number | null; completionTokens: number | null };
export type AiCallResult = { content: string; usage: AiUsage };

/**
 * Thin OpenAI-compatible chat-completions client — the only piece of the
 * pipeline that talks to the network. Callers own retry/timeout handling
 * decisions; this just makes one call and returns the raw content + token
 * usage, or throws.
 */
export async function callAiModel(
  systemPrompt: string,
  userPrompt: string,
  temperature: number,
  timeoutMs: number,
): Promise<AiCallResult> {
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

  return {
    content,
    usage: {
      promptTokens: typeof json?.usage?.prompt_tokens === "number" ? json.usage.prompt_tokens : null,
      completionTokens:
        typeof json?.usage?.completion_tokens === "number" ? json.usage.completion_tokens : null,
    },
  };
}

/** Strip stray markdown fences in case the model ignores the "JSON only" instruction. */
export function extractJson(raw: string): unknown {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const candidate = fenced ? fenced[1] : trimmed;
  return JSON.parse(candidate);
}
