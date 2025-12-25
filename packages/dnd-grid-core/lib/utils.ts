import type {
  Compactor,
  Layout,
  LayoutItem,
  Position,
  ResizeHandleAxis,
} from "./types";

export const bottom = <TData>(layout: Layout<TData>): number => {
  let max = 0;
  let bottomY: number;

  for (let i = 0, len = layout.length; i < len; i++) {
    bottomY = layout[i].y + layout[i].h;
    if (bottomY > max) max = bottomY;
  }

  return max;
};

export const cloneLayout = <TData>(
  layout: Layout<TData>,
): LayoutItem<TData>[] => {
  const newLayout: LayoutItem<TData>[] = new Array(layout.length);

  for (let i = 0, len = layout.length; i < len; i++) {
    newLayout[i] = cloneLayoutItem(layout[i]);
  }

  return newLayout;
};

export const withLayoutItem = <TData>(
  layout: Layout<TData>,
  itemKey: string,
  cb: (arg0: LayoutItem<TData>) => LayoutItem<TData>,
): [Layout<TData>, LayoutItem<TData> | null | undefined] => {
  let item: LayoutItem<TData> | null = null;
  let itemIndex = -1;

  for (let i = 0, len = layout.length; i < len; i++) {
    if (layout[i].id === itemKey) {
      item = layout[i];
      itemIndex = i;
      break;
    }
  }

  if (!item) return [layout, null];

  const nextItem = cb(cloneLayoutItem(item));
  const nextLayout = Array(layout.length);

  for (let i = 0, len = layout.length; i < len; i++) {
    nextLayout[i] = i === itemIndex ? nextItem : layout[i];
  }

  return [nextLayout, nextItem];
};

export const cloneLayoutItem = <TData>(
  layoutItem: LayoutItem<TData>,
): LayoutItem<TData> => {
  const nextItem: LayoutItem<TData> = {
    w: layoutItem.w,
    h: layoutItem.h,
    x: layoutItem.x,
    y: layoutItem.y,
    id: layoutItem.id,
    minW: layoutItem.minW,
    maxW: layoutItem.maxW,
    minH: layoutItem.minH,
    maxH: layoutItem.maxH,
    constraints: layoutItem.constraints,
    moved: Boolean(layoutItem.moved),
    static: Boolean(layoutItem.static),
    draggable: layoutItem.draggable,
    resizable: layoutItem.resizable,
    resizeHandles: layoutItem.resizeHandles,
    bounded: layoutItem.bounded,
  };

  if (Object.hasOwn(layoutItem, "data")) {
    nextItem.data = layoutItem.data;
  }

  return nextItem;
};

export const collides = <TData>(
  l1: LayoutItem<TData>,
  l2: LayoutItem<TData>,
): boolean => {
  if (l1.id === l2.id) return false;
  if (l1.x + l1.w <= l2.x) return false;
  if (l1.x >= l2.x + l2.w) return false;
  if (l1.y + l1.h <= l2.y) return false;
  if (l1.y >= l2.y + l2.h) return false;
  return true;
};

export const correctBounds = <TData>(
  layout: Layout<TData>,
  bounds: { cols: number },
): Layout<TData> => {
  const collidesWith = getStatics(layout);

  for (let i = 0, len = layout.length; i < len; i++) {
    const l = layout[i];
    if (l.x + l.w > bounds.cols) l.x = bounds.cols - l.w;

    if (l.x < 0) {
      l.x = 0;
      l.w = bounds.cols;
    }

    if (!l.static) collidesWith.push(l);
    else {
      while (getFirstCollision(collidesWith, l)) {
        l.y++;
      }
    }
  }

  return layout;
};

export const getLayoutItem = <TData>(
  layout: Layout<TData>,
  id: string,
): LayoutItem<TData> | null | undefined => {
  for (let i = 0, len = layout.length; i < len; i++) {
    if (layout[i].id === id) return layout[i];
  }
};

export const getFirstCollision = <TData>(
  layout: Layout<TData>,
  layoutItem: LayoutItem<TData>,
): LayoutItem<TData> | undefined => {
  for (let i = 0, len = layout.length; i < len; i++) {
    if (collides(layout[i], layoutItem)) return layout[i];
  }
};

export const getAllCollisions = <TData>(
  layout: Layout<TData>,
  layoutItem: LayoutItem<TData>,
): LayoutItem<TData>[] => layout.filter((l) => collides(l, layoutItem));

export const getStatics = <TData>(layout: Layout<TData>): LayoutItem<TData>[] =>
  layout.filter((l) => l.static);

