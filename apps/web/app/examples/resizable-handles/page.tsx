"use client";

import { DndGrid, type Layout } from "@dnd-grid/react";
import { ResizeHandle } from "@/components/resize-handle";
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
      <h2 className="text-lg font-semibold mb-4">All Resize Handles</h2>
      <p className="text-muted-foreground mb-4">
        Items can be resized from all 8 directions (n, e, s, w, ne, nw, se, sw).
      </p>
      <DndGrid
        layout={layout}
        cols={12}
        rowHeight={40}
        width={600}
        resizeHandles={["n", "e", "s", "w", "ne", "nw", "se", "sw"]}
        resizeHandle={(handleAxis, ref) => <ResizeHandle ref={ref as any} handleAxis={handleAxis} />}
        onLayoutChange={setLayout}
      >
        {layout.map((item) => (
          <div
            key={item.i}
            className="bg-muted border border-border rounded-md flex items-center justify-center text-lg font-semibold"
          >
            {item.i}
          </div>
        ))}
      </DndGrid>
    </div>
  );
}
