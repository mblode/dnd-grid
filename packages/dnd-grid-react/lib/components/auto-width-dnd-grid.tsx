import * as React from "react";
import type { Props as DndGridProps } from "../types";
import { useContainerWidth } from "../use-container-width";
import { DndGrid, type DndGridHandle } from "./dnd-grid";

export type AutoWidthDndGridProps = Omit<DndGridProps, "width"> & {
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

export const AutoWidthDndGrid = React.forwardRef<
  DndGridHandle,
  AutoWidthDndGridProps
>(
  (
    { containerProps, measureBeforeMount = true, initialWidth, ...gridProps },
    ref,
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
