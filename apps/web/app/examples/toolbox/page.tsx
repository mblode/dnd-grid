"use client";

import { DndGrid, type Layout, useContainerWidth } from "@dnd-grid/react";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";

const GRID_WIDTH = 600;

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

export default function ToolboxExample() {
  const [items, setItems] = useState<ToolboxItem[]>(initialItems);
  const { width, containerRef, mounted } = useContainerWidth({
    measureBeforeMount: true,
    initialWidth: GRID_WIDTH,
  });

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

      <div
        ref={containerRef}
        className="w-full"
        style={{ maxWidth: GRID_WIDTH }}
      >
        {mounted && width > 0 ? (
          <DndGrid
            layout={visibleLayout}
            cols={12}
            rowHeight={40}
            width={width}
            onLayoutChange={handleLayoutChange}
          >
            {visibleItems.map((item) => (
              <div key={item.i} className="relative">
                <span>{item.i}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleItem(item.i);
                  }}
                  className="absolute top-1 right-1 w-5 h-5 flex items-center justify-center text-muted-foreground hover:text-foreground"
                >
                  ×
                </button>
              </div>
            ))}
          </DndGrid>
        ) : (
          <Skeleton className="h-[220px] w-full" />
        )}
      </div>
    </div>
  );
}
