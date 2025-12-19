import React from "react";
import { DraggableCore, DraggableEventHandler } from "react-draggable";
import { Resizable } from "react-resizable";
import {
  fastPositionEqual,
  perc,
  resizeItemInDirection,
  setTopLeft,
  setTransform
} from "../utils";
import {
  calcGridItemPosition,
  calcGridItemWHPx,
  calcGridColWidth,
  calcXY,
  calcWH,
  clamp
} from "../calculateUtils";
import clsx from "clsx";
import type { ReactElement, ReactNode, RefObject } from "react";
import {
  DroppingPosition,
  GridDragEvent,
  GridResizeEvent,
  Position,
  PositionParams,
  ResizeHandleAxis
} from "../types";

type PartialPosition = {
  top: number;
  left: number;
  deg: number;
};

type GridItemCallback<Data extends GridDragEvent | GridResizeEvent> = (
  i: string,
  w: number,
  h: number,
  arg3: Data
) => void;

type ResizeCallbackData = {
  node: HTMLElement;
  size: Position;
  handle: ResizeHandleAxis;
};

type GridItemResizeCallback = (
  e: Event,
  data: ResizeCallbackData,
  position: Position
) => void;

type State = {
  resizing:
    | {
        top: number;
        left: number;
        width: number;
        height: number;
      }
    | null
    | undefined;
  dragging:
    | {
        top: number;
        left: number;
        deg: number;
      }
    | null
    | undefined;
  allowedToDrag: boolean;
  className: string;
  dragEnabled: boolean;
  rotationHistory: number[];
  lastFrameTime: number | null;
};

type Props = {
  children: ReactElement<any>;
  cols: number;
  containerWidth: number;
  margin: [number, number, number, number];
  containerPadding: [number, number, number, number];
  rowHeight: number;
  maxRows: number;
  isDraggable: boolean;
  isResizable: boolean;
  isBounded: boolean;
  static?: boolean;
  useCSSTransforms?: boolean;
  usePercentages?: boolean;
  transformScale: number;
  droppingPosition?: DroppingPosition;
  className: string;
  style?: Record<string, any>;
  // Draggability
  cancel: string;
  dragTouchDelayDuration: number;
  handle: string;
  x: number;
  y: number;
  w: number;
  h: number;
  deg: number;
  minW: number;
  maxW: number;
  minH: number;
  maxH: number;
  i: string;
  resizeHandles?: ResizeHandleAxis[];
  resizeHandle?: ResizeHandleAxis;
  onDrag?: GridItemCallback<GridDragEvent>;
  onDragStart?: GridItemCallback<GridDragEvent>;
  onDragStop?: GridItemCallback<GridDragEvent>;
  onResize?: GridItemCallback<GridResizeEvent>;
  onResizeStart?: GridItemCallback<GridResizeEvent>;
  onResizeStop?: GridItemCallback<GridResizeEvent>;
};

type DefaultProps = {
  className: string;
  cancel: string;
  handle: string;
  minH: number;
  minW: number;
  maxH: number;
  maxW: number;
  transformScale: number;
  dragTouchDelayDuration: number;
};

/**
 * An individual item within a ReactGridLayout.
 */

export class GridItem extends React.Component<Props, State> {
  static defaultProps: DefaultProps = {
    className: "",
    cancel: "",
    dragTouchDelayDuration: 0,
    handle: "",
    minH: 1,
    minW: 1,
    maxH: Infinity,
    maxW: Infinity,
    transformScale: 1
  };
  state: State = {
    dragEnabled: false,
    allowedToDrag: false,
    resizing: null,
    dragging: null,
    className: "",
    rotationHistory: [],
    lastFrameTime: null
  };
  elementRef: RefObject<HTMLDivElement> = React.createRef() as RefObject<HTMLDivElement>;

  shouldComponentUpdate(nextProps: Props, nextState: State): boolean {
    // We can't deeply compare children. If the developer memoizes them, we can
    // use this optimization.
    if (this.props.children !== nextProps.children) return true;
    if (this.props.droppingPosition !== nextProps.droppingPosition) return true;
    if (this.state.allowedToDrag !== nextState.allowedToDrag) return true;
    // TODO memoize these calculations so they don't take so long?
    const oldPosition = calcGridItemPosition(
      this.getPositionParams(this.props),
      this.props.x,
      this.props.y,
      this.props.w,
      this.props.h,
      this.props.deg,
      this.state
    );
    const newPosition = calcGridItemPosition(
      this.getPositionParams(nextProps),
      nextProps.x,
      nextProps.y,
      nextProps.w,
      nextProps.h,
      nextProps.deg,
      nextState
    );
    return (
      !fastPositionEqual(oldPosition, newPosition) ||
      this.props.useCSSTransforms !== nextProps.useCSSTransforms
    );
  }

