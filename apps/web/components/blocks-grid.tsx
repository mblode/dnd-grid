"use client";

import {
  DndGrid,
  type DndGridHandle,
  type Layout,
  type LayoutItem,
  useContainerWidth,
} from "@dnd-grid/react";
import {
  DndContext,
  type DragEndEvent,
  type DragMoveEvent,
  DragOverlay,
  type DragStartEvent,
  KeyboardSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { Plus } from "lucide-react";
import type { CSSProperties } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BlocksGridItem } from "@/components/blocks-grid/blocks-grid-item";
import { BlocksGridPanel } from "@/components/blocks-grid/blocks-grid-panel";
import { initialItems, paletteItems } from "@/components/blocks-grid/data";
import { MobilePaletteSheet } from "@/components/blocks-grid/mobile-palette-sheet";
import { PaletteDragSwingOverlay } from "@/components/blocks-grid/palette-draggable";
import type {
  BlockKind,
  GridItem,
  PaletteItem,
} from "@/components/blocks-grid/types";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useGridInteractions } from "@/hooks/use-grid-interactions";
import {
  TrackedMouseSensor,
  TrackedTouchSensor,
} from "@/lib/dnd/tracked-sensors";

export const BLOCK_GAP = 16;
export const BLOCK_HEIGHT = 24;
export const BLOCK_COLUMNS = 4;
export const DEFAULT_WIDTH = 480;
export const MAX_WIDTH = 643;
const DEFAULT_GRID_ROWS = 12;
const DEFAULT_GRID_HEIGHT =
  DEFAULT_GRID_ROWS * BLOCK_HEIGHT +
  (DEFAULT_GRID_ROWS - 1) * BLOCK_GAP +
  BLOCK_GAP * 2;
const DESKTOP_MEDIA_QUERY = "(min-width: 1024px)";

const useMediaQuery = (query: string) => {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const mediaQuery = window.matchMedia(query);
    const handleChange = () => {
      setMatches(mediaQuery.matches);
    };

    handleChange();
    mediaQuery.addEventListener("change", handleChange);

    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, [query]);

  return matches;
};

type DndRect = {
  top: number;
  right: number;
  bottom: number;
  left: number;
  width: number;
  height: number;
};

const findEmptyPosition = ({
  layouts,
  newItemWidth,
  newItemHeight,
  gridWidth,
  gridHeight,
}: {
  layouts: Layout;
  newItemWidth: number;
  newItemHeight: number;
  gridWidth: number;
  gridHeight: number;
}): { x: number; y: number } => {
  const grid = Array.from({ length: gridHeight }, () =>
    Array.from({ length: gridWidth }, () => false),
  );

  layouts.forEach((item) => {
    for (let x = item.x; x < item.x + item.w; x += 1) {
      for (let y = item.y; y < item.y + item.h; y += 1) {
        if (grid[y] && grid[y][x] !== undefined) {
          grid[y][x] = true;
        }
      }
    }
  });

  for (let y = 0; y <= gridHeight - newItemHeight; y += 1) {
    for (let x = 0; x <= gridWidth - newItemWidth; x += 1) {
      let hasSpace = true;

      for (let dx = 0; dx < newItemWidth; dx += 1) {
        for (let dy = 0; dy < newItemHeight; dy += 1) {
          if (grid[y + dy][x + dx]) {
            hasSpace = false;
            break;
          }
        }
        if (!hasSpace) {
          break;
        }
      }

      if (hasSpace) {
        return { x, y };
      }
    }
  }

  return {
    x: 0,
    y: Infinity,
  };
};

const getSm = ({
  layouts,
  selectedBlockId,
  currentBlock,
}: {
  layouts: Layout;
  selectedBlockId?: string | null;
  currentBlock?: { w: number; h: number };
}) => {
  const foundItem = selectedBlockId
    ? layouts.find((item) => item.id === selectedBlockId)
    : undefined;

  if (foundItem && currentBlock) {
    const beneathPositionY = foundItem.y + foundItem.h - 1;

    return {
      x: foundItem.x,
      y: beneathPositionY,
      w: currentBlock.w || 1,
      h: currentBlock.h || 1,
    };
  }

  if (foundItem) {
    const beneathPositionY = foundItem.y + foundItem.h - 1;

    return {
      x: foundItem.x,
      y: beneathPositionY,
      w: foundItem.w,
      h: foundItem.h,
    };
  }

  if (currentBlock) {
    const position = findEmptyPosition({
      layouts,
      newItemHeight: currentBlock.h || 1,
      newItemWidth: currentBlock.w || 1,
      gridWidth: BLOCK_COLUMNS,
      gridHeight: 1000,
    });

    return {
      x: position.x,
      y: position.y,
      w: currentBlock.w || 1,
      h: currentBlock.h || 1,
    };
  }

  return undefined;
};

