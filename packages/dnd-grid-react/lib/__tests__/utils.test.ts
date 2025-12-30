import React from "react";
import { describe, expect, it, vi } from "vitest";
import { verticalCompactor, verticalOverlapCompactor } from "../compactors";
import type { Position } from "../types";
import {
  childrenEqual,
  noop,
  setTransform,
  synchronizeLayoutWithChildren,
} from "../utils";
import { createLayoutItem } from "./test-utils";

describe("utils", () => {
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

  describe("synchronizeLayoutWithChildren", () => {
    it("keeps existing layout item when child matches", () => {
      const initialLayout = [
        createLayoutItem({ id: "a", x: 1, y: 2, w: 2, h: 2 }),
      ];
      const children = React.createElement("div", { key: "a" });
      const next = synchronizeLayoutWithChildren(
        initialLayout,
        children,
        12,
        verticalCompactor
      );
      const item = next.find((entry) => entry.id === "a");
      expect(item?.x).toBe(1);
      expect(item?.y).toBe(0);
    });

    it("drops layout items without matching children", () => {
      const initialLayout = [
        createLayoutItem({ id: "a", x: 2, y: 3, w: 2, h: 2 }),
      ];
      const children = React.createElement("div", { key: "b" });
      const next = synchronizeLayoutWithChildren(
        initialLayout,
        children,
        12,
        verticalCompactor
      );
      expect(next.map((entry) => entry.id)).toEqual(["b"]);
    });

    it("adds new items at the bottom when missing from initial layout", () => {
      const initialLayout = [
        createLayoutItem({ id: "a", x: 0, y: 0, w: 1, h: 1 }),
      ];
      const children = [
        React.createElement("div", { key: "a" }),
        React.createElement("div", { key: "b" }),
      ];
      const next = synchronizeLayoutWithChildren(
        initialLayout,
        children,
        12,
        verticalCompactor
      );
      const item = next.find((entry) => entry.id === "b");
      expect(item?.y).toBe(1);
    });

    it("ignores children without keys", () => {
      const initialLayout = [createLayoutItem({ id: "a" })];
      const children = [
        React.createElement("div", null),
        React.createElement("div", { key: "a" }),
      ];
      const next = synchronizeLayoutWithChildren(
        initialLayout,
        children,
        12,
        verticalCompactor
      );
      expect(next.map((entry) => entry.id)).toEqual(["a"]);
    });

    it("skips compaction when allowOverlap is true", () => {
      const initialLayout = [
        createLayoutItem({ id: "a", x: 0, y: 0, w: 2, h: 2 }),
        createLayoutItem({ id: "b", x: 0, y: 0, w: 2, h: 2 }),
      ];
      const children = [
        React.createElement("div", { key: "a" }),
        React.createElement("div", { key: "b" }),
      ];
      const next = synchronizeLayoutWithChildren(
        initialLayout,
        children,
        12,
        verticalOverlapCompactor
      );
      const itemA = next.find((entry) => entry.id === "a");
      const itemB = next.find((entry) => entry.id === "b");
      expect(itemA?.x).toBe(0);
      expect(itemB?.x).toBe(0);
      expect(itemA?.y).toBe(0);
      expect(itemB?.y).toBe(0);
    });

    it("warns once for missing layout items", () => {
      const consoleWarn = vi
        .spyOn(console, "warn")
        .mockImplementation(() => {});
      const warnings = {
        missingLayoutItems: new Set<string>(),
        unusedLayoutItems: new Set<string>(),
      };
      const initialLayout = [createLayoutItem({ id: "a", x: 1, y: 2 })];
      const children = [
        React.createElement("div", { key: "a" }),
        React.createElement("div", { key: "b" }),
      ];
      synchronizeLayoutWithChildren(
        initialLayout,
        children,
        12,
        verticalCompactor,
        warnings
      );
      synchronizeLayoutWithChildren(
        initialLayout,
        children,
        12,
        verticalCompactor,
        warnings
      );

      expect(consoleWarn).toHaveBeenCalledTimes(1);
      expect(consoleWarn).toHaveBeenCalledWith(
        'DndGrid: Missing layout item for child key "b". Add a layout entry with id: "b".'
      );
      consoleWarn.mockRestore();
    });

    it("warns once for unused layout items", () => {
      const consoleWarn = vi
        .spyOn(console, "warn")
        .mockImplementation(() => {});
      const warnings = {
        missingLayoutItems: new Set<string>(),
        unusedLayoutItems: new Set<string>(),
      };
      const initialLayout = [createLayoutItem({ id: "a", x: 1, y: 2 })];
      const children = null;
      synchronizeLayoutWithChildren(
        initialLayout,
        children,
        12,
        verticalCompactor,
        warnings
      );
      synchronizeLayoutWithChildren(
        initialLayout,
        children,
        12,
        verticalCompactor,
        warnings
      );

      expect(consoleWarn).toHaveBeenCalledTimes(1);
      expect(consoleWarn).toHaveBeenCalledWith(
        'DndGrid: Layout item "a" has no matching child and will be ignored.'
      );
      consoleWarn.mockRestore();
    });
  });

  describe("noop", () => {
    it("is a function that does nothing", () => {
      expect(typeof noop).toBe("function");
      expect(noop()).toBeUndefined();
    });
  });
});
