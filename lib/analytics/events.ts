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
