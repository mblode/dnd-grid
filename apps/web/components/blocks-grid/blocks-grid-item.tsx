import { Copy, Pencil, Trash2 } from "lucide-react";
import type { HTMLAttributes } from "react";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { ActionBar } from "./action-bar";
import { ActionButton } from "./action-button";
import { BlockCard } from "./block-card";
import type { GridItem } from "./types";

type Props = {
  item: GridItem;
  isSelected: boolean;
  isHovered: boolean;
  onHover: () => void;
  onHoverEnd?: () => void;
  onSelect: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
} & HTMLAttributes<HTMLDivElement>;

export const BlocksGridItem = forwardRef<HTMLDivElement, Props>(
  (
    {
      item,
      isSelected,
      isHovered,
      onHover,
      onHoverEnd,
      onSelect,
      onEdit,
      onDuplicate,
      onDelete,
      children,
      className,
      style,
      ...rest
    },
    ref,
  ) => {
    const showControls = isHovered || isSelected;
    const showHandles = showControls;

    return (
      <div
        ref={ref}
        style={style}
        className={cn(
          "relative size-full overflow-visible",
          showHandles && "is-hovered",
          isHovered && "z-[1]",
          className,
        )}
        onPointerEnter={(event) => {
          event.stopPropagation();
          onHover();
        }}
        onPointerLeave={() => onHoverEnd?.()}
        {...rest}
      >
        <button
          type="button"
          className="group relative size-full cursor-move text-left outline-none"
          onClick={onSelect}
        >
          <BlockCard
            kind={item.kind}
            title={item.title}
            isSelected={isSelected}
            isHovered={isHovered}
          />
        </button>

        {isHovered && (
          <ActionBar w={item.w} x={item.x}>
            <ActionButton onClick={onEdit}>
              <Pencil className="size-3" />
              Edit
            </ActionButton>
            <ActionButton onClick={onDuplicate}>
              <Copy className="size-3" />
              Duplicate
            </ActionButton>
            <ActionButton tone="danger" onClick={onDelete}>
              <Trash2 className="size-3" />
              Delete
            </ActionButton>
          </ActionBar>
        )}
        {children}
      </div>
    );
  },
);

BlocksGridItem.displayName = "BlocksGridItem";
