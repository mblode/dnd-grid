"use client";

import { DndGrid, verticalCompactor, type Layout } from "@dnd-grid/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useGridInteractions } from "@/hooks/use-grid-interactions";

export const BLOCK_GAP = 16;
export const BLOCK_HEIGHT = 24;
export const BLOCK_COLUMNS = 4;
export const DEFAULT_WIDTH = 480;
export const MAX_WIDTH = 643;
const DEFAULT_GRID_ROWS = 12;
const DEFAULT_GRID_HEIGHT =
  DEFAULT_GRID_ROWS * BLOCK_HEIGHT +
  (DEFAULT_GRID_ROWS - 1) * BLOCK_GAP +
  BLOCK_GAP * 2;

const initialLayout: Layout = [
  { i: "a", x: 0, y: 0, w: 2, h: 6 },
  { i: "b", x: 2, y: 0, w: 1, h: 3 },
  { i: "c", x: 3, y: 0, w: 1, h: 3 },
  { i: "d", x: 2, y: 3, w: 2, h: 4 },
  { i: "e", x: 0, y: 6, w: 1, h: 4 },
  { i: "f", x: 1, y: 6, w: 1, h: 4 },
  { i: "g", x: 2, y: 7, w: 2, h: 3 },
  { i: "h", x: 0, y: 10, w: 4, h: 2 },
];

export const BlocksGrid = () => {
  const [layout, setLayout] = useState<Layout>(initialLayout);
  const handlers = useGridInteractions();
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number | null>(null);
  // Prevent ResizeObserver feedback loops while grid items are being resized.
  const isResizingRef = useRef(false);
  const pendingWidthRef = useRef<number | null>(null);
  const resizeRafRef = useRef<number | null>(null);

  const commitContainerWidth = useCallback((nextWidth: number) => {
    setContainerWidth((prev) => (prev === nextWidth ? prev : nextWidth));
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const nextWidth = Math.round(entry.contentRect.width);
        pendingWidthRef.current = nextWidth;

        if (isResizingRef.current) {
          continue;
        }

        if (resizeRafRef.current !== null) {
          cancelAnimationFrame(resizeRafRef.current);
        }
        resizeRafRef.current = requestAnimationFrame(() => {
          resizeRafRef.current = null;
          if (pendingWidthRef.current === null) return;
          commitContainerWidth(pendingWidthRef.current);
        });
      }
    });

    resizeObserver.observe(container);
    return () => {
      resizeObserver.disconnect();
      if (resizeRafRef.current !== null) {
        cancelAnimationFrame(resizeRafRef.current);
        resizeRafRef.current = null;
      }
    };
  }, [commitContainerWidth]);

  const scaleFactor = useMemo(() => {
    const width = containerWidth ?? DEFAULT_WIDTH;
    return Math.min(width, MAX_WIDTH) / DEFAULT_WIDTH;
  }, [containerWidth]);

  const margin = BLOCK_GAP * scaleFactor;
  const handleResizeStart: typeof handlers.handleResizeStart = useCallback(
    (...args) => {
      isResizingRef.current = true;
      handlers.handleResizeStart(...args);
    },
    [handlers],
  );
  const handleResizeStop: typeof handlers.handleResizeStop = useCallback(
    (...args) => {
      handlers.handleResizeStop(...args);
      isResizingRef.current = false;
      if (pendingWidthRef.current !== null) {
        commitContainerWidth(pendingWidthRef.current);
      }
    },
    [handlers, commitContainerWidth],
  );

  return (
    <div ref={containerRef}>
      {containerWidth !== null && containerWidth > 0 ? (
        <DndGrid
          layout={layout}
          cols={BLOCK_COLUMNS}
          rowHeight={BLOCK_HEIGHT * scaleFactor}
          width={containerWidth}
          margin={margin}
          onLayoutChange={setLayout}
          resizeHandles={["ne", "nw", "se", "sw"]}
          onDragStart={handlers.handleDragStart}
          onDrag={handlers.handleDrag}
          onDragStop={handlers.handleDragStop}
          onResizeStart={handleResizeStart}
          onResize={handlers.handleResize}
          onResizeStop={handleResizeStop}
          compactor={{...verticalCompactor}}
        >
          {layout.map((item) => {
            return (
              <button
                key={item.i}
                onPointerEnter={() => handlers.handleHover(item.i)}
                onPointerLeave={() => handlers.handleHover(null)}
                onClick={() => handlers.handleSelect(item.i)}
                type="button"
                className="p-0"
              >
                {item.i}
              </button>
            );
          })}
        </DndGrid>
      ) : (
        <Skeleton className="w-full" style={{ height: DEFAULT_GRID_HEIGHT }} />
      )}
    </div>
  );
};
