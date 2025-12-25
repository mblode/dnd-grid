"use client";

import { AutoWidthDndGrid, type Layout } from "@dnd-grid/react";
import { useState } from "react";

interface ToolboxItem {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  visible: boolean;
}

const initialItems: ToolboxItem[] = [
  { i: "a", x: 0, y: 0, w: 2, h: 2, visible: true },
  { i: "b", x: 2, y: 0, w: 2, h: 2, visible: true },
  { i: "c", x: 4, y: 0, w: 2, h: 2, visible: false },
  { i: "d", x: 6, y: 0, w: 2, h: 2, visible: false },
];

export function ToolboxExample() {
  const [items, setItems] = useState<ToolboxItem[]>(initialItems);

  const toggleItem = (id: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.i === id ? { ...item, visible: !item.visible } : item,
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
        const updated = newLayout.find((l) => l.i === item.i);
        return updated ? { ...item, ...updated } : item;
      }),
    );
  };

  return (
    <div>
      <div className="toolbox">
        <div>Toolbox (click to add)</div>
        {hiddenItems.map((item) => (
          <button key={item.i} type="button" onClick={() => toggleItem(item.i)}>
            {item.i}
          </button>
        ))}
      </div>

      <AutoWidthDndGrid
        layout={visibleLayout}
        cols={12}
        rowHeight={50}
        onLayoutChange={handleLayoutChange}
      >
        {visibleItems.map((item) => (
          <div key={item.i} className="grid-item">
            <span>{item.i}</span>
            <button type="button" onClick={() => toggleItem(item.i)}>
              x
            </button>
          </div>
        ))}
      </AutoWidthDndGrid>
    </div>
  );
}
