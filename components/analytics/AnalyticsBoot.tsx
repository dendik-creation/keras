"use client";

import { useEffect } from "react";
import { getLocalStorage } from "@/helper/local_storage";
import {
  identifyStudent,
  trackPwaInstalled,
  type ActiveUser,
  type PwaPlatform,
} from "@/lib/analytics/events";

const PWA_SOURCE_KEY = "pwa_install_source";

// Module-scoped, not state: `appinstalled` fires at most once per real
// install, but this still guards against duplicate captures across
// dev-mode double-effects.
let installReported = false;

function detectPlatform(): PwaPlatform {
  return /Mobi|Android/i.test(navigator.userAgent) ? "mobile" : "desktop";
}

function detectDisplayMode(): string {
  if (window.matchMedia("(display-mode: standalone)").matches)
    return "standalone";
  if (window.matchMedia("(display-mode: fullscreen)").matches)
    return "fullscreen";
  if (window.matchMedia("(display-mode: minimal-ui)").matches)
    return "minimal-ui";
  return "browser";
}

/**
 * Mounted once in the root layout — the one place guaranteed to stay mounted
 * across every client-side route change. `appinstalled` and the login
 * identity resync used to live in page-local components (the landing page's
 * install button, /submit), so navigating away between trigger and event
 * meant the listener was gone before it could fire.
 */
export default function AnalyticsBoot() {
  useEffect(() => {
    const activeUser = getLocalStorage("active_user") as ActiveUser | null;
    if (activeUser) void identifyStudent(activeUser);
  }, []);

  useEffect(() => {
    const onInstalled = () => {
      if (installReported) return;
      installReported = true;
      trackPwaInstalled({
        source: sessionStorage.getItem(PWA_SOURCE_KEY) || "unknown",
        platform: detectPlatform(),
        display_mode: detectDisplayMode(),
        isStandalone: window.matchMedia("(display-mode: standalone)")
          .matches,
      });
    };
    window.addEventListener("appinstalled", onInstalled);
    return () => window.removeEventListener("appinstalled", onInstalled);
  }, []);

  return null;
}

export { PWA_SOURCE_KEY };
