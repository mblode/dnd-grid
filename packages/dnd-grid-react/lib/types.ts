import type { CSSProperties, ReactElement, ReactNode, Ref } from "react";
import type { DraggableEvent } from "react-draggable";

// util
export type ReactRef<T extends HTMLElement> = {
  readonly current: T | null;
};

export type ResizeHandle =
  | ReactElement
  | ((
      resizeHandleAxis: ResizeHandleAxis,
      ref: ReactRef<HTMLElement>,
    ) => ReactElement);

export type ResizeHandleAxis =
  | "s"
  | "w"
  | "e"
  | "n"
  | "sw"
  | "nw"
  | "se"
  | "ne";

export enum AutoScrollActivator {
  Pointer = 0,
  DraggableRect = 1,
}

export enum TraversalOrder {
  TreeOrder = 0,
  ReversedTreeOrder = 1,
}

export type AutoScrollOptions = {
  acceleration?: number;
  activator?: AutoScrollActivator;
  canScroll?: (element: Element) => boolean;
  enabled?: boolean;
  interval?: number;
  layoutShiftCompensation?:
    | boolean
    | {
        x: boolean;
        y: boolean;
      };
  order?: TraversalOrder;
  threshold?: {
    x: number;
    y: number;
  };
};

export type LayoutItem = {
  w: number;
  h: number;
  x: number;
  y: number;
  deg: number;
  i: string;
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
  constraints?: LayoutConstraint[];
  moved?: boolean;
  static?: boolean;
  isDraggable?: boolean | null | undefined;
  isResizable?: boolean | null | undefined;
  resizeHandles?: Array<ResizeHandleAxis>;
  isBounded?: boolean | null | undefined;
};

export type SpacingObject = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

export type SpacingArray = [number, number, number, number];
export type Spacing = number | SpacingObject;

/**
 * State of a grid item during interactions
 */
export type ItemState = {
  dragging: boolean;
  resizing: boolean;
  settling: boolean;
  disabled: boolean;
};

/**
 * Slot props for customizing internal elements
 */
type SlotClassName<T> = string | ((data: T, state: ItemState) => string);
type SlotStyle<T> =
  | CSSProperties
  | ((data: T, state: ItemState) => CSSProperties);
type HandleSlotClassName =
  | string
  | ((axis: ResizeHandleAxis, state?: ItemState) => string);
type HandleSlotStyle =
  | CSSProperties
  | ((axis: ResizeHandleAxis, state?: ItemState) => CSSProperties);

export type SlotProps = {
  item?: {
    className?: SlotClassName<LayoutItem>;
    style?: SlotStyle<LayoutItem>;
  };
  placeholder?: {
    className?: SlotClassName<LayoutItem>;
    style?: SlotStyle<LayoutItem>;
  };
  handle?: {
    className?: HandleSlotClassName;
    style?: HandleSlotStyle;
  };
};

export type Props = {
  className: string;
  style: CSSProperties;
  width: number;
  autoSize: boolean;
  autoScroll?: boolean | AutoScrollOptions;
  cols: number;
  dragTouchDelayDuration: number;
  draggableCancel: string;
  draggableHandle: string;
  compactor?: Compactor;
  layout: Layout;
  margin: Spacing;
  containerPadding: Spacing | null;
  rowHeight: number;
  maxRows: number;
  isBounded: boolean;
  isDraggable: boolean;
  isResizable: boolean;
  isDroppable: boolean;
  transformScale: number;
  droppingItem: Partial<LayoutItem>;
  resizeHandles: ResizeHandleAxis[];
  resizeHandle?: ResizeHandle;
  constraints?: LayoutConstraint[];
  /**
   * Customize styling of internal elements.
   */
  slotProps?: SlotProps;
  // Callbacks
  onLayoutChange: (arg0: Layout) => void;
  onDrag: EventCallback;
  onDragStart: EventCallback;
  onDragStop: EventCallback;
  onResize: EventCallback;
  onResizeStart: EventCallback;
  onResizeStop: EventCallback;
  onDropDragOver: (e?: DragOverEvent) =>
    | (
        | {
            w?: number;
            h?: number;
          }
        | false
      )
    | null
    | undefined;
  onDrop: (
    layout: Layout,
    item: LayoutItem | null | undefined,
    e: Event,
  ) => void;
  children: ReactNode;
  innerRef?: Ref<HTMLDivElement>;
  dndRect?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
    width: number;
    height: number;
  };
  dndEvent?: Event | null;
};

