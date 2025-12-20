import clsx from "clsx";
import { deepEqual } from "fast-equals";
import * as React from "react";
import type { ReactElement } from "react";
import { calcXY } from "../calculateUtils";
import {
  bottom,
  childrenEqual,
  cloneLayoutItem,
  compact,
  compactType,
  getAllCollisions,
  getLayoutItem,
  moveElement,
  noop,
  synchronizeLayoutWithChildren,
  withLayoutItem,
} from "../utils";
import { GridItem } from "./grid-item";

import type {
  CompactType,
  DefaultProps,
  DroppingPosition,
  GridDragEvent,
  GridResizeEvent,
  Layout,
  LayoutItem,
  PositionParams,
  Props,
} from "../types";

type State = {
  activeDrag: LayoutItem | null | undefined;
  layout: Layout;
  mounted: boolean;
  oldDragItem: LayoutItem | null | undefined;
  oldLayout: Layout | null | undefined;
  oldResizeItem: LayoutItem | null | undefined;
  resizing: boolean;
  droppingDOMNode: ReactElement<any> | null | undefined;
  droppingPosition?: DroppingPosition;
  // Mirrored props
  children: React.ReactNode;
  compactType?: CompactType;
  propsLayout?: Layout;
};

const layoutClassName = "dnd-grid";
let isFirefox = false;

// Try...catch will protect from navigator not existing (e.g. node) or a bad implementation of navigator
try {
  isFirefox = /firefox/i.test(navigator.userAgent);
} catch (e) {
  /* Ignore */
}
/**
 * A reactive, fluid grid layout with draggable, resizable components.
 */

export class DndGrid extends React.Component<Props, State> {
  // TODO publish internal ReactClass displayName transform
  static displayName = "DndGrid";
  // Refactored to another module to make way for preval
  static defaultProps: DefaultProps = {
    autoSize: true,
    cols: 12,
    className: "",
    style: {},
    draggableHandle: "",
    // TODO [>=2.0.0] Make this default duration 250ms
    // By default, this is off. Set to ~250ms for touch devices
    dragTouchDelayDuration: 0,
    draggableCancel: "",
    containerPadding: null,
    rowHeight: 150,
    maxRows: Number.POSITIVE_INFINITY,
    // infinite vertical growth
    layout: [],
    margin: [10, 10, 10, 10],
    isBounded: false,
    isDraggable: true,
    isResizable: true,
    allowOverlap: false,
    isDroppable: false,
    useCSSTransforms: true,
    transformScale: 1,
    verticalCompact: true,
    compactType: "vertical",
    preventCollision: false,
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
    onDropDragOver: noop as any,
    dndRect: undefined,
    dndEvent: undefined,
  };
  state: State = {
    activeDrag: null,
    layout: synchronizeLayoutWithChildren(
      this.props.layout,
      this.props.children as any,
      this.props.cols as any, // Legacy support for verticalCompact: false
      compactType(this.props),
      this.props.allowOverlap
    ),
    mounted: false,
    oldDragItem: null,
    oldLayout: null,
    oldResizeItem: null,
    resizing: false,
    droppingDOMNode: null,
    children: [],
  };
  dragEnterCounter = 0;

  componentDidMount() {
    this.setState({
      mounted: true,
    });
    // Possibly call back with layout on mount. This should be done after correcting the layout width
    // to ensure we don't rerender with the wrong width.
    this.onLayoutMaybeChanged(this.state.layout, this.props.layout);
  }

  static getDerivedStateFromProps(nextProps: Props, prevState: State): Partial<State> | null {
    let newLayoutBase;

    if (prevState.activeDrag) {
      return null;
    }

    // Legacy support for compactType
    // Allow parent to set layout directly.
    if (
      !deepEqual(nextProps.layout, prevState.propsLayout) ||
      nextProps.compactType !== prevState.compactType
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
        nextProps.children as any,
        nextProps.cols as any,
        compactType(nextProps),
        nextProps.allowOverlap
      );
      return {
        layout: newLayout,
        // We need to save these props to state for using
        // getDerivedStateFromProps instead of componentDidMount (in which we would get extra rerender)
        compactType: nextProps.compactType,
        children: nextProps.children,
        propsLayout: nextProps.layout,
      };
    }

