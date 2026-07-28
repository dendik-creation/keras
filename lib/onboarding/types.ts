export type DeviceType = "mobile" | "tablet" | "desktop";

export type PlacementType =
  | "top"
  | "bottom"
  | "left"
  | "right"
  | "top-start"
  | "top-end"
  | "bottom-start"
  | "bottom-end"
  | "left-start"
  | "left-end"
  | "right-start"
  | "right-end"
  | "auto";

export interface OnboardingStepConfig {
  id: string;
  title: string;
  text: string;
  desktopTarget: string;
  mobileTarget: string;
  desktopPlacement: PlacementType;
  mobilePlacement: PlacementType;
  tabletPlacement?: PlacementType;
  beforeShow?: () => Promise<void> | void;
  beforeHide?: () => Promise<void> | void;
}

export interface RouteOnboardingConfig {
  route: string;
  steps: OnboardingStepConfig[];
}

export interface ResolvedTourStep {
  id: string;
  title: string;
  text: string;
  target: string;
  placement: PlacementType;
  beforeShow?: () => Promise<void> | void;
  beforeHide?: () => Promise<void> | void;
}
