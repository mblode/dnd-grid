"use client";

import {
  DndGrid,
  defaultConstraints,
  type Layout,
  type LayoutConstraint,
  snapToGrid,
} from "@dnd-grid/react";
import { useState } from "react";

const topBandConstraint: LayoutConstraint = {
  name: "topBand(4)",
  constrainPosition(item, x, y) {
    const maxY = Math.max(0, 4 - item.h);
    return { x, y: Math.min(y, maxY) };
  },
};

const gridConstraints: LayoutConstraint[] = [
  ...defaultConstraints,
  snapToGrid(2, 1),
];

const initialLayout: Layout = [
  { id: "snap", x: 0, y: 0, w: 3, h: 2 },
  {
    id: "limits",
    x: 3,
    y: 0,
    w: 3,
    h: 2,
    minW: 2,
    maxW: 5,
    minH: 2,
    maxH: 4,
  },
  {
    id: "band",
    x: 6,
    y: 0,
    w: 3,
    h: 2,
    constraints: [topBandConstraint],
  },
];

export function ConstraintsExample() {
  const [layout, setLayout] = useState<Layout>(initialLayout);

  return (
    <DndGrid
      cols={12}
      constraints={gridConstraints}
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
  );
}
