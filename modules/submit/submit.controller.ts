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
  filterRetryableScheduleIds,
  releaseSchedules,
  syncSchedules,
} from "@/modules/submit/submit.service";
import {
  simulateReleaseSchedules,
  simulateSubmitSchedules,
  simulateSyncSchedules,
  resetSimulatedSession,
} from "@/modules/submit/submit.simulator";
import { isWarTestMode } from "@/lib/server/war-test-mode";
import { logger } from "@/lib/logger";
import { generateIdempotencyKey, acquireSubmissionLease, releaseSubmissionLease } from "./submit.lease";
import { ResilienceEngine } from "./submit.resilience";
import { RetryEngine } from "./submit.retry";
import { StateMachine } from "./submit.state";
import { WAR_CONFIG } from "./submit.config";

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
import { captureWarLifecycleEvent, WarLifecycleEventName } from "@/lib/analytics/war-event-builder";
import { ProductionSubmissionExecutor, TestSubmissionExecutor } from "./submit.executor";

import { v4 as uuidv4 } from "uuid";

// We keep a lightweight adapter to map the old signature to our new standardized builder
function captureWarEvent(nim: string, eventName: WarLifecycleEventName, properties: any) {
  const mapped = {
    ...properties,
    submission_id: properties.request_id || "unknown"
  };
  delete mapped.request_id;
  captureWarLifecycleEvent(nim, eventName, mapped);
}

