import clsx from "clsx";
import React from "react";
import type { ReactElement, ReactNode, RefObject } from "react";
import { DraggableCore, type DraggableEventHandler } from "react-draggable";
import { Resizable } from "react-resizable";
import {
  calcGridColWidth,
  calcGridItemPosition,
  calcGridItemWHPx,
  calcWH,
  calcXY,
  clamp,
} from "../calculateUtils";
import {
  createLiveSpring,
  calculateVelocityFromHistory,
  velocityToRotation,
  VELOCITY_WINDOW_MS,
  SCALE_SPRING_CONFIG,
  SPRING_DEFAULTS,
  type PointWithTimestamp,
} from "../spring";
import type {
  DroppingPosition,
  GridDragEvent,
  GridResizeEvent,
  Position,
  PositionParams,
  ResizeHandle,
  ResizeHandleAxis,
} from "../types";
import { fastPositionEqual, perc, resizeItemInDirection, setTopLeft, setTransform } from "../utils";

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

type GridItemResizeCallback = (e: Event, data: ResizeCallbackData, position: Position) => void;

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
  positionHistory: PointWithTimestamp[];
  // Continuous spring animation state (matches swing-card.tsx useSpring behavior)
  currentRotation: number;
  targetRotation: number;
  currentScale: number;
  targetScale: number;
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
  resizeHandle?: ResizeHandle;
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
    maxH: Number.POSITIVE_INFINITY,
    maxW: Number.POSITIVE_INFINITY,
    transformScale: 1,
  };
  state: State = {
    dragEnabled: false,
    allowedToDrag: false,
    resizing: null,
    dragging: null,
    className: "",
    positionHistory: [],
    // Spring animation state (matches swing-card.tsx useSpring behavior)
    currentRotation: 0,
    targetRotation: 0,
    currentScale: 1,
    targetScale: 1,
  };
  elementRef: RefObject<HTMLDivElement> = React.createRef() as RefObject<HTMLDivElement>;
  springAnimationFrame: number | null = null;

  // Live spring instances for continuous animation (like Framer Motion's useSpring)
  rotationSpring = createLiveSpring({
    stiffness: SPRING_DEFAULTS.stiffness,
    damping: SPRING_DEFAULTS.damping,
    mass: SPRING_DEFAULTS.mass,
    restSpeed: 2,
    restDistance: 0.5,
  });
  scaleSpring = createLiveSpring({
    stiffness: SCALE_SPRING_CONFIG.stiffness,
    damping: SCALE_SPRING_CONFIG.damping,
    restSpeed: SCALE_SPRING_CONFIG.restSpeed,
    restDistance: 0.001, // Scale changes by 0.02, need tiny restDistance (not 0.5 default)
  });

  shouldComponentUpdate(nextProps: Props, nextState: State): boolean {
    // We can't deeply compare children. If the developer memoizes them, we can
    // use this optimization.
    if (this.props.children !== nextProps.children) return true;
    if (this.props.droppingPosition !== nextProps.droppingPosition) return true;
    if (this.state.allowedToDrag !== nextState.allowedToDrag) return true;
    // Re-render when spring-animated values change (for swing effect)
    if (this.state.currentRotation !== nextState.currentRotation) return true;
    if (this.state.currentScale !== nextState.currentScale) return true;
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

  componentWillUnmount() {
    // Clean up event listeners and timeouts to prevent memory leaks
    this.removeChildEvents();
    if (this.dragDelayTimeout) {
      clearTimeout(this.dragDelayTimeout);
      this.dragDelayTimeout = undefined;
    }
    // Cancel spring animation
    if (this.springAnimationFrame) {
      cancelAnimationFrame(this.springAnimationFrame);
      this.springAnimationFrame = null;
    }
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
      top: 0,
    };
    const { dragging } = this.state;
    const shouldDrag =
      dragging &&
      (droppingPosition.left !== prevDroppingPosition.left ||
        droppingPosition.top !== prevDroppingPosition.top);

    if (!dragging) {
      this.onDragStart(
        droppingPosition?.e as any,
        {
          node,
          deltaX: droppingPosition.left,
          deltaY: droppingPosition.top,
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
          deltaY,
        } as any
      );
    }
  }

  getPositionParams(props: Props = this.props): PositionParams {
    return {
      cols: props.cols,
      containerPadding: props.containerPadding,
      containerWidth: props.containerWidth,
      margin: props.margin,
      maxRows: props.maxRows,
      rowHeight: props.rowHeight,
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
    const { static: isStatic, usePercentages, containerWidth, useCSSTransforms } = this.props;
    // Use spring-animated scale and rotation (matches swing-card.tsx useSpring behavior)
    const scale = isStatic ? 1 : this.state.currentScale;
    // Override pos.deg with spring-animated currentRotation during drag/animation
    const rotation = isStatic ? pos.deg : this.state.currentRotation;
    const posWithSpringRotation = { ...pos, deg: rotation };
    let style;

    // CSS Transforms support (default)
    if (useCSSTransforms) {
      style = setTransform(posWithSpringRotation, scale);
    } else {
      // top,left (slow)
      style = setTopLeft(posWithSpringRotation, scale);

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

    // Note: We no longer disable DraggableCore based on touch delay state.
    // The delay is now handled in onDragStart for touch events only.
    // This allows mouse events to work normally on touch-capable desktops.

    return (
      <DraggableCore
        disabled={!isDraggable}
        onStart={this.onDragStart}
        onMouseDown={delayedDragEnabled ? this.onMouseDown : undefined}
        onDrag={this.onDrag}
        onStop={this.onDragStop}
        handle={this.props.handle}
        cancel={".react-resizable-handle" + (this.props.cancel ? "," + this.props.cancel : "")}
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
    return (e: Event, data: ResizeCallbackData): ((...args: Array<any>) => any) =>
      handler(e, data, position);
  }

  /**
   * Mix a Resizable instance into a child.
   */
  mixinResizable(
    child: ReactElement<any>,
    position: Position,
    isResizable: boolean
  ): ReactElement<any> {
    const { cols, minW, minH, maxW, maxH, transformScale, resizeHandles, resizeHandle } =
      this.props;
    const positionParams = this.getPositionParams();
    // This is the max possible width - doesn't go to infinity because of the width of the window
    const maxWidth = calcGridItemPosition(positionParams, 0, 0, cols, 0, 0).width;
    // Calculate min/max constraints using our min & maxes
    const mins = calcGridItemPosition(positionParams, 0, 0, minW, minH, 0);
    const maxes = calcGridItemPosition(positionParams, 0, 0, maxW, maxH, 0);
    const minConstraints: [width: number, height: number] = [mins.width, mins.height];
    const maxConstraints: [width: number, height: number] = [
      Math.min(maxes.width, maxWidth),
      Math.min(maxes.height, Number.POSITIVE_INFINITY),
    ];
    return (
      <Resizable // These are opts for the resize handle itself
        draggableOpts={{
          disabled: !isResizable,
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
  addChildEvent: (type: string, event: (e: Event) => void, passive?: boolean) => void = (
    type,
    event,
    passive = true
  ) => {
    if ((this?.elementRef as any)?.current) {
      (this.elementRef as any).current.addEventListener(type, event, {
        passive,
      });
      this.childEvents.push({
        type,
        event,
        passive,
      });
    }
  };
  removeChildEvents: () => void = () => {
    if ((this?.elementRef as any)?.current) {
      this.childEvents.forEach(({ type, event, passive }) => {
        (this?.elementRef as any)?.current.removeEventListener(type, event, {
          passive,
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
  onMouseDown: (arg0: Event) => void = (e) => {
    // handle touch events only
    if (!this.dragDelayTimeout && e instanceof TouchEvent) {
      this.startDragDelayTimeout(e);
    }
  };

  /**
   * Start the delayed counter to determine when a drag should start.
   */
  startDragDelayTimeout: (arg0: Event) => void = (e) => {
    // Prevent text selection while dragging.
    if (document.body.style.userSelect === "" || document.body.style.webkitUserSelect === "") {
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
          allowedToDrag: true,
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
      allowedToDrag: false,
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
    const { onDragStart, transformScale, dragTouchDelayDuration } = this.props;
    if (!onDragStart) return;

    // For touch events with delay enabled, block if delay hasn't elapsed
    const isTouchEvent = e instanceof TouchEvent || (e as any).touches !== undefined;
    if (isTouchEvent && dragTouchDelayDuration && this.isTouchCapable() && !this.state.allowedToDrag) {
      return false; // Block the drag, let onMouseDown handle the delay
    }
    const newPosition: PartialPosition = {
      top: 0,
      left: 0,
      deg: 0,
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
      dragging: newPosition,
      targetScale: 1.02, // Match swing-card.tsx handleDragStart: scaleRaw.set(1.02)
    });

    // Set scale spring target directly (setState is async, so we can't rely on state being updated)
    // This matches swing-card.tsx handleDragStart: scaleRaw.set(1.02)
    this.scaleSpring.setTarget(1.02);
    // Note: Don't set rotation target here - let onDrag set it based on velocity

    // Start continuous spring animation (matches swing-card.tsx useSpring behavior)
    this.startSpringAnimation();

    // Animate shadow on drag start
    if (this.elementRef.current) {
      this.elementRef.current.animate(
        [
          { boxShadow: "0 0 0 0 rgba(0,0,0,0)" },
          { boxShadow: "0 25px 50px -12px rgba(0,0,0,0.15), 0 12px 24px -8px rgba(0,0,0,0.1)" },
        ],
        {
          duration: 200,
          easing: "cubic-bezier(.2, 0, 0, 1)",
          fill: "forwards",
        }
      );
    }

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
      newPosition,
    } as any);
  };

  /**
   * onDrag event handler
   * Uses Bento-style velocity-based rotation with 100ms sliding window
   */
  onDrag: DraggableEventHandler = (e, { node, deltaX, deltaY }) => {
    const { onDrag } = this.props;
    if (!onDrag) return;

    // Guard against onDrag being called before onDragStart
    if (!this.state.dragging) {
      return;
    }

    // NOTE: Don't cancel spring animation here - let it continue running
    // The spring will smoothly animate toward the updated targets

    let top = this.state.dragging.top + deltaY;
    let left = this.state.dragging.left + deltaX;

    const now = performance.now();

    // Get pointer position from event for velocity tracking
    // This matches swing-card.tsx which uses info.point.x/y (pointer position)
    let pointerX = 0;
    let pointerY = 0;
    if (e instanceof MouseEvent) {
      pointerX = e.clientX;
      pointerY = e.clientY;
    } else if (e instanceof TouchEvent && e.touches.length > 0) {
      pointerX = e.touches[0].clientX;
      pointerY = e.touches[0].clientY;
    } else if ((e as unknown as PointerEvent).clientX !== undefined) {
      pointerX = (e as unknown as PointerEvent).clientX;
      pointerY = (e as unknown as PointerEvent).clientY;
    }

    // Track pointer position history for velocity calculation (100ms sliding window)
    let positionHistory: PointWithTimestamp[] = [
      ...this.state.positionHistory,
      {
        x: pointerX,
        y: pointerY,
        timestamp: now,
      },
    ];

    // Keep only last 100ms of history
    positionHistory = positionHistory.filter(
      (entry) => now - entry.timestamp < VELOCITY_WINDOW_MS
    );

    // Calculate velocity from history using Bento algorithm
    const velocity = calculateVelocityFromHistory(positionHistory);

    // Convert velocity to rotation using Bento formula
    // INVERTED: drag right = tilt left (negative rotation) due to inertia
    const targetRotation = velocityToRotation(velocity.x);

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
        const rightBoundary = containerWidth - calcGridItemWHPx(w, colWidth, margin[1]);
        left = clamp(left, 0, rightBoundary);
      }
    }

    const newPosition: PartialPosition = {
      top,
      left,
      deg: this.state.currentRotation, // Use current spring value for position
    };

    // Update spring targets - spring will smoothly animate toward targetRotation
    // This matches swing-card.tsx: rotateRaw.set(targetRotation)
    this.updateSpringTargets(targetRotation, 1.02);

    this.setState({
      dragging: newPosition,
      positionHistory,
    });
    // Call callback with this data
    const { x, y } = calcXY(positionParams, top, left, w, h);
    return onDrag.call(this, i, x, y, {
      e,
      node,
      newPosition,
    } as any);
  };

  /**
   * Start continuous spring animation loop
   * This matches swing-card.tsx useSpring behavior - continuously smoothing values
   */
  startSpringAnimation = () => {
    // Initialize springs with current state
    this.rotationSpring.setCurrent(this.state.currentRotation);
    this.rotationSpring.setTarget(this.state.targetRotation);
    this.scaleSpring.setCurrent(this.state.currentScale);
    this.scaleSpring.setTarget(this.state.targetScale);

    const animate = () => {
      const now = performance.now();
      const rotationState = this.rotationSpring.step(now);
      const scaleState = this.scaleSpring.step(now);

      // Update state with current spring values - React will re-render with new transform
      // This matches swing-card.tsx where useSpring values are used in style prop
      this.setState({
        currentRotation: rotationState.value,
        currentScale: scaleState.value,
      });

      // Continue animation while dragging OR if either spring is not at rest
      // Must keep running during drag so rotation responds to velocity changes
      if (this.state.dragging || !rotationState.done || !scaleState.done) {
        this.springAnimationFrame = requestAnimationFrame(animate);
      } else {
        this.springAnimationFrame = null;
      }
    };

    this.springAnimationFrame = requestAnimationFrame(animate);
  };

  /**
   * Update spring targets during drag
   * This matches swing-card.tsx behavior where rotateRaw.set() updates the target
   */
  updateSpringTargets = (targetRotation: number, targetScale: number) => {
    this.rotationSpring.setTarget(targetRotation);
    this.scaleSpring.setTarget(targetScale);
    this.setState({ targetRotation, targetScale });
  };

  /**
   * onDragStop event handler
   */
  onDragStop: DraggableEventHandler = (e, { node }) => {
    this.resetDelayTimeout();
    const { onDragStop } = this.props;
    if (!onDragStop) return;

    // Guard against onDragStop being called before onDragStart
    if (!this.state.dragging) {
      return;
    }

    const { w, h, i } = this.props;
    const { left, top } = this.state.dragging;

    // Set spring targets to 0 (rotation) and 1 (scale)
    // This matches swing-card.tsx handleDragEnd: rotateRaw.set(0), scaleRaw.set(1)
    // The continuous spring animation will smoothly animate back to these targets
    // creating the characteristic Bento "swing" effect with underdamped oscillation
    this.updateSpringTargets(0, 1);

    const newPosition: PartialPosition = {
      top,
      left,
      deg: 0, // Target is 0, spring will animate there
    };
    this.setState({
      dragging: null,
      positionHistory: [], // Clear history
    });

    // Animate shadow off on drag stop
    if (this.elementRef.current) {
      this.elementRef.current.animate(
        [
          { boxShadow: "0 25px 50px -12px rgba(0,0,0,0.15), 0 12px 24px -8px rgba(0,0,0,0.1)" },
          { boxShadow: "0 0 0 0 rgba(0,0,0,0)" },
        ],
        {
          duration: 200,
          easing: "ease-out",
          fill: "forwards",
        }
      );
    }

    const { x, y } = calcXY(this.getPositionParams(), top, left, w, h);
    return onDragStop.call(this, i, x, y, {
      e,
      node,
      newPosition,
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
      updatedSize = resizeItemInDirection(handle, position, size, containerWidth);
      this.setState({
        resizing: handlerName === "onResizeStop" ? null : updatedSize,
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
      handle,
    });
  }

  render(): ReactNode {
    const { x, y, w, h, deg, isDraggable, isResizable, droppingPosition, useCSSTransforms } =
      this.props;
    const pos = calcGridItemPosition(this.getPositionParams(), x, y, w, h, deg, this.state);
    const child = React.Children.only(this.props.children);
    // Create the child element. We clone the existing element but modify its className and style.
    let newChild = React.cloneElement(child, {
      ref: this.elementRef,
      className: clsx("dnd-grid-item", child.props.className, this.props.className, {
        static: this.props.static,
        resizing: Boolean(this.state.resizing),
        "dnd-draggable": isDraggable,
        "dnd-draggable-dragging": Boolean(this.state.dragging),
        dropping: Boolean(droppingPosition),
        cssTransforms: useCSSTransforms,
      }),
      // We can set the width and height on the child, but unfortunately we can't set the position.
      style: {
        ...this.props.style,
        ...child.props.style,
        ...this.createStyle(pos),
      },
    });
    // Resizable support. This is usually on but the user can toggle it off.
    newChild = this.mixinResizable(newChild, pos, isResizable);
    // Draggable support. This is always on, except for with placeholders.
    newChild = this.mixinDraggable(newChild, isDraggable);
    return newChild;
  }
}
