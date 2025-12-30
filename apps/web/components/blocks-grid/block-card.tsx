import { GripVertical } from "lucide-react";
import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";
import { BlockSwitch } from "./block-switch";
import type { BlockKind } from "./types";

const blockCardClassName =
  "relative size-full overflow-hidden rounded-[calc(var(--radius-widget)*var(--dnd-grid-scale,1))] bg-(--widget-background) text-foreground shadow-(--widget-shadow) transition-shadow";

interface Props {
  kind: BlockKind;
  title: string;
  isSelected?: boolean;
  isHovered?: boolean;
  isPalette?: boolean;
  className?: string;
  style?: CSSProperties;
}

export const BlockCard = ({
  kind,
  title,
  isSelected,
  isHovered,
  isPalette,
  className,
  style,
}: Props) => {
  const showHoverRing = isHovered && !isSelected;

  return (
    <div
      className={cn(
        blockCardClassName,
        isSelected && "shadow-(--widget-shadow-hover) outline outline-ring",
        showHoverRing && "shadow-(--widget-shadow-hover) ring-1 ring-ring/40",
        className
      )}
      style={style}
    >
      {isPalette && (
        <div className="pointer-events-none absolute top-fluid-2 right-fluid-2 z-10 flex size-6 items-center justify-center rounded-full border border-border bg-card/90 text-muted-foreground shadow-xs">
          <GripVertical className="size-3" />
        </div>
      )}
      <div className="relative z-0 flex size-full flex-col gap-fluid-2">
        <BlockSwitch kind={kind} title={title} />
      </div>
    </div>
  );
};
