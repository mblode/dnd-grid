import { useContainerWidth } from "@dnd-grid/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Label } from "../ui/label";
import {
  BLOCK_COLUMNS,
  BLOCK_GAP,
  BLOCK_HEIGHT,
  DEFAULT_WIDTH,
  MAX_WIDTH,
} from "./constants";
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
  className,
  isPalette,
}: Props) => {
  const { width: panelWidth, containerRef } = useContainerWidth({
    initialWidth: DEFAULT_WIDTH,
  });
  const isAddPanel = !isEditing;
  const isEditPanel = isEditing;
  const resolvedWidth = panelWidth > 0 ? panelWidth : DEFAULT_WIDTH;
  const previewScale = Math.min(resolvedWidth, MAX_WIDTH) / DEFAULT_WIDTH;
  const baseAvailableWidth = DEFAULT_WIDTH - BLOCK_GAP * (BLOCK_COLUMNS - 1);
  const baseColumnWidth = baseAvailableWidth / BLOCK_COLUMNS;
  const getPreviewHeight = (item: PaletteItem) => {
    const baseWidth = baseColumnWidth * item.w + BLOCK_GAP * (item.w - 1);
    const baseHeight = BLOCK_HEIGHT * item.h + BLOCK_GAP * (item.h - 1);
    const fillScale = resolvedWidth / baseWidth;
    return baseHeight * fillScale;
  };

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
        <div ref={containerRef} className="flex flex-col">
          {paletteItems.map((item) => (
            <PaletteListItem
              key={item.kind}
              item={item}
              isActive={activePaletteId === item.kind}
              previewHeight={getPreviewHeight(item)}
              previewScale={previewScale}
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
