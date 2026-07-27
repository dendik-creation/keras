import { getLocalStorage, setLocalStorage, removeLocalStorage } from "@/helper/local_storage";

export const ONBOARDING_VERSION = "v1";

export function getOnboardingKey(route: string): string {
  const cleanRoute = route.replace(/^\//, "") || "home";
  return `keras_onboarding_${ONBOARDING_VERSION}_${cleanRoute}_seen`;
}

export function isOnboardingSeen(route: string): boolean {
  if (typeof window === "undefined") return false;
  const key = getOnboardingKey(route);
  const val = getLocalStorage(key);
  return val === true || val === "true";
}

export function markOnboardingSeen(route: string): void {
  if (typeof window === "undefined") return;
  const key = getOnboardingKey(route);
  setLocalStorage(key, true);
}

export function resetOnboardingSeen(route?: string): void {
  if (typeof window === "undefined") return;
  if (route) {
    removeLocalStorage(getOnboardingKey(route));
  } else {
    removeLocalStorage(getOnboardingKey("/schedule"));
    removeLocalStorage(getOnboardingKey("/submit"));
  }
}
