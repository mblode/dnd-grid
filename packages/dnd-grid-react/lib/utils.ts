import { deepEqual } from "fast-equals";
import type { ReactNode } from "react";
import React from "react";
import type {
  Compactor,
  Layout,
  LayoutItem,
  Position,
  ResizeHandleAxis,
} from "./types";

/**
 * Return the bottom coordinate of the layout.
 */
export const bottom = (layout: Layout): number => {
  let max = 0;
  let bottomY: number;

  for (let i = 0, len = layout.length; i < len; i++) {
    bottomY = layout[i].y + layout[i].h;
    if (bottomY > max) max = bottomY;
  }

  return max;
};
export const cloneLayout = (layout: Layout): LayoutItem[] => {
  const newLayout: LayoutItem[] = new Array(layout.length);

  for (let i = 0, len = layout.length; i < len; i++) {
    newLayout[i] = cloneLayoutItem(layout[i]);
  }

  return newLayout;
};
// Modify a layoutItem inside a layout. Returns a new Layout,
// does not mutate. Carries over all other LayoutItems unmodified.
// Function to be called to modify a layout item.
// Does defensive clones to ensure the layout is not modified.
export const withLayoutItem = (
  layout: Layout,
  itemKey: string,
  cb: (arg0: LayoutItem) => LayoutItem,
): [Layout, LayoutItem | null | undefined] => {
  let item: LayoutItem | null = null;
  let itemIndex = -1;

  for (let i = 0, len = layout.length; i < len; i++) {
    if (layout[i].i === itemKey) {
      item = layout[i];
      itemIndex = i;
      break;
    }
  }

  if (!item) return [layout, null];

  const nextItem = cb(cloneLayoutItem(item)); // defensive clone then modify
  const nextLayout = Array(layout.length);

  for (let i = 0, len = layout.length; i < len; i++) {
    nextLayout[i] = i === itemIndex ? nextItem : layout[i];
  }

  return [nextLayout, nextItem];
};
// Fast path to cloning, since this is monomorphic
export const cloneLayoutItem = (layoutItem: LayoutItem): LayoutItem => ({
  w: layoutItem.w,
  h: layoutItem.h,
  x: layoutItem.x,
  y: layoutItem.y,
  i: layoutItem.i,
  minW: layoutItem.minW,
  maxW: layoutItem.maxW,
  minH: layoutItem.minH,
  maxH: layoutItem.maxH,
  constraints: layoutItem.constraints,
  moved: Boolean(layoutItem.moved),
  static: Boolean(layoutItem.static),
  // These can be null/undefined
  isDraggable: layoutItem.isDraggable,
  isResizable: layoutItem.isResizable,
  resizeHandles: layoutItem.resizeHandles,
  isBounded: layoutItem.isBounded,
});

/**
 * Comparing React `children` is a bit difficult. This is a good way to compare them.
 * This will catch differences in keys, order, and length.
 */
export const childrenEqual = (a: ReactNode, b: ReactNode): boolean => {
  // Since React.Children.map can return undefined or null,
  // ensure the results are arrays before passing to deepEqual.
  const mapChildrenKeys = (children: ReactNode) =>
    React.Children.map(children, (c) =>
      React.isValidElement(c) ? c.key : null,
    ) || [];
  return deepEqual(mapChildrenKeys(a), mapChildrenKeys(b));
};

/**
 * Given two layoutitems, check if they collide.
 */
export const collides = (l1: LayoutItem, l2: LayoutItem): boolean => {
  if (l1.i === l2.i) return false; // same element
  if (l1.x + l1.w <= l2.x) return false; // l1 is left of l2
  if (l1.x >= l2.x + l2.w) return false; // l1 is right of l2
  if (l1.y + l1.h <= l2.y) return false; // l1 is above l2
  if (l1.y >= l2.y + l2.h) return false; // l1 is below l2
  return true; // boxes overlap
};

/**
 * Given a layout, make sure all elements fit within its bounds.
 *
 * Modifies layout items.
 */
export const correctBounds = (
  layout: Layout,
  bounds: { cols: number },
): Layout => {
  const collidesWith = getStatics(layout);

  for (let i = 0, len = layout.length; i < len; i++) {
    const l = layout[i];
    // Overflows right
    if (l.x + l.w > bounds.cols) l.x = bounds.cols - l.w;

    // Overflows left
    if (l.x < 0) {
      l.x = 0;
      l.w = bounds.cols;
    }

    if (!l.static) collidesWith.push(l);
    else {
      // If this is static and collides with other statics, we must move it down.
      // We have to do something nicer than just letting them overlap.
      while (getFirstCollision(collidesWith, l)) {
        l.y++;
      }
    }
  }

  return layout;
};

