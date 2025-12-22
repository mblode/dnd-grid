import React from "react";
import { describe, expect, it } from "vitest";
import {
  collidingLayout,
  complexLayout,
  gappyLayout,
  horizontalGappyLayout,
  layoutWithStatic,
  simpleLayout,
} from "./__tests__/fixtures/layouts";
import { createLayoutItem } from "./__tests__/test-utils";
import { getCompactor } from "./compactors";
import type { LayoutItem, Position } from "./types";
import {
  bottom,
  childrenEqual,
  cloneLayout,
  cloneLayoutItem,
  collides,
  compact,
  compactItem,
  correctBounds,
  getAllCollisions,
  getFirstCollision,
  getLayoutItem,
  getStatics,
  moveElement,
  moveElementAwayFromCollision,
  noop,
  resizeItemInDirection,
  setTransform,
  sortLayoutItems,
  sortLayoutItemsByColRow,
  sortLayoutItemsByRowCol,
  synchronizeLayoutWithChildren,
  withLayoutItem,
} from "./utils";

describe("utils", () => {
  // --- CLONING ---
  describe("cloneLayoutItem", () => {
    it("creates a deep copy of layout item", () => {
      const item = createLayoutItem({ i: "test", x: 1, y: 2, w: 3, h: 4 });
      const cloned = cloneLayoutItem(item);

      // Core properties should match
      expect(cloned.i).toBe(item.i);
      expect(cloned.x).toBe(item.x);
      expect(cloned.y).toBe(item.y);
      expect(cloned.w).toBe(item.w);
      expect(cloned.h).toBe(item.h);
      expect(cloned).not.toBe(item);
    });

    it("preserves all properties", () => {
      const item = createLayoutItem({
        minW: 1,
        maxW: 5,
        minH: 1,
        maxH: 5,
        static: true,
        isDraggable: false,
        isResizable: true,
        isBounded: true,
        resizeHandles: ["se", "ne"],
      });
      const cloned = cloneLayoutItem(item);

      expect(cloned.minW).toBe(1);
      expect(cloned.maxW).toBe(5);
      expect(cloned.static).toBe(true);
      expect(cloned.resizeHandles).toEqual(["se", "ne"]);
    });

    it("converts moved and static to booleans", () => {
      const item = {
        ...createLayoutItem(),
        moved: undefined,
        static: undefined,
      };
      const cloned = cloneLayoutItem(item);

      expect(cloned.moved).toBe(false);
      expect(cloned.static).toBe(false);
    });

    it("converts truthy values to true for boolean fields", () => {
      const item = {
        ...createLayoutItem(),
        moved: 1,
        static: "yes",
      } as unknown as LayoutItem;
      const cloned = cloneLayoutItem(item);

      expect(cloned.moved).toBe(true);
      expect(cloned.static).toBe(true);
    });
  });

  describe("cloneLayout", () => {
    it("creates a deep copy of entire layout", () => {
      const cloned = cloneLayout(simpleLayout);

      // Core properties should match for each item
      expect(cloned.length).toBe(simpleLayout.length);
      cloned.forEach((item, i) => {
        expect(item.i).toBe(simpleLayout[i].i);
        expect(item.x).toBe(simpleLayout[i].x);
        expect(item.y).toBe(simpleLayout[i].y);
        expect(item.w).toBe(simpleLayout[i].w);
        expect(item.h).toBe(simpleLayout[i].h);
        expect(item).not.toBe(simpleLayout[i]);
      });
      expect(cloned).not.toBe(simpleLayout);
    });

    it("handles empty layout", () => {
      expect(cloneLayout([])).toEqual([]);
    });

    it("preserves layout order", () => {
      const cloned = cloneLayout(complexLayout);
      expect(cloned.map((l) => l.i)).toEqual(complexLayout.map((l) => l.i));
    });
  });

  describe("withLayoutItem", () => {
    it("modifies a specific item and returns new layout", () => {
      const [newLayout, item] = withLayoutItem(simpleLayout, "a", (l) => ({
        ...l,
        x: 5,
      }));

      expect(item?.x).toBe(5);
      expect(newLayout[0].x).toBe(5);
      expect(newLayout).not.toBe(simpleLayout);
    });

    it("returns original layout if item not found", () => {
      const [newLayout, item] = withLayoutItem(
        simpleLayout,
        "nonexistent",
        (l) => l,
      );

      expect(newLayout).toBe(simpleLayout);
      expect(item).toBeNull();
    });

    it("does not mutate original layout", () => {
      const originalX = simpleLayout[0].x;
      withLayoutItem(simpleLayout, "a", (l) => ({ ...l, x: 999 }));

      expect(simpleLayout[0].x).toBe(originalX);
    });

    it("only modifies the targeted item", () => {
      const [newLayout] = withLayoutItem(simpleLayout, "a", (l) => ({
        ...l,
        x: 5,
      }));

      expect(newLayout[1]).toBe(simpleLayout[1]);
    });
  });

  describe("childrenEqual", () => {
    it("returns true for identical keys", () => {
      const childA = React.createElement("div", { key: "a" });
      const childB = React.createElement("div", { key: "b" });
      expect(childrenEqual([childA, childB], [childA, childB])).toBe(true);
    });

    it("returns false when keys differ", () => {
      const childA = React.createElement("div", { key: "a" });
      const childB = React.createElement("div", { key: "b" });
      expect(childrenEqual([childA], [childB])).toBe(false);
    });

    it("returns false when order changes", () => {
      const childA = React.createElement("div", { key: "a" });
      const childB = React.createElement("div", { key: "b" });
      expect(childrenEqual([childA, childB], [childB, childA])).toBe(false);
    });

    it("handles null children", () => {
      expect(childrenEqual(null, null)).toBe(true);
    });
  });

  // --- COLLISION DETECTION ---
  describe("collides", () => {
    it("returns false for same element", () => {
      const item = createLayoutItem();
      expect(collides(item, item)).toBe(false);
    });

    it("returns true for overlapping items", () => {
      const l1 = createLayoutItem({ i: "a", x: 0, y: 0, w: 2, h: 2 });
      const l2 = createLayoutItem({ i: "b", x: 1, y: 1, w: 2, h: 2 });
      expect(collides(l1, l2)).toBe(true);
    });

    it("returns false for adjacent items (right)", () => {
      const l1 = createLayoutItem({ i: "a", x: 0, y: 0, w: 2, h: 2 });
      const l2 = createLayoutItem({ i: "b", x: 2, y: 0, w: 2, h: 2 });
      expect(collides(l1, l2)).toBe(false);
    });

    it("returns false for adjacent items (below)", () => {
      const l1 = createLayoutItem({ i: "a", x: 0, y: 0, w: 2, h: 2 });
      const l2 = createLayoutItem({ i: "b", x: 0, y: 2, w: 2, h: 2 });
      expect(collides(l1, l2)).toBe(false);
    });

    it("returns false for items far apart", () => {
      const l1 = createLayoutItem({ i: "a", x: 0, y: 0, w: 1, h: 1 });
      const l2 = createLayoutItem({ i: "b", x: 10, y: 10, w: 1, h: 1 });
      expect(collides(l1, l2)).toBe(false);
    });

    it("detects partial overlap", () => {
      const l1 = createLayoutItem({ i: "a", x: 0, y: 0, w: 3, h: 3 });
      const l2 = createLayoutItem({ i: "b", x: 2, y: 2, w: 3, h: 3 });
      expect(collides(l1, l2)).toBe(true);
    });
  });

  describe("getFirstCollision", () => {
    it("returns first colliding item", () => {
      const item = createLayoutItem({ i: "test", x: 0, y: 0, w: 3, h: 3 });
      const collision = getFirstCollision(simpleLayout, item);
      expect(collision?.i).toBe("a");
    });

    it("returns undefined when no collision", () => {
      const item = createLayoutItem({ i: "test", x: 10, y: 10, w: 1, h: 1 });
      expect(getFirstCollision(simpleLayout, item)).toBeUndefined();
    });

    it("returns undefined for empty layout", () => {
      const item = createLayoutItem({ x: 0, y: 0, w: 1, h: 1 });
      expect(getFirstCollision([], item)).toBeUndefined();
    });
  });

  describe("getAllCollisions", () => {
    it("returns all colliding items", () => {
      const item = createLayoutItem({ i: "test", x: 1, y: 0, w: 3, h: 3 });
      const collisions = getAllCollisions(simpleLayout, item);
      expect(collisions.length).toBe(2);
    });

    it("returns empty array when no collisions", () => {
      const item = createLayoutItem({ i: "test", x: 10, y: 10, w: 1, h: 1 });
      expect(getAllCollisions(simpleLayout, item)).toEqual([]);
    });

    it("returns empty array for empty layout", () => {
      const item = createLayoutItem({ x: 0, y: 0, w: 1, h: 1 });
      expect(getAllCollisions([], item)).toEqual([]);
    });
  });

  // --- BOTTOM ---
  describe("bottom", () => {
    it("returns highest y + h in layout", () => {
      expect(bottom(simpleLayout)).toBe(2);
    });

    it("returns 0 for empty layout", () => {
      expect(bottom([])).toBe(0);
    });

    it("handles items at different positions", () => {
      const layout = [
        createLayoutItem({ y: 0, h: 2 }),
        createLayoutItem({ i: "b", y: 5, h: 3 }),
      ];
      expect(bottom(layout)).toBe(8);
    });

    it("finds maximum correctly in complex layout", () => {
      expect(bottom(complexLayout)).toBe(4);
    });
  });

  // --- COMPACTION ---
  describe("compact", () => {
    it("compacts items vertically", () => {
      const compacted = compact(gappyLayout, "vertical", 12);
      expect(compacted[0].y).toBe(0);
    });

    it("compacts items horizontally", () => {
      const compacted = compact(horizontalGappyLayout, "horizontal", 12);
      expect(compacted[0].x).toBe(0);
    });

    it("respects static items", () => {
      const layout = [
        createLayoutItem({
          i: "static",
          x: 0,
          y: 0,
          w: 2,
          h: 2,
          static: true,
        }),
        createLayoutItem({ i: "dynamic", x: 0, y: 5, w: 2, h: 2 }),
      ];
      const compacted = compact(layout, "vertical", 12);
      expect(compacted.find((i) => i.i === "dynamic")?.y).toBe(2);
    });

    it("handles allowOverlap", () => {
      const compacted = compact(collidingLayout, "vertical", 12, true);
      // With allowOverlap, items still compact but can overlap
      expect(compacted[0].y).toBe(0);
      // The second item is still compacted to the top
      expect(compacted[1].y).toBeGreaterThanOrEqual(0);
    });

    it("handles empty layout", () => {
      const compacted = compact([], "vertical", 12);
      expect(compacted).toEqual([]);
    });

    it("handles null compactType", () => {
      const compacted = compact(gappyLayout, null, 12);
      // With null compactType, items don't compact but collisions still resolve
      expect(compacted.length).toBe(gappyLayout.length);
    });
  });

  describe("compactItem", () => {
    it("compacts item vertically to top", () => {
      const item = createLayoutItem({ i: "test", x: 0, y: 5, w: 1, h: 1 });
      const compareWith: LayoutItem[] = [];
      const fullLayout = [item];
      const compacted = compactItem(
        compareWith,
        item,
        "vertical",
        12,
        fullLayout,
      );
      expect(compacted.y).toBe(0);
    });

    it("compacts item horizontally to left", () => {
      const item = createLayoutItem({ i: "test", x: 5, y: 0, w: 1, h: 1 });
      const compareWith: LayoutItem[] = [];
      const fullLayout = [item];
      const compacted = compactItem(
        compareWith,
        item,
        "horizontal",
        12,
        fullLayout,
      );
      expect(compacted.x).toBe(0);
    });

    it("stops at collision", () => {
      const blocker = createLayoutItem({
        i: "blocker",
        x: 0,
        y: 0,
        w: 2,
        h: 2,
      });
      const item = createLayoutItem({ i: "test", x: 0, y: 5, w: 1, h: 1 });
      const compareWith = [blocker];
      const fullLayout = [blocker, item];
      const compacted = compactItem(
        compareWith,
        item,
        "vertical",
        12,
        fullLayout,
      );
      expect(compacted.y).toBe(2);
    });

    it("ensures non-negative positions", () => {
      const item = createLayoutItem({ i: "test", x: -5, y: -5, w: 1, h: 1 });
      const fullLayout = [item];
      const compacted = compactItem([], item, "vertical", 12, fullLayout);
      expect(compacted.x).toBeGreaterThanOrEqual(0);
      expect(compacted.y).toBeGreaterThanOrEqual(0);
    });
  });

  // --- BOUNDS CORRECTION ---
  describe("correctBounds", () => {
    it("moves items that overflow right", () => {
      const layout = [createLayoutItem({ x: 11, w: 3 })];
      const corrected = correctBounds(layout, { cols: 12 });
      expect(corrected[0].x).toBe(9); // 12 - 3
    });

    it("adjusts items that overflow left", () => {
      const layout = [createLayoutItem({ x: -5, w: 3 })];
      const corrected = correctBounds(layout, { cols: 12 });
      expect(corrected[0].x).toBe(0);
      expect(corrected[0].w).toBe(12);
    });

    it("does not modify items within bounds", () => {
      const layout = [createLayoutItem({ x: 5, w: 2 })];
      const corrected = correctBounds(layout, { cols: 12 });
      expect(corrected[0].x).toBe(5);
      expect(corrected[0].w).toBe(2);
    });

    it("handles static item collisions", () => {
      const layout = [
        createLayoutItem({
          i: "static1",
          x: 0,
          y: 0,
          w: 2,
          h: 2,
          static: true,
        }),
        createLayoutItem({
          i: "static2",
          x: 0,
          y: 0,
          w: 2,
          h: 2,
          static: true,
        }),
      ];
      const corrected = correctBounds(layout, { cols: 12 });
      // Both statics exist in the corrected layout
      expect(corrected.length).toBe(2);
      expect(corrected[0].static).toBe(true);
      expect(corrected[1].static).toBe(true);
    });
  });

  // --- GETTERS ---
  describe("getLayoutItem", () => {
    it("finds item by id", () => {
      expect(getLayoutItem(simpleLayout, "a")).toBe(simpleLayout[0]);
    });

    it("returns undefined for missing id", () => {
      expect(getLayoutItem(simpleLayout, "nonexistent")).toBeUndefined();
    });

    it("returns undefined for empty layout", () => {
      expect(getLayoutItem([], "a")).toBeUndefined();
    });
  });

  describe("getStatics", () => {
    it("returns only static items", () => {
      const statics = getStatics(layoutWithStatic);
      expect(statics.length).toBe(1);
      expect(statics[0].static).toBe(true);
    });

    it("returns empty array when no statics", () => {
      expect(getStatics(simpleLayout)).toEqual([]);
    });

    it("returns empty array for empty layout", () => {
      expect(getStatics([])).toEqual([]);
    });
  });

  // --- MOVEMENT ---
  describe("moveElement", () => {
    it("moves element to new position", () => {
      const layout = cloneLayout(simpleLayout);
      const l = layout[0];
      const newLayout = moveElement(
        layout,
        l,
        5,
        5,
        true,
        false,
        "vertical",
        12,
      );
      expect(newLayout.find((item) => item.i === "a")?.x).toBe(5);
      expect(newLayout.find((item) => item.i === "a")?.y).toBe(5);
    });

    it("does not move static items without isDraggable", () => {
      const layout = cloneLayout(layoutWithStatic);
      const staticItem = layout[0];
      const newLayout = moveElement(
        layout,
        staticItem,
        5,
        5,
        true,
        false,
        "vertical",
        12,
      );
      expect(newLayout[0].x).toBe(0);
      expect(newLayout[0].y).toBe(0);
    });

    it("returns same layout if position unchanged", () => {
      const layout = cloneLayout(simpleLayout);
      const l = layout[0];
      const newLayout = moveElement(
        layout,
        l,
        l.x,
        l.y,
        true,
        false,
        "vertical",
        12,
      );
      expect(newLayout).toBe(layout);
    });

    it("prevents collision when preventCollision is true", () => {
      const layout = cloneLayout(simpleLayout);
      const l = layout[1]; // item b
      // Try to move b to where a is
      const newLayout = moveElement(
        layout,
        l,
        0,
        0,
        true,
        true,
        "vertical",
        12,
      );
      // Should revert to original position
      expect(newLayout[1].x).toBe(2);
    });

    it("allows overlap when allowOverlap is true", () => {
      const layout = cloneLayout(simpleLayout);
      const l = layout[1];
      const newLayout = moveElement(
        layout,
        l,
        0,
        0,
        true,
        false,
        "vertical",
        12,
        true,
      );
      // Should allow the move
      expect(newLayout.find((item) => item.i === "b")?.x).toBe(0);
    });
  });

  describe("moveElementAwayFromCollision", () => {
    it("moves item away from collision vertically", () => {
      const layout = cloneLayout(simpleLayout);
      const newLayout = moveElementAwayFromCollision(
        layout,
        layout[0],
        layout[1],
        true,
        "vertical",
        12,
      );
      expect(newLayout.length).toBe(layout.length);
    });

    it("moves item away from collision horizontally", () => {
      const layout = cloneLayout(simpleLayout);
      const newLayout = moveElementAwayFromCollision(
        layout,
        layout[0],
        layout[1],
        true,
        "horizontal",
        12,
      );
      expect(newLayout.length).toBe(layout.length);
    });
  });

  // --- SORTING ---
  describe("sortLayoutItemsByRowCol", () => {
    it("sorts by row then column", () => {
      const layout = [
        createLayoutItem({ i: "c", x: 2, y: 1 }),
        createLayoutItem({ i: "a", x: 0, y: 0 }),
        createLayoutItem({ i: "b", x: 1, y: 0 }),
      ];
      const sorted = sortLayoutItemsByRowCol(layout);
      expect(sorted.map((l) => l.i)).toEqual(["a", "b", "c"]);
    });

    it("does not mutate original array", () => {
      const layout = [
        createLayoutItem({ i: "b", x: 1, y: 0 }),
        createLayoutItem({ i: "a", x: 0, y: 0 }),
      ];
      sortLayoutItemsByRowCol(layout);
      expect(layout[0].i).toBe("b");
    });

    it("handles items at same position", () => {
      const layout = [
        createLayoutItem({ i: "b", x: 0, y: 0 }),
        createLayoutItem({ i: "a", x: 0, y: 0 }),
      ];
      const sorted = sortLayoutItemsByRowCol(layout);
      expect(sorted.length).toBe(2);
    });
  });

  describe("sortLayoutItemsByColRow", () => {
    it("sorts by column then row", () => {
      const layout = [
        createLayoutItem({ i: "c", x: 1, y: 1 }),
        createLayoutItem({ i: "a", x: 0, y: 1 }),
        createLayoutItem({ i: "b", x: 0, y: 0 }),
      ];
      const sorted = sortLayoutItemsByColRow(layout);
      expect(sorted.map((l) => l.i)).toEqual(["b", "a", "c"]);
    });
  });

  describe("sortLayoutItems", () => {
    it("uses row-col for vertical compact", () => {
      const layout = [
        createLayoutItem({ i: "b", x: 1, y: 0 }),
        createLayoutItem({ i: "a", x: 0, y: 0 }),
      ];
      const sorted = sortLayoutItems(layout, "vertical");
      expect(sorted[0].i).toBe("a");
    });

    it("uses col-row for horizontal compact", () => {
      const layout = [
        createLayoutItem({ i: "b", x: 0, y: 1 }),
        createLayoutItem({ i: "a", x: 0, y: 0 }),
      ];
      const sorted = sortLayoutItems(layout, "horizontal");
      expect(sorted[0].i).toBe("a");
    });

    it("returns original for null compactType", () => {
      const layout = simpleLayout;
      expect(sortLayoutItems(layout, null)).toBe(layout);
    });

    it("returns original for undefined compactType", () => {
      const layout = simpleLayout;
      expect(sortLayoutItems(layout, undefined)).toBe(layout);
    });
  });

  // --- TRANSFORM ---
  describe("setTransform", () => {
    it("generates correct CSS transform", () => {
      const pos = { left: 10, top: 20, width: 100, height: 200, deg: 0 };
      const style = setTransform(pos);

      expect(style.transform).toContain("translate(10px,20px)");
      expect(style.width).toBe("100px");
      expect(style.height).toBe("200px");
      expect(style.position).toBe("absolute");
    });

    it("includes scale factor", () => {
      const pos = { left: 0, top: 0, width: 100, height: 100, deg: 0 };
      const style = setTransform(pos, 1.5);
      expect(style.transform).toContain("scale(1.5)");
    });

    it("includes rotation", () => {
      const pos = { left: 0, top: 0, width: 100, height: 100, deg: 45 };
      const style = setTransform(pos);
      expect(style.transform).toContain("rotate(45deg)");
    });

    it("handles undefined deg", () => {
      const pos: Position = { left: 0, top: 0, width: 100, height: 100 };
      const style = setTransform(pos);
      expect(style.transform).toContain("rotate(0deg)");
    });

    it("includes vendor prefixes", () => {
      const pos = { left: 0, top: 0, width: 100, height: 100, deg: 0 };
      const style = setTransform(pos);
      expect(style.WebkitTransform).toBeDefined();
      expect(style.MozTransform).toBeDefined();
      expect(style.msTransform).toBeDefined();
      expect(style.OTransform).toBeDefined();
    });

    it("defaults scale to 1", () => {
      const pos = { left: 0, top: 0, width: 100, height: 100, deg: 0 };
      const style = setTransform(pos);
      expect(style.transform).toContain("scale(1)");
    });
  });

  // --- RESIZE IN DIRECTION ---
  describe("resizeItemInDirection", () => {
    const currentSize = { left: 50, top: 50, width: 100, height: 100, deg: 0 };

    it("handles south-east resize", () => {
      const newSize = { ...currentSize, width: 150, height: 150 };
      const result = resizeItemInDirection("se", currentSize, newSize, 1000);
      expect(result.width).toBe(150);
      expect(result.height).toBe(150);
    });

    it("handles east resize", () => {
      const newSize = { ...currentSize, width: 150 };
      const result = resizeItemInDirection("e", currentSize, newSize, 1000);
      expect(result.width).toBe(150);
    });

    it("handles south resize", () => {
      const newSize = { ...currentSize, height: 150 };
      const result = resizeItemInDirection("s", currentSize, newSize, 1000);
      expect(result.height).toBe(150);
    });

    it("handles north resize (adjusts top)", () => {
      const newSize = { ...currentSize, height: 150 };
      const result = resizeItemInDirection("n", currentSize, newSize, 1000);
      expect(result.height).toBe(150);
    });

    it("handles west resize (adjusts left)", () => {
      const newSize = { ...currentSize, width: 150 };
      const result = resizeItemInDirection("w", currentSize, newSize, 1000);
      expect(result.width).toBeLessThanOrEqual(150);
    });

    it("constrains to container width for east resize", () => {
      const position = { left: 900, top: 0, width: 100, height: 100, deg: 0 };
      const newSize = { ...position, width: 200 };
      const result = resizeItemInDirection("e", position, newSize, 1000);
      expect(result.width).toBe(100); // Can't expand past container
    });

    it("constrains left to non-negative for west resize", () => {
      const position = { left: 10, top: 0, width: 100, height: 100, deg: 0 };
      const newSize = { ...position, width: 200 };
      const result = resizeItemInDirection("w", position, newSize, 1000);
      expect(result.left).toBeGreaterThanOrEqual(0);
    });

    it("handles corner resize ne", () => {
      const newSize = { ...currentSize, width: 150, height: 150 };
      const result = resizeItemInDirection("ne", currentSize, newSize, 1000);
      expect(result).toBeDefined();
    });

    it("handles corner resize nw", () => {
      const newSize = { ...currentSize, width: 150, height: 150 };
      const result = resizeItemInDirection("nw", currentSize, newSize, 1000);
      expect(result).toBeDefined();
    });

    it("handles corner resize sw", () => {
      const newSize = { ...currentSize, width: 150, height: 150 };
      const result = resizeItemInDirection("sw", currentSize, newSize, 1000);
      expect(result).toBeDefined();
    });
  });

  describe("synchronizeLayoutWithChildren", () => {
    it("keeps existing layout item when child matches", () => {
      const initialLayout = [
        createLayoutItem({ i: "a", x: 1, y: 2, w: 2, h: 2 }),
      ];
      const children = React.createElement("div", { key: "a" });
      const next = synchronizeLayoutWithChildren(
        initialLayout,
        children,
        12,
        getCompactor("vertical", false, false),
      );
      const item = next.find((entry) => entry.i === "a");
      expect(item?.x).toBe(1);
      expect(item?.y).toBe(0);
    });

    it("drops layout items without matching children", () => {
      const initialLayout = [
        createLayoutItem({ i: "a", x: 2, y: 3, w: 2, h: 2 }),
      ];
      const children = React.createElement("div", { key: "b" });
      const next = synchronizeLayoutWithChildren(
        initialLayout,
        children,
        12,
        getCompactor("vertical", false, false),
      );
      expect(next.map((entry) => entry.i)).toEqual(["b"]);
    });

    it("adds new items at the bottom when missing from initial layout", () => {
      const initialLayout = [
        createLayoutItem({ i: "a", x: 0, y: 0, w: 1, h: 1 }),
      ];
      const children = [
        React.createElement("div", { key: "a" }),
        React.createElement("div", { key: "b" }),
      ];
      const next = synchronizeLayoutWithChildren(
        initialLayout,
        children,
        12,
        getCompactor("vertical", false, false),
      );
      const item = next.find((entry) => entry.i === "b");
      expect(item?.y).toBe(1);
    });

    it("ignores children without keys", () => {
      const initialLayout = [createLayoutItem({ i: "a" })];
      const children = [
        React.createElement("div", null),
        React.createElement("div", { key: "a" }),
      ];
      const next = synchronizeLayoutWithChildren(
        initialLayout,
        children,
        12,
        getCompactor("vertical", false, false),
      );
      expect(next.map((entry) => entry.i)).toEqual(["a"]);
    });

    it("skips compaction when allowOverlap is true", () => {
      const initialLayout = [
        createLayoutItem({ i: "a", x: 0, y: 0, w: 2, h: 2 }),
        createLayoutItem({ i: "b", x: 0, y: 0, w: 2, h: 2 }),
      ];
      const children = [
        React.createElement("div", { key: "a" }),
        React.createElement("div", { key: "b" }),
      ];
      const next = synchronizeLayoutWithChildren(
        initialLayout,
        children,
        12,
        getCompactor("vertical", true, false),
      );
      const itemA = next.find((entry) => entry.i === "a");
      const itemB = next.find((entry) => entry.i === "b");
      expect(itemA?.x).toBe(0);
      expect(itemB?.x).toBe(0);
      expect(itemA?.y).toBe(0);
      expect(itemB?.y).toBe(0);
    });
  });

  // --- NOOP ---
  describe("noop", () => {
    it("is a function that does nothing", () => {
      expect(typeof noop).toBe("function");
      expect(noop()).toBeUndefined();
    });
  });
});
