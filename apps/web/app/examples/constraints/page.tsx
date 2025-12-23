"use client";

import {
  DndGrid,
  defaultConstraints,
  type Layout,
  type LayoutConstraint,
  snapToGrid,
  useContainerWidth,
} from "@dnd-grid/react";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";

const GRID_WIDTH = 600;

const topBandConstraint: LayoutConstraint = {
  name: "topBand(4)",
  constrainPosition(item, x, y) {
    const maxY = Math.max(0, 4 - item.h);
    return { x, y: Math.min(y, maxY) };
  },
};

const gridConstraints: LayoutConstraint[] = [
  ...defaultConstraints,
  snapToGrid(2, 1),
];

const initialLayout: Layout = [
  { i: "snap", x: 0, y: 0, w: 3, h: 2 },
  {
    i: "limits",
    x: 3,
    y: 0,
    w: 3,
    h: 2,
    minW: 2,
    maxW: 5,
    minH: 2,
    maxH: 4,
  },
  {
    i: "band",
    x: 6,
    y: 0,
    w: 3,
    h: 2,
    constraints: [topBandConstraint],
  },
];

export default function ConstraintsExample() {
  const [layout, setLayout] = useState<Layout>(initialLayout);
  const { width, containerRef, mounted } = useContainerWidth({
    measureBeforeMount: true,
    initialWidth: GRID_WIDTH,
  });

  return (
    <div className="space-y-3">
      <div className="text-xs text-muted-foreground">
        Grid snaps every 2 columns. The "band" item stays in the top 4 rows and
        "limits" has min/max sizes.
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
            constraints={gridConstraints}
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
