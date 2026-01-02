import clsx from "clsx";
import type {
  CSSProperties,
  HTMLAttributes,
  ReactElement,
  ReactNode,
  RefAttributes,
  RefObject,
} from "react";
import React from "react";
import {
  DraggableCore,
  type DraggableData,
  type DraggableEvent,
  type DraggableEventHandler,
} from "react-draggable";
import { Resizable, type ResizableProps } from "react-resizable";
import { resolveAnimationConfig } from "../animation-config";
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
  resolveConstraints,
} from "../constraints";
import { normalizeSpacing } from "../spacing";
import {
  calculateVelocityFromHistory,
  createLiveSpring,
  type PointWithTimestamp,
  VELOCITY_WINDOW_MS,
  velocityToRotation,
} from "../spring";
import type {
  AnimationConfig,
  ConstraintContext,
  DroppingPosition,
  GridItemDragEvent,
  GridItemResizeEvent,
  ItemState,
  Layout,
  LayoutConstraint,
  LayoutItem,
  Position,
  PositionParams,
  ReducedMotionSetting,
  ResizeHandle,
  ResizeHandleAxis,
  Size,
  SlotProps,
  Spacing,
} from "../types";
import { DndGridItemContext } from "../use-item-state";
import { useKeyboardMove } from "../use-keyboard-move";
import { resolveReducedMotion, useReducedMotion } from "../use-reduced-motion";
import { resizeItemInDirection, setTransform } from "../utils";
import { ResizeHandle as DefaultResizeHandle } from "./resize-handle";

const gridContainerClassName = "dnd-grid";
const defaultResizeCursor = "se-resize";
const restShadow = "0 2px 4px rgba(0,0,0,.04)";
const dragShadow =
  "0 0 1px 1px rgba(0, 0, 0, 0.04), 0 36px 92px rgba(0, 0, 0, 0.06), 0 23.3333px 53.8796px rgba(0, 0, 0, 0.046), 0 13.8667px 29.3037px rgba(0, 0, 0, 0.036), 0 7.2px 14.95px rgba(0, 0, 0, 0.03), 0 2.93333px 7.4963px rgba(0, 0, 0, 0.024), 0 0.666667px 3.62037px rgba(0, 0, 0, 0.014)";
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
  if (typeof document === "undefined") {
    return;
  }
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
  cursor?: string
) => {
  if (active) {
    activeResizeItems.set(id, cursor ?? defaultResizeCursor);
  } else {
    activeResizeItems.delete(id);
  }
  updateGlobalInteractionState();
};

interface PartialPosition {
  top: number;
  left: number;
  deg: number;
}

type GridItemCallback<Data> = (event: Data) => void;

interface ResizeCallbackData {
  node: HTMLElement;
  size: Size;
  handle: ResizeHandleAxis;
}

type GridItemResizeCallback = (
  e: Event,
  data: ResizeCallbackData,
  position: Position
) => void;

interface State {
  resizing: boolean;
  dragging: boolean;
  allowedToDrag: boolean;
  // Continuous spring animation state (matches swing-card.tsx useSpring behavior)
  currentRotation: number;
  currentScale: number;
  // Position spring animation state (for smooth settling after drag)
  isAnimating: boolean;
  animatedX: number;
  animatedY: number;
}

interface Props<TData = unknown> {
  children: ReactElement;
  layout: Layout<TData>;
  constraints?: LayoutConstraint<TData>[];
  cols: number;
  containerWidth: number;
  gap: Spacing;
  containerPadding: Spacing;
  rowHeight: number;
  maxRows: number;
  draggable: boolean;
  resizable: boolean;
  bounded: boolean;
  static?: boolean;
  transformScale: number;
  reducedMotion?: ReducedMotionSetting | boolean;
  animationConfig?: AnimationConfig;
  droppingPosition?: DroppingPosition;
  className: string;
  style?: CSSProperties;
  slotProps?: SlotProps<TData>;
  // Draggability
  cancel: string;
  dragTouchDelayDuration: number;
  handle: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW: number;
  maxW: number;
  minH: number;
  maxH: number;
  id: string;
  resizeHandles?: ResizeHandleAxis[];
  resizeHandle?: ResizeHandle;
  onDrag?: GridItemCallback<GridItemDragEvent>;
  onDragStart?: GridItemCallback<GridItemDragEvent>;
  onDragEnd?: GridItemCallback<GridItemDragEvent>;
  onResize?: GridItemCallback<GridItemResizeEvent>;
  onResizeStart?: GridItemCallback<GridItemResizeEvent>;
  onResizeEnd?: GridItemCallback<GridItemResizeEvent>;
  onSettleComplete?: (id: string) => void;
  tabIndex?: number;
  ariaRowIndex?: number;
  ariaColIndex?: number;
  ariaPosInSet?: number;
  ariaSetSize?: number;
  onItemFocus?: (id: string) => void;
  onItemKeyDown?: (
    event: React.KeyboardEvent<HTMLElement>,
    id: string,
    keyboardState: { isPressed: boolean; isResizing: boolean }
  ) => void;
  registerItemRef?: (id: string, node: HTMLElement | null) => void;
}

interface DefaultProps {
  className: string;
  cancel: string;
  handle: string;
  minH: number;
  minW: number;
  maxH: number;
  maxW: number;
  transformScale: number;
  dragTouchDelayDuration: number;
}

