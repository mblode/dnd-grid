"use client";

import { DndGrid, type Layout } from "@dnd-grid/react";
import { ResizeHandle } from "@/components/resize-handle";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";

const STORAGE_KEY = "dnd-grid-example-layout";

const defaultLayout: Layout = [0, 1, 2, 3, 4, 5].map((i) => ({
  i: i.toString(),
  x: (i * 2) % 12,
  y: Math.floor(i / 6) * 2,
  w: 2,
  h: 2,
  deg: 0,
}));

export default function LocalStorageExample() {
  const [layout, setLayout] = useState<Layout>(defaultLayout);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setLayout(JSON.parse(saved));
      } catch {
        // Invalid JSON, use default
      }
    }
  }, []);

  const handleLayoutChange = (newLayout: Layout) => {
    setLayout(newLayout);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newLayout));
  };

  const resetLayout = () => {
    setLayout(defaultLayout);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">LocalStorage Persistence</h2>
      <p className="text-muted-foreground mb-4">
        Layout is saved to localStorage. Refresh the page to see it persist.
      </p>
      <Button variant="destructive" onClick={resetLayout} className="mb-4">
        Reset Layout
      </Button>

      <DndGrid
        layout={layout}
        cols={12}
        rowHeight={40}
        width={600}
        onLayoutChange={handleLayoutChange}
        resizeHandle={(handleAxis, ref) => <ResizeHandle ref={ref as any} handleAxis={handleAxis} />}
      >
        {layout.map((item) => (
          <div
            key={item.i}
            className="bg-muted border border-border rounded-md flex items-center justify-center text-lg font-semibold"
          >
            {item.i}
          </div>
        ))}
      </DndGrid>
    </div>
  );
}
