"use client";

import { useEffect, useState } from "react";
import { Bug } from "lucide-react";
import { CourseSchedule } from "@/types/course_schedule";

type Props = {
  attempt: number;
  courses: CourseSchedule[];
  inFlight: Set<string>;
  remaining: Set<string>;
  isSubmitting: boolean;
  startedAt: number | null;
  onReset?: () => void;
};

/** Dev-only floating panel — only ever mounted when NEXT_PUBLIC_WAR_TEST_MODE="true". */
export default function WarTestDebugPanel({
  attempt,
  courses,
  inFlight,
  remaining,
  isSubmitting,
  startedAt,
  onReset,
}: Props) {
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    if (!isSubmitting || !startedAt) return;
    const interval = setInterval(() => {
      setElapsedMs(Date.now() - startedAt);
    }, 250);
    return () => clearInterval(interval);
  }, [isSubmitting, startedAt]);

  const securedCount = courses.filter((c) => c.saved_in_submit).length;
  // A schedule_id sits in `remaining` from the moment war starts until it
  // succeeds; once no longer in-flight, it's either "not attempted yet"
  // (attempt 0) or "failed this round, queued for retry" (attempt > 0).
  const queuedNotInFlight = courses.filter(
    (c) => remaining.has(c.schedule_id) && !inFlight.has(c.schedule_id),
  ).length;
  const pendingCount = attempt === 0 ? queuedNotInFlight : 0;
  const failedCount = attempt > 0 ? queuedNotInFlight : 0;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-72 border-2 border-black bg-white shadow-[4px_4px_0_0_#000] font-mono text-[11px]">
      <div className="flex items-center justify-between border-b-2 border-black bg-black px-3 py-1.5 text-white">
        <div className="flex items-center gap-2">
          <Bug className="h-3.5 w-3.5" />
          <span className="font-black uppercase tracking-widest">
            War Test Mode
          </span>
        </div>
        {onReset && (
          <button
            type="button"
            onClick={onReset}
            disabled={isSubmitting}
            className="text-[9px] bg-red-600 hover:bg-red-700 text-white font-bold px-1.5 py-0.5 border border-white uppercase"
          >
            Reset
          </button>
        )}
      </div>
      <div className="space-y-1.5 p-3">
        <Row label="Simulation" value="ON" />
        <Row label="Attempt" value={String(attempt)} />
        <Row label="Elapsed" value={`${elapsedMs}ms`} />
        <Row label="Pending" value={String(pendingCount)} />
        <Row label="Secured" value={String(securedCount)} />
        <Row label="Failed" value={String(failedCount)} />
        <Row label="In-flight" value={String(inFlight.size)} />
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[#555555] uppercase tracking-wide">{label}</span>
      <span className="font-bold tabular-nums">{value}</span>
    </div>
  );
}
