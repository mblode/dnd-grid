import * as React from "react";
import { useContainerWidth } from "../use-container-width";
import type { UseDndGridOptions } from "../use-dnd-grid";
import { DndGrid, type DndGridHandle } from "./dnd-grid";

export type AutoWidthDndGridProps<TData = unknown> = Omit<
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

export const AutoWidthDndGrid = React.forwardRef(
  <TData,>(
    {
      containerProps,
      measureBeforeMount = true,
      initialWidth,
      ...gridProps
    }: AutoWidthDndGridProps<TData>,
    ref: React.ForwardedRef<DndGridHandle<TData>>,
  ) => {
    const { width, containerRef, mounted } = useContainerWidth({
      measureBeforeMount,
      initialWidth,
    });

    const shouldRenderGrid = (!measureBeforeMount || mounted) && width > 0;

    return (
      <div {...containerProps} ref={containerRef}>
        {shouldRenderGrid && <DndGrid {...gridProps} width={width} ref={ref} />}
      </div>
    );
  },
);

AutoWidthDndGrid.displayName = "AutoWidthDndGrid";