const collides = (a: LayoutItem, b: LayoutItem) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

const resolveDropLayout = ({
  layout,
  dropItem,
}: {
  layout: Layout;
  dropItem: LayoutItem;
}): Layout => {
  const placed: LayoutItem[] = [{ ...dropItem }];
  const next: LayoutItem[] = [{ ...dropItem }];
  const sorted = layout
    .filter((item) => item.id !== dropItem.id)
    .map((item) => ({ ...item }))
    .sort((a, b) => (a.y === b.y ? a.x - b.x : a.y - b.y));

  for (const item of sorted) {
    let candidate = { ...item };
    let needsPlacement = true;

    while (needsPlacement) {
      needsPlacement = false;
      let nextY = candidate.y;

      for (const placedItem of placed) {
        if (collides(candidate, placedItem)) {
          nextY = Math.max(nextY, placedItem.y + placedItem.h);
          needsPlacement = true;
        }
      }

      if (needsPlacement) {
        candidate = { ...candidate, y: nextY };
      }
    }

    placed.push(candidate);
    next.push(candidate);
  }

  return next;
};

const getPointerCoordinates = (event?: Event | null) => {
  if (!event) return null;
  if ("touches" in event) {
    const touchEvent = event as TouchEvent;
    const touch = touchEvent.touches[0] ?? touchEvent.changedTouches[0];
    if (touch) {
      return { x: touch.clientX, y: touch.clientY };
    }
  }
  if ("clientX" in event && "clientY" in event) {
    const mouseEvent = event as MouseEvent;
    return { x: mouseEvent.clientX, y: mouseEvent.clientY };
  }
  return null;
};

