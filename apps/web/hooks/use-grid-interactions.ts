import type { GridDragEvent, GridResizeEvent } from "@dnd-grid/react";
import { useCallback, useState } from "react";

interface ResizeState {
  id: string;
  w: number;
  h: number;
}

interface GridInteractionsHandlers {
  handleDragStart: (event: GridDragEvent) => void;
  handleDrag: (event: GridDragEvent) => void;
  handleDragEnd: (event: GridDragEvent) => void;
  handleResizeStart: (event: GridResizeEvent) => void;
  handleResize: (event: GridResizeEvent) => void;
  handleResizeEnd: (event: GridResizeEvent) => void;
  handleSelect: (id: string) => void;
  handleHover: (id: string | null) => void;
  setHoveredId: (id: string | null) => void;
  setSelectedId: (id: string | null) => void;
}

interface UseGridInteractionsOptions {
  onDragStart?: (id: string) => void;
  onDragEnd?: (id: string) => void;
  onResizeStart?: (id: string) => void;
  onResizeEnd?: (id: string) => void;
  onSelect?: (id: string) => void;
  onHover?: (id: string | null) => void;
}

export function useGridInteractions(
  options: UseGridInteractionsOptions = {},
): GridInteractionsHandlers {
  const [_hoveredId, setHoveredId] = useState<string | null>(null);
  const [_selectedId, setSelectedId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [resizeState, setResizeState] = useState<ResizeState | null>(null);

  const handleDragStart = useCallback(
    (event: GridDragEvent) => {
      const item = event.item ?? event.previousItem;
      const id = item?.id ?? null;
      setHoveredId(id);
      setDragId(id);
      if (id) {
        options.onDragStart?.(id);
      }
    },
    [options],
  );

  const handleDrag = useCallback((_event: GridDragEvent) => {
    // Can be extended for edge scroll or other drag-time behaviors
  }, []);

  const handleDragEnd = useCallback(
    (event: GridDragEvent) => {
      const item = event.item ?? event.previousItem;
      setDragId(null);
      if (item?.id) {
        options.onDragEnd?.(item.id);
      }
    },
    [options],
  );

  const handleResizeStart = useCallback(
    (event: GridResizeEvent) => {
      const item = event.item ?? event.previousItem;
      const id = item?.id ?? null;
      setHoveredId(id);
      setSelectedId(id);
      if (item) {
        setResizeState({ id: item.id, w: item.w, h: item.h });
        options.onResizeStart?.(item.id);
      }
    },
    [options],
  );

  const handleResize = useCallback((event: GridResizeEvent) => {
    const item = event.item ?? event.previousItem;
    if (item) {
      setResizeState({ id: item.id, w: item.w, h: item.h });
    }
  }, []);

  const handleResizeEnd = useCallback(
    (event: GridResizeEvent) => {
      const item = event.item ?? event.previousItem;
      setResizeState(null);
      if (item?.id) {
        options.onResizeEnd?.(item.id);
      }
    },
    [options],
  );

  const handleSelect = useCallback(
    (id: string) => {
      setSelectedId(id);
      options.onSelect?.(id);
    },
    [options],
  );

  const handleHover = useCallback(
    (id: string | null) => {
      // Don't update hover during drag or resize operations
      if (!resizeState && !dragId) {
        setHoveredId(id);
        options.onHover?.(id);
      }
    },
    [resizeState, dragId, options],
  );

  return {
    handleDragStart:
      handleDragStart as GridInteractionsHandlers["handleDragStart"],
    handleDrag: handleDrag as GridInteractionsHandlers["handleDrag"],
    handleDragEnd: handleDragEnd as GridInteractionsHandlers["handleDragEnd"],
    handleResizeStart:
      handleResizeStart as GridInteractionsHandlers["handleResizeStart"],
    handleResize: handleResize as GridInteractionsHandlers["handleResize"],
    handleResizeEnd:
      handleResizeEnd as GridInteractionsHandlers["handleResizeEnd"],
    handleSelect,
    handleHover,
    setHoveredId,
    setSelectedId,
  };
}
