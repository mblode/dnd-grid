"use client";

import { GridItem, type Layout, useDndGrid } from "@dnd-grid/react";
import * as React from "react";

const GRID_WIDTH = 1200;

const initialLayout: Layout = [
  { i: "a", x: 0, y: 0, w: 3, h: 2 },
  { i: "b", x: 3, y: 0, w: 3, h: 2 },
  { i: "c", x: 6, y: 0, w: 3, h: 2 },
];

export function HeadlessExample() {
  const [layout, setLayout] = React.useState(initialLayout);
  const children = layout.map((item) => (
    <div key={item.i} className="grid-item">
      {item.i}
    </div>
  ));

  const { gridProps, itemProps, liveRegionElement } = useDndGrid({
    layout,
    onLayoutChange: setLayout,
    cols: 12,
    rowHeight: 50,
    width: GRID_WIDTH,
    children,
  });

  const droppingProps = itemProps.getDroppingItemProps();
  const placeholderProps = itemProps.getPlaceholderProps();

  return (
    <div className="space-y-2">
      <div className="text-xs text-zinc-500">Custom wrapper</div>
      <div {...gridProps}>
        {liveRegionElement}
        {React.Children.map(children, (child) => {
          const props = itemProps.getItemProps(child);
          return props ? <GridItem {...props} /> : null;
        })}
        {droppingProps && <GridItem {...droppingProps} />}
        {placeholderProps && <GridItem {...placeholderProps} />}
      </div>
    </div>
  );
}
