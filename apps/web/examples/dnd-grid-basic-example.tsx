"use client";

import { AutoWidthDndGrid, type Layout } from "@dnd-grid/react";
import { useState } from "react";

const initialLayout: Layout = [
  { i: "a", x: 0, y: 0, w: 3, h: 2 },
  { i: "b", x: 3, y: 0, w: 3, h: 2 },
  { i: "c", x: 6, y: 0, w: 3, h: 2 },
  { i: "d", x: 9, y: 0, w: 3, h: 2 },
];

export function BasicExample() {
  const [layout, setLayout] = useState<Layout>(initialLayout);

  return (
    <AutoWidthDndGrid
      layout={layout}
      cols={12}
      rowHeight={50}
      onLayoutChange={setLayout}
    >
      {layout.map((item) => (
        <div key={item.i} className="grid-item">
          {item.i}
        </div>
      ))}
    </AutoWidthDndGrid>
  );
}
