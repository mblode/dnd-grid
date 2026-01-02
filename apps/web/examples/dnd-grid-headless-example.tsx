"use client";

import {
  GridItem,
  type Layout,
  useContainerWidth,
  useDndGrid,
} from "@dnd-grid/react";
import { Children, type MutableRefObject, useCallback, useState } from "react";

const initialLayout: Layout = [
  { id: "a", x: 0, y: 0, w: 3, h: 2 },
  { id: "b", x: 3, y: 0, w: 3, h: 2 },
  { id: "c", x: 6, y: 0, w: 3, h: 2 },
];

export function HeadlessExample() {
  const [layout, setLayout] = useState(initialLayout);
  const { width, containerRef, mounted } = useContainerWidth({
    measureBeforeMount: true,
  });
  const children = layout.map((item) => (
    <div className="grid-item" key={item.id}>
      {item.id}
    </div>
  ));

  const { gridProps, itemProps, liveRegionElement } = useDndGrid({
    layout,
    onLayoutChange: setLayout,
    cols: 12,
    rowHeight: 50,
    width,
    children,
  });

  const { ref: gridRef, ...restGridProps } = gridProps;
  const setGridRef = useCallback(
    (node: HTMLDivElement | null) => {
      containerRef.current = node;
      if (typeof gridRef === "function") {
        gridRef(node);
        return;
      }
      if (gridRef) {
        (gridRef as MutableRefObject<HTMLDivElement | null>).current = node;
      }
    },
    [containerRef, gridRef]
  );

  const droppingProps = itemProps.getDroppingItemProps();
  const placeholderProps = itemProps.getPlaceholderProps();

  return (
    <div className="space-y-2">
      <div className="text-xs text-zinc-500">Custom wrapper</div>
      <div {...restGridProps} ref={setGridRef}>
        {mounted && (
          <>
            {liveRegionElement}
            {Children.map(children, (child) => {
              const props = itemProps.getItemProps(child);
              return props ? <GridItem {...props} /> : null;
            })}
            {droppingProps && <GridItem {...droppingProps} />}
            {placeholderProps && <GridItem {...placeholderProps} />}
          </>
        )}
      </div>
    </div>
  );
}
