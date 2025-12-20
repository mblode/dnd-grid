"use client";

import { useCallback, useMemo, useState, type CSSProperties } from "react";
import { useResizeDetector } from "react-resize-detector";
import { DndGrid, type Layout, type LayoutItem } from "@dnd-grid/react";
import { BlockItem } from "./block-item";
import { ResizeHandle } from "./resize-handle";

// Constants matching the fingertip design
export const BLOCK_GAP = 16;
export const BLOCK_HEIGHT = 24;
export const BLOCK_COLUMNS = 4;
export const DEFAULT_WIDTH = 480;
export const MAX_WIDTH = 643;
export const DRAG_TOUCH_DELAY_DURATION = 250;

export type BlockType = "link" | "text" | "image" | "social";

export interface BlockData {
  id: string;
  type: BlockType;
  content?: Record<string, unknown>;
}

export interface BlockLayout extends LayoutItem {
  blockType: BlockType;
}

interface Props {
  initialLayout?: BlockLayout[];
  initialBlocks?: BlockData[];
}

export function BlocksGrid({
  initialLayout,
  initialBlocks,
}: Props) {
  const { width: containerWidth = DEFAULT_WIDTH, ref } = useResizeDetector();

  // Calculate scale factor based on container width
  const scaleFactor = useMemo(() => {
    return Math.min(containerWidth, MAX_WIDTH) / DEFAULT_WIDTH;
  }, [containerWidth]);

  // Default layout if none provided
  const defaultLayout: BlockLayout[] = [
    { i: "block-1", x: 0, y: 0, w: 2, h: 6, deg: 0, blockType: "link" },
    { i: "block-2", x: 2, y: 0, w: 2, h: 6, deg: 0, blockType: "text" },
    { i: "block-3", x: 0, y: 6, w: 2, h: 4, deg: 0, blockType: "image" },
    { i: "block-4", x: 2, y: 6, w: 2, h: 4, deg: 0, blockType: "social" },
  ];

  const defaultBlocks: BlockData[] = [
    { id: "block-1", type: "link", content: { label: "Visit Website", url: "#" } },
    { id: "block-2", type: "text", content: { text: "Welcome to dnd-grid!" } },
    { id: "block-3", type: "image", content: { src: "", alt: "Placeholder" } },
    { id: "block-4", type: "social", content: { links: ["twitter", "github"] } },
  ];

  const [layout, setLayout] = useState<BlockLayout[]>(initialLayout || defaultLayout);
  const [blocks, setBlocks] = useState<BlockData[]>(initialBlocks || defaultBlocks);
  const [hoveredBlockId, setHoveredBlockId] = useState<string | null>(null);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [dragBlockId, setDragBlockId] = useState<string | null>(null);
  const [resizeBlock, setResizeBlock] = useState<{ id: string; w: number; h: number } | null>(null);
  const [transition, setTransition] = useState(true);

  // Event handlers
  const handleLayoutChange = useCallback((newLayout: Layout) => {
    setLayout((prevLayout) =>
      newLayout.map((item) => {
        const existingItem = prevLayout.find((l) => l.i === item.i);
        return {
          ...item,
          blockType: existingItem?.blockType || "text",
        };
      }) as BlockLayout[]
    );
  }, []);

  const handleDragStart = useCallback(
    (
      _layout: Layout,
      oldItem: LayoutItem | null | undefined,
    ) => {
      setHoveredBlockId(oldItem?.i ?? null);
      setTransition(false);
      setDragBlockId(oldItem?.i ?? null);
    },
    []
  );

  const handleDrag = useCallback(
    (
      _layout: Layout,
      _oldItem: LayoutItem | null | undefined,
      _newItem: LayoutItem | null | undefined,
      _placeholder: LayoutItem | null | undefined,
      _e: Event,
    ) => {
      // Edge scroll could be implemented here
    },
    []
  );

  const handleDragStop = useCallback(
    (
      _layout: Layout,
      _oldItem: LayoutItem | null | undefined,
      _newItem: LayoutItem | null | undefined,
    ) => {
      setTransition(true);
      setDragBlockId(null);
    },
    []
  );

  const handleResizeStart = useCallback(
    (
      _layout: Layout,
      _oldItem: LayoutItem | null | undefined,
      newItem: LayoutItem | null | undefined,
    ) => {
      setHoveredBlockId(newItem?.i ?? null);
      setSelectedBlockId(newItem?.i ?? null);
      setTransition(false);
      if (newItem) {
        setResizeBlock({ id: newItem.i, w: newItem.w, h: newItem.h });
      }
    },
    []
  );

  const handleResize = useCallback(
    (
      _layout: Layout,
      _oldItem: LayoutItem | null | undefined,
      newItem: LayoutItem | null | undefined,
    ) => {
      if (newItem) {
        setResizeBlock({ id: newItem.i, w: newItem.w, h: newItem.h });
      }
    },
    []
  );

  const handleResizeStop = useCallback(
    (
      _layout: Layout,
      _oldItem: LayoutItem | null | undefined,
      _newItem: LayoutItem | null | undefined,
    ) => {
      setResizeBlock(null);
      setTransition(true);
    },
    []
  );

  const handleBlockSelect = useCallback((blockId: string) => {
    setSelectedBlockId(blockId);
  }, []);

  const handleBlockHover = useCallback((blockId: string | null) => {
    if (!resizeBlock && !dragBlockId) {
      setHoveredBlockId(blockId);
    }
  }, [resizeBlock, dragBlockId]);

  const handleBlockDelete = useCallback((blockId: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== blockId));
    setLayout((prev) => prev.filter((l) => l.i !== blockId));
    if (selectedBlockId === blockId) {
      setSelectedBlockId(null);
    }
    if (hoveredBlockId === blockId) {
      setHoveredBlockId(null);
    }
  }, [selectedBlockId, hoveredBlockId]);

  const handleBlockDuplicate = useCallback((blockId: string) => {
    const block = blocks.find((b) => b.id === blockId);
    const layoutItem = layout.find((l) => l.i === blockId);

    if (!block || !layoutItem) return;

    const newId = `block-${Date.now()}`;
    const newBlock: BlockData = {
      ...block,
      id: newId,
    };
    const newLayoutItem: BlockLayout = {
      ...layoutItem,
      i: newId,
      y: Number.POSITIVE_INFINITY, // Place at bottom
    };

    setBlocks((prev) => [...prev, newBlock]);
    setLayout((prev) => [...prev, newLayoutItem]);
  }, [blocks, layout]);

  // Render children
  const children = useMemo(() => {
    return layout.map((layoutItem) => {
      const block = blocks.find((b) => b.id === layoutItem.i);
      if (!block) return null;

      const isHovered = hoveredBlockId === layoutItem.i;
      const isSelected = selectedBlockId === layoutItem.i;
      const isResizing = resizeBlock?.id === layoutItem.i;

      return (
        <BlockItem
          key={layoutItem.i}
          id={layoutItem.i}
          block={block}
          w={isResizing ? resizeBlock.w : layoutItem.w}
          h={isResizing ? resizeBlock.h : layoutItem.h}
          scaleFactor={scaleFactor}
          isHovered={isHovered}
          isSelected={isSelected}
          transition={transition}
          onSelect={handleBlockSelect}
          onHover={handleBlockHover}
          onDelete={handleBlockDelete}
          onDuplicate={handleBlockDuplicate}
        />
      );
    });
  }, [
    layout,
    blocks,
    hoveredBlockId,
    selectedBlockId,
    resizeBlock,
    scaleFactor,
    transition,
    handleBlockSelect,
    handleBlockHover,
    handleBlockDelete,
    handleBlockDuplicate,
  ]);

  const margin = BLOCK_GAP * scaleFactor;

  return (
    <div
      className="blocks-grid-container"
      style={{
        "--scale-factor": scaleFactor,
      } as CSSProperties}
    >
      <DndGrid
        innerRef={ref}
        className={`blocks-grid ${dragBlockId || resizeBlock?.id ? "layout-transition" : ""}`}
        layout={layout}
        cols={BLOCK_COLUMNS}
        rowHeight={BLOCK_HEIGHT * scaleFactor}
        width={containerWidth}
        margin={[margin, margin, margin, margin]}
        onLayoutChange={handleLayoutChange}
        isDraggable
        isResizable
        onDrag={handleDrag}
        onDragStart={handleDragStart}
        onDragStop={handleDragStop}
        resizeHandles={["ne", "nw", "se", "sw"]}
        dragTouchDelayDuration={DRAG_TOUCH_DELAY_DURATION}
        resizeHandle={(handleAxis, ref) => <ResizeHandle ref={ref as any} handleAxis={handleAxis} />}
        onResizeStart={handleResizeStart}
        onResize={handleResize}
        onResizeStop={handleResizeStop}
        containerPadding={[0, 0, 110 * scaleFactor, 0]}
      >
        {children}
      </DndGrid>
    </div>
  );
}
