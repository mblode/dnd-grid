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
  type DragCancelEvent,
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
import {
  BLOCK_COLUMNS,
  BLOCK_GAP,
  BLOCK_HEIGHT,
  DEFAULT_WIDTH,
  MAX_WIDTH,
} from "@/components/blocks-grid/constants";
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
import { getPointerEvent, getPointerPosition } from "@/lib/dnd/pointer-tracker";
import {
  TrackedMouseSensor,
  TrackedTouchSensor,
} from "@/lib/dnd/tracked-sensors";

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

interface DndRect {
  top: number;
  right: number;
  bottom: number;
  left: number;
  width: number;
  height: number;
}

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
    Array.from({ length: gridWidth }, () => false)
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
    y: Number.POSITIVE_INFINITY,
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
  const resolved: LayoutItem[] = [{ ...dropItem }];
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

      for (const placedItem of resolved) {
        if (collides(candidate, placedItem)) {
          nextY = Math.max(nextY, placedItem.y + placedItem.h);
          needsPlacement = true;
        }
      }

      if (needsPlacement) {
        candidate = { ...candidate, y: nextY };
      }
    }

    resolved.push(candidate);
  }

  return resolved;
};

const resolveTranslatedRect = (event: DragMoveEvent): DndRect | null => {
  const translated = event.active.rect.current.translated;
  if (translated) {
    return translated;
  }
  const initial = event.active.rect.current.initial;
  if (!initial) {
    return null;
  }
  return {
    ...initial,
    left: initial.left + event.delta.x,
    right: initial.right + event.delta.x,
    top: initial.top + event.delta.y,
    bottom: initial.bottom + event.delta.y,
  };
};

