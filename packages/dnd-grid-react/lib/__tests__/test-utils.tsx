import type { LayoutItem } from "../types";

// Create a layout item with defaults
export function createLayoutItem(
  overrides: Partial<LayoutItem> = {},
): LayoutItem {
  return {
    id: "test-item",
    x: 0,
    y: 0,
    w: 1,
    h: 1,
    ...overrides,
  };
}

export * from "@testing-library/react";
