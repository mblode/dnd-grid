import Image from "next/image";
import type { BlockKind } from "./types";

interface Props {
  kind: BlockKind;
  title: string;
}

export const BlockSwitch = ({ kind, title }: Props) => {
  switch (kind) {
    case "text":
      return (
        <div className="flex h-full items-center justify-center p-fluid-3 text-center">
          <div className="font-semibold text-fluid-2xl text-foreground">
            {title}
          </div>
        </div>
      );
    case "media":
      return (
        <div className="flex h-full flex-col gap-fluid-2">
          <div className="relative flex-1 overflow-hidden rounded-[calc(var(--dnd-grid-radius)*var(--dnd-grid-scale))] bg-muted/70">
            <Image
              alt="Media placeholder"
              className="pointer-events-none select-none object-cover"
              draggable={false}
              fill
              sizes="(min-width: 1024px) 240px, 50vw"
              src="https://images.unsplash.com/photo-1766066198725-b18478cc23d7?auto=format&fit=crop&w=800&q=80"
              style={
                {
                  WebkitTouchCallout: "none",
                  WebkitUserDrag: "none",
                } as React.CSSProperties
              }
            />
            {title && (
              <div className="absolute bottom-fluid-3 left-fluid-3 z-10">
                <div className="rounded-[calc((var(--dnd-grid-radius)-12px)*var(--dnd-grid-scale))] bg-white/70 px-fluid-2 py-fluid-1.5 text-black text-fluid-xs shadow-[0px_0px_0px_1px_rgba(0,0,0,0.06)] backdrop-blur-[20px]">
                  <div className="line-clamp-2 font-normal">{title}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      );
    case "quote":
      return (
        <div className="flex h-full flex-col gap-fluid-2 p-fluid-3">
          <div
            aria-hidden="true"
            className="font-serif text-fluid-5xl text-muted-foreground/70 leading-none"
          >
            &ldquo;
          </div>
          <div className="font-serif text-fluid-2xl text-muted-foreground">
            {title}
          </div>
        </div>
      );
    default:
      return (
        <div className="flex h-full items-center justify-center text-fluid-xs text-muted-foreground">
          {title}
        </div>
      );
  }
};
