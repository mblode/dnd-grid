import type {
  Breakpoint,
  ResponsiveSpacing,
  Spacing,
  SpacingArray,
  SpacingObject,
} from "./types";

const isSpacingObject = (
  value: Spacing | ResponsiveSpacing,
): value is SpacingObject => {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return false;
  return (
    "top" in value || "right" in value || "bottom" in value || "left" in value
  );
};

export const normalizeSpacing = (value: Spacing): SpacingArray => {
  if (typeof value === "number") {
    return [value, value, value, value];
  }
  if (Array.isArray(value)) {
    throw new Error(
      "DndGrid: gap/containerPadding no longer accept arrays. Use a number or { top, right, bottom, left }.",
    );
  }

  return [value.top ?? 0, value.right ?? 0, value.bottom ?? 0, value.left ?? 0];
};

export const resolveResponsiveSpacing = <B extends Breakpoint>(
  value: ResponsiveSpacing<B>,
  breakpoint: B,
): Spacing => {
  if (Array.isArray(value)) {
    throw new Error(
      "DndGrid: responsive spacing does not accept arrays. Use numbers or { top, right, bottom, left }.",
    );
  }
  if (typeof value === "number" || isSpacingObject(value)) {
    return value as Spacing;
  }

  const map = value as Partial<Record<B, Spacing>>;
  const breakpointValue = map[breakpoint];
  if (breakpointValue !== undefined) {
    return breakpointValue;
  }

  const keys = Object.keys(map) as B[];
  for (const key of keys) {
    const entry = map[key];
    if (entry !== undefined) {
      return entry;
    }
  }

  return 0;
};
