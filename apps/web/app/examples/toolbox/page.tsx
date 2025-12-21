"use client";

import { DndGrid, type Layout } from "@dnd-grid/react";
import { useState } from "react";

interface ToolboxItem {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  deg: number;
  visible: boolean;
}

const initialItems: ToolboxItem[] = [
  { i: "a", x: 0, y: 0, w: 2, h: 2, deg: 0, visible: true },
  { i: "b", x: 2, y: 0, w: 2, h: 2, deg: 0, visible: true },
  { i: "c", x: 4, y: 0, w: 2, h: 2, deg: 0, visible: false },
  { i: "d", x: 6, y: 0, w: 2, h: 2, deg: 0, visible: false },
];

export default function ToolboxExample() {
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
      <div className="mb-4 p-3 bg-muted rounded-md">
        <div className="text-sm font-medium mb-2">Toolbox (click to add)</div>
        <div className="flex gap-2">
          {hiddenItems.map((item) => (
            <button
              type="button"
              key={item.i}
              onClick={() => toggleItem(item.i)}
              className="px-3 py-1 bg-background border border-border rounded text-sm hover:bg-accent"
            >
              {item.i}
            </button>
          ))}
          {hiddenItems.length === 0 && (
            <span className="text-sm text-muted-foreground">Empty</span>
          )}
        </div>
      </div>

      <DndGrid
        layout={visibleItems as Layout}
        cols={12}
        rowHeight={40}
        width={600}
        onLayoutChange={handleLayoutChange}
      >
        {visibleItems.map((item) => (
          <div
            key={item.i}
            className="bg-background text-foreground shadow-[0_2px_4px_rgba(0,0,0,.04)] border border-border rounded-widget flex items-center justify-center relative cursor-grab"
                      >
                        <span className="text-lg font-semibold">{item.i}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleItem(item.i);
                          }}              className="absolute top-1 right-1 w-5 h-5 flex items-center justify-center text-muted-foreground hover:text-foreground"
            >
              ×
            </button>
          </div>
        ))}
      </DndGrid>
    </div>
  );
}
