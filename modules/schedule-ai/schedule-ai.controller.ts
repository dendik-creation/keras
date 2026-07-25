import { NextResponse } from "next/server";
import { isHttpError } from "@/lib/server/http-error";
import { getSessionCookie } from "@/lib/server/session";
import {
  parseAiPreference,
  parseOfferingCourses,
} from "@/modules/schedule-ai/schedule-ai.validator";
import { generateScheduleWithAI } from "@/modules/schedule-ai/schedule-ai.service";
import { flattenOfferingCourses } from "@/modules/schedule-ai/schedule-ai.utils";
import { logger } from "@/lib/logger";

const unauthorized = () =>
  NextResponse.json(
    { message: "Unauthorized: Silakan login terlebih dahulu" },
    { status: 401 },
  );

/**
 * POST /api/schedule-ai — generate an optimized schedule from student preferences.
 *
 * Streams newline-delimited JSON instead of one buffered response. AI +
 * repair + deterministic fallback is capped well under a minute, but a
 * plain request/response held open even that long risks a reverse proxy's
 * (Nginx Proxy Manager / Cloudflare) idle-read timeout killing the
 * connection before an already-successful backend result reaches the
 * client — the exact 504 this used to produce. Streaming status events
 * keeps the connection "active" the same way /api/schedule already does
 * for its (also tens-of-seconds) course scrape.
 */
export async function postGenerateSchedule(req: Request) {
  const startedAt = Date.now();
  const requestId = crypto.randomUUID();

  try {
    const sessionCookie = await getSessionCookie();
    if (!sessionCookie) return unauthorized();

    const body = await req.json();
    const preference = parseAiPreference(body);
    const offeringCourses = parseOfferingCourses(body.offeringCourses);
    const availableCourses = flattenOfferingCourses(offeringCourses);

    logger.log("[schedule-ai] request received", {
      requestId,
      semesterGroups: offeringCourses.length,
      totalCourses: availableCourses.length,
      preference,
    });

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (payload: Record<string, unknown>) =>
          controller.enqueue(encoder.encode(`${JSON.stringify(payload)}\n`));

        try {
          const { courses, mode } = await generateScheduleWithAI(
            availableCourses,
            preference,
            requestId,
            (event) => send({ type: "status", stage: event.stage }),
          );

          logger.log("[schedule-ai] request succeeded", {
            requestId,
            mode,
            selectedCourses: courses.length,
            totalMs: Date.now() - startedAt,
          });

          send({ type: "done", data: { courses } });
        } catch (error) {
          if (isHttpError(error)) {
            logger.error("[schedule-ai] request failed", {
              requestId,
              status: error.status,
              message: error.message,
              totalMs: Date.now() - startedAt,
            });
            send({ type: "error", message: error.message, ...error.payload });
          } else {
            const detail = error instanceof Error ? error.message : String(error);
            logger.error("[schedule-ai] request crashed", {
              requestId,
              detail,
              totalMs: Date.now() - startedAt,
            });
            send({
              type: "error",
              message: "Gagal menghasilkan jadwal. Silakan coba lagi.",
              detail,
            });
          }
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        // disable nginx response buffering, if present in front of this app
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    // Failures before the stream starts (bad session, malformed body/preference) — nothing was sent yet, plain JSON is fine.
    if (isHttpError(error)) {
      logger.error("[schedule-ai] request failed", {
        requestId,
        status: error.status,
        message: error.message,
        payload: error.payload,
        totalMs: Date.now() - startedAt,
      });
      return NextResponse.json(
        { message: error.message, ...error.payload },
        { status: error.status },
      );
    }

    const detail = error instanceof Error ? error.message : String(error);
    logger.error("[schedule-ai] request crashed", {
      requestId,
      detail,
      totalMs: Date.now() - startedAt,
    });
    return NextResponse.json(
      {
        message: "Gagal menghasilkan jadwal. Silakan coba lagi.",
        detail,
      },
      { status: 500 },
    );
  }
}
