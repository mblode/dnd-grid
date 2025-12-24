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
  handleDragStop: (event: GridDragEvent) => void;
  handleResizeStart: (event: GridResizeEvent) => void;
  handleResize: (event: GridResizeEvent) => void;
  handleResizeStop: (event: GridResizeEvent) => void;
  handleSelect: (id: string) => void;
  handleHover: (id: string | null) => void;
  setHoveredId: (id: string | null) => void;
  setSelectedId: (id: string | null) => void;
}

interface UseGridInteractionsOptions {
  onDragStart?: (id: string) => void;
  onDragStop?: (id: string) => void;
  onResizeStart?: (id: string) => void;
  onResizeStop?: (id: string) => void;
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
      const id = item?.i ?? null;
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

  const handleDragStop = useCallback(
    (event: GridDragEvent) => {
      const item = event.item ?? event.previousItem;
      setDragId(null);
      if (item?.i) {
        options.onDragStop?.(item.i);
      }
    },
    [options],
  );

  const handleResizeStart = useCallback(
    (event: GridResizeEvent) => {
      const item = event.item ?? event.previousItem;
      const id = item?.i ?? null;
      setHoveredId(id);
      setSelectedId(id);
      if (item) {
        setResizeState({ id: item.i, w: item.w, h: item.h });
        options.onResizeStart?.(item.i);
      }
    },
    [options],
  );

  const handleResize = useCallback((event: GridResizeEvent) => {
    const item = event.item ?? event.previousItem;
    if (item) {
      setResizeState({ id: item.i, w: item.w, h: item.h });
    }
  }, []);

  const handleResizeStop = useCallback(
    (event: GridResizeEvent) => {
      const item = event.item ?? event.previousItem;
      setResizeState(null);
      if (item?.i) {
        options.onResizeStop?.(item.i);
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
    handleDragStop:
      handleDragStop as GridInteractionsHandlers["handleDragStop"],
    handleResizeStart:
      handleResizeStart as GridInteractionsHandlers["handleResizeStart"],
    handleResize: handleResize as GridInteractionsHandlers["handleResize"],
    handleResizeStop:
      handleResizeStop as GridInteractionsHandlers["handleResizeStop"],
    handleSelect,
    handleHover,
    setHoveredId,
    setSelectedId,
  };
}
