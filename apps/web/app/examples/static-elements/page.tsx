"use client";

import { DndGrid, type Layout, useContainerWidth } from "@dnd-grid/react";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const GRID_WIDTH = 600;

const initialLayout: Layout = [
  { i: "0", x: 0, y: 0, w: 2, h: 2, static: true },
  { i: "1", x: 2, y: 0, w: 2, h: 2 },
  { i: "2", x: 4, y: 0, w: 2, h: 2, static: true },
  { i: "3", x: 6, y: 0, w: 2, h: 2 },
  { i: "4", x: 0, y: 2, w: 2, h: 2 },
  { i: "5", x: 2, y: 2, w: 2, h: 2, static: true },
];

export default function StaticElementsExample() {
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
            onLayoutChange={setLayout}
          >
            {layout.map((item) => (
              <div
                key={item.i}
                className={cn(
                  "text-sm font-normal",
                  item.static ? "bg-muted-foreground/20" : "bg-muted",
                )}
              >
                {item.i} {item.static ? "(static)" : ""}
              </div>
            ))}
          </DndGrid>
        ) : (
          <Skeleton className="h-[220px] w-full" />
        )}
      </div>
    </div>
  );
}
