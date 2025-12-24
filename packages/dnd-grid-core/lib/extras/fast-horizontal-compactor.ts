import type { Compactor, Layout, LayoutItem, Mutable } from "../types";
import { cloneLayout, simpleOnMove } from "../utils";

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

const canPlaceAt = <TData>(
  item: LayoutItem<TData>,
  x: number,
  y: number,
  staticItems: LayoutItem<TData>[],
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

const compactHorizontalFast = <TData>(
  layout: LayoutItem<TData>[],
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
    const item = layout[i] as Mutable<LayoutItem<TData>>;

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

  compact<TLayoutData>(layout: Layout<TLayoutData>, cols: number) {
    const out = cloneLayout(layout);
    compactHorizontalFast(out, cols, false);
    return out;
  },

  onMove<TLayoutData>(
    layout: Layout<TLayoutData>,
    item: LayoutItem<TLayoutData>,
    x: number,
    y: number,
    _cols: number,
  ) {
    return simpleOnMove(layout, item, x, y);
  },
};

export const fastHorizontalOverlapCompactor: Compactor = {
  ...fastHorizontalCompactor,
  allowOverlap: true,

  compact<TLayoutData>(layout: Layout<TLayoutData>, cols: number) {
    const out = cloneLayout(layout);
    compactHorizontalFast(out, cols, true);
    return out;
  },
};
