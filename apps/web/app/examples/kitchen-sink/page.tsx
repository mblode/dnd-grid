"use client";

import {
  DndGrid,
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
  MouseSensor,
  TouchSensor,
  useDraggable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { Copy, Pencil, Trash2 } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  BLOCK_COLUMNS,
  BLOCK_GAP,
  BLOCK_HEIGHT,
  DEFAULT_WIDTH,
  MAX_WIDTH,
} from "@/components/blocks-grid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useGridInteractions } from "@/hooks/use-grid-interactions";
import { cn } from "@/lib/utils";

const DEFAULT_GRID_ROWS = 12;
const DEFAULT_GRID_HEIGHT =
  DEFAULT_GRID_ROWS * BLOCK_HEIGHT +
  (DEFAULT_GRID_ROWS - 1) * BLOCK_GAP +
  BLOCK_GAP * 2;

type PaletteItem = {
  id: string;
  title: string;
  w: number;
  h: number;
};

type GridItem = {
  i: string;
  title: string;
  w: number;
  h: number;
  x: number;
  y: number;
};

type ActionButtonTone = "default" | "danger";

type ActionBarProps = {
  w: number;
  x: number;
  children: ReactNode;
};

type ActionButtonProps = {
  children: ReactNode;
  onClick?: () => void;
  tone?: ActionButtonTone;
};

type DndRect = {
  top: number;
  right: number;
  bottom: number;
  left: number;
  width: number;
  height: number;
};

const paletteItems: PaletteItem[] = [
  {
    id: "text",
    title: "Text",
    w: 4,
    h: 4,
  },
  {
    id: "media",
    title: "Media",
    w: 4,
    h: 3,
  },
  {
    id: "cta",
    title: "CTA",
    w: 2,
    h: 2,
  },
  {
    id: "quote",
    title: "Quote",
    w: 3,
    h: 3,
  },
];

const initialItems: GridItem[] = [
  {
    i: "a",
    title: "Text",
    x: 0,
    y: 0,
    w: 4,
    h: 4,
  },
  {
    i: "b",
    title: "Media",
    x: 0,
    y: 4,
    w: 2,
    h: 3,
  },
  {
    i: "c",
    title: "CTA",
    x: 2,
    y: 4,
    w: 2,
    h: 2,
  },
  {
    i: "d",
    title: "Quote",
    x: 0,
    y: 7,
    w: 4,
    h: 3,
  },
];

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
    ? layouts.find((item) => item.i === selectedBlockId)
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
    .filter((item) => item.i !== dropItem.i)
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

const ActionBar = ({ w, x, children }: ActionBarProps) => {
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: stops event propagation to grid
    <div
      className={cn(
        "kitchen-sink-action pointer-events-auto absolute bottom-0 pt-[var(--spacing-fluid-2)] translate-y-full left-1/2 z-[130]",
        {
          "left-0 translate-x-0": w <= 2 && x <= 0,
          "left-full -translate-x-full": w <= 2 && x >= 2,
          "left-1/2 -translate-x-1/2": (x > 0 && x < 2) || w > 2,
        },
      )}
      onMouseDown={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <div className="relative rounded-[24px] ring-1 ring-ring/60 bg-card px-1 py-1 text-foreground">
        <div className="flex items-center gap-1 text-[10px] font-medium">
          {children}
        </div>
        <div
          className={cn(
            "absolute z-10 size-3 border border-ring/60 bg-card top-0 rounded-tl-[3px] -translate-y-1/2 -translate-x-1/2 left-1/2 rotate-45",
            {
              "left-[22%]": w === 1 && x === 0,
              "left-[78%]": w === 1 && x >= 2,
            },
          )}
          style={{ clipPath: "polygon(0 0, 0% 100%, 100% 0)" }}
        />
      </div>
    </div>
  );
};

