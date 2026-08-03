import { v4 as uuidv4 } from "uuid";
import { getRedisClient } from "./redis";
import { logger } from "@/lib/logger";
import { envVariable } from "@/lib/utils";
import { EventEmitter } from "events";
import { ResilienceEngine } from "@/modules/submit/submit.resilience";


const warEvents = new EventEmitter();
warEvents.setMaxListeners(0);

let isSubscribed = false;

async function ensureSubscription(redis: any) {
  if (isSubscribed) return;
  isSubscribed = true;
  try {
    const sub = redis.duplicate();
    await sub.subscribe("war:events");
    sub.on("message", (channel: string, message: string) => {
      if (channel === "war:events") {
        warEvents.emit("state_changed");
      }
    });
  } catch (e) {
    logger.error("Failed to subscribe to war:events", e);
    isSubscribed = false;
  }
}

export function _test_cleanup() {
  isSubscribed = false;
  warEvents.removeAllListeners();
}

function waitForStateChange(timeoutMs: number) {
  return new Promise<void>((resolve) => {
    if (timeoutMs <= 0) return resolve();
    let resolved = false;
    const t = setTimeout(() => {
      if (resolved) return;
      resolved = true;
      warEvents.off("state_changed", onEvent);
      resolve();
    }, timeoutMs);
    const onEvent = () => {
      if (resolved) return;
      resolved = true;
      clearTimeout(t);
      warEvents.off("state_changed", onEvent);
      resolve();
    };
    warEvents.on("state_changed", onEvent);
  });
}

interface PendingSubmission {
  requestId: string;
  nim: string;
  createdAt: number;
  priority: boolean;
  payload: any;
}

interface LogContext {
  requestId: string;
  nim: string;
  isTestMode: boolean;
  isPriority: boolean;
  executionType?: "priority" | "normal";
}

function logWarGate(
  ctx: LogContext,
  message: string,
  extraKv?: Record<string, string | number | boolean>
) {
  const mode = ctx.isTestMode ? "test" : "production";
  const lines = [
    `[war-gate]`,
    `requestId=${ctx.requestId}`,
    `nim=${ctx.nim}`,
    `mode=${mode}`,
    `priority=${ctx.isPriority}`,
  ];
  if (ctx.executionType) {
    lines.push(`executionType=${ctx.executionType}`);
  }
  lines.push(message);
  if (extraKv) {
    for (const [k, v] of Object.entries(extraKv)) {
      if (v !== undefined) {
        lines.push(`${k}=${v}`);
      }
    }
  }
  logger.info(lines.join("\n"));
}

