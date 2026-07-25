import posthog from "posthog-js";
import { applyGuestPersonProperties } from "@/lib/analytics/events";

// Client-side PostHog init (Next.js instrumentation-client convention).
// Runs before the app renders. Skipped when no token is configured, so
// analytics is fully optional.
const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;

if (token) {
  posthog.init(token, {
    api_host:
      process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
    defaults: "2026-05-30",
    loaded: () => {
      // Anonymous visitors are Guests, not missing data — set this only once
      // PostHog is ready, and only when there's no identified student yet so
      // a page refresh never stomps a logged-in user's real degree/major.
      if (!posthog._isIdentified()) applyGuestPersonProperties();
    },
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
