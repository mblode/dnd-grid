"use client";

import {
  FixedWidthDndGrid,
  type Layout,
  verticalCompactor,
} from "@dnd-grid/react";
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
  { id: "a", x: 0, y: 0, w: 2, h: 6 },
  { id: "b", x: 2, y: 0, w: 1, h: 3 },
  { id: "c", x: 3, y: 0, w: 1, h: 3 },
  { id: "d", x: 2, y: 3, w: 2, h: 4 },
  { id: "e", x: 0, y: 6, w: 1, h: 4 },
  { id: "f", x: 1, y: 6, w: 1, h: 4 },
  { id: "g", x: 2, y: 7, w: 2, h: 3 },
  { id: "h", x: 0, y: 10, w: 4, h: 2 },
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

  const gap = BLOCK_GAP * scaleFactor;
  const handleResizeStart: typeof handlers.handleResizeStart = useCallback(
    (event) => {
      isResizingRef.current = true;
      handlers.handleResizeStart(event);
    },
    [handlers],
  );
  const handleResizeEnd: typeof handlers.handleResizeEnd = useCallback(
    (event) => {
      handlers.handleResizeEnd(event);
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
        <FixedWidthDndGrid
          layout={layout}
          cols={BLOCK_COLUMNS}
          rowHeight={BLOCK_HEIGHT * scaleFactor}
          width={containerWidth}
          gap={gap}
          onLayoutChange={setLayout}
          resizeHandles={["ne", "nw", "se", "sw"]}
          onDragStart={handlers.handleDragStart}
          onDrag={handlers.handleDrag}
          onDragEnd={handlers.handleDragEnd}
          onResizeStart={handleResizeStart}
          onResize={handlers.handleResize}
          onResizeEnd={handleResizeEnd}
          compactor={{ ...verticalCompactor }}
        >
          {layout.map((item) => {
            return (
              <button
                key={item.id}
                onPointerEnter={() => handlers.handleHover(item.id)}
                onPointerLeave={() => handlers.handleHover(null)}
                onClick={() => handlers.handleSelect(item.id)}
                type="button"
                className="p-0"
              >
                {item.id}
              </button>
            );
          })}
        </FixedWidthDndGrid>
      ) : (
        <Skeleton className="w-full" style={{ height: DEFAULT_GRID_HEIGHT }} />
      )}
    </div>
  );
};
