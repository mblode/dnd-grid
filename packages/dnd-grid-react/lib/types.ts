import type { ReactElement, ReactNode } from "react";
import type { DraggableEvent } from "react-draggable";

// util
export type ReactRef<T extends HTMLElement> = {
  readonly current: T | null;
};

export type ResizeHandle =
  | ReactElement<any>
  | ((
      resizeHandleAxis: ResizeHandleAxis,
      ref: ReactRef<HTMLElement>,
    ) => ReactElement<any>);

export type Props = {
  className: string;
  style: Record<string, any>;
  width: number;
  autoSize: boolean;
  cols: number;
  dragTouchDelayDuration: number;
  draggableCancel: string;
  draggableHandle: string;
  verticalCompact: boolean;
  compactType: CompactType;
  layout: Layout;
  margin: [number, number, number, number];
  containerPadding: [number, number, number, number] | null;
  rowHeight: number;
  maxRows: number;
  isBounded: boolean;
  isDraggable: boolean;
  isResizable: boolean;
  isDroppable: boolean;
  preventCollision: boolean;
  transformScale: number;
  droppingItem: Partial<LayoutItem>;
  resizeHandles: ResizeHandleAxis[];
  resizeHandle?: ResizeHandle;
  allowOverlap: boolean;
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
  innerRef?: any;
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

export type ResizeHandleAxis =
  | "s"
  | "w"
  | "e"
  | "n"
  | "sw"
  | "nw"
  | "se"
  | "ne";
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
  moved?: boolean;
  static?: boolean;
  isDraggable?: boolean | null | undefined;
  isResizable?: boolean | null | undefined;
  resizeHandles?: Array<ResizeHandleAxis>;
  isBounded?: boolean | null | undefined;
};
export type Layout = ReadonlyArray<LayoutItem>;
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

export type PositionParams = {
  margin: [number, number, number, number];
  containerPadding: [number, number, number, number];
  containerWidth: number;
  cols: number;
  rowHeight: number;
  maxRows: number;
};
