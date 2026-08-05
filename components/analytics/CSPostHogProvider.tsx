"use client";

import posthog from "posthog-js";
import { PostHogProvider } from "posthog-js/react";
import { useEffect } from "react";
import { applyGuestPersonProperties } from "@/lib/analytics/events";

export function CSPostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
    if (token && !posthog.__loaded) {
      posthog.init(token, {
        api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
        loaded: () => {
          if (!posthog._isIdentified()) applyGuestPersonProperties();
        },
      });
    }
  }, []);
  // Register the service worker so KeRaS is installable as a PWA.
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  return <PostHogProvider client={posthog}>{children}</PostHogProvider>;
}
