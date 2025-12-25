import type {
  Compactor,
  CompactType,
  Layout,
  LayoutItem,
  Mutable,
} from "./types";
import {
  bottom,
  cloneLayout,
  cloneLayoutItem,
  collides,
  getFirstCollision,
  getStatics,
  simpleOnMove,
  sortLayoutItemsByColRow,
  sortLayoutItemsByRowCol,
} from "./utils";

export function resolveCompactionCollision<TData>(
  layout: Layout<TData>,
  item: LayoutItem<TData>,
  moveToCoord: number,
  axis: "x" | "y",
  hasStatics?: boolean,
): void {
  const sizeProp = axis === "x" ? "w" : "h";

  (item as Mutable<LayoutItem<TData>>)[axis] += 1;

  const itemIndex = layout.findIndex((l) => l.id === item.id);
  const layoutHasStatics = hasStatics ?? getStatics(layout).length > 0;

  for (let i = itemIndex + 1; i < layout.length; i++) {
    const otherItem = layout[i];
    if (otherItem === undefined) continue;
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

  (item as Mutable<LayoutItem<TData>>)[axis] = moveToCoord;
}

export function compactItemVertical<TData>(
  compareWith: Layout<TData>,
  l: LayoutItem<TData>,
  fullLayout: Layout<TData>,
  maxY: number,
): LayoutItem<TData> {
  (l as Mutable<LayoutItem<TData>>).y = Math.min(maxY, l.y);

  while (l.y > 0 && !getFirstCollision(compareWith, l)) {
    (l as Mutable<LayoutItem<TData>>).y--;
  }

  let collision: LayoutItem<TData> | undefined = getFirstCollision(
    compareWith,
    l,
  );
  while (collision !== undefined) {
    resolveCompactionCollision(fullLayout, l, collision.y + collision.h, "y");
    collision = getFirstCollision(compareWith, l);
  }

  (l as Mutable<LayoutItem<TData>>).y = Math.max(l.y, 0);
  return l;
}

export function compactItemHorizontal<TData>(
  compareWith: Layout<TData>,
  l: LayoutItem<TData>,
  cols: number,
  fullLayout: Layout<TData>,
): LayoutItem<TData> {
  while (l.x > 0 && !getFirstCollision(compareWith, l)) {
    (l as Mutable<LayoutItem<TData>>).x--;
  }

  let collision: LayoutItem<TData> | undefined = getFirstCollision(
    compareWith,
    l,
  );
  while (collision !== undefined) {
    resolveCompactionCollision(fullLayout, l, collision.x + collision.w, "x");

    if (l.x + l.w > cols) {
      (l as Mutable<LayoutItem<TData>>).x = cols - l.w;
      (l as Mutable<LayoutItem<TData>>).y++;

      while (l.x > 0 && !getFirstCollision(compareWith, l)) {
        (l as Mutable<LayoutItem<TData>>).x--;
      }
    }

    collision = getFirstCollision(compareWith, l);
  }

  (l as Mutable<LayoutItem<TData>>).x = Math.max(l.x, 0);
  return l;
}

export const verticalCompactor: Compactor = {
  type: "vertical",
  allowOverlap: false,

  compact<TLayoutData>(layout: Layout<TLayoutData>, _cols: number) {
    const compareWith = getStatics(layout);
    let maxY = bottom(compareWith);
    const sorted = sortLayoutItemsByRowCol(layout);
    const out: LayoutItem<TLayoutData>[] = new Array(layout.length);

    for (let i = 0; i < sorted.length; i++) {
      const sortedItem = sorted[i];
      if (sortedItem === undefined) continue;

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

export const horizontalCompactor: Compactor = {
  type: "horizontal",
  allowOverlap: false,

  compact<TLayoutData>(layout: Layout<TLayoutData>, cols: number) {
    const compareWith = getStatics(layout);
    const sorted = sortLayoutItemsByColRow(layout);
    const out: LayoutItem<TLayoutData>[] = new Array(layout.length);

    for (let i = 0; i < sorted.length; i++) {
      const sortedItem = sorted[i];
      if (sortedItem === undefined) continue;

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

export const noCompactor: Compactor = {
  type: null,
  allowOverlap: false,

  compact<TLayoutData>(layout: Layout<TLayoutData>, _cols: number) {
    return cloneLayout(layout);
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

export const verticalOverlapCompactor: Compactor = {
  ...verticalCompactor,
  allowOverlap: true,

  compact<TLayoutData>(layout: Layout<TLayoutData>, _cols: number) {
    return cloneLayout(layout);
  },
};

export const horizontalOverlapCompactor: Compactor = {
  ...horizontalCompactor,
  allowOverlap: true,

  compact<TLayoutData>(layout: Layout<TLayoutData>, _cols: number) {
    return cloneLayout(layout);
  },
};

export const resolveCompactor = <TData>(
  compactor?: Compactor<TData>,
): Compactor<TData> => compactor ?? verticalCompactor;

const compactorMap: Record<string, Compactor> = {
  "vertical:false": verticalCompactor,
  "vertical:true": verticalOverlapCompactor,
  "horizontal:false": horizontalCompactor,
  "horizontal:true": horizontalOverlapCompactor,
};

export function getCompactor<TData = unknown>(
  compactType: CompactType,
  allowOverlap: boolean = false,
  preventCollision: boolean = false,
): Compactor<TData> {
  const key = `${compactType}:${allowOverlap}`;
  const baseCompactor: Compactor<TData> = compactorMap[key] ?? noCompactor;

  if (preventCollision) {
    return { ...baseCompactor, preventCollision };
  }
  return baseCompactor;
}
