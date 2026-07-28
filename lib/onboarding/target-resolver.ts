import { DeviceType, OnboardingStepConfig, ResolvedTourStep } from "./types";

export function resolveTourStep(
  step: OnboardingStepConfig,
  deviceType: DeviceType
): ResolvedTourStep {
  const isDesktop = deviceType === "desktop";

  const target = isDesktop ? step.desktopTarget : step.mobileTarget;
  const placement = isDesktop
    ? step.desktopPlacement
    : deviceType === "tablet"
      ? step.tabletPlacement || step.mobilePlacement
      : step.mobilePlacement;

  if (process.env.NODE_ENV === "development") {
    console.log(
      `[shepherd] Viewport: ${deviceType} | Step: ${step.id} | Resolved Target: ${target} | Placement: ${placement}`
    );
  }

  return {
    id: step.id,
    title: step.title,
    text: step.text,
    target,
    placement,
    beforeShow: step.beforeShow,
    beforeHide: step.beforeHide,
  };
}
