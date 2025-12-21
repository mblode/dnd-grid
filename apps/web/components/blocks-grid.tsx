"use client";

import { DndGrid, type Layout } from "@dnd-grid/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useGridInteractions } from "@/hooks/use-grid-interactions";

export const BLOCK_GAP = 16;
export const BLOCK_HEIGHT = 24;
export const BLOCK_COLUMNS = 4;
export const DEFAULT_WIDTH = 480;
export const MAX_WIDTH = 643;

const initialLayout: Layout = [
  { i: "a", x: 0, y: 0, w: 2, h: 6, deg: 0 },
  { i: "b", x: 2, y: 0, w: 1, h: 3, deg: 0 },
  { i: "c", x: 3, y: 0, w: 1, h: 3, deg: 0 },
  { i: "d", x: 2, y: 3, w: 2, h: 4, deg: 0 },
  { i: "e", x: 0, y: 6, w: 1, h: 4, deg: 0 },
  { i: "f", x: 1, y: 6, w: 1, h: 4, deg: 0 },
  { i: "g", x: 2, y: 7, w: 2, h: 3, deg: 0 },
  { i: "h", x: 0, y: 10, w: 4, h: 2, deg: 0 },
];

export const BlocksGrid = () => {
  const [layout, setLayout] = useState<Layout>(initialLayout);
  const handlers = useGridInteractions();
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(DEFAULT_WIDTH);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);

  const scaleFactor = useMemo(() => {
    return Math.min(containerWidth, MAX_WIDTH) / DEFAULT_WIDTH;
  }, [containerWidth]);

  const margin = BLOCK_GAP * scaleFactor;

  return (
    <div ref={containerRef}>
      {containerWidth > 0 && (
        <DndGrid
          layout={layout}
          cols={BLOCK_COLUMNS}
          rowHeight={BLOCK_HEIGHT * scaleFactor}
          width={containerWidth}
          margin={[margin, margin, margin, margin]}
          onLayoutChange={setLayout}
          resizeHandles={["ne", "nw", "se", "sw"]}
          onDragStart={handlers.handleDragStart}
          onDrag={handlers.handleDrag}
          onDragStop={handlers.handleDragStop}
          onResizeStart={handlers.handleResizeStart}
          onResize={handlers.handleResize}
          onResizeStop={handlers.handleResizeStop}
        >
          {layout.map((item) => {
            return (
              <div
                key={item.i}
                className="bg-background text-foreground shadow-[0_2px_4px_rgba(0,0,0,.04)] border border-border rounded-widget flex items-center justify-center text-lg font-semibold cursor-grab"
                onPointerEnter={() => handlers.handleHover(item.i)}
                onPointerLeave={() => handlers.handleHover(null)}
                onClick={() => handlers.handleSelect(item.i)}
              >
                {item.i}
              </div>
            );
          })}
        </DndGrid>
      )}
    </div>
  );
};
