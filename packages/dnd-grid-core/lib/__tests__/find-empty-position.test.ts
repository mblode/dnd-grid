import { describe, expect, it } from "vitest";
import { findEmptyPosition } from "../find-empty-position";
import { complexLayout, emptyLayout } from "./fixtures/layouts";
import { createLayout } from "./test-utils";

describe("findEmptyPosition", () => {
  it("returns the origin for empty layouts", () => {
    expect(findEmptyPosition(emptyLayout, { w: 2, h: 2 }, 12)).toEqual({
      x: 0,
      y: 0,
    });
  });

  it("returns the first available gap", () => {
    const layout = createLayout([
      { x: 0, y: 0, w: 2, h: 2 },
      { x: 4, y: 0, w: 2, h: 2 },
    ]);

    expect(findEmptyPosition(layout, { w: 2, h: 2 }, 6)).toEqual({
      x: 2,
      y: 0,
    });
  });

  it("returns the bottom when the layout is dense", () => {
    expect(findEmptyPosition(complexLayout, { w: 2, h: 2 }, 12)).toEqual({
      x: 0,
      y: 4,
    });
  });

  it("falls back to the bottom when the item cannot fit in cols", () => {
    const layout = createLayout([{ x: 0, y: 0, w: 2, h: 2 }]);

    expect(findEmptyPosition(layout, { w: 5, h: 1 }, 4)).toEqual({
      x: 0,
      y: 2,
    });
  });

  it("ignores non-finite positions when scanning", () => {
    const layout = createLayout([
      { x: 0, y: 0, w: 2, h: 2 },
      { x: 0, y: Number.POSITIVE_INFINITY, w: 2, h: 2 },
    ]);

    expect(findEmptyPosition(layout, { w: 2, h: 2 }, 4)).toEqual({
      x: 2,
      y: 0,
    });
  });
});
