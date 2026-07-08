import posthog from "posthog-js";

// Client-side PostHog init (Next.js instrumentation-client convention).
// Runs before the app renders. Skipped when no token is configured, so
// analytics is fully optional.
const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;

if (token) {
  posthog.init(token, {
    api_host:
      process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
    defaults: "2026-05-30",
  });
}
