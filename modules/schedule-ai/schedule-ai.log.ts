import { logger } from "@/lib/logger";
import type { CourseWithSemester, ScheduleValidationIssues } from "@/modules/schedule-ai/schedule-ai.types";
import { MIN_TARGET_RATIO, type ScheduleMetrics } from "@/modules/schedule-ai/schedule-ai.scoring";
import type { OptimizerStats } from "@/modules/schedule-ai/schedule-ai.optimizer";

const PREFIX = "[schedule-ai]";

/** Never print raw schedule_id hashes — log the short row ids the AI actually ranked instead. */
export function logSelection(label: string, shortIds: string[]): void {
  logger.log(`${PREFIX} ${label}`, shortIds.length ? shortIds.join(", ") : "(none)");
}

/** "shortId -> course class" lines — pulled out only when a failure needs real names to debug. */
export function describeSelection(
  shortIds: string[],
  courseByShortId: Map<string, CourseWithSemester>,
): string[] {
  return shortIds.map((id) => {
    const course = courseByShortId.get(id);
    return course ? `${id} -> ${course.course} ${course.class}` : `${id} -> ?`;
  });
}

/** Structured, section-by-section validation breakdown instead of one run-on sentence. */
export function logValidationSummary(issues: ScheduleValidationIssues, valid: boolean): void {
  const lines: string[] = [`${PREFIX} validation result`];

  if (issues.duplicate_course.length) {
    lines.push("  duplicate courses:", ...issues.duplicate_course.map((c) => `    - ${c}`));
  }
  if (issues.overlap.length) {
    lines.push(
      "  overlaps:",
      ...issues.overlap.map((o) => `    - ${o.courseA} <-> ${o.courseB}`),
    );
  }
  if (issues.outside_day.length) {
    lines.push("  outside allowed day:", ...issues.outside_day.map((c) => `    - ${c}`));
  }
  if (issues.outside_time.length) {
    lines.push("  outside allowed time:", ...issues.outside_time.map((c) => `    - ${c}`));
  }
  lines.push(`  sks: ${issues.total_sks} / ${issues.target_sks}${issues.sks_exceeded ? " (exceeded)" : ""}`);
  lines.push(`  status: ${valid ? "PASSED" : "FAILED"}`);

  logger.log(lines.join("\n"));
}

export type ExecutionMode = "deterministic" | "ai_ranked";

/**
 * Layer-by-layer readout of the lexicographic decision engine's final pick —
 * the debugging counterpart to compareScheduleMetrics, showing what it
 * actually optimized instead of just the winning combination. Branch-level
 * "why was this rejected" tracing isn't logged per-branch (a 300k-call
 * budget would flood the log with noise nobody reads) — the aggregate
 * explored/pruned/bestUpdates counts below are the debuggable proxy for it.
 */
export function logOptimizationSummary(input: {
  metrics: ScheduleMetrics;
  semesterTotal: number;
  semesterDistribution: Record<string, number>;
  targetSks: number;
  finalCourseCount: number;
  mode: ExecutionMode;
  stats: OptimizerStats;
}): void {
  const { metrics, semesterTotal, semesterDistribution, targetSks, finalCourseCount, mode, stats } = input;
  const coverageRatio = targetSks > 0 ? metrics.totalSks / targetSks : 1;

  const lines = [
    `${PREFIX} optimization summary`,
    "  Layer 1 - Preferred Semester Coverage:",
    `    ${metrics.semesterMatchCount} / ${semesterTotal}`,
    "  Layer 2 - Total SKS:",
    `    ${metrics.totalSks} / ${targetSks}`,
    "  Layer 3 - Conflicts:",
    `    ${metrics.conflictCount}`,
    "  Layer 4 - Active Days:",
    `    ${metrics.activeDays}`,
    "  Layer 5 - Time Window Violations:",
    `    ${metrics.timeViolations}`,
    "  Layer 6 - Idle Minutes:",
    `    ${metrics.idleMinutes}`,
    "  Layer 7 - Preferred Lecturer Matches:",
    `    ${metrics.lecturerMatchCount}`,
    "  Layer 8 - Preferred Course Matches:",
    `    ${metrics.courseMatchCount}`,
    "  Semester Distribution:",
    ...Object.entries(semesterDistribution).map(([semester, count]) => `    ${semester} = ${count}`),
    "  Branch-and-Bound Stats:",
    `    explored ${stats.branchesExplored}, pruned ${stats.branchesPruned}, best updated ${stats.bestUpdates}x`,
    "  Final Selected Courses:",
    `    ${finalCourseCount}`,
    "  Decision Engine:",
    `    Lexicographic Optimization (${mode})`,
  ];

  if (coverageRatio < MIN_TARGET_RATIO) {
    lines.push(
      `  WARNING: SKS coverage ${(coverageRatio * 100).toFixed(0)}% is below the ${(MIN_TARGET_RATIO * 100).toFixed(0)}% floor — no feasible combination reached the target, this is the optimizer's best available result.`,
    );
  }

  logger.log(lines.join("\n"));
}

export type RequestMetrics = {
  requestId: string;
  mode: ExecutionMode;
  aiLatencyMs: number;
  promptTokens: number | null;
  completionTokens: number | null;
  optimizerMs: number;
  validationMs: number;
  totalMs: number;
  result: "SUCCESS" | "FAILED";
};

/** The standard end-of-request summary block every Schedule AI request logs exactly once. */
export function logRequestSummary(metrics: RequestMetrics): void {
  logger.log(
    [
      `${PREFIX} request summary`,
      `  request id: ${metrics.requestId}`,
      `  mode: ${metrics.mode}`,
      `  prompt tokens: ${metrics.promptTokens ?? "n/a"}`,
      `  completion tokens: ${metrics.completionTokens ?? "n/a"}`,
      `  ai latency: ${metrics.aiLatencyMs}ms`,
      `  optimizer time: ${metrics.optimizerMs}ms`,
      `  validation time: ${metrics.validationMs}ms`,
      `  total duration: ${metrics.totalMs}ms`,
      `  result: ${metrics.result}`,
    ].join("\n"),
  );
}