  componentDidMount() {
    this.moveDroppingItem();
  }

  componentDidUpdate(prevProps: Props) {
    this.moveDroppingItem(prevProps);
  }

  // When a droppingPosition is present, this means we should fire a move event, as if we had moved
  // this element by `x, y` pixels.
  moveDroppingItem(prevProps?: Props | undefined) {
    const { droppingPosition } = this.props;
    if (!droppingPosition) return;
    const node = (this?.elementRef as any)?.current;
    // Can't find DOM node (are we unmounted?)
    if (!node) return;
    const prevDroppingPosition = prevProps?.droppingPosition || {
      left: 0,
      top: 0
    };
    const { dragging } = this.state;
    const shouldDrag =
      (dragging && droppingPosition.left !== prevDroppingPosition.left) ||
      droppingPosition.top !== prevDroppingPosition.top;

    if (!dragging) {
      this.onDragStart(
        droppingPosition?.e as any,
        {
          node,
          deltaX: droppingPosition.left,
          deltaY: droppingPosition.top
        } as any
      );
    } else if (shouldDrag) {
      const deltaX = droppingPosition.left - dragging.left;
      const deltaY = droppingPosition.top - dragging.top;
      this.onDrag(
        droppingPosition.e as any,
        {
          node,
          deltaX,
          deltaY
        } as any
      );
    }
  }

  lerp(start: number, end: number, alpha: number) {
    return start + (end - start) * alpha;
  }

  getPositionParams(props: Props = this.props): PositionParams {
    return {
      cols: props.cols,
      containerPadding: props.containerPadding,
      containerWidth: props.containerWidth,
      margin: props.margin,
      maxRows: props.maxRows,
      rowHeight: props.rowHeight
    };
  }

  /**
   * This is where we set the grid item's absolute placement. It gets a little tricky because we want to do it
   * well when server rendering, and the only way to do that properly is to use percentage width/left because
   * we don't know exactly what the browser viewport is.
   * Unfortunately, CSS Transforms, which are great for performance, break in this instance because a percentage
   * left is relative to the item itself, not its container! So we cannot use them on the server rendering pass.
   */
  createStyle(pos: Position): Record<string, string | null | undefined> {
    const {
      static: isStatic,
      usePercentages,
      containerWidth,
      useCSSTransforms
    } = this.props;
    const scale = !isStatic && this.state.allowedToDrag ? 1.1 : 1;
    let style;

    // CSS Transforms support (default)
    if (useCSSTransforms) {
      style = setTransform(pos, scale);
    } else {
      // top,left (slow)
      style = setTopLeft(pos, scale);

      // This is used for server rendering.
      if (usePercentages) {
        style.left = perc(pos.left / containerWidth);
        style.width = perc(pos.width / containerWidth);
      }
    }

    return style;
  }

  // Check if device is touch-capable.
  isTouchCapable(): boolean {
    return "ontouchstart" in window || navigator.maxTouchPoints > 0;
  }

  // A reference to the DraggableCore component to access it directly.
  draggableCoreRef = React.createRef();

  /**
   * Mix a Draggable instance into a child.
   */
  mixinDraggable(child: ReactNode, isDraggable: boolean) {
    const delayedDragEnabled: boolean =
      !!this.props.dragTouchDelayDuration && this.isTouchCapable();

    // Delayed touch works by changing disabling DraggableCore for a short while.
    const delayedDragNeedsWait =
      delayedDragEnabled && !this.state.allowedToDrag;

    return (
      <DraggableCore
        disabled={!isDraggable || delayedDragNeedsWait}
        onStart={this.onDragStart}
        onMouseDown={delayedDragEnabled ? this.onMouseDown : undefined}
        onDrag={this.onDrag}
        onStop={this.onDragStop}
        handle={this.props.handle}
        cancel={
          ".react-resizable-handle" +
          (this.props.cancel ? "," + this.props.cancel : "")
        }
        scale={this.props.transformScale}
        nodeRef={this.elementRef}
        ref={this.draggableCoreRef as any}
      >
        {child}
      </DraggableCore>
    );
  }

