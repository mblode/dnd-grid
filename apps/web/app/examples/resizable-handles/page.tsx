"use client";

import { DndGrid, type Layout, useContainerWidth } from "@dnd-grid/react";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";

const GRID_WIDTH = 600;

const initialLayout: Layout = [
  { i: "a", x: 0, y: 0, w: 3, h: 2 },
  { i: "b", x: 3, y: 0, w: 3, h: 2 },
  { i: "c", x: 6, y: 0, w: 3, h: 2 },
];

export default function ResizableHandlesExample() {
  const [layout, setLayout] = useState<Layout>(initialLayout);
  const { width, containerRef, mounted } = useContainerWidth({
    measureBeforeMount: true,
    initialWidth: GRID_WIDTH,
  });

  return (
    <div>
      <div
        ref={containerRef}
        className="w-full"
        style={{ maxWidth: GRID_WIDTH }}
      >
        {mounted && width > 0 ? (
          <DndGrid
            layout={layout}
            cols={12}
            rowHeight={40}
            width={width}
            resizeHandles={["n", "e", "s", "w", "ne", "nw", "se", "sw"]}
            onLayoutChange={setLayout}
          >
            {layout.map((item) => (
              <div key={item.i}>{item.i}</div>
            ))}
          </DndGrid>
        ) : (
          <Skeleton className="h-[180px] w-full" />
        )}
      </div>
    </div>
  );
}
