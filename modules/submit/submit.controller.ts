import { NextResponse } from "next/server";
import { isHttpError } from "@/lib/server/http-error";
import { getSessionCookie } from "@/lib/server/session";
import {
  parseDeleteCourses,
  parseSyncCourses,
  validateScheduleIds,
} from "@/modules/submit/submit.validator";
import {
  filterSucceededScheduleIds,
  releaseSchedules,
  syncSchedules,
} from "@/modules/submit/submit.service";
import {
  simulateReleaseSchedules,
  simulateSubmitSchedules,
  simulateSyncSchedules,
} from "@/modules/submit/submit.simulator";
import { isWarTestMode } from "@/lib/server/war-test-mode";
import { logger } from "@/lib/logger";

const httpErrorResponse = (error: unknown) => {
  if (isHttpError(error)) {
    return NextResponse.json(
      { message: error.message, ...error.payload },
      { status: error.status },
    );
  }
  return null;
};

const unauthorized = () =>
  NextResponse.json(
    { message: "Unauthorized: Sesi habis, silakan login kembali." },
    { status: 401 },
  );

/** GET /api/submit — sync target courses to their submit-form ids. */
export async function syncSubmit(req: Request) {
  const sessionCookie = await getSessionCookie();
  if (!sessionCookie) return unauthorized();

  const { searchParams } = new URL(req.url);

  let targetCourses;
  try {
    targetCourses = parseSyncCourses(searchParams);
  } catch (error) {
    const mapped = httpErrorResponse(error);
    if (mapped) return mapped;
    throw error;
  }

  let result;
  try {
    result = isWarTestMode()
      ? await simulateSyncSchedules(sessionCookie.value, targetCourses)
      : await syncSchedules(sessionCookie.value, targetCourses);
  } catch (error: any) {
    const mapped = httpErrorResponse(error);
    if (mapped) return mapped;
    
    logger.error("SYNC ERROR:", error.message);
    return NextResponse.json(
      {
        success: false,
        message: "Terjadi kesalahan server saat sinkronisasi jadwal.",
        detail: error.message,
      },
      { status: 500 },
    );
  }

  if (!result.warStarted) {
    return NextResponse.json(
      {
        success: false,
        message: "Waktu perang KRS belum dimulai",
      },
      { status: 200 },
    );
  }

  return NextResponse.json(
    {
      success: true,
      message: "Sinkronisasi status jadwal berhasil",
      data: result.schedules,
    },
    { status: 200 },
  );
}

import { processThroughGate } from "@/lib/server/war-gate";
import { ProductionSubmissionExecutor, TestSubmissionExecutor } from "./submit.executor";

import { v4 as uuidv4 } from "uuid";