const ActionButton = ({
  children,
  onClick,
  tone = "default",
}: ActionButtonProps) => {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={onClick}
      className={cn(
        "h-7 rounded-full px-2 text-[10px]",
        tone === "danger" && "text-destructive",
      )}
    >
      {children}
    </Button>
  );
};

const paletteButtonClassName =
  "flex min-w-[160px] cursor-grab flex-col gap-1 rounded-[calc(var(--radius-widget)-8px)] border border-border bg-background px-3 py-2 text-left text-xs font-medium shadow-sm transition-shadow active:cursor-grabbing";

const PaletteCardContent = ({ item }: { item: PaletteItem }) => (
  <span className="text-sm font-medium text-foreground line-clamp-2">
    {item.title}
  </span>
);

type PaletteDraggableProps = {
  item: PaletteItem;
  isActive: boolean;
  onClick?: (item: PaletteItem) => void;
};

const PaletteDraggable = ({
  item,
  isActive,
  onClick,
}: PaletteDraggableProps) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: item.id,
    data: {
      palette: item,
    },
  });

  return (
    <button
      ref={setNodeRef}
      type="button"
      {...listeners}
      {...attributes}
      onClick={() => {
        if (isDragging) return;
        onClick?.(item);
      }}
      className={cn(
        paletteButtonClassName,
        "w-full",
        (isActive || isDragging) &&
          "border-ring text-foreground shadow-[var(--widget-shadow-hover)]",
        !isActive && !isDragging && "text-muted-foreground",
        isDragging && "opacity-40",
      )}
    >
      <PaletteCardContent item={item} />
    </button>
  );
};