export const BlocksGrid = () => {
  const [items, setItems] = useState<GridItem[]>(initialItems);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [activePaletteId, setActivePaletteId] = useState<BlockKind | null>(
    null,
  );
  const isDesktop = useMediaQuery(DESKTOP_MEDIA_QUERY);
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [dndRect, setDndRect] = useState<DndRect | null>(null);
  const [dndEvent, setDndEvent] = useState<Event | null>(null);
  const gridApiRef = useRef<DndGridHandle | null>(null);
  const dragItemRef = useRef<PaletteItem | null>(null);
  const dragPointerOffsetRef = useRef<{ x: number; y: number } | null>(null);
  const nextIdRef = useRef(1);
  const isOverGridRef = useRef(false);
  const { width, containerRef, mounted } = useContainerWidth({
    measureBeforeMount: true,
    initialWidth: DEFAULT_WIDTH,
  });

  const sensors = useSensors(
    useSensor(TrackedMouseSensor, {
      activationConstraint: {
        distance: 10,
      },
    }),
    useSensor(TrackedTouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 10,
      },
    }),
    useSensor(KeyboardSensor),
  );

  const openPalette = useCallback(() => {
    if (!isDesktop) {
      setIsPaletteOpen(true);
    }
  }, [isDesktop]);

  useEffect(() => {
    if (isDesktop) {
      setIsPaletteOpen(false);
    }
  }, [isDesktop]);

  const handlers = useGridInteractions({
    onHover: setHoveredId,
    onSelect: (id) => {
      setSelectedId(id);
      setHoveredId(id);
      setIsEditing(false);
    },
    onDragStart: setHoveredId,
    onResizeStart: (id) => {
      setHoveredId(id);
      setSelectedId(id);
    },
  });

  const selectItem = useCallback(
    (id: string | null) => {
      setSelectedId(id);
      setHoveredId(id);
      handlers.setSelectedId(id);
      handlers.setHoveredId(id);
    },
    [handlers],
  );

  const handleSelectItem = useCallback(
    (id: string) => {
      selectItem(id);
      setIsEditing(false);
    },
    [selectItem],
  );

  const handleEditItem = useCallback(
    (id: string) => {
      selectItem(id);
      setIsEditing(true);
      openPalette();
    },
    [openPalette, selectItem],
  );

  const handleItemClick = useCallback(
    (id: string) => {
      if (isDesktop) {
        handleEditItem(id);
        return;
      }
      handleSelectItem(id);
    },
    [handleEditItem, handleSelectItem, isDesktop],
  );

  const clearSelection = useCallback(() => {
    selectItem(null);
    handlers.setHoveredId(null);
    setIsEditing(false);
  }, [handlers, selectItem]);

  const handleOpenAdd = useCallback(() => {
    clearSelection();
    setIsPaletteOpen(true);
  }, [clearSelection]);

  const handleClosePalette = useCallback(() => {
    setIsPaletteOpen(false);
    clearSelection();
  }, [clearSelection]);

  const resetDndState = useCallback((clearDragItem = true) => {
    setActivePaletteId(null);
    if (clearDragItem) {
      dragItemRef.current = null;
    }
    dragPointerOffsetRef.current = null;
    isOverGridRef.current = false;
  }, []);

  useEffect(() => {
    gridApiRef.current?.handleDndRect(
      dndEvent ?? undefined,
      dndRect ?? undefined,
    );
  }, [dndEvent, dndRect]);

  const handleDndDragStart = useCallback((event: DragStartEvent) => {
    const active = event.active.data.current?.palette as
      | PaletteItem
      | undefined;
    if (!active) return;
    dragItemRef.current = active;
    setActivePaletteId(active.kind);
    const initial = event.active.rect.current.initial;
    const point = getPointerCoordinates(event.activatorEvent ?? null);
    if (initial && point) {
      dragPointerOffsetRef.current = {
        x: point.x - initial.left,
        y: point.y - initial.top,
      };
    } else {
      dragPointerOffsetRef.current = null;
    }
  }, []);

  const handleDndDragMove = useCallback(
    (event: DragMoveEvent) => {
      const translated = event.active.rect.current.translated;
      if (!translated) return;

      if (!isDesktop && isPaletteOpen) {
        setIsPaletteOpen(false);
      }

      const gridRect = containerRef.current?.getBoundingClientRect();
      if (!gridRect) {
        isOverGridRef.current = false;
        setDndRect(null);
        setDndEvent(null);
        return;
      }

      const offset = dragPointerOffsetRef.current;
      const pointerX = offset
        ? translated.left + offset.x
        : translated.left + translated.width / 2;
      const pointerY = offset
        ? translated.top + offset.y
        : translated.top + translated.height / 2;
      const isOverGrid =
        pointerX >= gridRect.left &&
        pointerX <= gridRect.right &&
        pointerY >= gridRect.top &&
        pointerY <= gridRect.bottom;

      isOverGridRef.current = isOverGrid;

      if (!isOverGrid) {
        setDndRect(null);
        setDndEvent(null);
        return;
      }

      setDndRect({
        top: pointerY,
        right: pointerX,
        bottom: pointerY,
        left: pointerX,
        width: 0,
        height: 0,
      });
      setDndEvent(event.activatorEvent ?? new Event("dragover"));
    },
    [containerRef, isDesktop, isPaletteOpen],
  );

  const handleDndDragEnd = useCallback(
    (event: DragEndEvent) => {
      const shouldDrop = isOverGridRef.current;
      resetDndState(!shouldDrop);

      if (shouldDrop) {
        setDndRect(null);
        setDndEvent(event.activatorEvent ?? new Event("drop"));
        return;
      }

      setDndRect(null);
      setDndEvent(null);
    },
    [resetDndState],
  );

  const handleDndDragCancel = useCallback(() => {
    resetDndState();
    setDndRect(null);
    setDndEvent(null);
  }, [resetDndState]);

  const activePaletteItem = useMemo(
    () => paletteItems.find((item) => item.kind === activePaletteId) ?? null,
    [activePaletteId],
  );

  const measuredWidth = width > 0 ? width : DEFAULT_WIDTH;
  const scaleFactor = useMemo(
    () => Math.min(measuredWidth, MAX_WIDTH) / DEFAULT_WIDTH,
    [measuredWidth],
  );
  const scaleStyle = useMemo(
    () =>
      ({
        "--dnd-grid-scale": scaleFactor.toFixed(3),
      }) as CSSProperties,
    [scaleFactor],
  );

  const layout = useMemo<Layout>(
    () =>
      items.map(({ id, x, y, w, h }) => ({
        id,
        x,
        y,
        w,
        h,
      })),
    [items],
  );

  const selectedItem = items.find((item) => item.id === selectedId) ?? null;

  const updateItem = useCallback((id: string, patch: Partial<GridItem>) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  }, []);

  const handleLayoutChange = useCallback((nextLayout: Layout) => {
    setItems((prev) =>
      prev.map((item) => {
        const next = nextLayout.find((layoutItem) => layoutItem.id === item.id);
        return next
          ? { ...item, x: next.x, y: next.y, w: next.w, h: next.h }
          : item;
      }),
    );
  }, []);

  const handleDelete = useCallback(
    (id: string) => {
      setItems((prev) => prev.filter((item) => item.id !== id));
      if (selectedId === id) {
        clearSelection();
      }
    },
    [clearSelection, selectedId],
  );

  const handleDuplicate = useCallback(
    (id: string) => {
      const source = items.find((item) => item.id === id);
      if (!source) return;
      const sm = getSm({
        layouts: layout,
        selectedBlockId: id,
      });
      if (!sm) return;
      const nextId = `k${nextIdRef.current}`;
      nextIdRef.current += 1;
      setItems((prev) => [
        ...prev,
        {
          ...source,
          id: nextId,
          x: sm.x,
          y: sm.y,
          w: sm.w,
          h: sm.h,
        },
      ]);
      selectItem(nextId);
    },
    [items, layout, selectItem],
  );

  const handlePaletteClick = useCallback(
    (item: PaletteItem) => {
      const sm = getSm({
        layouts: layout,
        currentBlock: { w: item.w, h: item.h },
      });
      if (!sm) return;
      const nextId = `k${nextIdRef.current}`;
      nextIdRef.current += 1;
      setItems((prev) => [
        ...prev,
        {
          id: nextId,
          kind: item.kind,
          name: item.name,
          title: item.title,
          w: sm.w,
          h: sm.h,
          x: sm.x,
          y: sm.y,
        },
      ]);
      selectItem(nextId);
    },
    [layout, selectItem],
  );

  const handleDropDragOver = useCallback(() => {
    const active = dragItemRef.current;
    return active ? { w: active.w, h: active.h } : undefined;
  }, []);

  const handleDrop = useCallback(
    (_layout: Layout, item?: LayoutItem | null) => {
      const active = dragItemRef.current;
      if (!active || !item) return;
      const nextId = `k${nextIdRef.current}`;
      nextIdRef.current += 1;
      setItems((prev) => {
        const prevLayout = prev.map(({ id, x, y, w, h }) => ({
          id,
          x,
          y,
          w,
          h,
        }));
        const dropItem: LayoutItem = {
          id: nextId,
          x: item.x,
          y: item.y,
          w: item.w,
          h: item.h,
        };
        const nextLayout = resolveDropLayout({
          layout: prevLayout,
          dropItem,
        });
        const layoutById = new Map(
          nextLayout.map((entry) => [entry.id, entry]),
        );
        const nextItems = prev.map((entry) => {
          const next = layoutById.get(entry.id);
          return next
            ? { ...entry, x: next.x, y: next.y, w: next.w, h: next.h }
            : entry;
        });
        const dropLayout = layoutById.get(nextId);
        if (dropLayout) {
          nextItems.push({
            id: nextId,
            kind: active.kind,
            title: active.title,
            w: dropLayout.w,
            h: dropLayout.h,
            x: dropLayout.x,
            y: dropLayout.y,
          });
        }
        return nextItems;
      });
      dragItemRef.current = null;
      setActivePaletteId(null);
      selectItem(nextId);
    },
    [selectItem],
  );

  const rowHeight = BLOCK_HEIGHT * scaleFactor;
  const margin = BLOCK_GAP * scaleFactor;
  const gridWidth = Math.min(
    measuredWidth > 0 ? measuredWidth : DEFAULT_WIDTH,
    MAX_WIDTH,
  );
  const columnWidth = useMemo(() => {
    const available = Math.max(gridWidth - margin * (BLOCK_COLUMNS - 1), 0);
    return available / BLOCK_COLUMNS;
  }, [gridWidth, margin]);
  const getPreviewHeight = useCallback(
    (item: PaletteItem) => rowHeight * item.h + margin * (item.h - 1),
    [rowHeight, margin],
  );
  const dragOverlayStyle = useMemo(() => {
    if (!activePaletteItem) return null;
    const width =
      columnWidth * activePaletteItem.w + margin * (activePaletteItem.w - 1);
    const height =
      rowHeight * activePaletteItem.h + margin * (activePaletteItem.h - 1);
    return {
      width,
      height,
      "--dnd-grid-scale": scaleFactor.toFixed(3),
    } as CSSProperties;
  }, [activePaletteItem, columnWidth, margin, rowHeight, scaleFactor]);

  const panelProps = {
    isEditing,
    selectedItem,
    activePaletteId,
    onBack: () => setIsEditing(false),
    onPaletteClick: handlePaletteClick,
    onTitleChange: (id: string, nextTitle: string) =>
      updateItem(id, { title: nextTitle }),
    getPreviewHeight,
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDndDragStart}
      onDragMove={handleDndDragMove}
      onDragEnd={handleDndDragEnd}
      onDragCancel={handleDndDragCancel}
    >
      <div className="relative" style={scaleStyle}>
        <div className="grid gap-fluid-4 lg:grid-cols-[minmax(0,1fr)_260px] pb-12 md:pb-0">
          <div
            ref={containerRef}
            className="w-full"
            style={{ maxWidth: MAX_WIDTH }}
          >
            {mounted && measuredWidth > 0 ? (
              <DndGrid
                ref={gridApiRef}
                layout={layout}
                cols={BLOCK_COLUMNS}
                rowHeight={rowHeight}
                gap={margin}
                resizeHandles={["ne", "nw", "se", "sw"]}
                onDrop={handleDrop}
                onDropDragOver={handleDropDragOver}
                onLayoutChange={handleLayoutChange}
                onDragStart={handlers.handleDragStart}
                onDrag={handlers.handleDrag}
                onDragEnd={handlers.handleDragEnd}
                onResizeStart={handlers.handleResizeStart}
                onResize={handlers.handleResize}
                onResizeEnd={handlers.handleResizeEnd}
                dragCancel=".kitchen-sink-action"
              >
                {items.map((item) => (
                  <BlocksGridItem
                    key={item.id}
                    item={item}
                    isSelected={selectedId === item.id}
                    isHovered={hoveredId === item.id}
                    onHover={() => handlers.handleHover(item.id)}
                    onHoverEnd={() => handlers.handleHover(null)}
                    onSelect={() => handleItemClick(item.id)}
                    onEdit={() => handleEditItem(item.id)}
                    onDuplicate={() => handleDuplicate(item.id)}
                    onDelete={() => handleDelete(item.id)}
                  />
                ))}
              </DndGrid>
            ) : (
              <Skeleton
                className="w-full"
                style={{ height: DEFAULT_GRID_HEIGHT }}
              />
            )}
          </div>

          <div className="hidden lg:flex lg:flex-col">
            <BlocksGridPanel {...panelProps} className="flex-1" />
          </div>
        </div>

        {!isDesktop && (
          <div className="sticky inset-x-0 bottom-4 z-40 px-4 pb-[max(8px,env(safe-area-inset-bottom))]">
            <div className="mx-auto w-full">
              <Button
                type="button"
                size="lg"
                className="w-full justify-center"
                onClick={handleOpenAdd}
              >
                <Plus className="size-4" />
                Add block
              </Button>
            </div>
          </div>
        )}

        <MobilePaletteSheet
          open={!isDesktop && isPaletteOpen}
          onClose={handleClosePalette}
        >
          <div className="mx-auto w-full">
            <div className="px-4 mb-2 flex justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shadow-xs bg-card!"
                onClick={handleClosePalette}
              >
                Done
              </Button>
            </div>
            <BlocksGridPanel
              {...panelProps}
              className="max-h-[calc(100vh-200px)] overflow-y-auto pb-[330px]"
              isPalette
            />
          </div>
        </MobilePaletteSheet>
      </div>

      <DragOverlay dropAnimation={null}>
        {activePaletteItem && dragOverlayStyle ? (
          <PaletteDragSwingOverlay
            item={activePaletteItem}
            style={dragOverlayStyle}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};
