"use client";

import {
  type Layout,
  useContainerWidth,
  verticalCompactor,
  verticalOverlapCompactor,
} from "@dnd-grid/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const GRID_WIDTH = 600;

const initialLayout: Layout = [
  { i: "a", x: 0, y: 0, w: 3, h: 2 },
  { i: "b", x: 1, y: 0, w: 3, h: 2 },
  { i: "c", x: 2, y: 1, w: 3, h: 2 },
  { i: "d", x: 6, y: 0, w: 3, h: 3 },
  { i: "e", x: 8, y: 1, w: 3, h: 2 },
];

export default function AllowOverlapExample() {
  const [layout, setLayout] = useState<Layout>(initialLayout);
  const [allowOverlap, setAllowOverlap] = useState(true);
  const { width, containerRef, mounted } = useContainerWidth({
    measureBeforeMount: true,
    initialWidth: GRID_WIDTH,
  });

  const compactor = allowOverlap ? verticalOverlapCompactor : verticalCompactor;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span>Overlap: {allowOverlap ? "On" : "Off"}</span>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setAllowOverlap((prev) => !prev)}
        >
          Toggle
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => setLayout(initialLayout)}
        >
          Reset layout
        </Button>
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
            compactor={compactor}
            onLayoutChange={setLayout}
          >
            {layout.map((item) => (
              <div key={item.i}>{item.i}</div>
            ))}
          </DndGrid>
        ) : (
          <Skeleton className="h-[240px] w-full" />
        )}
      </div>
    </div>
  );
}