  /**
   * Utility function to setup callback handler definitions for
   * similarily structured resize events.
   */
  curryResizeHandler(
    position: Position,
    handler: (...args: Array<any>) => any
  ): (...args: Array<any>) => any {
    return (
      e: Event,
      data: ResizeCallbackData
    ): ((...args: Array<any>) => any) => handler(e, data, position);
  }

  /**
   * Mix a Resizable instance into a child.
   */
  mixinResizable(
    child: ReactElement<any>,
    position: Position,
    isResizable: boolean
  ): ReactElement<any> {
    const {
      cols,
      minW,
      minH,
      maxW,
      maxH,
      transformScale,
      resizeHandles,
      resizeHandle
    } = this.props;
    const positionParams = this.getPositionParams();
    // This is the max possible width - doesn't go to infinity because of the width of the window
    const maxWidth = calcGridItemPosition(
      positionParams,
      0,
      0,
      cols,
      0,
      0
    ).width;
    // Calculate min/max constraints using our min & maxes
    const mins = calcGridItemPosition(positionParams, 0, 0, minW, minH, 0);
    const maxes = calcGridItemPosition(positionParams, 0, 0, maxW, maxH, 0);
    const minConstraints: [width: number, height: number] = [
      mins.width,
      mins.height
    ];
    const maxConstraints: [width: number, height: number] = [
      Math.min(maxes.width, maxWidth),
      Math.min(maxes.height, Infinity)
    ];
    return (
      <Resizable // These are opts for the resize handle itself
        draggableOpts={{
          disabled: !isResizable
        }}
        className={isResizable ? undefined : "react-resizable-hide"}
        width={position.width}
        height={position.height}
        minConstraints={minConstraints}
        maxConstraints={maxConstraints}
        onResizeStop={this.curryResizeHandler(position, this.onResizeStop)}
        onResizeStart={this.curryResizeHandler(position, this.onResizeStart)}
        onResize={this.curryResizeHandler(position, this.onResize)}
        transformScale={transformScale}
        resizeHandles={resizeHandles}
        handle={resizeHandle}
      >
        {child}
      </Resizable>
    );
  }

  childEvents: {
    type: string;
    event: (e: Event) => void;
    passive: boolean;
  }[] = [];

  /**
   * Add an event listener to the grid item.
   * The event will also be added to childEvents array for future use.
   */
  addChildEvent: (
    type: string,
    event: (e: Event) => void,
    passive?: boolean
  ) => void = (type, event, passive = true) => {
    if ((this?.elementRef as any)?.current) {
      (this.elementRef as any).current.addEventListener(type, event, {
        passive
      });
      this.childEvents.push({
        type,
        event,
        passive
      });
    }
  };
  removeChildEvents: () => void = () => {
    if ((this?.elementRef as any)?.current) {
      this.childEvents.forEach(({ type, event, passive }) => {
        (this?.elementRef as any)?.current.removeEventListener(type, event, {
          passive
        });
      });
      this.childEvents = [];
    }
  };
  // A reference to the timeout handler to be able to access it at any time.
  dragDelayTimeout: any = undefined;

  /**
   * onMouseDown event is tied to both 'mousedown' and 'touchstart' events in DraggableCore.
   * We start the delayed drag process when the user presses the mouse button or the finger.
   */
  onMouseDown: (arg0: Event) => void = e => {
    // handle touch events only
    if (!this.dragDelayTimeout && e instanceof TouchEvent) {
      this.startDragDelayTimeout(e);
    }
  };

  /**
   * Start the delayed counter to determine when a drag should start.
   */
  startDragDelayTimeout: (arg0: Event) => void = e => {
    // Prevent text selection while dragging.
    if (
      document.body.style.userSelect === "" ||
      document.body.style.webkitUserSelect === ""
    ) {
      document.body.style.webkitUserSelect = "none";
      document.body.style.userSelect = "none";
    }

    if (!this.state.allowedToDrag) {
      /**
       * Register events to cancel the timeout handler if user releases the mouse or touch
       */
      this.addChildEvent("touchend", this.resetDelayTimeout);

      /**
       * Prevent user from doing touch and scroll at the same time.
       * If the user starts scrolling, we can not cancel the scroll event,
       * so we cancel the drag event instead.
       */
      this.addChildEvent("touchmove", this.handleTouchMove, false);
      // Start the timeout and assign its handler to the dragDelayTimeout
      this.dragDelayTimeout = setTimeout(() => {
        this.dragDelayTimeout = undefined;

        // vibrate api is not available on safari, so we need to check it
        if (navigator.vibrate && !this.props.static) {
          // vibrate device for 80ms
          navigator.vibrate(80);
        }

        this.setState({
          allowedToDrag: true
        });
        // Start the drag process by calling the DraggableCore handleDragStartFunction directly.
        (this.draggableCoreRef as any).current.handleDragStart(e);
      }, this.props.dragTouchDelayDuration);
    }
  };

