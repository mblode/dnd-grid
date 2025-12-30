"use client";

import {
  applySizeConstraints,
  aspectRatio,
  type ConstraintContext,
  DndGrid,
  defaultConstraints,
  type Layout,
  useContainerWidth,
} from "@dnd-grid/react";
import * as React from "react";

const COLS = 12;
const ROW_HEIGHT = 50;
const GRID_SPACING = 10;

const ratio16x9 = aspectRatio(16 / 9);
const ratio1x1 = aspectRatio(1);

const baseLayout: Layout = [
  { id: "16:9", x: 0, y: 0, w: 6, h: 3, constraints: [ratio16x9] },
  { id: "1:1", x: 6, y: 0, w: 3, h: 3, constraints: [ratio1x1] },
  { id: "free", x: 9, y: 0, w: 3, h: 2 },
];

const createConstraintContext = (
  layout: Layout,
  containerWidth: number
): ConstraintContext => ({
  cols: COLS,
  maxRows: Number.POSITIVE_INFINITY,
  containerWidth,
  containerHeight: 0,
  rowHeight: ROW_HEIGHT,
  gap: [GRID_SPACING, GRID_SPACING, GRID_SPACING, GRID_SPACING],
  containerPadding: [GRID_SPACING, GRID_SPACING, GRID_SPACING, GRID_SPACING],
  layout,
});

const applyInitialConstraints = (
  layout: Layout,
  containerWidth: number
): Layout => {
  const context = createConstraintContext(layout, containerWidth);
  return layout.map((item) => {
    if (!item.constraints?.length) {
      return item;
    }
    const size = applySizeConstraints(
      defaultConstraints,
      item,
      item.w,
      item.h,
      "se",
      context
    );
    if (size.w === item.w && size.h === item.h) {
      return item;
    }
    return { ...item, ...size };
  });
};

export function AspectRatioConstraintsExample() {
  const { width, containerRef, mounted } = useContainerWidth({
    measureBeforeMount: true,
  });
  const [layout, setLayout] = React.useState<Layout>(baseLayout);
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    if (!mounted || width <= 0 || ready) {
      return;
    }
    setLayout(applyInitialConstraints(baseLayout, width));
    setReady(true);
  }, [mounted, ready, width]);

  return (
    <div ref={containerRef}>
      {mounted && ready && (
        <DndGrid
          cols={COLS}
          containerPadding={GRID_SPACING}
          gap={GRID_SPACING}
          layout={layout}
          onLayoutChange={setLayout}
          rowHeight={ROW_HEIGHT}
          width={width}
        >
          {layout.map((item) => (
            <div className="grid-item" key={item.id}>
              {item.id}
            </div>
          ))}
        </DndGrid>
      )}
    </div>
  );
}
