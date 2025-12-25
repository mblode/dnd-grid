import { describe, expect, it } from "vitest";
import {
  calcGridColWidth,
  calcGridItemPosition,
  calcGridItemWHPx,
  calcWHRaw,
  calcXY,
  calcXYRaw,
  clamp,
} from "../calculate-utils";
import { defaultPositionParams } from "./test-utils";

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
      expect(width).toBeCloseTo(89.17, 1);
    });

    it("returns 0 when cols is 0", () => {
      expect(calcGridColWidth({ ...defaultPositionParams, cols: 0 })).toBe(0);
    });

    it("returns 0 when cols is negative", () => {
      expect(calcGridColWidth({ ...defaultPositionParams, cols: -1 })).toBe(0);
    });

    it("handles different gaps", () => {
      const params = {
        ...defaultPositionParams,
        gap: [5, 5, 5, 5] as [number, number, number, number],
      };
      const width = calcGridColWidth(params);
      expect(width).toBeGreaterThan(0);
    });

    it("handles zero gaps", () => {
      const params = {
        ...defaultPositionParams,
        gap: [0, 0, 0, 0] as [number, number, number, number],
        containerPadding: [0, 0, 0, 0] as [number, number, number, number],
      };
      const width = calcGridColWidth(params);
      expect(width).toBe(100);
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
      expect(px).toBe(100);
    });

    it("calculates width in pixels for multiple units", () => {
      const px = calcGridItemWHPx(3, 100, 10);
      expect(px).toBe(320);
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
      expect(calcGridItemWHPx(2, 0, 10)).toBe(10);
    });

    it("rounds to nearest integer", () => {
      const px = calcGridItemWHPx(1, 100.5, 10);
      expect(Number.isInteger(px)).toBe(true);
    });
  });

  describe("calcGridItemPosition", () => {
    it("calculates position for item at origin", () => {
      const pos = calcGridItemPosition(defaultPositionParams, 0, 0, 1, 1, 0);
      expect(pos.left).toBe(10);
      expect(pos.top).toBe(10);
      expect(pos.deg).toBe(0);
    });

    it("calculates position for item at x=1, y=1", () => {
      const pos = calcGridItemPosition(defaultPositionParams, 1, 1, 1, 1, 0);
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
      expect(y).toBe(4);
    });

    it("respects cols constraint", () => {
      const { x } = calcXY(defaultPositionParams, 0, 10000, 1, 1);
      expect(x).toBe(11);
    });

    it("accounts for item width when clamping x", () => {
      const { x } = calcXY(defaultPositionParams, 0, 10000, 3, 1);
      expect(x).toBe(9);
    });

    it("accounts for item height when clamping y", () => {
      const params = { ...defaultPositionParams, maxRows: 10 };
      const { y } = calcXY(params, 10000, 0, 1, 3);
      expect(y).toBe(7);
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

  describe("calcWHRaw", () => {
    it("returns raw grid units without clamping", () => {
      const { w, h } = calcWHRaw(defaultPositionParams, 5000, 5000);
      expect(w).toBeGreaterThan(0);
      expect(h).toBeGreaterThan(0);
    });
  });
});
