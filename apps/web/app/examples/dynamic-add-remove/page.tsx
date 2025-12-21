"use client";

import { DndGrid, type Layout } from "@dnd-grid/react";
import { Button } from "@/components/ui/button";
import { useState, useCallback } from "react";
import { X } from "lucide-react";

export default function DynamicAddRemoveExample() {
  const [counter, setCounter] = useState(5);
  const [layout, setLayout] = useState<Layout>(
    [0, 1, 2, 3, 4].map((i) => ({
      i: i.toString(),
      x: (i * 2) % 12,
      y: 0,
      w: 2,
      h: 2,
      deg: 0,
    }))
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
        deg: 0,
      },
    ]);
    setCounter((c) => c + 1);
  }, [counter]);

  const removeItem = (id: string) => {
    setLayout((prev) => prev.filter((item) => item.i !== id));
  };

  return (
    <div>
      <Button onClick={addItem} className="mb-4">
        Add Item
      </Button>

      <DndGrid
        layout={layout}
        cols={12}
        rowHeight={40}
        width={600}
        onLayoutChange={setLayout}
      >
        {layout.map((item) => (
            <div
              key={item.i}
              className="bg-background text-foreground shadow-[0_2px_4px_rgba(0,0,0,.04)] border border-border rounded-widget flex items-center justify-center relative cursor-grab"
            >
              <span className="text-lg font-semibold">{item.i}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeItem(item.i);
                }}
                className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-full bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
      </DndGrid>
    </div>
  );
}
