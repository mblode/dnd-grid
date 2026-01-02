import type {
  ForwardedRef,
  PropsWithoutRef,
  ReactElement,
  RefAttributes,
} from "react";
import { Children, forwardRef, useImperativeHandle } from "react";
import type { UseDndGridApi, UseDndGridOptions } from "../use-dnd-grid";
import { useDndGrid } from "../use-dnd-grid";
import { GridItem } from "./grid-item";

export type DndGridCoreProps<TData = unknown> = UseDndGridOptions<TData>;
export type DndGridCoreHandle<TData = unknown> = UseDndGridApi<TData>;

type DndGridCoreComponent = (<TData = unknown>(
  props: PropsWithoutRef<DndGridCoreProps<TData>> &
    RefAttributes<DndGridCoreHandle<TData>>
) => ReactElement | null) & {
  displayName?: string;
};

const DndGridCore = forwardRef(
  <TData,>(
    incomingProps: DndGridCoreProps<TData>,
    ref: ForwardedRef<DndGridCoreHandle<TData>>
  ) => {
    const { gridProps, itemProps, liveRegionElement, api } =
      useDndGrid<TData>(incomingProps);

    useImperativeHandle(ref, () => api, [api]);

    const children = Children.map(incomingProps.children, (child) => {
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