interface DraggableCoreHandle {
  handleDragStart?: (e: MouseEvent | TouchEvent) => void;
}

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

type ResizableWithResizeEndProps = Omit<ResizableProps, "onResizeStop"> & {
  onResizeEnd?: ResizableProps["onResizeStop"];
  width: number;
  height: number;
};

const ResizableWithResizeEnd = ({
  onResizeEnd,
  ...props
}: ResizableWithResizeEndProps) => {
  return <Resizable {...props} onResizeStop={onResizeEnd} />;
};

interface GridItemHandle {
  state: State;
  setState: (
    nextState: Partial<State> | ((prevState: State) => Partial<State>)
  ) => void;
  elementRef: RefObject<HTMLDivElement>;
  draggableCoreRef: React.RefObject<DraggableCore>;
  getPositionParams: (currentProps?: Props) => PositionParams;
  createStyle: (pos: Position) => Record<string, string | null | undefined>;
  onDragStart: DraggableEventHandler;
  onDrag: DraggableEventHandler;
  onDragEnd: DraggableEventHandler;
  handleTouchMove: (e: Event) => void;
  onResizeStart: GridItemResizeCallback;
  onResize: GridItemResizeCallback;
  onResizeEnd: GridItemResizeCallback;
  onResizeHandler: (
    e: Event,
    data: ResizeCallbackData,
    position: Position,
    handlerName: "onResize" | "onResizeStart" | "onResizeEnd"
  ) => void;
  startDragDelayTimeout: (e: Event) => void;
  resetDelayTimeout: () => void;
  startSpringAnimation: () => void;
  springAnimationFrame: number | null;
  _isSettling: boolean;
}

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

export type GridItemProps<TData = unknown> = Omit<
  Props<TData>,
  keyof DefaultProps
> &
  Partial<DefaultProps>;

type GridItemComponent = (<TData = unknown>(
  props: React.PropsWithoutRef<GridItemProps<TData>> &
    React.RefAttributes<GridItemHandle>
) => React.ReactElement | null) & {
  defaultProps?: DefaultProps;
  displayName?: string;
};

/**
 * An individual item within a DndGrid.
 */