export async function processThroughGate(
  nim: string,
  isTestMode: boolean,
  payload: any,
  executeSubmit: () => Promise<any>,
  requestStartTime: number = performance.now(),
  providedRequestId?: string,
  onGateEvent?: (event: string, meta?: any) => void
) {
  const redis = getRedisClient();
  const ENABLED = envVariable.WAR_PRIORITY_ENABLED;

  if (!ENABLED || !redis) {
    onGateEvent?.("EXECUTION_GRANTED", { executionType: "normal", reason: "gate_disabled" });
    return await executeSubmit();
  }

  if (redis.status !== "ready") {
    try {
      await redis.ping();
    } catch (e) {
      onGateEvent?.("EXECUTION_GRANTED", { executionType: "normal", reason: "redis_unavailable" });
      return await executeSubmit();
    }
  }

  const GATE_TIMEOUT_MS = envVariable.WAR_PRIORITY_GATE_TIMEOUT_MS || 10000;
  const DISCOVERY_WINDOW_MS = envVariable.WAR_PRIORITY_DISCOVERY_WINDOW_MS || 2000;
  const LOOP_TIMEOUT_MS = 60000;
  const TTL = envVariable.WAR_PENDING_PAYLOAD_TTL_SECONDS || 3600;
  const PRIORITY_NIMS = (envVariable.WAR_PRIORITY_NIMS || "")
    .split(",")
    .map((n: string) => n.trim());

  const isPriority = PRIORITY_NIMS.includes(nim);
  const requestId = providedRequestId || uuidv4();
  const queuePrefix = isTestMode ? "war:test:" : "war:";
  const queueKey = isPriority ? `${queuePrefix}priority:queue` : `${queuePrefix}normal:queue`;

  const priorityQueueKey = `${queuePrefix}priority:queue`;
  const priorityRunningKey = `${queuePrefix}priority:running`;

  const ctx: LogContext = {
    requestId,
    nim,
    isTestMode,
    isPriority,
    executionType: isPriority ? "priority" : "normal",
  };

  const pendingSub: PendingSubmission = {
    requestId,
    nim,
    createdAt: Date.now(),
    priority: isPriority,
    payload,
  };

  const payloadKey = `war:pending:${isTestMode ? "test:" : ""}${requestId}`;
  await redis.set(payloadKey, JSON.stringify(pendingSub), "EX", TTL);

  const queueWaitStartTime = performance.now();

  if (isPriority) {
    logWarGate(ctx, "Entered priority queue");
  }

  await redis.zadd(queueKey, Date.now(), requestId);

  if (isPriority) {
    await redis.publish("war:events", "state_changed").catch(() => {});
  }

  await ensureSubscription(redis);

  const startTime = Date.now();
  let executed = false;
  let result = null;

  let gateWasOpen = false;
  let gateWaitStartTime = 0;
  let blockedDuration = 0;
  let releaseReason = "no_priority";

  let isDiscovering = !isPriority;
  const discoveryStartTime = performance.now();
  let discoveryStartedLogged = false;

  while (Date.now() - startTime < LOOP_TIMEOUT_MS) {
    const CONCURRENCY_LIMIT = await ResilienceEngine.getAdaptiveConcurrency();
    if (CONCURRENCY_LIMIT === 0) {
      // Circuit breaker is open. Wait heavily before checking again.
      await waitForStateChange(2000);
      continue;
    }
    const topInQueue = await redis.zrange(queueKey, 0, CONCURRENCY_LIMIT - 1);
    const isMyTurn = topInQueue.includes(requestId);

    if (isMyTurn) {
      const processingKey = `${queuePrefix}${isPriority ? "priority" : "normal"}:processing`;
      let canExecute = true;

      if (!isPriority) {
        const pCount = await redis.zcard(priorityQueueKey);
        const pRunningStr = await redis.get(priorityRunningKey);
        const pRunning = pRunningStr ? parseInt(pRunningStr, 10) : 0;

        const isGateOpen = pCount > 0 || pRunning > 0;

        if (isDiscovering) {
          if (!discoveryStartedLogged) {
            logWarGate(ctx, "Discovery window started");
            onGateEvent?.("DISCOVERY_STARTED");
            discoveryStartedLogged = true;
          }
          const elapsed = performance.now() - discoveryStartTime;

          if (isGateOpen) {
            logWarGate(ctx, "Priority detected during discovery");
            onGateEvent?.("PRIORITY_DETECTED");
            isDiscovering = false;
          } else if (elapsed >= DISCOVERY_WINDOW_MS) {
            logWarGate(ctx, "Discovery timeout reached");
            logWarGate(ctx, "No priority detected");
            isDiscovering = false;
            releaseReason = "no_priority";
          } else {
            canExecute = false;
          }
        }

        if (!isDiscovering) {
          if (isGateOpen) {
            if (!gateWasOpen) {
              gateWasOpen = true;
              gateWaitStartTime = performance.now();
              logWarGate(ctx, "Waiting for gate release");
              onGateEvent?.("WAITING_FOR_GATE");
            }

            const currentWait = performance.now() - gateWaitStartTime;
            if (currentWait >= GATE_TIMEOUT_MS) {
              releaseReason = "priority_timeout";
              blockedDuration = Math.round(currentWait);
              logWarGate(ctx, "Priority gate timeout reached");
              logWarGate(ctx, "Priority gate released", { reason: "priority_timeout" });
              logWarGate(ctx, "Priority gate released notification received");
              onGateEvent?.("PRIORITY_RELEASED", { reason: "priority_timeout" });
              await redis.del(priorityRunningKey);
              gateWasOpen = false;
              canExecute = true;
            } else {
              canExecute = false;
            }
          } else {
            if (gateWasOpen) {
              blockedDuration = Math.round(performance.now() - gateWaitStartTime);
              releaseReason = "priority_completed";
              logWarGate(ctx, "Priority gate released notification received");
              onGateEvent?.("PRIORITY_RELEASED", { reason: "priority_completed" });
              gateWasOpen = false;
            }
            canExecute = true;
          }
        }
      }

      if (canExecute) {
        const queueWaitDuration = Math.round(performance.now() - queueWaitStartTime);

        if (isPriority) {
          const pRank = typeof redis.zrank === "function" ? await redis.zrank(queueKey, requestId) : 0;
          const queuePosition = pRank !== null && pRank !== undefined ? pRank : 0;
          logWarGate(ctx, "Priority execution granted", {
            queuePosition,
            executionLatency: `${queueWaitDuration}ms`,
          });
          onGateEvent?.("EXECUTION_GRANTED", {
            executionType: "priority",
            queuePosition,
            executionLatency: `${queueWaitDuration}ms`,
          });
          await redis.incr(priorityRunningKey);
          logWarGate(ctx, "Submitting payload");
          try {
            result = await executeSubmit();
          } finally {
            const totalProcessingTime = Math.round(performance.now() - requestStartTime);
            logWarGate(ctx, "Submission completed", {
              totalProcessingTime: `${totalProcessingTime}ms`,
            });

            const pRunningAfter = await redis.decr(priorityRunningKey);
            await redis.zrem(queueKey, requestId);

            const pCountAfter = await redis.zcard(priorityQueueKey);
            if (pCountAfter === 0 && pRunningAfter === 0) {
              logWarGate(ctx, "Priority gate released", {
                reason: "priority_completed",
              });
            }

            await redis.del(payloadKey);
            await redis.publish("war:events", "state_changed").catch(() => {});
            executed = true;
          }
        } else {
          logWarGate(ctx, "Normal execution granted", {
            blockedDuration: `${blockedDuration}ms`,
            queueWaitDuration: `${queueWaitDuration}ms`,
            reason: releaseReason,
          });
          onGateEvent?.("EXECUTION_GRANTED", {
            executionType: "normal",
            blockedDuration: `${blockedDuration}ms`,
            queueWaitDuration: `${queueWaitDuration}ms`,
            reason: releaseReason,
          });
          logWarGate(ctx, "Submitting payload");
          try {
            result = await executeSubmit();
          } finally {
            const totalProcessingTime = Math.round(performance.now() - requestStartTime);
            logWarGate(ctx, "Submission completed", {
              totalProcessingTime: `${totalProcessingTime}ms`,
            });

            await redis.zrem(queueKey, requestId);
            await redis.del(payloadKey);
            await redis.publish("war:events", "state_changed").catch(() => {});
            executed = true;
          }
        }
        break;
      }
    }

    let waitTimeout = isSubscribed ? 10000 : 50;

    if (isDiscovering) {
      const elapsed = performance.now() - discoveryStartTime;
      const remaining = DISCOVERY_WINDOW_MS - elapsed;
      if (remaining > 0) {
        waitTimeout = isSubscribed ? remaining : Math.min(50, remaining);
      } else {
        waitTimeout = 0;
      }
    } else if (gateWasOpen) {
      const elapsed = performance.now() - gateWaitStartTime;
      const remaining = GATE_TIMEOUT_MS - elapsed;
      if (remaining > 0) {
        waitTimeout = isSubscribed ? remaining : Math.min(50, remaining);
      } else {
        waitTimeout = 0;
      }
    } else if (!isMyTurn) {
      waitTimeout = isSubscribed ? 10000 : 50;
    }

    if (waitTimeout > 0) {
      await waitForStateChange(waitTimeout);
    }
  }

  if (!executed) {
    const totalProcessingTime = Math.round(performance.now() - requestStartTime);
    logWarGate(ctx, "Priority gate released", { reason: "gate_expired" });
    onGateEvent?.("PRIORITY_RELEASED", { reason: "gate_expired" });
    onGateEvent?.("EXECUTION_GRANTED", { executionType: "normal", reason: "gate_expired" });
    logWarGate(ctx, "Submitting payload");
    result = await executeSubmit();
    logWarGate(ctx, "Submission completed", {
      totalProcessingTime: `${totalProcessingTime}ms`,
    });
    await redis.zrem(queueKey, requestId);
    await redis.del(payloadKey);
  }

  return result;
}