/**
 * Get a layout item by ID. Used so we can override later on if necessary.
 */
export const getLayoutItem = (
  layout: Layout,
  id: string,
): LayoutItem | null | undefined => {
  for (let i = 0, len = layout.length; i < len; i++) {
    if (layout[i].i === id) return layout[i];
  }
};

/**
 * Returns the first item this layout collides with.
 * It doesn't appear to matter which order we approach this from, although
 * perhaps that is the wrong thing to do.
 */
export const getFirstCollision = (
  layout: Layout,
  layoutItem: LayoutItem,
): LayoutItem | undefined => {
  for (let i = 0, len = layout.length; i < len; i++) {
    if (collides(layout[i], layoutItem)) return layout[i];
  }
};

export const getAllCollisions = (
  layout: Layout,
  layoutItem: LayoutItem,
): LayoutItem[] => layout.filter((l) => collides(l, layoutItem));

/**
 * Get all static elements.
 */
export const getStatics = (layout: Layout): LayoutItem[] =>
  layout.filter((l) => l.static);

/**
 * Move an element. Responsible for doing cascading movements of other elements.
 *
 * Modifies layout items.
 */
export const moveElement = (
  layout: Layout,
  l: LayoutItem,
  x: number | null | undefined,
  y: number | null | undefined,
  isUserAction: boolean | null | undefined,
  compactor: Compactor,
  cols: number,
): LayoutItem[] => {
  // If this is static and not explicitly enabled as draggable,
  // no move is possible, so we can short-circuit this immediately.
  if (l.static && l.isDraggable !== true) return [...layout];
  // Short-circuit if nothing to do.
  if (l.y === y && l.x === x) return [...layout];
  const compactorType = compactor.type;
  const preventCollision = compactor.preventCollision === true;
  const { allowOverlap } = compactor;
  const oldX = l.x;
  const oldY = l.y;
  // This is quite a bit faster than extending the object
  if (typeof x === "number") l.x = x;
  if (typeof y === "number") l.y = y;
  l.moved = true;
  // If this collides with anything, move it.
  // When doing this comparison, we have to sort the items we compare with
  // to ensure, in the case of multiple collisions, that we're getting the
  // nearest collision.
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

  // We may have collisions. We can short-circuit if we've turned off collisions or
  // allowed overlap.
  if (hasCollisions && allowOverlap) {
    // Easy, we don't need to resolve collisions. But we *did* change the layout,
    // so clone it on the way out.
    return cloneLayout(layout);
  } else if (hasCollisions && preventCollision) {
    // If we are preventing collision but not allowing overlap, we need to
    // revert the position of this element so it goes to where it came from, rather
    // than the user's desired location.
    l.x = oldX;
    l.y = oldY;
    l.moved = false;
    return layout as LayoutItem[]; // did not change so don't clone
  }

  // Move each item that collides away from this element.
  let resultLayout: LayoutItem[] = [...layout];
  for (let i = 0, len = collisions.length; i < len; i++) {
    const collision = collisions[i];
    // Short circuit so we can't infinite loop
    if (collision.moved) continue;

    // Don't move static items - we have to move *this* element away
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

/**
 * This is where the magic needs to happen - given a collision, move an element away from the collision.
 * We attempt to move it up if there's room, otherwise it goes below.
 */
export const moveElementAwayFromCollision = (
  layout: Layout,
  collidesWith: LayoutItem,
  itemToMove: LayoutItem,
  isUserAction: boolean | null | undefined,
  compactor: Compactor,
  cols: number,
): LayoutItem[] => {
  const compactorType = compactor.type;
  const compactH = compactorType === "horizontal";
  // Compact vertically if not set to horizontal
  const compactV = compactorType === "vertical";
  const preventCollision = collidesWith.static; // we're already colliding (not for static items)

  // If there is enough space above the collision to put this element, move it there.
  // We only do this on the main collision as this can get funky in cascades and cause
  // unwanted swapping behavior.
  if (isUserAction) {
    // Reset isUserAction flag because we're not in the main collision anymore.
    isUserAction = false;
    // Make a mock item so we don't modify the item here, only modify in moveElement.
    const fakeItem: LayoutItem = {
      x: compactH ? Math.max(collidesWith.x - itemToMove.w, 0) : itemToMove.x,
      y: compactV ? Math.max(collidesWith.y - itemToMove.h, 0) : itemToMove.y,
      w: itemToMove.w,
      h: itemToMove.h,
      i: "-1",
    };
    const firstCollision = getFirstCollision(layout, fakeItem);
    const collisionNorth =
      firstCollision !== undefined &&
      firstCollision.y + firstCollision.h > collidesWith.y;
    const collisionWest =
      firstCollision !== undefined &&
      collidesWith.x + collidesWith.w > firstCollision.x;

    // No collision? If so, we can go up there; otherwise, we'll end up moving down as normal
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

/**
 * Helper functions to constrain dimensions of a GridItem
 */
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

/**
 * Helper for clamping width and position when resizing an item.
 */
export const resizeItemInDirection = (
  direction: ResizeHandleAxis,
  currentSize: Position,
  newSize: Partial<Position>,
  containerWidth: number,
): Position => {
  const ordinalHandler = ordinalResizeHandlerMap[direction];
  // Shouldn't be possible given types; that said, don't fail hard
  if (!ordinalHandler) return { ...currentSize, ...newSize };
  return ordinalHandler(
    currentSize,
    { ...currentSize, ...newSize },
    containerWidth,
  );
};

export const setTransform = (
  { top, left, width, height, deg }: Position,
  scale = 1,
): Record<string, string> => {
  // Replace unitless items with px
  const transform = `translate(${left}px,${top}px) scale(${scale}) rotate(${deg || 0}deg)`;
  return {
    transform,
    WebkitTransform: transform,
    MozTransform: transform,
    msTransform: transform,
    OTransform: transform,
    width: `${width}px`,
    height: `${height}px`,
    position: "absolute",
  };
};
/**
 * Get layout items sorted from top left to right and down.
 */
export const sortLayoutItems = (
  layout: Layout,
  compactor: Compactor,
): Layout => {
  const compactorType = compactor.type;
  if (compactorType === "horizontal") return sortLayoutItemsByColRow(layout);
  if (compactorType === "vertical") return sortLayoutItemsByRowCol(layout);
  if (compactorType === "wrap") return sortLayoutItemsByRowCol(layout);
  return layout.slice(0);
};

/**
 * Sort layout items by row ascending and column ascending.
 *
 * Does not modify Layout.
 */
export const sortLayoutItemsByRowCol = (layout: Layout): Layout =>
  layout.slice(0).sort((a, b) => {
    if (a.y !== b.y) return a.y - b.y;
    return a.x - b.x;
  });

/**
 * Sort layout items by column ascending then row ascending.
 *
 * Does not modify Layout.
 */
export const sortLayoutItemsByColRow = (layout: Layout): Layout =>
  layout.slice(0).sort((a, b) => {
    if (a.x !== b.x) return a.x - b.x;
    return a.y - b.y;
  });

/**
 * Generate a layout using the initialLayout and children as a template.
 * Missing entries will be added, extraneous ones will be truncated.
 *
 * Does not modify initialLayout.
 */
export const synchronizeLayoutWithChildren = (
  initialLayout: Layout,
  children: ReactNode,
  cols: number,
  compactor: Compactor,
): Layout => {
  const initial = initialLayout || [];
  // Generate one layout item per child.
  const layout: LayoutItem[] = [];
  React.Children.forEach(children, (child) => {
    // Child may not exist
    if (!React.isValidElement(child) || child.key == null) return;
    const childKey = String(child.key);
    const exists = getLayoutItem(initial, childKey);

    // Don't overwrite the layout item if it's already in the initial layout.
    if (exists) {
      layout.push(cloneLayoutItem(exists));
    } else {
      // Nothing provided: ensure this is added to the bottom
      // Normalize booleans and ensure a consistent layout item shape.
      layout.push(
        cloneLayoutItem({
          w: 1,
          h: 1,
          x: 0,
          y: bottom(layout),
          i: childKey,
        }),
      );
    }
  });
  // Correct the layout.
  const correctedLayout = correctBounds(layout, { cols });
  return compactor.allowOverlap
    ? correctedLayout
    : compactor.compact(correctedLayout, cols);
};

export const noop = () => {};
