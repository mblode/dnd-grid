import { createContext, useContext } from "react";
import type { ItemState, LayoutItem } from "./types";

type ItemContext = {
  item: LayoutItem;
  state: ItemState;
};

export const DndGridItemContext = createContext<ItemContext | null>(null);

/**
 * Hook to access the current grid item's state from within a custom component.
 *
 * @example
 * ```tsx
 * import { useDndGridItemState } from '@dnd-grid/react';
 *
 * function MyCard() {
 *   const { item, state } = useDndGridItemState();
 *   return (
 *     <div className={state.dragging ? 'opacity-80' : ''}>
 *       {state.dragging ? 'Moving...' : `Item ${item.i}`}
 *     </div>
 *   );
 * }
 * ```
 */
export function useDndGridItemState(): ItemContext {
  const context = useContext(DndGridItemContext);
  if (!context) {
    throw new Error(
      "useDndGridItemState must be used within a DndGrid item. " +
        "Make sure your component is rendered as a child of a DndGrid.",
    );
  }
  return context;
}
