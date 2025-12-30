"use client";

import { DndGrid, type Layout } from "@dnd-grid/react";
import { useState } from "react";

const initialLayout: Layout = [
  { id: "0", x: 0, y: 0, w: 3, h: 2, static: true },
  { id: "1", x: 3, y: 0, w: 3, h: 2 },
  { id: "2", x: 6, y: 0, w: 3, h: 2, static: true },
  { id: "3", x: 9, y: 0, w: 3, h: 2 },
];

export function StaticElementsExample() {
  const [layout, setLayout] = useState<Layout>(initialLayout);

  return (
    <DndGrid
      cols={12}
      layout={layout}
      onLayoutChange={setLayout}
      rowHeight={50}
    >
      {layout.map((item) => (
        <div
          className={item.static ? "static-item" : "grid-item"}
          key={item.id}
        >
          {item.id} {item.static ? "(static)" : ""}
        </div>
      ))}
    </DndGrid>
  );
}
