import clsx from "clsx";
import React from "react";
import type { ReactElement, ReactNode, RefObject } from "react";
import { DraggableCore, type DraggableEventHandler } from "react-draggable";
import { Resizable } from "react-resizable";
import { ResizeHandle as DefaultResizeHandle } from "./resize-handle";
import {
  calcGridColWidth,
  calcGridItemPosition,
  calcGridItemWHPx,
  calcWH,
  calcXY,
  clamp,
} from "../calculate-utils";
import {
  createLiveSpring,
  calculateVelocityFromHistory,
  velocityToRotation,
  VELOCITY_WINDOW_MS,
  SCALE_SPRING_CONFIG,
  SPRING_DEFAULTS,
  POSITION_SPRING_CONFIG,
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
import { fastPositionEqual, resizeItemInDirection, setTransform } from "../utils";

const gridContainerClassName = "dnd-grid";

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
  // Position spring animation state (for smooth settling after drag)
  isAnimating: boolean;
  animatedX: number;
  animatedY: number;
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
  onSettleComplete?: (i: string) => void;
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
    // Position spring animation state (for smooth settling after drag)
    isAnimating: false,
    animatedX: 0,
    animatedY: 0,
  };
  elementRef: RefObject<HTMLDivElement> = React.createRef() as RefObject<HTMLDivElement>;
  springAnimationFrame: number | null = null;
  // Synchronous flag to avoid race condition with async setState
  _isSettling = false;

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
  // Position springs for smooth settling animation after drag (underdamped for bounce)
  xSpring = createLiveSpring(POSITION_SPRING_CONFIG);
  ySpring = createLiveSpring(POSITION_SPRING_CONFIG);

  shouldComponentUpdate(nextProps: Props, nextState: State): boolean {
    // We can't deeply compare children. If the developer memoizes them, we can
    // use this optimization.
    if (this.props.children !== nextProps.children) return true;
    if (this.props.droppingPosition !== nextProps.droppingPosition) return true;
    if (this.state.allowedToDrag !== nextState.allowedToDrag) return true;
    // Re-render when spring-animated values change (for swing effect)
    if (this.state.currentRotation !== nextState.currentRotation) return true;
    if (this.state.currentScale !== nextState.currentScale) return true;
    // Re-render when position animation state changes
    if (this.state.animatedX !== nextState.animatedX) return true;
    if (this.state.animatedY !== nextState.animatedY) return true;
    if (this.state.isAnimating !== nextState.isAnimating) return true;
    
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
    return !fastPositionEqual(oldPosition, newPosition);
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

  getGridContainer(node: HTMLElement | null): HTMLElement | null {
    if (!node) return null;
    const container = node.closest(`.${gridContainerClassName}`);
    return container instanceof HTMLElement ? container : null;
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
   * Create the style object for positioning the grid item using CSS transforms.
   */
  createStyle(pos: Position): Record<string, string | null | undefined> {
    const { static: isStatic } = this.props;
    // Use spring-animated scale and rotation (matches swing-card.tsx useSpring behavior)
    const scale = isStatic ? 1 : this.state.currentScale;
    // Override pos.deg with spring-animated currentRotation during drag/animation
    const rotation = isStatic ? pos.deg : this.state.currentRotation;

    // Use animated position when isAnimating (settling after drag)
    let finalPos = { ...pos, deg: rotation };
    if (!isStatic && this.state.isAnimating) {
      finalPos = {
        ...finalPos,
        left: this.state.animatedX,
        top: this.state.animatedY,
      };
    }

    // COMPENSATE FOR CENTER-ORIGIN SCALE
    // With center origin, scale(s) shifts visual top-left by -(s-1) * dimensions / 2
    // We compensate so visual position = logical position regardless of scale
    // This is the "shadow element at scale 1" concept
    if (!isStatic && scale !== 1) {
      const scaleCompX = (scale - 1) * pos.width / 2;
      const scaleCompY = (scale - 1) * pos.height / 2;
      finalPos = {
        ...finalPos,
        left: finalPos.left + scaleCompX,
        top: finalPos.top + scaleCompY,
      };
    }

    return setTransform(finalPos, scale);
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

    // Use the default resize handle if none is provided
    const handleRenderer =
      resizeHandle ??
      ((axis: ResizeHandleAxis, ref: React.RefObject<HTMLElement>) => (
        <DefaultResizeHandle ref={ref as React.RefObject<HTMLDivElement>} handleAxis={axis} />
      ));

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
        handle={handleRenderer}
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
    const container = this.getGridContainer(node) || node.offsetParent;
    if (!container) return;
    const parentRect = (container as HTMLElement).getBoundingClientRect();
    const clientRect = node.getBoundingClientRect();
    const cLeft = clientRect.left / transformScale;
    const pLeft = parentRect.left / transformScale;
    const cTop = clientRect.top / transformScale;
    const pTop = parentRect.top / transformScale;
    const scrollLeft = (container as HTMLElement).scrollLeft ?? 0;
    const scrollTop = (container as HTMLElement).scrollTop ?? 0;
    newPosition.left = cLeft - pLeft + scrollLeft;
    newPosition.top = cTop - pTop + scrollTop;
    this.setState({
      dragging: newPosition,
      targetScale: 1.04, // Match swing-card.tsx handleDragStart: scaleRaw.set(1.04)
      isAnimating: false, // Clear any pending settling animation
    });

    // Set scale spring target directly (setState is async, so we can't rely on state being updated)
    // This matches swing-card.tsx handleDragStart: scaleRaw.set(1.04)
    this.scaleSpring.setTarget(1.04);
    // Note: Don't set rotation target here - let onDrag set it based on velocity

    // Start continuous spring animation (matches swing-card.tsx useSpring behavior)
    this.startSpringAnimation();

    // Set grabbing cursor on body during drag
    document.body.classList.add('dnd-grid-dragging');

    // Animate shadow on drag start
    if (this.elementRef.current) {
      this.elementRef.current.animate(
        [
          { boxShadow: "0 2px 4px rgba(0,0,0,.04)" },
          { boxShadow: "0 0 1px 1px rgba(0, 0, 0, 0.04), 0 36px 92px rgba(0, 0, 0, 0.06), 0 23.3333px 53.8796px rgba(0, 0, 0, 0.046), 0 13.8667px 29.3037px rgba(0, 0, 0, 0.036), 0 7.2px 14.95px rgba(0, 0, 0, 0.03), 0 2.93333px 7.4963px rgba(0, 0, 0, 0.024), 0 0.666667px 3.62037px rgba(0, 0, 0, 0.014)" },
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
      const container = this.getGridContainer(node) || offsetParent;

      if (container) {
        const { margin, rowHeight } = this.props;
        const bottomBoundary =
          (container as HTMLElement).clientHeight - calcGridItemWHPx(h, rowHeight, margin[0]);
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
    this.updateSpringTargets(targetRotation, 1.04);

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
      const xState = this.xSpring.step(now);
      const yState = this.ySpring.step(now);

      // Update state with current spring values - React will re-render with new transform
      // This matches swing-card.tsx where useSpring values are used in style prop
      this.setState({
        currentRotation: rotationState.value,
        currentScale: scaleState.value,
        animatedX: xState.value,
        animatedY: yState.value,
      });

      // Check if ALL springs are done
      const allSpringsDone = rotationState.done && scaleState.done && xState.done && yState.done;

      // Continue animation while dragging or if settling after drag
      // Use _isSettling (synchronous) to avoid race condition with async setState
      if (this.state.dragging || (this._isSettling && !allSpringsDone)) {
        this.springAnimationFrame = requestAnimationFrame(animate);
      } else {
        // All springs finished - exit animation mode
        const wasSettling = this._isSettling;
        this._isSettling = false;
        if (this.state.isAnimating) {
          this.setState({ isAnimating: false });
        }
        this.springAnimationFrame = null;

        // Notify parent that settling animation is complete
        if (wasSettling && this.props.onSettleComplete) {
          this.props.onSettleComplete(this.props.i);
        }
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

    const { w, h, i, x, y, deg } = this.props;
    const { left, top } = this.state.dragging;

    // Calculate target grid position (where the item will settle)
    const targetPos = calcGridItemPosition(
      this.getPositionParams(),
      x,
      y,
      w,
      h,
      deg,
      null // No state override - get the actual grid position
    );

    // Initialize position springs: animate from current drag position to grid slot
    this.xSpring.setCurrent(left);
    this.xSpring.setTarget(targetPos.left);
    this.ySpring.setCurrent(top);
    this.ySpring.setTarget(targetPos.top);

    // Set spring targets to 0 (rotation) and 1 (scale)
    // This matches swing-card.tsx handleDragEnd: rotateRaw.set(0), scaleRaw.set(1)
    // The continuous spring animation will smoothly animate back to these targets
    // creating the characteristic Bento "swing" effect with underdamped oscillation
    this.updateSpringTargets(0, 1);

    const newPosition: PartialPosition = {
      top,
      left,
      deg: 0,
    };

    // Set synchronous flag BEFORE async setState to avoid race condition
    // This ensures animation loop continues while settling
    this._isSettling = true;

    // Clear dragging state but enter animation mode
    // Springs will animate position, rotation, scale together
    this.setState({
      dragging: null,
      positionHistory: [],
      isAnimating: true,
      animatedX: left,
      animatedY: top,
    });

    // Remove grabbing cursor from body
    document.body.classList.remove('dnd-grid-dragging');

    // Animate shadow off on drag stop
    if (this.elementRef.current) {
      this.elementRef.current.animate(
        [
          { boxShadow: "0 0 1px 1px rgba(0, 0, 0, 0.04), 0 36px 92px rgba(0, 0, 0, 0.06), 0 23.3333px 53.8796px rgba(0, 0, 0, 0.046), 0 13.8667px 29.3037px rgba(0, 0, 0, 0.036), 0 7.2px 14.95px rgba(0, 0, 0, 0.03), 0 2.93333px 7.4963px rgba(0, 0, 0, 0.024), 0 0.666667px 3.62037px rgba(0, 0, 0, 0.014)" },
          { boxShadow: "0 2px 4px rgba(0,0,0,.04)" },
        ],
        {
          duration: 200,
          easing: "ease-out",
          fill: "forwards",
        }
      );
    }

    const gridPos = calcXY(this.getPositionParams(), top, left, w, h);
    return onDragStop.call(this, i, gridPos.x, gridPos.y, {
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
    // Min/max capping with safe defaults in case optional bounds are missing.
    const normalizedMinW = typeof minW === "number" ? Math.max(minW, 1) : 1;
    const normalizedMinH = typeof minH === "number" ? minH : 1;
    const normalizedMaxW =
      typeof maxW === "number" ? maxW : Number.POSITIVE_INFINITY;
    const normalizedMaxH =
      typeof maxH === "number" ? maxH : Number.POSITIVE_INFINITY;
    w = clamp(w, normalizedMinW, normalizedMaxW);
    h = clamp(h, normalizedMinH, normalizedMaxH);
    (handler as any).call(this, i, w, h, {
      e,
      node,
      size: updatedSize,
      handle,
    });
  }

  render(): ReactNode {
    const { x, y, w, h, deg, isDraggable, isResizable, droppingPosition } = this.props;
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
        "dnd-grid-animating": this._isSettling, // Use sync flag - set BEFORE async setState to avoid race condition
        dropping: Boolean(droppingPosition),
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
