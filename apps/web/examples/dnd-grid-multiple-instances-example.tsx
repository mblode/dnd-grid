"use client";

import { DndGrid, type Layout } from "@dnd-grid/react";
import { useState } from "react";

const initialLayoutA: Layout = [
  { id: "a1", x: 0, y: 0, w: 3, h: 2 },
  { id: "a2", x: 3, y: 0, w: 3, h: 2 },
  { id: "a3", x: 6, y: 0, w: 3, h: 2 },
];

const initialLayoutB: Layout = [
  { id: "b1", x: 0, y: 0, w: 4, h: 2 },
  { id: "b2", x: 4, y: 0, w: 4, h: 2 },
  { id: "b3", x: 8, y: 0, w: 4, h: 2 },
];

export function MultipleInstancesExample() {
  const [layoutA, setLayoutA] = useState<Layout>(initialLayoutA);
  const [layoutB, setLayoutB] = useState<Layout>(initialLayoutB);

  return (
    <div className="space-y-6">
      <div>
        <div className="mb-2 text-xs text-zinc-500">Grid A</div>
        <DndGrid
          cols={12}
          layout={layoutA}
          onLayoutChange={setLayoutA}
          rowHeight={50}
        >
          {layoutA.map((item) => (
            <div className="grid-item" key={item.id}>
              {item.id}
            </div>
          ))}
        </DndGrid>
      </div>
      <div>
        <div className="mb-2 text-xs text-zinc-500">Grid B</div>
        <DndGrid
          cols={12}
          layout={layoutB}
          onLayoutChange={setLayoutB}
          rowHeight={50}
        >
          {layoutB.map((item) => (
            <div className="grid-item" key={item.id}>
              {item.id}
            </div>
          ))}
        </DndGrid>
      </div>
    </div>
  );
}
