import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = {
  w: number;
  x: number;
  children: ReactNode;
};

export const ActionBar = ({ w, x, children }: Props) => {
  const positionClassName = cn({
    "left-0 translate-x-0": w <= 2 && x <= 0,
    "left-full -translate-x-full": w <= 2 && x >= 2,
    "left-1/2 -translate-x-1/2": (x > 0 && x < 2) || w > 2,
  });
  const pointerClassName = cn({
    "left-[22%]": w === 1 && x === 0,
    "left-[78%]": w === 1 && x >= 2,
  });
  const stopPropagation = (event: { stopPropagation: () => void }) =>
    event.stopPropagation();

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: stops event propagation to grid
    <div
      className={cn(
        "kitchen-sink-action pointer-events-auto absolute bottom-0 pt-2 translate-y-full left-1/2 z-20",
        positionClassName,
      )}
      onMouseDown={stopPropagation}
      onPointerDown={stopPropagation}
    >
      <div className="relative rounded-4xl bg-card p-2 font-sans font-normal text-foreground shadow-(--widget-shadow) ring-1 ring-transparent dark:ring-border">
        <div className="flex items-center gap-1 text-[10px] font-medium">
          {children}
        </div>
        <div
          className={cn(
            "absolute z-10 size-3 bg-card border border-transparent dark:border-border top-0 rounded-tl-[3px] -translate-y-1/2 -translate-x-1/2 left-1/2 rotate-45",
            pointerClassName,
          )}
          style={{ clipPath: "polygon(0 0, 0% 100%, 100% 0)" }}
        />
      </div>
    </div>
  );
};