  /**
   * Prevent user from doing touch and scroll at the same time.
   * If the user starts scrolling, we can not cancel the scroll event,
   * so we cancel the drag event instead.
   *
   * if the user is currently dragging, and the timeout has not been canceled,
   * we prevent the future scroll events by calling preventDefault.
   */
  handleTouchMove: (arg0: Event) => void = (e: Event) => {
    if (this.state.allowedToDrag) {
      e.preventDefault();
    } else {
      this.resetDelayTimeout();
    }
  };

  /**
   * Reset the drag timer and clear all events and values.
   */
  resetDelayTimeout: () => void = () => {
    clearTimeout(this.dragDelayTimeout);
    this.dragDelayTimeout = undefined;
    this.setState({
      allowedToDrag: false
    });
    this.removeChildEvents();

    if (
      document.body.style.userSelect === "none" ||
      document.body.style.webkitUserSelect === "none"
    ) {
      document.body.style.webkitUserSelect = "";
      document.body.style.userSelect = "";
    }
  };

  /**
   * onDragStart event handler
   */
  onDragStart: DraggableEventHandler = (e, { node }) => {
    const { onDragStart, transformScale } = this.props;
    if (!onDragStart) return;
    const newPosition: PartialPosition = {
      top: 0,
      left: 0,
      deg: 0
    };
    // TODO: this wont work on nested parents
    const { offsetParent } = node;
    if (!offsetParent) return;
    const parentRect = offsetParent.getBoundingClientRect();
    const clientRect = node.getBoundingClientRect();
    const cLeft = clientRect.left / transformScale;
    const pLeft = parentRect.left / transformScale;
    const cTop = clientRect.top / transformScale;
    const pTop = parentRect.top / transformScale;
    newPosition.left = cLeft - pLeft + offsetParent.scrollLeft;
    newPosition.top = cTop - pTop + offsetParent.scrollTop;
    this.setState({
      dragging: newPosition
    });
    // Call callback with this data
    const { x, y } = calcXY(
      this.getPositionParams(),
      newPosition.top,
      newPosition.left,
      this.props.w,
      this.props.h
    );
    return onDragStart.call(this, this.props.i, x, y, {
      e,
      node,
      newPosition
    } as any);
  };

  /**
   * onDrag event handler
   */
  onDrag: DraggableEventHandler = (e, { node, deltaX, deltaY }) => {
    const { onDrag } = this.props;
    if (!onDrag) return;

    if (!this.state.dragging) {
      throw new Error("onDrag called before onDragStart.");
    }

    let top = this.state.dragging.top + deltaY;
    let left = this.state.dragging.left + deltaX;
    const now = Date.now();
    const timeDelta = now - (this?.state?.lastFrameTime || 0);
    this.setState({
      lastFrameTime: now
    });
    const distance = Math.sqrt(deltaX ** 2 + deltaY ** 2);
    const speed = distance / timeDelta; // px per ms

    const rotationDirection = deltaX > 0 ? -1 : 1;
    let targetDeg = Math.min(speed * 2, 45) * rotationDirection;
    targetDeg *= 3;
    // Update and maintain the rotation history
    const rotationHistory = this.state.rotationHistory;
    rotationHistory.push(targetDeg);

    if (rotationHistory.length > 5) {
      // Keep last 5 entries
      rotationHistory.shift();
    }

    // Calculate the average rotation from the history
    const averageDeg =
      rotationHistory.reduce((a, b) => a + b, 0) / rotationHistory.length;
    const currentDeg = this.state.dragging.deg || 0;
    const smoothedDeg = this.lerp(currentDeg, averageDeg, 0.05); // Smaller alpha for smoother transition

    const { isBounded, i, w, h, containerWidth } = this.props;
    const positionParams = this.getPositionParams();

    // Boundary calculations; keeps items within the grid
    if (isBounded) {
      const { offsetParent } = node;

      if (offsetParent) {
        const { margin, rowHeight } = this.props;
        const bottomBoundary =
          offsetParent.clientHeight - calcGridItemWHPx(h, rowHeight, margin[0]);
        top = clamp(top, 0, bottomBoundary);
        const colWidth = calcGridColWidth(positionParams);
        const rightBoundary =
          containerWidth - calcGridItemWHPx(w, colWidth, margin[1]);
        left = clamp(left, 0, rightBoundary);
      }
    }

    const newPosition: PartialPosition = {
      top,
      left,
      deg: smoothedDeg
    };
    this.setState({
      dragging: newPosition
    });
    // Call callback with this data
    const { x, y } = calcXY(positionParams, top, left, w, h);
    return onDrag.call(this, i, x, y, {
      e,
      node,
      newPosition
    } as any);
  };

