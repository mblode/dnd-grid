"use client";

import { DndGrid, type Layout, useContainerWidth } from "@dnd-grid/react";
import { X } from "lucide-react";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const GRID_WIDTH = 600;

export default function DynamicAddRemoveExample() {
  const [counter, setCounter] = useState(5);
  const [layout, setLayout] = useState<Layout>(
    [0, 1, 2, 3, 4].map((i) => ({
      i: i.toString(),
      x: (i * 2) % 12,
      y: 0,
      w: 2,
      h: 2,
    })),
  );
  const addItem = useCallback(() => {
    setLayout((prev) => [
      ...prev,
      {
        i: `n${counter}`,
        x: (prev.length * 2) % 12,
        y: Infinity,
        w: 2,
        h: 2,
      },
    ]);
    setCounter((c) => c + 1);
  }, [counter]);
  const { width, containerRef, mounted } = useContainerWidth({
    measureBeforeMount: true,
    initialWidth: GRID_WIDTH,
  });

  const removeItem = (id: string) => {
    setLayout((prev) => prev.filter((item) => item.i !== id));
  };

  return (
    <div>
      <Button onClick={addItem} className="mb-4">
        Add Item
      </Button>

      <div
        ref={containerRef}
        className="w-full"
        style={{ maxWidth: GRID_WIDTH }}
      >
        {mounted && width > 0 ? (
          <DndGrid
            layout={layout}
            cols={12}
            rowHeight={40}
            width={width}
            draggableCancel=".no-drag"
            onLayoutChange={setLayout}
          >
            {layout.map((item) => (
              <div key={item.i} className="relative">
                <span>{item.i}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeItem(item.i);
                  }}
                  className="no-drag absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-full bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
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
