import type {
  Breakpoint,
  BreakpointCols,
  Breakpoints,
  Compactor,
  Layout,
  ResponsiveLayouts,
} from "./types";
import { cloneLayout, correctBounds } from "./utils";

export type DefaultBreakpoints = "lg" | "md" | "sm" | "xs" | "xxs";

export const DEFAULT_BREAKPOINTS: Breakpoints<DefaultBreakpoints> = {
  lg: 1200,
  md: 996,
  sm: 768,
  xs: 480,
  xxs: 0,
};

export const DEFAULT_COLS: BreakpointCols<DefaultBreakpoints> = {
  lg: 12,
  md: 10,
  sm: 6,
  xs: 4,
  xxs: 2,
};

export const sortBreakpoints = <B extends Breakpoint>(
  breakpoints: Breakpoints<B>,
): B[] => {
  const keys = Object.keys(breakpoints) as B[];
  return keys.sort((a, b) => breakpoints[a] - breakpoints[b]);
};

export const getBreakpointFromWidth = <B extends Breakpoint>(
  breakpoints: Breakpoints<B>,
  width: number,
): B => {
  const sorted = sortBreakpoints(breakpoints);
  let matching = sorted[0];

  if (matching === undefined) {
    throw new Error("No breakpoints defined");
  }

  for (let i = 1; i < sorted.length; i++) {
    const breakpointName = sorted[i];
    if (breakpointName === undefined) continue;

    const breakpointWidth = breakpoints[breakpointName];
    if (width >= breakpointWidth) {
      matching = breakpointName;
    }
  }

  return matching;
};

export const getColsFromBreakpoint = <B extends Breakpoint>(
  breakpoint: B,
  cols: BreakpointCols<B>,
): number => {
  const colCount = cols[breakpoint];
  if (colCount === undefined) {
    throw new Error(
      `DndGrid: \`cols\` entry for breakpoint ${String(breakpoint)} is missing.`,
    );
  }
  return colCount;
};

export const findOrGenerateResponsiveLayout = <B extends Breakpoint>(
  layouts: ResponsiveLayouts<B>,
  breakpoints: Breakpoints<B>,
  breakpoint: B,
  lastBreakpoint: B,
  cols: number,
  compactor: Compactor,
): Layout => {
  const existingLayout = layouts[breakpoint];
  if (existingLayout) {
    return cloneLayout(existingLayout);
  }

  let layout = layouts[lastBreakpoint];
  const breakpointsSorted = sortBreakpoints(breakpoints);
  const breakpointsAbove = breakpointsSorted.slice(
    breakpointsSorted.indexOf(breakpoint),
  );

  for (let i = 0; i < breakpointsAbove.length; i++) {
    const b = breakpointsAbove[i];
    if (b === undefined) continue;
    const layoutForBreakpoint = layouts[b];
    if (layoutForBreakpoint) {
      layout = layoutForBreakpoint;
      break;
    }
  }

  const clonedLayout = cloneLayout(layout || []);
  const correctedLayout = correctBounds(clonedLayout, { cols });
  return compactor.allowOverlap
    ? correctedLayout
    : compactor.compact(correctedLayout, cols);
};
