import type { Compactor, Layout, LayoutItem } from "../types";
import { cloneLayout } from "../utils";

type Mutable<T> = { -readonly [P in keyof T]: T[P] };

const collides = (l1: LayoutItem, l2: LayoutItem): boolean => {
  if (l1.i === l2.i) return false;
  return (
    l1.x < l2.x + l2.w &&
    l1.x + l1.w > l2.x &&
    l1.y < l2.y + l2.h &&
    l1.y + l1.h > l2.y
  );
};

const compactVerticalFast = (
  layout: LayoutItem[],
  cols: number,
  allowOverlap: boolean,
): void => {
  const numItems = layout.length;

  layout.sort((a, b) => {
    if (a.y < b.y) return -1;
    if (a.y > b.y) return 1;
    if (a.x < b.x) return -1;
    if (a.x > b.x) return 1;
    if (a.static && !b.static) return -1;
    if (!a.static && b.static) return 1;
    return 0;
  });

  const tide: number[] = new Array(cols).fill(0);
  const staticItems = layout.filter((item) => item.static);
  const numStatics = staticItems.length;
  let staticOffset = 0;

  for (let i = 0; i < numItems; i++) {
    const item = layout[i] as Mutable<LayoutItem>;

    let x2 = item.x + item.w;
    if (x2 > cols) {
      x2 = cols;
    }

    if (item.static) {
      ++staticOffset;
    } else {
      let minGap = Number.POSITIVE_INFINITY;
      for (let x = item.x; x < x2; ++x) {
        const tideValue = tide[x] ?? 0;
        const gap = item.y - tideValue;
        if (gap < minGap) {
          minGap = gap;
        }
      }

      if (!allowOverlap || minGap > 0) {
        item.y -= minGap;
      }

      for (let j = staticOffset; !allowOverlap && j < numStatics; ++j) {
        const staticItem = staticItems[j];
        if (!staticItem) continue;
        if (staticItem.y >= item.y + item.h) {
          break;
        }

        if (collides(item, staticItem)) {
          item.y = staticItem.y + staticItem.h;

          if (j > staticOffset) {
            j = staticOffset;
          }
        }
      }

      item.moved = false;
    }

    const t = item.y + item.h;
    for (let x = item.x; x < x2; ++x) {
      const currentTide = tide[x] ?? 0;
      if (currentTide < t) {
        tide[x] = t;
      }
    }
  }
};

export const fastVerticalCompactor: Compactor = {
  type: "vertical",
  allowOverlap: false,

  compact(layout: Layout, cols: number): Layout {
    const out = cloneLayout(layout) as LayoutItem[];
    compactVerticalFast(out, cols, false);
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

export const fastVerticalOverlapCompactor: Compactor = {
  ...fastVerticalCompactor,
  allowOverlap: true,

  compact(layout: Layout, cols: number): Layout {
    const out = cloneLayout(layout) as LayoutItem[];
    compactVerticalFast(out, cols, true);
    return out;
  },
};
