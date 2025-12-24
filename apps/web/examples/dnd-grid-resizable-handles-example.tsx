"use client";

import { DndGrid, type Layout } from "@dnd-grid/react";
import { useState } from "react";

const GRID_WIDTH = 1200;

const initialLayout: Layout = [
  { i: "a", x: 0, y: 0, w: 3, h: 2 },
  { i: "b", x: 3, y: 0, w: 3, h: 2 },
  { i: "c", x: 6, y: 0, w: 3, h: 2 },
];

export function ResizableHandlesExample() {
  const [layout, setLayout] = useState<Layout>(initialLayout);

  return (
    <DndGrid
      layout={layout}
      cols={12}
      rowHeight={50}
      width={GRID_WIDTH}
      resizeHandles={["n", "e", "s", "w", "ne", "nw", "se", "sw"]}
      onLayoutChange={setLayout}
    >
      {layout.map((item) => (
        <div key={item.i} className="grid-item">
          {item.i}
        </div>
      ))}
    </DndGrid>
  );
}
