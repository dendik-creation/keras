import { getRedisClient } from "@/lib/server/redis";
import { WAR_CONFIG } from "./submit.config";
import { logger } from "@/lib/logger";

export type CircuitBreakerState = "CLOSED" | "OPEN" | "HALF_OPEN";

export class ResilienceEngine {
  private static FAIL_KEY = "war:cb:fails";
  private static STATE_KEY = "war:cb:state";
  private static OPEN_UNTIL_KEY = "war:cb:open_until";
  private static METRICS_LATENCY = "war:metrics:latency";
  
  static async recordFailure(): Promise<void> {
    if (!WAR_CONFIG.CIRCUIT_BREAKER_ENABLED) return;
    const redis = getRedisClient();
    if (!redis) return;
    
    const state = await this.getState();
    if (state === "HALF_OPEN") {
      // Immediate trip back to open on failure during half-open
      await this.tripBreaker();
      return;
    }
    
    const fails = await redis.incr(this.FAIL_KEY);
    await redis.expire(this.FAIL_KEY, 60); // Reset count after 60s of no failures
    
    if (fails >= WAR_CONFIG.CIRCUIT_BREAKER_FAILURE_THRESHOLD) {
      await this.tripBreaker();
    }
  }
  
  static async recordSuccess(latencyMs: number): Promise<void> {
    const redis = getRedisClient();
    if (!redis) return;
    
    // Circuit breaker recovery
    if (WAR_CONFIG.CIRCUIT_BREAKER_ENABLED) {
      const state = await this.getState();
      if (state === "HALF_OPEN") {
        await redis.set(this.STATE_KEY, "CLOSED");
        await redis.del(this.FAIL_KEY);
        logger.info("[war-cb] Circuit Breaker recovered: CLOSED");
      } else if (state === "CLOSED") {
        await redis.del(this.FAIL_KEY);
      }
    }
    
    // Adaptive metrics recording (simple moving average for the last 50 requests)
    await redis.lpush(this.METRICS_LATENCY, latencyMs);
    await redis.ltrim(this.METRICS_LATENCY, 0, 49);
  }
  
  static async getState(): Promise<CircuitBreakerState> {
    if (!WAR_CONFIG.CIRCUIT_BREAKER_ENABLED) return "CLOSED";
    const redis = getRedisClient();
    if (!redis) return "CLOSED";
    
    const state = await redis.get(this.STATE_KEY) as CircuitBreakerState | null;
    if (state === "OPEN") {
      const openUntil = await redis.get(this.OPEN_UNTIL_KEY);
      if (openUntil && Date.now() > parseInt(openUntil, 10)) {
        await redis.set(this.STATE_KEY, "HALF_OPEN");
        logger.info("[war-cb] Circuit Breaker transitioned to HALF_OPEN");
        return "HALF_OPEN";
      }
      return "OPEN";
    }
    
    return state || "CLOSED";
  }
  
  private static async tripBreaker(): Promise<void> {
    const redis = getRedisClient();
    if (!redis) return;
    
    const openUntil = Date.now() + WAR_CONFIG.CIRCUIT_BREAKER_RESET_MS;
    await redis.set(this.STATE_KEY, "OPEN");
    await redis.set(this.OPEN_UNTIL_KEY, openUntil.toString());
    logger.error("[war-cb] Circuit Breaker tripped: OPEN");
  }
  
  static async getAdaptiveTimeout(): Promise<number> {
    if (!WAR_CONFIG.ADAPTIVE_TIMEOUT) return WAR_CONFIG.TIMEOUT_MIN_MS;
    const redis = getRedisClient();
    if (!redis) return WAR_CONFIG.TIMEOUT_MIN_MS;
    
    const latencies = await redis.lrange(this.METRICS_LATENCY, 0, -1);
    if (latencies.length === 0) return WAR_CONFIG.TIMEOUT_MIN_MS;
    
    const avg = latencies.reduce((a, b) => a + parseInt(b, 10), 0) / latencies.length;
    
    // If avg latency > 5s, start extending timeout
    let calculated = WAR_CONFIG.TIMEOUT_MIN_MS;
    if (avg > 5000) {
       calculated = Math.min(WAR_CONFIG.TIMEOUT_MAX_MS, avg * 2);
    }
    return Math.floor(calculated);
  }
  
  static async getAdaptiveConcurrency(): Promise<number> {
    if (!WAR_CONFIG.ADAPTIVE_CONCURRENCY) return WAR_CONFIG.MAX_CONCURRENCY;
    
    const state = await this.getState();
    if (state === "OPEN") return 0; // Breaker tripped, no concurrency
    if (state === "HALF_OPEN") return WAR_CONFIG.MIN_CONCURRENCY; // Testing the waters
    
    const redis = getRedisClient();
    if (!redis) return WAR_CONFIG.MAX_CONCURRENCY;
    
    // Scale concurrency down if latency is high
    const latencies = await redis.lrange(this.METRICS_LATENCY, 0, -1);
    if (latencies.length === 0) return WAR_CONFIG.MAX_CONCURRENCY;
    
    const avg = latencies.reduce((a, b) => a + parseInt(b, 10), 0) / latencies.length;
    if (avg < 3000) {
      return WAR_CONFIG.MAX_CONCURRENCY;
    } else if (avg < 7000) {
      return Math.max(WAR_CONFIG.MIN_CONCURRENCY, Math.floor(WAR_CONFIG.MAX_CONCURRENCY * 0.5));
    } else {
      return WAR_CONFIG.MIN_CONCURRENCY;
    }
  }
}

