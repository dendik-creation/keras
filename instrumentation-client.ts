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

// Register the service worker so KeRaS is installable as a PWA.
if (typeof window !== "undefined" && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* SW registration is best-effort */
    });
  });
}
