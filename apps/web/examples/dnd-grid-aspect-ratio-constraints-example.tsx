"use client";

import { AutoWidthDndGrid, aspectRatio, type Layout } from "@dnd-grid/react";
import { useState } from "react";

const ratio16x9 = aspectRatio(16 / 9);
const ratio1x1 = aspectRatio(1);

const initialLayout: Layout = [
  { i: "16:9", x: 0, y: 0, w: 6, h: 3, constraints: [ratio16x9] },
  { i: "1:1", x: 6, y: 0, w: 3, h: 3, constraints: [ratio1x1] },
  { i: "free", x: 9, y: 0, w: 3, h: 2 },
];

export function AspectRatioConstraintsExample() {
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
