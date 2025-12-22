"use client";

import { DndGrid, type Layout, useContainerWidth } from "@dnd-grid/react";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";

const GRID_WIDTH = 600;

const initialLayout: Layout = [0, 1, 2, 3, 4, 5].map((i) => ({
  i: i.toString(),
  x: (i * 2) % 12,
  y: Math.floor(i / 6) * 2,
  w: 2,
  h: 2,
}));

export default function BoundedExample() {
  const [layout, setLayout] = useState<Layout>(initialLayout);
  const { width, containerRef, mounted } = useContainerWidth({
    measureBeforeMount: true,
    initialWidth: GRID_WIDTH,
  });

  return (
    <div ref={containerRef} className="w-full" style={{ maxWidth: GRID_WIDTH }}>
      {mounted && width > 0 ? (
        <DndGrid
          layout={layout}
          cols={12}
          rowHeight={40}
          width={width}
          isBounded
          onLayoutChange={setLayout}
        >
          {layout.map((item) => (
            <div key={item.i}>{item.i}</div>
          ))}
        </DndGrid>
      ) : (
        <Skeleton className="h-[220px] w-full" />
      )}
    </div>
  );
}
