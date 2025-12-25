"use client";

import { DndGrid, type Layout } from "@dnd-grid/react";
import { useState } from "react";

const initialLayout: Layout = [0, 1, 2, 3, 4, 5].map((i) => ({
  id: i.toString(),
  x: (i * 2) % 12,
  y: Math.floor(i / 6) * 2,
  w: 2,
  h: 2,
}));

export function BoundedExample() {
  const [layout, setLayout] = useState<Layout>(initialLayout);

  return (
    <DndGrid
      layout={layout}
      cols={12}
      rowHeight={50}
      bounded
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
