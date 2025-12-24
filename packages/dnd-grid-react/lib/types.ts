import type {
  AnimationConfig,
  Compactor,
  GridDragEvent,
  GridResizeEvent,
  Layout,
  LayoutConstraint,
  LayoutItem,
  PartialPosition,
  ResizeHandleAxis,
  Size,
  Spacing,
} from "@dnd-grid/core";
import type {
  AriaAttributes,
  AriaRole,
  CSSProperties,
  ReactElement,
  ReactNode,
  Ref,
} from "react";
import type { DraggableEvent } from "react-draggable";

export type {
  AnimationConfig,
  AnimationSpringConfig,
  Breakpoint,
  BreakpointCols,
  Breakpoints,
  Compactor,
  ConstraintContext,
  GridDragEvent,
  GridResizeEvent,
  Layout,
  LayoutConstraint,
  LayoutItem,
  MissingLayoutStrategy,
  Position,
  PositionParams,
  ResizeHandleAxis,
  ResponsiveLayouts,
  ResponsiveSpacing,
  Size,
  Spacing,
  SpacingObject,
} from "@dnd-grid/core";

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

export enum AutoScrollActivator {
  Pointer = 0,
  DraggableRect = 1,
}

export enum TraversalOrder {
  TreeOrder = 0,
  ReversedTreeOrder = 1,
}

export type CallbackThrottleOptions = {
  drag?: number;
  resize?: number;
};

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

export type SlotProps<TData = unknown> = {
  item?: {
    className?: SlotClassName<LayoutItem<TData>>;
    style?: SlotStyle<LayoutItem<TData>>;
  };
  placeholder?: {
    className?: SlotClassName<LayoutItem<TData>>;
    style?: SlotStyle<LayoutItem<TData>>;
  };
  handle?: {
    className?: HandleSlotClassName;
    style?: HandleSlotStyle;
  };
};

export type ReducedMotionSetting = "system" | "always" | "never";

export type LiveRegionSettings = {
  role?: AriaRole;
  ariaLive?: AriaAttributes["aria-live"];
  ariaAtomic?: boolean;
  ariaRelevant?: AriaAttributes["aria-relevant"];
};

export type LiveAnnouncementContext<TData = unknown> = {
  item: LayoutItem<TData> | null | undefined;
  previousItem?: LayoutItem<TData> | null | undefined;
  node?: HTMLElement | null;
  layout: Layout<TData>;
  cols: number;
  maxRows: number;
  rowHeight: number;
  getItemLabel: (
    item: LayoutItem<TData> | null | undefined,
    node?: HTMLElement | null,
  ) => string;
};

export type LiveAnnouncements<TData = unknown> = {
  onDragStart?: (
    context: LiveAnnouncementContext<TData>,
  ) => string | null | undefined;
  onDrag?: (
    context: LiveAnnouncementContext<TData>,
  ) => string | null | undefined;
  onDragStop?: (
    context: LiveAnnouncementContext<TData>,
  ) => string | null | undefined;
  onResizeStart?: (
    context: LiveAnnouncementContext<TData>,
  ) => string | null | undefined;
  onResize?: (
    context: LiveAnnouncementContext<TData>,
  ) => string | null | undefined;
  onResizeStop?: (
    context: LiveAnnouncementContext<TData>,
  ) => string | null | undefined;
  onFocus?: (
    context: LiveAnnouncementContext<TData>,
  ) => string | null | undefined;
};

export type LiveAnnouncementsOptions<TData = unknown> = {
  enabled?: boolean;
  announcements?: Partial<LiveAnnouncements<TData>>;
  getItemLabel?: (
    item: LayoutItem<TData> | null | undefined,
    node?: HTMLElement | null,
  ) => string;
  liveRegion?: LiveRegionSettings;
};

export type Props<TData = unknown> = {
  className: string;
  style: CSSProperties;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  "aria-describedby"?: string;
  width: number;
  autoSize: boolean;
  autoScroll?: boolean | AutoScrollOptions;
  cols: number;
  dragTouchDelayDuration: number;
  dragCancel: string;
  dragHandle: string;
  compactor?: Compactor<TData>;
  layout: Layout<TData>;
  margin: Spacing;
  containerPadding: Spacing | null;
  rowHeight: number;
  maxRows: number;
  isBounded: boolean;
  isDraggable: boolean;
  isResizable: boolean;
  transformScale: number;
  /**
   * Throttle `onDrag` and `onResize` callbacks.
   */
  callbackThrottle?: number | CallbackThrottleOptions;
  validation?: boolean;
  animationConfig?: AnimationConfig;
  reducedMotion?: ReducedMotionSetting | boolean;
  droppingItem: Partial<LayoutItem<TData>>;
  resizeHandles: ResizeHandleAxis[];
  resizeHandle?: ResizeHandle;
  constraints?: LayoutConstraint<TData>[];
  /**
   * Customize styling of internal elements.
   */
  slotProps?: SlotProps<TData>;
  /**
   * Configure live announcements for drag/resize/focus. Pass false to disable.
   */
  liveAnnouncements?: LiveAnnouncementsOptions<TData> | false;
  // Callbacks
  onLayoutChange: (arg0: Layout<TData>) => void;
  onDrag: (event: GridDragEvent<TData>) => void;
  onDragStart: (event: GridDragEvent<TData>) => void;
  onDragStop: (event: GridDragEvent<TData>) => void;
  onResize: (event: GridResizeEvent<TData>) => void;
  onResizeStart: (event: GridResizeEvent<TData>) => void;
  onResizeStop: (event: GridResizeEvent<TData>) => void;
  onDropDragOver?: (e?: DragOverEvent) =>
    | (
        | {
            w?: number;
            h?: number;
          }
        | false
      )
    | null
    | undefined;
  onDrop?: (
    layout: Layout<TData>,
    item: LayoutItem<TData> | null | undefined,
    e: Event,
  ) => void;
  children: ReactNode;
  innerRef?: Ref<HTMLDivElement>;
};

export type DefaultProps<TData = unknown> = Omit<
  Props<TData>,
  "children" | "width"
>;

export type DroppingPosition = {
  left: number;
  top: number;
  e: DraggableEvent | Event;
};

export type GridItemDragEvent = {
  id: string;
  x: number;
  y: number;
  event: Event;
  node: HTMLElement;
  newPosition: PartialPosition;
  deltaX?: number;
  deltaY?: number;
};

export type GridItemResizeEvent = {
  id: string;
  w: number;
  h: number;
  event: Event;
  node: HTMLElement;
  size: Size;
  handle: ResizeHandleAxis;
};

export type DragOverEvent = MouseEvent & {
  nativeEvent: Event & {
    layerX: number;
    layerY: number;
  };
};
