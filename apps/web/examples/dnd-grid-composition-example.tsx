"use client";

import { DndGrid, type Layout, useDndGridItemState } from "@dnd-grid/react";
import { useState } from "react";

const initialLayout: Layout = [
  { id: "c1", x: 0, y: 0, w: 3, h: 2 },
  { id: "c2", x: 3, y: 0, w: 3, h: 2 },
  { id: "c3", x: 6, y: 0, w: 3, h: 2 },
  { id: "c4", x: 9, y: 0, w: 3, h: 2 },
];

function StateAwareContent() {
  const { item, state } = useDndGridItemState();
  let label = item.id;
  if (state.dragging) {
    label = "Dragging";
  } else if (state.resizing) {
    label = "Resizing";
  }

  return (
    <div className="grid-item">
      <span>{label}</span>
      {state.dragging && (
        <span className="block text-xs text-zinc-500">
          {item.x},{item.y}
        </span>
      )}
    </div>
  );
}

export function CompositionExample() {
  const [layout, setLayout] = useState<Layout>(initialLayout);

  return (
    <div className="space-y-4">
      <div className="text-xs text-zinc-500">
        Items use useDndGridItemState() to render state-aware content.
      </div>
      <DndGrid
        cols={12}
        layout={layout}
        onLayoutChange={setLayout}
        rowHeight={50}
      >
        {layout.map((item) => (
          <StateAwareContent key={item.id} />
        ))}
      </DndGrid>
    </div>
  );
}