export const moveElement = <TData>(
  layout: Layout<TData>,
  l: LayoutItem<TData>,
  x: number | null | undefined,
  y: number | null | undefined,
  isUserAction: boolean | null | undefined,
  compactor: Compactor<TData>,
  cols: number,
): LayoutItem<TData>[] => {
  if (l.static && l.draggable !== true) return [...layout];
  if (l.y === y && l.x === x) return [...layout];
  const compactorType = compactor.type;
  const preventCollision = compactor.preventCollision === true;
  const { allowOverlap } = compactor;
  const oldX = l.x;
  const oldY = l.y;
  if (typeof x === "number") l.x = x;
  if (typeof y === "number") l.y = y;
  l.moved = true;

  let sorted = [...sortLayoutItems(layout, compactor)];
  const movingUp =
    compactorType === "vertical" && typeof y === "number"
      ? oldY >= y
      : compactorType === "horizontal" && typeof x === "number"
        ? oldX >= x
        : false;
  if (movingUp) sorted = sorted.reverse();
  const collisions = getAllCollisions(sorted, l);
  const hasCollisions = collisions.length > 0;

  if (hasCollisions && allowOverlap) {
    return cloneLayout(layout);
  } else if (hasCollisions && preventCollision) {
    l.x = oldX;
    l.y = oldY;
    l.moved = false;
    return layout as LayoutItem<TData>[];
  }

  let resultLayout: LayoutItem<TData>[] = [...layout];
  for (let i = 0, len = collisions.length; i < len; i++) {
    const collision = collisions[i];
    if (collision.moved) continue;

    if (collision.static) {
      resultLayout = moveElementAwayFromCollision(
        resultLayout,
        collision,
        l,
        isUserAction,
        compactor,
        cols,
      );
    } else {
      resultLayout = moveElementAwayFromCollision(
        resultLayout,
        l,
        collision,
        isUserAction,
        compactor,
        cols,
      );
    }
  }

  return resultLayout;
};

export const moveElementAwayFromCollision = <TData>(
  layout: Layout<TData>,
  collidesWith: LayoutItem<TData>,
  itemToMove: LayoutItem<TData>,
  isUserAction: boolean | null | undefined,
  compactor: Compactor<TData>,
  cols: number,
): LayoutItem<TData>[] => {
  const compactorType = compactor.type;
  const compactH = compactorType === "horizontal";
  const compactV = compactorType === "vertical";
  const preventCollision = collidesWith.static;

  if (isUserAction) {
    isUserAction = false;
    const fakeItem: LayoutItem<TData> = {
      x: compactH ? Math.max(collidesWith.x - itemToMove.w, 0) : itemToMove.x,
      y: compactV ? Math.max(collidesWith.y - itemToMove.h, 0) : itemToMove.y,
      w: itemToMove.w,
      h: itemToMove.h,
      id: "-1",
    };
    const firstCollision = getFirstCollision(layout, fakeItem);
    const collisionNorth =
      firstCollision !== undefined &&
      firstCollision.y + firstCollision.h > collidesWith.y;
    const collisionWest =
      firstCollision !== undefined &&
      collidesWith.x + collidesWith.w > firstCollision.x;

    if (!firstCollision) {
      return moveElement(
        layout,
        itemToMove,
        compactH ? fakeItem.x : undefined,
        compactV ? fakeItem.y : undefined,
        isUserAction,
        { ...compactor, preventCollision },
        cols,
      );
    } else if (collisionNorth && compactV) {
      return moveElement(
        layout,
        itemToMove,
        undefined,
        itemToMove.y + 1,
        isUserAction,
        { ...compactor, preventCollision },
        cols,
      );
    } else if (collisionNorth && compactorType === null) {
      collidesWith.y = itemToMove.y;
      itemToMove.y = itemToMove.y + itemToMove.h;
      return [...layout];
    } else if (collisionWest && compactH) {
      return moveElement(
        layout,
        collidesWith,
        itemToMove.x,
        undefined,
        isUserAction,
        { ...compactor, preventCollision },
        cols,
      );
    }
  }

  const newX = compactH ? itemToMove.x + 1 : undefined;
  const newY = compactV ? itemToMove.y + 1 : undefined;

  if (newX === undefined && newY === undefined) {
    return [...layout];
  }

  return moveElement(
    layout,
    itemToMove,
    newX,
    newY,
    isUserAction,
    { ...compactor, preventCollision },
    cols,
  );
};

const constrainWidth = (
  left: number,
  currentWidth: number,
  newWidth: number,
  containerWidth: number,
) => {
  return left + newWidth > containerWidth ? currentWidth : newWidth;
};

const constrainHeight = (
  top: number,
  currentHeight: number,
  newHeight: number,
) => {
  return top < 0 ? currentHeight : newHeight;
};

