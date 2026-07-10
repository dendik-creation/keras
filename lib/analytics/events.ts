import posthog from "posthog-js";

export type ActiveUser = {
  name: string;
  nim: string;
  major: string;
  degree: string;
};

/** Keep the first 6 digits real, mask the rest (e.g. 202451234 -> 202451***). */
export function maskNim(nim: string): string {
  if (!nim) return "";
  const visible = nim.slice(0, 6);
  const masked = "*".repeat(Math.max(nim.length - 6, 0));
  return visible + masked;
}

/**
 * Deterministic, non-reversible id derived from the full NIM.
 * Used as the analytics distinct id so unique-user counts stay accurate
 * while the raw NIM is never sent anywhere.
 */
async function hashNim(nim: string): Promise<string> {
  const data = new TextEncoder().encode(nim);
  const digest = await crypto.subtle.digest("SHA-256", data);
  const hex = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return "keras_" + hex.slice(0, 16);
}

/** True once posthog.init has run (i.e. an analytics key was configured). */
const ready = () => typeof window !== "undefined" && posthog.__loaded;

/** Common identity properties attached to every custom event. */
function identityProps(user: ActiveUser) {
  return {
    nim: maskNim(user.nim),
    jenjang: user.degree || "",
    prodi: user.major || "",
  };
}

/** Link the anonymous session to a stable (masked) student identity. */
export async function identifyStudent(user: ActiveUser) {
  if (!ready() || !user?.nim) return;
  const uid = await hashNim(user.nim);
  posthog.identify(uid, identityProps(user));
}

/** Fired on successful login. */
export async function trackLogin(user: ActiveUser) {
  if (!ready() || !user?.nim) return;
  await identifyStudent(user);
  posthog.capture("user_logged_in", identityProps(user));
}

/** Fired when a student prepares a schedule set for the KRS war. */
export function trackPrepared(user: ActiveUser, preparedCount: number) {
  if (!ready() || !user?.nim) return;
  posthog.capture("jadwal_disiapkan", {
    ...identityProps(user),
    prepared_count: preparedCount,
  });
}

/** Fired when a KRS war run finishes — prepared vs successfully secured. */
export function trackWarFinished(
  user: ActiveUser,
  preparedCount: number,
  successCount: number,
) {
  if (!ready() || !user?.nim) return;
  posthog.capture("perang_selesai", {
    ...identityProps(user),
    prepared_count: preparedCount,
    success_count: successCount,
    failed_count: Math.max(preparedCount - successCount, 0),
    success_rate:
      preparedCount > 0 ? Math.round((successCount / preparedCount) * 100) : 0,
  });
}

/**
 * Fired once when KeRaS is installed as a PWA (added to the home screen).
 * Anonymous by design — installs usually happen on the landing page before a
 * student logs in. PostHog attaches device/OS/browser props automatically, so
 * breakdowns by platform work without any extra fields here.
 */
export function trackPwaInstalled(source: string = "unknown") {
  if (!ready()) return;
  posthog.capture("pwa_dipasang", { source });
}

/** Fired when a student generates a share link for their schedule. */
export function trackScheduleShared(sharedCount: number) {
  if (!ready()) return;
  posthog.capture("jadwal_dibagikan", { shared_count: sharedCount });
}

/** Fired when a student adopts a schedule opened from a share link. */
export function trackScheduleAdopted(adoptedCount: number, replaced: boolean) {
  if (!ready()) return;
  posthog.capture("jadwal_diadopsi", {
    adopted_count: adoptedCount,
    replaced_existing: replaced,
  });
}

/** Detach the identity on logout so a shared browser isn't merged. */
export function resetAnalytics() {
  if (!ready()) return;
  posthog.reset();
}
