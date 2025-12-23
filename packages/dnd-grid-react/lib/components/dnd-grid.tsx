import clsx from "clsx";
import { deepEqual } from "fast-equals";
import type { ReactElement } from "react";
import * as React from "react";
import { calcGridColWidth, calcGridItemWHPx, calcXY } from "../calculate-utils";
import { verticalCompactor } from "../compactors";
import { normalizeSpacing } from "../spacing";
import type {
  Compactor,
  DefaultProps,
  DragOverEvent,
  DroppingPosition,
  GridDragEvent,
  GridResizeEvent,
  ItemState,
  Layout,
  LayoutItem,
  PositionParams,
  Props,
} from "../types";
import { useEdgeScroll } from "../use-edge-scroll";
import {
  bottom,
  childrenEqual,
  cloneLayout,
  cloneLayoutItem,
  getAllCollisions,
  getLayoutItem,
  moveElement,
  noop,
  synchronizeLayoutWithChildren,
  withLayoutItem,
} from "../utils";
import { GridItem } from "./grid-item";

type State = {
  activeDrag: LayoutItem | null | undefined;
  settlingItem: string | null; // ID of item currently settling after drag
  layout: Layout;
  mounted: boolean;
  oldDragItem: LayoutItem | null | undefined;
  oldLayout: Layout | null | undefined;
  oldResizeItem: LayoutItem | null | undefined;
  resizing: boolean;
  droppingDOMNode: ReactElement | null | undefined;
  droppingPosition?: DroppingPosition;
  // Mirrored props
  children: React.ReactNode;
  propsLayout?: Layout;
  compactor?: Compactor;
};

const layoutClassName = "dnd-grid";
const DRAG_TOUCH_DELAY_DURATION = 250;
let isFirefox = false;

// Try...catch will protect from navigator not existing (e.g. node) or a bad implementation of navigator
try {
  isFirefox = /firefox/i.test(navigator.userAgent);
} catch (_e) {
  /* Ignore */
}

const noopDropDragOver: Props["onDropDragOver"] = () => undefined;

const resolveDroppingCoords = (
  gridEl: HTMLElement,
  gridRect: DOMRect,
  clientX: number,
  clientY: number,
  itemPixelWidth: number,
  itemPixelHeight: number,
  transformScale: number,
) => {
  const scrollLeft = gridEl.scrollLeft ?? 0;
  const scrollTop = gridEl.scrollTop ?? 0;
  const layerX = (clientX - gridRect.left) / transformScale + scrollLeft;
  const layerY = (clientY - gridRect.top) / transformScale + scrollTop;
  return {
    clampedGridX: Math.max(0, layerX - itemPixelWidth / 2),
    clampedGridY: Math.max(0, layerY - itemPixelHeight / 2),
  };
};

const defaultProps: DefaultProps = {
  autoSize: true,
  autoScroll: true,
  cols: 12,
  className: "",
  style: {},
  draggableHandle: "",
  dragTouchDelayDuration: DRAG_TOUCH_DELAY_DURATION,
  draggableCancel: "",
  containerPadding: null,
  rowHeight: 150,
  maxRows: Number.POSITIVE_INFINITY,
  // infinite vertical growth
  layout: [],
  margin: 10,
  isBounded: false,
  isDraggable: true,
  isResizable: true,
  isDroppable: false,
  transformScale: 1,
  compactor: verticalCompactor,
  droppingItem: {
    i: "__dropping-elem__",
    h: 1,
    w: 1,
  },
  resizeHandles: ["se"],
  onLayoutChange: noop,
  onDragStart: noop,
  onDrag: noop,
  onDragStop: noop,
  onResizeStart: noop,
  onResize: noop,
  onResizeStop: noop,
  onDrop: noop,
  onDropDragOver: noopDropDragOver,
  dndRect: undefined,
  dndEvent: undefined,
};

type DndGridProps = Omit<Props, keyof DefaultProps> & Partial<DefaultProps>;

const resolveCompactor = (props: Props): Compactor =>
  props.compactor ?? verticalCompactor;

