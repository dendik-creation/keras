"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface BorderTrailProps {
  color?: string;
  strokeWidth?: number;
  duration?: number;
  className?: string;
}

export function BorderTrail({
  duration = 0.5,
  className,
}: BorderTrailProps) {
  return (
    <div
      className={cn(
        "absolute inset-0 pointer-events-none z-30 border-2 border-[#FF3000] animate-border-pulse",
        className
      )}
      style={{
        animationDuration: `${duration}s`,
      }}
    />
  );
}
