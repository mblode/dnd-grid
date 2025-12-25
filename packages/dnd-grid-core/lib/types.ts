import type { SpringConfig } from "./spring";

export type ResizeHandleAxis =
  | "s"
  | "w"
  | "e"
  | "n"
  | "sw"
  | "nw"
  | "se"
  | "ne";

export type LayoutItem<TData = unknown> = {
  w: number;
  h: number;
  x: number;
  y: number;
  id: string;
  data?: TData;
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
  constraints?: LayoutConstraint<TData>[];
  moved?: boolean;
  static?: boolean;
  draggable?: boolean | null | undefined;
  resizable?: boolean | null | undefined;
  resizeHandles?: Array<ResizeHandleAxis>;
  bounded?: boolean | null | undefined;
};

export type Layout<TData = unknown> = ReadonlyArray<LayoutItem<TData>>;
export type Mutable<T> = { -readonly [P in keyof T]: T[P] };

export type GridDragEvent<TData = unknown> = {
  type: "dragStart" | "drag" | "dragEnd";
  layout: Layout<TData>;
  previousItem: LayoutItem<TData> | null | undefined;
  item: LayoutItem<TData> | null | undefined;
  placeholder: LayoutItem<TData> | null | undefined;
  event: Event;
  node: HTMLElement | null | undefined;
};

export type GridResizeEvent<TData = unknown> = {
  type: "resizeStart" | "resize" | "resizeEnd";
  layout: Layout<TData>;
  previousItem: LayoutItem<TData> | null | undefined;
  item: LayoutItem<TData> | null | undefined;
  placeholder: LayoutItem<TData> | null | undefined;
  event: Event;
  node: HTMLElement | null | undefined;
  handle: ResizeHandleAxis;
};

export type SpacingObject = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

export type SpacingArray = [number, number, number, number];
export type Spacing = number | SpacingObject;

export type Breakpoint = string;
export type Breakpoints<B extends Breakpoint = Breakpoint> = Record<B, number>;
export type BreakpointCols<B extends Breakpoint = Breakpoint> = Record<
  B,
  number
>;
export type ResponsiveLayouts<
  B extends Breakpoint = Breakpoint,
  TData = unknown,
> = Partial<Record<B, Layout<TData>>>;
export type ResponsiveSpacing<B extends Breakpoint = Breakpoint> =
  | Spacing
  | Partial<Record<B, Spacing>>;
export type MissingLayoutStrategy = "derive" | "warn" | "error" | "empty";

export type ConstraintContext<TData = unknown> = {
  cols: number;
  maxRows: number;
  containerWidth: number;
  containerHeight: number;
  rowHeight: number;
  gap: SpacingArray;
  containerPadding: SpacingArray;
  layout: Layout<TData>;
};

export type LayoutConstraint<TData = unknown> = {
  name: string;
  constrainPosition?<TItemData extends TData>(
    item: LayoutItem<TItemData>,
    x: number,
    y: number,
    context: ConstraintContext<TItemData>,
  ): { x: number; y: number };
  constrainSize?<TItemData extends TData>(
    item: LayoutItem<TItemData>,
    w: number,
    h: number,
    handle: ResizeHandleAxis,
    context: ConstraintContext<TItemData>,
  ): { w: number; h: number };
};

export type CompactType = "horizontal" | "vertical" | null;

export type Compactor<TData = unknown> = {
  type: CompactType;
  allowOverlap: boolean;
  preventCollision?: boolean;
  compact<TLayoutData extends TData>(
    layout: Layout<TLayoutData>,
    cols: number,
  ): Layout<TLayoutData>;
  onMove<TLayoutData extends TData>(
    layout: Layout<TLayoutData>,
    item: LayoutItem<TLayoutData>,
    x: number,
    y: number,
    cols: number,
  ): Layout<TLayoutData>;
};

export type Position = {
  left: number;
  top: number;
  width: number;
  height: number;
  deg?: number;
};

export type PartialPosition = {
  left: number;
  top: number;
};

export type Size = {
  width: number;
  height: number;
};

export type PositionParams = {
  gap: SpacingArray;
  containerPadding: SpacingArray;
  containerWidth: number;
  cols: number;
  rowHeight: number;
  maxRows: number;
};

export type AnimationSpringConfig = SpringConfig;

export type AnimationConfig = {
  springs?: {
    enabled?: boolean;
    rotation?: AnimationSpringConfig;
    scale?: AnimationSpringConfig;
    position?: AnimationSpringConfig;
  };
  shadow?: {
    enabled?: boolean;
    dragStartDuration?: number;
    dragStopDuration?: number;
    dragStartEasing?: string;
    dragStopEasing?: string;
  };
};
