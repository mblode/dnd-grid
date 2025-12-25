"use client";

import {
  FixedWidthDndGrid,
  type ResponsiveLayouts,
  useContainerWidth,
  useDndGridResponsiveLayout,
} from "@dnd-grid/react";

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
  const { width, containerRef, mounted } = useContainerWidth({
    measureBeforeMount: true,
  });

  const { gridProps, handleLayoutChange } = useDndGridResponsiveLayout({
    width,
    layouts,
    gap: { lg: 16, sm: 12 },
    containerPadding: { lg: 16, sm: 12 },
  });

  return (
    <div ref={containerRef}>
      {mounted && (
        <FixedWidthDndGrid
          {...gridProps}
          width={width}
          rowHeight={48}
          onLayoutChange={handleLayoutChange}
        >
          {cards.map((id) => (
            <div key={id}>{id}</div>
          ))}
        </FixedWidthDndGrid>
      )}
    </div>
  );
}
