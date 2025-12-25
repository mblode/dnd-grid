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

export type FixedWidthDndGridProps<TData = unknown> = UseDndGridOptions<TData>;

export type FixedWidthDndGridHandle<TData = unknown> = UseDndGridApi<TData>;
export type FixedWidthDndGrid<TData = unknown> = FixedWidthDndGridHandle<TData>;

type FixedWidthDndGridComponent = (<TData = unknown>(
  props: React.PropsWithoutRef<FixedWidthDndGridProps<TData>> &
    React.RefAttributes<FixedWidthDndGridHandle<TData>>,
) => React.ReactElement | null) & {
  defaultProps?: DefaultProps;
  displayName?: string;
  getDerivedStateFromProps: typeof getDerivedStateFromProps;
};

/**
 * A reactive, fluid grid layout with draggable, resizable components.
 */
const FixedWidthDndGrid = React.forwardRef(
  <TData,>(
    incomingProps: FixedWidthDndGridProps<TData>,
    ref: React.ForwardedRef<FixedWidthDndGridHandle<TData>>,
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
) as unknown as FixedWidthDndGridComponent;

FixedWidthDndGrid.displayName = "FixedWidthDndGrid";
FixedWidthDndGrid.defaultProps = defaultProps;
FixedWidthDndGrid.getDerivedStateFromProps = getDerivedStateFromProps;

export { FixedWidthDndGrid };