const GridItem = React.forwardRef(
  <TData,>(
    incomingProps: GridItemProps<TData>,
    ref: React.ForwardedRef<GridItemHandle>
  ) /* biome-ignore lint/complexity/noExcessiveCognitiveComplexity: component wires complex drag/resize interactions. */ => {
    const props = { ...defaultProps, ...incomingProps } as Props<TData>;
    const [state, setState] = React.useState<State>(() => ({
      allowedToDrag: false,
      resizing: false,
      dragging: false,
      // Spring animation state (matches swing-card.tsx useSpring behavior)
      currentRotation: 0,
      currentScale: 1,
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
    const resolvedAnimationConfig = React.useMemo(
      () => resolveAnimationConfig(props.animationConfig),
      [props.animationConfig]
    );
    const animationConfigRef = React.useRef(resolvedAnimationConfig);
    animationConfigRef.current = resolvedAnimationConfig;
    const prefersReducedMotion = useReducedMotion();
    const reducedMotion = resolveReducedMotion(
      props.reducedMotion,
      prefersReducedMotion
    );
    const reducedMotionRef = React.useRef(reducedMotion);
    reducedMotionRef.current = reducedMotion;

    const elementRef = React.useRef<HTMLDivElement>(null);
    const draggableCoreRef = React.useRef<DraggableCore | null>(null);
    const springAnimationFrameRef = React.useRef<number | null>(null);
    const isSettlingRef = React.useRef(false);
    const settleStartTimeRef = React.useRef<number | null>(null);
    const settleFrameCountRef = React.useRef(0);
    const dragPositionRef = React.useRef<PartialPosition | null>(null);
    const resizePositionRef = React.useRef<Position | null>(null);
    const positionHistoryRef = React.useRef<PointWithTimestamp[]>([]);
    const lastPointerRef = React.useRef<{ x: number; y: number } | null>(null);
    const lastSampleTimeRef = React.useRef<number | null>(null);
    const isDraggingRef = React.useRef(false);
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
    const prevPropsRef = React.useRef<Props<TData> | null>(null);
    const handleRef = React.useRef<GridItemHandle | null>(null);

    // Live spring instances for continuous animation (like Framer Motion's useSpring)
    const rotationSpringRef = React.useRef(
      createLiveSpring(animationConfigRef.current.springs.rotation)
    );
    const scaleSpringRef = React.useRef(
      createLiveSpring(animationConfigRef.current.springs.scale)
    );
    // Position springs for smooth settling animation after drag (underdamped for bounce)
    const xSpringRef = React.useRef(
      createLiveSpring(animationConfigRef.current.springs.position)
    );
    const ySpringRef = React.useRef(
      createLiveSpring(animationConfigRef.current.springs.position)
    );

    const setStateFromHandle = React.useCallback(
      (nextState: Partial<State> | ((prevState: State) => Partial<State>)) => {
        setState((prevState) => ({
          ...prevState,
          ...(typeof nextState === "function"
            ? nextState(prevState)
            : nextState),
        }));
      },
      []
    );

    const getGridContainer = React.useCallback((node: HTMLElement | null) => {
      if (!node) {
        return null;
      }
      const container = node.closest(`.${gridContainerClassName}`);
      return container instanceof HTMLElement ? container : null;
    }, []);

    const getPositionParams = React.useCallback(
      (currentProps: Props<TData> = propsRef.current): PositionParams => {
        const gap = normalizeSpacing(currentProps.gap);
        const containerPadding = normalizeSpacing(
          currentProps.containerPadding
        );
        return {
          cols: currentProps.cols,
          containerPadding,
          containerWidth: currentProps.containerWidth,
          gap,
          maxRows: currentProps.maxRows,
          rowHeight: currentProps.rowHeight,
        };
      },
      []
    );

    const getConstraintContext = React.useCallback(
      (node?: HTMLElement | null): ConstraintContext<TData> => {
        const { cols, maxRows, containerWidth, rowHeight, layout } =
          propsRef.current;
        const gap = normalizeSpacing(propsRef.current.gap);
        const containerPadding = normalizeSpacing(
          propsRef.current.containerPadding
        );
        const container = node ? getGridContainer(node) : null;
        return {
          cols,
          maxRows,
          containerWidth,
          containerHeight: container ? container.clientHeight : 0,
          rowHeight,
          gap,
          containerPadding,
          layout,
        };
      },
      [getGridContainer]
    );

    const getConstraintItem = React.useCallback((): LayoutItem<TData> => {
      const {
        layout,
        id,
        x,
        y,
        w,
        h,
        minW,
        minH,
        maxW,
        maxH,
        static: isStatic,
        draggable,
        resizable,
        resizeHandles,
        bounded,
      } = propsRef.current;
      const currentItem = layout.find((item) => item.id === id);
      const data = currentItem?.data;
      const constraints = currentItem?.constraints;
      return {
        id,
        x,
        y,
        w,
        h,
        minW,
        minH,
        maxW,
        maxH,
        data,
        constraints,
        static: isStatic,
        draggable,
        resizable,
        resizeHandles,
        bounded,
      };
    }, []);

    /**
     * Create the style object for positioning the grid item using CSS transforms.
     */
    const createStyle = React.useCallback(
      (pos: Position): Record<string, string | null | undefined> => {
        const { static: isStatic } = propsRef.current;
        const isResizing = stateRef.current.resizing;
        // Use spring-animated scale and rotation (matches swing-card.tsx useSpring behavior)
        const scale =
          isStatic || isResizing ? 1 : stateRef.current.currentScale;
        // Override pos.deg with spring-animated currentRotation during drag/animation
        const rotation =
          isStatic || isResizing ? pos.deg : stateRef.current.currentRotation;

        // Use animated position when isAnimating (settling after drag)
        let finalPos = { ...pos, deg: rotation };
        if (!(isStatic || isResizing) && stateRef.current.isAnimating) {
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
        if (!(isStatic || isResizing) && scale !== 1) {
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
      []
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
        passive = true
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
      []
    );

    const removeChildEvents = React.useCallback(() => {
      if (elementRef.current) {
        for (const { type, event } of childEventsRef.current) {
          elementRef.current?.removeEventListener(type, event, false);
        }
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
        } else if (handleRef.current?.resetDelayTimeout) {
          handleRef.current.resetDelayTimeout();
        } else {
          resetDelayTimeout();
        }
      },
      [resetDelayTimeout]
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
      [addChildEvent, handleTouchMove, resetDelayTimeout]
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
      [startDragDelayTimeout]
    );

    /**
     * Update spring targets during drag
     * This matches swing-card.tsx behavior where rotateRaw.set() updates the target
     */
    const updateSpringTargets = React.useCallback(
      (targetRotation: number, targetScale: number) => {
        if (
          reducedMotionRef.current ||
          !animationConfigRef.current.springs.enabled
        ) {
          setState((prevState) => ({
            ...prevState,
            currentRotation: 0,
            currentScale: 1,
          }));
          return;
        }
        rotationSpringRef.current.setTarget(targetRotation);
        scaleSpringRef.current.setTarget(targetScale);
      },
      []
    );

    /**
     * Record a pointer sample and update spring targets from velocity.
     * This keeps velocity decaying to 0 even when no new drag events fire.
     */
    const recordPointerSample = React.useCallback(
      (now: number, pointer: { x: number; y: number }) => {
        let positionHistory: PointWithTimestamp[] = [
          ...positionHistoryRef.current,
          {
            x: pointer.x,
            y: pointer.y,
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

        // Update spring targets - spring will smoothly animate toward targetRotation
        // This matches swing-card.tsx: rotateRaw.set(targetRotation)
        updateSpringTargets(targetRotation, 1.04);

        positionHistoryRef.current = positionHistory;
        lastSampleTimeRef.current = now;
      },
      [updateSpringTargets]
    );

    /**
     * Start continuous spring animation loop
     * This matches swing-card.tsx useSpring behavior - continuously smoothing values
     */
    const startSpringAnimation = React.useCallback(() => {
      if (
        reducedMotionRef.current ||
        !animationConfigRef.current.springs.enabled
      ) {
        if (springAnimationFrameRef.current !== null) {
          cancelAnimationFrame(springAnimationFrameRef.current);
          springAnimationFrameRef.current = null;
        }
        return;
      }
      if (springAnimationFrameRef.current !== null) {
        return;
      }

      const rotationSpring = rotationSpringRef.current;
      const scaleSpring = scaleSpringRef.current;
      const xSpring = xSpringRef.current;
      const ySpring = ySpringRef.current;

      // Initialize springs with current state
      rotationSpring.setCurrent(stateRef.current.currentRotation);
      scaleSpring.setCurrent(stateRef.current.currentScale);

      // Safety guard: maximum settling duration (2 seconds at 60fps = 120 frames)
      // This prevents infinite loops if springs never settle
      const MAX_SETTLE_FRAMES = 120;
      const MAX_SETTLE_DURATION_MS = 2000;

      // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: spring animation loop manages multiple animation states.
      const animate = () => {
        const now = performance.now();
        if (isSettlingRef.current && !isDraggingRef.current) {
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
              propsRef.current.onSettleComplete(propsRef.current.id);
            }
            return;
          }
        }

        if (isDraggingRef.current && lastPointerRef.current) {
          const lastSampleTime = lastSampleTimeRef.current;
          if (lastSampleTime === null || now - lastSampleTime > 16) {
            recordPointerSample(now, lastPointerRef.current);
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
          isDraggingRef.current ||
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
            propsRef.current.onSettleComplete(propsRef.current.id);
          }
        }
      };

      springAnimationFrameRef.current = requestAnimationFrame(animate);
    }, [recordPointerSample]);

    const resetSpringState = React.useCallback(() => {
      if (springAnimationFrameRef.current !== null) {
        cancelAnimationFrame(springAnimationFrameRef.current);
        springAnimationFrameRef.current = null;
      }
      isSettlingRef.current = false;
      settleStartTimeRef.current = null;
      settleFrameCountRef.current = 0;
      positionHistoryRef.current = [];
      lastPointerRef.current = null;
      lastSampleTimeRef.current = null;
      rotationSpringRef.current.setCurrent(0);
      rotationSpringRef.current.setTarget(0);
      scaleSpringRef.current.setCurrent(1);
      scaleSpringRef.current.setTarget(1);
      xSpringRef.current.reset();
      ySpringRef.current.reset();
      setState((prevState) => ({
        ...prevState,
        isAnimating: false,
        currentRotation: 0,
        currentScale: 1,
      }));
    }, []);

    React.useEffect(() => {
      const { springs } = resolvedAnimationConfig;
      rotationSpringRef.current = createLiveSpring(springs.rotation);
      scaleSpringRef.current = createLiveSpring(springs.scale);
      xSpringRef.current = createLiveSpring(springs.position);
      ySpringRef.current = createLiveSpring(springs.position);
      resetSpringState();
    }, [resolvedAnimationConfig, resetSpringState]);

    React.useEffect(() => {
      if (!reducedMotion) {
        return;
      }
      resetSpringState();
    }, [reducedMotion, resetSpringState]);

    /**
     * onDragStart event handler
     */
    const onDragStart: DraggableEventHandler = React.useCallback(
      // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: drag start handles multiple input and state paths.
      (e, { node }) => {
        const { onDragStart, transformScale, dragTouchDelayDuration } =
          propsRef.current;
        const isDroppingItem = Boolean(propsRef.current.droppingPosition);

        // For touch events with delay enabled, block if delay hasn't elapsed
        const isTouchEvent = "touches" in e;
        if (
          !isDroppingItem &&
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
        const container =
          getGridContainer(node) || node.offsetParent || node.parentElement;
        if (container) {
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
        } else {
          const fallbackPosition = calcGridItemPosition(
            getPositionParams(),
            propsRef.current.x,
            propsRef.current.y,
            propsRef.current.w,
            propsRef.current.h,
            0,
            null
          );
          newPosition.left = fallbackPosition.left;
          newPosition.top = fallbackPosition.top;
        }
        dragPositionRef.current = newPosition;
        isDraggingRef.current = true;
        isSettlingRef.current = false;
        positionHistoryRef.current = [];
        lastSampleTimeRef.current = null;
        let startPointer: { x: number; y: number } | null = null;
        if (e instanceof MouseEvent) {
          startPointer = { x: e.clientX, y: e.clientY };
        } else if (e instanceof TouchEvent && e.touches.length > 0) {
          startPointer = {
            x: e.touches[0].clientX,
            y: e.touches[0].clientY,
          };
        } else if ((e as unknown as PointerEvent).clientX !== undefined) {
          startPointer = {
            x: (e as unknown as PointerEvent).clientX,
            y: (e as unknown as PointerEvent).clientY,
          };
        }
        lastPointerRef.current = startPointer;
        settleStartTimeRef.current = null;
        settleFrameCountRef.current = 0;
        setState((prevState) => ({
          ...prevState,
          dragging: true,
          isAnimating: false, // Clear any pending settling animation
        }));

        if (
          !reducedMotionRef.current &&
          animationConfigRef.current.springs.enabled
        ) {
          // Set scale spring target directly (setState is async, so we can't rely on state being updated)
          // This matches swing-card.tsx handleDragStart: scaleRaw.set(1.04)
          scaleSpringRef.current.setTarget(1.04);
          // Note: Don't set rotation target here - let onDrag set it based on velocity

          // Start continuous spring animation (matches swing-card.tsx useSpring behavior)
          handleRef.current?.startSpringAnimation?.();
        }

        // Set grabbing cursor on body during drag
        setGlobalDragActive(interactionIdRef.current, true);

        // Animate shadow on drag start
        if (elementRef.current) {
          const { shadow } = animationConfigRef.current;
          if (reducedMotionRef.current || !shadow.enabled) {
            elementRef.current.style.boxShadow = dragShadow;
          } else {
            elementRef.current.animate(
              [{ boxShadow: restShadow }, { boxShadow: dragShadow }],
              {
                duration: shadow.dragStartDuration,
                easing: shadow.dragStartEasing,
                fill: "forwards",
              }
            );
          }
        }

        // Call callback with this data
        if (onDragStart) {
          const constraints = resolveConstraints(propsRef.current.constraints);
          const rawPos = calcXYRaw(
            getPositionParams(),
            newPosition.top,
            newPosition.left
          );
          const { x, y } = applyPositionConstraints(
            constraints,
            getConstraintItem(),
            rawPos.x,
            rawPos.y,
            getConstraintContext(node)
          );
          return onDragStart.call(handleRef.current, {
            id: propsRef.current.id,
            x,
            y,
            event: e as Event,
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
      ]
    );

    /**
     * onDrag event handler
     * Uses Bento-style velocity-based rotation with 100ms sliding window
     */
    const onDrag: DraggableEventHandler = React.useCallback(
      (e, { node, deltaX, deltaY }) => {
        const { onDrag } = propsRef.current;
        if (!onDrag) {
          return;
        }

        const dragPosition = dragPositionRef.current;
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
        const pointer = { x: pointerX, y: pointerY };
        lastPointerRef.current = pointer;
        recordPointerSample(now, pointer);

        const { bounded, w, h, containerWidth } = propsRef.current;
        const positionParams = getPositionParams();

        // Boundary calculations; keeps items within the grid
        if (bounded) {
          const { offsetParent } = node;
          const container = getGridContainer(node) || offsetParent;

          if (container) {
            const { rowHeight } = propsRef.current;
            const gap = normalizeSpacing(propsRef.current.gap);
            const bottomBoundary =
              (container as HTMLElement).clientHeight -
              calcGridItemWHPx(h, rowHeight, gap[0]);
            top = clamp(top, 0, bottomBoundary);
            const colWidth = calcGridColWidth(positionParams);
            const rightBoundary =
              containerWidth - calcGridItemWHPx(w, colWidth, gap[1]);
            left = clamp(left, 0, rightBoundary);
          }
        }

        const newPosition: PartialPosition = {
          top,
          left,
          deg: stateRef.current.currentRotation, // Use current spring value for position
        };

        dragPositionRef.current = newPosition;
        // Call callback with this data
        const constraints = resolveConstraints(propsRef.current.constraints);
        const rawPos = calcXYRaw(positionParams, top, left);
        const { x, y } = applyPositionConstraints(
          constraints,
          getConstraintItem(),
          rawPos.x,
          rawPos.y,
          getConstraintContext(node)
        );
        return onDrag.call(handleRef.current, {
          id: propsRef.current.id,
          x,
          y,
          event: e as Event,
          node,
          newPosition,
          deltaX,
          deltaY,
        });
      },
      [
        getGridContainer,
        getPositionParams,
        getConstraintItem,
        getConstraintContext,
        recordPointerSample,
      ]
    );

    /**
     * onDragEnd event handler
     */
    const onDragEnd: DraggableEventHandler = React.useCallback(
      // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: drag end reconciles animation, layout, and callbacks.
      (e, { node }) => {
        resetDelayTimeout();
        const { onDragEnd } = propsRef.current;

        const dragPosition = dragPositionRef.current;
        // Guard against onDragEnd being called before onDragStart
        if (!dragPosition) {
          return;
        }

        const { w, h, x, y } = propsRef.current;
        const { left, top } = dragPosition;

        const springAnimationsEnabled =
          !reducedMotionRef.current &&
          animationConfigRef.current.springs.enabled;

        if (!springAnimationsEnabled) {
          resetSpringState();
          setState((prevState) => ({
            ...prevState,
            dragging: false,
            isAnimating: false,
          }));
          isDraggingRef.current = false;
          dragPositionRef.current = null;
          positionHistoryRef.current = [];
          lastPointerRef.current = null;
          lastSampleTimeRef.current = null;
          setGlobalDragActive(interactionIdRef.current, false);

          if (elementRef.current) {
            const { shadow } = animationConfigRef.current;
            if (reducedMotionRef.current || !shadow.enabled) {
              elementRef.current.style.boxShadow = restShadow;
            } else {
              elementRef.current.animate(
                [{ boxShadow: dragShadow }, { boxShadow: restShadow }],
                {
                  duration: shadow.dragStopDuration,
                  easing: shadow.dragStopEasing,
                  fill: "forwards",
                }
              );
            }
          }

          if (onDragEnd) {
            const constraints = resolveConstraints(
              propsRef.current.constraints
            );
            const rawPos = calcXYRaw(getPositionParams(), top, left);
            const gridPos = applyPositionConstraints(
              constraints,
              getConstraintItem(),
              rawPos.x,
              rawPos.y,
              getConstraintContext(node)
            );
            onDragEnd.call(handleRef.current, {
              id: propsRef.current.id,
              x: gridPos.x,
              y: gridPos.y,
              event: e as Event,
              node,
              newPosition: {
                top,
                left,
                deg: 0,
              },
            });
          }

          propsRef.current.onSettleComplete?.(propsRef.current.id);
          return;
        }

        // Calculate target grid position (where the item will settle)
        const targetPos = calcGridItemPosition(
          getPositionParams(),
          x,
          y,
          w,
          h,
          0,
          null // No state override - get the actual grid position
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
          dragging: false,
          isAnimating: true,
          animatedX: left,
          animatedY: top,
        }));
        isDraggingRef.current = false;
        dragPositionRef.current = null;
        positionHistoryRef.current = [];
        lastPointerRef.current = null;
        lastSampleTimeRef.current = null;

        // Remove grabbing cursor from body
        setGlobalDragActive(interactionIdRef.current, false);

        // Animate shadow off on drag stop
        if (elementRef.current) {
          const { shadow } = animationConfigRef.current;
          if (reducedMotionRef.current || !shadow.enabled) {
            elementRef.current.style.boxShadow = restShadow;
          } else {
            elementRef.current.animate(
              [{ boxShadow: dragShadow }, { boxShadow: restShadow }],
              {
                duration: shadow.dragStopDuration,
                easing: shadow.dragStopEasing,
                fill: "forwards",
              }
            );
          }
        }

        if (onDragEnd) {
          const constraints = resolveConstraints(propsRef.current.constraints);
          const rawPos = calcXYRaw(getPositionParams(), top, left);
          const gridPos = applyPositionConstraints(
            constraints,
            getConstraintItem(),
            rawPos.x,
            rawPos.y,
            getConstraintContext(node)
          );
          onDragEnd.call(handleRef.current, {
            id: propsRef.current.id,
            x: gridPos.x,
            y: gridPos.y,
            event: e as Event,
            node,
            newPosition,
          });
        }
        handleRef.current?.startSpringAnimation?.();
        return;
      },
      [
        getPositionParams,
        getConstraintItem,
        getConstraintContext,
        resetDelayTimeout,
        resetSpringState,
        updateSpringTargets,
      ]
    );

    // When a droppingPosition is present, this means we should fire a move event, as if we had moved
    // this element by `x, y` pixels.
    const moveDroppingItem = React.useCallback(
      (prevProps?: Props<TData>) => {
        const { droppingPosition } = propsRef.current;
        if (!droppingPosition) {
          return;
        }
        const node = elementRef.current;
        // Can't find DOM node (are we unmounted?)
        if (!node) {
          return;
        }
        const prevDroppingPosition = prevProps?.droppingPosition || {
          left: 0,
          top: 0,
        };
        const dragging = isDraggingRef.current;
        const shouldDrag =
          dragging &&
          dragPositionRef.current &&
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
        } else if (shouldDrag && dragPositionRef.current) {
          const deltaX = droppingPosition.left - dragPositionRef.current.left;
          const deltaY = droppingPosition.top - dragPositionRef.current.top;
          const dragData: DraggableData = {
            node,
            x: droppingPosition.left,
            y: droppingPosition.top,
            deltaX,
            deltaY,
            lastX: dragPositionRef.current.left,
            lastY: dragPositionRef.current.top,
          };
          onDrag(dragEvent, dragData);
        }
      },
      [onDrag, onDragStart]
    );

    /**
     * Wrapper around resize events to provide more useful data.
     */
    const onResizeHandler = React.useCallback(
      (
        e: Event,
        { node, size, handle }: ResizeCallbackData, // 'size' is updated position
        position: Position, // existing position
        handlerName: "onResize" | "onResizeStart" | "onResizeEnd"
      ): void => {
        const handler = propsRef.current[handlerName];
        const { id, containerWidth } = propsRef.current;
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
            containerWidth
          );
          resizePositionRef.current = updatedSize;
        }

        // Get new XY based on pixel size
        if (!handler) {
          return;
        }
        const constraints = resolveConstraints(propsRef.current.constraints);
        const rawSize = calcWHRaw(
          getPositionParams(),
          updatedSize.width,
          updatedSize.height
        );
        const constrainedSize = applySizeConstraints(
          constraints,
          getConstraintItem(),
          rawSize.w,
          rawSize.h,
          handle,
          getConstraintContext(node)
        );
        handler.call(handleRef.current, {
          id,
          w: constrainedSize.w,
          h: constrainedSize.h,
          event: e,
          node,
          size: updatedSize,
          handle,
        });
      },
      [getPositionParams, getConstraintItem, getConstraintContext]
    );

    const setResizeCursorActive = React.useCallback(
      (handle: ResizeHandleAxis) => {
        resizeActiveRef.current = true;
        setGlobalResizeActive(
          interactionIdRef.current,
          true,
          getResizeCursor(handle)
        );
      },
      []
    );

    const clearResizeCursorActive = React.useCallback(() => {
      if (!resizeActiveRef.current) {
        return;
      }
      resizeActiveRef.current = false;
      setGlobalResizeActive(interactionIdRef.current, false);
    }, []);

    /**
     * onResizeEnd event handler
     */
    const onResizeEnd: GridItemResizeCallback = React.useCallback(
      (e, callbackData, position) => {
        clearResizeCursorActive();
        resizePositionRef.current = null;
        setState((prevState) => ({
          ...prevState,
          resizing: false,
        }));
        onResizeHandler(e, callbackData, position, "onResizeEnd");
      },
      [clearResizeCursorActive, onResizeHandler]
    );

    // onResizeStart event handler
    const onResizeStart: GridItemResizeCallback = React.useCallback(
      (e, callbackData, position) => {
        setResizeCursorActive(callbackData.handle);
        if (isDraggingRef.current) {
          isDraggingRef.current = false;
          setGlobalDragActive(interactionIdRef.current, false);
        }
        dragPositionRef.current = null;
        positionHistoryRef.current = [];
        resetSpringState();
        setState((prevState) => ({
          ...prevState,
          resizing: true,
          dragging: false,
        }));
        onResizeHandler(e, callbackData, position, "onResizeStart");
      },
      [onResizeHandler, resetSpringState, setResizeCursorActive]
    );

    // onResize event handler
    const onResize: GridItemResizeCallback = React.useCallback(
      (e, callbackData, position) => {
        if (!resizeActiveRef.current) {
          setResizeCursorActive(callbackData.handle);
        }
        onResizeHandler(e, callbackData, position, "onResize");
      },
      [onResizeHandler, setResizeCursorActive]
    );

    /**
     * Mix a Draggable instance into a child.
     */
    const mixinDraggable = React.useCallback(
      (child: ReactNode, draggable: boolean) => {
        const delayedDragEnabled: boolean =
          !!propsRef.current.dragTouchDelayDuration && isTouchCapable();

        // Note: We no longer disable DraggableCore based on touch delay state.
        // The delay is now handled in onDragStart for touch events only.
        // This allows mouse events to work normally on touch-capable desktops.

        return (
          <DraggableCore
            allowMobileScroll={delayedDragEnabled}
            cancel={
              ".react-resizable-handle" +
              (propsRef.current.cancel ? `,${propsRef.current.cancel}` : "")
            }
            disabled={!draggable}
            handle={propsRef.current.handle}
            nodeRef={elementRef}
            onDrag={onDrag}
            onMouseDown={delayedDragEnabled ? onMouseDown : undefined}
            onStart={onDragStart}
            onStop={onDragEnd}
            ref={draggableCoreRef}
            scale={propsRef.current.transformScale}
          >
            {child}
          </DraggableCore>
        );
      },
      [onDrag, onDragStart, onDragEnd, onMouseDown, isTouchCapable]
    );

    /**
     * Utility function to setup callback handler definitions for
     * similarily structured resize events.
     */
    const curryResizeHandler = React.useCallback(
      (position: Position, handler: GridItemResizeCallback) =>
        (e: React.SyntheticEvent<Element>, data: ResizeCallbackData) =>
          handler(e as unknown as Event, data, position),
      []
    );

    /**
     * Mix a Resizable instance into a child.
     */
    const mixinResizable = React.useCallback(
      (
        child: GridChildElement,
        position: Position,
        resizable: boolean,
        itemState: ItemState,
        slotProps?: SlotProps<TData>
      ): GridChildElement => {
        const { transformScale, resizeHandles, resizeHandle } =
          propsRef.current;
        const positionParams = getPositionParams();
        const minGridUnit = calcGridItemPosition(positionParams, 0, 0, 1, 1, 0);
        const minConstraints: [width: number, height: number] = [
          minGridUnit.width,
          minGridUnit.height,
        ];
        const maxConstraints: [width: number, height: number] = [
          Number.POSITIVE_INFINITY,
          Number.POSITIVE_INFINITY,
        ];

        // Use the default resize handle if none is provided
        const handleRenderer =
          resizeHandle ??
          ((
            axis: ResizeHandleAxis,
            handleRef: React.RefObject<HTMLElement>
          ) => (
            <DefaultResizeHandle
              handleAxis={axis}
              ref={handleRef as React.RefObject<HTMLDivElement>}
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
          handleRef: React.RefObject<HTMLElement>
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
          if (!(slotClassName || slotStyle)) {
            return baseHandle;
          }
          return React.cloneElement(baseHandle, {
            className: clsx(baseHandle.props.className, slotClassName),
            style: { ...baseHandle.props.style, ...slotStyle },
          });
        };

        return (
          <ResizableWithResizeEnd // These are opts for the resize handle itself
            className={resizable ? undefined : "react-resizable-hide"}
            draggableOpts={{
              disabled: !resizable,
            }}
            handle={renderHandle}
            height={position.height}
            maxConstraints={maxConstraints}
            minConstraints={minConstraints}
            onResize={curryResizeHandler(position, onResize)}
            onResizeEnd={curryResizeHandler(position, onResizeEnd)}
            onResizeStart={curryResizeHandler(position, onResizeStart)}
            resizeHandles={resizeHandles}
            transformScale={transformScale}
            width={position.width}
          >
            {child}
          </ResizableWithResizeEnd>
        );
      },
      [
        curryResizeHandler,
        getPositionParams,
        onResize,
        onResizeStart,
        onResizeEnd,
      ]
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

    React.useLayoutEffect(() => {
      if (!props.registerItemRef) {
        return;
      }
      props.registerItemRef(props.id, elementRef.current);
      return () => {
        props.registerItemRef?.(props.id, null);
      };
    }, [props.id, props.registerItemRef]);

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
        onDragEnd,
        handleTouchMove,
        onResizeStart,
        onResize,
        onResizeEnd,
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

    const keyboardMove = useKeyboardMove({
      onDragStart,
      onDrag,
      onDragEnd,
      onResizeStart,
      onResize,
      onResizeEnd,
      getPositionParams,
      id: props.id,
      x: props.x,
      y: props.y,
      w: props.w,
      h: props.h,
      draggable: props.draggable,
      resizable: props.resizable,
      nodeRef: elementRef,
    });
    const {
      onKeyDown: onKeyboardMoveKeyDown,
      isPressed,
      isResizing,
    } = keyboardMove;

    const handleKeyDown = React.useCallback(
      (event: React.KeyboardEvent<HTMLElement>) => {
        onKeyboardMoveKeyDown(event);
        if (!props.onItemKeyDown) {
          return;
        }
        if (event.defaultPrevented || isPressed || isResizing) {
          return;
        }
        props.onItemKeyDown(event, props.id, { isPressed, isResizing });
      },
      [
        onKeyboardMoveKeyDown,
        props.onItemKeyDown,
        props.id,
        isPressed,
        isResizing,
      ]
    );

    React.useImperativeHandle(
      ref,
      () => handleRef.current as GridItemHandle,
      []
    );

    const { x, y, w, h, draggable, resizable, droppingPosition } = props;
    const slotProps = props.slotProps;
    const positionState =
      state.resizing || state.dragging
        ? {
            resizing: state.resizing
              ? resizePositionRef.current || undefined
              : undefined,
            dragging: state.dragging
              ? dragPositionRef.current || undefined
              : undefined,
          }
        : undefined;
    const pos = calcGridItemPosition(
      getPositionParams(),
      x,
      y,
      w,
      h,
      0,
      positionState
    );
    // Create context value for useDndGridItemState hook
    const itemState: ItemState = {
      dragging: Boolean(state.dragging),
      resizing: Boolean(state.resizing),
      settling: isSettlingRef.current,
      disabled: Boolean(props.static),
    };

    const constraintItem = getConstraintItem();
    const layoutItem: LayoutItem<TData> = {
      id: props.id,
      x: props.x,
      y: props.y,
      w: props.w,
      h: props.h,
      minW: props.minW,
      minH: props.minH,
      maxW: props.maxW,
      maxH: props.maxH,
      data: constraintItem.data,
      constraints: constraintItem.constraints,
      static: props.static,
      draggable: props.draggable,
      resizable: props.resizable,
      resizeHandles: props.resizeHandles,
      bounded: props.bounded,
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
    const isPlaceholder =
      props.className.includes("dnd-grid-placeholder") ||
      Boolean(droppingPosition);
    const child = React.Children.only(props.children) as GridChildElement;
    const resolvedRole = isPlaceholder
      ? "presentation"
      : (child.props.role ?? "gridcell");
    const resolvedAriaHidden = isPlaceholder
      ? true
      : child.props["aria-hidden"];
    const resolvedAriaRowIndex = isPlaceholder
      ? undefined
      : ((child.props["aria-rowindex"] as number | undefined) ??
        props.ariaRowIndex);
    const resolvedAriaColIndex = isPlaceholder
      ? undefined
      : ((child.props["aria-colindex"] as number | undefined) ??
        props.ariaColIndex);
    const resolvedAriaPosInSet = isPlaceholder
      ? undefined
      : ((child.props["aria-posinset"] as number | undefined) ??
        props.ariaPosInSet);
    const resolvedAriaSetSize = isPlaceholder
      ? undefined
      : ((child.props["aria-setsize"] as number | undefined) ??
        props.ariaSetSize);
    const resolvedAriaPressed = isPlaceholder ? undefined : isPressed;
    const resolvedTabIndex = props.static ? undefined : (props.tabIndex ?? 0);
    const handleFocus = (event: React.FocusEvent<HTMLElement>) => {
      child.props.onFocus?.(event);
      props.onItemFocus?.(props.id);
    };
    // Create the child element. We clone the existing element but modify its className and style.
    const nextChildProps: GridChildProps = {
      ref: elementRef,
      tabIndex: resolvedTabIndex,
      onKeyDown: handleKeyDown,
      onFocus: handleFocus,
      role: resolvedRole,
      "aria-hidden": resolvedAriaHidden,
      "aria-rowindex": resolvedAriaRowIndex,
      "aria-colindex": resolvedAriaColIndex,
      "aria-posinset": resolvedAriaPosInSet,
      "aria-setsize": resolvedAriaSetSize,
      "aria-pressed": resolvedAriaPressed,
      className: clsx(
        "dnd-grid-item",
        child.props.className,
        props.className,
        resolvedItemClassName,
        !isPlaceholder && "dnd-grid-item-content",
        {
          static: props.static,
          resizing: Boolean(state.resizing),
          "dnd-draggable": draggable,
          "dnd-draggable-dragging": Boolean(state.dragging),
          "dnd-grid-animating": isSettlingRef.current, // Use sync flag - set BEFORE async setState to avoid race condition
          dropping: Boolean(droppingPosition),
        }
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
      "data-dnd-grid-item-id": props.id,
      "data-dragging": Boolean(state.dragging) || undefined,
      "data-resizing": Boolean(state.resizing) || undefined,
      "data-settling": isSettlingRef.current || undefined,
      "data-disabled": props.static || undefined,
      "data-draggable": draggable || undefined,
      "data-resizable": resizable || undefined,
    };
    let newChild: GridChildElement = React.cloneElement(child, nextChildProps);
    // Resizable support. This is usually on but the user can toggle it off.
    newChild = mixinResizable(newChild, pos, resizable, itemState, slotProps);
    // Draggable support. This is always on, except for with placeholders.
    newChild = mixinDraggable(newChild, draggable);

    return (
      <DndGridItemContext.Provider
        value={{ item: layoutItem, state: itemState }}
      >
        {newChild}
      </DndGridItemContext.Provider>
    );
  }
) as GridItemComponent;

GridItem.displayName = "GridItem";
GridItem.defaultProps = defaultProps;

export { GridItem };
