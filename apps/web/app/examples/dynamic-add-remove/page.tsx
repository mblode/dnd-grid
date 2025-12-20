"use client";

import { DndGrid, type Layout } from "@dnd-grid/react";
import { ResizeHandle } from "@/components/resize-handle";
import { Button } from "@/components/ui/button";
import { useState, useCallback } from "react";

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
      <h2 className="text-lg font-semibold mb-4">Dynamic Add/Remove</h2>
      <p className="text-muted-foreground mb-4">
        Click the button to add items, click × to remove.
      </p>
      <Button onClick={addItem} className="mb-4">
        Add Item
      </Button>

      <DndGrid
        layout={layout}
        cols={12}
        rowHeight={40}
        width={600}
        onLayoutChange={setLayout}
        resizeHandle={(handleAxis, ref) => <ResizeHandle ref={ref as any} handleAxis={handleAxis} />}
      >
        {layout.map((item) => (
          <div
            key={item.i}
            className="bg-muted border border-border rounded-md flex items-center justify-center relative"
          >
            <span className="text-lg font-semibold">{item.i}</span>
            <button
              onClick={() => removeItem(item.i)}
              className="absolute top-1 right-1 w-5 h-5 flex items-center justify-center text-muted-foreground hover:text-foreground"
            >
              ×
            </button>
          </div>
        ))}
      </DndGrid>
    </div>
  );
}
