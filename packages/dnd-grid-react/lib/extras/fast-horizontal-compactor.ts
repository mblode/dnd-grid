import type { Compactor, Layout, LayoutItem } from "../types";
import { cloneLayout } from "../utils";

type Mutable<T> = { -readonly [P in keyof T]: T[P] };

const ensureTideRows = (tide: number[], neededRows: number): void => {
  while (tide.length < neededRows) {
    tide.push(0);
  }
};

const getMaxTideForItem = (tide: number[], y: number, h: number): number => {
  let maxTide = 0;
  for (let row = y; row < y + h; row++) {
    const tideValue = tide[row] ?? 0;
    if (tideValue > maxTide) {
      maxTide = tideValue;
    }
  }
  return maxTide;
};

const canPlaceAt = (
  item: LayoutItem,
  x: number,
  y: number,
  staticItems: LayoutItem[],
  cols: number,
): boolean => {
  if (x + item.w > cols) return false;

  for (const staticItem of staticItems) {
    if (
      x < staticItem.x + staticItem.w &&
      x + item.w > staticItem.x &&
      y < staticItem.y + staticItem.h &&
      y + item.h > staticItem.y
    ) {
      return false;
    }
  }
  return true;
};

const compactHorizontalFast = (
  layout: LayoutItem[],
  cols: number,
  allowOverlap: boolean,
): void => {
  const numItems = layout.length;
  if (numItems === 0) return;

  layout.sort((a, b) => {
    if (a.x !== b.x) return a.x - b.x;
    if (a.y !== b.y) return a.y - b.y;
    if (a.static !== b.static) return a.static ? -1 : 1;
    return 0;
  });

  let maxRow = 0;
  for (let i = 0; i < numItems; i++) {
    const item = layout[i];
    if (!item) continue;
    const bottom = item.y + item.h;
    if (bottom > maxRow) maxRow = bottom;
  }

  const tide: number[] = new Array(maxRow).fill(0);
  const staticItems = layout.filter((item) => item.static);
  const maxRowLimit = Math.max(10_000, numItems * 100);

  for (let i = 0; i < numItems; i++) {
    const item = layout[i] as Mutable<LayoutItem>;

    if (item.static) {
      ensureTideRows(tide, item.y + item.h);
      const t = item.x + item.w;
      for (let y = item.y; y < item.y + item.h; y++) {
        if ((tide[y] ?? 0) < t) {
          tide[y] = t;
        }
      }
      continue;
    }

    let targetY = item.y;
    let targetX = 0;
    let placed = false;

    while (!placed) {
      ensureTideRows(tide, targetY + item.h);
      const maxTide = getMaxTideForItem(tide, targetY, item.h);
      targetX = maxTide;

      if (targetX + item.w <= cols) {
        if (
          allowOverlap ||
          canPlaceAt(item, targetX, targetY, staticItems, cols)
        ) {
          placed = true;
        } else {
          let maxStaticRight = targetX;
          let foundCollision = false;
          for (const staticItem of staticItems) {
            if (
              targetX < staticItem.x + staticItem.w &&
              targetX + item.w > staticItem.x &&
              targetY < staticItem.y + staticItem.h &&
              targetY + item.h > staticItem.y
            ) {
              maxStaticRight = Math.max(
                maxStaticRight,
                staticItem.x + staticItem.w,
              );
              foundCollision = true;
            }
          }

          if (foundCollision) {
            targetX = maxStaticRight;
          }

          if (foundCollision && targetX + item.w <= cols) {
            if (canPlaceAt(item, targetX, targetY, staticItems, cols)) {
              placed = true;
            } else {
              targetY++;
            }
          } else if (foundCollision) {
            targetY++;
          } else {
            placed = true;
          }
        }
      } else {
        targetY++;
      }

      if (targetY > maxRowLimit) {
        if (typeof console !== "undefined" && console.warn) {
          console.warn(
            `Fast horizontal compactor: Item "${item.i}" exceeded max row limit (${targetY}). ` +
              "This may indicate a layout that cannot be compacted within grid bounds.",
          );
        }
        targetX = 0;
        placed = true;
      }
    }

    item.x = targetX;
    item.y = targetY;
    item.moved = false;

    ensureTideRows(tide, targetY + item.h);
    const t = targetX + item.w;
    for (let y = targetY; y < targetY + item.h; y++) {
      if ((tide[y] ?? 0) < t) {
        tide[y] = t;
      }
    }
  }
};

export const fastHorizontalCompactor: Compactor = {
  type: "horizontal",
  allowOverlap: false,

  compact(layout: Layout, cols: number): Layout {
    const out = cloneLayout(layout) as LayoutItem[];
    compactHorizontalFast(out, cols, false);
    return out;
  },

  onMove(
    layout: Layout,
    item: LayoutItem,
    x: number,
    y: number,
    _cols: number,
  ): Layout {
    const newLayout = cloneLayout(layout) as Mutable<LayoutItem>[];
    const movedItem = newLayout.find((l) => l.i === item.i);
    if (movedItem) {
      movedItem.x = x;
      movedItem.y = y;
      movedItem.moved = true;
    }
    return newLayout;
  },
};

export const fastHorizontalOverlapCompactor: Compactor = {
  ...fastHorizontalCompactor,
  allowOverlap: true,

  compact(layout: Layout, cols: number): Layout {
    const out = cloneLayout(layout) as LayoutItem[];
    compactHorizontalFast(out, cols, true);
    return out;
  },
};
