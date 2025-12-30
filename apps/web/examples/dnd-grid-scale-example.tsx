"use client";

import { DndGrid, type Layout } from "@dnd-grid/react";
import { type CSSProperties, useState } from "react";

const scaleOptions = [0.75, 1, 1.25];

const initialLayout: Layout = [
  { id: "a", x: 0, y: 0, w: 3, h: 2 },
  { id: "b", x: 3, y: 0, w: 3, h: 2 },
  { id: "c", x: 6, y: 0, w: 3, h: 2 },
  { id: "d", x: 0, y: 2, w: 6, h: 2 },
  { id: "e", x: 6, y: 2, w: 3, h: 3 },
];

export function ScaleExample() {
  const [layout, setLayout] = useState<Layout>(initialLayout);
  const [scale, setScale] = useState(1);

  const scaledStyle: CSSProperties = {
    transform: `scale(${scale})`,
    transformOrigin: "top left",
    ["--dnd-grid-scale" as string]: scale,
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        {scaleOptions.map((value) => (
          <button key={value} onClick={() => setScale(value)} type="button">
            {value}x
          </button>
        ))}
      </div>

      <DndGrid
        cols={12}
        containerProps={{ style: scaledStyle }}
        layout={layout}
        onLayoutChange={setLayout}
        rowHeight={50}
        transformScale={scale}
      >
        {layout.map((item) => (
          <div className="grid-item" key={item.id}>
            {item.id}
          </div>
        ))}
      </DndGrid>
    </div>
  );
}
