import { deepEqual } from "fast-equals";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { resolveCompactor } from "./compactors";
import {
  DEFAULT_BREAKPOINTS,
  DEFAULT_COLS,
  type DefaultBreakpoints,
  findOrGenerateResponsiveLayout,
  getBreakpointFromWidth,
  getColsFromBreakpoint,
  sortBreakpoints,
} from "./responsive-utils";
import { resolveResponsiveSpacing } from "./spacing";
import type {
  Breakpoint,
  BreakpointCols,
  Breakpoints,
  Compactor,
  Layout,
  MissingLayoutStrategy,
  ResponsiveLayouts,
  ResponsiveSpacing,
  Spacing,
} from "./types";
import { cloneLayout } from "./utils";

declare const process: { env?: { NODE_ENV?: string } };

const isDevelopment =
  typeof process !== "undefined" && process.env?.NODE_ENV !== "production";

export type UseDndGridResponsiveLayoutOptions<
  B extends Breakpoint = DefaultBreakpoints,
  TData = unknown,
> = {
  width: number;
  breakpoints?: Breakpoints<B>;
  cols?: BreakpointCols<B>;
  layouts?: ResponsiveLayouts<B, TData>;
  defaultLayouts?: ResponsiveLayouts<B, TData>;
  margin?: ResponsiveSpacing<B>;
  containerPadding?: ResponsiveSpacing<B> | null;
  compactor?: Compactor<TData>;
  missingLayoutStrategy?: MissingLayoutStrategy;
  onBreakpointChange?: (newBreakpoint: B, cols: number) => void;
  onLayoutsChange?: (layouts: ResponsiveLayouts<B, TData>) => void;
  onLayoutChange?: (
    layout: Layout<TData>,
    layouts: ResponsiveLayouts<B, TData>,
  ) => void;
  onWidthChange?: (
    width: number,
    margin: Spacing,
    cols: number,
    containerPadding: Spacing | null,
  ) => void;
};

export type UseDndGridResponsiveLayoutResult<
  B extends Breakpoint = DefaultBreakpoints,
  TData = unknown,
> = {
  layout: Layout<TData>;
  layouts: ResponsiveLayouts<B, TData>;
  breakpoint: B;
  cols: number;
  margin: Spacing;
  containerPadding: Spacing | null;
  gridProps: {
    layout: Layout<TData>;
    cols: number;
    margin: Spacing;
    containerPadding: Spacing | null;
  };
  setLayoutForBreakpoint: (breakpoint: B, layout: Layout<TData>) => void;
  setLayouts: (layouts: ResponsiveLayouts<B, TData>) => void;
  handleLayoutChange: (layout: Layout<TData>) => void;
  sortedBreakpoints: B[];
};

const cloneLayouts = <B extends Breakpoint, TData>(
  layouts: ResponsiveLayouts<B, TData>,
): ResponsiveLayouts<B, TData> => {
  const cloned = {} as ResponsiveLayouts<B, TData>;
  for (const key of Object.keys(layouts) as B[]) {
    const layout = layouts[key];
    if (layout) {
      (cloned as Record<B, Layout<TData>>)[key] = cloneLayout(layout);
    }
  }
  return cloned;
};

export const useDndGridResponsiveLayout = <
  B extends Breakpoint = DefaultBreakpoints,
  TData = unknown,
