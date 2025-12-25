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
      layout={layout}
      cols={12}
      rowHeight={50}
      onLayoutChange={setLayout}
    >
      {layout.map((item) => (
        <div
          key={item.id}
          className={item.static ? "static-item" : "grid-item"}
        >
          {item.id} {item.static ? "(static)" : ""}
        </div>
      ))}
    </DndGrid>
  );
}