    return null;
  }

  shouldComponentUpdate(nextProps: Props, nextState: State): boolean {
    return (
      // NOTE: this is almost always unequal. Therefore the only way to get better performance
      // from SCU is if the user intentionally memoizes children. If they do, and they can
      // handle changes properly, performance will increase.
      this.props.children !== nextProps.children ||
      this.props.width !== nextProps.width ||
      this.props.dndRect !== nextProps.dndRect ||
      this.state.activeDrag !== nextState.activeDrag ||
      this.state.mounted !== nextState.mounted ||
      this.state.droppingPosition !== nextState.droppingPosition
    );
  }

  componentDidUpdate(prevProps: Props, prevState: State) {
    if (!this.state.activeDrag) {
      const newLayout = this.state.layout;
      const oldLayout = prevState.layout;
      this.onLayoutMaybeChanged(newLayout, oldLayout);
    }

    if (this.props.dndRect !== prevProps.dndRect) {
      this.handleDndRect(this?.props?.dndEvent, this.props.dndRect);
    }
  }

  /**
   * Calculates a pixel value for the container.
   */
  containerHeight(): string | undefined {
    if (!this.props.autoSize) return;
    const nbRow = bottom(this.state.layout);
    const containerPaddingTop = this.props.containerPadding
      ? this.props.containerPadding[0]
      : this.props.margin[0];
    const containerPaddingBottom = this.props.containerPadding
      ? this.props.containerPadding[2]
      : this.props.margin[2];
    return (
      nbRow * this.props.rowHeight +
      (nbRow - 1) * this.props.margin[0] +
      containerPaddingTop +
      containerPaddingBottom +
      "px"
    );
  }

  /**
   * When dragging starts
   */
  onDragStart: (i: string, x: number, y: number, arg3: GridDragEvent) => void = (
    i: string,
    _x: number,
    _y: number,
    { e, node }: GridDragEvent
  ) => {
    const { layout } = this.state;
    const l = getLayoutItem(layout, i);
    if (!l) return;
    // Create placeholder (display only)
    const placeholder = {
      w: l.w,
      h: l.h,
      x: l.x,
      y: l.y,
      deg: l.deg,
      placeholder: true,
      i: i,
    };
    this.setState({
      oldDragItem: cloneLayoutItem(l),
      oldLayout: layout,
      activeDrag: placeholder,
    });
    return this.props.onDragStart(layout, l, l, null, e, node);
  };

  /**
   * Each drag movement create a new dragelement and move the element to the dragged location
   */
  onDrag: (i: string, x: number, y: number, arg3: GridDragEvent) => void = (
    i,
    x,
    y,
    { e, node }
  ) => {
    const { oldDragItem } = this.state;
    let { layout } = this.state;
    const { cols, allowOverlap, preventCollision } = this.props;
    const l = getLayoutItem(layout, i);
    if (!l) return;
    // Create placeholder (display only)
    const placeholder = {
      w: l.w,
      h: l.h,
      x: l.x,
      y: l.y,
      deg: l.deg,
      placeholder: true,
      i: i,
    };
    // Move the element to the dragged location.
    const isUserAction = true;
    layout = moveElement(
      layout,
      l,
      x,
      y,
      isUserAction,
      preventCollision,
      compactType(this.props),
      cols as number,
      allowOverlap
    );
    this.props.onDrag(layout, oldDragItem, l, placeholder, e, node);
    this.setState({
      layout: allowOverlap ? layout : compact(layout, compactType(this.props), cols as number),
      activeDrag: placeholder,
    });
  };

  /**
   * When dragging stops, figure out which position the element is closest to and update its x and y.
   */
  onDragStop: (i: string, x: number, y: number, arg3: GridDragEvent) => void = (
    i,
    x,
    y,
    { e, node }
  ) => {
    if (!this.state.activeDrag) return;
    const { oldDragItem } = this.state;
    let { layout } = this.state;
    const { cols, preventCollision, allowOverlap } = this.props;
    const l = getLayoutItem(layout, i);
    if (!l) return;
    // Move the element here
    const isUserAction = true;
    layout = moveElement(
      layout,
      l,
      x,
      y,
      isUserAction,
      preventCollision,
      compactType(this.props),
      cols as number,
      allowOverlap
    );
    // Set state
    const newLayout = allowOverlap
      ? layout
      : compact(layout, compactType(this.props), cols as number);
    this.props.onDragStop(newLayout, oldDragItem, l, null, e, node);
    const { oldLayout } = this.state;
    this.setState({
      activeDrag: null,
      layout: newLayout,
      oldDragItem: null,
      oldLayout: null,
    });
    this.onLayoutMaybeChanged(newLayout, oldLayout);
  };

  onLayoutMaybeChanged(newLayout: Layout, oldLayout: Layout | null | undefined) {
    if (!oldLayout) oldLayout = this.state.layout;

    if (!deepEqual(oldLayout, newLayout)) {
      this.props.onLayoutChange(newLayout);
    }
  }

  onResizeStart: (i: string, w: number, h: number, arg3: GridResizeEvent) => void = (
    i,
    _w,
    _h,
    { e, node }
  ) => {
    const { layout } = this.state;
    const l = getLayoutItem(layout, i);
    if (!l) return;
    this.setState({
      oldResizeItem: cloneLayoutItem(l),
      oldLayout: this.state.layout,
      resizing: true,
    });
    this.props.onResizeStart(layout, l, l, null, e, node);
  };
  onResize: (i: string, w: number, h: number, arg3: GridResizeEvent) => void = (
    i,
    w,
    h,
    { e, node, handle }
  ) => {
    const { oldResizeItem } = this.state;
    const { layout } = this.state;
    const { cols, preventCollision, allowOverlap } = this.props;
    let shouldMoveItem = false;
    let finalLayout;
    let x;
    let y;
    const [newLayout, l] = withLayoutItem(layout, i, (l) => {
      let hasCollisions;
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
          x,
          y,
        }).filter((layoutItem) => layoutItem.i !== l.i);
        hasCollisions = collisions.length > 0;

        // If we're colliding, we need adjust the placeholder.
        if (hasCollisions) {
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

    if (shouldMoveItem) {
      // Move the element to the new position.
      const isUserAction = true;
      finalLayout = moveElement(
        newLayout,
        l,
        x,
        y,
        isUserAction,
        this.props.preventCollision,
        compactType(this.props),
        cols as number,
        allowOverlap
      );
    }

    // Create placeholder element (display only)
    const placeholder = {
      w: l.w,
      h: l.h,
      x: l.x,
      y: l.y,
      deg: l.deg,
      static: true,
      i: i,
    };
    this.props.onResize(finalLayout, oldResizeItem, l, placeholder, e, node);
    // Re-compact the newLayout and set the drag placeholder.
    this.setState({
      layout: allowOverlap
        ? finalLayout
        : compact(finalLayout, compactType(this.props), cols as number),
      activeDrag: placeholder,
    });
  };
  onResizeStop: (i: string, w: number, h: number, arg3: GridResizeEvent) => void = (
    i,
    _w,
    _h,
    { e, node }
  ) => {
    const { layout, oldResizeItem } = this.state;
    const { cols, allowOverlap } = this.props;
    const l = getLayoutItem(layout, i);
    // Set state
    const newLayout = allowOverlap
      ? layout
      : compact(layout, compactType(this.props), cols as number);
    this.props.onResizeStop(newLayout, oldResizeItem, l, null, e, node);
    const { oldLayout } = this.state;
    this.setState({
      activeDrag: null,
      layout: newLayout,
      oldResizeItem: null,
      oldLayout: null,
      resizing: false,
    });
    this.onLayoutMaybeChanged(newLayout, oldLayout);
  };

  /**
   * Create a placeholder object.
   */
  placeholder(): ReactElement<any> | null | undefined {
    const { activeDrag } = this.state;
    if (!activeDrag) return null;
    const {
      width,
      cols,
      margin,
      containerPadding,
      rowHeight,
      maxRows,
      useCSSTransforms,
      transformScale,
    } = this.props;
    // {...this.state.activeDrag} is pretty slow, actually
    return (
      <GridItem
        w={activeDrag.w}
        h={activeDrag.h}
        x={activeDrag.x}
        y={activeDrag.y}
        i={activeDrag.i}
        deg={activeDrag.deg}
        className={`dnd-grid-placeholder ${this.state.resizing ? "placeholder-resizing" : ""}`}
        containerWidth={width}
        cols={cols as number}
        margin={margin}
        containerPadding={containerPadding || margin}
        maxRows={maxRows}
        rowHeight={rowHeight}
        isDraggable={false}
        isResizable={false}
        isBounded={false}
        useCSSTransforms={useCSSTransforms}
        transformScale={transformScale}
      >
        <div />
      </GridItem>
    );
  }

  /**
   * Given a grid item, set its style attributes & surround in a <Draggable>.
   */
  processGridItem(
    child: ReactElement<any>,
    isDroppingItem?: boolean
  ): ReactElement<any> | null | undefined {
    if (!child || !child.key) return;
    const l = getLayoutItem(this.state.layout, String(child.key));
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
      useCSSTransforms,
      transformScale,
      draggableCancel,
      draggableHandle,
      resizeHandles,
      resizeHandle,
    } = this.props;
    const { mounted, droppingPosition } = this.state;
    // Determine user manipulations possible.
    // If an item is static, it can't be manipulated by default.
    // Any properties defined directly on the grid item will take precedence.
    const draggable = typeof l.isDraggable === "boolean" ? l.isDraggable : !l.static && isDraggable;
    const resizable = typeof l.isResizable === "boolean" ? l.isResizable : !l.static && isResizable;
    const resizeHandlesOptions = l.resizeHandles || resizeHandles;
    // isBounded set on child if set on parent, and child is not explicitly false
    const bounded = draggable && isBounded && l.isBounded !== false;
    return (
      <GridItem
        containerWidth={width}
        cols={cols as number}
        margin={margin}
        containerPadding={containerPadding || margin}
        maxRows={maxRows}
        rowHeight={rowHeight}
        cancel={draggableCancel}
        handle={draggableHandle}
        onDragStop={this.onDragStop}
        onDragStart={this.onDragStart}
        onDrag={this.onDrag}
        onResizeStart={this.onResizeStart}
        onResize={this.onResize}
        onResizeStop={this.onResizeStop}
        isDraggable={draggable}
        dragTouchDelayDuration={dragTouchDelayDuration}
        isResizable={resizable}
        isBounded={bounded}
        useCSSTransforms={useCSSTransforms && mounted}
        usePercentages={!mounted}
        transformScale={transformScale}
        w={l.w}
        h={l.h}
        x={l.x}
        y={l.y}
        i={l.i}
        deg={l.deg}
        minH={l.minH}
        minW={l.minW}
        maxH={l.maxH}
        maxW={l.maxW}
        static={l.static}
        droppingPosition={isDroppingItem ? droppingPosition : undefined}
        resizeHandles={resizeHandlesOptions}
        resizeHandle={resizeHandle}
      >
        {child}
      </GridItem>
    );
  }

  // Called while dragging an element. Part of browser native drag/drop API.
  // Native event target might be the layout itself, or an element within the layout.
  onDragOver: React.DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault(); // Prevent any browser native action

    e.stopPropagation();

    // we should ignore events from layout's children in Firefox
    // to avoid unpredictable jumping of a dropping placeholder
    // FIXME remove this hack
    if (
      isFirefox && // $FlowIgnore can't figure this out
      !(e.nativeEvent.target as any)?.classList.contains(layoutClassName)
    ) {
      return false;
    }

    const {
      droppingItem,
      onDropDragOver,
      margin,
      cols,
      rowHeight,
      maxRows,
      width,
      containerPadding,
      transformScale,
    } = this.props;
    // Allow user to customize the dropping item or short-circuit the drop based on the results
    // of the `onDragOver(e: Event)` callback.
    const onDragOverResult = onDropDragOver?.(e as any);

    if (onDragOverResult === false) {
      if (this.state.droppingDOMNode) {
        this.removeDroppingPlaceholder();
      }

      return false;
    }

    const finalDroppingItem = { ...droppingItem, ...onDragOverResult };
    const { layout } = this.state;
    const gridRect = (e.currentTarget as any)?.getBoundingClientRect(); // The grid's position in the viewport

    // Calculate the mouse position relative to the grid
    const layerX = e.clientX - gridRect.left;
    const layerY = e.clientY - gridRect.top;
    const droppingPosition = {
      left: layerX / transformScale,
      top: layerY / transformScale,
      e,
    };

    if (!this.state.droppingDOMNode) {
      const positionParams: PositionParams = {
        cols,
        margin,
        maxRows,
        rowHeight,
        containerWidth: width,
        containerPadding: containerPadding || margin,
      } as any;
      const calculatedPosition = calcXY(
        positionParams,
        layerY,
        layerX,
        finalDroppingItem.w as number,
        finalDroppingItem.h as number
      );
      this.setState({
        droppingDOMNode: <div key={finalDroppingItem.i} />,
        droppingPosition,
        layout: [
          ...layout,
          {
            ...finalDroppingItem,
            x: calculatedPosition.x,
            y: calculatedPosition.y,
            static: false,
            isDraggable: true,
          } as any,
        ],
      });
    } else if (this.state.droppingPosition) {
      const { left, top } = this.state.droppingPosition;
      const shouldUpdatePosition = left !== layerX || top !== layerY;

      if (shouldUpdatePosition) {
        this.setState({
          droppingPosition,
        });
      }
    }
  };

  // Called while dragging an element. Part of browser native drag/drop API.
  // Native event target might be the layout itself, or an element within the layout.
  handleDndRect = (
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
      | undefined
  ) => {
    if (!dndRect || !e) {
      const { droppingItem } = this.props;
      const { layout } = this.state;
      const item = layout.find((l) => l.i === droppingItem.i);
      // reset dragEnter counter on drop
      this.dragEnterCounter = 0;
      this.removeDroppingPlaceholder();
      this.props.onDrop(layout, item, e as any);
      return;
    }

    const {
      droppingItem,
      onDropDragOver,
      margin,
      cols,
      rowHeight,
      maxRows,
      width,
      containerPadding,
      transformScale,
    } = this.props;
    // return;
    // Allow user to customize the dropping item or short-circuit the drop based on the results
    // of the `onDragOver(e: Event)` callback.
    const onDragOverResult = onDropDragOver?.();

    if (onDragOverResult === false) {
      if (this.state.droppingDOMNode) {
        this.removeDroppingPlaceholder();
      }

      return false;
    }

    const finalDroppingItem = { ...droppingItem, ...onDragOverResult };
    const { layout } = this.state;
    const gridEl = document.getElementById("dnd-grid");
    // Guard against missing grid element
    if (!gridEl) return;
    const gridRect = gridEl.getBoundingClientRect();
    // Calculate the mouse position relative to the grid
    const layerY = dndRect.top - gridRect.top;
    const layerX = dndRect.left - gridRect.left;
    const droppingPosition: DroppingPosition = {
      left: layerX / transformScale,
      top: layerY / transformScale,
      e,
    };

    if (!this.state.droppingDOMNode) {
      const positionParams: PositionParams = {
        cols,
        margin,
        maxRows,
        rowHeight,
        containerWidth: width,
        containerPadding: containerPadding || margin,
      } as any;
      const calculatedPosition = calcXY(
        positionParams,
        layerY,
        layerX,
        finalDroppingItem.w as number,
        finalDroppingItem.h as number
      );
      this.setState({
        droppingDOMNode: <div key={finalDroppingItem.i} />,
        droppingPosition,
        layout: [
          ...layout,
          {
            ...finalDroppingItem,
            x: calculatedPosition.x,
            y: calculatedPosition.y,
            static: false,
            isDraggable: true,
          } as any,
        ],
      });
    } else if (this.state.droppingPosition) {
      const { left, top } = this.state.droppingPosition;
      const shouldUpdatePosition = left !== layerX || top !== layerY;

      if (shouldUpdatePosition) {
        this.setState({
          droppingPosition,
        });
      }
    }
  };

  removeDroppingPlaceholder: () => void = () => {
    const { droppingItem, cols } = this.props;
    const { layout } = this.state;
    const newLayout = compact(
      layout.filter((l) => l.i !== droppingItem.i),
      compactType(this.props),
      cols as number,
      this.props.allowOverlap
    );
    this.setState({
      layout: newLayout,
      droppingDOMNode: null,
      activeDrag: null,
      droppingPosition: undefined,
    });
  };
  onDragLeave: React.DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault(); // Prevent any browser native action

    e.stopPropagation();
    this.dragEnterCounter--;

    // onDragLeave can be triggered on each layout's child.
    // But we know that count of dragEnter and dragLeave events
    // will be balanced after leaving the layout's container
    // so we can increase and decrease count of dragEnter and
    // when it'll be equal to 0 we'll remove the placeholder
    if (this.dragEnterCounter === 0) {
      this.removeDroppingPlaceholder();
    }
  };

  onDragEnter: React.DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault(); // Prevent any browser native action

    e.stopPropagation();
    this.dragEnterCounter++;
  };

  onDrop: React.DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault(); // Prevent any browser native action

    e.stopPropagation();
    const { droppingItem } = this.props;
    const { layout } = this.state;
    const item = layout.find((l) => l.i === droppingItem.i);
    // reset dragEnter counter on drop
    this.dragEnterCounter = 0;
    this.removeDroppingPlaceholder();
    this.props.onDrop(layout, item, e as any);
  };

  render(): React.ReactElement<"div"> {
    const { className, style, isDroppable, innerRef } = this.props;
    const mergedClassName = clsx(layoutClassName, className);
    const mergedStyle: React.CSSProperties = {
      height: this.containerHeight(),
      ...style,
    };
    return (
      <div
        id="dnd-grid"
        ref={innerRef}
        className={mergedClassName}
        style={mergedStyle}
        onDrop={isDroppable ? this.onDrop : noop}
        onDragLeave={isDroppable ? this.onDragLeave : noop}
        onDragEnter={isDroppable ? this.onDragEnter : noop}
        onDragOver={isDroppable ? this.onDragOver : noop}
      >
        {React.Children.map(this.props.children as any, (child) => this.processGridItem(child))}
        {isDroppable &&
          this.state.droppingDOMNode &&
          this.processGridItem(this.state.droppingDOMNode, true)}
        {this.placeholder()}
      </div>
    );
  }
}
