import { capture } from "./client";
import { maskNim } from "./identity";
import {
  applyGuestPersonProperties,
  identifyStudent,
  resetAnalytics,
} from "./person";
import { detectDeviceContext, type ActiveUser } from "./helpers";

export type { ActiveUser };
export { identifyStudent, resetAnalytics, applyGuestPersonProperties };

/** Standard base properties present on all WAR analytics events. */
export type BaseWarProperties = {
  request_id?: string;
  war_mode: "test" | "production";
  total_courses: number;
  successful_courses?: number;
  failed_courses?: number;
  retry_count?: number;
  total_attempts?: number;
  execution_duration_ms?: number;
  waiting_duration_ms?: number;
  validation_duration_ms?: number;
  browser?: string;
  os?: string;
  device?: string;
  page_version?: string;
};

/** Helper to build clean standard business properties without backend internal details. */
export function buildWarProperties<T extends Record<string, any>>(
  props: T,
): T & ReturnType<typeof detectDeviceContext> {
  const deviceCtx = detectDeviceContext();
  return {
    ...deviceCtx,
    ...props,
  };
}

// ---------------------------------------------------------------------------
// Standardized WAR KRS Analytics Events (Audit & Redesign Requirements)
// ---------------------------------------------------------------------------

/** 1. Fired when WAR page (/submit) is opened by the user. */
export function trackWarPageOpened(props: {
  war_mode: "test" | "production";
  total_courses: number;
  has_schedule: boolean;
}): void {
  capture("war_page_opened", buildWarProperties(props));
}

/** 2. Fired when local or remote schedule for WAR is loaded. */
export function trackWarScheduleLoaded(props: {
  war_mode: "test" | "production";
  total_courses: number;
  total_sks: number;
  has_schedule: boolean;
}): void {
  capture("war_schedule_loaded", buildWarProperties(props));
}

/** 3. Fired after schedule validation finishes. */
export function trackWarValidationCompleted(props: {
  war_mode: "test" | "production";
  total_courses: number;
  is_valid: boolean;
  validation_duration_ms: number;
}): void {
  capture("war_validation_completed", buildWarProperties(props));
}

/** 4. Fired when user initiates readiness / status check. */
export function trackWarReadyCheckStarted(props: {
  war_mode: "test" | "production";
  total_courses: number;
}): void {
  capture("war_ready_check_started", buildWarProperties(props));
}

/** 5. Fired when readiness / status check completes. */
export function trackWarReadyCheckCompleted(props: {
  war_mode: "test" | "production";
  is_open: boolean;
  duration_ms: number;
}): void {
  capture("war_ready_check_completed", buildWarProperties(props));
}

/** 6. Fired ONCE when WAR submission process is initiated by user. */
export function trackWarSubmissionStarted(props: {
  request_id: string;
  war_mode: "test" | "production";
  total_courses: number;
}): void {
  capture("war_submission_started", buildWarProperties(props), {
    reliable: true,
  });
}

/** 7. Fired when waiting phase starts before or during submission. */
export function trackWarWaitingStarted(props: {
  request_id: string;
  war_mode: "test" | "production";
  waiting_duration_ms: number;
}): void {
  capture("war_waiting_started", buildWarProperties(props));
}

/** 8. Fired when a submission attempt starts. */
export function trackWarSubmissionAttemptStarted(props: {
  request_id: string;
  war_mode: "test" | "production";
  attempt: number;
  total_attempts: number;
}): void {
  capture("war_submission_attempt_started", buildWarProperties(props));
}

/** 9. Fired when a submission attempt finishes. */
export function trackWarSubmissionAttemptFinished(props: {
  request_id: string;
  war_mode: "test" | "production";
  attempt: number;
  duration_ms: number;
  success_count: number;
  failed_count: number;
}): void {
  capture("war_submission_attempt_finished", buildWarProperties(props));
}

/** 10. Fired when a retry attempt is triggered. */
export function trackWarSubmissionRetry(props: {
  request_id: string;
  war_mode: "test" | "production";
  retry_count: number;
  attempt: number;
}): void {
  capture("war_submission_retry", buildWarProperties(props));
}

