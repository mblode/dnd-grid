import * as React from "react";
import type { DefaultBreakpoints } from "../responsive-utils";
import type { Breakpoint, Compactor } from "../types";
import { useContainerWidth } from "../use-container-width";
import type { UseDndGridOptions } from "../use-dnd-grid";
import {
  type UseDndGridResponsiveLayoutOptions,
  useDndGridResponsiveLayout,
} from "../use-dnd-grid-responsive-layout";
import {
  FixedWidthDndGrid,
  type FixedWidthDndGridHandle,
} from "./fixed-width-dnd-grid";

export type ResponsiveDndGridProps<
  B extends Breakpoint = DefaultBreakpoints,
  TData = unknown,
> = Omit<
  UseDndGridOptions<TData>,
  | "layout"
  | "cols"
  | "gap"
  | "containerPadding"
  | "width"
  | "onLayoutChange"
  | "compactor"
> &
  Pick<
    UseDndGridResponsiveLayoutOptions<B, TData>,
    | "layouts"
    | "defaultLayouts"
    | "breakpoints"
    | "cols"
    | "gap"
    | "containerPadding"
    | "missingLayoutStrategy"
    | "onBreakpointChange"
    | "onLayoutsChange"
    | "onLayoutChange"
    | "onWidthChange"
  > & {
    compactor?: Compactor<TData>;
    width?: number;
    measureBeforeMount?: boolean;
    initialWidth?: number;
    containerProps?: Omit<React.HTMLAttributes<HTMLDivElement>, "children">;
  };

export type ResponsiveDndGridHandle<TData = unknown> =
  FixedWidthDndGridHandle<TData>;
export type ResponsiveDndGrid<TData = unknown> = ResponsiveDndGridHandle<TData>;

type ResponsiveDndGridComponent = (<
  TData = unknown,
  B extends Breakpoint = DefaultBreakpoints,
>(
  props: React.PropsWithoutRef<ResponsiveDndGridProps<B, TData>> &
    React.RefAttributes<ResponsiveDndGridHandle<TData>>,
) => React.ReactElement | null) & {
  displayName?: string;
};

/**
 * Responsive grid layout with breakpoint-aware layouts.
 */
const ResponsiveDndGrid = React.forwardRef(
  <TData, B extends Breakpoint = DefaultBreakpoints>(
    {
      layouts,
      defaultLayouts,
      breakpoints,
      cols,
      gap,
      containerPadding,
      compactor,
      missingLayoutStrategy,
      onBreakpointChange,
      onLayoutsChange,
      onLayoutChange,
      onWidthChange,
      width: widthProp,
      measureBeforeMount = true,
      initialWidth,
      containerProps,
      children,
      ...gridProps
    }: ResponsiveDndGridProps<B, TData>,
    ref: React.ForwardedRef<ResponsiveDndGridHandle<TData>>,
  ) => {
    const shouldMeasure = widthProp === undefined;
    const {
      width: measuredWidth,
      containerRef,
      mounted,
    } = useContainerWidth({
      measureBeforeMount,
      initialWidth,
    });

    const width = shouldMeasure ? measuredWidth : widthProp;
    const canRender = shouldMeasure ? mounted || !measureBeforeMount : true;

    const { gridProps: responsiveGridProps, handleLayoutChange } =
      useDndGridResponsiveLayout({
        width,
        layouts,
        defaultLayouts,
        breakpoints,
        cols,
        gap,
        containerPadding,
        compactor,
        missingLayoutStrategy,
        onBreakpointChange,
        onLayoutsChange,
        onLayoutChange,
        onWidthChange,
      });

    return (
      <div {...containerProps} ref={shouldMeasure ? containerRef : undefined}>
        {canRender && width > 0 && (
          <FixedWidthDndGrid
            {...gridProps}
            {...responsiveGridProps}
            width={width}
            compactor={compactor}
            onLayoutChange={handleLayoutChange}
            ref={ref}
          >
            {children}
          </FixedWidthDndGrid>
        )}
      </div>
    );
  },
) as unknown as ResponsiveDndGridComponent;

ResponsiveDndGrid.displayName = "ResponsiveDndGrid";

export { ResponsiveDndGrid };
