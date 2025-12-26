"use client";

import { ResponsiveDndGrid, type ResponsiveLayouts } from "@dnd-grid/react";

const layouts: ResponsiveLayouts = {
  lg: [
    { id: "a", x: 0, y: 0, w: 6, h: 2 },
    { id: "b", x: 6, y: 0, w: 3, h: 2 },
    { id: "c", x: 9, y: 0, w: 3, h: 2 },
    { id: "d", x: 0, y: 2, w: 12, h: 2 },
  ],
  sm: [
    { id: "a", x: 0, y: 0, w: 4, h: 2 },
    { id: "b", x: 0, y: 2, w: 4, h: 2 },
    { id: "c", x: 0, y: 4, w: 4, h: 2 },
    { id: "d", x: 0, y: 6, w: 4, h: 2 },
  ],
};

const cards = ["a", "b", "c", "d"];

export function ResponsiveExample() {
  return (
    <ResponsiveDndGrid
      layouts={layouts}
      gap={{ lg: 16, sm: 12 }}
      containerPadding={{ lg: 16, sm: 12 }}
      rowHeight={48}
    >
      {cards.map((id) => (
        <div key={id}>{id}</div>
      ))}
    </ResponsiveDndGrid>
  );
}
