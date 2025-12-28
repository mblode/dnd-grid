import Image from "next/image";
import type { BlockKind } from "./types";

type Props = {
  kind: BlockKind;
  title: string;
  subText?: string;
};

export const BlockSwitch = ({ kind, title }: Props) => {
  switch (kind) {
    case "text":
      return (
        <div className="flex h-full items-center justify-center text-center p-fluid-3">
          <div className="text-fluid-2xl font-semibold text-foreground">
            {title}
          </div>
        </div>
      );
    case "media":
      return (
        <div className="flex h-full flex-col gap-fluid-2">
          <div className="relative flex-1 overflow-hidden rounded-[calc(var(--dnd-grid-radius)*var(--dnd-grid-scale))] bg-muted/70">
            <Image
              src="https://images.unsplash.com/photo-1766066198725-b18478cc23d7?auto=format&fit=crop&w=800&q=80"
              alt="Media placeholder"
              className="object-cover"
              fill
              sizes="(min-width: 1024px) 240px, 50vw"
              draggable={false}
            />
            {title && (
              <div className="absolute bottom-fluid-3 left-fluid-3 z-10">
                <div className="rounded-[calc((var(--dnd-grid-radius)-12px)*var(--dnd-grid-scale))] bg-white/70 px-fluid-2 py-fluid-1.5 text-fluid-xs shadow-[0px_0px_0px_1px_rgba(0,0,0,0.06)] text-black backdrop-blur-[20px]">
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
            className="text-fluid-5xl font-serif leading-none text-muted-foreground/70"
            aria-hidden="true"
          >
            &ldquo;
          </div>
          <div className="text-fluid-2xl font-serif text-muted-foreground">
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
