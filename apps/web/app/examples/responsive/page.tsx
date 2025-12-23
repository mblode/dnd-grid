"use client";

import {
  DndGrid,
  type ResponsiveLayouts,
  useContainerWidth,
  useDndGridResponsiveLayout,
} from "@dnd-grid/react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

const containerWidthOptions = [
  { value: "auto", label: "Auto", description: "Fluid", width: null },
  { value: "lg", label: "LG", description: "1200px", width: 1200 },
  { value: "md", label: "MD", description: "996px", width: 996 },
  { value: "sm", label: "SM", description: "768px", width: 768 },
  { value: "xs", label: "XS", description: "480px", width: 480 },
  { value: "xxs", label: "XXS", description: "360px", width: 360 },
] as const;

export default function ResponsiveExample() {
  const searchParams = useSearchParams();
  const isEmbed = searchParams.get("embed") === "true";
  const [widthPreset, setWidthPreset] = useState("auto");
  const activePreset =
    containerWidthOptions.find((option) => option.value === widthPreset) ??
    containerWidthOptions[0];
  const containerWidth = activePreset?.width ?? null;
  const { width, containerRef, mounted } = useContainerWidth({
    measureBeforeMount: true,
    initialWidth: 0,
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
      {isEmbed ? (
        <Tabs value={widthPreset} onValueChange={setWidthPreset}>
          <TabsList aria-label="Container width" className="w-full">
            {containerWidthOptions.map((option) => (
              <TabsTrigger
                key={option.value}
                value={option.value}
                className="w-full"
              >
                {option.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      ) : null}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Breakpoint: {mounted ? breakpoint : "..."}</span>
        <span>
          {mounted ? `${Math.round(width)}px · ${cols} cols` : "Measuring..."}
        </span>
      </div>
      <div className="w-full overflow-x-auto">
        <div
          ref={containerRef}
          className="mx-auto"
          style={{ width: containerWidth ? `${containerWidth}px` : "100%" }}
        >
          {mounted && width > 0 ? (
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
          ) : (
            <Skeleton className="h-[280px] w-full" />
          )}
        </div>
      </div>
    </div>
  );
}
