import { describe, expect, it } from "vitest";
import { defaultPositionParams } from "./__tests__/test-utils";
import {
  calcGridColWidth,
  calcGridItemPosition,
  calcGridItemWHPx,
  calcWH,
  calcWHRaw,
  calcXY,
  calcXYRaw,
  clamp,
} from "./calculate-utils";

describe("calculate-utils", () => {
  describe("clamp", () => {
    it("returns value when within bounds", () => {
      expect(clamp(5, 0, 10)).toBe(5);
    });

    it("returns lower bound when value is below", () => {
      expect(clamp(-5, 0, 10)).toBe(0);
    });

    it("returns upper bound when value is above", () => {
      expect(clamp(15, 0, 10)).toBe(10);
    });

    it("handles equal bounds", () => {
      expect(clamp(5, 5, 5)).toBe(5);
    });

    it("handles negative bounds", () => {
      expect(clamp(-5, -10, -1)).toBe(-5);
    });

    it("clamps to lower when value below negative range", () => {
      expect(clamp(-15, -10, -1)).toBe(-10);
    });

    it("handles zero as bounds", () => {
      expect(clamp(-1, 0, 0)).toBe(0);
      expect(clamp(1, 0, 0)).toBe(0);
    });
  });

  describe("calcGridColWidth", () => {
    it("calculates column width correctly", () => {
      const width = calcGridColWidth(defaultPositionParams);
      // (1200 - 10*(12-1) - 10 - 10) / 12 = (1200 - 110 - 20) / 12 = 89.17
      expect(width).toBeCloseTo(89.17, 1);
    });

    it("returns 0 when cols is 0", () => {
      expect(calcGridColWidth({ ...defaultPositionParams, cols: 0 })).toBe(0);
    });

    it("returns 0 when cols is negative", () => {
      expect(calcGridColWidth({ ...defaultPositionParams, cols: -1 })).toBe(0);
    });

    it("handles different margins", () => {
      const params = {
        ...defaultPositionParams,
        margin: [5, 5, 5, 5] as [number, number, number, number],
      };
      const width = calcGridColWidth(params);
      expect(width).toBeGreaterThan(0);
    });

    it("handles zero margins", () => {
      const params = {
        ...defaultPositionParams,
        margin: [0, 0, 0, 0] as [number, number, number, number],
        containerPadding: [0, 0, 0, 0] as [number, number, number, number],
      };
      const width = calcGridColWidth(params);
      expect(width).toBe(100); // 1200 / 12
    });

    it("handles large container padding", () => {
      const params = {
        ...defaultPositionParams,
        containerPadding: [50, 50, 50, 50] as [number, number, number, number],
      };
      const width = calcGridColWidth(params);
      expect(width).toBeLessThan(calcGridColWidth(defaultPositionParams));
    });
  });

  describe("calcGridItemWHPx", () => {
    it("calculates width in pixels for single unit", () => {
      const px = calcGridItemWHPx(1, 100, 10);
      expect(px).toBe(100); // 100 * 1 + max(0, 0) * 10
    });

    it("calculates width in pixels for multiple units", () => {
      const px = calcGridItemWHPx(3, 100, 10);
      expect(px).toBe(320); // 100 * 3 + 2 * 10
    });

    it("returns Infinity for infinite grid units", () => {
      expect(calcGridItemWHPx(Infinity, 100, 10)).toBe(Infinity);
    });

    it("returns -Infinity for negative infinity", () => {
      expect(calcGridItemWHPx(-Infinity, 100, 10)).toBe(-Infinity);
    });

    it("handles zero grid units", () => {
      expect(calcGridItemWHPx(0, 100, 10)).toBe(0);
    });

    it("handles zero column size", () => {
      expect(calcGridItemWHPx(2, 0, 10)).toBe(10); // 0 * 2 + 1 * 10
    });

    it("rounds to nearest integer", () => {
      const px = calcGridItemWHPx(1, 100.5, 10);
      expect(Number.isInteger(px)).toBe(true);
    });
  });

  describe("calcGridItemPosition", () => {
    it("calculates position for item at origin", () => {
      const pos = calcGridItemPosition(defaultPositionParams, 0, 0, 1, 1, 0);
      expect(pos.left).toBe(10); // containerPadding[3]
      expect(pos.top).toBe(10); // containerPadding[0]
      expect(pos.deg).toBe(0);
    });

    it("calculates position for item at x=1, y=1", () => {
      const pos = calcGridItemPosition(defaultPositionParams, 1, 1, 1, 1, 0);
      // left = (colWidth + margin[1]) * x + containerPadding[3]
      expect(pos.left).toBeGreaterThan(10);
      expect(pos.top).toBeGreaterThan(10);
    });

    it("uses resizing dimensions when state.resizing is set", () => {
      const state = { resizing: { width: 200, height: 300 } };
      const pos = calcGridItemPosition(
        defaultPositionParams,
        0,
        0,
        1,
        1,
        0,
        state,
      );
      expect(pos.width).toBe(200);
      expect(pos.height).toBe(300);
    });

    it("uses dragging position when state.dragging is set", () => {
      const state = { dragging: { top: 50, left: 100, deg: 15 } };
      const pos = calcGridItemPosition(
        defaultPositionParams,
        0,
        0,
        1,
        1,
        0,
        state,
      );
      expect(pos.top).toBe(50);
      expect(pos.left).toBe(100);
      expect(pos.deg).toBe(15);
    });

    it("uses resizing top/left when available", () => {
      const state = {
        resizing: { width: 200, height: 300, top: 75, left: 125 },
      };
      const pos = calcGridItemPosition(
        defaultPositionParams,
        0,
        0,
        1,
        1,
        45,
        state,
      );
      expect(pos.top).toBe(75);
      expect(pos.left).toBe(125);
      expect(pos.deg).toBe(45);
    });

    it("includes rotation degree", () => {
      const pos = calcGridItemPosition(defaultPositionParams, 0, 0, 1, 1, 45);
      expect(pos.deg).toBe(45);
    });

    it("handles null state", () => {
      const pos = calcGridItemPosition(
        defaultPositionParams,
        0,
        0,
        1,
        1,
        0,
        null,
      );
      expect(pos.left).toBe(10);
      expect(pos.top).toBe(10);
    });

    it("handles undefined state", () => {
      const pos = calcGridItemPosition(
        defaultPositionParams,
        0,
        0,
        1,
        1,
        0,
        undefined,
      );
      expect(pos.left).toBe(10);
      expect(pos.top).toBe(10);
    });

    it("calculates correct width for multi-column item", () => {
      const pos = calcGridItemPosition(defaultPositionParams, 0, 0, 4, 2, 0);
      expect(pos.width).toBeGreaterThan(0);
      expect(pos.height).toBeGreaterThan(0);
    });
  });

  describe("calcXY", () => {
    it("converts pixel position to grid coordinates at origin", () => {
      const { x, y } = calcXY(defaultPositionParams, 10, 10, 1, 1);
      expect(x).toBe(0);
      expect(y).toBe(0);
    });

    it("clamps to valid grid bounds for negative pixels", () => {
      const { x, y } = calcXY(defaultPositionParams, -100, -100, 1, 1);
      expect(x).toBe(0);
      expect(y).toBe(0);
    });

    it("respects maxRows constraint", () => {
      const params = { ...defaultPositionParams, maxRows: 5 };
      const { y } = calcXY(params, 10000, 0, 1, 1);
      expect(y).toBe(4); // maxRows - h
    });

    it("respects cols constraint", () => {
      const { x } = calcXY(defaultPositionParams, 0, 10000, 1, 1);
      expect(x).toBe(11); // cols - w
    });

    it("accounts for item width when clamping x", () => {
      const { x } = calcXY(defaultPositionParams, 0, 10000, 3, 1);
      expect(x).toBe(9); // cols - w = 12 - 3
    });

    it("accounts for item height when clamping y", () => {
      const params = { ...defaultPositionParams, maxRows: 10 };
      const { y } = calcXY(params, 10000, 0, 1, 3);
      expect(y).toBe(7); // maxRows - h = 10 - 3
    });

    it("rounds to nearest grid cell", () => {
      const { x, y } = calcXY(defaultPositionParams, 50, 50, 1, 1);
      expect(Number.isInteger(x)).toBe(true);
      expect(Number.isInteger(y)).toBe(true);
    });
  });

  describe("calcXYRaw", () => {
    it("does not clamp to grid bounds", () => {
      const { x, y } = calcXYRaw(defaultPositionParams, 10000, 10000);
      expect(x).toBeGreaterThan(11);
      expect(y).toBeGreaterThan(4);
    });
  });

  describe("calcWH", () => {
    it("converts pixel dimensions to grid units", () => {
      const colWidth = calcGridColWidth(defaultPositionParams);
      const { w, h } = calcWH(defaultPositionParams, colWidth, 150, 0, 0, "se");
      expect(w).toBe(1);
      expect(h).toBe(1);
    });

    it("handles west-side resize handles", () => {
      const { w } = calcWH(defaultPositionParams, 200, 150, 5, 0, "w");
      expect(w).toBeGreaterThanOrEqual(0);
    });

    it("handles north-side resize handles", () => {
      const { h } = calcWH(defaultPositionParams, 100, 300, 0, 5, "n");
      expect(h).toBeGreaterThanOrEqual(0);
    });

    it("clamps to grid bounds for se handle", () => {
      const { w, h } = calcWH(defaultPositionParams, 5000, 5000, 10, 0, "se");
      expect(w).toBeLessThanOrEqual(2); // cols - x = 12 - 10
      expect(h).toBeGreaterThanOrEqual(0);
    });

    it("allows full width for sw handle", () => {
      const { w } = calcWH(defaultPositionParams, 5000, 150, 10, 0, "sw");
      expect(w).toBeLessThanOrEqual(12); // cols
    });

    it("allows full height for nw handle", () => {
      const params = { ...defaultPositionParams, maxRows: 10 };
      const { h } = calcWH(params, 100, 5000, 0, 5, "nw");
      expect(h).toBeLessThanOrEqual(10); // maxRows
    });

    it("handles all cardinal handles", () => {
      const handles = ["s", "n", "e", "w"];
      for (const handle of handles) {
        const { w, h } = calcWH(defaultPositionParams, 200, 300, 0, 0, handle);
        expect(w).toBeGreaterThanOrEqual(0);
        expect(h).toBeGreaterThanOrEqual(0);
      }
    });

    it("handles all corner handles", () => {
      const handles = ["se", "sw", "ne", "nw"];
      for (const handle of handles) {
        const { w, h } = calcWH(defaultPositionParams, 200, 300, 0, 0, handle);
        expect(w).toBeGreaterThanOrEqual(0);
        expect(h).toBeGreaterThanOrEqual(0);
      }
    });

    it("returns zero when dimensions are zero", () => {
      const { w, h } = calcWH(defaultPositionParams, 0, 0, 0, 0, "se");
      expect(w).toBe(0);
      expect(h).toBe(0);
    });
  });

  describe("calcWHRaw", () => {
    it("returns raw grid units without clamping", () => {
      const { w, h } = calcWHRaw(defaultPositionParams, 5000, 5000);
      expect(w).toBeGreaterThan(0);
      expect(h).toBeGreaterThan(0);
    });
  });
});
