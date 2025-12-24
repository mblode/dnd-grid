"use client";

import { DndGrid, findEmptyPosition, type Layout } from "@dnd-grid/react";
import { useCallback, useState } from "react";

const GRID_WIDTH = 1200;

export function DynamicAddRemoveExample() {
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
    setLayout((prev) => {
      const position = findEmptyPosition(prev, { w: 2, h: 2 }, 12);

      return [
        ...prev,
        {
          i: `n${counter}`,
          ...position,
          w: 2,
          h: 2,
        },
      ];
    });
    setCounter((c) => c + 1);
  }, [counter]);

  const removeItem = (id: string) => {
    setLayout((prev) => prev.filter((item) => item.i !== id));
  };

  return (
    <div>
      <button type="button" onClick={addItem}>
        Add Item
      </button>

      <DndGrid
        layout={layout}
        cols={12}
        rowHeight={50}
        width={GRID_WIDTH}
        onLayoutChange={setLayout}
      >
        {layout.map((item) => (
          <div key={item.i} className="grid-item">
            <span>{item.i}</span>
            <button type="button" onClick={() => removeItem(item.i)}>
              x
            </button>
          </div>
        ))}
      </DndGrid>
    </div>
  );
}
