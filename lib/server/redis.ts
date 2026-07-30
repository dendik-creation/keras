import { Redis } from "ioredis";
import { logger } from "@/lib/logger";

import { envVariable } from "@/lib/utils";

let redis: Redis | null = null;

export function getRedisClient(): Redis | null {
  if (redis) return redis;

  const redisUrl = envVariable.REDIS_URL;
  if (!redisUrl) {
    return null;
  }

  try {
    redis = new Redis(redisUrl, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      retryStrategy(times) {
        if (times > 3) {
          logger.warn("Redis connection failed. Falling back to direct submit.");
          return null; // Stop retrying
        }
        return Math.min(times * 50, 2000);
      },
    });

    redis.on("error", (err) => {
      logger.error("Redis error:", err.message);
    });

    return redis;
  } catch (error) {
    logger.error("Failed to initialize Redis:", error);
    return null;
  }
}
