"use client";

import { makeAutoObservable } from "mobx";
import { isHydrated, makePersistable } from "mobx-persist-store";

import { type DragSwingSettings, getDragSwingDefaults } from "@/lib/drag-swing";
import type { BlockData, DropPosition } from "@/types/block";

// Mock data for demo
const MOCK_BLOCKS: BlockData[] = [
  {
    id: "block-1",
    title: "My Portfolio",
    type: "link",
    url: "https://portfolio.com",
    visible: true,
    order: 0,
    pageId: "page-1",
  },
  {
    id: "block-2",
    title: "About Me",
    type: "header",
    visible: true,
    order: 1,
    pageId: "page-1",
  },
  {
    id: "block-3",
    title: "Twitter",
    type: "link",
    url: "https://twitter.com",
    visible: true,
    order: 2,
    pageId: "page-1",
  },
  {
    id: "block-4",
    title: "Instagram",
    type: "link",
    url: "https://instagram.com",
    visible: false,
    order: 3,
    pageId: "page-1",
  },
  {
    id: "block-5",
    title: "Contact",
    type: "text",
    visible: true,
    order: 4,
    pageId: "page-1",
  },
];

export class Store {
  blocksData: BlockData[] = MOCK_BLOCKS;

  dragSwingSettings: DragSwingSettings = getDragSwingDefaults();

  // Drag state
  activeBlockId: string | null = null;
  settlingBlockId: string | null = null;
  overBlockId: string | null = null;
  dropPosition: DropPosition = null;

  // Drop animation state - position captured when drag ends
  dropAnimationRect: {
    top: number;
    left: number;
    width: number;
    height: number;
  } | null = null;
  dropAnimationRotation = 0;
  dropAnimationScale = 1;

  // Editor state
  pageId = "page-1";

  constructor() {
    makeAutoObservable(this, undefined, { autoBind: true });

    makePersistable(this, {
      name: "perfect-dnd-store",
      properties: ["blocksData", "dragSwingSettings"],
      storage: typeof window === "undefined" ? undefined : window.localStorage,
    });
  }

  get isHydrated() {
    if (typeof window === "undefined") {
      return false;
    }
    return isHydrated(this);
  }

  reorderBlocks(pageId: string, newOrder: string[]) {
    this.blocksData = this.blocksData.map((block) => {
      if (block.pageId !== pageId) {
        return block;
      }
      const newIndex = newOrder.indexOf(block.id);
      if (newIndex === -1) {
        return block;
      }
      return { ...block, order: newIndex };
    });
  }

  toggleVisibility(blockId: string) {
    this.blocksData = this.blocksData.map((block) =>
      block.id === blockId ? { ...block, visible: !block.visible } : block
    );
  }

  setDragSwingSetting<K extends keyof DragSwingSettings>(
    key: K,
    value: DragSwingSettings[K]
  ) {
    this.dragSwingSettings[key] = value;
  }

  setRotationSpringSetting<K extends keyof DragSwingSettings["rotationSpring"]>(
    key: K,
    value: DragSwingSettings["rotationSpring"][K]
  ) {
    this.dragSwingSettings.rotationSpring[key] = value;
  }

  setScaleSpringSetting<K extends keyof DragSwingSettings["scaleSpring"]>(
    key: K,
    value: DragSwingSettings["scaleSpring"][K]
  ) {
    this.dragSwingSettings.scaleSpring[key] = value;
  }

  resetDragSwingSettings() {
    this.dragSwingSettings = getDragSwingDefaults();
  }

  setDropTarget(overBlockId: string | null, position: DropPosition) {
    this.overBlockId = overBlockId;
    this.dropPosition = position;
  }

  clearDropTarget() {
    this.overBlockId = null;
    this.dropPosition = null;
  }

  startDrag(blockId: string) {
    this.activeBlockId = blockId;
    this.dropAnimationRect = null;
    this.dropAnimationRotation = 0;
    this.dropAnimationScale = 1;
  }

  // Called when drag ends - start the settling phase
  startSettling(
    rect: { top: number; left: number; width: number; height: number },
    rotation: number,
    scale: number
  ) {
    this.settlingBlockId = this.activeBlockId;
    this.dropAnimationRect = rect;
    this.dropAnimationRotation = rotation;
    this.dropAnimationScale = scale;
    this.activeBlockId = null;
    this.clearDropTarget();
  }

  // Called when drop animation completes
  endDrag() {
    this.activeBlockId = null;
    this.settlingBlockId = null;
    this.dropAnimationRect = null;
    this.dropAnimationRotation = 0;
    this.dropAnimationScale = 1;
  }
}

// One grid on the site, so no provider and no per-tree scoping.
const store = new Store();

export function useStore(): Store {
  return store;
}