export default function KitchenSinkExample() {
  const [items, setItems] = useState<GridItem[]>(initialItems);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [activePaletteId, setActivePaletteId] = useState<string | null>(null);
  const [dndRect, setDndRect] = useState<DndRect | null>(null);
  const [dndEvent, setDndEvent] = useState<Event | null>(null);
  const dragItemRef = useRef<PaletteItem | null>(null);
  const dragPointerOffsetRef = useRef<{ x: number; y: number } | null>(null);
  const nextIdRef = useRef(1);
  const isOverGridRef = useRef(false);
  const { width, containerRef, mounted } = useContainerWidth({
    measureBeforeMount: true,
    initialWidth: DEFAULT_WIDTH,
  });

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 10,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 10,
      },
    }),
    useSensor(KeyboardSensor),
  );

  const handlers = useGridInteractions({
    onHover: setHoveredId,
    onSelect: (id) => {
      setSelectedId(id);
      setHoveredId(id);
      setIsEditing(true);
    },
    onDragStart: setHoveredId,
    onResizeStart: (id) => {
      setHoveredId(id);
      setSelectedId(id);
      setIsEditing(true);
    },
  });

  const selectItem = useCallback(
    (id: string | null) => {
      setSelectedId(id);
      setHoveredId(id);
      setIsEditing(Boolean(id));
      handlers.setSelectedId(id);
      handlers.setHoveredId(id);
    },
    [handlers],
  );

  const clearSelection = useCallback(() => {
    selectItem(null);
    handlers.setHoveredId(null);
  }, [handlers, selectItem]);

  const resetDndState = useCallback((clearDragItem = true) => {
    setActivePaletteId(null);
    if (clearDragItem) {
      dragItemRef.current = null;
    }
    dragPointerOffsetRef.current = null;
    isOverGridRef.current = false;
  }, []);

  const handleDndDragStart = useCallback((event: DragStartEvent) => {
    const active = event.active.data.current?.palette as
      | PaletteItem
      | undefined;
    if (!active) return;
    dragItemRef.current = active;
    setActivePaletteId(active.id);
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
      setDndEvent(event.activatorEvent ?? null);
    },
    [containerRef],
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
    () => paletteItems.find((item) => item.id === activePaletteId) ?? null,
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
      items.map(({ i, x, y, w, h }) => ({
        i,
        x,
        y,
        w,
        h,
      })),
    [items],
  );

  const selectedItem = items.find((item) => item.i === selectedId) ?? null;

  const updateItem = useCallback((id: string, patch: Partial<GridItem>) => {
    setItems((prev) =>
      prev.map((item) => (item.i === id ? { ...item, ...patch } : item)),
    );
  }, []);

  const handleLayoutChange = useCallback((nextLayout: Layout) => {
    setItems((prev) =>
      prev.map((item) => {
        const next = nextLayout.find((layoutItem) => layoutItem.i === item.i);
        return next ? { ...item, ...next } : item;
      }),
    );
  }, []);

  const handleDelete = useCallback(
    (id: string) => {
      setItems((prev) => prev.filter((item) => item.i !== id));
      if (selectedId === id) {
        clearSelection();
      }
    },
    [clearSelection, selectedId],
  );

  const handleDuplicate = useCallback(
    (id: string) => {
      const source = items.find((item) => item.i === id);
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
          i: nextId,
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
          i: nextId,
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

  const handleDropDragOver = () => {
    const active = dragItemRef.current;
    return active ? { w: active.w, h: active.h } : undefined;
  };

  const handleDrop = (_layout: Layout, item?: LayoutItem | null) => {
    const active = dragItemRef.current;
    if (!active || !item) return;
    const nextId = `k${nextIdRef.current}`;
    nextIdRef.current += 1;
    setItems((prev) => {
      const prevLayout = prev.map(({ i, x, y, w, h }) => ({
        i,
        x,
        y,
        w,
        h,
      }));
      const dropItem: LayoutItem = {
        i: nextId,
        x: item.x,
        y: item.y,
        w: item.w,
        h: item.h,
      };
      const nextLayout = resolveDropLayout({
        layout: prevLayout,
        dropItem,
      });
      const layoutById = new Map(nextLayout.map((entry) => [entry.i, entry]));
      const nextItems = prev.map((entry) => {
        const next = layoutById.get(entry.i);
        return next ? { ...entry, ...next } : entry;
      });
      const dropLayout = layoutById.get(nextId);
      if (dropLayout) {
        nextItems.push({
          i: nextId,
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
  };

  const rowHeight = BLOCK_HEIGHT * scaleFactor;
  const margin = BLOCK_GAP * scaleFactor;
  const isAddPanel = !isEditing;
  const isEditPanel = isEditing;

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDndDragStart}
      onDragMove={handleDndDragMove}
      onDragEnd={handleDndDragEnd}
      onDragCancel={handleDndDragCancel}
    >
      <div
        className="grid gap-[var(--spacing-fluid-4)] lg:grid-cols-[minmax(0,1fr)_260px]"
        style={scaleStyle}
      >
        <div
          ref={containerRef}
          className="w-full"
          style={{ maxWidth: MAX_WIDTH }}
        >
          {mounted && measuredWidth > 0 ? (
            <DndGrid
              layout={layout}
              cols={BLOCK_COLUMNS}
              rowHeight={rowHeight}
              width={measuredWidth}
              margin={margin}
              resizeHandles={["ne", "nw", "se", "sw"]}
              isDroppable
              onDrop={handleDrop}
              onDropDragOver={handleDropDragOver}
              onLayoutChange={handleLayoutChange}
              onDragStart={handlers.handleDragStart}
              onDrag={handlers.handleDrag}
              onDragStop={handlers.handleDragStop}
              onResizeStart={handlers.handleResizeStart}
              onResize={handlers.handleResize}
              onResizeStop={handlers.handleResizeStop}
              draggableCancel=".kitchen-sink-action"
              dndRect={dndRect ?? undefined}
              dndEvent={dndEvent ?? undefined}
            >
              {items.map((item) => {
                const isSelected = selectedId === item.i;
                const isHovered = hoveredId === item.i;
                const showControls = isHovered;

                return (
                  <div
                    key={item.i}
                    className={cn(
                      "relative size-full overflow-visible",
                      isHovered && "z-[120]",
                    )}
                  >
                    <button
                      type="button"
                      className="group relative size-full cursor-move text-left outline-none"
                      onPointerEnter={(event) => {
                        event.stopPropagation();
                        handlers.handleHover(item.i);
                      }}
                      onClick={() => handlers.handleSelect(item.i)}
                    >
                      <div
                        className={cn(
                          "relative size-full rounded-[calc(var(--dnd-grid-radius)*var(--dnd-grid-scale))] px-[var(--spacing-fluid-4)] py-[var(--spacing-fluid-3)] text-[13px] transition-shadow",
                          isSelected &&
                            "outline outline-2 outline-ring shadow-[var(--widget-shadow-hover)]",
                          isHovered &&
                            !isSelected &&
                            "ring-1 ring-ring/40 shadow-[var(--widget-shadow-hover)]",
                        )}
                      >
                        <div className="text-sm font-semibold text-foreground line-clamp-2">
                          {item.title}
                        </div>

                        {!showControls && (
                          <div className="absolute right-[var(--spacing-fluid-2)] top-[var(--spacing-fluid-2)] z-10 flex size-6 items-center justify-center rounded-full bg-background/80 text-[10px] text-muted-foreground shadow-sm">
                            <Pencil className="size-3" />
                          </div>
                        )}
                      </div>
                    </button>

                    {showControls && (
                      <ActionBar w={item.w} x={item.x}>
                        <ActionButton
                          onClick={() => handlers.handleSelect(item.i)}
                        >
                          <Pencil className="size-3" />
                          Edit
                        </ActionButton>
                        <ActionButton onClick={() => handleDuplicate(item.i)}>
                          <Copy className="size-3" />
                          Duplicate
                        </ActionButton>
                        <ActionButton
                          tone="danger"
                          onClick={() => handleDelete(item.i)}
                        >
                          <Trash2 className="size-3" />
                          Delete
                        </ActionButton>
                      </ActionBar>
                    )}
                  </div>
                );
              })}
            </DndGrid>
          ) : (
            <Skeleton
              className="w-full"
              style={{ height: DEFAULT_GRID_HEIGHT }}
            />
          )}
        </div>

        <div className="rounded-[var(--radius-widget)] border border-[color:var(--widget-border)] p-[var(--spacing-fluid-4)] text-xs">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {isEditPanel && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 rounded-full px-2 text-[10px]"
                  onClick={() => setIsEditing(false)}
                >
                  Back
                </Button>
              )}
              <div className="text-sm font-medium">
                {isEditPanel ? "Edit block" : "Add block"}
              </div>
            </div>
          </div>

          {isAddPanel ? (
            <div className="flex flex-col gap-[var(--spacing-fluid-2)]">
              {paletteItems.map((item) => (
                <PaletteDraggable
                  key={item.id}
                  item={item}
                  isActive={activePaletteId === item.id}
                  onClick={handlePaletteClick}
                />
              ))}
            </div>
          ) : (
            selectedItem && (
              <div className="space-y-[var(--spacing-fluid-3)]">
                <div className="space-y-1">
                  <div className="text-[11px] text-muted-foreground">Title</div>
                  <Input
                    value={selectedItem.title}
                    className="h-10 w-full rounded-[16px] border border-input bg-card px-3 text-sm shadow-sm"
                    onChange={(event) =>
                      updateItem(selectedItem.i, {
                        title: event.target.value,
                      })
                    }
                  />
                </div>
              </div>
            )
          )}
        </div>
      </div>

      <DragOverlay>
        {activePaletteItem ? (
          <div
            className={cn(
              paletteButtonClassName,
              "w-[200px] cursor-grabbing border-ring text-foreground shadow-[var(--widget-shadow-hover)]",
            )}
          >
            <PaletteCardContent item={activePaletteItem} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
