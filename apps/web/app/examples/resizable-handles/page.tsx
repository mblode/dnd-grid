"use client";

import { DndGrid, type Layout } from "@dnd-grid/react";
import { useState } from "react";

const initialLayout: Layout = [
  { i: "a", x: 0, y: 0, w: 3, h: 2 },
  { i: "b", x: 3, y: 0, w: 3, h: 2 },
  { i: "c", x: 6, y: 0, w: 3, h: 2 },
];

export default function ResizableHandlesExample() {
  const [layout, setLayout] = useState<Layout>(initialLayout);

  return (
    <div>
      <DndGrid
        layout={layout}
        cols={12}
        rowHeight={40}
        width={600}
        resizeHandles={["n", "e", "s", "w", "ne", "nw", "se", "sw"]}
        onLayoutChange={setLayout}
      >
        {layout.map((item) => (
          <div key={item.i}>{item.i}</div>
        ))}
      </DndGrid>
    </div>
  );
}
