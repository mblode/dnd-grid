import type {
  Breakpoint,
  BreakpointCols,
  Breakpoints,
  Compactor,
  Layout,
  MissingLayoutStrategy,
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
  breakpoints: Breakpoints<B>
): B[] => {
  const keys = Object.keys(breakpoints) as B[];
  return keys.sort((a, b) => breakpoints[a] - breakpoints[b]);
};

export const getBreakpointFromWidth = <B extends Breakpoint>(
  breakpoints: Breakpoints<B>,
  width: number
): B => {
  const sorted = sortBreakpoints(breakpoints);
  let matching = sorted[0];

  if (matching === undefined) {
    throw new Error("No breakpoints defined");
  }

  for (let i = 1; i < sorted.length; i++) {
    const breakpointName = sorted[i];
    if (breakpointName === undefined) {
      continue;
    }

    const breakpointWidth = breakpoints[breakpointName];
    if (width >= breakpointWidth) {
      matching = breakpointName;
    }
  }

  return matching;
};

export const getColsFromBreakpoint = <B extends Breakpoint>(
  breakpoint: B,
  cols: BreakpointCols<B>
): number => {
  const colCount = cols[breakpoint];
  if (colCount === undefined) {
    throw new Error(
      `DndGrid: \`cols\` entry for breakpoint ${String(breakpoint)} is missing.`
    );
  }
  return colCount;
};

interface MissingLayoutOptions<B extends Breakpoint> {
  missingLayoutStrategy?: MissingLayoutStrategy;
  warnedBreakpoints?: Set<B>;
}

export const findOrGenerateResponsiveLayout = <B extends Breakpoint, TData>(
  layouts: ResponsiveLayouts<B, TData>,
  breakpoints: Breakpoints<B>,
  breakpoint: B,
  lastBreakpoint: B,
  cols: number,
  compactor: Compactor<TData>,
  options: MissingLayoutOptions<B> = {}
): Layout<TData> => {
  const existingLayout = layouts[breakpoint];
  if (existingLayout) {
    return cloneLayout(existingLayout);
  }

  const { missingLayoutStrategy = "derive", warnedBreakpoints } = options;
  let layout = layouts[lastBreakpoint];
  let derivedFrom = layout ? lastBreakpoint : undefined;
  const breakpointsSorted = sortBreakpoints(breakpoints);
  const breakpointIndex = breakpointsSorted.indexOf(breakpoint);
  const breakpointsAbove =
    breakpointIndex >= 0
      ? breakpointsSorted.slice(breakpointIndex)
      : breakpointsSorted;

  for (const b of breakpointsAbove) {
    if (b === undefined) {
      continue;
    }
    const layoutForBreakpoint = layouts[b];
    if (layoutForBreakpoint) {
      layout = layoutForBreakpoint;
      derivedFrom = b;
      break;
    }
  }

  if (missingLayoutStrategy === "error") {
    throw new Error(
      `DndGrid: Responsive layout for breakpoint "${String(
        breakpoint
      )}" is missing. Provide a layout or change missingLayoutStrategy.`
    );
  }

  if (missingLayoutStrategy === "empty") {
    return [];
  }

  if (missingLayoutStrategy === "warn") {
    const alreadyWarned = warnedBreakpoints?.has(breakpoint);
    if (!alreadyWarned) {
      warnedBreakpoints?.add(breakpoint);
      const fallback =
        derivedFrom === undefined
          ? "no fallback layout found"
          : `derived from "${String(derivedFrom)}"`;
      console.warn(
        `DndGrid: Responsive layout for breakpoint "${String(
          breakpoint
        )}" is missing (${fallback}). Provide a layout or change missingLayoutStrategy.`
      );
    }
  }

  const clonedLayout = cloneLayout(layout || []);
  const correctedLayout = correctBounds(clonedLayout, { cols });
  return compactor.allowOverlap
    ? correctedLayout
    : compactor.compact(correctedLayout, cols);
};