>(
  options: UseDndGridResponsiveLayoutOptions<B, TData>,
): UseDndGridResponsiveLayoutResult<B, TData> => {
  const {
    width,
    breakpoints = DEFAULT_BREAKPOINTS as unknown as Breakpoints<B>,
    cols: colsConfig = DEFAULT_COLS as unknown as BreakpointCols<B>,
    layouts: propsLayouts,
    defaultLayouts,
    margin: marginProp = 10,
    containerPadding: containerPaddingProp = null,
    compactor: compactorProp,
    missingLayoutStrategy = isDevelopment ? "warn" : "derive",
    onBreakpointChange,
    onLayoutsChange,
    onLayoutChange,
    onWidthChange,
  } = options;
  const compactor = useMemo(
    () => resolveCompactor(compactorProp),
    [compactorProp],
  );

  const sortedBreakpoints = useMemo(
    () => sortBreakpoints(breakpoints),
    [breakpoints],
  );

  const initialBreakpoint = getBreakpointFromWidth(breakpoints, width);
  const initialCols = getColsFromBreakpoint(initialBreakpoint, colsConfig);

  const [breakpoint, setBreakpoint] = useState<B>(initialBreakpoint);
  const [cols, setCols] = useState<number>(initialCols);
  const [layouts, setLayoutsState] = useState<ResponsiveLayouts<B, TData>>(() =>
    cloneLayouts(
      propsLayouts ?? defaultLayouts ?? ({} as ResponsiveLayouts<B, TData>),
    ),
  );

  const prevWidthRef = useRef(width);
  const prevBreakpointRef = useRef(breakpoint);
  const prevLayoutsRef = useRef(layouts);
  const prevBreakpointsRef = useRef(breakpoints);
  const prevColsRef = useRef(colsConfig);
  const warnedBreakpointsRef = useRef(new Set<B>());

  const margin = useMemo(
    () => resolveResponsiveSpacing(marginProp, breakpoint),
    [marginProp, breakpoint],
  );
  const containerPadding = useMemo(() => {
    if (containerPaddingProp === null) return null;
    return resolveResponsiveSpacing(containerPaddingProp, breakpoint);
  }, [containerPaddingProp, breakpoint]);

  const layout = useMemo(() => {
    const lastBreakpoint = prevBreakpointRef.current ?? breakpoint;
    return findOrGenerateResponsiveLayout(
      layouts,
      breakpoints,
      breakpoint,
      lastBreakpoint,
      cols,
      compactor,
      {
        missingLayoutStrategy,
        warnedBreakpoints: warnedBreakpointsRef.current,
      },
    );
  }, [
    layouts,
    breakpoints,
    breakpoint,
    cols,
    compactor,
    missingLayoutStrategy,
  ]);

  useEffect(() => {
    if (propsLayouts && !deepEqual(propsLayouts, prevLayoutsRef.current)) {
      setLayoutsState(cloneLayouts(propsLayouts));
      prevLayoutsRef.current = propsLayouts;
    }
  }, [propsLayouts]);

  useEffect(() => {
    const widthChanged = width !== prevWidthRef.current;
    const breakpointsChanged = !deepEqual(
      breakpoints,
      prevBreakpointsRef.current,
    );
    const colsChanged = !deepEqual(colsConfig, prevColsRef.current);

    if (!widthChanged && !breakpointsChanged && !colsChanged) {
      return;
    }

    const nextBreakpoint = getBreakpointFromWidth(breakpoints, width);
    const nextCols = getColsFromBreakpoint(nextBreakpoint, colsConfig);
    const nextMargin = resolveResponsiveSpacing(marginProp, nextBreakpoint);
    const nextContainerPadding =
      containerPaddingProp === null
        ? null
        : resolveResponsiveSpacing(containerPaddingProp, nextBreakpoint);

    onWidthChange?.(width, nextMargin, nextCols, nextContainerPadding);

    if (nextBreakpoint !== breakpoint || breakpointsChanged || colsChanged) {
      const nextLayouts = cloneLayouts(layouts);

      if (!nextLayouts[breakpoint]) {
        (nextLayouts as Record<B, Layout<TData>>)[breakpoint] =
          cloneLayout(layout);
      }

      const nextLayout = findOrGenerateResponsiveLayout(
        nextLayouts,
        breakpoints,
        nextBreakpoint,
        breakpoint,
        nextCols,
        compactor,
        {
          missingLayoutStrategy,
          warnedBreakpoints: warnedBreakpointsRef.current,
        },
      );

      (nextLayouts as Record<B, Layout<TData>>)[nextBreakpoint] = nextLayout;

      setBreakpoint(nextBreakpoint);
      setCols(nextCols);
      setLayoutsState(nextLayouts);
      prevLayoutsRef.current = nextLayouts;
      prevBreakpointRef.current = nextBreakpoint;

      onBreakpointChange?.(nextBreakpoint, nextCols);
      onLayoutsChange?.(nextLayouts);
      onLayoutChange?.(nextLayout, nextLayouts);
    }

    prevWidthRef.current = width;
    prevBreakpointsRef.current = breakpoints;
    prevColsRef.current = colsConfig;
  }, [
    width,
    breakpoints,
    colsConfig,
    breakpoint,
    layouts,
    layout,
    compactor,
    marginProp,
    containerPaddingProp,
    missingLayoutStrategy,
    onBreakpointChange,
    onLayoutsChange,
    onLayoutChange,
    onWidthChange,
  ]);

  const setLayouts = useCallback(
    (nextLayouts: ResponsiveLayouts<B, TData>) => {
      const cloned = cloneLayouts(nextLayouts);
      setLayoutsState(cloned);
      prevLayoutsRef.current = cloned;
      onLayoutsChange?.(cloned);
      const nextLayout = findOrGenerateResponsiveLayout(
        cloned,
        breakpoints,
        breakpoint,
        breakpoint,
        cols,
        compactor,
        {
          missingLayoutStrategy,
          warnedBreakpoints: warnedBreakpointsRef.current,
        },
      );
      onLayoutChange?.(nextLayout, cloned);
    },
    [
      breakpoints,
      breakpoint,
      cols,
      compactor,
      missingLayoutStrategy,
      onLayoutsChange,
      onLayoutChange,
    ],
  );

  const setLayoutForBreakpoint = useCallback(
    (bp: B, nextLayout: Layout<TData>) => {
      setLayoutsState((prev) => {
        const nextLayouts = {
          ...prev,
          [bp]: cloneLayout(nextLayout),
        } as ResponsiveLayouts<B, TData>;
        prevLayoutsRef.current = nextLayouts;
        onLayoutsChange?.(nextLayouts);
        if (bp === breakpoint) {
          onLayoutChange?.(nextLayout, nextLayouts);
        }
        return nextLayouts;
      });
    },
    [breakpoint, onLayoutsChange, onLayoutChange],
  );

  const handleLayoutChange = useCallback(
    (nextLayout: Layout<TData>) => {
      setLayoutsState((prev) => {
        const nextLayouts = {
          ...prev,
          [breakpoint]: cloneLayout(nextLayout),
        } as ResponsiveLayouts<B, TData>;
        prevLayoutsRef.current = nextLayouts;
        onLayoutsChange?.(nextLayouts);
        onLayoutChange?.(nextLayout, nextLayouts);
        return nextLayouts;
      });
    },
    [breakpoint, onLayoutsChange, onLayoutChange],
  );

  const gridProps = useMemo(
    () => ({
      layout,
      cols,
      margin,
      containerPadding,
    }),
    [layout, cols, margin, containerPadding],
  );

  return {
    layout,
    layouts,
    breakpoint,
    cols,
    margin,
    containerPadding,
    gridProps,
    setLayoutForBreakpoint,
    setLayouts,
    handleLayoutChange,
    sortedBreakpoints,
  };
};