/** POST /api/submit — submit selected schedule ids ("perang submit"). */
export async function postSubmit(req: Request) {
  try {
    const sessionCookie = await getSessionCookie();
    if (!sessionCookie) return unauthorized();

    const body = await req.json();
    const nim = body.nim || "unknown";
    const isTestMode = isWarTestMode();
    const mode = isTestMode ? "test" : "production";
    const requestId = uuidv4();
    const requestStartTime = performance.now();

    const acceptHeader = req.headers.get("accept") || "";
    const isStreamMode = body.stream !== false && (acceptHeader.includes("application/x-ndjson") || acceptHeader.includes("*/*") || acceptHeader === "");

    if (!isStreamMode) {
      let scheduleIds: string[] = [];

      if (body.courses && Array.isArray(body.courses)) {
        const targetCourses = body.courses;
        
        logger.info(`[war-gate]\nrequestId=${requestId}\nnim=${nim}\nmode=${mode}\nSubmit page scraped`);
        const syncResult = isTestMode
          ? await simulateSyncSchedules(sessionCookie.value, targetCourses)
          : await syncSchedules(sessionCookie.value, targetCourses);
        
        logger.info(`[war-gate]\nrequestId=${requestId}\nnim=${nim}\nmode=${mode}\nCheckbox values extracted`);

        if (syncResult.warStarted) {
          scheduleIds = syncResult.schedules
            .map(s => s.schedule_submit_id)
            .filter(id => id !== "");
        } else {
          return NextResponse.json(
            { success: false, message: "Waktu perang KRS belum dimulai" },
            { status: 400 }
          );
        }
      } else {
        const validated = validateScheduleIds(body);
        scheduleIds = validated.scheduleIds;
      }

      if (!scheduleIds || scheduleIds.length === 0) {
        return NextResponse.json(
          { success: false, message: "Tidak ada jadwal yang dipilih atau ditemukan" },
          { status: 400 }
        );
      }

      const params = new URLSearchParams();
      scheduleIds.forEach((id) => params.append("makul[]", id));
      const payloadStr = params.toString();

      const executor = isTestMode ? new TestSubmissionExecutor() : new ProductionSubmissionExecutor();

      const result = await processThroughGate(
        nim,
        isTestMode,
        payloadStr,
        async () => {
          return await executor.execute(sessionCookie.value, scheduleIds);
        },
        requestStartTime,
        requestId
      );

      return NextResponse.json({
        success: result.isSuccess,
        messages: result.messages,
        status_code: result.statusCode,
      });
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (payload: Record<string, unknown>) => {
          try {
            controller.enqueue(encoder.encode(`${JSON.stringify(payload)}\n`));
          } catch (e) {
            // Stream closed
          }
        };

        try {
          send({ type: "event", name: "PREPARATION_STARTED", message: "Memulai persiapan request submit" });

          let scheduleIds: string[] = [];
          let targetCourses = body.courses;
          let resolvedSchedules: { code: string; class: string; schedule_submit_id: string }[] | undefined;

          if (targetCourses && Array.isArray(targetCourses)) {
            logger.info(`[war-gate]\nrequestId=${requestId}\nnim=${nim}\nmode=${mode}\nSubmit page scraped`);
            send({ type: "event", name: "SUBMIT_PAGE_SCRAPED", message: "Submit page scraped" });

            const syncResult = isTestMode
              ? await simulateSyncSchedules(sessionCookie.value, targetCourses)
              : await syncSchedules(sessionCookie.value, targetCourses);

            logger.info(`[war-gate]\nrequestId=${requestId}\nnim=${nim}\nmode=${mode}\nCheckbox values extracted`);
            send({ type: "event", name: "CHECKBOX_VALUES_EXTRACTED", message: "Checkbox values extracted" });

            if (syncResult.warStarted) {
              resolvedSchedules = syncResult.schedules;
              scheduleIds = syncResult.schedules
                .map((s) => s.schedule_submit_id)
                .filter((id) => id !== "");
            } else {
              send({ type: "error", message: "Waktu perang KRS belum dimulai", status: 400 });
              controller.close();
              return;
            }
          } else {
            const validated = validateScheduleIds(body);
            scheduleIds = validated.scheduleIds;
          }

          if (!scheduleIds || scheduleIds.length === 0) {
            send({ type: "error", message: "Tidak ada jadwal yang dipilih atau ditemukan", status: 400 });
            controller.close();
            return;
          }

          const params = new URLSearchParams();
          scheduleIds.forEach((id) => params.append("makul[]", id));
          const payloadStr = params.toString();

          const executor = isTestMode ? new TestSubmissionExecutor() : new ProductionSubmissionExecutor();

          let finalResult: any = null;

          await processThroughGate(
            nim,
            isTestMode,
            payloadStr,
            async () => {
              let currentRemaining = [...scheduleIds];
              const TOTAL_ATTEMPTS = 3;

              for (let attempt = 1; attempt <= TOTAL_ATTEMPTS; attempt++) {
                if (currentRemaining.length === 0 && attempt > 1) break;

                send({
                  type: "event",
                  name: "ATTEMPT_STARTED",
                  attempt,
                });

                const attemptResult = await executor.execute(sessionCookie.value, currentRemaining);
                finalResult = attemptResult;

                send({
                  type: "event",
                  name: "ATTEMPT_FINISHED",
                  attempt,
                  result: attemptResult,
                });

                if (Array.isArray(attemptResult.messages)) {
                  currentRemaining = filterSucceededScheduleIds(currentRemaining, attemptResult.messages, resolvedSchedules);
                }

                if (attempt < TOTAL_ATTEMPTS && currentRemaining.length > 0) {
                  await new Promise((r) => setTimeout(r, 300));
                }
              }

              send({ type: "event", name: "SUBMISSION_COMPLETED" });
              return finalResult;
            },
            requestStartTime,
            requestId,
            (eventName, meta) => {
              send({ type: "event", name: eventName, ...meta });
            }
          );

          send({
            type: "done",
            success: finalResult?.isSuccess ?? true,
            messages: finalResult?.messages ?? [],
            status_code: finalResult?.statusCode ?? 200,
          });
        } catch (error: any) {
          const message = error?.message || "Terjadi kesalahan server saat submit.";
          send({ type: "error", message, status: 500 });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error: any) {
    const mapped = httpErrorResponse(error);
    if (mapped) return mapped;

    logger.error("SUBMIT ERROR:", error.message);
    return NextResponse.json(
      {
        success: false,
        message: "Terjadi kesalahan server saat submit.",
        detail: error.message,
      },
      { status: 500 },
    );
  }
}

/** DELETE /api/submit — release (drop) saved courses. */
export async function deleteSubmit(req: Request) {
  try {
    const sessionCookie = await getSessionCookie();
    if (!sessionCookie) return unauthorized();

    const targetCourses = parseDeleteCourses(await req.json());

    const result = isWarTestMode()
      ? await simulateReleaseSchedules(sessionCookie.value, targetCourses)
      : await releaseSchedules(sessionCookie.value, targetCourses);

    if (!result.matched) {
      return NextResponse.json(
        {
          success: false,
          message: "Tidak ditemukan jadwal yang cocok untuk dihapus.",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: result.isSuccess,
      message: result.message,
      deleted_ids: result.deletedIds,
    });
  } catch (error: any) {
    const mapped = httpErrorResponse(error);
    if (mapped) return mapped;

    logger.error("DELETE ERROR:", error.message);
    return NextResponse.json(
      {
        success: false,
        message: "Terjadi kesalahan server saat menghapus jadwal.",
        detail: error.message,
      },
      { status: 500 },
    );
  }
}
