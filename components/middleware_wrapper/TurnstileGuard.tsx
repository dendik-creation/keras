"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import axios from "axios";
import Image from "next/image";
import GuardLoader from "@/components/middleware_wrapper/GuardLoader";

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
const SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
const SESSION_KEY = "turnstile_passed";

declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement,
        opts: {
          sitekey: string;
          callback: (token: string) => void;
          "error-callback"?: () => void;
          "expired-callback"?: () => void;
          theme?: "auto" | "light" | "dark";
        },
      ) => string;
      reset: (id?: string) => void;
    };
  }
}

type Status = "checking" | "challenge" | "passed" | "error";

export default function TurnstileGuard({ children }: { children: ReactNode }) {
  // No site key configured -> challenge disabled, render app directly.
  const [status, setStatus] = useState<Status>(
    SITE_KEY ? "checking" : "passed",
  );
  const widgetRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  // Skip challenge if already passed this browser session.
  useEffect(() => {
    if (!SITE_KEY) return;
    if (sessionStorage.getItem(SESSION_KEY) === "1") {
      setStatus("passed");
    } else {
      setStatus("challenge");
    }
  }, []);

  // Load the Turnstile script and render the widget when challenging.
  useEffect(() => {
    if (status !== "challenge" || !SITE_KEY) return;

    const renderWidget = () => {
      if (!window.turnstile || !widgetRef.current || widgetIdRef.current)
        return;
      widgetIdRef.current = window.turnstile.render(widgetRef.current, {
        sitekey: SITE_KEY,
        theme: "auto",
        callback: async (token: string) => {
          try {
            const res = await axios.post("/api/turnstile-verify", { token });
            if (res.data?.success) {
              sessionStorage.setItem(SESSION_KEY, "1");
              setStatus("passed");
            } else {
              setStatus("error");
            }
          } catch {
            setStatus("error");
          }
        },
        "error-callback": () => setStatus("error"),
        "expired-callback": () => {
          window.turnstile?.reset(widgetIdRef.current ?? undefined);
        },
      });
    };

    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${SCRIPT_SRC}"]`,
    );

    if (window.turnstile) {
      renderWidget();
    } else if (existing) {
      existing.addEventListener("load", renderWidget, { once: true });
    } else {
      const script = document.createElement("script");
      script.src = SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      script.onload = renderWidget;
      script.onerror = () => setStatus("error");
      document.head.appendChild(script);
    }
  }, [status]);

  if (status === "passed") return <>{children}</>;

  if (status === "checking") return <GuardLoader />;

  // challenge / error -> Swiss-style interstitial with the widget.
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center gap-8 bg-white swiss-grid-pattern px-6">
      <div className="w-full h-2 bg-[#FF3000] absolute top-0 left-0" />

      <Image
        src="/logo.png"
        alt="KeRaS"
        width={64}
        height={64}
        className="w-16 h-16 object-contain"
        priority
      />

      <div className="flex items-center gap-4">
        <div className="w-8 h-0.5 bg-[#FF3000]" />
        <span className="text-xs font-bold uppercase tracking-widest text-black">
          Sebentar Wok
        </span>
        <div className="w-8 h-0.5 bg-[#FF3000]" />
      </div>

      <h1 className="text-3xl md:text-5xl font-black tracking-tighter text-black uppercase leading-[0.9] text-center">
        Kamu <span className="text-[#FF3000]">Robot</span> Gak Sih😹
      </h1>

      <p className="text-sm text-[#555555] font-medium text-center max-w-md border-x-2 border-[#FF3000] px-4">
        Cukup tunggu KeRaS untuk mengecek keaslianmu.
      </p>

      <div ref={widgetRef} className="min-h-[65px]" />

      {status === "error" && (
        <button
          onClick={() => {
            widgetIdRef.current = null;
            setStatus("challenge");
          }}
          className="bg-black text-white rounded-none uppercase font-black tracking-widest h-12 px-8 text-sm hover:bg-[#FF3000] transition-colors duration-200"
        >
          Coba Lagi
        </button>
      )}

      <div className="w-full h-2 bg-[#FF3000] absolute bottom-0 left-0" />
    </div>
  );
}
