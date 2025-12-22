"use client";

import { DndGrid, type Layout } from "@dnd-grid/react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const initialLayout: Layout = [
  { i: "0", x: 0, y: 0, w: 2, h: 2, deg: 0, static: true },
  { i: "1", x: 2, y: 0, w: 2, h: 2, deg: 0 },
  { i: "2", x: 4, y: 0, w: 2, h: 2, deg: 0, static: true },
  { i: "3", x: 6, y: 0, w: 2, h: 2, deg: 0 },
  { i: "4", x: 0, y: 2, w: 2, h: 2, deg: 0 },
  { i: "5", x: 2, y: 2, w: 2, h: 2, deg: 0, static: true },
];

export default function StaticElementsExample() {
  const [layout, setLayout] = useState<Layout>(initialLayout);

  return (
    <div>
      <DndGrid
        layout={layout}
        cols={12}
        rowHeight={40}
        width={600}
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
    </div>
  );
}
