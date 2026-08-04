"use client";

import { ThinkingOrb } from "thinking-orbs";

export type AppLoaderVariant = "guard" | "schedule-refresh" | "ai-generating" | "schedule-extracting";

export interface AppLoaderProps {
  variant?: AppLoaderVariant;
  state?: "working" | "searching" | "solving" | "listening" | "composing" | "shaping";
  size?: 20 | 64;
  theme?: "auto" | "light" | "dark";
  className?: string;
  "aria-label"?: string;
}

/**
 * KeRaS Swiss-style reusable loading indicator powered by thinking-orbs canvas.
 */
export function AppLoader({
  variant = "guard",
  state,
  size,
  theme = "light",
  className = "",
  "aria-label": ariaLabel,
}: AppLoaderProps) {
  let defaultState: "working" | "searching" | "solving" | "listening"  | "composing" | "shaping" = "searching";
  let defaultSize: 20 | 64 = 20;

  if (variant === "guard") {
    defaultState = "composing";
    defaultSize = 64;
  } else if (variant === "schedule-refresh") {
    defaultState = "composing";
    defaultSize = 64;
  } else if (variant === "schedule-extracting") {
    defaultState = "shaping";
    defaultSize = 64;
  } else if (variant === "ai-generating") {
    defaultState = "solving";
    defaultSize = 64;
  }

  const activeState = state ?? defaultState;
  const activeSize = size ?? defaultSize;

  return (
    <div
      className={`inline-flex items-center justify-center ${className}`}
      role="status"
      aria-label={ariaLabel || `Memuat: ${activeState}`}
    >
      <ThinkingOrb state={activeState} size={activeSize} theme={theme} />
    </div>
  );
}

export default AppLoader;
