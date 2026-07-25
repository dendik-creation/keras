import { logger } from "@/lib/logger";
import type { CourseWithSemester, ScheduleValidationIssues } from "@/modules/schedule-ai/schedule-ai.types";

const PREFIX = "[schedule-ai]";

/** Never print raw schedule_id hashes — log the short row ids the AI actually used instead. */
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
  if (issues.invalid_id.length) {
    lines.push("  unknown ids:", ...issues.invalid_id.map((c) => `    - ${c}`));
  }
  lines.push(`  sks: ${issues.total_sks} / ${issues.target_sks}${issues.sks_exceeded ? " (exceeded)" : ""}`);
  lines.push(`  status: ${valid ? "PASSED" : "FAILED"}`);

  logger.log(lines.join("\n"));
}

export type ExecutionMode = "ai" | "repair" | "fallback";

export type RequestMetrics = {
  requestId: string;
  mode: ExecutionMode;
  attemptCount: number;
  promptTokens: number | null;
  completionTokens: number | null;
  aiLatencyMs: number;
  validationMs: number;
  fallbackMs: number;
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
      `  attempts: ${metrics.attemptCount}`,
      `  prompt tokens: ${metrics.promptTokens ?? "n/a"}`,
      `  completion tokens: ${metrics.completionTokens ?? "n/a"}`,
      `  ai latency: ${metrics.aiLatencyMs}ms`,
      `  validation time: ${metrics.validationMs}ms`,
      `  fallback time: ${metrics.fallbackMs}ms`,
      `  total duration: ${metrics.totalMs}ms`,
      `  result: ${metrics.result}`,
    ].join("\n"),
  );
}
