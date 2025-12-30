import { Plus } from "lucide-react";
import type { CSSProperties } from "react";
import { Button } from "@/components/ui/button";
import { PaletteDraggable } from "./palette-draggable";
import type { PaletteItem } from "./types";

interface Props {
  item: PaletteItem;
  previewHeight: number;
  previewScale: number;
  onAdd: (item: PaletteItem) => void;
}

export const PaletteListItem = ({
  item,
  previewHeight,
  previewScale,
  onAdd,
}: Props) => {
  const scaleValue = previewScale.toFixed(4);

  return (
    <div className="border-border border-b-2 pt-fluid-4 pb-fluid-5 last:border-b-0 last:pb-0">
      <div className="mb-fluid-3 flex items-start gap-2">
        <div className="flex-1 space-y-1">
          <div className="font-semibold text-foreground text-sm">
            {item.name}
          </div>
          <div className="text-muted-foreground text-xs">
            {item.description}
          </div>
        </div>
        <Button
          onClick={() => onAdd(item)}
          size="sm"
          type="button"
          variant="outline"
        >
          <Plus className="size-3" />
          Add
        </Button>
      </div>
      <PaletteDraggable
        item={item}
        onClick={onAdd}
        previewHeight={previewHeight}
        style={
          {
            "--dnd-grid-scale": scaleValue,
          } as CSSProperties
        }
      />
    </div>
  );
};
