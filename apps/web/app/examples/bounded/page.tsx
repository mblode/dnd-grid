"use client";

import { DndGrid, type Layout } from "@dnd-grid/react";
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
    <DndGrid
      layout={layout}
      cols={12}
      rowHeight={40}
      width={600}
      isBounded
      onLayoutChange={setLayout}
    >
      {layout.map((item) => (
        <div key={item.i}>{item.i}</div>
      ))}
    </DndGrid>
  );
}