const getDerivedStateFromProps = (
  nextProps: Props,
  prevState: State,
): Partial<State> | null => {
  let newLayoutBase: Layout | null | undefined;
  const nextCompactor = resolveCompactor(nextProps);

  if (prevState.activeDrag) {
    return null;
  }

  // Allow parent to set layout directly.
  if (
    !deepEqual(nextProps.layout, prevState.propsLayout) ||
    nextCompactor !== prevState.compactor
  ) {
    newLayoutBase = nextProps.layout;
  } else if (!childrenEqual(nextProps.children, prevState.children)) {
    // If children change, also regenerate the layout. Use our state
    // as the base in case because it may be more up to date than
    // what is in props.
    newLayoutBase = prevState.layout;
  }

  // We need to regenerate the layout.
  if (newLayoutBase) {
    const newLayout = synchronizeLayoutWithChildren(
      newLayoutBase,
      nextProps.children,
      nextProps.cols,
      nextCompactor,
    );
    return {
      layout: newLayout,
      // We need to save these props to state for using
      // getDerivedStateFromProps instead of componentDidMount (in which we would get extra rerender)
      children: nextProps.children,
      propsLayout: nextProps.layout,
      compactor: nextCompactor,
    };
  }

  return null;
};

export type DndGridHandle = {
  containerHeight: () => string | undefined;
  onDragStart: (i: string, x: number, y: number, arg3: GridDragEvent) => void;
  onDrag: (i: string, x: number, y: number, arg3: GridDragEvent) => void;
  onDragStop: (i: string, x: number, y: number, arg3: GridDragEvent) => void;
  onDragOver: React.DragEventHandler<HTMLDivElement>;
  onDragEnter: React.DragEventHandler<HTMLDivElement>;
  onDragLeave: React.DragEventHandler<HTMLDivElement>;
  onDrop: React.DragEventHandler<HTMLDivElement>;
  onResizeStart: (
    i: string,
    w: number,
    h: number,
    arg3: GridResizeEvent,
  ) => void;
  onResize: (i: string, w: number, h: number, arg3: GridResizeEvent) => void;
  onResizeStop: (
    i: string,
    w: number,
    h: number,
    arg3: GridResizeEvent,
  ) => void;
  onSettleComplete: (i: string) => void;
  handleDndRect: (
    e?: Event | undefined | null,
    dndRect?:
      | {
          top: number;
          right: number;
          bottom: number;
          left: number;
          width: number;
          height: number;
        }
      | null
      | undefined,
  ) => void;
  removeDroppingPlaceholder: () => void;
  state: State;
};

export type DndGrid = DndGridHandle;

type DndGridComponent = React.ForwardRefExoticComponent<
  React.PropsWithoutRef<DndGridProps> & React.RefAttributes<DndGridHandle>
> & {
  defaultProps?: DefaultProps;
  displayName?: string;
  getDerivedStateFromProps: typeof getDerivedStateFromProps;
};

/**
 * A reactive, fluid grid layout with draggable, resizable components.
 */

