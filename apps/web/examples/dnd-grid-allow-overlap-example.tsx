"use client";

import {
  DndGrid,
  type Layout,
  verticalCompactor,
  verticalOverlapCompactor,
} from "@dnd-grid/react";
import { useState } from "react";

const initialLayout: Layout = [
  { id: "a", x: 0, y: 0, w: 3, h: 2 },
  { id: "b", x: 1, y: 0, w: 3, h: 2 },
  { id: "c", x: 2, y: 1, w: 3, h: 2 },
  { id: "d", x: 6, y: 0, w: 3, h: 3 },
];

export function AllowOverlapExample() {
  const [layout, setLayout] = useState<Layout>(initialLayout);
  const [allowOverlap, setAllowOverlap] = useState(true);
  const compactor = allowOverlap ? verticalOverlapCompactor : verticalCompactor;

  return (
    <div>
      <button onClick={() => setAllowOverlap((prev) => !prev)} type="button">
        {allowOverlap ? "Disable overlap" : "Enable overlap"}
      </button>

      <DndGrid
        cols={12}
        compactor={compactor}
        layout={layout}
        onLayoutChange={setLayout}
        rowHeight={50}
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
