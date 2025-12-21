"use client";

import { DndGrid, type Layout } from "@dnd-grid/react";
import { useState } from "react";

const initialLayout: Layout = [
  { i: "a", x: 0, y: 0, w: 3, h: 2, deg: 0 },
  { i: "b", x: 3, y: 0, w: 3, h: 2, deg: 0 },
  { i: "c", x: 6, y: 0, w: 3, h: 2, deg: 0 },
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
          <div
            key={item.i}
            className="bg-background text-foreground shadow-[0_2px_4px_rgba(0,0,0,.04)] border border-border rounded-widget flex items-center justify-center text-lg font-semibold cursor-grab"
          >
            {item.i}
          </div>
        ))}
      </DndGrid>
    </div>
  );
}