const getPointerCoordinates = (event?: Event | null) => {
  if (!event) {
    return null;
  }
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

const resolvePointerFromDrag = ({
  event,
  translated,
  dragStartPointer,
}: {
  event: DragMoveEvent;
  translated: DndRect | null;
  dragStartPointer: { x: number; y: number } | null;
}): { x: number; y: number } | null => {
  const trackedPointer = getPointerPosition();

  if (trackedPointer) {
    return trackedPointer;
  }

  if (dragStartPointer) {
    return {
      x: dragStartPointer.x + event.delta.x,
      y: dragStartPointer.y + event.delta.y,
    };
  }

  if (translated) {
    return {
      x: translated.left + translated.width / 2,
      y: translated.top + translated.height / 2,
    };
  }

  return null;
};

export const BlocksGrid = () => {
  const [items, setItems] = useState<GridItem[]>(initialItems);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [activePaletteId, setActivePaletteId] = useState<BlockKind | null>(
    null
  );
  const isDesktop = useMediaQuery(DESKTOP_MEDIA_QUERY);
  const canHover = useMediaQuery("(any-hover: hover)");
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const gridApiRef = useRef<DndGridHandle | null>(null);
  const dragItemRef = useRef<PaletteItem | null>(null);
  const dragStartPointerRef = useRef<{ x: number; y: number } | null>(null);
  const lastPointerRef = useRef<{ x: number; y: number } | null>(null);
  const lastPointerEventRef = useRef<Event | null>(null);
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
    useSensor(KeyboardSensor)
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
    [handlers]
  );

  const handleSelectItem = useCallback(
    (id: string) => {
      selectItem(id);
      setIsEditing(false);
    },
    [selectItem]
  );

  const handleEditItem = useCallback(
    (id: string) => {
      selectItem(id);
      setIsEditing(true);
      openPalette();
    },
    [openPalette, selectItem]
  );

  const handleItemClick = useCallback(
    (id: string) => {
      if (isDesktop) {
        handleEditItem(id);
        return;
      }
      handleSelectItem(id);
    },
    [handleEditItem, handleSelectItem, isDesktop]
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
    dragStartPointerRef.current = null;
    lastPointerRef.current = null;
    lastPointerEventRef.current = null;
    isOverGridRef.current = false;
  }, []);

  const handleDndDragStart = useCallback((event: DragStartEvent) => {
    const active = event.active.data.current?.palette as
      | PaletteItem
      | undefined;
    if (!active) {
      return;
    }
    dragItemRef.current = active;
    setActivePaletteId(active.kind);
    dragStartPointerRef.current = getPointerCoordinates(
      event.activatorEvent ?? null
    );
    lastPointerRef.current = dragStartPointerRef.current;
    lastPointerEventRef.current = event.activatorEvent ?? null;
  }, []);

  const handleDndDragMove = useCallback(
    (event: DragMoveEvent) => {
      const translated = resolveTranslatedRect(event);
      const activatorEvent = event.activatorEvent ?? undefined;
      const pointerEvent = getPointerEvent() ?? activatorEvent;

      if (!isDesktop && isPaletteOpen) {
        setIsPaletteOpen(false);
      }

      const gridRect = containerRef.current?.getBoundingClientRect();
      if (!gridRect) {
        isOverGridRef.current = false;
        return;
      }

      const dragStartPointer = dragStartPointerRef.current;
      const pointer = resolvePointerFromDrag({
        event,
        translated,
        dragStartPointer,
      });
      if (!pointer) {
        return;
      }
      const { x: pointerX, y: pointerY } = pointer;
      lastPointerRef.current = { x: pointerX, y: pointerY };
      if (pointerEvent) {
        lastPointerEventRef.current = pointerEvent;
      }

      const pointerInside =
        pointerX >= gridRect.left &&
        pointerX <= gridRect.right &&
        pointerY >= gridRect.top &&
        pointerY <= gridRect.bottom;
      const overlayIntersects =
        !!translated &&
        translated.right > gridRect.left &&
        translated.left < gridRect.right &&
        translated.bottom > gridRect.top &&
        translated.top < gridRect.bottom;
      const isOverGrid = pointerInside || overlayIntersects;

      const wasOverGrid = isOverGridRef.current;
      isOverGridRef.current = isOverGrid;

      if (!isOverGrid) {
        if (wasOverGrid) {
          gridApiRef.current?.handleExternalDrag({
            clientX: pointerX,
            clientY: pointerY,
            event: pointerEvent,
            type: "cancel",
          });
        }
        return;
      }

      gridApiRef.current?.handleExternalDrag({
        clientX: pointerX,
        clientY: pointerY,
        event: pointerEvent,
      });
    },
    [containerRef, isDesktop, isPaletteOpen]
  );

  const handleDndDragEnd = useCallback(
    (event: DragEndEvent) => {
      const shouldDrop = isOverGridRef.current;
      const activatorEvent = event.activatorEvent ?? undefined;
      const pointerEvent =
        lastPointerEventRef.current ?? getPointerEvent() ?? activatorEvent;
      resetDndState(!shouldDrop);

      const lastPointer = lastPointerRef.current;
      const dropPointer = lastPointer ?? dragStartPointerRef.current;

      if (shouldDrop) {
        gridApiRef.current?.handleExternalDrag({
          clientX: dropPointer?.x ?? 0,
          clientY: dropPointer?.y ?? 0,
          event: pointerEvent,
          type: "drop",
        });
        return;
      }

      if (dropPointer) {
        gridApiRef.current?.handleExternalDrag({
          clientX: dropPointer.x,
          clientY: dropPointer.y,
          event: pointerEvent,
          type: "cancel",
        });
      }
    },
    [resetDndState]
  );

  const handleDndDragCancel = useCallback(
    (event: DragCancelEvent) => {
      resetDndState();
      const lastPointer = lastPointerRef.current ?? dragStartPointerRef.current;
      if (lastPointer) {
        gridApiRef.current?.handleExternalDrag({
          clientX: lastPointer.x,
          clientY: lastPointer.y,
          event:
            lastPointerEventRef.current ??
            getPointerEvent() ??
            event.activatorEvent ??
            undefined,
          type: "cancel",
        });
      }
    },
    [resetDndState]
  );

  const activePaletteItem = useMemo(
    () => paletteItems.find((item) => item.kind === activePaletteId) ?? null,
    [activePaletteId]
  );

  const measuredWidth = width > 0 ? width : DEFAULT_WIDTH;
  const gridWidth = Math.min(measuredWidth, MAX_WIDTH);
  const scaleFactor = gridWidth / DEFAULT_WIDTH;
  const scaleValue = scaleFactor.toFixed(3);
  const scaleStyle = useMemo(
    () =>
      ({
        "--dnd-grid-scale": scaleValue,
        "--blocks-grid-max": `${MAX_WIDTH}px`,
      }) as CSSProperties,
    [scaleValue]
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
    [items]
  );

  const selectedItem = items.find((item) => item.id === selectedId) ?? null;

  const updateItem = useCallback((id: string, patch: Partial<GridItem>) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item))
    );
  }, []);

  const handleLayoutChange = useCallback((nextLayout: Layout) => {
    const layoutById = new Map(
      nextLayout.map((layoutItem) => [layoutItem.id, layoutItem])
    );
    setItems((prev) =>
      prev.map((item) => {
        const next = layoutById.get(item.id);
        return next
          ? { ...item, x: next.x, y: next.y, w: next.w, h: next.h }
          : item;
      })
    );
  }, []);

  const handleDelete = useCallback(
    (id: string) => {
      setItems((prev) => prev.filter((item) => item.id !== id));
      if (selectedId === id) {
        clearSelection();
      }
    },
    [clearSelection, selectedId]
  );

  const handleDuplicate = useCallback(
    (id: string) => {
      const source = items.find((item) => item.id === id);
      if (!source) {
        return;
      }
      const sm = getSm({
        layouts: layout,
        selectedBlockId: id,
      });
      if (!sm) {
        return;
      }
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
    [items, layout, selectItem]
  );

  const handlePaletteClick = useCallback(
    (item: PaletteItem) => {
      const sm = getSm({
        layouts: layout,
        currentBlock: { w: item.w, h: item.h },
      });
      if (!sm) {
        return;
      }
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
      if (!isDesktop) {
        setIsPaletteOpen(false);
      }
    },
    [isDesktop, layout, selectItem]
  );

  const handleDropDragOver = useCallback(() => {
    const active = dragItemRef.current;
    return active ? { w: active.w, h: active.h } : undefined;
  }, []);

  const handleDrop = useCallback(
    (_layout: Layout, item?: LayoutItem | null) => {
      const active = dragItemRef.current;
      if (!(active && item)) {
        return;
      }
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
          nextLayout.map((entry) => [entry.id, entry])
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
            name: active.name,
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
    [selectItem]
  );

  const rowHeight = BLOCK_HEIGHT * scaleFactor;
  const margin = BLOCK_GAP * scaleFactor;
  const columnWidth = useMemo(() => {
    const available = Math.max(gridWidth - margin * (BLOCK_COLUMNS - 1), 0);
    return available / BLOCK_COLUMNS;
  }, [gridWidth, margin]);
  const dragOverlayStyle = useMemo(() => {
    if (!activePaletteItem) {
      return null;
    }
    const width =
      columnWidth * activePaletteItem.w + margin * (activePaletteItem.w - 1);
    const height =
      rowHeight * activePaletteItem.h + margin * (activePaletteItem.h - 1);
    return {
      width,
      height,
      "--dnd-grid-scale": scaleValue,
    } as CSSProperties;
  }, [activePaletteItem, columnWidth, margin, rowHeight, scaleValue]);

  const panelProps = {
    isEditing,
    selectedItem,
    onBack: () => setIsEditing(false),
    onPaletteClick: handlePaletteClick,
    onTitleChange: (id: string, nextTitle: string) =>
      updateItem(id, { title: nextTitle }),
  };

  return (
    <DndContext
      onDragCancel={handleDndDragCancel}
      onDragEnd={handleDndDragEnd}
      onDragMove={handleDndDragMove}
      onDragStart={handleDndDragStart}
      sensors={sensors}
    >
      <div className="relative" style={scaleStyle}>
        <div className="grid gap-fluid-4 pb-12 lg:grid-cols-[minmax(0,var(--blocks-grid-max))_260px] lg:justify-center lg:pb-0">
          <div
            className="mx-auto w-full"
            ref={containerRef}
            style={{ maxWidth: MAX_WIDTH }}
          >
            {mounted && measuredWidth > 0 ? (
              <DndGrid
                cols={BLOCK_COLUMNS}
                dragCancel=".kitchen-sink-action"
                gap={margin}
                layout={layout}
                onDrag={handlers.handleDrag}
                onDragEnd={handlers.handleDragEnd}
                onDragStart={handlers.handleDragStart}
                onDrop={handleDrop}
                onDropDragOver={handleDropDragOver}
                onLayoutChange={handleLayoutChange}
                onResize={handlers.handleResize}
                onResizeEnd={handlers.handleResizeEnd}
                onResizeStart={handlers.handleResizeStart}
                ref={gridApiRef}
                resizeHandles={["ne", "nw", "se", "sw"]}
                rowHeight={rowHeight}
              >
                {items.map((item) => (
                  <BlocksGridItem
                    canHover={canHover}
                    isHovered={hoveredId === item.id}
                    isSelected={selectedId === item.id}
                    item={item}
                    key={item.id}
                    onDelete={() => handleDelete(item.id)}
                    onDuplicate={() => handleDuplicate(item.id)}
                    onEdit={() => handleEditItem(item.id)}
                    onHover={() => handlers.handleHover(item.id)}
                    onHoverEnd={() => handlers.handleHover(null)}
                    onSelect={() => handleItemClick(item.id)}
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

        <div className="px-4 lg:hidden">
          <div className="mx-auto w-full">
            <Button
              className="w-full justify-center"
              onClick={handleOpenAdd}
              size="lg"
              type="button"
            >
              <Plus className="size-4" />
              Add block
            </Button>
          </div>
        </div>

        <MobilePaletteSheet
          onClose={handleClosePalette}
          open={!isDesktop && isPaletteOpen}
        >
          <div className="mx-auto w-full">
            <div className="mb-2 flex justify-end px-4">
              <Button
                className="bg-card! shadow-xs"
                onClick={handleClosePalette}
                size="sm"
                type="button"
                variant="outline"
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
