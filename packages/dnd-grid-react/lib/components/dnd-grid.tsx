import * as React from "react";
import type { DefaultProps } from "../types";
import {
  defaultProps,
  getDerivedStateFromProps,
  type UseDndGridApi,
  type UseDndGridOptions,
  useDndGrid,
} from "../use-dnd-grid";
import { GridItem } from "./grid-item";

type DndGridProps<TData = unknown> = UseDndGridOptions<TData>;

export type DndGridHandle<TData = unknown> = UseDndGridApi<TData>;
export type DndGrid<TData = unknown> = DndGridHandle<TData>;

type DndGridComponent = (<TData = unknown>(
  props: React.PropsWithoutRef<DndGridProps<TData>> &
    React.RefAttributes<DndGridHandle<TData>>,
) => React.ReactElement | null) & {
  defaultProps?: DefaultProps;
  displayName?: string;
  getDerivedStateFromProps: typeof getDerivedStateFromProps;
};

/**
 * A reactive, fluid grid layout with draggable, resizable components.
 */
const DndGrid = React.forwardRef(
  <TData,>(
    incomingProps: DndGridProps<TData>,
    ref: React.ForwardedRef<DndGridHandle<TData>>,
  ) => {
    const { gridProps, itemProps, liveRegionElement, api } =
      useDndGrid<TData>(incomingProps);

    React.useImperativeHandle(ref, () => api, [api]);

    const children = React.Children.map(incomingProps.children, (child) => {
      const childProps = itemProps.getItemProps(child);
      if (!childProps) return null;
      return <GridItem {...childProps} />;
    });
    const droppingProps = itemProps.getDroppingItemProps();
    const placeholderProps = itemProps.getPlaceholderProps();

    return (
      <div {...gridProps}>
        {liveRegionElement}
        {children}
        {droppingProps && <GridItem {...droppingProps} />}
        {placeholderProps && <GridItem {...placeholderProps} />}
      </div>
    );
  },
) as unknown as DndGridComponent;

DndGrid.displayName = "DndGrid";
DndGrid.defaultProps = defaultProps;
DndGrid.getDerivedStateFromProps = getDerivedStateFromProps;

export { DndGrid };
