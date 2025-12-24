"use client";

import { DndGrid, type Layout } from "@dnd-grid/react";
import { useState } from "react";

const GRID_WIDTH = 1200;

const initialLayout: Layout = [
  { i: "0", x: 0, y: 0, w: 3, h: 2, static: true },
  { i: "1", x: 3, y: 0, w: 3, h: 2 },
  { i: "2", x: 6, y: 0, w: 3, h: 2, static: true },
  { i: "3", x: 9, y: 0, w: 3, h: 2 },
];

export function StaticElementsExample() {
  const [layout, setLayout] = useState<Layout>(initialLayout);

  return (
    <DndGrid
      layout={layout}
      cols={12}
      rowHeight={50}
      width={GRID_WIDTH}
      onLayoutChange={setLayout}
    >
      {layout.map((item) => (
        <div key={item.i} className={item.static ? "static-item" : "grid-item"}>
          {item.i} {item.static ? "(static)" : ""}
        </div>
      ))}
    </DndGrid>
  );
}
