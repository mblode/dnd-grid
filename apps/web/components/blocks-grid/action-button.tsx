import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Tone = "default" | "danger";

interface Props {
  children: ReactNode;
  onClick?: () => void;
  tone?: Tone;
}

export const ActionButton = ({
  children,
  onClick,
  tone = "default",
}: Props) => {
  const isDanger = tone === "danger";

  return (
    <Button
      className={cn(
        "h-7 cursor-pointer rounded-full px-2 text-[10px]",
        isDanger && "text-destructive"
      )}
      onClick={onClick}
      size="sm"
      type="button"
      variant="outline"
    >
      {children}
    </Button>
  );
};
