import type { Compactor, Layout, LayoutItem, Mutable } from "../types";
import { cloneLayout, collides, simpleOnMove } from "../utils";

const compactVerticalFast = <TData>(
  layout: LayoutItem<TData>[],
  cols: number,
  allowOverlap: boolean
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Compaction algorithm requires nested loops and conditional logic
): void => {
  const numItems = layout.length;

  layout.sort((a, b) => {
    if (a.y < b.y) {
      return -1;
    }
    if (a.y > b.y) {
      return 1;
    }
    if (a.x < b.x) {
      return -1;
    }
    if (a.x > b.x) {
      return 1;
    }
    if (a.static && !b.static) {
      return -1;
    }
    if (!a.static && b.static) {
      return 1;
    }
    return 0;
  });

  const tide: number[] = new Array(cols).fill(0);
  const staticItems = layout.filter((item) => item.static);
  const numStatics = staticItems.length;
  let staticOffset = 0;

  for (let i = 0; i < numItems; i++) {
    const item = layout[i] as Mutable<LayoutItem<TData>>;

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
        if (!staticItem) {
          continue;
        }
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

  compact<TLayoutData>(layout: Layout<TLayoutData>, cols: number) {
    const out = cloneLayout(layout);
    compactVerticalFast(out, cols, false);
    return out;
  },

  onMove<TLayoutData>(
    layout: Layout<TLayoutData>,
    item: LayoutItem<TLayoutData>,
    x: number,
    y: number,
    _cols: number
  ) {
    return simpleOnMove(layout, item, x, y);
  },
};

export const fastVerticalOverlapCompactor: Compactor = {
  ...fastVerticalCompactor,
  allowOverlap: true,

  compact<TLayoutData>(layout: Layout<TLayoutData>, cols: number) {
    const out = cloneLayout(layout);
    compactVerticalFast(out, cols, true);
    return out;
  },
};
