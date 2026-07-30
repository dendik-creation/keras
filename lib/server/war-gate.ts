import { v4 as uuidv4 } from "uuid";
import { getRedisClient } from "./redis";
import { logger } from "@/lib/logger";
import { envVariable } from "@/lib/utils";

interface PendingSubmission {
  requestId: string;
  nim: string;
  createdAt: number;
  priority: boolean;
}

export async function processThroughGate(
  nim: string,
  isTestMode: boolean,
  executeSubmit: () => Promise<any>
) {
  const redis = getRedisClient();
  const ENABLED = envVariable.WAR_PRIORITY_ENABLED;

  if (!ENABLED || !redis) {
    return await executeSubmit();
  }

  if (redis.status !== "ready") {
    try {
      await redis.ping();
    } catch (e) {
      return await executeSubmit();
    }
  }

  const TIMEOUT_MS = envVariable.WAR_PRIORITY_GATE_TIMEOUT_MS;
  const TTL = envVariable.WAR_PENDING_PAYLOAD_TTL_SECONDS;
  const PRIORITY_NIMS = envVariable.WAR_PRIORITY_NIMS.split(",").map((n: string) => n.trim());
  
  const isPriority = PRIORITY_NIMS.includes(nim);
  const requestId = uuidv4();
  const modeStr = isTestMode ? "mode=test\n" : "mode=production\n";
  
  logger.info(`[war]\n${modeStr}payload prepared`);
  logger.info(`[war]\n${modeStr}queued\npriority=${isPriority}\nnim=${nim}`);

  const pendingSub: PendingSubmission = {
    requestId,
    nim,
    createdAt: Date.now(),
    priority: isPriority,
  };

  const payloadKey = `war:pending:${isTestMode ? 'test:' : ''}${requestId}`;
  await redis.set(payloadKey, JSON.stringify(pendingSub), "EX", TTL);

  const queuePrefix = isTestMode ? "war:test:" : "war:";
  const queueKey = isPriority ? `${queuePrefix}priority:queue` : `${queuePrefix}normal:queue`;
  const gateKey = `${queuePrefix}priority:gate`;

  await redis.zadd(queueKey, Date.now(), requestId);
  
  if (isPriority) {
    await redis.set(gateKey, "OPEN", "EX", Math.ceil(TIMEOUT_MS / 1000));
    logger.info(`[war]\n${modeStr}priority gate opened`);
  }

  const startTime = Date.now();
  let executed = false;
  let result = null;

  while (Date.now() - startTime < TIMEOUT_MS + 5000) {
    const lockKey = `war:pending:${isTestMode ? 'test:' : ''}${requestId}:lock`;
    const locked = await redis.set(lockKey, "1", "EX", TTL, "NX");
    
    if (locked) {
      const gateOpen = await redis.get(gateKey);
      const priorityCount = await redis.zcard(queueKey.replace('normal', 'priority'));
      
      if (priorityCount === 0 && gateOpen === "OPEN") {
        await redis.del(gateKey);
        logger.info(`[war]\n${modeStr}priority gate released`);
        logger.info(`[war]\n${modeStr}normal queue released`);
      }

      if (process.env.NODE_ENV === "development" || process.env.WAR_DEBUG === "true") {
        const normalCount = await redis.zcard(queueKey.replace('priority', 'normal'));
        const pendingCount = (await redis.keys(`war:pending:${isTestMode ? 'test:' : ''}*`)).length;
        const gateTTL = await redis.ttl(gateKey);
        logger.info(`[war_debug]\n${modeStr}Priority Queue Size: ${priorityCount}\nNormal Queue Size: ${normalCount}\nGate Status: ${gateOpen || 'CLOSED'}\nGate Timeout Remaining: ${gateTTL}s\nRedis Connectivity: OK\nPending Submission Count: ${pendingCount}`);
      }

      const canProceed = isPriority || !gateOpen;

      if (canProceed) {
        logger.info(`[war]\n${modeStr}submission started`);
        result = await executeSubmit();
        logger.info(`[war]\n${modeStr}submission finished`);
        await redis.zrem(queueKey, requestId);
        await redis.del(payloadKey);
        executed = true;
        break;
      } else {
        await redis.del(lockKey);
      }
    }
    
    await new Promise(r => setTimeout(r, 100));
  }

  if (!executed) {
    logger.info(`[war]\n${modeStr}normal queue released`);
    logger.info(`[war]\n${modeStr}submission started`);
    result = await executeSubmit();
    logger.info(`[war]\n${modeStr}submission finished`);
    await redis.zrem(queueKey, requestId);
    await redis.del(payloadKey);
  }
  
  return result;
}
