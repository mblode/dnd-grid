import clsx from "clsx";
import type {
  CSSProperties,
  HTMLAttributes,
  ReactElement,
  ReactNode,
  RefAttributes,
  RefObject,
} from "react";
import * as React from "react";
import {
  DraggableCore,
  type DraggableData,
  type DraggableEvent,
  type DraggableEventHandler,
} from "react-draggable";
import { Resizable } from "react-resizable";
import {
  calcGridColWidth,
  calcGridItemPosition,
  calcGridItemWHPx,
  calcWHRaw,
  calcXYRaw,
  clamp,
} from "../calculate-utils";
import {
  applyPositionConstraints,
  applySizeConstraints,
  defaultConstraints,
} from "../constraints";
import { normalizeSpacing } from "../spacing";
import {
  calculateVelocityFromHistory,
  createLiveSpring,
  POSITION_SPRING_CONFIG,
  type PointWithTimestamp,
  SCALE_SPRING_CONFIG,
  SPRING_DEFAULTS,
  VELOCITY_WINDOW_MS,
  velocityToRotation,
} from "../spring";
import type {
  ConstraintContext,
  DroppingPosition,
  GridDragEvent,
  GridResizeEvent,
  ItemState,
  Layout,
  LayoutConstraint,
  LayoutItem,
  Position,
  PositionParams,
  ResizeHandle,
  ResizeHandleAxis,
  Size,
  SlotProps,
  Spacing,
} from "../types";
import { DndGridItemContext } from "../use-item-state";
import { resizeItemInDirection, setTransform } from "../utils";
import { ResizeHandle as DefaultResizeHandle } from "./resize-handle";

const gridContainerClassName = "dnd-grid";
const defaultResizeCursor = "se-resize";
const getResizeCursor = (handle?: ResizeHandleAxis) =>
  handle ? `${handle}-resize` : defaultResizeCursor;
const activeDragItems = new Set<symbol>();
const activeResizeItems = new Map<symbol, string>();
const getActiveResizeCursor = () => {
  let cursor = defaultResizeCursor;
  for (const value of activeResizeItems.values()) {
    cursor = value;
  }
  return cursor;
};
const updateGlobalInteractionState = () => {
  if (typeof document === "undefined") return;
  const { body } = document;
  if (activeDragItems.size > 0) {
    body.classList.add("dnd-grid-dragging");
  } else {
    body.classList.remove("dnd-grid-dragging");
  }
  if (activeResizeItems.size > 0) {
    body.classList.add("dnd-grid-resizing");
    body.style.setProperty("--dnd-grid-resize-cursor", getActiveResizeCursor());
  } else {
    body.classList.remove("dnd-grid-resizing");
    body.style.removeProperty("--dnd-grid-resize-cursor");
  }
};
const setGlobalDragActive = (id: symbol, active: boolean) => {
  if (active) {
    activeDragItems.add(id);
  } else {
    activeDragItems.delete(id);
  }
  updateGlobalInteractionState();
};
const setGlobalResizeActive = (
  id: symbol,
  active: boolean,
  cursor?: string,
) => {
  if (active) {
    activeResizeItems.set(id, cursor ?? defaultResizeCursor);
  } else {
    activeResizeItems.delete(id);
  }
  updateGlobalInteractionState();
};

type PartialPosition = {
  top: number;
  left: number;
  deg: number;
};

type GridItemCallback<Data extends GridDragEvent | GridResizeEvent> = (
  i: string,
  w: number,
  h: number,
  arg3: Data,
) => void;

type ResizeCallbackData = {
  node: HTMLElement;
  size: Size;
  handle: ResizeHandleAxis;
};

