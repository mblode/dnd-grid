"use client";

import { DndGrid, type Layout, useContainerWidth } from "@dnd-grid/react";
import { type CSSProperties, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const GRID_WIDTH = 600;

const scaleOptions = [0.75, 1, 1.25];

const initialLayout: Layout = [
  { i: "a", x: 0, y: 0, w: 3, h: 2 },
  { i: "b", x: 3, y: 0, w: 3, h: 2 },
  { i: "c", x: 6, y: 0, w: 3, h: 2 },
  { i: "d", x: 0, y: 2, w: 6, h: 2 },
  { i: "e", x: 6, y: 2, w: 3, h: 3 },
];

export default function ScaleExample() {
  const [layout, setLayout] = useState<Layout>(initialLayout);
  const [scale, setScale] = useState(1);
  const { width, containerRef, mounted } = useContainerWidth({
    measureBeforeMount: true,
    initialWidth: GRID_WIDTH,
  });

  const scaledStyle: CSSProperties = {
    maxWidth: GRID_WIDTH,
    transform: `scale(${scale})`,
    transformOrigin: "top left",
    ["--dnd-grid-scale" as string]: scale,
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span>Scale</span>
        {scaleOptions.map((value) => (
          <Button
            key={value}
            type="button"
            size="sm"
            variant={scale === value ? "default" : "outline"}
            onClick={() => setScale(value)}
          >
            {value}x
          </Button>
        ))}
      </div>
      <div className="overflow-visible">
        <div ref={containerRef} className="w-full" style={scaledStyle}>
          {mounted && width > 0 ? (
            <DndGrid
              layout={layout}
              cols={12}
              rowHeight={40}
              width={width}
              transformScale={scale}
              onLayoutChange={setLayout}
            >
              {layout.map((item) => (
                <div key={item.i}>{item.i}</div>
              ))}
            </DndGrid>
          ) : (
            <Skeleton className="h-[240px] w-full" />
          )}
        </div>
      </div>
    </div>
  );
}
