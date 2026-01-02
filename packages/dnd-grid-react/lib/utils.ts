import type { Compactor, Layout, LayoutItem, Position } from "@dnd-grid/core";
import {
  bottom,
  cloneLayoutItem,
  correctBounds,
  getLayoutItem,
} from "@dnd-grid/core";
import { deepEqual } from "fast-equals";
import type { ReactNode } from "react";
import React from "react";

// biome-ignore lint/performance/noBarrelFile: Re-exporting utilities for convenience
export {
  bottom,
  cloneLayout,
  cloneLayoutItem,
  getAllCollisions,
  getLayoutItem,
  moveElement,
  resizeItemInDirection,
  sortLayoutItems,
  withLayoutItem,
} from "@dnd-grid/core";

export interface LayoutSyncWarnings {
  missingLayoutItems: Set<string>;
  unusedLayoutItems: Set<string>;
}

/**
 * Comparing React `children` is a bit difficult. This is a good way to compare them.
 * This will catch differences in keys, order, and length.
 */
export const childrenEqual = (a: ReactNode, b: ReactNode): boolean => {
  // Since React.Children.map can return undefined or null,
  // ensure the results are arrays before passing to deepEqual.
  const mapChildrenKeys = (children: ReactNode) =>
    React.Children.map(children, (c) =>
      React.isValidElement(c) ? c.key : null
    ) || [];
  return deepEqual(mapChildrenKeys(a), mapChildrenKeys(b));
};

/**
 * Generate a layout using the initialLayout and children as a template.
 * Missing entries will be added, extraneous ones will be truncated.
 *
 * Does not modify initialLayout.
 */
export const synchronizeLayoutWithChildren = <TData>(
  initialLayout: Layout<TData>,
  children: ReactNode,
  cols: number,
  compactor: Compactor<TData>,
  layoutSyncWarnings?: LayoutSyncWarnings
): Layout<TData> => {
  const initial = initialLayout || [];
  // Generate one layout item per child.
  const layout: LayoutItem<TData>[] = [];
  const childKeys = new Set<string>();
  React.Children.forEach(children, (child) => {
    // Child may not exist
    if (!React.isValidElement(child) || child.key == null) {
      return;
    }
    const childKey = String(child.key);
    childKeys.add(childKey);
    const exists = getLayoutItem(initial, childKey);

    // Don't overwrite the layout item if it's already in the initial layout.
    if (exists) {
      layout.push(cloneLayoutItem(exists));
    } else {
      if (layoutSyncWarnings) {
        const { missingLayoutItems } = layoutSyncWarnings;
        if (!missingLayoutItems.has(childKey)) {
          missingLayoutItems.add(childKey);
          console.warn(
            `DndGrid: Missing layout item for child key "${childKey}". Add a layout entry with id: "${childKey}".`
          );
        }
      }
      // Nothing provided: ensure this is added to the bottom
      // Normalize booleans and ensure a consistent layout item shape.
      layout.push(
        cloneLayoutItem({
          w: 1,
          h: 1,
          x: 0,
          y: bottom(layout),
          id: childKey,
        })
      );
    }
  });
  if (layoutSyncWarnings) {
    const { unusedLayoutItems } = layoutSyncWarnings;
    for (const item of initial) {
      if (childKeys.has(item.id)) {
        continue;
      }
      if (unusedLayoutItems.has(item.id)) {
        continue;
      }
      unusedLayoutItems.add(item.id);
      console.warn(
        `DndGrid: Layout item "${item.id}" has no matching child and will be ignored.`
      );
    }
  }
  // Correct the layout.
  const correctedLayout = correctBounds(layout, { cols });
  return compactor.allowOverlap
    ? correctedLayout
    : compactor.compact(correctedLayout, cols);
};

export const setTransform = (
  { top, left, width, height, deg }: Position,
  scale = 1
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

// biome-ignore lint/suspicious/noEmptyBlockStatements: Intentional no-op function
export const noop = () => {};
