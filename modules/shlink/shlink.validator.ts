import { z } from "zod";
import { ValidationError } from "@/lib/server/http-error";

const createShortUrlBodySchema = z.object({
  longUrl: z.string().min(1, "longUrl wajib diisi"),
});

/** Parse & validate the body of POST /api/share-schedule. */
export function parseCreateShortUrlBody(body: unknown): string {
  const result = createShortUrlBodySchema.safeParse(body);
  if (!result.success) {
    throw new ValidationError("Body permintaan tidak valid.", {
      issues: result.error.issues.map((i) => ({
        path: i.path.join("."),
        message: i.message,
      })),
    });
  }
  return result.data.longUrl;
}

/** Validate the `shortCode` route param of GET /api/share-schedule/[shortCode]. */
export function parseShortCode(shortCode: string | undefined): string {
  if (!shortCode || shortCode.trim().length === 0) {
    throw new ValidationError("Kode short link tidak valid.");
  }
  return shortCode;
}
