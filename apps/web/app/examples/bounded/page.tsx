"use client";

import { DndGrid, type Layout } from "@dnd-grid/react";
import { ResizeHandle } from "@/components/resize-handle";
import { useState } from "react";

const initialLayout: Layout = [0, 1, 2, 3, 4, 5].map((i) => ({
  i: i.toString(),
  x: (i * 2) % 12,
  y: Math.floor(i / 6) * 2,
  w: 2,
  h: 2,
  deg: 0,
}));

export default function BoundedExample() {
  const [layout, setLayout] = useState<Layout>(initialLayout);

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Bounded Grid</h2>
      <p className="text-muted-foreground mb-4">
        Items cannot be dragged outside the grid bounds.
      </p>
      <DndGrid
        layout={layout}
        cols={12}
        rowHeight={40}
        width={600}
        isBounded
        onLayoutChange={setLayout}
        resizeHandle={(handleAxis, ref) => <ResizeHandle ref={ref as any} handleAxis={handleAxis} />}
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
