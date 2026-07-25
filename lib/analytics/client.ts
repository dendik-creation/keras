import posthog from "posthog-js";
import type { CaptureOptions, Properties } from "posthog-js";
import { logCapture } from "./debug";

export { posthog };

/** True once posthog.init has run (i.e. an analytics key was configured). */
export const isReady = (): boolean =>
  typeof window !== "undefined" && posthog.__loaded;

export type CaptureConfig = {
  /**
   * Route the request through sendBeacon instead of XHR/fetch so it survives
   * an immediate redirect or tab close right after this call — the
   * PostHog-recommended pattern for events fired just before navigation.
   */
  reliable?: boolean;
};

/** Single choke point for outgoing events: no-ops until PostHog is ready, logs in debug mode. */
export function capture(
  event: string,
  properties?: Properties,
  config?: CaptureConfig,
): void {
  if (!isReady()) return;
  logCapture(event, posthog.get_distinct_id(), properties);
  const options: CaptureOptions | undefined = config?.reliable
    ? { transport: "sendBeacon" }
    : undefined;
  posthog.capture(event, properties, options);
}
