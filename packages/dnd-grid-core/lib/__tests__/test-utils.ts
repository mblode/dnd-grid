import type { Layout, LayoutItem, PositionParams } from "../types";

export const defaultPositionParams: PositionParams = {
  gap: [10, 10, 10, 10],
  containerPadding: [10, 10, 10, 10],
  containerWidth: 1200,
  cols: 12,
  rowHeight: 150,
  maxRows: Infinity,
};

export const createLayoutItem = (
  overrides: Partial<LayoutItem> = {},
): LayoutItem => ({
  id: "test-item",
  x: 0,
  y: 0,
  w: 1,
  h: 1,
  ...overrides,
});

export const createLayout = (items: Partial<LayoutItem>[]): Layout =>
  items.map((item, index) =>
    createLayoutItem({ id: `item-${index}`, ...item }),
  );
