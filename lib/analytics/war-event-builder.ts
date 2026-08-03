import { getServerAnalytics } from "./server";

export type WarResult = "SUCCESS" | "PARTIAL_SUCCESS" | "FAILED";
export type VerificationResult = "NOT_REQUIRED" | "SUCCESS" | "FAILED" | "TIMEOUT";

export interface WarEventProperties {
  submission_id: string;
  war_session_id?: string;

  attempt?: number;
  retry_count?: number;

  queue_wait_duration_ms?: number;
  execution_duration_ms?: number;
  verification_duration_ms?: number;
  total_duration_ms?: number;
  timeout_duration_ms?: number;

  total_courses?: number;
  successful_courses?: number;
  failed_courses?: number;

  result?: WarResult | string;
  failure_reason?: string;
  retry_reason?: string;

  verification_result?: VerificationResult | string;
  verification_attempt?: number;
  background_execution?: boolean;
  verification_started_at?: number;

  http_status?: number;

  timestamp?: string;
  
  [key: string]: any;
}

export type WarLifecycleEventName =
  | "WAR_STARTED"
  | "QUEUE_ENTERED"
  | "QUEUE_RELEASED"
  | "ATTEMPT_STARTED"
  | "WAITING_RESPONSE"
  | "UNKNOWN_COMMIT_STATE"
  | "VERIFYING"
  | "ATTEMPT_FINISHED"
  | "RETRYING"
  | "BACKGROUND_VERIFYING"
  | "WAR_COMPLETED"
  | "WAR_FAILED";

function normalizeEnum<T extends string>(value: any, allowedValues: T[], defaultValue?: T): T | undefined {
  if (value === undefined || value === null) return defaultValue;
  const upperValue = String(value).toUpperCase();
  if (allowedValues.includes(upperValue as T)) return upperValue as T;
  return defaultValue;
}

function normalizeFailureReason(reason: any, status?: number): string | undefined {
  if (!reason && !status) return undefined;
  if (status) {
    if (status === 500) return "HTTP_500";
    if (status === 502) return "HTTP_502";
    if (status === 503) return "HTTP_503";
    if (status === 504) return "HTTP_504";
  }
  const str = String(reason).toUpperCase();
  if (str.includes("TIMEOUT")) return "TIMEOUT";
  if (str.includes("NETWORK")) return "NETWORK_ERROR";
  if (str.includes("FULL") || str.includes("PENUH")) return "CLASS_FULL";
  if (str.includes("CONFLICT") || str.includes("BENTROK")) return "SCHEDULE_CONFLICT";
  if (str.includes("PREREQUISITE") || str.includes("SYARAT")) return "PREREQUISITE";
  if (str.includes("SKS") || str.includes("LIMIT")) return "SKS_LIMIT";
  if (str.includes("ENROLLED") || str.includes("SUDAH")) return "ALREADY_ENROLLED";
  if (str.includes("EXPIRED") || str.includes("SESI")) return "SESSION_EXPIRED";
  
  // Return standard unknown if reason provided but doesn't match
  return reason ? "UNKNOWN" : undefined;
}

function ensureNonNegative(val: any): number | undefined {
  if (typeof val !== "number" || isNaN(val)) return undefined;
  return Math.max(0, val);
}

/**
 * Standardized analytics builder for all WAR lifecycle events.
 * This ensures consistency and enforces the schema.
 */
export function captureWarLifecycleEvent(
  nim: string,
  eventName: WarLifecycleEventName,
  properties: WarEventProperties
) {
  const posthog = getServerAnalytics();
  if (posthog) {
    const warSessionId = process.env.NEXT_PUBLIC_WAR_SESSION_ID || "UNKNOWN_SESSION";

    const sanitizedProps: Record<string, any> = {
      submission_id: properties.submission_id,
      war_session_id: properties.war_session_id || warSessionId,
    };

    // Safely copy numbers
    const numberFields = ["attempt", "retry_count", "total_courses", "successful_courses", "failed_courses", "http_status", "verification_attempt"];
    for (const field of numberFields) {
      if (typeof properties[field] === "number") {
        sanitizedProps[field] = properties[field];
      }
    }

    // Durations
    const durationFields = ["queue_wait_duration_ms", "execution_duration_ms", "verification_duration_ms", "total_duration_ms", "timeout_duration_ms"];
    for (const field of durationFields) {
      const val = ensureNonNegative(properties[field]);
      if (val !== undefined) sanitizedProps[field] = val;
    }

    // Enums
    if (properties.result !== undefined) {
      sanitizedProps.result = normalizeEnum(properties.result, ["SUCCESS", "PARTIAL_SUCCESS", "FAILED"]);
    }
    
    if (properties.verification_result !== undefined) {
      sanitizedProps.verification_result = normalizeEnum(properties.verification_result, ["NOT_REQUIRED", "SUCCESS", "FAILED", "TIMEOUT"]);
    }

    if (properties.failure_reason !== undefined || properties.error_message !== undefined || properties.http_status !== undefined) {
      sanitizedProps.failure_reason = normalizeFailureReason(properties.failure_reason || properties.error_message, properties.http_status);
    }
    
    // Explicitly delete unwanted keys
    const rawProps = { ...properties };
    delete rawProps.priority;
    delete rawProps.isPriority;
    delete rawProps.priority_user;
    delete rawProps.error_message;

    // Copy remaining properties, skipping undefined
    for (const [k, v] of Object.entries(rawProps)) {
      if (v !== undefined && !(k in sanitizedProps)) {
        sanitizedProps[k] = v;
      }
    }
    
    posthog.capture({
      distinctId: nim,
      event: eventName,
      properties: {
        ...sanitizedProps,
        timestamp: sanitizedProps.timestamp || new Date().toISOString()
      },
    });
  }
}
