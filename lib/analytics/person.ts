import { posthog, isReady } from "./client";
import { hashNim, maskNim } from "./identity";
import type { ActiveUser } from "./helpers";

const GUEST = "Guest";

/**
 * Anonymous visitors are Guests, not missing data — dashboards must never
 * show "None" for degree/major before login. Safe to call repeatedly; only
 * ever writes to a person that isn't already identified (see call sites).
 */
export function applyGuestPersonProperties(): void {
  if (!isReady()) return;
  posthog.setPersonProperties({ degree: GUEST, major: GUEST });
}

function personPropsFromUser(user: ActiveUser): Record<string, string> {
  const props: Record<string, string> = { masked_nim: maskNim(user.nim) };
  // Only overwrite degree/major when the login actually returned a value —
  // never stomp a real value with an empty string.
  if (user.degree) props.degree = user.degree;
  if (user.major) props.major = user.major;
  return props;
}

/** Link the anonymous session to a stable (masked) student identity and update person properties. */
export async function identifyStudent(user: ActiveUser): Promise<void> {
  if (!isReady() || !user?.nim) return;
  const uid = await hashNim(user.nim);
  posthog.identify(uid, personPropsFromUser(user));
}

/** Detach the identity on logout (new anonymous id) and reset to Guest properties. */
export function resetAnalytics(): void {
  if (!isReady()) return;
  posthog.reset();
  applyGuestPersonProperties();
}
