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
      <button type="button" onClick={() => setAllowOverlap((prev) => !prev)}>
        {allowOverlap ? "Disable overlap" : "Enable overlap"}
      </button>

      <DndGrid
        layout={layout}
        cols={12}
        rowHeight={50}
        compactor={compactor}
        onLayoutChange={setLayout}
      >
        {layout.map((item) => (
          <div key={item.id} className="grid-item">
            {item.id}
          </div>
        ))}
      </DndGrid>
    </div>
  );
}
