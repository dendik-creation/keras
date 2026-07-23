"use client";

import {
  GooeyToaster as GooeyToasterPrimitive,
  gooeyToast as gooeyToastPrimitive,
} from "goey-toast";
import type {
  GooeyPromiseData,
  GooeyToastOptions,
  GooeyToasterProps,
} from "goey-toast";
import "goey-toast/styles.css";

export type { GooeyToasterProps };
export type {
  GooeyToastOptions,
  GooeyPromiseData,
  GooeyToastAction,
  GooeyToastClassNames,
  GooeyToastTimings,
} from "goey-toast";

/**
 * Swiss International Style card: flat white fill, thick black border —
 * the accent (#FF3000) is reserved for the error state, the app's one
 * signal color. Callers can still override fillColor/borderColor/borderWidth
 * per toast; these are just the global defaults.
 */
const SWISS_BORDER_WIDTH = 2;
const SWISS_FILL = "#FFFFFF";
const SWISS_BORDER = "#000000";
const SWISS_SIGNAL_BORDER = "#FF3000";

function withSwissDefaults(
  borderColor: string,
  options?: GooeyToastOptions,
): GooeyToastOptions {
  return {
    fillColor: SWISS_FILL,
    borderColor,
    borderWidth: SWISS_BORDER_WIDTH,
    ...options,
  };
}

const gooeyToast = Object.assign(
  (title: string, options?: GooeyToastOptions) =>
    gooeyToastPrimitive(title, withSwissDefaults(SWISS_BORDER, options)),
  {
    success: (title: string, options?: GooeyToastOptions) =>
      gooeyToastPrimitive.success(title, withSwissDefaults(SWISS_BORDER, options)),
    error: (title: string, options?: GooeyToastOptions) =>
      gooeyToastPrimitive.error(
        title,
        withSwissDefaults(SWISS_SIGNAL_BORDER, options),
      ),
    warning: (title: string, options?: GooeyToastOptions) =>
      gooeyToastPrimitive.warning(title, withSwissDefaults(SWISS_BORDER, options)),
    info: (title: string, options?: GooeyToastOptions) =>
      gooeyToastPrimitive.info(title, withSwissDefaults(SWISS_BORDER, options)),
    promise: <T,>(promise: Promise<T>, data: GooeyPromiseData<T>) =>
      gooeyToastPrimitive.promise(promise, {
        fillColor: SWISS_FILL,
        borderColor: SWISS_BORDER,
        borderWidth: SWISS_BORDER_WIDTH,
        ...data,
      }),
    dismiss: gooeyToastPrimitive.dismiss,
    update: gooeyToastPrimitive.update,
  },
);

export { gooeyToast };

function GooeyToaster(props: GooeyToasterProps) {
  return <GooeyToasterPrimitive position="top-right" {...props} />;
}

export { GooeyToaster };
