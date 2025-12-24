"use client";

import { DndGrid, type Layout } from "@dnd-grid/react";
import { useEffect, useState } from "react";

const GRID_WIDTH = 1200;
const STORAGE_KEY = "dnd-grid-layout";

const defaultLayout: Layout = [0, 1, 2, 3, 4, 5].map((i) => ({
  i: i.toString(),
  x: (i * 2) % 12,
  y: Math.floor(i / 6) * 2,
  w: 2,
  h: 2,
}));

export function LocalStorageExample() {
  const [layout, setLayout] = useState<Layout>(defaultLayout);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    try {
      setLayout(JSON.parse(saved));
    } catch {
      setLayout(defaultLayout);
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
      <button type="button" onClick={resetLayout}>
        Reset Layout
      </button>

      <DndGrid
        layout={layout}
        cols={12}
        rowHeight={50}
        width={GRID_WIDTH}
        onLayoutChange={handleLayoutChange}
      >
        {layout.map((item) => (
          <div key={item.i} className="grid-item">
            {item.i}
          </div>
        ))}
      </DndGrid>
    </div>
  );
}
