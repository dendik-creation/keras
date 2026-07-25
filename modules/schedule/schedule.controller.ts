import { NextResponse } from "next/server";
import { getSessionCookie } from "@/lib/server/session";
import { getOfferingCourses } from "@/modules/schedule/schedule.service";
import { logger } from "@/lib/logger";

/**
 * GET /api/schedule
 *
 * Streams newline-delimited JSON so the connection keeps emitting bytes
 * for the whole (tens-of-seconds) scrape. The KRS host has no bulk detail
 * endpoint, so hydrating ~136 courses is inherently slow; a plain
 * request/response held open that long gets killed by intermediate
 * proxies/CDNs before the scrape finishes, discarding a response the
 * backend actually completed. Streaming progress keeps the connection
 * "active" and lets clients render progress instead of a frozen spinner.
 */
export async function getSchedule() {
  const start = Date.now();
  logger.log("[schedule] GET /api/schedule: request received");

  const sessionCookie = await getSessionCookie();
  if (!sessionCookie) {
    logger.log("[schedule] GET /api/schedule: no session cookie, 401");
    return NextResponse.json(
      { message: "Unauthorized: Silakan login terlebih dahulu" },
      { status: 401 },
    );
  }

  logger.log("[schedule] GET /api/schedule: session found, scraping offering courses");

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (payload: Record<string, unknown>) =>
        controller.enqueue(encoder.encode(`${JSON.stringify(payload)}\n`));

      try {
        const data = await getOfferingCourses(sessionCookie.value, (done, total) =>
          send({ type: "progress", done, total }),
        );
        logger.log(
          `[schedule] GET /api/schedule: success, ${data.length} semester groups, ${Date.now() - start}ms`,
        );
        send({ type: "done", data });
      } catch (error: any) {
        logger.error(
          `[schedule] GET /api/schedule: ERROR after ${Date.now() - start}ms —`,
          error.message,
        );
        send({ type: "error", message: error.message });
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
}
