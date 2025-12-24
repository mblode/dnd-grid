"use client";

import { DndGrid, type Layout } from "@dnd-grid/react";
import { type CSSProperties, useState } from "react";

const GRID_WIDTH = 1200;
const scaleOptions = [0.75, 1, 1.25];

const initialLayout: Layout = [
  { i: "a", x: 0, y: 0, w: 3, h: 2 },
  { i: "b", x: 3, y: 0, w: 3, h: 2 },
  { i: "c", x: 6, y: 0, w: 3, h: 2 },
  { i: "d", x: 0, y: 2, w: 6, h: 2 },
  { i: "e", x: 6, y: 2, w: 3, h: 3 },
];

export function ScaleExample() {
  const [layout, setLayout] = useState<Layout>(initialLayout);
  const [scale, setScale] = useState(1);

  const scaledStyle: CSSProperties = {
    width: GRID_WIDTH,
    transform: `scale(${scale})`,
    transformOrigin: "top left",
    ["--dnd-grid-scale" as string]: scale,
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        {scaleOptions.map((value) => (
          <button key={value} type="button" onClick={() => setScale(value)}>
            {value}x
          </button>
        ))}
      </div>

      <div style={scaledStyle}>
        <DndGrid
          layout={layout}
          cols={12}
          rowHeight={50}
          width={GRID_WIDTH}
          transformScale={scale}
          onLayoutChange={setLayout}
        >
          {layout.map((item) => (
            <div key={item.i} className="grid-item">
              {item.i}
            </div>
          ))}
        </DndGrid>
      </div>
    </div>
  );
}
