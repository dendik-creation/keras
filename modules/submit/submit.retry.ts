import { WAR_CONFIG } from "./submit.config";

export type FailureCategory = "INFRASTRUCTURE" | "BUSINESS";

export interface RetryPolicy {
  shouldRetry: boolean;
  category: FailureCategory;
  backoffMs: number;
}

export class RetryEngine {
  static classify(statusCode: number, messageText?: string): RetryPolicy {
    // Business rules
    if (messageText) {
      const msg = messageText.toUpperCase();
      if (msg.includes("PENUH") || msg.includes("BENTROK") || msg.includes("MAKSIMAL SKS") || msg.includes("PRASYARAT")) {
        return { shouldRetry: false, category: "BUSINESS", backoffMs: 0 };
      }
    }
    
    // Infrastructure failures
    if (statusCode === 504 || statusCode === 503 || statusCode === 502 || statusCode === 0) {
      return { shouldRetry: true, category: "INFRASTRUCTURE", backoffMs: this.calculateBackoff(1) };
    }
    
    // Default 500
    if (statusCode >= 500) {
      return { shouldRetry: true, category: "INFRASTRUCTURE", backoffMs: this.calculateBackoff(1) };
    }
    
    // Client errors (4xx) usually not retryable
    return { shouldRetry: false, category: "BUSINESS", backoffMs: 0 };
  }
  
  static calculateBackoff(attempt: number): number {
    const base = WAR_CONFIG.RETRY_BACKOFF_MS;
    const exp = base * Math.pow(2, attempt - 1);
    
    if (WAR_CONFIG.RETRY_JITTER) {
      return Math.min(exp + Math.random() * 1000, 10000); // cap at 10s
    }
    return Math.min(exp, 10000);
  }
}