const DndGrid = React.forwardRef<DndGridHandle, DndGridProps>(
  (incomingProps, ref) => {
    const props = { ...defaultProps, ...incomingProps } as Props;
    const [state, setState] = React.useState<State>(() => ({
      activeDrag: null,
      settlingItem: null,
      layout: synchronizeLayoutWithChildren(
        props.layout,
        props.children,
        props.cols,
        resolveCompactor(props),
      ),
      mounted: false,
      oldDragItem: null,
      oldLayout: null,
      oldResizeItem: null,
      resizing: false,
      droppingDOMNode: null,
      children: props.children,
      propsLayout: props.layout,
      compactor: resolveCompactor(props),
    }));

    const stateRef = React.useRef(state);
    stateRef.current = state;
    const propsRef = React.useRef(props);
    propsRef.current = props;
    const containerRef = React.useRef<HTMLDivElement | null>(null);
    const edgeScroll = useEdgeScroll(props.autoScroll);
    const edgeScrollRef = React.useRef(edgeScroll);
    edgeScrollRef.current = edgeScroll;
    const dragEnterCounterRef = React.useRef(0);
    const prevLayoutRef = React.useRef<Layout | null | undefined>(undefined);
    const lastLayoutChangeRef = React.useRef<Layout | null>(null);
    const dndRectInitializedRef = React.useRef(false);
    const prevDndRectRef = React.useRef(props.dndRect);

    const resolveSpacing = React.useCallback(() => {
      const resolvedMargin = normalizeSpacing(propsRef.current.margin);
      const resolvedContainerPadding = normalizeSpacing(
        propsRef.current.containerPadding ?? propsRef.current.margin,
      );
      return {
        margin: resolvedMargin,
        containerPadding: resolvedContainerPadding,
      };
    }, []);

    const onLayoutMaybeChanged = React.useCallback(
      (newLayout: Layout, oldLayout?: Layout | null | undefined) => {
        const previousLayout = oldLayout ?? stateRef.current.layout;

        if (deepEqual(previousLayout, newLayout)) {
          return;
        }

        if (
          lastLayoutChangeRef.current &&
          deepEqual(lastLayoutChangeRef.current, newLayout)
        ) {
          return;
        }

        lastLayoutChangeRef.current = cloneLayout(newLayout);
        propsRef.current.onLayoutChange(newLayout);
      },
      [],
    );

    const setContainerRef = React.useCallback((node: HTMLDivElement | null) => {
      containerRef.current = node;
      const { innerRef } = propsRef.current;
      if (!innerRef) {
        return;
      }
      if (typeof innerRef === "function") {
        innerRef(node);
        return;
      }
      (innerRef as React.MutableRefObject<HTMLDivElement | null>).current =
        node;
    }, []);

    const containerHeight = React.useCallback((): string | undefined => {
      if (!propsRef.current.autoSize) return;
      const nbRow = bottom(stateRef.current.layout);
      const { rowHeight } = propsRef.current;
      const { margin, containerPadding } = resolveSpacing();
      const containerPaddingTop = containerPadding[0];
      const containerPaddingBottom = containerPadding[2];
      return (
        nbRow * rowHeight +
        (nbRow - 1) * margin[0] +
        containerPaddingTop +
        containerPaddingBottom +
        "px"
      );
    }, [resolveSpacing]);

    /**
     * When dragging starts
     */
    const onDragStart = React.useCallback(
      (
        i: string,
        _x: number,
        _y: number,
        { e, node, newPosition }: GridDragEvent,
      ) => {
        const { layout } = stateRef.current;
        const l = getLayoutItem(layout, i);
        if (!l) return;
        edgeScrollRef.current.handleDragStart(e, node, newPosition);
        // Create placeholder (display only)
        const placeholder = {
          w: l.w,
          h: l.h,
          x: l.x,
          y: l.y,
          placeholder: true,
          i: i,
        };
        setState((prevState) => ({
          ...prevState,
          oldDragItem: cloneLayoutItem(l),
          oldLayout: layout,
          activeDrag: placeholder,
        }));
        return propsRef.current.onDragStart(layout, l, l, null, e, node);
      },
      [],
    );

    /**
     * Each drag movement create a new dragelement and move the element to the dragged location
     */
    const onDrag = React.useCallback(
      (
        i: string,
        x: number,
        y: number,
        { e, node, newPosition }: GridDragEvent,
      ) => {
        const { oldDragItem } = stateRef.current;
        const { layout } = stateRef.current;
        const { cols } = propsRef.current;
        const compactor = resolveCompactor(propsRef.current);
        const { allowOverlap } = compactor;
        const l = getLayoutItem(layout, i);
        if (!l) return;
        edgeScrollRef.current.handleDrag(e, node, newPosition);
        // Move the element to the dragged location.
        const nextLayout = moveElement(
          layout,
          l,
          x,
          y,
          true,
          compactor,
          cols as number,
        );
        const updatedLayout = allowOverlap
          ? nextLayout
          : compactor.compact(nextLayout, cols as number);
        const updatedItem = getLayoutItem(updatedLayout, i) ?? l;
        // Create placeholder (display only)
        const placeholder = {
          w: updatedItem.w,
          h: updatedItem.h,
          x: updatedItem.x,
          y: updatedItem.y,
          placeholder: true,
          i: updatedItem.i,
        };
        propsRef.current.onDrag(
          updatedLayout,
          oldDragItem,
          updatedItem,
          placeholder,
          e,
          node,
        );
        setState((prevState) => ({
          ...prevState,
          layout: updatedLayout,
          activeDrag: placeholder,
        }));
      },
      [],
    );

    /**
     * When dragging stops, figure out which position the element is closest to and update its x and y.
     */
    const onDragStop = React.useCallback(
      (i: string, x: number, y: number, { e, node }: GridDragEvent) => {
        edgeScrollRef.current.handleDragStop();
        if (!stateRef.current.activeDrag) return;
        const { oldDragItem, oldLayout } = stateRef.current;
        const { layout } = stateRef.current;
        const { cols } = propsRef.current;
        const compactor = resolveCompactor(propsRef.current);
        const { allowOverlap } = compactor;
        const l = getLayoutItem(layout, i);
        if (!l) return;
        // Move the element here
        const nextLayout = moveElement(
          layout,
          l,
          x,
          y,
          true,
          compactor,
          cols as number,
        );
        // Set state
        const newLayout = allowOverlap
          ? nextLayout
          : compactor.compact(nextLayout, cols as number);
        const updatedItem = getLayoutItem(newLayout, i) ?? l;
        propsRef.current.onDragStop(
          newLayout,
          oldDragItem,
          updatedItem,
          null,
          e,
          node,
        );
        const placeholder = {
          w: updatedItem.w,
          h: updatedItem.h,
          x: updatedItem.x,
          y: updatedItem.y,
          placeholder: true,
          i: updatedItem.i,
        };
        // Keep activeDrag (placeholder) visible until item settles
        // settlingItem tracks which item is animating to final position
        setState((prevState) => ({
          ...prevState,
          settlingItem: i,
          layout: newLayout,
          activeDrag: placeholder,
          oldDragItem: null,
          oldLayout: null,
        }));
        onLayoutMaybeChanged(newLayout, oldLayout);
      },
      [onLayoutMaybeChanged],
    );

    /**
     * Called when a grid item finishes its settling animation
     */
    const onSettleComplete = React.useCallback((i: string) => {
      setState((prevState) => {
        if (prevState.settlingItem !== i) return prevState;
        return {
          ...prevState,
          activeDrag: null,
          settlingItem: null,
        };
      });
    }, []);

    const onResizeStart = React.useCallback(
      (i: string, _w: number, _h: number, { e, node }: GridResizeEvent) => {
        const { layout } = stateRef.current;
        const l = getLayoutItem(layout, i);
        if (!l) return;
        setState((prevState) => ({
          ...prevState,
          oldResizeItem: cloneLayoutItem(l),
          oldLayout: stateRef.current.layout,
          resizing: true,
        }));
        propsRef.current.onResizeStart(layout, l, l, null, e, node);
      },
      [],
    );

    const onResize = React.useCallback(
      (
        i: string,
        w: number,
        h: number,
        { e, node, handle }: GridResizeEvent,
      ) => {
        const { oldResizeItem } = stateRef.current;
        const { layout } = stateRef.current;
        const { cols } = propsRef.current;
        const compactor = resolveCompactor(propsRef.current);
        const { allowOverlap, preventCollision } = compactor;
        let shouldMoveItem = false;
        let finalLayout: Layout = layout;
        let x: number | undefined;
        let y: number | undefined;
        const [newLayout, l] = withLayoutItem(layout, i, (l) => {
          x = l.x;
          y = l.y;

          if (["sw", "w", "nw", "n", "ne"].indexOf(handle) !== -1) {
            if (["sw", "nw", "w"].indexOf(handle) !== -1) {
              x = l.x + (l.w - w);
              w = l.x !== x && x < 0 ? l.w : w;
              x = x < 0 ? 0 : x;
            }

            if (["ne", "n", "nw"].indexOf(handle) !== -1) {
              y = l.y + (l.h - h);
              h = l.y !== y && y < 0 ? l.h : h;
              y = y < 0 ? 0 : y;
            }

            shouldMoveItem = true;
          }

          // Something like quad tree should be used
          // to find collisions faster
          if (preventCollision && !allowOverlap) {
            const collisions = getAllCollisions(layout, {
              ...l,
              w,
              h,
              x: x ?? l.x,
              y: y ?? l.y,
            }).filter((layoutItem) => layoutItem.i !== l.i);

            // If we're colliding, we need adjust the placeholder.
            if (collisions.length > 0) {
              // Reset layoutItem dimensions if there were collisions
              y = l.y;
              h = l.h;
              x = l.x;
              w = l.w;
              shouldMoveItem = false;
            }
          }

          l.w = w;
          l.h = h;
          return l;
        });
        // Shouldn't ever happen, but typechecking makes it necessary
        if (!l) return;
        finalLayout = newLayout;

        if (shouldMoveItem && x !== undefined && y !== undefined) {
          // Move the element to the new position.
          finalLayout = moveElement(
            newLayout,
            l,
            x,
            y,
            true,
            compactor,
            cols as number,
          );
        }

        const updatedLayout = allowOverlap
          ? finalLayout
          : compactor.compact(finalLayout, cols as number);
        const updatedItem = getLayoutItem(updatedLayout, i) ?? l;
        // Create placeholder element (display only)
        const placeholder = {
          w: updatedItem.w,
          h: updatedItem.h,
          x: updatedItem.x,
          y: updatedItem.y,
          static: true,
          i: updatedItem.i,
        };
        propsRef.current.onResize(
          updatedLayout,
          oldResizeItem,
          updatedItem,
          placeholder,
          e,
          node,
        );
        // Re-compact the newLayout and set the drag placeholder.
        setState((prevState) => ({
          ...prevState,
          layout: updatedLayout,
          activeDrag: placeholder,
        }));
      },
      [],
    );

    const onResizeStop = React.useCallback(
      (i: string, _w: number, _h: number, { e, node }: GridResizeEvent) => {
        const { layout, oldResizeItem, oldLayout } = stateRef.current;
        const { cols } = propsRef.current;
        const compactor = resolveCompactor(propsRef.current);
        const { allowOverlap } = compactor;
        const l = getLayoutItem(layout, i);
        // Set state
        const newLayout = allowOverlap
          ? layout
          : compactor.compact(layout, cols as number);
        const updatedItem = getLayoutItem(newLayout, i) ?? l;
        propsRef.current.onResizeStop(
          newLayout,
          oldResizeItem,
          updatedItem,
          null,
          e,
          node,
        );
        setState((prevState) => ({
          ...prevState,
          activeDrag: null,
          layout: newLayout,
          oldResizeItem: null,
          oldLayout: null,
          resizing: false,
        }));
        onLayoutMaybeChanged(newLayout, oldLayout);
      },
      [onLayoutMaybeChanged],
    );

    /**
     * Create a placeholder object.
     */
    const placeholder = () => {
      const { activeDrag, resizing, settlingItem } = state;
      if (!activeDrag) return null;
      const {
        width,
        cols,
        margin,
        containerPadding,
        rowHeight,
        maxRows,
        transformScale,
        slotProps,
      } = props;
      const isSettling = settlingItem === activeDrag.i;
      const isResizing = resizing;
      const placeholderState: ItemState = {
        dragging: Boolean(activeDrag && !isResizing && !isSettling),
        resizing: isResizing,
        settling: isSettling,
        disabled: true,
      };
      const placeholderSlotClassName = slotProps?.placeholder?.className;
      const resolvedPlaceholderClassName =
        typeof placeholderSlotClassName === "function"
          ? placeholderSlotClassName(activeDrag, placeholderState)
          : placeholderSlotClassName;
      const placeholderSlotStyle = slotProps?.placeholder?.style;
      const resolvedPlaceholderStyle =
        typeof placeholderSlotStyle === "function"
          ? placeholderSlotStyle(activeDrag, placeholderState)
          : placeholderSlotStyle;
      const placeholderClassName = clsx(
        "dnd-grid-placeholder",
        resizing && "placeholder-resizing",
        resolvedPlaceholderClassName,
      );
      // {...this.state.activeDrag} is pretty slow, actually
      return (
        <GridItem
          layout={state.layout}
          w={activeDrag.w}
          h={activeDrag.h}
          x={activeDrag.x}
          y={activeDrag.y}
          i={activeDrag.i}
          className={placeholderClassName}
          containerWidth={width}
          cols={cols as number}
          margin={margin}
          containerPadding={containerPadding ?? margin}
          maxRows={maxRows}
          rowHeight={rowHeight}
          isDraggable={false}
          isResizable={false}
          isBounded={false}
          transformScale={transformScale}
          style={resolvedPlaceholderStyle}
        >
          <div />
        </GridItem>
      );
    };

    /**
     * Given a grid item, set its style attributes & surround in a <Draggable>.
     */
    const processGridItem = (
      child: React.ReactNode,
      isDroppingItem?: boolean,
    ): ReactElement | null => {
      if (!React.isValidElement(child) || child.key == null) return null;
      const l = getLayoutItem(state.layout, String(child.key));
      if (!l) return null;
      const {
        width,
        cols,
        margin,
        containerPadding,
        rowHeight,
        maxRows,
        isDraggable,
        dragTouchDelayDuration,
        isResizable,
        isBounded,
        transformScale,
        draggableCancel,
        draggableHandle,
        resizeHandles,
        resizeHandle,
        constraints,
        slotProps,
      } = props;
      const { droppingPosition } = state;
      // Determine user manipulations possible.
      // If an item is static, it can't be manipulated by default.
      // Any properties defined directly on the grid item will take precedence.
      const draggable =
        typeof l.isDraggable === "boolean"
          ? l.isDraggable
          : !l.static && isDraggable;
      const resizable =
        typeof l.isResizable === "boolean"
          ? l.isResizable
          : !l.static && isResizable;
      const resizeHandlesOptions = l.resizeHandles || resizeHandles;
      // isBounded set on child if set on parent, and child is not explicitly false
      const bounded = draggable && isBounded && l.isBounded !== false;
      return (
        <GridItem
          containerWidth={width}
          cols={cols as number}
          margin={margin}
          containerPadding={containerPadding ?? margin}
          maxRows={maxRows}
          rowHeight={rowHeight}
          layout={state.layout}
          constraints={constraints}
          cancel={draggableCancel}
          handle={draggableHandle}
          onDragStop={onDragStop}
          onDragStart={onDragStart}
          onDrag={onDrag}
          onResizeStart={onResizeStart}
          onResize={onResize}
          onResizeStop={onResizeStop}
          onSettleComplete={onSettleComplete}
          isDraggable={draggable}
          dragTouchDelayDuration={dragTouchDelayDuration}
          isResizable={resizable}
          isBounded={bounded}
          transformScale={transformScale}
          w={l.w}
          h={l.h}
          x={l.x}
          y={l.y}
          i={l.i}
          minH={l.minH}
          minW={l.minW}
          maxH={l.maxH}
          maxW={l.maxW}
          static={l.static}
          droppingPosition={isDroppingItem ? droppingPosition : undefined}
          resizeHandles={resizeHandlesOptions}
          resizeHandle={resizeHandle}
          slotProps={slotProps}
        >
          {child}
        </GridItem>
      );
    };

    const removeDroppingPlaceholder = React.useCallback(() => {
      const { droppingItem, cols } = propsRef.current;
      const { layout } = stateRef.current;
      const compactor = resolveCompactor(propsRef.current);
      const newLayout = compactor.compact(
        layout.filter((l) => l.i !== droppingItem.i),
        cols as number,
      );
      setState((prevState) => ({
        ...prevState,
        layout: newLayout,
        droppingDOMNode: null,
        activeDrag: null,
        droppingPosition: undefined,
      }));
    }, []);

    // Called while dragging an element. Part of browser native drag/drop API.
    // Native event target might be the layout itself, or an element within the layout.
    const onDragOver = React.useCallback<
      React.DragEventHandler<HTMLDivElement>
    >(
      (e) => {
        e.preventDefault(); // Prevent any browser native action

        e.stopPropagation();

        // Ignore events from layout's children in Firefox to prevent placeholder jumping.
        const target = e.nativeEvent.target;
        if (
          isFirefox &&
          (!(target instanceof HTMLElement) ||
            !target.classList.contains(layoutClassName))
        ) {
          return false;
        }

        const {
          droppingItem,
          onDropDragOver,
          cols,
          rowHeight,
          maxRows,
          width,
          transformScale,
        } = propsRef.current;
        const { margin, containerPadding } = resolveSpacing();
        // Allow user to customize the dropping item or short-circuit the drop based on the results
        // of the `onDragOver(e: Event)` callback.
        const onDragOverResult = onDropDragOver?.(
          e as unknown as DragOverEvent,
        );

        if (onDragOverResult === false) {
          if (stateRef.current.droppingDOMNode) {
            removeDroppingPlaceholder();
          }

          return false;
        }

        const finalDroppingItem = { ...droppingItem, ...onDragOverResult };
        const { layout } = stateRef.current;
        const gridEl = e.currentTarget;
        const gridRect = gridEl.getBoundingClientRect(); // The grid's position in the viewport
        const positionParams: PositionParams = {
          cols,
          margin,
          maxRows,
          rowHeight,
          containerWidth: width,
          containerPadding,
        };
        const colWidth = calcGridColWidth(positionParams);
        const itemPixelWidth = calcGridItemWHPx(
          finalDroppingItem.w ?? 1,
          colWidth,
          margin[1],
        );
        const itemPixelHeight = calcGridItemWHPx(
          finalDroppingItem.h ?? 1,
          rowHeight,
          margin[0],
        );
        const { clampedGridX, clampedGridY } = resolveDroppingCoords(
          gridEl,
          gridRect,
          e.clientX,
          e.clientY,
          itemPixelWidth,
          itemPixelHeight,
          transformScale,
        );
        const droppingPosition = {
          left: clampedGridX,
          top: clampedGridY,
          e,
        };

        if (!stateRef.current.droppingDOMNode) {
          const calculatedPosition = calcXY(
            positionParams,
            clampedGridY,
            clampedGridX,
            finalDroppingItem.w as number,
            finalDroppingItem.h as number,
          );
          const nextDroppingItem: LayoutItem = {
            ...finalDroppingItem,
            x: calculatedPosition.x,
            y: calculatedPosition.y,
            static: false,
            isDraggable: true,
          } as LayoutItem;
          setState((prevState) => ({
            ...prevState,
            droppingDOMNode: <div key={finalDroppingItem.i} />,
            droppingPosition,
            layout: [...layout, nextDroppingItem],
          }));
        } else if (stateRef.current.droppingPosition) {
          const { left, top } = stateRef.current.droppingPosition;
          const shouldUpdatePosition =
            left !== clampedGridX || top !== clampedGridY;

          if (shouldUpdatePosition) {
            setState((prevState) => ({
              ...prevState,
              droppingPosition,
            }));
          }
        }
      },
      [removeDroppingPlaceholder, resolveSpacing],
    );

    // Called while dragging an element. Part of browser native drag/drop API.
    // Native event target might be the layout itself, or an element within the layout.
    const handleDndRect = React.useCallback(
      (
        e?: Event | undefined | null,
        dndRect?:
          | {
              top: number;
              right: number;
              bottom: number;
              left: number;
              width: number;
              height: number;
            }
          | null
          | undefined,
      ) => {
        if (!dndRect || !e) {
          const { droppingItem } = propsRef.current;
          const { layout } = stateRef.current;
          const item = layout.find((l) => l.i === droppingItem.i);
          // reset dragEnter counter on drop
          dragEnterCounterRef.current = 0;
          removeDroppingPlaceholder();
          if (!e) return;
          propsRef.current.onDrop(layout, item, e);
          return;
        }

        const {
          droppingItem,
          onDropDragOver,
          cols,
          rowHeight,
          maxRows,
          width,
          transformScale,
        } = propsRef.current;
        const { margin, containerPadding } = resolveSpacing();
        // Allow user to customize the dropping item or short-circuit the drop based on the results
        // of the `onDragOver(e: Event)` callback.
        const onDragOverResult = onDropDragOver?.();

        if (onDragOverResult === false) {
          if (stateRef.current.droppingDOMNode) {
            removeDroppingPlaceholder();
          }

          return false;
        }

        const finalDroppingItem = { ...droppingItem, ...onDragOverResult };
        const { layout } = stateRef.current;
        const gridEl = containerRef.current;
        // Guard against missing grid element
        if (!gridEl) return;
        const gridRect = gridEl.getBoundingClientRect();
        const positionParams: PositionParams = {
          cols,
          margin,
          maxRows,
          rowHeight,
          containerWidth: width,
          containerPadding,
        };
        const colWidth = calcGridColWidth(positionParams);
        const itemPixelWidth = calcGridItemWHPx(
          finalDroppingItem.w ?? 1,
          colWidth,
          margin[1],
        );
        const itemPixelHeight = calcGridItemWHPx(
          finalDroppingItem.h ?? 1,
          rowHeight,
          margin[0],
        );
        const { clampedGridX, clampedGridY } = resolveDroppingCoords(
          gridEl,
          gridRect,
          dndRect.left,
          dndRect.top,
          itemPixelWidth,
          itemPixelHeight,
          transformScale,
        );
        const droppingPosition: DroppingPosition = {
          left: clampedGridX,
          top: clampedGridY,
          e,
        };

        if (!stateRef.current.droppingDOMNode) {
          const calculatedPosition = calcXY(
            positionParams,
            clampedGridY,
            clampedGridX,
            finalDroppingItem.w as number,
            finalDroppingItem.h as number,
          );
          const nextDroppingItem: LayoutItem = {
            ...finalDroppingItem,
            x: calculatedPosition.x,
            y: calculatedPosition.y,
            static: false,
            isDraggable: true,
          } as LayoutItem;
          setState((prevState) => ({
            ...prevState,
            droppingDOMNode: <div key={finalDroppingItem.i} />,
            droppingPosition,
            layout: [...layout, nextDroppingItem],
          }));
        } else if (stateRef.current.droppingPosition) {
          const { left, top } = stateRef.current.droppingPosition;
          const shouldUpdatePosition =
            left !== clampedGridX || top !== clampedGridY;

          if (shouldUpdatePosition) {
            setState((prevState) => ({
              ...prevState,
              droppingPosition,
            }));
          }
        }
      },
      [removeDroppingPlaceholder, resolveSpacing],
    );

    const onDragLeave = React.useCallback<
      React.DragEventHandler<HTMLDivElement>
    >(
      (e) => {
        e.preventDefault(); // Prevent any browser native action

        e.stopPropagation();
        dragEnterCounterRef.current -= 1;

        // onDragLeave can be triggered on each layout's child.
        // But we know that count of dragEnter and dragLeave events
        // will be balanced after leaving the layout's container
        // so we can increase and decrease count of dragEnter and
        // when it'll be equal to 0 we'll remove the placeholder
        if (dragEnterCounterRef.current === 0) {
          removeDroppingPlaceholder();
        }
      },
      [removeDroppingPlaceholder],
    );

    const onDragEnter = React.useCallback<
      React.DragEventHandler<HTMLDivElement>
    >((e) => {
      e.preventDefault(); // Prevent any browser native action

      e.stopPropagation();
      dragEnterCounterRef.current += 1;
    }, []);

    const onDrop = React.useCallback<React.DragEventHandler<HTMLDivElement>>(
      (e) => {
        e.preventDefault(); // Prevent any browser native action

        e.stopPropagation();
        const { droppingItem } = propsRef.current;
        const { layout } = stateRef.current;
        const item = layout.find((l) => l.i === droppingItem.i);
        // reset dragEnter counter on drop
        dragEnterCounterRef.current = 0;
        removeDroppingPlaceholder();
        propsRef.current.onDrop(layout, item, e.nativeEvent);
      },
      [removeDroppingPlaceholder],
    );

    React.useLayoutEffect(() => {
      const derived = getDerivedStateFromProps(
        {
          ...propsRef.current,
          layout: props.layout,
          compactor: props.compactor,
          children: props.children,
        },
        stateRef.current,
      );
      if (derived) {
        setState((prevState) => ({
          ...prevState,
          ...derived,
        }));
      }
    }, [props.layout, props.compactor, props.children]);

    React.useEffect(() => {
      if (!state.mounted) {
        setState((prevState) => ({
          ...prevState,
          mounted: true,
        }));
        onLayoutMaybeChanged(state.layout, props.layout);
        prevLayoutRef.current = state.layout;
        return;
      }

      if (!state.activeDrag && !state.droppingDOMNode) {
        onLayoutMaybeChanged(state.layout, prevLayoutRef.current);
      }

      prevLayoutRef.current = state.layout;
    }, [
      state.mounted,
      state.layout,
      state.activeDrag,
      state.droppingDOMNode,
      props.layout,
      onLayoutMaybeChanged,
    ]);

    React.useEffect(() => {
      if (!dndRectInitializedRef.current) {
        dndRectInitializedRef.current = true;
        prevDndRectRef.current = props.dndRect;
        return;
      }
      if (props.dndRect !== prevDndRectRef.current) {
        handleDndRect(props.dndEvent, props.dndRect);
        prevDndRectRef.current = props.dndRect;
      }
    }, [props.dndRect, props.dndEvent, handleDndRect]);

    React.useImperativeHandle(
      ref,
      () => ({
        containerHeight,
        onDragStart,
        onDrag,
        onDragStop,
        onDragOver,
        onDragEnter,
        onDragLeave,
        onDrop,
        onResizeStart,
        onResize,
        onResizeStop,
        onSettleComplete,
        handleDndRect,
        removeDroppingPlaceholder,
        state,
      }),
      [
        containerHeight,
        onDragStart,
        onDrag,
        onDragStop,
        onDragOver,
        onDragEnter,
        onDragLeave,
        onDrop,
        onResizeStart,
        onResize,
        onResizeStop,
        onSettleComplete,
        handleDndRect,
        removeDroppingPlaceholder,
        state,
      ],
    );

    const { className, style, isDroppable } = props;
    const mergedClassName = clsx(layoutClassName, className);
    const mergedStyle: React.CSSProperties = {
      height: containerHeight(),
      ...style,
    };

    return (
      <div
        ref={setContainerRef}
        role="application"
        className={mergedClassName}
        style={mergedStyle}
        data-dnd-grid=""
        onDrop={isDroppable ? onDrop : noop}
        onDragLeave={isDroppable ? onDragLeave : noop}
        onDragEnter={isDroppable ? onDragEnter : noop}
        onDragOver={isDroppable ? onDragOver : noop}
      >
        {React.Children.map(props.children, (child) => processGridItem(child))}
        {isDroppable &&
          state.droppingDOMNode &&
          processGridItem(state.droppingDOMNode, true)}
        {placeholder()}
      </div>
    );
  },
) as DndGridComponent;

DndGrid.displayName = "DndGrid";
DndGrid.defaultProps = defaultProps;
DndGrid.getDerivedStateFromProps = getDerivedStateFromProps;

export { DndGrid };