/** 11. Fired ONCE when the entire WAR submission completes. */
export function trackWarSubmissionCompleted(props: {
  request_id: string;
  war_mode: "test" | "production";
  total_courses: number;
  successful_courses: number;
  failed_courses: number;
  retry_count: number;
  total_attempts: number;
  execution_duration_ms: number;
  waiting_duration_ms?: number;
  validation_duration_ms?: number;
}): void {
  capture("war_submission_completed", buildWarProperties(props), {
    reliable: true,
  });
}

/** 12. Fired ONCE if WAR submission is cancelled or aborted by user. */
export function trackWarSubmissionCancelled(props: {
  request_id: string;
  war_mode: "test" | "production";
  total_courses: number;
  duration_ms: number;
  reason?: string;
}): void {
  capture("war_submission_cancelled", buildWarProperties(props), {
    reliable: true,
  });
}

/** 13. Fired ONCE if WAR submission encounters a fatal error or failure. */
export function trackWarSubmissionFailed(props: {
  request_id: string;
  war_mode: "test" | "production";
  total_courses: number;
  duration_ms: number;
  error_message?: string;
}): void {
  capture("war_submission_failed", buildWarProperties(props), {
    reliable: true,
  });
}

/** 14. Fired when user releases or deletes courses from WAR schedule. */
export function trackWarReleaseSchedule(props: {
  war_mode: "test" | "production";
  released_count: number;
  remaining_count: number;
}): void {
  capture("war_release_schedule", buildWarProperties(props));
}

/** 15. Fired when session expires (401 unauthenticated) during WAR actions. */
export function trackWarSessionExpired(props: {
  page: string;
  action: string;
}): void {
  capture(
    "war_session_expired",
    buildWarProperties({ war_mode: "production", total_courses: 0, ...props }),
    { reliable: true },
  );
}

/** 16. Fired when local schedule is updated or saved. */
export function trackWarLocalScheduleChanged(props: {
  action: string;
  total_courses: number;
}): void {
  capture(
    "war_local_schedule_changed",
    buildWarProperties({ war_mode: "production", ...props }),
  );
}

// ---------------------------------------------------------------------------
// Non-WAR Events (Maintained for backward compatibility across the app)
// ---------------------------------------------------------------------------

/** Fired on successful login. Uses sendBeacon since a redirect follows immediately. */
export async function trackLogin(user: ActiveUser): Promise<void> {
  if (!user?.nim) return;
  await identifyStudent(user);
  capture("user_logged_in", undefined, { reliable: true });
}

export type PwaPlatform = "mobile" | "desktop";

export type PwaInstallProperties = {
  source: string;
  platform: PwaPlatform;
  display_mode: string;
  isStandalone: boolean;
};

/** Fired once when KeRaS is installed as a PWA (`appinstalled`). */
export function trackPwaInstalled(props: PwaInstallProperties): void {
  capture("pwa_dipasang", props, { reliable: true });
}

export type ShareMethod = "copy_link" | "native_share";

/** Fired when a student generates a share link for their schedule. */
export function trackScheduleShared(
  sharedCount: number,
  method: ShareMethod,
): void {
  capture("jadwal_dibagikan", {
    shared_count: sharedCount,
    share_method: method,
  });
}

/** Fired when a student adopts a schedule opened from a share link. */
export function trackScheduleAdopted(
  adoptedCount: number,
  replaced: boolean,
): void {
  capture(
    "jadwal_diadopsi",
    { adopted_count: adoptedCount, replaced_existing: replaced },
    { reliable: true },
  );
}

/** Fired when a student successfully generates a schedule via AI dialog. */
export function trackAiScheduleGenerated(
  courseCount: number,
  goal: string,
  generationTimeMs?: number,
): void {
  capture("jadwal_ai_dibuat", {
    course_count: courseCount,
    goal,
    ...(generationTimeMs !== undefined
      ? { generation_time_ms: generationTimeMs }
      : {}),
  });
  trackWarLocalScheduleChanged({
    action: "ai_generated",
    total_courses: courseCount,
  });
}