const constrainLeft = (left: number) => Math.max(0, left);

const constrainTop = (top: number) => Math.max(0, top);

type SizePosition = Pick<Position, "top" | "left" | "width" | "height">;

type ResizeHandler = (
  currentSize: SizePosition,
  nextSize: SizePosition,
  containerWidth: number,
) => SizePosition;

const resizeNorth: ResizeHandler = (
  currentSize,
  { left, height, width },
  _containerWidth,
) => {
  const top = currentSize.top - (height - currentSize.height);
  return {
    left,
    width,
    height: constrainHeight(top, currentSize.height, height),
    top: constrainTop(top),
  };
};

const resizeEast: ResizeHandler = (
  currentSize,
  { top, left, height, width },
  containerWidth,
) => ({
  top,
  height,
  width: constrainWidth(
    currentSize.left,
    currentSize.width,
    width,
    containerWidth,
  ),
  left: constrainLeft(left),
});

const resizeWest: ResizeHandler = (
  currentSize,
  { top, height, width },
  _containerWidth,
) => {
  const left = currentSize.left + currentSize.width - width;
  return {
    height,
    width: left < 0 ? currentSize.left + currentSize.width : width,
    top: constrainTop(top),
    left: constrainLeft(left),
  };
};

const resizeSouth: ResizeHandler = (
  currentSize,
  { top, left, height, width },
  _containerWidth,
) => ({
  width,
  left,
  height: constrainHeight(top, currentSize.height, height),
  top: constrainTop(top),
});

const resizeNorthEast: ResizeHandler = (
  currentSize,
  nextSize,
  containerWidth,
) =>
  resizeNorth(
    currentSize,
    resizeEast(currentSize, nextSize, containerWidth),
    containerWidth,
  );

const resizeNorthWest: ResizeHandler = (
  currentSize,
  nextSize,
  containerWidth,
) =>
  resizeNorth(
    currentSize,
    resizeWest(currentSize, nextSize, containerWidth),
    containerWidth,
  );

const resizeSouthEast: ResizeHandler = (
  currentSize,
  nextSize,
  containerWidth,
) =>
  resizeSouth(
    currentSize,
    resizeEast(currentSize, nextSize, containerWidth),
    containerWidth,
  );

const resizeSouthWest: ResizeHandler = (
  currentSize,
  nextSize,
  containerWidth,
) =>
  resizeSouth(
    currentSize,
    resizeWest(currentSize, nextSize, containerWidth),
    containerWidth,
  );

const ordinalResizeHandlerMap: Record<ResizeHandleAxis, ResizeHandler> = {
  n: resizeNorth,
  ne: resizeNorthEast,
  e: resizeEast,
  se: resizeSouthEast,
  s: resizeSouth,
  sw: resizeSouthWest,
  w: resizeWest,
  nw: resizeNorthWest,
};

export const resizeItemInDirection = (
  direction: ResizeHandleAxis,
  currentSize: Position,
  newSize: Partial<Position>,
  containerWidth: number,
): Position => {
  const ordinalHandler = ordinalResizeHandlerMap[direction];
  if (!ordinalHandler) return { ...currentSize, ...newSize };
  return ordinalHandler(
    currentSize,
    { ...currentSize, ...newSize },
    containerWidth,
  );
};

export const sortLayoutItems = <TData>(
  layout: Layout<TData>,
  compactor: Compactor<TData>,
): Layout<TData> => {
  const compactorType = compactor.type;
  if (compactorType === "horizontal") return sortLayoutItemsByColRow(layout);
  if (compactorType === "vertical") return sortLayoutItemsByRowCol(layout);
  return layout.slice(0);
};

export const sortLayoutItemsByRowCol = <TData>(
  layout: Layout<TData>,
): Layout<TData> =>
  layout.slice(0).sort((a, b) => {
    if (a.y !== b.y) return a.y - b.y;
    return a.x - b.x;
  });

export const sortLayoutItemsByColRow = <TData>(
  layout: Layout<TData>,
): Layout<TData> =>
  layout.slice(0).sort((a, b) => {
    if (a.x !== b.x) return a.x - b.x;
    return a.y - b.y;
  });

export const simpleOnMove = <TData>(
  layout: Layout<TData>,
  item: LayoutItem<TData>,
  x: number,
  y: number,
): Layout<TData> => {
  const newLayout = cloneLayout(layout);
  const movedItem = newLayout.find((l) => l.id === item.id);
  if (movedItem) {
    movedItem.x = x;
    movedItem.y = y;
    movedItem.moved = true;
  }
  return newLayout;
};