type GridItemResizeCallback = (
  e: Event,
  data: ResizeCallbackData,
  position: Position,
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
  children: ReactElement;
  layout: Layout;
  constraints?: LayoutConstraint[];
  cols: number;
  containerWidth: number;
  margin: Spacing;
  containerPadding: Spacing;
  rowHeight: number;
  maxRows: number;
  isDraggable: boolean;
  isResizable: boolean;
  isBounded: boolean;
  static?: boolean;
  transformScale: number;
  droppingPosition?: DroppingPosition;
  className: string;
  style?: CSSProperties;
  slotProps?: SlotProps;
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

type DraggableCoreHandle = {
  handleDragStart?: (e: MouseEvent | TouchEvent) => void;
};

type GridChildProps = HTMLAttributes<HTMLElement> &
  RefAttributes<HTMLElement> &
  Record<string, unknown>;

type GridChildElement = ReactElement<GridChildProps>;

type ResizeHandleElement = ReactElement<
  HTMLAttributes<HTMLElement> &
    RefAttributes<HTMLElement> & {
      handleAxis?: ResizeHandleAxis;
    }
>;

type GridItemHandle = {
  state: State;
  setState: (
    nextState: Partial<State> | ((prevState: State) => Partial<State>),
  ) => void;
  elementRef: RefObject<HTMLDivElement>;
  draggableCoreRef: React.RefObject<DraggableCore>;
  getPositionParams: (currentProps?: Props) => PositionParams;
  createStyle: (pos: Position) => Record<string, string | null | undefined>;
  onDragStart: DraggableEventHandler;
  onDrag: DraggableEventHandler;
  onDragStop: DraggableEventHandler;
  handleTouchMove: (e: Event) => void;
  onResizeStart: GridItemResizeCallback;
  onResize: GridItemResizeCallback;
  onResizeStop: GridItemResizeCallback;
  onResizeHandler: (
    e: Event,
    data: ResizeCallbackData,
    position: Position,
    handlerName: "onResize" | "onResizeStart" | "onResizeStop",
  ) => void;
  startDragDelayTimeout: (e: Event) => void;
  resetDelayTimeout: () => void;
  startSpringAnimation: () => void;
  springAnimationFrame: number | null;
  _isSettling: boolean;
};

export type GridItem = GridItemHandle;

const defaultProps: DefaultProps = {
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

type GridItemProps = Omit<Props, keyof DefaultProps> & Partial<DefaultProps>;

type GridItemComponent = React.ForwardRefExoticComponent<
  React.PropsWithoutRef<GridItemProps> & React.RefAttributes<GridItemHandle>
> & {
  defaultProps?: DefaultProps;
  displayName?: string;
};

/**
 * An individual item within a DndGrid.
 */

const GridItem = React.forwardRef<GridItemHandle, GridItemProps>(
  (incomingProps, ref) => {
    const props = { ...defaultProps, ...incomingProps } as Props;
    const [state, setState] = React.useState<State>(() => ({
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
    }));
    const interactionIdRef = React.useRef<symbol>(Symbol("dnd-grid-item"));
    const resizeActiveRef = React.useRef(false);

    const stateRef = React.useRef(state);
    stateRef.current = state;
    const propsRef = React.useRef(props);
    propsRef.current = props;

    const elementRef = React.useRef<HTMLDivElement>(null);
    const draggableCoreRef = React.useRef<DraggableCore | null>(null);
    const springAnimationFrameRef = React.useRef<number | null>(null);
    const isSettlingRef = React.useRef(false);
    const settleStartTimeRef = React.useRef<number | null>(null);
    const settleFrameCountRef = React.useRef(0);
    const dragPositionRef = React.useRef<PartialPosition | null>(null);
    const childEventsRef = React.useRef<
      {
        type: keyof HTMLElementEventMap;
        event: EventListener;
        passive: boolean;
      }[]
    >([]);
    const dragDelayTimeoutRef = React.useRef<ReturnType<
      typeof setTimeout
    > | null>(null);
    const prevPropsRef = React.useRef<Props | null>(null);
    const handleRef = React.useRef<GridItemHandle | null>(null);

    // Live spring instances for continuous animation (like Framer Motion's useSpring)
    const rotationSpringRef = React.useRef(
      createLiveSpring({
        stiffness: SPRING_DEFAULTS.stiffness,
        damping: SPRING_DEFAULTS.damping,
        mass: SPRING_DEFAULTS.mass,
        restSpeed: 2,
        restDistance: 0.5,
      }),
    );
    const scaleSpringRef = React.useRef(
      createLiveSpring({
        stiffness: SCALE_SPRING_CONFIG.stiffness,
        damping: SCALE_SPRING_CONFIG.damping,
        restSpeed: SCALE_SPRING_CONFIG.restSpeed,
        restDistance: 0.001, // Scale changes by 0.02, need tiny restDistance (not 0.5 default)
      }),
    );
    // Position springs for smooth settling animation after drag (underdamped for bounce)
    const xSpringRef = React.useRef(createLiveSpring(POSITION_SPRING_CONFIG));
    const ySpringRef = React.useRef(createLiveSpring(POSITION_SPRING_CONFIG));

    const setStateFromHandle = React.useCallback(
      (nextState: Partial<State> | ((prevState: State) => Partial<State>)) => {
        setState((prevState) => ({
          ...prevState,
          ...(typeof nextState === "function"
            ? nextState(prevState)
            : nextState),
        }));
      },
      [],
    );

    const getGridContainer = React.useCallback((node: HTMLElement | null) => {
      if (!node) return null;
      const container = node.closest(`.${gridContainerClassName}`);
      return container instanceof HTMLElement ? container : null;
    }, []);

    const getPositionParams = React.useCallback(
      (currentProps: Props = propsRef.current): PositionParams => {
        const margin = normalizeSpacing(currentProps.margin);
        const containerPadding = normalizeSpacing(
          currentProps.containerPadding,
        );
        return {
          cols: currentProps.cols,
          containerPadding,
          containerWidth: currentProps.containerWidth,
          margin,
          maxRows: currentProps.maxRows,
          rowHeight: currentProps.rowHeight,
        };
      },
      [],
    );

    const getConstraintContext = React.useCallback(
      (node?: HTMLElement | null): ConstraintContext => {
        const { cols, maxRows, containerWidth, rowHeight, layout } =
          propsRef.current;
        const margin = normalizeSpacing(propsRef.current.margin);
        const containerPadding = normalizeSpacing(
          propsRef.current.containerPadding,
        );
        const container = node ? getGridContainer(node) : null;
        return {
          cols,
          maxRows,
          containerWidth,
          containerHeight: container ? container.clientHeight : 0,
          rowHeight,
          margin,
          containerPadding,
          layout,
        };
      },
      [getGridContainer],
    );

    const getConstraintItem = React.useCallback((): LayoutItem => {
      const {
        layout,
        i,
        x,
        y,
        w,
        h,
        deg,
        minW,
        minH,
        maxW,
        maxH,
        static: isStatic,
        isDraggable,
        isResizable,
        resizeHandles,
        isBounded,
      } = propsRef.current;
      return {
        i,
        x,
        y,
        w,
        h,
        deg,
        minW,
        minH,
        maxW,
        maxH,
        constraints: layout.find((item) => item.i === i)?.constraints,
        static: isStatic,
        isDraggable,
        isResizable,
        resizeHandles,
        isBounded,
      };
    }, []);

    /**
     * Create the style object for positioning the grid item using CSS transforms.
     */
    const createStyle = React.useCallback(
      (pos: Position): Record<string, string | null | undefined> => {
        const { static: isStatic } = propsRef.current;
        // Use spring-animated scale and rotation (matches swing-card.tsx useSpring behavior)
        const scale = isStatic ? 1 : stateRef.current.currentScale;
        // Override pos.deg with spring-animated currentRotation during drag/animation
        const rotation = isStatic ? pos.deg : stateRef.current.currentRotation;

        // Use animated position when isAnimating (settling after drag)
        let finalPos = { ...pos, deg: rotation };
        if (!isStatic && stateRef.current.isAnimating) {
          finalPos = {
            ...finalPos,
            left: stateRef.current.animatedX,
            top: stateRef.current.animatedY,
          };
        }

        // COMPENSATE FOR CENTER-ORIGIN SCALE
        // With center origin, scale(s) shifts visual top-left by -(s-1) * dimensions / 2
        // We compensate so visual position = logical position regardless of scale
        // This is the "shadow element at scale 1" concept
        if (!isStatic && scale !== 1) {
          const scaleCompX = ((scale - 1) * pos.width) / 2;
          const scaleCompY = ((scale - 1) * pos.height) / 2;
          finalPos = {
            ...finalPos,
            left: finalPos.left + scaleCompX,
            top: finalPos.top + scaleCompY,
          };
        }

        return setTransform(finalPos, scale);
      },
      [],
    );

    // Check if device is touch-capable.
    const isTouchCapable = React.useCallback((): boolean => {
      if (typeof window === "undefined" || typeof navigator === "undefined") {
        return false;
      }
      return "ontouchstart" in window || navigator.maxTouchPoints > 0;
    }, []);

    /**
     * Add an event listener to the grid item.
     * The event will also be added to childEvents array for future use.
     */
    const addChildEvent = React.useCallback(
      (
        type: keyof HTMLElementEventMap,
        event: EventListener,
        passive = true,
      ) => {
        if (elementRef.current) {
          elementRef.current.addEventListener(type, event, {
            passive,
          });
          childEventsRef.current.push({
            type,
            event,
            passive,
          });
        }
      },
      [],
    );

    const removeChildEvents = React.useCallback(() => {
      if (elementRef.current) {
        childEventsRef.current.forEach(({ type, event }) => {
          elementRef.current?.removeEventListener(type, event, false);
        });
        childEventsRef.current = [];
      }
    }, []);

    /**
     * Reset the drag timer and clear all events and values.
     */
    const resetDelayTimeout = React.useCallback(() => {
      if (dragDelayTimeoutRef.current !== null) {
        clearTimeout(dragDelayTimeoutRef.current);
        dragDelayTimeoutRef.current = null;
      }
      setState((prevState) => ({
        ...prevState,
        allowedToDrag: false,
      }));
      removeChildEvents();

      if (
        document.body.style.userSelect === "none" ||
        document.body.style.webkitUserSelect === "none"
      ) {
        document.body.style.webkitUserSelect = "";
        document.body.style.userSelect = "";
      }
    }, [removeChildEvents]);

    /**
     * Prevent user from doing touch and scroll at the same time.
     * If the user starts scrolling, we can not cancel the scroll event,
     * so we cancel the drag event instead.
     *
     * if the user is currently dragging, and the timeout has not been canceled,
     * we prevent the future scroll events by calling preventDefault.
     */
    const handleTouchMove = React.useCallback(
      (e: Event) => {
        if (stateRef.current.allowedToDrag) {
          e.preventDefault();
        } else {
          if (handleRef.current?.resetDelayTimeout) {
            handleRef.current.resetDelayTimeout();
          } else {
            resetDelayTimeout();
          }
        }
      },
      [resetDelayTimeout],
    );

    /**
     * Start the delayed counter to determine when a drag should start.
     */
    const startDragDelayTimeout = React.useCallback(
      (e: Event) => {
        // Prevent text selection while dragging.
        if (
          document.body.style.userSelect === "" ||
          document.body.style.webkitUserSelect === ""
        ) {
          document.body.style.webkitUserSelect = "none";
          document.body.style.userSelect = "none";
        }

        if (!stateRef.current.allowedToDrag) {
          /**
           * Register events to cancel the timeout handler if user releases the mouse or touch
           */
          addChildEvent("touchend", resetDelayTimeout);

          /**
           * Prevent user from doing touch and scroll at the same time.
           * If the user starts scrolling, we can not cancel the scroll event,
           * so we cancel the drag event instead.
           */
          addChildEvent("touchmove", handleTouchMove, false);
          // Start the timeout and assign its handler to the dragDelayTimeout
          dragDelayTimeoutRef.current = setTimeout(() => {
            dragDelayTimeoutRef.current = null;

            // vibrate api is not available on safari or SSR, so we need to check it
            if (
              typeof navigator !== "undefined" &&
              navigator.vibrate &&
              !propsRef.current.static
            ) {
              // vibrate device for 80ms
              navigator.vibrate(80);
            }

            setState((prevState) => ({
              ...prevState,
              allowedToDrag: true,
            }));
            // Start the drag process by calling the DraggableCore handleDragStartFunction directly.
            (
              draggableCoreRef.current as DraggableCoreHandle | null
            )?.handleDragStart?.(e as MouseEvent | TouchEvent);
          }, propsRef.current.dragTouchDelayDuration);
        }
      },
      [addChildEvent, handleTouchMove, resetDelayTimeout],
    );

    /**
     * onMouseDown event is tied to both 'mousedown' and 'touchstart' events in DraggableCore.
     * We start the delayed drag process when the user presses the mouse button or the finger.
     */
    const onMouseDown = React.useCallback(
      (e: Event) => {
        // handle touch events only
        if (!dragDelayTimeoutRef.current && e instanceof TouchEvent) {
          startDragDelayTimeout(e);
        }
      },
      [startDragDelayTimeout],
    );

    /**
     * Start continuous spring animation loop
     * This matches swing-card.tsx useSpring behavior - continuously smoothing values
     */
    const startSpringAnimation = React.useCallback(() => {
      // Cancel any existing animation to prevent multiple loops running simultaneously
      if (springAnimationFrameRef.current !== null) {
        cancelAnimationFrame(springAnimationFrameRef.current);
        springAnimationFrameRef.current = null;
      }

      const rotationSpring = rotationSpringRef.current;
      const scaleSpring = scaleSpringRef.current;
      const xSpring = xSpringRef.current;
      const ySpring = ySpringRef.current;

      // Initialize springs with current state
      rotationSpring.setCurrent(stateRef.current.currentRotation);
      rotationSpring.setTarget(stateRef.current.targetRotation);
      scaleSpring.setCurrent(stateRef.current.currentScale);
      scaleSpring.setTarget(stateRef.current.targetScale);

      // Safety guard: maximum settling duration (2 seconds at 60fps = 120 frames)
      // This prevents infinite loops if springs never settle
      const MAX_SETTLE_FRAMES = 120;
      const MAX_SETTLE_DURATION_MS = 2000;

      const animate = () => {
        const now = performance.now();
        if (isSettlingRef.current) {
          if (settleStartTimeRef.current === null) {
            settleStartTimeRef.current = now;
            settleFrameCountRef.current = 0;
          }
          settleFrameCountRef.current += 1;
          const settleDuration = now - settleStartTimeRef.current;

          // Safety check: force exit if settling runs too long
          if (
            settleFrameCountRef.current > MAX_SETTLE_FRAMES ||
            settleDuration > MAX_SETTLE_DURATION_MS
          ) {
            const wasSettling = isSettlingRef.current;
            isSettlingRef.current = false;
            settleStartTimeRef.current = null;
            settleFrameCountRef.current = 0;
            setState((prevState) => ({
              ...prevState,
              isAnimating: false,
              currentRotation: 0,
              currentScale: 1,
            }));
            springAnimationFrameRef.current = null;

            if (wasSettling && propsRef.current.onSettleComplete) {
              propsRef.current.onSettleComplete(propsRef.current.i);
            }
            return;
          }
        }

        const rotationState = rotationSpring.step(now);
        const scaleState = scaleSpring.step(now);
        const xState = xSpring.step(now);
        const yState = ySpring.step(now);

        // Update state with current spring values - React will re-render with new transform
        // This matches swing-card.tsx where useSpring values are used in style prop
        setState((prevState) => ({
          ...prevState,
          currentRotation: rotationState.value,
          currentScale: scaleState.value,
          animatedX: xState.value,
          animatedY: yState.value,
        }));

        // Check if ALL springs are done
        const allSpringsDone =
          rotationState.done && scaleState.done && xState.done && yState.done;

        // Continue animation while dragging or if settling after drag
        // Use _isSettling (synchronous) to avoid race condition with async setState
        if (
          stateRef.current.dragging ||
          (isSettlingRef.current && !allSpringsDone)
        ) {
          springAnimationFrameRef.current = requestAnimationFrame(animate);
        } else {
          // All springs finished - exit animation mode
          const wasSettling = isSettlingRef.current;
          isSettlingRef.current = false;
          settleStartTimeRef.current = null;
          settleFrameCountRef.current = 0;
          if (stateRef.current.isAnimating) {
            setState((prevState) => ({
              ...prevState,
              isAnimating: false,
            }));
          }
          springAnimationFrameRef.current = null;

          // Notify parent that settling animation is complete
          if (wasSettling && propsRef.current.onSettleComplete) {
            propsRef.current.onSettleComplete(propsRef.current.i);
          }
        }
      };

      springAnimationFrameRef.current = requestAnimationFrame(animate);
    }, []);

    /**
     * Update spring targets during drag
     * This matches swing-card.tsx behavior where rotateRaw.set() updates the target
     */
    const updateSpringTargets = React.useCallback(
      (targetRotation: number, targetScale: number) => {
        rotationSpringRef.current.setTarget(targetRotation);
        scaleSpringRef.current.setTarget(targetScale);
        setState((prevState) => ({
          ...prevState,
          targetRotation,
          targetScale,
        }));
      },
      [],
    );

    /**
     * onDragStart event handler
     */
    const onDragStart: DraggableEventHandler = React.useCallback(
      (e, { node }) => {
        const { onDragStart, transformScale, dragTouchDelayDuration } =
          propsRef.current;

        // For touch events with delay enabled, block if delay hasn't elapsed
        const isTouchEvent = "touches" in e;
        if (
          isTouchEvent &&
          dragTouchDelayDuration &&
          isTouchCapable() &&
          !stateRef.current.allowedToDrag
        ) {
          return false; // Block the drag, let onMouseDown handle the delay
        }
        const newPosition: PartialPosition = {
          top: 0,
          left: 0,
          deg: 0,
        };
        const container = getGridContainer(node) || node.offsetParent;
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
        dragPositionRef.current = newPosition;
        settleStartTimeRef.current = null;
        settleFrameCountRef.current = 0;
        setState((prevState) => ({
          ...prevState,
          dragging: newPosition,
          targetScale: 1.04, // Match swing-card.tsx handleDragStart: scaleRaw.set(1.04)
          isAnimating: false, // Clear any pending settling animation
        }));

        // Set scale spring target directly (setState is async, so we can't rely on state being updated)
        // This matches swing-card.tsx handleDragStart: scaleRaw.set(1.04)
        scaleSpringRef.current.setTarget(1.04);
        // Note: Don't set rotation target here - let onDrag set it based on velocity

        // Start continuous spring animation (matches swing-card.tsx useSpring behavior)
        handleRef.current?.startSpringAnimation?.();

        // Set grabbing cursor on body during drag
        setGlobalDragActive(interactionIdRef.current, true);

        // Animate shadow on drag start
        if (elementRef.current) {
          elementRef.current.animate(
            [
              { boxShadow: "0 2px 4px rgba(0,0,0,.04)" },
              {
                boxShadow:
                  "0 0 1px 1px rgba(0, 0, 0, 0.04), 0 36px 92px rgba(0, 0, 0, 0.06), 0 23.3333px 53.8796px rgba(0, 0, 0, 0.046), 0 13.8667px 29.3037px rgba(0, 0, 0, 0.036), 0 7.2px 14.95px rgba(0, 0, 0, 0.03), 0 2.93333px 7.4963px rgba(0, 0, 0, 0.024), 0 0.666667px 3.62037px rgba(0, 0, 0, 0.014)",
              },
            ],
            {
              duration: 200,
              easing: "cubic-bezier(.2, 0, 0, 1)",
              fill: "forwards",
            },
          );
        }

        // Call callback with this data
        if (onDragStart) {
          const constraints =
            propsRef.current.constraints ?? defaultConstraints;
          const rawPos = calcXYRaw(
            getPositionParams(),
            newPosition.top,
            newPosition.left,
          );
          const { x, y } = applyPositionConstraints(
            constraints,
            getConstraintItem(),
            rawPos.x,
            rawPos.y,
            getConstraintContext(node),
          );
          return onDragStart.call(handleRef.current, propsRef.current.i, x, y, {
            e: e as Event,
            node,
            newPosition,
          });
        }
      },
      [
        getGridContainer,
        getPositionParams,
        getConstraintItem,
        getConstraintContext,
        isTouchCapable,
      ],
    );

    /**
     * onDrag event handler
     * Uses Bento-style velocity-based rotation with 100ms sliding window
     */
    const onDrag: DraggableEventHandler = React.useCallback(
      (e, { node, deltaX, deltaY }) => {
        const { onDrag } = propsRef.current;
        if (!onDrag) return;

        const dragPosition =
          stateRef.current.dragging ?? dragPositionRef.current;
        // Guard against onDrag being called before onDragStart
        if (!dragPosition) {
          return;
        }

        // NOTE: Don't cancel spring animation here - let it continue running
        // The spring will smoothly animate toward the updated targets

        let top = dragPosition.top + deltaY;
        let left = dragPosition.left + deltaX;

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
          ...stateRef.current.positionHistory,
          {
            x: pointerX,
            y: pointerY,
            timestamp: now,
          },
        ];

        // Keep only last 100ms of history
        positionHistory = positionHistory.filter(
          (entry) => now - entry.timestamp < VELOCITY_WINDOW_MS,
        );

        // Calculate velocity from history using Bento algorithm
        const velocity = calculateVelocityFromHistory(positionHistory);

        // Convert velocity to rotation using Bento formula
        // INVERTED: drag right = tilt left (negative rotation) due to inertia
        const targetRotation = velocityToRotation(velocity.x);

        const { isBounded, w, h, containerWidth } = propsRef.current;
        const positionParams = getPositionParams();

        // Boundary calculations; keeps items within the grid
        if (isBounded) {
          const { offsetParent } = node;
          const container = getGridContainer(node) || offsetParent;

          if (container) {
            const { rowHeight } = propsRef.current;
            const margin = normalizeSpacing(propsRef.current.margin);
            const bottomBoundary =
              (container as HTMLElement).clientHeight -
              calcGridItemWHPx(h, rowHeight, margin[0]);
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
          deg: stateRef.current.currentRotation, // Use current spring value for position
        };

        // Update spring targets - spring will smoothly animate toward targetRotation
        // This matches swing-card.tsx: rotateRaw.set(targetRotation)
        updateSpringTargets(targetRotation, 1.04);

        dragPositionRef.current = newPosition;
        setState((prevState) => ({
          ...prevState,
          dragging: newPosition,
          positionHistory,
        }));
        // Call callback with this data
        const constraints = propsRef.current.constraints ?? defaultConstraints;
        const rawPos = calcXYRaw(positionParams, top, left);
        const { x, y } = applyPositionConstraints(
          constraints,
          getConstraintItem(),
          rawPos.x,
          rawPos.y,
          getConstraintContext(node),
        );
        return onDrag.call(handleRef.current, propsRef.current.i, x, y, {
          e: e as Event,
          node,
          newPosition,
        });
      },
      [
        getGridContainer,
        getPositionParams,
        getConstraintItem,
        getConstraintContext,
        updateSpringTargets,
      ],
    );

    /**
     * onDragStop event handler
     */
    const onDragStop: DraggableEventHandler = React.useCallback(
      (e, { node }) => {
        resetDelayTimeout();
        const { onDragStop } = propsRef.current;

        const dragPosition =
          stateRef.current.dragging ?? dragPositionRef.current;
        // Guard against onDragStop being called before onDragStart
        if (!dragPosition) {
          return;
        }

        const { w, h, x, y, deg } = propsRef.current;
        const { left, top } = dragPosition;

        // Calculate target grid position (where the item will settle)
        const targetPos = calcGridItemPosition(
          getPositionParams(),
          x,
          y,
          w,
          h,
          deg,
          null, // No state override - get the actual grid position
        );

        // Initialize position springs: animate from current drag position to grid slot
        xSpringRef.current.setCurrent(left);
        xSpringRef.current.setTarget(targetPos.left);
        ySpringRef.current.setCurrent(top);
        ySpringRef.current.setTarget(targetPos.top);

        // Set spring targets to 0 (rotation) and 1 (scale)
        // This matches swing-card.tsx handleDragEnd: rotateRaw.set(0), scaleRaw.set(1)
        // The continuous spring animation will smoothly animate back to these targets
        // creating the characteristic Bento "swing" effect with underdamped oscillation
        updateSpringTargets(0, 1);

        const newPosition: PartialPosition = {
          top,
          left,
          deg: 0,
        };

        // Set synchronous flag BEFORE async setState to avoid race condition
        // This ensures animation loop continues while settling
        isSettlingRef.current = true;
        settleStartTimeRef.current = performance.now();
        settleFrameCountRef.current = 0;

        // Clear dragging state but enter animation mode
        // Springs will animate position, rotation, scale together
        setState((prevState) => ({
          ...prevState,
          dragging: null,
          positionHistory: [],
          isAnimating: true,
          animatedX: left,
          animatedY: top,
        }));
        dragPositionRef.current = null;

        // Remove grabbing cursor from body
        setGlobalDragActive(interactionIdRef.current, false);

        // Animate shadow off on drag stop
        if (elementRef.current) {
          elementRef.current.animate(
            [
              {
                boxShadow:
                  "0 0 1px 1px rgba(0, 0, 0, 0.04), 0 36px 92px rgba(0, 0, 0, 0.06), 0 23.3333px 53.8796px rgba(0, 0, 0, 0.046), 0 13.8667px 29.3037px rgba(0, 0, 0, 0.036), 0 7.2px 14.95px rgba(0, 0, 0, 0.03), 0 2.93333px 7.4963px rgba(0, 0, 0, 0.024), 0 0.666667px 3.62037px rgba(0, 0, 0, 0.014)",
              },
              { boxShadow: "0 2px 4px rgba(0,0,0,.04)" },
            ],
            {
              duration: 200,
              easing: "ease-out",
              fill: "forwards",
            },
          );
        }

        if (onDragStop) {
          const constraints =
            propsRef.current.constraints ?? defaultConstraints;
          const rawPos = calcXYRaw(getPositionParams(), top, left);
          const gridPos = applyPositionConstraints(
            constraints,
            getConstraintItem(),
            rawPos.x,
            rawPos.y,
            getConstraintContext(node),
          );
          return onDragStop.call(
            handleRef.current,
            propsRef.current.i,
            gridPos.x,
            gridPos.y,
            {
              e: e as Event,
              node,
              newPosition,
            },
          );
        }
      },
      [
        getPositionParams,
        getConstraintItem,
        getConstraintContext,
        resetDelayTimeout,
        updateSpringTargets,
      ],
    );

    // When a droppingPosition is present, this means we should fire a move event, as if we had moved
    // this element by `x, y` pixels.
    const moveDroppingItem = React.useCallback(
      (prevProps?: Props) => {
        const { droppingPosition } = propsRef.current;
        if (!droppingPosition) return;
        const node = elementRef.current;
        // Can't find DOM node (are we unmounted?)
        if (!node) return;
        const prevDroppingPosition = prevProps?.droppingPosition || {
          left: 0,
          top: 0,
        };
        const { dragging } = stateRef.current;
        const shouldDrag =
          dragging &&
          (droppingPosition.left !== prevDroppingPosition.left ||
            droppingPosition.top !== prevDroppingPosition.top);

        const dragEvent = droppingPosition.e as DraggableEvent;
        if (!dragging) {
          const dragData: DraggableData = {
            node,
            x: droppingPosition.left,
            y: droppingPosition.top,
            deltaX: droppingPosition.left,
            deltaY: droppingPosition.top,
            lastX: 0,
            lastY: 0,
          };
          onDragStart(dragEvent, dragData);
        } else if (shouldDrag) {
          const deltaX = droppingPosition.left - dragging.left;
          const deltaY = droppingPosition.top - dragging.top;
          const dragData: DraggableData = {
            node,
            x: droppingPosition.left,
            y: droppingPosition.top,
            deltaX,
            deltaY,
            lastX: dragging.left,
            lastY: dragging.top,
          };
          onDrag(dragEvent, dragData);
        }
      },
      [onDrag, onDragStart],
    );

    /**
     * Wrapper around resize events to provide more useful data.
     */
    const onResizeHandler = React.useCallback(
      (
        e: Event,
        { node, size, handle }: ResizeCallbackData, // 'size' is updated position
        position: Position, // existing position
        handlerName: "onResize" | "onResizeStart" | "onResizeStop",
      ): void => {
        const handler = propsRef.current[handlerName];
        const { i, containerWidth } = propsRef.current;
        // Clamping of dimensions based on resize direction
        let updatedSize: Position = {
          left: position.left,
          top: position.top,
          width: size.width,
          height: size.height,
          deg: position.deg,
        };

        if (node) {
          updatedSize = resizeItemInDirection(
            handle,
            position,
            size,
            containerWidth,
          );
          setState((prevState) => ({
            ...prevState,
            resizing: handlerName === "onResizeStop" ? null : updatedSize,
          }));
        }

        // Get new XY based on pixel size
        if (!handler) return;
        const constraints = propsRef.current.constraints ?? defaultConstraints;
        const rawSize = calcWHRaw(
          getPositionParams(),
          updatedSize.width,
          updatedSize.height,
        );
        const constrainedSize = applySizeConstraints(
          constraints,
          getConstraintItem(),
          rawSize.w,
          rawSize.h,
          handle,
          getConstraintContext(node),
        );
        handler.call(
          handleRef.current,
          i,
          constrainedSize.w,
          constrainedSize.h,
          {
            e,
            node,
            size: updatedSize,
            handle,
          },
        );
      },
      [getPositionParams, getConstraintItem, getConstraintContext],
    );

    const setResizeCursorActive = React.useCallback(
      (handle: ResizeHandleAxis) => {
        resizeActiveRef.current = true;
        setGlobalResizeActive(
          interactionIdRef.current,
          true,
          getResizeCursor(handle),
        );
      },
      [],
    );

    const clearResizeCursorActive = React.useCallback(() => {
      if (!resizeActiveRef.current) return;
      resizeActiveRef.current = false;
      setGlobalResizeActive(interactionIdRef.current, false);
    }, []);

    /**
     * onResizeStop event handler
     */
    const onResizeStop: GridItemResizeCallback = React.useCallback(
      (e, callbackData, position) => {
        clearResizeCursorActive();
        onResizeHandler(e, callbackData, position, "onResizeStop");
      },
      [clearResizeCursorActive, onResizeHandler],
    );

    // onResizeStart event handler
    const onResizeStart: GridItemResizeCallback = React.useCallback(
      (e, callbackData, position) => {
        setResizeCursorActive(callbackData.handle);
        onResizeHandler(e, callbackData, position, "onResizeStart");
      },
      [onResizeHandler, setResizeCursorActive],
    );

    // onResize event handler
    const onResize: GridItemResizeCallback = React.useCallback(
      (e, callbackData, position) => {
        if (!resizeActiveRef.current) {
          setResizeCursorActive(callbackData.handle);
        }
        onResizeHandler(e, callbackData, position, "onResize");
      },
      [onResizeHandler, setResizeCursorActive],
    );

    /**
     * Mix a Draggable instance into a child.
     */
    const mixinDraggable = React.useCallback(
      (child: ReactNode, isDraggable: boolean) => {
        const delayedDragEnabled: boolean =
          !!propsRef.current.dragTouchDelayDuration && isTouchCapable();

        // Note: We no longer disable DraggableCore based on touch delay state.
        // The delay is now handled in onDragStart for touch events only.
        // This allows mouse events to work normally on touch-capable desktops.

        return (
          <DraggableCore
            disabled={!isDraggable}
            allowMobileScroll={delayedDragEnabled}
            onStart={onDragStart}
            onMouseDown={delayedDragEnabled ? onMouseDown : undefined}
            onDrag={onDrag}
            onStop={onDragStop}
            handle={propsRef.current.handle}
            cancel={
              ".react-resizable-handle" +
              (propsRef.current.cancel ? `,${propsRef.current.cancel}` : "")
            }
            scale={propsRef.current.transformScale}
            nodeRef={elementRef}
            ref={draggableCoreRef}
          >
            {child}
          </DraggableCore>
        );
      },
      [onDrag, onDragStart, onDragStop, onMouseDown, isTouchCapable],
    );

    /**
     * Utility function to setup callback handler definitions for
     * similarily structured resize events.
     */
    const curryResizeHandler = React.useCallback(
      (position: Position, handler: GridItemResizeCallback) =>
        (e: React.SyntheticEvent<Element>, data: ResizeCallbackData) =>
          handler(e as unknown as Event, data, position),
      [],
    );

    /**
     * Mix a Resizable instance into a child.
     */
    const mixinResizable = React.useCallback(
      (
        child: GridChildElement,
        position: Position,
        isResizable: boolean,
        itemState: ItemState,
        slotProps?: SlotProps,
      ): GridChildElement => {
        const {
          cols,
          minW,
          minH,
          maxW,
          maxH,
          transformScale,
          resizeHandles,
          resizeHandle,
        } = propsRef.current;
        const positionParams = getPositionParams();
        // This is the max possible width - doesn't go to infinity because of the width of the window
        const maxWidth = calcGridItemPosition(
          positionParams,
          0,
          0,
          cols,
          0,
          0,
        ).width;
        // Calculate min/max constraints using our min & maxes
        const mins = calcGridItemPosition(positionParams, 0, 0, minW, minH, 0);
        const maxes = calcGridItemPosition(positionParams, 0, 0, maxW, maxH, 0);
        const minConstraints: [width: number, height: number] = [
          mins.width,
          mins.height,
        ];
        const maxConstraints: [width: number, height: number] = [
          Math.min(maxes.width, maxWidth),
          Math.min(maxes.height, Number.POSITIVE_INFINITY),
        ];

        // Use the default resize handle if none is provided
        const handleRenderer =
          resizeHandle ??
          ((
            axis: ResizeHandleAxis,
            handleRef: React.RefObject<HTMLElement>,
          ) => (
            <DefaultResizeHandle
              ref={handleRef as React.RefObject<HTMLDivElement>}
              handleAxis={axis}
            />
          ));
        const handleSlotProps = slotProps?.handle;
        const resolveHandleClassName = (axis: ResizeHandleAxis) => {
          const className = handleSlotProps?.className;
          return typeof className === "function"
            ? className(axis, itemState)
            : className;
        };
        const resolveHandleStyle = (axis: ResizeHandleAxis) => {
          const style = handleSlotProps?.style;
          return typeof style === "function" ? style(axis, itemState) : style;
        };
        const renderHandle = (
          axis: ResizeHandleAxis,
          handleRef: React.RefObject<HTMLElement>,
        ) => {
          const baseHandle: ResizeHandleElement =
            typeof handleRenderer === "function"
              ? (handleRenderer(axis, handleRef) as ResizeHandleElement)
              : React.cloneElement(handleRenderer as ResizeHandleElement, {
                  ref: handleRef,
                  handleAxis: axis,
                });
          const slotClassName = resolveHandleClassName(axis);
          const slotStyle = resolveHandleStyle(axis);
          if (!slotClassName && !slotStyle) {
            return baseHandle;
          }
          return React.cloneElement(baseHandle, {
            className: clsx(baseHandle.props.className, slotClassName),
            style: { ...baseHandle.props.style, ...slotStyle },
          });
        };

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
            onResizeStop={curryResizeHandler(position, onResizeStop)}
            onResizeStart={curryResizeHandler(position, onResizeStart)}
            onResize={curryResizeHandler(position, onResize)}
            transformScale={transformScale}
            resizeHandles={resizeHandles}
            handle={renderHandle}
          >
            {child}
          </Resizable>
        );
      },
      [
        curryResizeHandler,
        getPositionParams,
        onResize,
        onResizeStart,
        onResizeStop,
      ],
    );

    // Only run when droppingPosition changes - not on every render
    // This prevents the effect from firing during spring animation renders
    React.useLayoutEffect(() => {
      if (!props.droppingPosition) {
        prevPropsRef.current = propsRef.current;
        return;
      }
      moveDroppingItem(prevPropsRef.current || undefined);
      prevPropsRef.current = propsRef.current;
    }, [props.droppingPosition, moveDroppingItem]);

    React.useEffect(() => {
      return () => {
        // Clean up event listeners and timeouts to prevent memory leaks
        removeChildEvents();
        if (dragDelayTimeoutRef.current) {
          clearTimeout(dragDelayTimeoutRef.current);
          dragDelayTimeoutRef.current = null;
        }
        // Cancel spring animation
        if (springAnimationFrameRef.current) {
          cancelAnimationFrame(springAnimationFrameRef.current);
          springAnimationFrameRef.current = null;
        }
        setGlobalDragActive(interactionIdRef.current, false);
        setGlobalResizeActive(interactionIdRef.current, false);
        resizeActiveRef.current = false;
      };
    }, [removeChildEvents]);

    if (!handleRef.current) {
      const handle = {
        state: stateRef.current,
        setState: setStateFromHandle,
        elementRef,
        draggableCoreRef,
        getPositionParams,
        createStyle,
        onDragStart,
        onDrag,
        onDragStop,
        handleTouchMove,
        onResizeStart,
        onResize,
        onResizeStop,
        onResizeHandler,
        startDragDelayTimeout,
        resetDelayTimeout,
        startSpringAnimation,
      } as GridItemHandle;

      Object.defineProperty(handle, "_isSettling", {
        get: () => isSettlingRef.current,
        set: (value: boolean) => {
          isSettlingRef.current = value;
        },
        enumerable: true,
        configurable: true,
      });
      Object.defineProperty(handle, "springAnimationFrame", {
        get: () => springAnimationFrameRef.current,
        set: (value: number | null) => {
          springAnimationFrameRef.current = value;
        },
        enumerable: true,
        configurable: true,
      });

      handleRef.current = handle;
    }

    handleRef.current.state = stateRef.current;

    React.useImperativeHandle(
      ref,
      () => handleRef.current as GridItemHandle,
      [],
    );

    const { x, y, w, h, deg, isDraggable, isResizable, droppingPosition } =
      props;
    const slotProps = props.slotProps;
    const positionState =
      state.resizing || state.dragging
        ? {
            resizing: state.resizing || undefined,
            dragging: state.dragging || undefined,
          }
        : undefined;
    const pos = calcGridItemPosition(
      getPositionParams(),
      x,
      y,
      w,
      h,
      deg,
      positionState,
    );
    // Create context value for useDndGridItemState hook
    const itemState: ItemState = {
      dragging: Boolean(state.dragging),
      resizing: Boolean(state.resizing),
      settling: isSettlingRef.current,
      disabled: Boolean(props.static),
    };

    const constraintItem = getConstraintItem();
    const layoutItem: LayoutItem = {
      i: props.i,
      x: props.x,
      y: props.y,
      w: props.w,
      h: props.h,
      deg: props.deg,
      minW: props.minW,
      minH: props.minH,
      maxW: props.maxW,
      maxH: props.maxH,
      constraints: constraintItem.constraints,
      static: props.static,
      isDraggable: props.isDraggable,
      isResizable: props.isResizable,
      resizeHandles: props.resizeHandles,
      isBounded: props.isBounded,
    };

    const itemSlotClassName = slotProps?.item?.className;
    const resolvedItemClassName =
      typeof itemSlotClassName === "function"
        ? itemSlotClassName(layoutItem, itemState)
        : itemSlotClassName;
    const itemSlotStyle = slotProps?.item?.style;
    const resolvedItemStyle =
      typeof itemSlotStyle === "function"
        ? itemSlotStyle(layoutItem, itemState)
        : itemSlotStyle;
    const isPlaceholder = props.className.includes("dnd-grid-placeholder");
    const child = React.Children.only(props.children) as GridChildElement;
    // Create the child element. We clone the existing element but modify its className and style.
    const nextChildProps: GridChildProps = {
      ref: elementRef,
      className: clsx(
        "dnd-grid-item",
        child.props.className,
        props.className,
        resolvedItemClassName,
        !isPlaceholder && "dnd-grid-item-content",
        {
          static: props.static,
          resizing: Boolean(state.resizing),
          "dnd-draggable": isDraggable,
          "dnd-draggable-dragging": Boolean(state.dragging),
          "dnd-grid-animating": isSettlingRef.current, // Use sync flag - set BEFORE async setState to avoid race condition
          dropping: Boolean(droppingPosition),
        },
      ),
      // We can set the width and height on the child, but unfortunately we can't set the position.
      style: {
        ...props.style,
        ...child.props.style,
        ...resolvedItemStyle,
        ...createStyle(pos),
      },
      // Composable data attributes for state targeting
      "data-dnd-grid-item": "",
      "data-dragging": Boolean(state.dragging) || undefined,
      "data-resizing": Boolean(state.resizing) || undefined,
      "data-settling": isSettlingRef.current || undefined,
      "data-disabled": props.static || undefined,
      "data-draggable": isDraggable || undefined,
      "data-resizable": isResizable || undefined,
    };
    let newChild: GridChildElement = React.cloneElement(child, nextChildProps);
    // Resizable support. This is usually on but the user can toggle it off.
    newChild = mixinResizable(newChild, pos, isResizable, itemState, slotProps);
    // Draggable support. This is always on, except for with placeholders.
    newChild = mixinDraggable(newChild, isDraggable);

    return (
      <DndGridItemContext.Provider
        value={{ item: layoutItem, state: itemState }}
      >
        {newChild}
      </DndGridItemContext.Provider>
    );
  },
) as GridItemComponent;

GridItem.displayName = "GridItem";
GridItem.defaultProps = defaultProps;

export { GridItem };
