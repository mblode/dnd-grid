"use client";

import {
  DndGrid,
  type Layout,
  type LayoutItem,
  useContainerWidth,
} from "@dnd-grid/react";
import { useRef, useState, type DragEvent } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const GRID_WIDTH = 600;

type PaletteItem = {
  id: string;
  label: string;
  w: number;
  h: number;
};

const paletteItems: PaletteItem[] = [
  { id: "small", label: "Small (2x2)", w: 2, h: 2 },
  { id: "wide", label: "Wide (4x2)", w: 4, h: 2 },
  { id: "tall", label: "Tall (2x4)", w: 2, h: 4 },
];

const initialLayout: Layout = [
  { i: "a", x: 0, y: 0, w: 3, h: 2 },
  { i: "b", x: 3, y: 0, w: 3, h: 3 },
  { i: "c", x: 6, y: 0, w: 3, h: 2 },
  { i: "d", x: 9, y: 0, w: 3, h: 2 },
];

export default function DragFromOutsideExample() {
  const [layout, setLayout] = useState<Layout>(initialLayout);
  const [activePaletteId, setActivePaletteId] = useState<string | null>(null);
  const dragItemRef = useRef<PaletteItem | null>(null);
  const nextIdRef = useRef(1);
  const { width, containerRef, mounted } = useContainerWidth({
    measureBeforeMount: true,
    initialWidth: GRID_WIDTH,
  });

  const handleDragStart = (item: PaletteItem) =>
    (event: DragEvent<HTMLDivElement>) => {
      dragItemRef.current = item;
      setActivePaletteId(item.id);
      event.dataTransfer.setData("text/plain", item.id);
      event.dataTransfer.effectAllowed = "move";
    };

  const handleDragEnd = () => {
    dragItemRef.current = null;
    setActivePaletteId(null);
  };

  const handleDropDragOver = () => {
    const active = dragItemRef.current;
    return active ? { w: active.w, h: active.h } : undefined;
  };

  const handleDrop = (_layout: Layout, item?: LayoutItem | null) => {
    if (!item) return;
    const nextId = `n${nextIdRef.current}`;
    nextIdRef.current += 1;
    setLayout((prev) => [
      ...prev,
      {
        i: nextId,
        x: item.x,
        y: item.y,
        w: item.w,
        h: item.h,
      },
    ]);
    dragItemRef.current = null;
    setActivePaletteId(null);
  };

  return (
    <div className="space-y-3">
      <div className="text-xs text-muted-foreground">
        Drag a tile into the grid to create a new item.
      </div>
      <div className="flex flex-wrap gap-2">
        {paletteItems.map((item) => (
          <div
            key={item.id}
            draggable
            onDragStart={handleDragStart(item)}
            onDragEnd={handleDragEnd}
            className={cn(
              "rounded-md border border-border bg-background px-3 py-2 text-xs font-medium shadow-sm cursor-grab active:cursor-grabbing",
              activePaletteId === item.id
                ? "border-primary text-primary"
                : "text-foreground",
            )}
          >
            {item.label}
          </div>
        ))}
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
            isDroppable
            onDrop={handleDrop}
            onDropDragOver={handleDropDragOver}
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
  );
}
