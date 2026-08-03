"use client";

import React from "react";
import { motion } from "motion/react";
import { AppLoader } from "@/components/ui/app-loader";
import RollingNumber from "@/components/ui/rolling-number";

interface ScheduleLoadingProgressProps {
  progress?: { done: number; total: number } | null;
  syncState?: "idle" | "fetching" | "completed";
  className?: string;
}

export function ScheduleLoadingProgress({
  progress,
  syncState = "fetching",
  className = "",
}: ScheduleLoadingProgressProps) {
  const isCompleted = syncState === "completed";

  const percentage = isCompleted
    ? 100
    : progress && progress.total > 0
      ? Math.min(100, Math.round((progress.done / progress.total) * 100))
      : 0;

  const displayDone = isCompleted && progress ? progress.total : progress?.done || 0;
  const displayTotal = progress?.total || 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={`p-6 border-2 border-black bg-white flex flex-col items-center justify-center gap-4 text-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${className}`}
    >
      {progress || isCompleted ? (
        <>
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-1 font-bold text-2xl text-black tabular-nums">
              <RollingNumber
                value={displayDone}
                className="font-bold text-3xl text-black"
              />
              <span className="text-[#FF3000] mt-2">/</span>
              <RollingNumber
                value={displayTotal}
                className="font-bold text-lg text-black"
              />
              <span className="text-xs font-medium text-[#555555] ml-1.5 mt-3.5">Jadwal</span>
            </div>
          </div>

          <div className="w-full max-w-xs space-y-1.5">
            <div className="h-4 w-full border-2 border-black bg-[#F2F2F2] overflow-hidden p-0.5 relative">
              <div
                className="h-full bg-[#FF3000] transition-all duration-300 ease-out relative flex items-center justify-end pr-0.5"
                style={{ width: `${percentage}%` }}
              >
              </div>
            </div>
          </div>

          <span className="text-xs font-medium text-[#555555] max-w-xs leading-relaxed min-h-[32px]">
            {isCompleted ? (
              <>
                <span className="block text-black">BentaR...</span>
              </>
            ) : (
              "Sedang melahap jadwal matkul, jangan diganggu (jangan refresh)"
            )}
          </span>
        </>
      ) : (
        <>
          <AppLoader
            size={64}
            variant="schedule-refresh"
            aria-label="Mencari ketersediaan jadwal"
          />
          <span className="text-xs font-medium text-[#555555] max-w-xs leading-relaxed min-h-[32px]">
            Sedang mencari ketersediaan jadwal, tapi agak lama hehe...
          </span>
        </>
      )}
    </motion.div>
  );
}
