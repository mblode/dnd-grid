import type { Layout, LayoutItem } from "@dnd-grid/react";
import { useCallback, useState } from "react";

export interface ResizeState {
  id: string;
  w: number;
  h: number;
}

export interface GridInteractionsHandlers {
  handleDragStart: (
    layout: Layout,
    oldItem: LayoutItem | null | undefined,
    newItem: LayoutItem | null | undefined,
    placeholder: LayoutItem | null | undefined,
    event: Event,
    node: HTMLElement | null | undefined,
  ) => void;
  handleDrag: (
    layout: Layout,
    oldItem: LayoutItem | null | undefined,
    newItem: LayoutItem | null | undefined,
    placeholder: LayoutItem | null | undefined,
    event: Event,
    node: HTMLElement | null | undefined,
  ) => void;
  handleDragStop: (
    layout: Layout,
    oldItem: LayoutItem | null | undefined,
    newItem: LayoutItem | null | undefined,
    placeholder: LayoutItem | null | undefined,
    event: Event,
    node: HTMLElement | null | undefined,
  ) => void;
  handleResizeStart: (
    layout: Layout,
    oldItem: LayoutItem | null | undefined,
    newItem: LayoutItem | null | undefined,
    placeholder: LayoutItem | null | undefined,
    event: Event,
    node: HTMLElement | null | undefined,
  ) => void;
  handleResize: (
    layout: Layout,
    oldItem: LayoutItem | null | undefined,
    newItem: LayoutItem | null | undefined,
    placeholder: LayoutItem | null | undefined,
    event: Event,
    node: HTMLElement | null | undefined,
  ) => void;
  handleResizeStop: (
    layout: Layout,
    oldItem: LayoutItem | null | undefined,
    newItem: LayoutItem | null | undefined,
    placeholder: LayoutItem | null | undefined,
    event: Event,
    node: HTMLElement | null | undefined,
  ) => void;
  handleSelect: (id: string) => void;
  handleHover: (id: string | null) => void;
  setHoveredId: (id: string | null) => void;
  setSelectedId: (id: string | null) => void;
}

export interface UseGridInteractionsOptions {
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
    (_layout: Layout, oldItem: LayoutItem | null | undefined) => {
      const id = oldItem?.i ?? null;
      setHoveredId(id);
      setDragId(id);
      if (id) {
        options.onDragStart?.(id);
      }
    },
    [options],
  );

  const handleDrag = useCallback(
    (
      _layout: Layout,
      _oldItem: LayoutItem | null | undefined,
      _newItem: LayoutItem | null | undefined,
    ) => {
      // Can be extended for edge scroll or other drag-time behaviors
    },
    [],
  );

  const handleDragStop = useCallback(
    (
      _layout: Layout,
      _oldItem: LayoutItem | null | undefined,
      newItem: LayoutItem | null | undefined,
    ) => {
      setDragId(null);
      if (newItem?.i) {
        options.onDragStop?.(newItem.i);
      }
    },
    [options],
  );

  const handleResizeStart = useCallback(
    (
      _layout: Layout,
      _oldItem: LayoutItem | null | undefined,
      newItem: LayoutItem | null | undefined,
    ) => {
      const id = newItem?.i ?? null;
      setHoveredId(id);
      setSelectedId(id);
      if (newItem) {
        setResizeState({ id: newItem.i, w: newItem.w, h: newItem.h });
        options.onResizeStart?.(newItem.i);
      }
    },
    [options],
  );

  const handleResize = useCallback(
    (
      _layout: Layout,
      _oldItem: LayoutItem | null | undefined,
      newItem: LayoutItem | null | undefined,
    ) => {
      if (newItem) {
        setResizeState({ id: newItem.i, w: newItem.w, h: newItem.h });
      }
    },
    [],
  );

  const handleResizeStop = useCallback(
    (
      _layout: Layout,
      _oldItem: LayoutItem | null | undefined,
      newItem: LayoutItem | null | undefined,
    ) => {
      setResizeState(null);
      if (newItem?.i) {
        options.onResizeStop?.(newItem.i);
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
