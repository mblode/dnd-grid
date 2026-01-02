"use client";

import { DndGrid, type Layout, layoutSchema } from "@dnd-grid/react";
import { useEffect, useState } from "react";

const STORAGE_KEY = "dnd-grid-layout";

const defaultLayout: Layout = [0, 1, 2, 3, 4, 5].map((i) => ({
  id: i.toString(),
  x: (i * 2) % 12,
  y: Math.floor(i / 6) * 2,
  w: 2,
  h: 2,
}));

const normalizeLayout = (value: unknown): Layout | null => {
  if (!Array.isArray(value)) {
    return null;
  }

  const normalized = value.map((item, index) => {
    if (!item || typeof item !== "object") {
      return null;
    }
    const record = item as Record<string, unknown>;
    const candidate = record.id ?? record.i ?? record.key;
    const id =
      typeof candidate === "string" && candidate.trim().length > 0
        ? candidate
        : typeof candidate === "number" && Number.isFinite(candidate)
          ? candidate.toString()
          : `item-${index}`;
    return {
      ...record,
      id,
    };
  });

  if (normalized.some((item) => item === null)) {
    return null;
  }

  const parsed = layoutSchema.safeParse(normalized);
  return parsed.success ? parsed.data : null;
};

export function LocalStorageExample() {
  const [layout, setLayout] = useState<Layout>(defaultLayout);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      return;
    }
    try {
      const parsed = JSON.parse(saved);
      const normalized = normalizeLayout(parsed);
      if (normalized) {
        setLayout(normalized);
        return;
      }
    } catch {
      // ignore and fall back to default layout
    }
    setLayout(defaultLayout);
    localStorage.removeItem(STORAGE_KEY);
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
      <button onClick={resetLayout} type="button">
        Reset Layout
      </button>

      <DndGrid
        cols={12}
        layout={layout}
        onLayoutChange={handleLayoutChange}
        rowHeight={50}
      >
        {layout.map((item) => (
          <div className="grid-item" key={item.id}>
            {item.id}
          </div>
        ))}
      </DndGrid>
    </div>
  );
}
