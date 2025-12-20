"use client";

import { DndGrid, type Layout } from "@dnd-grid/react";
import { ResizeHandle } from "@/components/resize-handle";
import { useState } from "react";

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
      <h2 className="text-lg font-semibold mb-4">Static Elements</h2>
      <p className="text-muted-foreground mb-4">
        Items marked as static (darker) cannot be moved or resized.
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
            className={`${
              item.static ? "bg-muted-foreground/20" : "bg-muted"
            } border border-border rounded-md flex items-center justify-center text-sm`}
          >
            {item.i} {item.static ? "(static)" : ""}
          </div>
        ))}
      </DndGrid>
    </div>
  );
}
