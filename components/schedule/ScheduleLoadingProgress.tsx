"use client";

import React from "react";
import { motion } from "motion/react";
import { AppLoader } from "@/components/ui/app-loader";
import RollingNumber from "@/components/ui/rolling-number";

interface ScheduleLoadingProgressProps {
  progress?: { done: number; total: number } | null;
  className?: string;
}

export function ScheduleLoadingProgress({
  progress,
  className = "",
}: ScheduleLoadingProgressProps) {
  const percentage =
    progress && progress.total > 0
      ? Math.min(100, Math.round((progress.done / progress.total) * 100))
      : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className={`p-6 border-2 border-black bg-white flex flex-col items-center justify-center gap-4 text-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${className}`}
    >
      {progress ? (
        <>
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-1 font-black text-2xl text-black tabular-nums">
              <RollingNumber
                value={progress.done}
                className="font-black text-3xl text-black"
              />
              <span className="text-[#FF3000] mt-2">/</span>
              <RollingNumber
                value={progress.total}
                className="font-black text-lg text-black"
              />
              <span className="text-xs font-bold text-[#555555] ml-1.5 mt-3.5">Jadwal</span>
            </div>
          </div>

          <div className="w-full max-w-xs space-y-1.5">
            <div className="h-3 w-full border-2 border-black bg-[#F2F2F2] overflow-hidden p-0.5">
              <div
                className="h-full bg-[#FF3000] transition-all duration-300 ease-out"
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>

          <span className="text-xs font-bold text-[#555555] max-w-xs leading-relaxed">
            Sedang melahap jadwal matkul, jangan diganggu (jangan refresh)
          </span>
        </>
      ) : (
        <>
          <AppLoader
            size={64}
            variant="schedule-refresh"
            aria-label="Mencari ketersediaan jadwal"
          />
          <span className="text-xs font-bold text-[#555555] max-w-xs leading-relaxed">
            Sedang mencari ketersediaan jadwal, tapi agak lama hehe...
          </span>
        </>
      )}
    </motion.div>
  );
}
