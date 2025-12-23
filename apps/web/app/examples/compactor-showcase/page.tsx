"use client";

import {
  DndGrid,
  horizontalCompactor,
  type Layout,
  noCompactor,
  useContainerWidth,
  verticalCompactor,
  wrapCompactor,
} from "@dnd-grid/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const GRID_WIDTH = 600;

const initialLayout: Layout = [
  { i: "a", x: 0, y: 0, w: 2, h: 2 },
  { i: "b", x: 5, y: 0, w: 3, h: 2 },
  { i: "c", x: 9, y: 0, w: 2, h: 2 },
  { i: "d", x: 0, y: 4, w: 4, h: 2 },
  { i: "e", x: 6, y: 6, w: 3, h: 3 },
  { i: "f", x: 2, y: 9, w: 2, h: 2 },
];

const compactors = {
  vertical: verticalCompactor,
  horizontal: horizontalCompactor,
  wrap: wrapCompactor,
  none: noCompactor,
} as const;

type CompactorKey = keyof typeof compactors;

export default function CompactorShowcaseExample() {
  const [layout, setLayout] = useState<Layout>(initialLayout);
  const [compactorKey, setCompactorKey] = useState<CompactorKey>("vertical");
  const { width, containerRef, mounted } = useContainerWidth({
    measureBeforeMount: true,
    initialWidth: GRID_WIDTH,
  });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span>Compactor</span>
        {(
          [
            { id: "vertical", label: "Vertical" },
            { id: "horizontal", label: "Horizontal" },
            { id: "wrap", label: "Wrap" },
            { id: "none", label: "None" },
          ] as const
        ).map((option) => (
          <Button
            key={option.id}
            type="button"
            size="sm"
            variant={compactorKey === option.id ? "default" : "outline"}
            onClick={() => setCompactorKey(option.id)}
          >
            {option.label}
          </Button>
        ))}
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => setLayout(initialLayout)}
        >
          Reset layout
        </Button>
      </div>
      <div
        ref={containerRef}
        className="w-full"
        style={{ maxWidth: GRID_WIDTH }}
      >
        {mounted && width > 0 ? (
          <DndGrid
            layout={layout}
            cols={12}
            rowHeight={40}
            width={width}
            compactor={compactors[compactorKey]}
            onLayoutChange={setLayout}
          >
            {layout.map((item) => (
              <div key={item.i}>{item.i}</div>
            ))}
          </DndGrid>
        ) : (
          <Skeleton className="h-[260px] w-full" />
        )}
      </div>
    </div>
  );
}
