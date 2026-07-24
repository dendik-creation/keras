import axios from "axios";
import { envVariable } from "@/lib/utils";
import { HttpError, ValidationError } from "@/lib/server/http-error";
import type {
  ShlinkCreateShortUrlResponse,
  ShlinkErrorResponse,
  ShlinkShortUrlDetails,
} from "@/modules/shlink/shlink.types";

const shlinkClient = axios.create({
  baseURL: envVariable.SHLINK_BASE_URL,
  headers: {
    "X-Api-Key": envVariable.SHLINK_API_KEY,
    "Content-Type": "application/json",
  },
  timeout: 10_000,
});

/** Translate a failed Shlink call into the app's HttpError so controllers stay uniform. */
function toHttpError(error: unknown, fallbackMessage: string): HttpError {
  if (axios.isAxiosError<ShlinkErrorResponse>(error)) {
    if (error.response?.status === 404) {
      return new HttpError(404, "Short link tidak ditemukan.");
    }
    if (error.response) {
      return new HttpError(
        502,
        error.response.data?.detail || error.response.data?.title || fallbackMessage,
      );
    }
    return new HttpError(502, "Shlink tidak dapat dihubungi.");
  }
  return new HttpError(500, fallbackMessage);
}

/** POST /rest/v3/short-urls — store a long URL in Shlink and return its shortCode. */
export async function createShortUrl(longUrl: string): Promise<string> {
  try {
    const response = await shlinkClient.post<ShlinkCreateShortUrlResponse>(
      "/rest/v3/short-urls",
      { longUrl },
    );
    return response.data.shortCode;
  } catch (error) {
    throw toHttpError(error, "Gagal membuat short link.");
  }
}

/** GET /rest/v3/short-urls/{shortCode} — resolve a shortCode back to its stored long URL. */
export async function getLongUrlByShortCode(shortCode: string): Promise<string> {
  try {
    const response = await shlinkClient.get<ShlinkShortUrlDetails>(
      `/rest/v3/short-urls/${encodeURIComponent(shortCode)}`,
    );
    return response.data.longUrl;
  } catch (error) {
    throw toHttpError(error, "Gagal mengambil short link.");
  }
}

/**
 * Ensure a long URL belongs to this app's own origin before trusting it — Shlink
 * is a generic shortener, so nothing stops a stored longUrl from pointing
 * elsewhere (a stale domain, or someone else's link created with the same key).
 */
export function validateLongUrl(longUrl: string, expectedHost: string): URL {
  let url: URL;
  try {
    url = new URL(longUrl);
  } catch {
    throw new ValidationError("URL tidak valid.");
  }
  if (url.host !== expectedHost) {
    throw new ValidationError("Domain URL tidak diizinkan.");
  }
  return url;
}

/** Validate the long URL, then pull its `ids` query param out via the URL API. */
export function extractIdsFromLongUrl(longUrl: string, expectedHost: string): string {
  const url = validateLongUrl(longUrl, expectedHost);
  const ids = url.searchParams.get("ids");
  if (!ids) {
    throw new ValidationError("Parameter ids tidak ditemukan pada URL.");
  }
  return ids;
}
