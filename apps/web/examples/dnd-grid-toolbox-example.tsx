"use client";

import { DndGrid, type Layout } from "@dnd-grid/react";
import { type CSSProperties, useState } from "react";

interface ToolboxItem {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  visible: boolean;
}

const initialItems: ToolboxItem[] = [
  { id: "a", x: 0, y: 0, w: 2, h: 2, visible: true },
  { id: "b", x: 2, y: 0, w: 2, h: 2, visible: true },
  { id: "c", x: 4, y: 0, w: 2, h: 2, visible: false },
  { id: "d", x: 6, y: 0, w: 2, h: 2, visible: false },
];

const removeButtonStyle: CSSProperties = {
  position: "absolute",
  top: 6,
  right: 6,
  width: 22,
  height: 22,
  borderRadius: 9999,
  border: "1px solid #e5e7eb",
  background: "white",
  color: "#0f172a",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 12,
  lineHeight: "1",
  cursor: "pointer",
  boxShadow: "0 1px 2px rgba(15, 23, 42, 0.08)",
};

export function ToolboxExample() {
  const [items, setItems] = useState<ToolboxItem[]>(initialItems);

  const toggleItem = (id: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, visible: !item.visible } : item,
      ),
    );
  };

  const visibleItems = items.filter((item) => item.visible);
  const hiddenItems = items.filter((item) => !item.visible);
  const visibleLayout: Layout = visibleItems.map(
    ({ visible, ...item }) => item,
  );

  const handleLayoutChange = (newLayout: Layout) => {
    setItems((prev) =>
      prev.map((item) => {
        const updated = newLayout.find((l) => l.id === item.id);
        return updated ? { ...item, ...updated } : item;
      }),
    );
  };

  return (
    <div>
      <div className="toolbox">
        <div>Toolbox (click to add)</div>
        {hiddenItems.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => toggleItem(item.id)}
          >
            {item.id}
          </button>
        ))}
      </div>

      <DndGrid
        layout={visibleLayout}
        cols={12}
        rowHeight={50}
        onLayoutChange={handleLayoutChange}
      >
        {visibleItems.map((item) => (
          <div key={item.id} className="grid-item">
            <span>{item.id}</span>
            <button
              type="button"
              onClick={() => toggleItem(item.id)}
              style={removeButtonStyle}
              aria-label={`Remove ${item.id}`}
              title="Remove"
            >
              x
            </button>
          </div>
        ))}
      </DndGrid>
    </div>
  );
}
