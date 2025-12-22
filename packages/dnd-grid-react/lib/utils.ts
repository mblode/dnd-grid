import { deepEqual } from "fast-equals";
import type { ReactNode } from "react";
import React from "react";
import type {
  Compactor,
  CompactType,
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
export const cloneLayout = (layout: Layout): Layout => {
  const newLayout = Array(layout.length);

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
 * Given a layout, compact it. This involves going down each y coordinate and removing gaps
 * between items.
 *
 * Does not modify layout items (clones). Creates a new layout array.
 */
export const compact = (
  layout: Layout,
  compactType: CompactType,
  cols: number,
  allowOverlap?: boolean | null | undefined,
): Layout => {
  // Statics go in the compareWith array right away so items flow around them.
  const compareWith = getStatics(layout);
  // We go through the items by row and column.
  const sorted = sortLayoutItems(layout, compactType);
  // Holding for new items.
  const out = Array(layout.length);

  // Create index map for O(1) lookup instead of O(n) indexOf
  const indexMap = new Map<string, number>();
  for (let i = 0; i < layout.length; i++) {
    indexMap.set(layout[i].i, i);
  }

  for (let i = 0, len = sorted.length; i < len; i++) {
    let l = cloneLayoutItem(sorted[i]);

    // Don't move static elements
    if (!l.static) {
      l = compactItem(compareWith, l, compactType, cols, sorted, allowOverlap);
      // Add to comparison array. We only collide with items before this one.
      // Statics are already in this array.
      compareWith.push(l);
    }

    // Add to output array to make sure they still come out in the right order.
    // Use Map for O(1) lookup instead of indexOf O(n)
    const originalIndex = indexMap.get(sorted[i].i);
    if (originalIndex !== undefined) {
      out[originalIndex] = l;
    }
    // Clear moved flag, if it exists.
    l.moved = false;
  }

  return out;
};
const heightWidth = {
  x: "w",
  y: "h",
} as const;

/**
 * Before moving item down, it will check if the movement will cause collisions and move those items down before.
 */
const resolveCompactionCollision = (
  layout: Layout,
  item: LayoutItem,
  moveToCoord: number,
  axis: "x" | "y",
  hasStatics?: boolean,
) => {
  const sizeProp = heightWidth[axis];
  item[axis] += 1;
  const itemIndex = layout.map((layoutItem) => layoutItem.i).indexOf(item.i);
  const layoutHasStatics = hasStatics ?? getStatics(layout).length > 0;

  // Go through each item we collide with.
  for (let i = itemIndex + 1; i < layout.length; i++) {
    const otherItem = layout[i];
    // Ignore static items
    if (otherItem.static) continue;
    // Optimization: we can break early if we know we're past this el,
    // but only when there are no static items scattered throughout.
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

  item[axis] = moveToCoord;
};

/**
 * Compact an item in the layout.
 *
 * Modifies item.
 */
export const compactItem = (
  compareWith: Layout,
  l: LayoutItem,
  compactType: CompactType,
  cols: number,
  fullLayout: Layout,
  allowOverlap?: boolean | null | undefined,
): LayoutItem => {
  const compactV = compactType === "vertical";
  const compactH = compactType === "horizontal";

  if (compactV) {
    // Bottom 'y' possible is the bottom of the layout.
    // This allows you to do nice stuff like specify {y: Infinity}
    // This is here because the layout must be sorted in order to get the correct bottom `y`.
    l.y = Math.min(bottom(compareWith), l.y);

    // Move the element up as far as it can go without colliding.
    while (l.y > 0 && !getFirstCollision(compareWith, l)) {
      l.y--;
    }
  } else if (compactH) {
    // Move the element left as far as it can go without colliding.
    while (l.x > 0 && !getFirstCollision(compareWith, l)) {
      l.x--;
    }
  }

  // Move it down, and keep moving it down if it's colliding.
  let collision: LayoutItem | null | undefined;

  // Checking the compactType null value to avoid breaking the layout when overlapping is allowed.
  while (true) {
    collision = getFirstCollision(compareWith, l);
    if (!collision || (compactType === null && allowOverlap)) break;
    if (compactH) {
      resolveCompactionCollision(fullLayout, l, collision.x + collision.w, "x");
    } else {
      resolveCompactionCollision(fullLayout, l, collision.y + collision.h, "y");
    }

    // Since we can't grow without bounds horizontally, if we've overflown, let's move it down and try again.
    if (compactH && l.x + l.w > cols) {
      l.x = cols - l.w;
      l.y++;

      // Also move element as left as we can
      while (l.x > 0 && !getFirstCollision(compareWith, l)) {
        l.x--;
      }
    }
  }

  // Ensure that there are no negative positions
  l.y = Math.max(l.y, 0);
  l.x = Math.max(l.x, 0);
  return l;
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
): LayoutItem | null | undefined => {
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
  preventCollision: boolean | null | undefined,
  compactType: CompactType,
  cols: number,
  allowOverlap?: boolean | null | undefined,
): Layout => {
  // If this is static and not explicitly enabled as draggable,
  // no move is possible, so we can short-circuit this immediately.
  if (l.static && l.isDraggable !== true) return layout;
  // Short-circuit if nothing to do.
  if (l.y === y && l.x === x) return layout;
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
  let sorted = sortLayoutItems(layout, compactType);
  const movingUp =
    compactType === "vertical" && typeof y === "number"
      ? oldY >= y
      : compactType === "horizontal" && typeof x === "number"
        ? oldX >= x
        : false;
  if (movingUp) sorted = sorted.slice().reverse();
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
    return layout; // did not change so don't clone
  }

  // Move each item that collides away from this element.
  for (let i = 0, len = collisions.length; i < len; i++) {
    const collision = collisions[i];
    // Short circuit so we can't infinite loop
    if (collision.moved) continue;

    // Don't move static items - we have to move *this* element away
    if (collision.static) {
      layout = moveElementAwayFromCollision(
        layout,
        collision,
        l,
        isUserAction,
        compactType,
        cols,
      );
    } else {
      layout = moveElementAwayFromCollision(
        layout,
        l,
        collision,
        isUserAction,
        compactType,
        cols,
      );
    }
  }

  return layout;
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
  compactType: CompactType,
  cols: number,
): Layout => {
  const compactH = compactType === "horizontal";
  // Compact vertically if not set to horizontal
  const compactV = compactType === "vertical";
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
      firstCollision && firstCollision.y + firstCollision.h > collidesWith.y;
    const collisionWest =
      firstCollision && collidesWith.x + collidesWith.w > firstCollision.x;

    // No collision? If so, we can go up there; otherwise, we'll end up moving down as normal
    if (!firstCollision) {
      return moveElement(
        layout,
        itemToMove,
        compactH ? fakeItem.x : undefined,
        compactV ? fakeItem.y : undefined,
        isUserAction,
        preventCollision,
        compactType,
        cols,
      );
    } else if (collisionNorth && compactV) {
      return moveElement(
        layout,
        itemToMove,
        undefined,
        collidesWith.y + 1,
        isUserAction,
        preventCollision,
        compactType,
        cols,
      );
    } else if (collisionNorth && compactType == null) {
      collidesWith.y = itemToMove.y;
      itemToMove.y = itemToMove.y + itemToMove.h;
      return layout;
    } else if (collisionWest && compactH) {
      return moveElement(
        layout,
        collidesWith,
        itemToMove.x,
        undefined,
        isUserAction,
        preventCollision,
        compactType,
        cols,
      );
    }
  }

  const newX = compactH ? itemToMove.x + 1 : undefined;
  const newY = compactV ? itemToMove.y + 1 : undefined;

  if (newX == null && newY == null) {
    return layout;
  }

  return moveElement(
    layout,
    itemToMove,
    compactH ? itemToMove.x + 1 : undefined,
    compactV ? itemToMove.y + 1 : undefined,
    isUserAction,
    preventCollision,
    compactType,
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
  compactType: CompactType,
): Layout => {
  if (compactType === "horizontal") return sortLayoutItemsByColRow(layout);
  if (compactType === "vertical") return sortLayoutItemsByRowCol(layout);
  return layout;
};

/**
 * Sort layout items by row ascending and column ascending.
 *
 * Does not modify Layout.
 */
export const sortLayoutItemsByRowCol = (layout: Layout): Layout =>
  layout.slice(0).sort((a, b) => {
    if (a.y > b.y || (a.y === b.y && a.x > b.x)) return 1;
    if (a.y === b.y && a.x === b.x) return 0;
    return -1;
  });

/**
 * Sort layout items by column ascending then row ascending.
 *
 * Does not modify Layout.
 */
export const sortLayoutItemsByColRow = (layout: Layout): Layout =>
  layout.slice(0).sort((a, b) => {
    if (a.x > b.x || (a.x === b.x && a.y > b.y)) return 1;
    return -1;
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
