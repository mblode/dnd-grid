import type { Compactor, Layout, LayoutItem } from "./types";
import {
  bottom,
  cloneLayout,
  cloneLayoutItem,
  collides,
  getFirstCollision,
  getStatics,
  sortLayoutItemsByColRow,
  sortLayoutItemsByRowCol,
} from "./utils";

type Mutable<T> = { -readonly [P in keyof T]: T[P] };

const resolveCompactionCollision = (
  layout: Layout,
  item: LayoutItem,
  moveToCoord: number,
  axis: "x" | "y",
  hasStatics?: boolean,
): void => {
  const sizeProp = axis === "x" ? "w" : "h";

  (item as Mutable<LayoutItem>)[axis] += 1;
  const itemIndex = layout.findIndex((l) => l.i === item.i);
  const layoutHasStatics = hasStatics ?? getStatics(layout).length > 0;

  for (let i = itemIndex + 1; i < layout.length; i++) {
    const otherItem = layout[i];
    if (!otherItem) continue;
    if (otherItem.static) continue;
    if (!layoutHasStatics && otherItem.y > item.y + item.h) break;

    if (collides(item, otherItem)) {
      resolveCompactionCollision(
        layout,
        otherItem,
        moveToCoord + item[sizeProp],
        axis,
        layoutHasStatics,
      );
    }
  }

  (item as Mutable<LayoutItem>)[axis] = moveToCoord;
};

const compactItemVertical = (
  compareWith: Layout,
  l: LayoutItem,
  fullLayout: Layout,
  maxY: number,
): LayoutItem => {
  (l as Mutable<LayoutItem>).y = Math.min(maxY, l.y);

  while (l.y > 0 && !getFirstCollision(compareWith, l)) {
    (l as Mutable<LayoutItem>).y--;
  }

  let collision = getFirstCollision(compareWith, l);
  while (collision) {
    resolveCompactionCollision(fullLayout, l, collision.y + collision.h, "y");
    collision = getFirstCollision(compareWith, l);
  }

  (l as Mutable<LayoutItem>).y = Math.max(l.y, 0);
  return l;
};

const compactItemHorizontal = (
  compareWith: Layout,
  l: LayoutItem,
  cols: number,
  fullLayout: Layout,
): LayoutItem => {
  while (l.x > 0 && !getFirstCollision(compareWith, l)) {
    (l as Mutable<LayoutItem>).x--;
  }

  let collision = getFirstCollision(compareWith, l);
  while (collision) {
    resolveCompactionCollision(fullLayout, l, collision.x + collision.w, "x");

    if (l.x + l.w > cols) {
      (l as Mutable<LayoutItem>).x = cols - l.w;
      (l as Mutable<LayoutItem>).y++;

      while (l.x > 0 && !getFirstCollision(compareWith, l)) {
        (l as Mutable<LayoutItem>).x--;
      }
    }

    collision = getFirstCollision(compareWith, l);
  }

  (l as Mutable<LayoutItem>).x = Math.max(l.x, 0);
  return l;
};

export const verticalCompactor: Compactor = {
  type: "vertical",
  allowOverlap: false,

  compact(layout: Layout, _cols: number): Layout {
    const compareWith = getStatics(layout);
    let maxY = bottom(compareWith);
    const sorted = sortLayoutItemsByRowCol(layout);
    const out: LayoutItem[] = new Array(layout.length);

    for (let i = 0; i < sorted.length; i++) {
      const sortedItem = sorted[i];
      if (!sortedItem) continue;

      let l = cloneLayoutItem(sortedItem);

      if (!l.static) {
        l = compactItemVertical(compareWith, l, sorted, maxY);
        maxY = Math.max(maxY, l.y + l.h);
        compareWith.push(l);
      }

      const originalIndex = layout.indexOf(sortedItem);
      out[originalIndex] = l;
      l.moved = false;
    }

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

export const horizontalCompactor: Compactor = {
  type: "horizontal",
  allowOverlap: false,

  compact(layout: Layout, cols: number): Layout {
    const compareWith = getStatics(layout);
    const sorted = sortLayoutItemsByColRow(layout);
    const out: LayoutItem[] = new Array(layout.length);

    for (let i = 0; i < sorted.length; i++) {
      const sortedItem = sorted[i];
      if (!sortedItem) continue;

      let l = cloneLayoutItem(sortedItem);

      if (!l.static) {
        l = compactItemHorizontal(compareWith, l, cols, sorted);
        compareWith.push(l);
      }

      const originalIndex = layout.indexOf(sortedItem);
      out[originalIndex] = l;
      l.moved = false;
    }

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

export const noCompactor: Compactor = {
  type: null,
  allowOverlap: false,

  compact(layout: Layout, _cols: number): Layout {
    return cloneLayout(layout);
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

export const verticalOverlapCompactor: Compactor = {
  ...verticalCompactor,
  allowOverlap: true,

  compact(layout: Layout, _cols: number): Layout {
    return cloneLayout(layout);
  },
};

export const horizontalOverlapCompactor: Compactor = {
  ...horizontalCompactor,
  allowOverlap: true,

  compact(layout: Layout, _cols: number): Layout {
    return cloneLayout(layout);
  },
};
