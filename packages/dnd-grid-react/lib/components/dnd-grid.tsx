import * as React from "react";
import { useContainerWidth } from "../use-container-width";
import type { UseDndGridApi, UseDndGridOptions } from "../use-dnd-grid";
import {
  FixedWidthDndGrid,
  type FixedWidthDndGridHandle,
} from "./fixed-width-dnd-grid";

export type DndGridProps<TData = unknown> = Omit<
  UseDndGridOptions<TData>,
  "width"
> & {
  /**
   * Delay initial render until width is measured.
   */
  measureBeforeMount?: boolean;
  /**
   * Initial width before measurement.
   */
  initialWidth?: number;
  /**
   * Props applied to the measurement container.
   */
  containerProps?: Omit<React.HTMLAttributes<HTMLDivElement>, "children">;
};

export type DndGridHandle<TData = unknown> = UseDndGridApi<TData>;
export type DndGrid<TData = unknown> = DndGridHandle<TData>;

type DndGridComponent = (<TData = unknown>(
  props: React.PropsWithoutRef<DndGridProps<TData>> &
    React.RefAttributes<DndGridHandle<TData>>,
) => React.ReactElement | null) & {
  displayName?: string;
};

/**
 * A reactive, fluid grid layout with draggable, resizable components.
 */
const DndGrid = React.forwardRef(
  <TData,>(
    {
      containerProps,
      measureBeforeMount = true,
      initialWidth,
      ...gridProps
    }: DndGridProps<TData>,
    ref: React.ForwardedRef<FixedWidthDndGridHandle<TData>>,
  ) => {
    const { width, containerRef, mounted } = useContainerWidth({
      measureBeforeMount,
      initialWidth,
    });

    const shouldRenderGrid = (!measureBeforeMount || mounted) && width > 0;

    return (
      <div {...containerProps} ref={containerRef}>
        {shouldRenderGrid && (
          <FixedWidthDndGrid {...gridProps} width={width} ref={ref} />
        )}
      </div>
    );
  },
) as unknown as DndGridComponent;

DndGrid.displayName = "DndGrid";

export { DndGrid };
