"use client";

import { GooeyToaster as GooeyToasterPrimitive, gooeyToast } from "goey-toast";
import type { GooeyToasterProps } from "goey-toast";
import "goey-toast/styles.css";

export { gooeyToast };
export type { GooeyToasterProps };
export type {
  GooeyToastOptions,
  GooeyPromiseData,
  GooeyToastAction,
  GooeyToastClassNames,
  GooeyToastTimings,
} from "goey-toast";

function GooeyToaster(props: GooeyToasterProps) {
  return <GooeyToasterPrimitive position="top-right" {...props} />;
}

export { GooeyToaster };
