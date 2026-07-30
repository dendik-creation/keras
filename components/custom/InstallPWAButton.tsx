"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Check } from "lucide-react";
import { gooeyToast } from "@/components/ui/goey-toaster";
import { PWA_SOURCE_KEY } from "@/components/analytics/AnalyticsBoot";
import { cn } from "@/lib/utils";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/** Hero CTA that triggers the native PWA install prompt (add to home screen). */
export default function InstallPWAButton({
  className,
  source = "landing_hero",
  inverted,
}: {
  className?: string;
  source?: string;
  inverted?: boolean;
}) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setInstalled(true);
    }
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    // UI-only: hide the button once installed. The actual `pwa_dipasang`
    // capture lives in AnalyticsBoot (mounted in the root layout) so it
    // still fires even if this button unmounts before the browser
    // finishes the install and dispatches `appinstalled`.
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const handleClick = async () => {
    if (deferred) {
      // AnalyticsBoot reads this back when `appinstalled` fires, even if
      // that happens after navigating away from this button.
      sessionStorage.setItem(PWA_SOURCE_KEY, source);
      await deferred.prompt();
      const { outcome } = await deferred.userChoice;
      if (outcome === "accepted") setInstalled(true);
      setDeferred(null);
      return;
    }
    // No native prompt available (iOS Safari, unsupported, or already dismissed).
    gooeyToast.warning("Install Manual", {
      description:
        "Buka menu browser lalu pilih 'Install App' / 'Tambahkan ke Layar Utama'.",
    });
  };

  const base =
    "rounded-none uppercase font-black tracking-widest h-14 text-base transition-colors duration-200 border-2 border-t-0";

  if (installed) {
    return null;
  }

  return (
    <Button
      onClick={handleClick}
      className={cn(base, inverted ? "border-white bg-[#FF3000] text-white hover:bg-white hover:text-black" : "border-black bg-[#FF3000] text-white hover:bg-black", className)}
    >
      <Download className="w-5 h-5 mr-2" /> Install App
    </Button>
  );
}
