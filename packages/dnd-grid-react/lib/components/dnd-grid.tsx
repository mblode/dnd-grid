import type {
  ForwardedRef,
  HTMLAttributes,
  PropsWithoutRef,
  ReactElement,
  RefAttributes,
} from "react";
import { forwardRef } from "react";
import { useContainerWidth } from "../use-container-width";
import {
  defaultProps,
  getDerivedStateFromProps,
  type UseDndGridApi,
  type UseDndGridOptions,
} from "../use-dnd-grid";
import { DndGridCore } from "./dnd-grid-core";

export type DndGridProps<TData = unknown> = Omit<
  UseDndGridOptions<TData>,
  "width"
> & {
  /**
   * Optional container width in pixels. When provided, measurement is skipped.
   */
  width?: number;
  /**
   * Delay initial render until width is measured.
   */
  measureBeforeMount?: boolean;
  /**
   * Initial width before measurement.
   */
  initialWidth?: number;
  /**
   * Props applied to the measurement container.
   */
  containerProps?: Omit<HTMLAttributes<HTMLDivElement>, "children">;
};

export type DndGridHandle<TData = unknown> = UseDndGridApi<TData>;
export type DndGrid<TData = unknown> = DndGridHandle<TData>;

type DndGridComponent = (<TData = unknown>(
  props: PropsWithoutRef<DndGridProps<TData>> &
    RefAttributes<DndGridHandle<TData>>
) => ReactElement | null) & {
  defaultProps?: typeof defaultProps;
  displayName?: string;
  getDerivedStateFromProps: typeof getDerivedStateFromProps;
};

/**
 * A reactive, fluid grid layout with draggable, resizable components.
 */
const DndGrid = forwardRef(
  <TData,>(
    {
      containerProps,
      measureBeforeMount = true,
      initialWidth,
      width: widthProp,
      ...gridProps
    }: DndGridProps<TData>,
    ref: ForwardedRef<DndGridHandle<TData>>
  ) => {
    const shouldMeasure = widthProp === undefined;
    const {
      width: measuredWidth,
      containerRef,
      mounted,
    } = useContainerWidth({
      measureBeforeMount,
      initialWidth,
    });

    const width = shouldMeasure ? measuredWidth : widthProp;
    const shouldRenderGrid = shouldMeasure
      ? (!measureBeforeMount || mounted) && width > 0
      : width > 0;

    return (
      <div {...containerProps} ref={shouldMeasure ? containerRef : undefined}>
        {shouldRenderGrid && (
          <DndGridCore {...gridProps} ref={ref} width={width} />
        )}
      </div>
    );
  }
) as unknown as DndGridComponent;

DndGrid.displayName = "DndGrid";
DndGrid.defaultProps = defaultProps;
DndGrid.getDerivedStateFromProps = getDerivedStateFromProps;

export { DndGrid };
