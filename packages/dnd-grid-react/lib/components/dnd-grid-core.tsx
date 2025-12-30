import * as React from "react";
import type { UseDndGridApi, UseDndGridOptions } from "../use-dnd-grid";
import { useDndGrid } from "../use-dnd-grid";
import { GridItem } from "./grid-item";

export type DndGridCoreProps<TData = unknown> = UseDndGridOptions<TData>;
export type DndGridCoreHandle<TData = unknown> = UseDndGridApi<TData>;

type DndGridCoreComponent = (<TData = unknown>(
  props: React.PropsWithoutRef<DndGridCoreProps<TData>> &
    React.RefAttributes<DndGridCoreHandle<TData>>
) => React.ReactElement | null) & {
  displayName?: string;
};

const DndGridCore = React.forwardRef(
  <TData,>(
    incomingProps: DndGridCoreProps<TData>,
    ref: React.ForwardedRef<DndGridCoreHandle<TData>>
  ) => {
    const { gridProps, itemProps, liveRegionElement, api } =
      useDndGrid<TData>(incomingProps);

    React.useImperativeHandle(ref, () => api, [api]);

    const children = React.Children.map(incomingProps.children, (child) => {
      const childProps = itemProps.getItemProps(child);
      if (!childProps) {
        return null;
      }
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
  }
) as unknown as DndGridCoreComponent;

DndGridCore.displayName = "DndGridCore";

export { DndGridCore };
