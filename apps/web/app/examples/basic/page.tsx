"use client";

import { DndGrid, type Layout } from "@dnd-grid/react";
import { useState } from "react";

const generateLayout = (count: number): Layout => {
  return Array.from({ length: count }, (_, i) => ({
    i: i.toString(),
    x: (i * 2) % 12,
    y: Math.floor(i / 6) * 2,
    w: 2,
    h: 2,
  }));
};

export default function BasicExample() {
  const [layout, setLayout] = useState<Layout>(generateLayout(12));

  return (
    <DndGrid
      layout={layout}
      cols={12}
      rowHeight={40}
      width={600}
      onLayoutChange={setLayout}
      resizeHandles={["ne", "nw", "se", "sw"]}
    >
      {layout.map((item) => (
        <div key={item.i}>{item.i}</div>
      ))}
    </DndGrid>
  );
}
