"use client";

import {
  DndGrid,
  horizontalCompactor,
  type Layout,
  noCompactor,
  verticalCompactor,
  wrapCompactor,
} from "@dnd-grid/react";
import { useState } from "react";

const GRID_WIDTH = 1200;

const initialLayout: Layout = [
  { i: "a", x: 0, y: 0, w: 2, h: 2 },
  { i: "b", x: 5, y: 0, w: 3, h: 2 },
  { i: "c", x: 9, y: 0, w: 2, h: 2 },
  { i: "d", x: 0, y: 4, w: 4, h: 2 },
  { i: "e", x: 6, y: 6, w: 3, h: 3 },
  { i: "f", x: 2, y: 9, w: 2, h: 2 },
];

const compactors = {
  vertical: verticalCompactor,
  horizontal: horizontalCompactor,
  wrap: wrapCompactor,
  none: noCompactor,
} as const;

type CompactorKey = keyof typeof compactors;

export function CompactorShowcaseExample() {
  const [layout, setLayout] = useState<Layout>(initialLayout);
  const [compactorKey, setCompactorKey] = useState<CompactorKey>("vertical");

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        {(
          [
            { id: "vertical", label: "Vertical" },
            { id: "horizontal", label: "Horizontal" },
            { id: "wrap", label: "Wrap" },
            { id: "none", label: "None" },
          ] as const
        ).map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => setCompactorKey(option.id)}
          >
            {option.label}
          </button>
        ))}
      </div>

      <DndGrid
        layout={layout}
        cols={12}
        rowHeight={50}
        width={GRID_WIDTH}
        compactor={compactors[compactorKey]}
        onLayoutChange={setLayout}
      >
        {layout.map((item) => (
          <div key={item.i} className="grid-item">
            {item.i}
          </div>
        ))}
      </DndGrid>
    </div>
  );
}
