"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Shepherd, { StepOptionsButton } from "shepherd.js";
import { ONBOARDING_CONFIGS } from "@/lib/onboarding/config";
import { isOnboardingSeen, markOnboardingSeen } from "@/lib/onboarding/storage";
import "./ShepherdStyles.css";

export default function OnboardingController() {
  const pathname = usePathname();
  const tourRef = useRef<InstanceType<typeof Shepherd.Tour> | null>(null);
  const activeRouteRef = useRef<string | null>(null);

  useEffect(() => {
    // Determine active route config
    const currentConfig = ONBOARDING_CONFIGS[pathname];
    if (!currentConfig) {
      if (tourRef.current && tourRef.current.isActive()) {
        tourRef.current.cancel();
        tourRef.current = null;
      }
      activeRouteRef.current = null;
      return;
    }

    const route = currentConfig.route;
    activeRouteRef.current = route;

    // Check if already seen
    if (isOnboardingSeen(route)) {
      return;
    }

    let isMounted = true;
    let checkAttempts = 0;
    const maxAttempts = 20;

    const startTourWhenReady = () => {
      if (!isMounted) return;

      // Check if target for the first step is in DOM
      const firstTarget = currentConfig.steps[0]?.target;
      const element = firstTarget ? document.querySelector(firstTarget) : null;

      if (!element && checkAttempts < maxAttempts) {
        checkAttempts++;
        setTimeout(startTourWhenReady, 250);
        return;
      }

      if (!isMounted) return;

      // Clean up previous tour if any
      if (tourRef.current && tourRef.current.isActive()) {
        tourRef.current.cancel();
      }

      const tour = new Shepherd.Tour({
        useModalOverlay: true,
        defaultStepOptions: {
          classes: "keras-shepherd-theme",
          scrollTo: { behavior: "smooth", block: "center" },
          cancelIcon: {
            enabled: true,
            label: "Tutup",
          },
        },
      });

      const totalSteps = currentConfig.steps.length;

      currentConfig.steps.forEach((step, index) => {
        const isFirst = index === 0;
        const isLast = index === totalSteps - 1;

        const buttons: StepOptionsButton[] = [
          {
            text: "Lewati",
            classes: "shepherd-button shepherd-button-danger",
            action() {
              markOnboardingSeen(route);
              this.cancel();
            },
          },
        ];

        if (!isFirst) {
          buttons.push({
            text: "Kembali",
            classes: "shepherd-button shepherd-button-secondary",
            action() {
              this.back();
            },
          });
        }

        if (isLast) {
          buttons.push({
            text: "Selesai",
            classes: "shepherd-button shepherd-button-primary",
            action() {
              markOnboardingSeen(route);
              this.complete();
            },
          });
        } else {
          buttons.push({
            text: "Lanjut",
            classes: "shepherd-button shepherd-button-primary",
            action() {
              this.next();
            },
          });
        }

        // Handle attachTo options safely in case element isn't in DOM
        const targetEl = document.querySelector(step.target);
        const attachTo = targetEl ? step.attachToOptions : undefined;

        tour.addStep({
          id: step.id,
          title: step.title,
          text: step.text,
          attachTo: attachTo,
          buttons: buttons,
        });
      });

      tour.on("complete", () => {
        markOnboardingSeen(route);
      });

      tour.on("cancel", () => {
        markOnboardingSeen(route);
      });

      tourRef.current = tour;
      tour.start();
    };

    // Small delay to ensure React hydration finish
    const timer = setTimeout(startTourWhenReady, 300);

    return () => {
      isMounted = false;
      clearTimeout(timer);
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

      const tour = new Shepherd.Tour({
        useModalOverlay: true,
        defaultStepOptions: {
          classes: "keras-shepherd-theme",
          scrollTo: { behavior: "smooth", block: "center" },
          cancelIcon: {
            enabled: true,
            label: "Tutup",
          },
        },
      });

      const totalSteps = currentConfig.steps.length;

      currentConfig.steps.forEach((step, index) => {
        const isFirst = index === 0;
        const isLast = index === totalSteps - 1;

        const buttons: StepOptionsButton[] = [
          {
            text: "Lewati",
            classes: "shepherd-button shepherd-button-danger",
            action() {
              markOnboardingSeen(targetRoute);
              this.cancel();
            },
          },
        ];

        if (!isFirst) {
          buttons.push({
            text: "Kembali",
            classes: "shepherd-button shepherd-button-secondary",
            action() {
              this.back();
            },
          });
        }

        if (isLast) {
          buttons.push({
            text: "Selesai",
            classes: "shepherd-button shepherd-button-primary",
            action() {
              markOnboardingSeen(targetRoute);
              this.complete();
            },
          });
        } else {
          buttons.push({
            text: "Lanjut",
            classes: "shepherd-button shepherd-button-primary",
            action() {
              this.next();
            },
          });
        }

        const targetEl = document.querySelector(step.target);
        const attachTo = targetEl ? step.attachToOptions : undefined;

        tour.addStep({
          id: step.id,
          title: step.title,
          text: step.text,
          attachTo: attachTo,
          buttons: buttons,
        });
      });

      tour.on("complete", () => {
        markOnboardingSeen(targetRoute);
      });

      tour.on("cancel", () => {
        markOnboardingSeen(targetRoute);
      });

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
