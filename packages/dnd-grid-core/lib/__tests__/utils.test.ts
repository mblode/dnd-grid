import { describe, expect, it } from "vitest";
import {
  horizontalCompactor,
  noCompactor,
  verticalCompactor,
  verticalOverlapCompactor,
} from "../compactors";
import type { LayoutItem } from "../types";
import {
  bottom,
  cloneLayout,
  cloneLayoutItem,
  collides,
  correctBounds,
  getAllCollisions,
  getFirstCollision,
  getLayoutItem,
  getStatics,
  moveElement,
  moveElementAwayFromCollision,
  resizeItemInDirection,
  sortLayoutItems,
  sortLayoutItemsByColRow,
  sortLayoutItemsByRowCol,
  withLayoutItem,
} from "../utils";
import {
  collidingLayout,
  complexLayout,
  gappyLayout,
  horizontalGappyLayout,
  layoutWithStatic,
  simpleLayout,
} from "./fixtures/layouts";
import { createLayoutItem } from "./test-utils";

describe("utils", () => {
  describe("cloneLayoutItem", () => {
    it("creates a deep copy of layout item", () => {
      const item = createLayoutItem({ i: "test", x: 1, y: 2, w: 3, h: 4 });
      const cloned = cloneLayoutItem(item);

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
      const collision = getFirstCollision(simpleLayout, item);
      expect(collision).toBeUndefined();
    });

    it("returns undefined for empty layout", () => {
      const item = createLayoutItem({ x: 0, y: 0, w: 1, h: 1 });
      const collision = getFirstCollision([], item);
      expect(collision).toBeUndefined();
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

  describe("compactors", () => {
    it("compacts items vertically", () => {
      const compacted = verticalCompactor.compact(gappyLayout, 12);
      expect(compacted[0].y).toBe(0);
    });

    it("compacts items horizontally", () => {
      const compacted = horizontalCompactor.compact(horizontalGappyLayout, 12);
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
      const compacted = verticalCompactor.compact(layout, 12);
      expect(compacted.find((i) => i.i === "dynamic")?.y).toBe(2);
    });

    it("skips compaction when overlap is allowed", () => {
      const compacted = verticalOverlapCompactor.compact(collidingLayout, 12);
      expect(compacted.map(({ i, x, y, w, h }) => ({ i, x, y, w, h }))).toEqual(
        collidingLayout.map(({ i, x, y, w, h }) => ({ i, x, y, w, h })),
      );
    });

    it("handles empty layout", () => {
      const compacted = verticalCompactor.compact([], 12);
      expect(compacted).toEqual([]);
    });

    it("preserves positions with no compaction", () => {
      const compacted = noCompactor.compact(gappyLayout, 12);
      expect(compacted.map(({ i, x, y, w, h }) => ({ i, x, y, w, h }))).toEqual(
        gappyLayout.map(({ i, x, y, w, h }) => ({ i, x, y, w, h })),
      );
    });
  });

  describe("correctBounds", () => {
    it("moves items that overflow right", () => {
      const layout = [createLayoutItem({ x: 11, w: 3 })];
      const corrected = correctBounds(layout, { cols: 12 });
      expect(corrected[0].x).toBe(9);
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
      expect(corrected.length).toBe(2);
      expect(corrected[0].static).toBe(true);
      expect(corrected[1].static).toBe(true);
    });
  });

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
        verticalCompactor,
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
        verticalCompactor,
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
        verticalCompactor,
        12,
      );
      expect(newLayout).not.toBe(layout);
    });

    it("prevents collision when preventCollision is true", () => {
      const layout = cloneLayout(simpleLayout);
      const l = layout[1];
      const newLayout = moveElement(
        layout,
        l,
        0,
        0,
        true,
        { ...verticalCompactor, preventCollision: true },
        12,
      );
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
        verticalOverlapCompactor,
        12,
      );
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
        verticalCompactor,
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
        horizontalCompactor,
        12,
      );
      expect(newLayout.length).toBe(layout.length);
    });

    it("moves user-action collisions down from the current item position", () => {
      const layout = [
        createLayoutItem({
          i: "static",
          x: 0,
          y: 0,
          w: 2,
          h: 2,
          static: true,
        }),
        createLayoutItem({ i: "moving", x: 0, y: 1, w: 2, h: 2 }),
      ];
      const newLayout = moveElementAwayFromCollision(
        layout,
        layout[0],
        layout[1],
        true,
        verticalCompactor,
        12,
      );
      expect(newLayout.find((item) => item.i === "moving")?.y).toBe(2);
    });
  });

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
      const sorted = sortLayoutItems(layout, verticalCompactor);
      expect(sorted[0].i).toBe("a");
    });

    it("uses col-row for horizontal compact", () => {
      const layout = [
        createLayoutItem({ i: "b", x: 0, y: 1 }),
        createLayoutItem({ i: "a", x: 0, y: 0 }),
      ];
      const sorted = sortLayoutItems(layout, horizontalCompactor);
      expect(sorted[0].i).toBe("a");
    });

    it("returns original for no compaction", () => {
      const layout = simpleLayout;
      const sorted = sortLayoutItems(layout, noCompactor);
      expect(sorted).not.toBe(layout);
      expect(sorted).toEqual(layout);
    });
  });

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
      expect(result.width).toBe(100);
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
});
