"use client";

import { DndGrid, findEmptyPosition, type Layout } from "@dnd-grid/react";
import { type CSSProperties, useCallback, useState } from "react";

const removeButtonStyle: CSSProperties = {
  position: "absolute",
  top: 6,
  right: 6,
  width: 22,
  height: 22,
  borderRadius: 9999,
  border: "1px solid #e5e7eb",
  background: "white",
  color: "#0f172a",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 12,
  lineHeight: "1",
  cursor: "pointer",
  boxShadow: "0 1px 2px rgba(15, 23, 42, 0.08)",
};

export function DynamicAddRemoveExample() {
  const [counter, setCounter] = useState(5);
  const [layout, setLayout] = useState<Layout>(
    [0, 1, 2, 3, 4].map((i) => ({
      id: i.toString(),
      x: (i * 2) % 12,
      y: 0,
      w: 2,
      h: 2,
    }))
  );

  const addItem = useCallback(() => {
    setLayout((prev) => {
      const position = findEmptyPosition(prev, { w: 2, h: 2 }, 12);

      return [
        ...prev,
        {
          id: `n${counter}`,
          ...position,
          w: 2,
          h: 2,
        },
      ];
    });
    setCounter((c) => c + 1);
  }, [counter]);

  const removeItem = useCallback((id: string) => {
    setLayout((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const removeLastItem = useCallback(() => {
    setLayout((prev) => (prev.length > 0 ? prev.slice(0, -1) : prev));
  }, []);

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <button onClick={addItem} type="button">
          Add Item
        </button>
        <button
          disabled={layout.length === 0}
          onClick={removeLastItem}
          type="button"
        >
          Remove Last Item
        </button>
      </div>

      <DndGrid
        cols={12}
        dragCancel=".grid-item-remove"
        layout={layout}
        onLayoutChange={setLayout}
        rowHeight={50}
      >
        {layout.map((item) => (
          <div className="grid-item" key={item.id}>
            <span>{item.id}</span>
            <button
              aria-label={`Remove ${item.id}`}
              className="grid-item-remove"
              onClick={() => removeItem(item.id)}
              style={removeButtonStyle}
              title="Remove"
              type="button"
            >
              x
            </button>
          </div>
        ))}
      </DndGrid>
    </div>
  );
}
