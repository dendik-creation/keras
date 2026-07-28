"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Shepherd, { StepOptionsButton } from "shepherd.js";
import { flip, shift, offset } from "@floating-ui/dom";
import { ONBOARDING_CONFIGS } from "@/lib/onboarding/config";
import { resolveTourStep } from "@/lib/onboarding/target-resolver";
import { isOnboardingSeen, markOnboardingSeen } from "@/lib/onboarding/storage";
import {
  getDeviceType,
  getModalPadding,
  getModalRadius,
  scrollToTargetAsync,
} from "@/lib/onboarding/responsive";
import "./ShepherdStyles.css";

export default function OnboardingController() {
  const pathname = usePathname();
  const tourRef = useRef<InstanceType<typeof Shepherd.Tour> | null>(null);
  const activeRouteRef = useRef<string | null>(null);

  useEffect(() => {
    const currentConfig = ONBOARDING_CONFIGS[pathname];
    if (!currentConfig) {
      if (tourRef.current && tourRef.current.isActive()) {
        tourRef.current.cancel();
        tourRef.current = null;
      }
      activeRouteRef.current = null;
      document.body.classList.remove("shepherd-active");
      return;
    }

    const route = currentConfig.route;
    activeRouteRef.current = route;

    if (isOnboardingSeen(route)) {
      return;
    }

    let isMounted = true;
    let checkAttempts = 0;
    const maxAttempts = 20;

    const startTourWhenReady = () => {
      if (!isMounted) return;

      const deviceType = getDeviceType(window.innerWidth);
      const firstStepResolved = resolveTourStep(currentConfig.steps[0], deviceType);
      const firstElement = document.querySelector(firstStepResolved.target);

      if (!firstElement && checkAttempts < maxAttempts) {
        checkAttempts++;
        requestAnimationFrame(() => {
          setTimeout(startTourWhenReady, 250);
        });
        return;
      }

      if (!isMounted) return;

      if (tourRef.current && tourRef.current.isActive()) {
        tourRef.current.cancel();
      }

      document.body.classList.add("shepherd-active");

      const tour = new Shepherd.Tour({
        useModalOverlay: true,
        exitOnEsc: true,
        keyboardNavigation: true,
        defaultStepOptions: {
          classes: "keras-shepherd-theme",
          scrollTo: false,
          modalOverlayOpeningPadding: getModalPadding(deviceType),
          modalOverlayOpeningRadius: getModalRadius(deviceType),
          cancelIcon: {
            enabled: true,
            label: "Tutup",
          },
          floatingUIOptions: {
            middleware: [
              offset(10),
              flip({
                fallbackPlacements: ["top", "bottom", "left", "right"],
              }),
              shift({
                padding: 12,
              }),
            ],
          },
        },
      });

      const totalSteps = currentConfig.steps.length;

      currentConfig.steps.forEach((step, index) => {
        const resolvedStep = resolveTourStep(step, deviceType);
        const isFirst = index === 0;
        const isLast = index === totalSteps - 1;

        const buttons: StepOptionsButton[] = [
          {
            text: "Lewati",
            classes: "shepherd-button shepherd-button-danger",
            async action() {
              if (resolvedStep.beforeHide) {
                await resolvedStep.beforeHide();
              }
              markOnboardingSeen(route);
              this.cancel();
            },
          },
        ];

        if (!isFirst) {
          buttons.push({
            text: "Kembali",
            classes: "shepherd-button shepherd-button-secondary",
            async action() {
              if (resolvedStep.beforeHide) {
                await resolvedStep.beforeHide();
              }
              this.back();
            },
          });
        }

        if (isLast) {
          buttons.push({
            text: "Selesai",
            classes: "shepherd-button shepherd-button-primary",
            async action() {
              if (resolvedStep.beforeHide) {
                await resolvedStep.beforeHide();
              }
              markOnboardingSeen(route);
              this.complete();
            },
          });
        } else {
          buttons.push({
            text: "Lanjut",
            classes: "shepherd-button shepherd-button-primary",
            async action() {
              if (resolvedStep.beforeHide) {
                await resolvedStep.beforeHide();
              }
              this.next();
            },
          });
        }

        const targetEl = document.querySelector(resolvedStep.target);

        tour.addStep({
          id: resolvedStep.id,
          title: resolvedStep.title,
          text: resolvedStep.text,
          attachTo: targetEl ? { element: resolvedStep.target, on: resolvedStep.placement } : undefined,
          buttons: buttons,
          async beforeShowPromise() {
            if (resolvedStep.beforeShow) {
              await resolvedStep.beforeShow();
            }
            const el = document.querySelector<HTMLElement>(resolvedStep.target);
            if (el) {
              await scrollToTargetAsync(el);
            }
          },
        });
      });

      const cleanupTourState = () => {
        document.body.classList.remove("shepherd-active");
        markOnboardingSeen(route);
      };

      tour.on("complete", cleanupTourState);
      tour.on("cancel", cleanupTourState);

      tourRef.current = tour;
      tour.start();
    };

    const timer = setTimeout(startTourWhenReady, 300);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      document.body.classList.remove("shepherd-active");
      if (tourRef.current && tourRef.current.isActive()) {
        tourRef.current.cancel();
        tourRef.current = null;
      }
    };
  }, [pathname]);

  // Listen for manual restart tour events
  useEffect(() => {
    const handleReplay = (e: Event) => {
      const customEvent = e as CustomEvent<{ route?: string }>;
      const targetRoute = customEvent.detail?.route || pathname;
      const currentConfig = ONBOARDING_CONFIGS[targetRoute];

      if (!currentConfig) return;

      if (tourRef.current && tourRef.current.isActive()) {
        tourRef.current.cancel();
        tourRef.current = null;
      }

      const deviceType = getDeviceType(window.innerWidth);
      document.body.classList.add("shepherd-active");

      const tour = new Shepherd.Tour({
        useModalOverlay: true,
        exitOnEsc: true,
        keyboardNavigation: true,
        defaultStepOptions: {
          classes: "keras-shepherd-theme",
          scrollTo: false,
          modalOverlayOpeningPadding: getModalPadding(deviceType),
          modalOverlayOpeningRadius: getModalRadius(deviceType),
          cancelIcon: {
            enabled: true,
            label: "Tutup",
          },
          floatingUIOptions: {
            middleware: [
              offset(10),
              flip({
                fallbackPlacements: ["top", "bottom", "left", "right"],
              }),
              shift({
                padding: 12,
              }),
            ],
          },
        },
      });

      const totalSteps = currentConfig.steps.length;

      currentConfig.steps.forEach((step, index) => {
        const resolvedStep = resolveTourStep(step, deviceType);
        const isFirst = index === 0;
        const isLast = index === totalSteps - 1;

        const buttons: StepOptionsButton[] = [
          {
            text: "Lewati",
            classes: "shepherd-button shepherd-button-danger",
            async action() {
              if (resolvedStep.beforeHide) {
                await resolvedStep.beforeHide();
              }
              markOnboardingSeen(targetRoute);
              this.cancel();
            },
          },
        ];

        if (!isFirst) {
          buttons.push({
            text: "Kembali",
            classes: "shepherd-button shepherd-button-secondary",
            async action() {
              if (resolvedStep.beforeHide) {
                await resolvedStep.beforeHide();
              }
              this.back();
            },
          });
        }

        if (isLast) {
          buttons.push({
            text: "Selesai",
            classes: "shepherd-button shepherd-button-primary",
            async action() {
              if (resolvedStep.beforeHide) {
                await resolvedStep.beforeHide();
              }
              markOnboardingSeen(targetRoute);
              this.complete();
            },
          });
        } else {
          buttons.push({
            text: "Lanjut",
            classes: "shepherd-button shepherd-button-primary",
            async action() {
              if (resolvedStep.beforeHide) {
                await resolvedStep.beforeHide();
              }
              this.next();
            },
          });
        }

        const targetEl = document.querySelector(resolvedStep.target);

        tour.addStep({
          id: resolvedStep.id,
          title: resolvedStep.title,
          text: resolvedStep.text,
          attachTo: targetEl ? { element: resolvedStep.target, on: resolvedStep.placement } : undefined,
          buttons: buttons,
          async beforeShowPromise() {
            if (resolvedStep.beforeShow) {
              await resolvedStep.beforeShow();
            }
            const el = document.querySelector<HTMLElement>(resolvedStep.target);
            if (el) {
              await scrollToTargetAsync(el);
            }
          },
        });
      });

      const cleanupTourState = () => {
        document.body.classList.remove("shepherd-active");
        markOnboardingSeen(targetRoute);
      };

      tour.on("complete", cleanupTourState);
      tour.on("cancel", cleanupTourState);

      tourRef.current = tour;
      tour.start();
    };

    window.addEventListener("keras-restart-tour", handleReplay);
    return () => {
      window.removeEventListener("keras-restart-tour", handleReplay);
    };
  }, [pathname]);

  return null;
}
