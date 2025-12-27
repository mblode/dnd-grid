import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Tone = "default" | "danger";

type Props = {
  children: ReactNode;
  onClick?: () => void;
  tone?: Tone;
};

export const ActionButton = ({
  children,
  onClick,
  tone = "default",
}: Props) => {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={onClick}
      className={cn(
        "h-7 rounded-full px-2 text-[10px] cursor-pointer",
        tone === "danger" && "text-destructive",
      )}
    >
      {children}
    </Button>
  );
};
