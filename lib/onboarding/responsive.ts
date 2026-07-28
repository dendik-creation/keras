import { DeviceType } from "./types";

export const BREAKPOINTS = {
  MOBILE_MAX: 767,
  TABLET_MAX: 1023,
} as const;

export function getDeviceType(width: number): DeviceType {
  if (width <= BREAKPOINTS.MOBILE_MAX) {
    return "mobile";
  }
  if (width <= BREAKPOINTS.TABLET_MAX) {
    return "tablet";
  }
  return "desktop";
}

export function getModalPadding(deviceType: DeviceType): number {
  return deviceType === "mobile" ? 8 : 14;
}

export function getModalRadius(deviceType: DeviceType): number {
  return deviceType === "mobile" ? 12 : 8;
}

/**
  * Async smooth scroll helper using requestAnimationFrame.
  * Scroll target cleanly into view before Shepherd tooltip attaches.
  * Zero setTimeout used.
  */
export function scrollToTargetAsync(element: HTMLElement): Promise<void> {
  return new Promise((resolve) => {
    element.scrollIntoView({
      behavior: "smooth",
      block: "center",
      inline: "nearest",
    });

    let lastTop = element.getBoundingClientRect().top;
    let stableFrameCount = 0;

    function checkPos() {
      const currentTop = element.getBoundingClientRect().top;
      if (Math.abs(currentTop - lastTop) < 1) {
        stableFrameCount++;
        if (stableFrameCount >= 3) {
          resolve();
          return;
        }
      } else {
        stableFrameCount = 0;
        lastTop = currentTop;
      }
      requestAnimationFrame(checkPos);
    }

    requestAnimationFrame(checkPos);
  });
}
