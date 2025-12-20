"use client";

import { forwardRef, type CSSProperties, type MouseEvent, type PointerEvent } from "react";
import clsx from "clsx";
import type { BlockData } from "./blocks-grid";
import { BlockWrapper } from "./block-wrapper";
import { BlockActionBar } from "./block-action-bar";
import { LinkBlock } from "./blocks/link-block";
import { TextBlock } from "./blocks/text-block";
import { ImageBlock } from "./blocks/image-block";
import { SocialBlock } from "./blocks/social-block";

interface Props {
  id: string;
  block: BlockData;
  w: number;
  h: number;
  scaleFactor: number;
  isHovered: boolean;
  isSelected: boolean;
  transition: boolean;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  className?: string;
  style?: CSSProperties;
}

export const BlockItem = forwardRef<HTMLDivElement, Props>(function BlockItem(
  {
    id,
    block,
    w: _w, // Available for future width-based rendering
    h,
    scaleFactor,
    isHovered,
    isSelected,
    transition,
    onSelect,
    onHover,
    onDelete,
    onDuplicate,
    className,
    style,
  },
  ref
) {
  const handleClick = (_e: MouseEvent) => {
    onSelect(id);
  };

  const handlePointerEnter = (_e: PointerEvent) => {
    onHover(id);
  };

  const handlePointerLeave = () => {
    onHover(null);
  };

  const renderBlockContent = () => {
    switch (block.type) {
      case "link":
        return <LinkBlock h={h} scaleFactor={scaleFactor} content={block.content} />;
      case "text":
        return <TextBlock h={h} scaleFactor={scaleFactor} content={block.content} />;
      case "image":
        return <ImageBlock scaleFactor={scaleFactor} content={block.content} />;
      case "social":
        return <SocialBlock h={h} scaleFactor={scaleFactor} content={block.content} />;
      default:
        return (
          <div className="flex items-center justify-center h-full text-gray-500">
            Unknown block type
          </div>
        );
    }
  };

  return (
    <div
      ref={ref}
      className={clsx(
        className,
        "block-item group cursor-move",
        isHovered && "is-hovered-block",
        isSelected && "is-selected-block"
      )}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onClick={handleClick}
      style={{
        ...style,
        transition: transition ? "transform 200ms ease" : undefined,
      }}
    >
      <BlockWrapper isSelected={isSelected}>
        {renderBlockContent()}
      </BlockWrapper>

      {isHovered && (
        <BlockActionBar
          onEdit={() => onSelect(id)}
          onDuplicate={() => onDuplicate(id)}
          onDelete={() => onDelete(id)}
        />
      )}

      {!isHovered && (
        <div className="block-edit-indicator">
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
          </svg>
        </div>
      )}
    </div>
  );
});
