"use client";

import {
  DndGrid,
  type DndGrid as DndGridHandle,
  type Layout,
  type LayoutItem,
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
import { useCallback, useMemo, useRef, useState } from "react";

interface PaletteItem {
  id: string;
  title: string;
  w: number;
  h: number;
}

interface GridItem {
  id: string;
  title: string;
  w: number;
  h: number;
  x: number;
  y: number;
}

const paletteItems: PaletteItem[] = [
  { id: "text", title: "Text", w: 4, h: 4 },
  { id: "media", title: "Media", w: 4, h: 3 },
  { id: "cta", title: "CTA", w: 2, h: 2 },
  { id: "quote", title: "Quote", w: 3, h: 3 },
];

const initialItems: GridItem[] = [
  { id: "a", title: "Text", x: 0, y: 0, w: 4, h: 4 },
  { id: "b", title: "Media", x: 0, y: 4, w: 2, h: 3 },
  { id: "c", title: "CTA", x: 2, y: 4, w: 2, h: 2 },
  { id: "d", title: "Quote", x: 0, y: 7, w: 4, h: 3 },
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
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Grid space finding algorithm requires nested loops
}): { x: number; y: number } => {
  const grid = Array.from({ length: gridHeight }, () =>
    Array.from({ length: gridWidth }, () => false)
  );

  for (const item of layouts) {
    for (let x = item.x; x < item.x + item.w; x += 1) {
      for (let y = item.y; y < item.y + item.h; y += 1) {
        if (grid[y] && grid[y][x] !== undefined) {
          grid[y][x] = true;
        }
      }
    }
  }

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

  return { x: 0, y: Number.POSITIVE_INFINITY };
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
      gridWidth: 4,
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

interface PaletteDraggableProps {
  item: PaletteItem;
  isActive: boolean;
  onClick?: (item: PaletteItem) => void;
}

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
        if (isDragging) {
          return;
        }
        onClick?.(item);
      }}
      style={{
        border: `1px solid ${isActive || isDragging ? "#0f172a" : "#e5e7eb"}`,
        borderRadius: 8,
        padding: "8px 12px",
        textAlign: "left",
        fontSize: 12,
        cursor: "grab",
        background: "#fff",
        opacity: isDragging ? 0.4 : 1,
      }}
    >
      <div style={{ fontWeight: 600 }}>{item.title}</div>
    </button>
  );
};

