import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Props {
  w: number;
  x: number;
  children: ReactNode;
}

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
    // biome-ignore lint/a11y/noNoninteractiveElementInteractions: stops event propagation to grid
    // biome-ignore lint/a11y/noStaticElementInteractions: stops event propagation to grid
    <div
      className={cn(
        "kitchen-sink-action pointer-events-auto absolute bottom-0 left-1/2 z-20 translate-y-full pt-2",
        positionClassName
      )}
      onMouseDown={stopPropagation}
      onPointerDown={stopPropagation}
    >
      <div className="relative rounded-4xl bg-card p-2 font-normal font-sans text-foreground shadow-(--widget-shadow) ring-1 ring-transparent dark:ring-border">
        <div className="flex items-center gap-1 font-medium text-[10px]">
          {children}
        </div>
        <div
          className={cn(
            "absolute top-0 left-1/2 z-10 size-3 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-tl-[3px] border border-transparent bg-card dark:border-border",
            pointerClassName
          )}
          style={{ clipPath: "polygon(0 0, 0% 100%, 100% 0)" }}
        />
      </div>
    </div>
  );
};
