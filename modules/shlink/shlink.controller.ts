import { NextRequest, NextResponse } from "next/server";
import { isHttpError } from "@/lib/server/http-error";
import { envVariable } from "@/lib/utils";
import {
  createShortUrl,
  extractIdsFromLongUrl,
  getLongUrlByShortCode,
  validateLongUrl,
} from "@/modules/shlink/shlink.service";
import {
  parseCreateShortUrlBody,
  parseShortCode,
} from "@/modules/shlink/shlink.validator";
import { logger } from "@/lib/logger";

function errorResponse(error: unknown, fallbackMessage: string) {
  if (isHttpError(error)) {
    return NextResponse.json(
      { message: error.message, ...error.payload },
      { status: error.status },
    );
  }
  const detail = error instanceof Error ? error.message : String(error);
  logger.error("[shlink]", fallbackMessage, detail);
  return NextResponse.json(
    { message: fallbackMessage, detail },
    { status: 500 },
  );
}

function getAppHost(): string {
  if (!envVariable.APP_URL) {
    throw new Error("APP_URL env var is missing.");
  }
  try {
    return new URL(envVariable.APP_URL).host;
  } catch {
    throw new Error(`APP_URL env var is not a valid URL: "${envVariable.APP_URL}"`);
  }
}

/** POST /api/share-schedule  body: { longUrl: string } */
export async function createShareSchedule(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const longUrl = parseCreateShortUrlBody(body);
    logger.log("[shlink] create: request", { longUrl });

    const appHost = getAppHost();
    validateLongUrl(longUrl, appHost);

    const shortCode = await createShortUrl(longUrl);
    const shortUrl = new URL(
      `/share-schedule/${shortCode}`,
      envVariable.APP_URL,
    ).toString();
    logger.log("[shlink] create: success", { shortCode, shortUrl });

    return NextResponse.json({ success: true, data: { shortUrl } });
  } catch (error) {
    return errorResponse(error, "Gagal membuat link berbagi.");
  }
}

/** GET /api/share-schedule/[shortCode] */
export async function resolveShareSchedule(
  _req: NextRequest,
  { params }: { params: Promise<{ shortCode: string }> },
) {
  try {
    const { shortCode } = await params;
    parseShortCode(shortCode);
    logger.log("[shlink] resolve: request", { shortCode });

    const longUrl = await getLongUrlByShortCode(shortCode);

    const appHost = getAppHost();
    const ids = extractIdsFromLongUrl(longUrl, appHost);
    logger.log("[shlink] resolve: success", {
      shortCode,
      longUrl,
      idCount: ids.split(",").filter(Boolean).length,
    });

    return NextResponse.json({ success: true, data: { longUrl } });
  } catch (error) {
    return errorResponse(error, "Gagal membuka link berbagi.");
  }
}
