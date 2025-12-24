import * as React from "react";
import type { ReducedMotionSetting } from "./types";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

const getMediaQueryList = (): MediaQueryList | null => {
  if (
    typeof window === "undefined" ||
    typeof window.matchMedia !== "function"
  ) {
    return null;
  }
  return window.matchMedia(REDUCED_MOTION_QUERY);
};

const getSnapshot = (): boolean => getMediaQueryList()?.matches ?? false;

const subscribe = (onStoreChange: () => void): (() => void) => {
  const mediaQueryList = getMediaQueryList();
  if (!mediaQueryList) {
    return () => {};
  }
  const handler = () => onStoreChange();
  if (typeof mediaQueryList.addEventListener === "function") {
    mediaQueryList.addEventListener("change", handler);
    return () => mediaQueryList.removeEventListener("change", handler);
  }
  mediaQueryList.addListener(handler);
  return () => mediaQueryList.removeListener(handler);
};

export const useReducedMotion = (): boolean =>
  React.useSyncExternalStore(subscribe, getSnapshot, () => false);

export const resolveReducedMotion = (
  setting: ReducedMotionSetting | boolean | undefined,
  prefersReducedMotion: boolean,
): boolean => {
  if (setting === true) return true;
  if (setting === false) return false;
  switch (setting) {
    case "always":
      return true;
    case "never":
      return false;
    default:
      return prefersReducedMotion;
  }
};
