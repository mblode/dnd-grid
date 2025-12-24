import type { Compactor, Layout, LayoutItem, Mutable } from "../types";
import {
  cloneLayout,
  cloneLayoutItem,
  sortLayoutItemsByRowCol,
} from "../utils";

const getWrapPosition = <TData>(
  item: LayoutItem<TData>,
  cols: number,
): number => item.y * cols + item.x;

const fromWrapPosition = (
  pos: number,
  cols: number,
): { x: number; y: number } => ({
  x: pos % cols,
  y: Math.floor(pos / cols),
});

const compactWrap = <TData>(
  layout: Layout<TData>,
  cols: number,
): LayoutItem<TData>[] => {
  if (layout.length === 0) return [];

  const sorted = sortLayoutItemsByRowCol(layout);
  const out: LayoutItem<TData>[] = new Array(layout.length);
  const statics = sorted.filter((item) => item.static);

  const staticPositions = new Set<number>();
  for (const s of statics) {
    for (let dy = 0; dy < s.h; dy++) {
      for (let dx = 0; dx < s.w; dx++) {
        staticPositions.add((s.y + dy) * cols + (s.x + dx));
      }
    }
  }

  let nextPos = 0;

  for (let i = 0; i < sorted.length; i++) {
    const sortedItem = sorted[i];
    if (!sortedItem) continue;

    const l = cloneLayoutItem(sortedItem);

    if (l.static) {
      const originalIndex = layout.indexOf(sortedItem);
      out[originalIndex] = l;
      l.moved = false;
      continue;
    }

    while (staticPositions.has(nextPos)) {
      nextPos++;
    }

    const { x, y } = fromWrapPosition(nextPos, cols);
    if (x + l.w > cols) {
      nextPos = (y + 1) * cols;
      while (staticPositions.has(nextPos)) {
        nextPos++;
      }
    }

    const newCoords = fromWrapPosition(nextPos, cols);
    (l as Mutable<LayoutItem<TData>>).x = newCoords.x;
    (l as Mutable<LayoutItem<TData>>).y = newCoords.y;

    nextPos += l.w;

    const originalIndex = layout.indexOf(sortedItem);
    out[originalIndex] = l;
    l.moved = false;
  }

  return out;
};

const moveInWrapMode = <TData>(
  layout: Layout<TData>,
  item: LayoutItem<TData>,
  x: number,
  y: number,
  cols: number,
): Layout<TData> => {
  const newLayout = cloneLayout(layout) as Mutable<LayoutItem<TData>>[];
  const movedItem = newLayout.find((l) => l.i === item.i);

  if (!movedItem) {
    return newLayout;
  }

  const oldPos = getWrapPosition(movedItem, cols);
  const newPos = getWrapPosition({ ...movedItem, x, y }, cols);

  if (oldPos === newPos) {
    movedItem.x = x;
    movedItem.y = y;
    movedItem.moved = true;
    return newLayout;
  }

  const isMovingEarlier = newPos < oldPos;

  const sortedItems = newLayout
    .filter((l) => !l.static)
    .sort((a, b) => getWrapPosition(a, cols) - getWrapPosition(b, cols));

  if (isMovingEarlier) {
    for (const l of sortedItems) {
      const pos = getWrapPosition(l, cols);
      if (l.i === item.i) continue;

      if (pos >= newPos && pos < oldPos) {
        const shiftedPos = pos + 1;
        const coords = fromWrapPosition(shiftedPos, cols);
        l.x = coords.x;
        l.y = coords.y;
        l.moved = true;
      }
    }
  } else {
    for (const l of sortedItems) {
      const pos = getWrapPosition(l, cols);
      if (l.i === item.i) continue;

      if (pos > oldPos && pos <= newPos) {
        const shiftedPos = pos - 1;
        const coords = fromWrapPosition(shiftedPos, cols);
        l.x = coords.x;
        l.y = coords.y;
        l.moved = true;
      }
    }
  }

  movedItem.x = x;
  movedItem.y = y;
  movedItem.moved = true;

  return newLayout;
};

export const wrapCompactor: Compactor = {
  type: "wrap",
  allowOverlap: false,

  compact<TLayoutData>(layout: Layout<TLayoutData>, cols: number) {
    return compactWrap(layout, cols);
  },

  onMove<TLayoutData>(
    layout: Layout<TLayoutData>,
    item: LayoutItem<TLayoutData>,
    x: number,
    y: number,
    cols: number,
  ) {
    return moveInWrapMode(layout, item, x, y, cols);
  },
};

export const wrapOverlapCompactor: Compactor = {
  ...wrapCompactor,
  allowOverlap: true,

  compact<TLayoutData>(layout: Layout<TLayoutData>) {
    return cloneLayout(layout);
  },
};
