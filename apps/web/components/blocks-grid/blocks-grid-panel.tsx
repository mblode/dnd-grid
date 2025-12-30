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
} from "./constants";
import { paletteItems } from "./data";
import { PaletteListItem } from "./palette-list-item";
import type { GridItem, PaletteItem } from "./types";

interface Props {
  isEditing: boolean;
  selectedItem: GridItem | null;
  onBack: () => void;
  onPaletteClick: (item: PaletteItem) => void;
  onTitleChange: (id: string, nextTitle: string) => void;
  className?: string;
  isPalette?: boolean;
}

export const BlocksGridPanel = ({
  isEditing,
  selectedItem,
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
  const baseColumnWidth =
    (DEFAULT_WIDTH - BLOCK_GAP * (BLOCK_COLUMNS - 1)) / BLOCK_COLUMNS;
  const getPreviewMetrics = (item: PaletteItem) => {
    const baseWidth = baseColumnWidth * item.w + BLOCK_GAP * (item.w - 1);
    const baseHeight = BLOCK_HEIGHT * item.h + BLOCK_GAP * (item.h - 1);
    const scale = resolvedWidth / baseWidth;
    return {
      height: baseHeight * scale,
      scale,
    };
  };

  return (
    <div
      className={cn(
        "rounded-t-[32px] border border-border bg-neutral-50 p-4 text-xs shadow-2xl md:rounded-b-[32px] dark:bg-card",
        className
      )}
    >
      {isEditPanel && !isPalette && (
        <div className="mb-3">
          <Button onClick={onBack} size="sm" type="button" variant="outline">
            Back
          </Button>
        </div>
      )}

      <div className="mb-3 font-serif text-lg">
        {isEditPanel ? selectedItem?.name : "Add block"}
      </div>

      {isAddPanel ? (
        <div className="flex flex-col" ref={containerRef}>
          {paletteItems.map((item) => {
            const { height, scale } = getPreviewMetrics(item);
            return (
              <PaletteListItem
                item={item}
                key={item.kind}
                onAdd={onPaletteClick}
                previewHeight={height}
                previewScale={scale}
              />
            );
          })}
        </div>
      ) : (
        selectedItem && (
          <div className="space-y-fluid-3">
            <div className="space-y-1">
              <Label htmlFor="block-title-input">Title</Label>
              <Input
                id="block-title-input"
                onChange={(event) =>
                  onTitleChange(selectedItem.id, event.target.value)
                }
                value={selectedItem.title}
              />
            </div>
          </div>
        )
      )}
    </div>
  );
};
