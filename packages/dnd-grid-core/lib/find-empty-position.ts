import type { Layout, LayoutItem } from "./types";
import { bottom } from "./utils";

type GridSize = Pick<LayoutItem<unknown>, "w" | "h">;
type GridPosition = Pick<LayoutItem<unknown>, "x" | "y">;

const hasCollision = <TData>(
  layout: Layout<TData>,
  x: number,
  y: number,
  w: number,
  h: number
): boolean => {
  for (const item of layout) {
    if (x + w <= item.x) {
      continue;
    }
    if (x >= item.x + item.w) {
      continue;
    }
    if (y + h <= item.y) {
      continue;
    }
    if (y >= item.y + item.h) {
      continue;
    }
    return true;
  }

  return false;
};

const getFiniteBottom = <TData>(layout: Layout<TData>): number => {
  const layoutBottom = bottom(layout);
  if (Number.isFinite(layoutBottom)) {
    return layoutBottom;
  }

  let max = 0;
  for (const item of layout) {
    const itemBottom = item.y + item.h;
    if (!Number.isFinite(itemBottom)) {
      continue;
    }
    if (itemBottom > max) {
      max = itemBottom;
    }
  }

  return max;
};

export const findEmptyPosition = <TData>(
  layout: Layout<TData>,
  size: GridSize,
  cols: number
): GridPosition => {
  const w = size.w;
  const h = size.h;
  const maxCols = Number.isFinite(cols) ? Math.floor(cols) : 0;
  const layoutBottom = getFiniteBottom(layout);

  if (
    !(Number.isFinite(w) && Number.isFinite(h)) ||
    maxCols <= 0 ||
    w <= 0 ||
    h <= 0 ||
    w > maxCols
  ) {
    return { x: 0, y: layoutBottom };
  }

  for (let y = 0; y <= layoutBottom; y += 1) {
    for (let x = 0; x <= maxCols - w; x += 1) {
      if (!hasCollision(layout, x, y, w, h)) {
        return { x, y };
      }
    }
  }

  return { x: 0, y: layoutBottom };
};
