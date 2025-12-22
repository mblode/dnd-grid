"use client";

import {
  DndGrid,
  type ResponsiveLayouts,
  useContainerWidth,
  useDndGridResponsiveLayout,
} from "@dnd-grid/react";

const layouts: ResponsiveLayouts = {
  lg: [
    { i: "a", x: 0, y: 0, w: 6, h: 2 },
    { i: "b", x: 6, y: 0, w: 3, h: 2 },
    { i: "c", x: 9, y: 0, w: 3, h: 2 },
    { i: "d", x: 0, y: 2, w: 12, h: 2 },
  ],
  md: [
    { i: "a", x: 0, y: 0, w: 6, h: 2 },
    { i: "b", x: 6, y: 0, w: 4, h: 2 },
    { i: "c", x: 0, y: 2, w: 5, h: 2 },
    { i: "d", x: 5, y: 2, w: 5, h: 2 },
  ],
  sm: [
    { i: "a", x: 0, y: 0, w: 6, h: 2 },
    { i: "b", x: 0, y: 2, w: 3, h: 2 },
    { i: "c", x: 3, y: 2, w: 3, h: 2 },
    { i: "d", x: 0, y: 4, w: 6, h: 2 },
  ],
  xs: [
    { i: "a", x: 0, y: 0, w: 4, h: 2 },
    { i: "b", x: 0, y: 2, w: 4, h: 2 },
    { i: "c", x: 0, y: 4, w: 4, h: 2 },
    { i: "d", x: 0, y: 6, w: 4, h: 2 },
  ],
};

const cards = [
  { id: "a", label: "Revenue" },
  { id: "b", label: "Pipeline" },
  { id: "c", label: "Usage" },
  { id: "d", label: "Notes" },
];

export default function ResponsiveExample() {
  const { width, containerRef, mounted } = useContainerWidth({
    measureBeforeMount: true,
  });

  const { gridProps, handleLayoutChange, breakpoint, cols } =
    useDndGridResponsiveLayout({
      width,
      layouts,
      margin: { lg: 16, md: 16, sm: 12, xs: 10, xxs: 8 },
      containerPadding: { lg: 16, md: 16, sm: 12, xs: 10, xxs: 8 },
    });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Breakpoint: {breakpoint}</span>
        <span>
          {Math.round(width)}px · {cols} cols
        </span>
      </div>
      <div ref={containerRef} className="w-full">
        {mounted && width > 0 && (
          <DndGrid
            {...gridProps}
            width={width}
            rowHeight={48}
            onLayoutChange={handleLayoutChange}
          >
            {cards.map((card) => (
              <div key={card.id}>{card.label}</div>
            ))}
          </DndGrid>
        )}
      </div>
    </div>
  );
}
