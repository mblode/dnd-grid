"use client";

import { DndGrid, type Layout } from "@dnd-grid/react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const initialLayout: Layout = [
  { id: "p1", x: 0, y: 0, w: 3, h: 2 },
  { id: "p2", x: 3, y: 0, w: 3, h: 2 },
  { id: "p3", x: 6, y: 0, w: 3, h: 2 },
  { id: "p4", x: 9, y: 0, w: 3, h: 2 },
];

export function PortalExample() {
  const [layout, setLayout] = useState<Layout>(initialLayout);
  const portalRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const grid = (
    <DndGrid
      cols={12}
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

  return (
    <div className="space-y-4">
      <div className="text-xs text-zinc-500">
        Grid rendered via createPortal into a separate container.
      </div>
      <div
        className="min-h-[200px] rounded-lg border border-zinc-300 border-dashed p-4"
        ref={portalRef}
      />
      {mounted && portalRef.current && createPortal(grid, portalRef.current)}
    </div>
  );
}
