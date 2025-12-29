import { useDraggable } from "@dnd-kit/core";
import type { CSSProperties } from "react";
import { useLayoutEffect, useRef, useState } from "react";
import { useDragSwing } from "@/hooks/use-drag-swing";
import { BlockCard } from "./block-card";
import type { PaletteItem } from "./types";

type Props = {
  item: PaletteItem;
  previewHeight: number;
  style?: CSSProperties;
  onClick?: (item: PaletteItem) => void;
};

type PaletteDragSwingOverlayProps = {
  item: PaletteItem;
  style: CSSProperties;
};

export const PaletteDraggable = ({
  item,
  previewHeight,
  style,
  onClick,
}: Props) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: item.kind,
    data: {
      palette: item,
    },
  });

  const previewStyle = {
    ...style,
    height: previewHeight,
  } as CSSProperties;

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
      className="block w-full cursor-grab text-left outline-none active:cursor-grabbing"
      style={previewStyle}
    >
      <BlockCard kind={item.kind} title={item.title} isPalette />
    </button>
  );
};

export const PaletteDragSwingOverlay = ({
  item,
  style,
}: PaletteDragSwingOverlayProps) => {
  const { overlayRef, scaleRef } = useDragSwing();

  const measureRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ width: number; height: number } | null>(
    null,
  );

  useLayoutEffect(() => {
    if (measureRef.current && !size) {
      const rect = measureRef.current.getBoundingClientRect();
      setSize({ width: rect.width, height: rect.height });
    }
  }, [size]);

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: size?.height,
      }}
    >
      <div
        ref={scaleRef}
        style={{
          position: size ? "absolute" : "relative",
          top: 0,
          left: 0,
          width: "100%",
          transform: "scale(var(--motion-scale, 1))",
          transformOrigin: "center center",
        }}
      >
        <div
          ref={overlayRef}
          style={{
            width: "100%",
            transform: "rotate(var(--motion-rotate, 0deg))",
            transformOrigin: "center center",
          }}
        >
          <div
            ref={measureRef}
            data-overlay-card
            style={style}
            className="rounded-[calc(var(--radius-widget)*var(--dnd-grid-scale,1))]"
          >
            <BlockCard
              kind={item.kind}
              title={item.title}
              className="cursor-grabbing shadow-(--widget-shadow-hover)"
              isPalette
            />
          </div>
        </div>
      </div>
    </div>
  );
};
