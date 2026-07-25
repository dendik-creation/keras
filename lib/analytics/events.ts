import { capture } from "./client";
import { maskNim } from "./identity";
import {
  applyGuestPersonProperties,
  identifyStudent,
  resetAnalytics,
} from "./person";
import type { ActiveUser } from "./helpers";

export type { ActiveUser };
export { identifyStudent, resetAnalytics, applyGuestPersonProperties };

/** Fired on successful login. Uses sendBeacon since a redirect follows immediately. */
export async function trackLogin(user: ActiveUser): Promise<void> {
  if (!user?.nim) return;
  await identifyStudent(user);
  capture("user_logged_in", undefined, { reliable: true });
}

/** Fired when a student prepares a schedule set for the KRS war. */
export function trackPrepared(user: ActiveUser, preparedCount: number): void {
  if (!user?.nim) return;
  capture("jadwal_disiapkan", {
    masked_nim: maskNim(user.nim),
    prepared_count: preparedCount,
  });
}

/** Fired when a KRS war run finishes — prepared vs successfully secured. */
export function trackWarFinished(
  user: ActiveUser,
  preparedCount: number,
  successCount: number,
): void {
  if (!user?.nim) return;
  capture("perang_selesai", {
    masked_nim: maskNim(user.nim),
    prepared_count: preparedCount,
    success_count: successCount,
    failed_count: Math.max(preparedCount - successCount, 0),
    success_rate:
      preparedCount > 0 ? Math.round((successCount / preparedCount) * 100) : 0,
  });
}

/** Fired once per war run, right before the first attempt goes out. */
export function trackWarStarted(user: ActiveUser, preparedCount: number): void {
  if (!user?.nim) return;
  capture("war_started", {
    masked_nim: maskNim(user.nim),
    prepared_count: preparedCount,
  });
}

/** Fired when a submit attempt (1 of TOTAL_ATTEMPTS) kicks off. */
export function trackAttemptStarted(user: ActiveUser, attempt: number): void {
  if (!user?.nim) return;
  capture("attempt_started", {
    masked_nim: maskNim(user.nim),
    attempt,
  });
}

/** Fired when a submit attempt settles (success or failure response received). */
export function trackAttemptFinished(
  user: ActiveUser,
  props: {
    attempt: number;
    durationMs: number;
    successCount: number;
    failedCount: number;
  },
): void {
  if (!user?.nim) return;
  capture("attempt_finished", {
    masked_nim: maskNim(user.nim),
    attempt: props.attempt,
    duration_ms: props.durationMs,
    success_count: props.successCount,
    failed_count: props.failedCount,
  });
}

/** Fired every time an individual course gets secured during a war run. */
export function trackCourseSecured(user: ActiveUser, attempt: number): void {
  if (!user?.nim) return;
  capture("course_secured", {
    masked_nim: maskNim(user.nim),
    attempt,
  });
}

/** Fired every time an individual course submit fails during a war run. */
export function trackCourseFailed(user: ActiveUser, attempt: number): void {
  if (!user?.nim) return;
  capture("course_failed", {
    masked_nim: maskNim(user.nim),
    attempt,
  });
}

/** Fired once when the entire war run (all attempts + final sync) is done. */
export function trackWarCompleted(
  user: ActiveUser,
  props: { preparedCount: number; successCount: number },
): void {
  if (!user?.nim) return;
  const failedCount = Math.max(props.preparedCount - props.successCount, 0);
  capture("war_completed", {
    masked_nim: maskNim(user.nim),
    prepared_count: props.preparedCount,
    success_count: props.successCount,
    failed_count: failedCount,
    success_rate:
      props.preparedCount > 0
        ? Math.round((props.successCount / props.preparedCount) * 100)
        : 0,
  });
}

export type PwaPlatform = "mobile" | "desktop";

export type PwaInstallProperties = {
  source: string;
  platform: PwaPlatform;
  display_mode: string;
  isStandalone: boolean;
};

/**
 * Fired once when KeRaS is installed as a PWA (`appinstalled`). Anonymous by
 * design — installs usually happen before login. Uses sendBeacon so the
 * capture isn't dropped if the browser tears the page down right after.
 */
export function trackPwaInstalled(props: PwaInstallProperties): void {
  capture("pwa_dipasang", props, { reliable: true });
}

export type ShareMethod = "copy_link" | "native_share";

/** Fired when a student generates a share link for their schedule — only after Shlink succeeds. */
export function trackScheduleShared(
  sharedCount: number,
  method: ShareMethod,
): void {
  capture("jadwal_dibagikan", {
    shared_count: sharedCount,
    share_method: method,
  });
}

/** Fired when a student adopts a schedule opened from a share link. Redirect follows immediately. */
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

/** Fired when a student successfully generates a schedule via the AI dialog. */
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
}
