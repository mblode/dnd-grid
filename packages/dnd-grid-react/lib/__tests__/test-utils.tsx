import { type RenderOptions, render } from "@testing-library/react";
import type { ReactElement } from "react";
import type { Layout, LayoutItem, PositionParams } from "../types";

// Default position params for testing
export const defaultPositionParams: PositionParams = {
  margin: [10, 10, 10, 10],
  containerPadding: [10, 10, 10, 10],
  containerWidth: 1200,
  cols: 12,
  rowHeight: 150,
  maxRows: Infinity,
};

// Create a layout item with defaults
export function createLayoutItem(
  overrides: Partial<LayoutItem> = {},
): LayoutItem {
  return {
    i: "test-item",
    x: 0,
    y: 0,
    w: 1,
    h: 1,
    ...overrides,
  };
}

// Create a layout with multiple items
export function createLayout(items: Partial<LayoutItem>[]): Layout {
  return items.map((item, index) =>
    createLayoutItem({ i: `item-${index}`, ...item }),
  );
}

// Custom render with providers if needed
export function customRender(
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">,
) {
  return render(ui, { ...options });
}

export * from "@testing-library/react";
export { customRender as render };
