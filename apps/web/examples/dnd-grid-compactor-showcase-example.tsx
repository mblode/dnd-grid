"use client";

import {
  DndGrid,
  horizontalCompactor,
  type Layout,
  noCompactor,
  verticalCompactor,
} from "@dnd-grid/react";
import { useState } from "react";

const initialLayout: Layout = [
  { id: "a", x: 0, y: 0, w: 2, h: 2 },
  { id: "b", x: 5, y: 0, w: 3, h: 2 },
  { id: "c", x: 9, y: 0, w: 2, h: 2 },
  { id: "d", x: 0, y: 4, w: 4, h: 2 },
  { id: "e", x: 6, y: 6, w: 3, h: 3 },
  { id: "f", x: 2, y: 9, w: 2, h: 2 },
];

const compactors = {
  vertical: verticalCompactor,
  horizontal: horizontalCompactor,
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
        compactor={compactors[compactorKey]}
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
