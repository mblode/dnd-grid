import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Label } from "../ui/label";
import { paletteItems } from "./data";
import { PaletteListItem } from "./palette-list-item";
import type { BlockKind, GridItem, PaletteItem } from "./types";

type Props = {
  isEditing: boolean;
  selectedItem: GridItem | null;
  activePaletteId: BlockKind | null;
  onBack: () => void;
  onPaletteClick: (item: PaletteItem) => void;
  onTitleChange: (id: string, nextTitle: string) => void;
  getPreviewHeight: (item: PaletteItem) => number;
  className?: string;
  isPalette?: boolean;
};

export const BlocksGridPanel = ({
  isEditing,
  selectedItem,
  activePaletteId,
  onBack,
  onPaletteClick,
  onTitleChange,
  getPreviewHeight,
  className,
  isPalette,
}: Props) => {
  const isAddPanel = !isEditing;
  const isEditPanel = isEditing;

  return (
    <div
      className={cn(
        "rounded-t-[32px] md:rounded-b-[32px] bg-neutral-50 dark:bg-card border border-border p-4 text-xs shadow-2xl",
        className,
      )}
    >
      {isEditPanel && !isPalette && (
        <div className="mb-3">
          <Button type="button" variant="outline" size="sm" onClick={onBack}>
            Back
          </Button>
        </div>
      )}

      <div className="text-lg font-medium mb-3">
        {isEditPanel ? selectedItem?.name : "Add block"}
      </div>

      {isAddPanel ? (
        <div className="flex flex-col">
          {paletteItems.map((item) => (
            <PaletteListItem
              key={item.kind}
              item={item}
              isActive={activePaletteId === item.kind}
              previewHeight={getPreviewHeight(item)}
              onAdd={onPaletteClick}
            />
          ))}
        </div>
      ) : (
        selectedItem && (
          <div className="space-y-fluid-3">
            <div className="space-y-1">
              <Label>Title</Label>
              <Input
                value={selectedItem.title}
                onChange={(event) =>
                  onTitleChange(selectedItem.id, event.target.value)
                }
              />
            </div>
          </div>
        )
      )}
    </div>
  );
};
