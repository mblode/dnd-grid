import { createContext, useContext } from "react";
import type { ItemState, LayoutItem } from "./types";

type ItemContext<TData = unknown> = {
  item: LayoutItem<TData>;
  state: ItemState;
};

export const DndGridItemContext = createContext<ItemContext<unknown> | null>(
  null,
);

export const useOptionalDndGridItemState = <
  TData = unknown,
>(): ItemContext<TData> | null => {
  const context = useContext(DndGridItemContext);
  return context as ItemContext<TData> | null;
};

/**
 * Hook to access the current grid item's state from within a custom component.
 *
 * @example
 * ```tsx
 * import { useDndGridItemState } from '@dnd-grid/react';
 *
 * const MyCard = () => {
 *   const { item, state } = useDndGridItemState();
 *   return (
 *     <div className={state.dragging ? 'opacity-80' : ''}>
 *       {state.dragging ? 'Moving...' : `Item ${item.id}`}
 *     </div>
 *   );
 * };
 * ```
 */
export const useDndGridItemState = <TData = unknown>(): ItemContext<TData> => {
  const context = useOptionalDndGridItemState<TData>();
  if (!context) {
    throw new Error(
      "useDndGridItemState must be used within a DndGrid item. " +
        "Make sure your component is rendered as a child of a DndGrid.",
    );
  }
  return context as ItemContext<TData>;
};
