"use client";

import { DndGrid, type Layout, type LayoutItem } from "@dnd-grid/react";
import { useRef, useState } from "react";

interface PaletteItem {
  id: string;
  label: string;
  w: number;
  h: number;
}

const paletteItems: PaletteItem[] = [
  { id: "small", label: "Small (2x2)", w: 2, h: 2 },
  { id: "wide", label: "Wide (4x2)", w: 4, h: 2 },
  { id: "tall", label: "Tall (2x4)", w: 2, h: 4 },
];

const initialLayout: Layout = [
  { id: "a", x: 0, y: 0, w: 3, h: 2 },
  { id: "b", x: 3, y: 0, w: 3, h: 3 },
  { id: "c", x: 6, y: 0, w: 3, h: 2 },
  { id: "d", x: 9, y: 0, w: 3, h: 2 },
];

export function DragFromOutsideExample() {
  const [layout, setLayout] = useState<Layout>(initialLayout);
  const dragItemRef = useRef<PaletteItem | null>(null);
  const nextIdRef = useRef(1);

  const handleDropDragOver = () => {
    const active = dragItemRef.current;
    return active ? { w: active.w, h: active.h } : undefined;
  };

  const handleDrop = (_layout: Layout, item?: LayoutItem | null) => {
    if (!item) {
      return;
    }
    const nextId = `n${nextIdRef.current}`;
    nextIdRef.current += 1;
    setLayout((prev) => [
      ...prev,
      { id: nextId, x: item.x, y: item.y, w: item.w, h: item.h },
    ]);
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
        {paletteItems.map((palette) => (
          <button
            draggable
            key={palette.id}
            onDragStart={(event) => {
              dragItemRef.current = palette;
              event.dataTransfer.setData("text/plain", palette.id);
            }}
            style={{
              appearance: "none",
              background: "white",
              border: "1px solid #e5e7eb",
              padding: "6px 10px",
              borderRadius: "6px",
              fontSize: "12px",
              cursor: "grab",
            }}
            type="button"
          >
            {palette.label}
          </button>
        ))}
      </div>

      <DndGrid
        cols={12}
        layout={layout}
        onDrop={handleDrop}
        onDropDragOver={handleDropDragOver}
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
