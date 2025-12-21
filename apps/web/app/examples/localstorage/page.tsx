"use client";

import { DndGrid, type Layout } from "@dnd-grid/react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const STORAGE_KEY = "dnd-grid-example-layout";

const defaultLayout: Layout = [0, 1, 2, 3, 4, 5].map((i) => ({
  i: i.toString(),
  x: (i * 2) % 12,
  y: Math.floor(i / 6) * 2,
  w: 2,
  h: 2,
  deg: 0,
}));

function getInitialLayout(): Layout {
  if (typeof window === "undefined") return defaultLayout;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch {
    // Invalid JSON, use default
  }
  return defaultLayout;
}

export default function LocalStorageExample() {
  const [layout, setLayout] = useState<Layout>(getInitialLayout);

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
      <Button variant="destructive" onClick={resetLayout} className="mb-4">
        Reset Layout
      </Button>

      <DndGrid
        layout={layout}
        cols={12}
        rowHeight={40}
        width={600}
        onLayoutChange={handleLayoutChange}
      >
        {layout.map((item) => (
            <div
              key={item.i}
              className="bg-background text-foreground shadow-[0_2px_4px_rgba(0,0,0,.04)] border border-border rounded-widget flex items-center justify-center text-lg font-semibold cursor-grab"
            >
              {item.i}
            </div>
          ))}
      </DndGrid>
    </div>
  );
}