export function KitchenSinkExample() {
  const [items, setItems] = useState<GridItem[]>(initialItems);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [activePaletteId, setActivePaletteId] = useState<string | null>(null);
  const gridApiRef = useRef<DndGridHandle | null>(null);
  const dragItemRef = useRef<PaletteItem | null>(null);
  const dragPointerOffsetRef = useRef<{ x: number; y: number } | null>(null);
  const isOverGridRef = useRef(false);
  const gridRef = useRef<HTMLDivElement | null>(null);
  const nextIdRef = useRef(1);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 10 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 10 },
    }),
    useSensor(KeyboardSensor)
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

  const activePaletteItem = useMemo(
    () => paletteItems.find((item) => item.id === activePaletteId) ?? null,
    [activePaletteId]
  );

  const selectItem = useCallback((id: string | null) => {
    setSelectedId(id);
    setHoveredId(id);
    setIsEditing(Boolean(id));
  }, []);

  const resetDndState = useCallback((clearDragItem = true) => {
    setActivePaletteId(null);
    if (clearDragItem) {
      dragItemRef.current = null;
    }
    dragPointerOffsetRef.current = null;
    isOverGridRef.current = false;
  }, []);

  const handleLayoutChange = (nextLayout: Layout) => {
    setItems((prev) =>
      prev.map((item) => {
        const next = nextLayout.find((layoutItem) => layoutItem.id === item.id);
        return next ? { ...item, ...next } : item;
      })
    );
  };

  const handleDelete = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
    if (selectedId === id) {
      selectItem(null);
    }
  };

  const handleDuplicate = (id: string) => {
    const source = items.find((item) => item.id === id);
    if (!source) {
      return;
    }
    const sm = getSm({ layouts: layout, selectedBlockId: id });
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
  };

  const handlePaletteClick = (item: PaletteItem) => {
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
        title: item.title,
        w: sm.w,
        h: sm.h,
        x: sm.x,
        y: sm.y,
      },
    ]);
    selectItem(nextId);
  };

  const handleDropDragOver = () => {
    const active = dragItemRef.current;
    return active ? { w: active.w, h: active.h } : undefined;
  };

  const handleDrop = (_layout: Layout, item?: LayoutItem | null) => {
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
      const layoutById = new Map(nextLayout.map((entry) => [entry.id, entry]));
      const nextItems = prev.map((entry) => {
        const next = layoutById.get(entry.id);
        return next ? { ...entry, ...next } : entry;
      });
      const dropLayout = layoutById.get(nextId);
      if (dropLayout) {
        nextItems.push({
          id: nextId,
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

  const handleDndDragStart = useCallback((event: DragStartEvent) => {
    const active = event.active.data.current?.palette as
      | PaletteItem
      | undefined;
    if (!active) {
      return;
    }
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

  const handleDndDragMove = useCallback((event: DragMoveEvent) => {
    const translated = event.active.rect.current.translated;
    if (!translated) {
      return;
    }

    const gridRect = gridRef.current?.getBoundingClientRect();
    if (!gridRect) {
      isOverGridRef.current = false;
      gridApiRef.current?.handleDndRect();
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
      gridApiRef.current?.handleDndRect();
      return;
    }

    gridApiRef.current?.handleDndRect(
      event.activatorEvent ?? new Event("dragover"),
      {
        top: pointerY,
        right: pointerX,
        bottom: pointerY,
        left: pointerX,
        width: 0,
        height: 0,
      }
    );
  }, []);

  const handleDndDragEnd = useCallback(
    (event: DragEndEvent) => {
      const shouldDrop = isOverGridRef.current;
      resetDndState(!shouldDrop);

      if (shouldDrop) {
        gridApiRef.current?.handleDndRect(
          event.activatorEvent ?? new Event("drop")
        );
        return;
      }

      gridApiRef.current?.handleDndRect();
    },
    [resetDndState]
  );

  const handleDndDragCancel = useCallback(() => {
    resetDndState();
    gridApiRef.current?.handleDndRect();
  }, [resetDndState]);

  const selectedItem = items.find((item) => item.id === selectedId) ?? null;
  const isAddPanel = !isEditing;
  const isEditPanel = isEditing;

  return (
    <DndContext
      onDragCancel={handleDndDragCancel}
      onDragEnd={handleDndDragEnd}
      onDragMove={handleDndDragMove}
      onDragStart={handleDndDragStart}
      sensors={sensors}
    >
      <div
        style={{
          display: "grid",
          gap: 16,
          gridTemplateColumns: "minmax(0, 1fr) 240px",
        }}
      >
        <div ref={gridRef}>
          <DndGrid
            cols={4}
            dragCancel=".kitchen-sink-action"
            layout={layout}
            onDrop={handleDrop}
            onDropDragOver={handleDropDragOver}
            onLayoutChange={handleLayoutChange}
            ref={gridApiRef}
            resizeHandles={["ne", "nw", "se", "sw"]}
            rowHeight={40}
          >
            {items.map((item) => {
              const isSelected = selectedId === item.id;
              const isHovered = hoveredId === item.id;

              return (
                <div
                  key={item.id}
                  style={{
                    height: "100%",
                    position: "relative",
                    zIndex: isHovered ? 120 : "auto",
                  }}
                >
                  <button
                    onClick={() => selectItem(item.id)}
                    onFocus={() => setHoveredId(item.id)}
                    onMouseDown={() => selectItem(item.id)}
                    onMouseEnter={() => setHoveredId(item.id)}
                    style={{
                      appearance: "none",
                      width: "100%",
                      height: "100%",
                      textAlign: "left",
                      border: isSelected
                        ? "2px solid #0f9d78"
                        : "1px solid #e5e7eb",
                      borderRadius: 8,
                      padding: 10,
                      fontSize: 12,
                      background: "#fff",
                      boxShadow: isHovered
                        ? "0 6px 18px rgba(15, 23, 42, 0.08)"
                        : "none",
                      cursor: "grab",
                    }}
                    type="button"
                  >
                    <div style={{ fontWeight: 600 }}>{item.title}</div>
                  </button>
                  {isHovered && (
                    <div
                      className="kitchen-sink-action"
                      style={{
                        position: "absolute",
                        bottom: -34,
                        left: "50%",
                        transform: "translateX(-50%)",
                        display: "flex",
                        gap: 6,
                        border: "1px solid #e5e7eb",
                        borderRadius: 6,
                        padding: "4px 8px",
                        background: "#fff",
                        fontSize: 10,
                        zIndex: 130,
                      }}
                    >
                      <button onClick={() => selectItem(item.id)} type="button">
                        Edit
                      </button>
                      <button
                        onClick={() => handleDuplicate(item.id)}
                        type="button"
                      >
                        Duplicate
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        type="button"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </DndGrid>
        </div>

        <div
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 8,
            padding: 12,
            fontSize: 12,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 8,
              marginBottom: 8,
              alignItems: "center",
            }}
          >
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {isEditPanel && (
                <button
                  onClick={() => setIsEditing(false)}
                  style={{
                    borderRadius: 999,
                    padding: "4px 10px",
                    fontSize: 10,
                    border: "1px solid #e5e7eb",
                    background: "#fff",
                  }}
                  type="button"
                >
                  Back
                </button>
              )}
              <div style={{ fontWeight: 600 }}>
                {isEditPanel ? "Edit block" : "Add block"}
              </div>
            </div>
          </div>

          {isAddPanel ? (
            <div style={{ display: "grid", gap: 8 }}>
              {paletteItems.map((item) => (
                <PaletteDraggable
                  isActive={activePaletteId === item.id}
                  item={item}
                  key={item.id}
                  onClick={handlePaletteClick}
                />
              ))}
            </div>
          ) : (
            selectedItem && (
              <label
                htmlFor="kitchen-sink-title-input"
                style={{ display: "grid", gap: 4 }}
              >
                <div style={{ fontSize: 10, color: "#6b7280" }}>Title</div>
                <input
                  id="kitchen-sink-title-input"
                  onChange={(event) =>
                    setItems((prev) =>
                      prev.map((item) =>
                        item.id === selectedItem.id
                          ? { ...item, title: event.target.value }
                          : item
                      )
                    )
                  }
                  style={{
                    height: 40,
                    width: "100%",
                    borderRadius: 16,
                    border: "1px solid #e5e7eb",
                    background: "#fff",
                    padding: "0 12px",
                    fontSize: 14,
                    boxShadow: "0 1px 2px rgba(15, 23, 42, 0.08)",
                  }}
                  value={selectedItem.title}
                />
              </label>
            )
          )}
        </div>
      </div>

      <DragOverlay>
        {activePaletteItem ? (
          <div
            style={{
              border: "1px solid #0f172a",
              borderRadius: 8,
              padding: "8px 12px",
              textAlign: "left",
              fontSize: 12,
              cursor: "grabbing",
              background: "#fff",
              width: 200,
              boxShadow: "0 8px 24px rgba(15, 23, 42, 0.15)",
            }}
          >
            <div style={{ fontWeight: 600 }}>{activePaletteItem.title}</div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