export type DefaultProps = Omit<Props, "children" | "width">;

export type Layout = ReadonlyArray<LayoutItem>;
export type ConstraintContext = {
  cols: number;
  maxRows: number;
  containerWidth: number;
  containerHeight: number;
  rowHeight: number;
  margin: SpacingArray;
  containerPadding: SpacingArray;
  layout: Layout;
};
export type LayoutConstraint = {
  name: string;
  constrainPosition?: (
    item: LayoutItem,
    x: number,
    y: number,
    context: ConstraintContext,
  ) => { x: number; y: number };
  constrainSize?: (
    item: LayoutItem,
    w: number,
    h: number,
    handle: ResizeHandleAxis,
    context: ConstraintContext,
  ) => { w: number; h: number };
};
export type Compactor = {
  type: "vertical" | "horizontal" | null | string;
  allowOverlap: boolean;
  preventCollision?: boolean;
  compact: (layout: Layout, cols: number) => Layout;
  onMove: (
    layout: Layout,
    item: LayoutItem,
    x: number,
    y: number,
    cols: number,
  ) => Layout;
};
export type Position = {
  left: number;
  top: number;
  width: number;
  height: number;
  deg?: number;
};
export type ReactDraggableCallbackData = {
  node: HTMLElement;
  x?: number;
  y?: number;
  deltaX: number;
  deltaY: number;
  lastX?: number;
  lastY?: number;
};
export type PartialPosition = {
  left: number;
  top: number;
};
export type DroppingPosition = {
  left: number;
  top: number;
  e: DraggableEvent | Event;
};
export type Size = {
  width: number;
  height: number;
};
export type GridDragEvent = {
  e: Event;
  node: HTMLElement;
  newPosition: PartialPosition;
};
export type GridResizeEvent = {
  e: Event;
  node: HTMLElement;
  size: Size;
  handle: string;
};
export type DragOverEvent = MouseEvent & {
  nativeEvent: Event & {
    layerX: number;
    layerY: number;
  };
};

// All callbacks are of the signature (layout, oldItem, newItem, placeholder, e).
export type EventCallback = (
  arg0: Layout,
  oldItem: LayoutItem | null | undefined,
  newItem: LayoutItem | null | undefined,
  placeholder: LayoutItem | null | undefined,
  arg4: Event,
  arg5: HTMLElement | null | undefined,
) => void;
export type CompactType = ("horizontal" | "vertical") | null | undefined;

export type OnLayoutChangeCallback = (arg0: Layout) => void;

export type Breakpoint = string;
export type Breakpoints<B extends Breakpoint = Breakpoint> = Record<B, number>;
export type BreakpointCols<B extends Breakpoint = Breakpoint> = Record<
  B,
  number
>;
export type ResponsiveLayouts<B extends Breakpoint = Breakpoint> = Partial<
  Record<B, Layout>
>;
export type ResponsiveSpacing<B extends Breakpoint = Breakpoint> =
  | Spacing
  | Partial<Record<B, Spacing>>;
export type OnBreakpointChangeCallback<B extends Breakpoint = Breakpoint> = (
  newBreakpoint: B,
  cols: number,
) => void;

export type PositionParams = {
  margin: SpacingArray;
  containerPadding: SpacingArray;
  containerWidth: number;
  cols: number;
  rowHeight: number;
  maxRows: number;
};
