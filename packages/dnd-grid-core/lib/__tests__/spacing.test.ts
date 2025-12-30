import { describe, expect, it } from "vitest";
import { normalizeSpacing, resolveResponsiveSpacing } from "../spacing";
import type { Spacing } from "../types";

describe("spacing", () => {
  describe("normalizeSpacing", () => {
    it("expands number to four sides", () => {
      expect(normalizeSpacing(12)).toEqual([12, 12, 12, 12]);
    });

    it("expands object to [top, right, bottom, left]", () => {
      expect(
        normalizeSpacing({ top: 4, right: 8, bottom: 12, left: 16 })
      ).toEqual([4, 8, 12, 16]);
    });

    it("throws on array input", () => {
      expect(() =>
        normalizeSpacing([1, 2, 3, 4] as unknown as Spacing)
      ).toThrow(
        "DndGrid: gap/containerPadding no longer accept arrays. Use a number or { top, right, bottom, left }."
      );
    });
  });

  describe("resolveResponsiveSpacing", () => {
    it("returns matching breakpoint value", () => {
      expect(
        resolveResponsiveSpacing<"lg" | "md">({ lg: 16, md: 8 }, "md")
      ).toBe(8);
    });

    it("falls back to first defined value", () => {
      expect(resolveResponsiveSpacing<"lg" | "sm">({ lg: 16 }, "sm")).toBe(16);
    });

    it("throws on array input", () => {
      expect(() =>
        resolveResponsiveSpacing([12, 12, 12, 12] as unknown as Spacing, "lg")
      ).toThrow(
        "DndGrid: responsive spacing does not accept arrays. Use numbers or { top, right, bottom, left }."
      );
    });
  });
});
