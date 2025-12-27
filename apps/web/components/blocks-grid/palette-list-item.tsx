import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PaletteDraggable } from "./palette-draggable";
import type { PaletteItem } from "./types";

type Props = {
  item: PaletteItem;
  isActive: boolean;
  previewHeight: number;
  onAdd: (item: PaletteItem) => void;
};

export const PaletteListItem = ({
  item,
  isActive,
  previewHeight,
  onAdd,
}: Props) => {
  return (
    <div className="border-b-2 border-border pb-fluid-5 pt-fluid-4 last:border-b-0 last:pb-0">
      <div className="mb-fluid-3 flex items-start gap-2">
        <div className="flex-1 space-y-1">
          <div className="text-sm font-semibold text-foreground">
            {item.name}
          </div>
          <div className="text-xs text-muted-foreground">
            {item.description}
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onAdd(item)}
        >
          <Plus className="size-3" />
          Add
        </Button>
      </div>
      <PaletteDraggable
        item={item}
        isActive={isActive}
        previewHeight={previewHeight}
        onClick={onAdd}
      />
    </div>
  );
};