/** POST /api/submit — submit selected schedule ids ("perang submit"). */
export async function postSubmit(req: Request) {
  let nim = "unknown";
  const requestId = uuidv4();
  const requestStartTime = performance.now();
  // Guards the terminal-event guarantee (audit item 4/15): once a session
  // enters the queue it must always emit WAR_COMPLETED or WAR_FAILED, even
  // when an error path returns early (e.g. HttpError, stream-mode catch).
  let queueEntered = false;
  try {
    const sessionCookie = await getSessionCookie();
    if (!sessionCookie) return unauthorized();

    const body = await req.json();
    nim = body.nim || "unknown";
    const isTestMode = isWarTestMode();
    const mode = isTestMode ? "test" : "production";

    const acceptHeader = req.headers.get("accept") || "";
    const isStreamMode = body.stream !== false && (acceptHeader.includes("application/x-ndjson") || acceptHeader.includes("*/*") || acceptHeader === "");

    const cbState = await ResilienceEngine.getState();
    if (cbState === "OPEN") {
      const msg = "Upstream Busy: Server universitas sedang tidak stabil. Coba lagi dalam beberapa saat.";
      if (isStreamMode) {
        // Stream handled below, but we could return early. However, stream needs a stream response.
        // We'll throw an error and let the catch block handle it (which sends standard JSON).
        // Let's just return JSON for early rejection.
        return NextResponse.json({ success: false, message: msg }, { status: 503 });
      } else {
        return NextResponse.json({ success: false, message: msg }, { status: 503 });
      }
    }

    const verifySchedules = async (
      sessionValue: string, 
      wave1RemainingIds: string[], 
      currentResolvedSchedules?: { code: string; class: string; schedule_submit_id: string }[],
      attemptResult?: any
    ) => {
      if (!currentResolvedSchedules || currentResolvedSchedules.length === 0) return;
      
      const checkCourses = currentResolvedSchedules.filter(s => wave1RemainingIds.includes(s.schedule_submit_id)).map(s => ({ code: s.code, class: s.class }));
      if (checkCourses.length === 0) return;
      
      let verifiedIds: string[] = [];
      const MAX_VERIFY = WAR_CONFIG.VERIFY_MAX_ATTEMPTS;
      
      for (let vAttempt = 1; vAttempt <= MAX_VERIFY; vAttempt++) {
        await new Promise(r => setTimeout(r, WAR_CONFIG.VERIFY_INTERVAL_MS));
        try {
          const syncResult = isTestMode
            ? await simulateSyncSchedules(sessionValue, checkCourses)
            : await syncSchedules(sessionValue, checkCourses);
            
          if (syncResult.warStarted && syncResult.schedules) {
            syncResult.schedules.forEach(s => {
              if (s.schedule_submit_id === "") {
                const match = currentResolvedSchedules.find(rs => rs.code === s.code && rs.class === s.class);
                if (match && match.schedule_submit_id && !verifiedIds.includes(match.schedule_submit_id)) {
                  verifiedIds.push(match.schedule_submit_id);
                }
              }
            });
            
            // If all remaining are verified, break early
            if (verifiedIds.length === wave1RemainingIds.length) break;
          }
        } catch (e: any) {
          logger.error(`Error during verification attempt ${vAttempt}`, e?.message);
        }
      }
      
      if (verifiedIds.length > 0 && attemptResult) {
        const verifyMessage = {
          type: "success",
          title: "BERHASIL",
          items: verifiedIds.map(id => `[ID ${id}] Mata kuliah berhasil diverifikasi`)
        };
        attemptResult.messages = [...(attemptResult.messages || []), verifyMessage];
        attemptResult.isSuccess = true;
      }
    };

    if (!isStreamMode) {
      let scheduleIds: string[] = [];
      let targetCourses = body.courses;
      let resolvedSchedules: { code: string; class: string; schedule_submit_id: string }[] | undefined;

      if (targetCourses && Array.isArray(targetCourses)) {
        logger.info(`[war-gate]\nrequestId=${requestId}\nnim=${nim}\nmode=${mode}\nSubmit page scraped`);
        const syncResult = isTestMode
          ? await simulateSyncSchedules(sessionCookie.value, targetCourses)
          : await syncSchedules(sessionCookie.value, targetCourses);
        
        logger.info(`[war-gate]\nrequestId=${requestId}\nnim=${nim}\nmode=${mode}\nCheckbox values extracted`);

        if (syncResult.warStarted) {
          resolvedSchedules = syncResult.schedules;
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

      const idempotencyKey = generateIdempotencyKey(nim, sessionCookie.value, scheduleIds);
      const lockAcquired = await acquireSubmissionLease(idempotencyKey);
      if (!lockAcquired) {
        return NextResponse.json(
          { success: false, message: "Pengajuan sedang diproses. Jangan submit berulang-ulang." },
          { status: 429 }
        );
      }

      try {
        const params = new URLSearchParams();
      scheduleIds.forEach((id) => params.append("makul[]", id));
      const payloadStr = params.toString();

      const executor = isTestMode ? new TestSubmissionExecutor() : new ProductionSubmissionExecutor();

      // Wave 1: up to 2 attempts inside the priority gate.
      // Gate releases after Wave 1 → normal students proceed immediately.
      let wave1Remaining = [...scheduleIds];
      let wave1Result: any = null;
      let allMessages: any[] = [];

      captureWarLifecycleEvent(nim, "QUEUE_ENTERED", { submission_id: requestId, war_mode: mode });
      queueEntered = true;
      await processThroughGate(
        nim,
        isTestMode,
        payloadStr,
        async () => {
          captureWarLifecycleEvent(nim, "QUEUE_RELEASED", { submission_id: requestId, queue_wait_duration_ms: performance.now() - requestStartTime });
          captureWarLifecycleEvent(nim, "WAR_STARTED", { submission_id: requestId, total_courses: scheduleIds.length, stream: false });
          logger.info(`[war-gate]\nrequestId=${requestId}\nnim=${nim}\nmode=${mode}\nWave 1 Started`);
          const WAVE1_ATTEMPTS_NON_STREAM = 3;
          let attemptsRun = 0;
          for (let attempt = 1; attempt <= WAVE1_ATTEMPTS_NON_STREAM; attempt++) {
            if (wave1Remaining.length === 0 && attempt > 1) break;
            attemptsRun = attempt;
            captureWarLifecycleEvent(nim, "ATTEMPT_STARTED", { submission_id: requestId, attempt });
            const attemptStart = performance.now();
            const attemptResult = await executor.execute(sessionCookie.value, wave1Remaining, () => {
              captureWarLifecycleEvent(nim, "WAITING_RESPONSE", { submission_id: requestId, attempt });
            });
            captureWarLifecycleEvent(nim, "ATTEMPT_FINISHED", {
              submission_id: requestId,
              attempt,
              execution_duration_ms: performance.now() - attemptStart,
              result: attemptResult.isSuccess ? "success" : "failed",
              successful_courses: attemptResult.messages.length,
              http_status: attemptResult.statusCode
            });
            
            if (attemptResult.statusCode === 504) {
              captureWarLifecycleEvent(nim, "UNKNOWN_COMMIT_STATE", { submission_id: requestId, http_status: 504 });
              captureWarLifecycleEvent(nim, "VERIFYING", { submission_id: requestId });
              const vStart = performance.now();
              await verifySchedules(sessionCookie.value, wave1Remaining, resolvedSchedules, attemptResult);
              captureWarLifecycleEvent(nim, "BACKGROUND_VERIFYING", { submission_id: requestId, verification_duration_ms: performance.now() - vStart });
            }
            
            wave1Result = attemptResult;
            if (Array.isArray(attemptResult.messages)) {
              allMessages = [...allMessages, ...attemptResult.messages];
              wave1Remaining = filterSucceededScheduleIds(wave1Remaining, attemptResult.messages, resolvedSchedules);
            }
            if (wave1Remaining.length === 0) break;
            if (attempt < WAVE1_ATTEMPTS_NON_STREAM) {
              const delay = Math.min(1000 * Math.pow(2, attempt - 1) + Math.random() * 500, 5000);
              await new Promise((r) => setTimeout(r, delay));
            }
          }
          logger.info(`[war-gate]\nrequestId=${requestId}\nnim=${nim}\nmode=${mode}\nWave 1 Completed\nremainingCount=${wave1Remaining.length}`);
          const preparedCourses = scheduleIds.length;
          const successfulCourses = preparedCourses - wave1Remaining.length;
          const failedCourses = wave1Remaining.length;
          captureWarLifecycleEvent(nim, "WAR_COMPLETED", {
            submission_id: requestId,
            total_duration_ms: performance.now() - requestStartTime,
            queue_wait_duration_ms: performance.now() - requestStartTime,
            attempt: attemptsRun,
            prepared_courses: preparedCourses,
            successful_courses: successfulCourses,
            failed_courses: failedCourses,
            success_rate: preparedCourses > 0 ? successfulCourses / preparedCourses : 0,
            result: failedCourses === 0 ? "SUCCESS" : successfulCourses > 0 ? "PARTIAL_SUCCESS" : "FAILED",
          });
          return wave1Result;
        },
        requestStartTime,
        requestId
      );

      // Gate released — normal students can proceed.
      // Wave 2: one recovery attempt in background for retryable failures only.
      const wave2Ids = filterRetryableScheduleIds(wave1Remaining, allMessages);
      if (wave2Ids.length > 0) {
        // Fire-and-forget — do not await; normal queue is already unblocked.
        (async () => {
          try {
            logger.info(`[war-gate]\nrequestId=${requestId}\nnim=${nim}\nmode=${mode}\nWave 2 Started\nids=${wave2Ids.join(",")}`);
            const wave2Result = await executor.execute(sessionCookie.value, wave2Ids);
            if (Array.isArray(wave2Result.messages)) {
              allMessages = [...allMessages, ...wave2Result.messages];
            }
            logger.info(`[war-gate]\nrequestId=${requestId}\nnim=${nim}\nmode=${mode}\nWave 2 Completed`);
          } catch (e: any) {
            logger.error(`[war-gate] Wave 2 error: requestId=${requestId}`, e?.message);
          }
        })();
      }

        return NextResponse.json({
          success: wave1Result?.isSuccess ?? true,
          messages: wave1Result?.messages ?? [],
          status_code: wave1Result?.statusCode ?? 200,
        });
      } finally {
        await releaseSubmissionLease(idempotencyKey);
      }
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

          const idempotencyKey = generateIdempotencyKey(nim, sessionCookie.value, scheduleIds);
          const lockAcquired = await acquireSubmissionLease(idempotencyKey);
          if (!lockAcquired) {
            send({ type: "error", message: "Pengajuan sedang diproses. Jangan submit berulang-ulang.", status: 429 });
            controller.close();
            return;
          }

          let leaseReleased = false;
          try {
            const params = new URLSearchParams();
          scheduleIds.forEach((id) => params.append("makul[]", id));
          const payloadStr = params.toString();

          const executor = isTestMode ? new TestSubmissionExecutor() : new ProductionSubmissionExecutor();

          let finalResult: any = null;
          // Track remaining and all messages for Wave 2 classification.
          let wave1Remaining = [...scheduleIds];
          let allMessages: any[] = [];

          // Wave 1: up to 2 attempts inside the priority gate.
          // Gate releases after this block → normal students proceed immediately.
          captureWarLifecycleEvent(nim, "QUEUE_ENTERED", { submission_id: requestId, war_mode: mode });
          queueEntered = true;
          await processThroughGate(
            nim,
            isTestMode,
            payloadStr,
            async () => {
              captureWarLifecycleEvent(nim, "QUEUE_RELEASED", { submission_id: requestId, queue_wait_duration_ms: performance.now() - requestStartTime });
              captureWarLifecycleEvent(nim, "WAR_STARTED", { submission_id: requestId, total_courses: scheduleIds.length, stream: true });
              logger.info(`[war-gate]\nrequestId=${requestId}\nnim=${nim}\nmode=${mode}\nWave 1 Started`);
              const WAVE1_ATTEMPTS = 3;
              let attemptsRun = 0;

              for (let attempt = 1; attempt <= WAVE1_ATTEMPTS; attempt++) {
                attemptsRun = attempt;
                if (wave1Remaining.length === 0 && attempt > 1) {
                  send({
                    type: "event",
                    name: "PHASE_SKIPPED",
                    phase: attempt,
                    reason: "no_remaining_courses",
                  });
                  send({
                    type: "phase_skipped",
                    phase: attempt,
                    reason: "no_remaining_courses",
                  });
                  send({
                    type: "submission_finished",
                    completedAtPhase: attempt - 1,
                  });
                  send({
                    type: "event",
                    name: "SUBMISSION_FINISHED",
                    completedAtPhase: attempt - 1,
                  });
                  break;
                }

                send({
                  type: "event",
                  name: "ATTEMPT_STARTED",
                  attempt,
                });

                captureWarLifecycleEvent(nim, "ATTEMPT_STARTED", { submission_id: requestId, attempt });
            const attemptStart = performance.now();
            const attemptResult = await executor.execute(sessionCookie.value, wave1Remaining, () => {
              captureWarLifecycleEvent(nim, "WAITING_RESPONSE", { submission_id: requestId, attempt });
            });
            captureWarLifecycleEvent(nim, "ATTEMPT_FINISHED", {
              submission_id: requestId,
              attempt,
              execution_duration_ms: performance.now() - attemptStart,
              result: attemptResult.isSuccess ? "success" : "failed",
              successful_courses: attemptResult.messages.length,
              http_status: attemptResult.statusCode
            });
                finalResult = attemptResult;

                if (attemptResult.statusCode === 504) {
                  send({ type: "event", name: "UNKNOWN_COMMIT_STATE", message: "Koneksi terputus, status tidak diketahui..." });
                  send({ type: "event", name: "VERIFYING", message: "Memverifikasi status KRS..." });
                  await verifySchedules(sessionCookie.value, wave1Remaining, resolvedSchedules, attemptResult);
                }

                send({
                  type: "event",
                  name: "ATTEMPT_FINISHED",
                  attempt,
                  result: attemptResult,
                });

                if (Array.isArray(attemptResult.messages)) {
                  allMessages = [...allMessages, ...attemptResult.messages];
                  wave1Remaining = filterSucceededScheduleIds(wave1Remaining, attemptResult.messages, resolvedSchedules);
                }

                if (wave1Remaining.length === 0 && attempt < WAVE1_ATTEMPTS) {
                  send({
                    type: "event",
                    name: "PHASE_SKIPPED",
                    phase: attempt + 1,
                    reason: "no_remaining_courses",
                  });
                  send({
                    type: "phase_skipped",
                    phase: attempt + 1,
                    reason: "no_remaining_courses",
                  });
                  send({
                    type: "submission_finished",
                    completedAtPhase: attempt,
                  });
                  send({
                    type: "event",
                    name: "SUBMISSION_FINISHED",
                    completedAtPhase: attempt,
                  });
                  break;
                }

                if (attempt < WAVE1_ATTEMPTS && wave1Remaining.length > 0) {
                  const delay = Math.min(1000 * Math.pow(2, attempt - 1) + Math.random() * 500, 5000);
                  await new Promise((r) => setTimeout(r, delay));
                }
              }

              logger.info(`[war-gate]\nrequestId=${requestId}\nnim=${nim}\nmode=${mode}\nWave 1 Completed\nremainingCount=${wave1Remaining.length}`);
              const preparedCourses = scheduleIds.length;
              const successfulCourses = preparedCourses - wave1Remaining.length;
              const failedCourses = wave1Remaining.length;
              captureWarLifecycleEvent(nim, "WAR_COMPLETED", {
                submission_id: requestId,
                total_duration_ms: performance.now() - requestStartTime,
                queue_wait_duration_ms: performance.now() - requestStartTime,
                attempt: attemptsRun,
                prepared_courses: preparedCourses,
                successful_courses: successfulCourses,
                failed_courses: failedCourses,
                success_rate: preparedCourses > 0 ? successfulCourses / preparedCourses : 0,
                result: failedCourses === 0 ? "SUCCESS" : successfulCourses > 0 ? "PARTIAL_SUCCESS" : "FAILED",
              });
              send({ type: "event", name: "SUBMISSION_COMPLETED" });
              return finalResult;
            },
            requestStartTime,
            requestId,
            (eventName, meta) => {
              send({ type: "event", name: eventName, ...meta });
            }
          );

          // Gate released — normal students can proceed now.
          // Wave 2: one recovery attempt for retryable failures, fire-and-forget.
          const wave2Ids = filterRetryableScheduleIds(wave1Remaining, allMessages, resolvedSchedules);
          if (wave2Ids.length > 0) {
            (async () => {
              try {
                logger.info(`[war-gate]\nrequestId=${requestId}\nnim=${nim}\nmode=${mode}\nWave 2 Started\nids=${wave2Ids.join(",")}`);
                const wave2Result = await executor.execute(sessionCookie.value, wave2Ids);
                if (Array.isArray(wave2Result.messages)) {
                  allMessages = [...allMessages, ...wave2Result.messages];
                }
                logger.info(`[war-gate]\nrequestId=${requestId}\nnim=${nim}\nmode=${mode}\nWave 2 Completed`);
              } catch (e: any) {
                logger.error(`[war-gate] Wave 2 error: requestId=${requestId}`, e?.message);
              }
            })();
          }

            send({
              type: "done",
              success: finalResult?.isSuccess ?? true,
              messages: finalResult?.messages ?? [],
              status_code: finalResult?.statusCode ?? 200,
            });
          } finally {
            if (!leaseReleased) {
              await releaseSubmissionLease(idempotencyKey);
              leaseReleased = true;
            }
          }
        } catch (error: any) {
          const message = error?.message || "Terjadi kesalahan server saat submit.";
          if (queueEntered) {
            captureWarLifecycleEvent(nim, "WAR_FAILED", {
              submission_id: requestId,
              error_message: message,
              total_duration_ms: performance.now() - requestStartTime,
            });
          }
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
    if (queueEntered) {
      captureWarLifecycleEvent(nim, "WAR_FAILED", {
        submission_id: requestId,
        error_message: error.message,
        total_duration_ms: performance.now() - requestStartTime
      });
    }

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

/** DELETE /api/submit — release (drop) saved courses or reset simulation session. */
export async function deleteSubmit(req: Request) {
  try {
    const sessionCookie = await getSessionCookie();
    if (!sessionCookie) return unauthorized();

    const url = new URL(req.url);
    if (url.searchParams.get("reset") === "true") {
      if (isWarTestMode()) {
        resetSimulatedSession(sessionCookie.value);
      }
      return NextResponse.json({
        success: true,
        message: "Simulasi berhasil di-reset",
      });
    }

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
