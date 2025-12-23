"use client";

import {
  DndGrid,
  type Layout,
  aspectRatio,
  useContainerWidth,
} from "@dnd-grid/react";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";

const GRID_WIDTH = 600;

const ratio16x9 = aspectRatio(16 / 9);
const ratio1x1 = aspectRatio(1);

const initialLayout: Layout = [
  { i: "16:9", x: 0, y: 0, w: 6, h: 3, constraints: [ratio16x9] },
  { i: "1:1", x: 6, y: 0, w: 3, h: 3, constraints: [ratio1x1] },
  { i: "free", x: 9, y: 0, w: 3, h: 2 },
];

export default function AspectRatioConstraintsExample() {
  const [layout, setLayout] = useState<Layout>(initialLayout);
  const { width, containerRef, mounted } = useContainerWidth({
    measureBeforeMount: true,
    initialWidth: GRID_WIDTH,
  });

  return (
    <div className="space-y-3">
      <div className="text-xs text-muted-foreground">
        Resize the 16:9 and 1:1 items to see the aspect ratio lock.
      </div>
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
    </div>
  );
}
