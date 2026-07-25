import type { Properties } from "posthog-js";
import { logger } from "@/lib/logger";

/**
 * Opt-in verbose logging for local development. Gated on NODE_ENV so setting
 * the env var in a production build can never turn it on by accident.
 */
export const isDebugEnabled = (): boolean =>
  process.env.NODE_ENV !== "production" &&
  process.env.NEXT_PUBLIC_ANALYTICS_DEBUG === "true";

export function logCapture(
  event: string,
  distinctId: string,
  properties?: Properties | null,
): void {
  if (!isDebugEnabled()) return;
  logger.log("[analytics]", {
    event,
    distinctId,
    properties: properties ?? {},
  });
}