  /**
   * onDragStop event handler
   */
  onDragStop: DraggableEventHandler = (e, { node }) => {
    this.resetDelayTimeout();
    const { onDragStop } = this.props;
    if (!onDragStop) return;

    if (!this.state.dragging) {
      throw new Error("onDragEnd called before onDragStart.");
    }

    const { w, h, i } = this.props;
    const { left, top } = this.state.dragging;
    const newPosition: PartialPosition = {
      top,
      left,
      deg: 0
    };
    this.setState({
      dragging: null
    });
    const { x, y } = calcXY(this.getPositionParams(), top, left, w, h);
    return onDragStop.call(this, i, x, y, {
      e,
      node,
      newPosition
    } as any);
  };

  /**
   * onResizeStop event handler
   */
  onResizeStop: GridItemResizeCallback = (e, callbackData, position) =>
    this.onResizeHandler(e, callbackData, position, "onResizeStop");
  // onResizeStart event handler
  onResizeStart: GridItemResizeCallback = (e, callbackData, position) =>
    this.onResizeHandler(e, callbackData, position, "onResizeStart");
  // onResize event handler
  onResize: GridItemResizeCallback = (e, callbackData, position) =>
    this.onResizeHandler(e, callbackData, position, "onResize");

  /**
   * Wrapper around resize events to provide more useful data.
   */
  onResizeHandler(
    e: Event,
    { node, size, handle }: ResizeCallbackData, // 'size' is updated position
    position: Position, // existing position
    handlerName: keyof Props
  ): void {
    const handler = this.props[handlerName];
    if (!handler) return;
    const { x, y, i, maxH, minH, containerWidth } = this.props;
    const { minW, maxW } = this.props;
    // Clamping of dimensions based on resize direction
    let updatedSize = size;

    if (node) {
      updatedSize = resizeItemInDirection(
        handle,
        position,
        size,
        containerWidth
      );
      this.setState({
        resizing: handlerName === "onResizeStop" ? null : updatedSize
      });
    }

    // Get new XY based on pixel size
    let { w, h } = calcWH(
      this.getPositionParams(),
      updatedSize.width,
      updatedSize.height,
      x,
      y,
      handle
    );
    // Min/max capping.
    // minW should be at least 1 (TODO propTypes validation?)
    w = clamp(w, Math.max(minW, 1), maxW);
    h = clamp(h, minH, maxH);
    (handler as any).call(this, i, w, h, {
      e,
      node,
      size: updatedSize,
      handle
    });
  }

  render(): ReactNode {
    const {
      x,
      y,
      w,
      h,
      deg,
      isDraggable,
      isResizable,
      droppingPosition,
      useCSSTransforms
    } = this.props;
    const pos = calcGridItemPosition(
      this.getPositionParams(),
      x,
      y,
      w,
      h,
      deg,
      this.state
    );
    const child = React.Children.only(this.props.children);
    // Create the child element. We clone the existing element but modify its className and style.
    let newChild = React.cloneElement(child, {
      ref: this.elementRef,
      className: clsx(
        "react-grid-item",
        child.props.className,
        this.props.className,
        {
          static: this.props.static,
          resizing: Boolean(this.state.resizing),
          "react-draggable": isDraggable,
          "react-draggable-dragging": Boolean(this.state.dragging),
          dropping: Boolean(droppingPosition),
          cssTransforms: useCSSTransforms
        }
      ),
      // We can set the width and height on the child, but unfortunately we can't set the position.
      style: {
        ...this.props.style,
        ...child.props.style,
        ...this.createStyle(pos)
      }
    });
    // Resizable support. This is usually on but the user can toggle it off.
    newChild = this.mixinResizable(newChild, pos, isResizable);
    // Draggable support. This is always on, except for with placeholders.
    newChild = this.mixinDraggable(newChild, isDraggable);
    return newChild;
  }
}
