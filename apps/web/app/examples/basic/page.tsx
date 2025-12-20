"use client";

import { DndGrid, type Layout } from "@dnd-grid/react";
import { ResizeHandle } from "@/components/resize-handle";
import { useState } from "react";

const generateLayout = (count: number): Layout => {
  return Array.from({ length: count }, (_, i) => ({
    i: i.toString(),
    x: (i * 2) % 12,
    y: Math.floor(i / 6) * 2,
    w: 2,
    h: 2,
    deg: 0,
  }));
};

export default function BasicExample() {
  const [layout, setLayout] = useState<Layout>(generateLayout(12));

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Basic Grid</h2>
      <p className="text-muted-foreground mb-4">
        Drag items to reposition, resize from corners.
      </p>
      <DndGrid
        layout={layout}
        cols={12}
        rowHeight={40}
        width={600}
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
