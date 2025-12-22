import { describe, expect, it } from "vitest";
import {
  applyPositionConstraints,
  applySizeConstraints,
  aspectRatio,
  defaultConstraints,
  snapToGrid,
} from "./constraints";
import type { ConstraintContext, LayoutItem } from "./types";

const baseItem: LayoutItem = {
  i: "a",
  x: 0,
  y: 0,
  w: 2,
  h: 2,
  deg: 0,
};

const baseContext: ConstraintContext = {
  cols: 4,
  maxRows: 4,
  containerWidth: 400,
  containerHeight: 400,
  rowHeight: 100,
  margin: [10, 10, 10, 10],
  containerPadding: [0, 0, 0, 0],
  layout: [baseItem],
};

describe("constraints", () => {
  it("clamps position with default constraints", () => {
    const result = applyPositionConstraints(
      defaultConstraints,
      baseItem,
      5,
      5,
      baseContext,
    );
    expect(result.x).toBe(2);
    expect(result.y).toBe(2);
  });

  it("snaps positions to grid", () => {
    const result = applyPositionConstraints(
      [snapToGrid(2)],
      baseItem,
      3,
      3,
      baseContext,
    );
    expect(result.x).toBe(4);
    expect(result.y).toBe(4);
  });

  it("enforces aspect ratio during resize", () => {
    const result = applySizeConstraints(
      [aspectRatio(1)],
      baseItem,
      2,
      1,
      "se",
      baseContext,
    );
    expect(result.h).toBe(2);
  });
});
