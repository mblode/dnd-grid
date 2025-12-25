"use client";

import { DndGrid, type Layout } from "@dnd-grid/react";
import { useState } from "react";

const initialLayout: Layout = [
  { id: "a", x: 0, y: 0, w: 3, h: 2 },
  { id: "b", x: 3, y: 0, w: 3, h: 2 },
  { id: "c", x: 6, y: 0, w: 3, h: 2 },
  { id: "d", x: 9, y: 0, w: 3, h: 2 },
];

export function BasicExample() {
  const [layout, setLayout] = useState<Layout>(initialLayout);

  return (
    <DndGrid
      layout={layout}
      cols={12}
      rowHeight={50}
      onLayoutChange={setLayout}
    >
      {layout.map((item) => (
        <div key={item.id} className="grid-item">
          {item.id}
        </div>
      ))}
    </DndGrid>
  );
}
