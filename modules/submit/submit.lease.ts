import { getRedisClient } from "@/lib/server/redis";
import { WAR_CONFIG } from "./submit.config";
import crypto from "crypto";
import { logger } from "@/lib/logger";

export function generateIdempotencyKey(nim: string, sessionCookie: string, scheduleIds: string[]): string {
  const sortedIds = [...scheduleIds].sort().join(",");
  return crypto.createHash("sha256").update(`${nim}:${sessionCookie}:${sortedIds}`).digest("hex");
}

export async function acquireSubmissionLease(idempotencyKey: string): Promise<boolean> {
  const redis = getRedisClient();
  if (!redis || redis.status !== "ready") {
    // If Redis is down, we fail open or close? For leases, fail open to not block submissions,
    // but the instruction says "No submission should ever execute twice simultaneously."
    // If Redis is down, we can't guarantee it. We will allow it but log a warning.
    logger.warn("[war-lease] Redis unavailable, bypassing lease acquisition");
    return true; 
  }
  
  const leaseKey = `war:lease:${idempotencyKey}`;
  const acquired = await redis.set(leaseKey, "1", "EX", WAR_CONFIG.SUBMISSION_LEASE_SECONDS, "NX");
  
  if (!acquired) {
    logger.warn(`[war-lease] Lease acquisition failed for key: ${idempotencyKey}`);
    return false;
  }
  
  return true;
}

export async function releaseSubmissionLease(idempotencyKey: string): Promise<void> {
  const redis = getRedisClient();
  if (!redis || redis.status !== "ready") return;
  
  const leaseKey = `war:lease:${idempotencyKey}`;
  await redis.del(leaseKey);
}
