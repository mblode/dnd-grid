import clsx from "clsx";
import { deepEqual } from "fast-equals";
import type { ReactElement } from "react";
import * as React from "react";
import { resolveAnimationConfig } from "./animation-config";
import { calcGridColWidth, calcGridItemWHPx, calcXY } from "./calculate-utils";
import { createCallbackThrottle } from "./callback-throttle";
import {
  resolveCompactor as resolveDefaultCompactor,
  verticalCompactor,
} from "./compactors";
import type { GridItemProps } from "./components/grid-item";
import { normalizeSpacing } from "./spacing";
import type {
  CallbackThrottleOptions,
  Compactor,
  DefaultProps,
  DragOverEvent,
  DroppingPosition,
  GridDragEvent,
  GridItemDragEvent,
  GridItemResizeEvent,
  GridResizeEvent,
  ItemState,
  Layout,
  LayoutItem,
  LiveAnnouncementContext,
  LiveAnnouncements,
  LiveRegionSettings,
  PositionParams,
  Props,
  ResizeHandleAxis,
} from "./types";
import { useEdgeScroll } from "./use-edge-scroll";
import { resolveReducedMotion, useReducedMotion } from "./use-reduced-motion";
import {
  bottom,
  childrenEqual,
  cloneLayout,
  cloneLayoutItem,
  getAllCollisions,
  getLayoutItem,
  type LayoutSyncWarnings,
  moveElement,
  noop,
  sortLayoutItems,
  synchronizeLayoutWithChildren,
  withLayoutItem,
} from "./utils";
import { validateLayout } from "./validation";

declare const process: { env?: { NODE_ENV?: string } };

export type DndGridState<TData = unknown> = {
  activeDrag: LayoutItem<TData> | null | undefined;
  activeItemId: string | null;
  settlingItem: string | null;
  layout: Layout<TData>;
  mounted: boolean;
  oldDragItem: LayoutItem<TData> | null | undefined;
  oldLayout: Layout<TData> | null | undefined;
  oldResizeItem: LayoutItem<TData> | null | undefined;
  resizing: boolean;
  droppingDOMNode: ReactElement | null | undefined;
  droppingPosition?: DroppingPosition;
  // Mirrored props
  children: React.ReactNode;
  propsLayout?: Layout<TData>;
  compactor?: Compactor<TData>;
};

export type UseDndGridOptions<TData = unknown> = Omit<
  Props<TData>,
  keyof DefaultProps<TData>
> &
  Partial<DefaultProps<TData>>;

export type DndGridMeasurements = {
  containerRect: DOMRect | null;
  positionParams: PositionParams;
  columnWidth: number;
};

type UseDndGridItemOptions = {
  isDroppingItem?: boolean;
};

export type UseDndGridItemProps<TData = unknown> = {
  getItemProps: (
    child: React.ReactNode,
    options?: UseDndGridItemOptions,
  ) => GridItemProps<TData> | null;
  getDroppingItemProps: () => GridItemProps<TData> | null;
  getPlaceholderProps: () => GridItemProps<TData> | null;
};

type UseDndGridLiveRegion = {
  props: React.HTMLAttributes<HTMLDivElement>;
  message: {
    id: number;
    text: string;
  };
};

export type UseDndGridGridProps = Omit<
  React.HTMLAttributes<HTMLDivElement>,
  "ref"
> & {
  ref: (node: HTMLDivElement | null) => void;
};

export type UseDndGridApi<TData = unknown> = {
  measure: () => DndGridMeasurements;
  scroll: (options: ScrollToOptions) => void;
  move: (
    id: string,
    x: number,
    y: number,
    options?: { commit?: boolean },
  ) => Layout<TData> | null | undefined;
  resize: (
    id: string,
    w: number,
    h: number,
    options?: { handle?: ResizeHandleAxis; commit?: boolean },
  ) => Layout<TData> | null | undefined;
  commit: (layout?: Layout<TData>) => void;
  containerHeight: () => string | undefined;
  onDragStart: (event: GridItemDragEvent) => void;
  onDrag: (event: GridItemDragEvent) => void;
  onDragStop: (event: GridItemDragEvent) => void;
  onDragOver: React.DragEventHandler<HTMLDivElement>;
  onDragEnter: React.DragEventHandler<HTMLDivElement>;
  onDragLeave: React.DragEventHandler<HTMLDivElement>;
  onDrop: React.DragEventHandler<HTMLDivElement>;
  onResizeStart: (event: GridItemResizeEvent) => void;
  onResize: (event: GridItemResizeEvent) => void;
  onResizeStop: (event: GridItemResizeEvent) => void;
  onSettleComplete: (id: string) => void;
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
  state: DndGridState<TData>;
};

export type UseDndGridResult<TData = unknown> = {
  gridProps: UseDndGridGridProps;
  itemProps: UseDndGridItemProps<TData>;
  state: DndGridState<TData>;
  api: UseDndGridApi<TData>;
  liveRegion: UseDndGridLiveRegion | null;
  liveRegionElement: ReactElement | null;
};

const layoutClassName = "dnd-grid";
const DRAG_TOUCH_DELAY_DURATION = 250;
const visuallyHiddenStyle: React.CSSProperties = {
  position: "absolute",
  width: "1px",
  height: "1px",
  padding: 0,
  margin: "-1px",
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
  border: 0,
};
const defaultLiveRegion: Required<LiveRegionSettings> = {
  role: "status",
  ariaLive: "polite",
  ariaAtomic: true,
  ariaRelevant: "additions text",
};
const isDevelopment =
  typeof process !== "undefined" && process.env?.NODE_ENV !== "production";
let isFirefox = false;

const resolveCallbackThrottleMs = (
  throttle: number | CallbackThrottleOptions | undefined,
  type: "drag" | "resize",
) => {
  if (typeof throttle === "number") {
    return throttle > 0 ? throttle : 0;
  }
  const value = throttle?.[type];
  return typeof value === "number" && value > 0 ? value : 0;
};

const getChildKeys = (children: React.ReactNode): Set<string> => {
  const keys = new Set<string>();
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child) || child.key == null) return;
    keys.add(String(child.key));
  });
  return keys;
};

const getFocusableItemIds = <TData>(
  layout: Layout<TData>,
  compactor: Compactor<TData>,
  children: React.ReactNode,
): string[] => {
  const childKeys = getChildKeys(children);
  return sortLayoutItems(layout, compactor)
    .filter((item) => !item.static && childKeys.has(item.i))
    .map((item) => item.i);
};

// Try...catch will protect from navigator not existing (e.g. node) or a bad implementation of navigator
try {
  isFirefox = /firefox/i.test(navigator.userAgent);
} catch (_e) {
  /* Ignore */
}

const resolveNodeLabel = (node?: HTMLElement | null): string => {
  if (!node) return "";
  const ariaLabel = node.getAttribute("aria-label");
  if (ariaLabel) return ariaLabel;
  const ariaLabelledBy = node.getAttribute("aria-labelledby");
  if (ariaLabelledBy && typeof document !== "undefined") {
    const label = ariaLabelledBy
      .split(/\s+/)
      .map((id) => document.getElementById(id)?.textContent?.trim())
      .filter(Boolean)
      .join(" ")
      .trim();
    if (label) return label;
  }
  const dataLabel = node.getAttribute("data-dnd-grid-label");
  if (dataLabel) return dataLabel;
  const textContent = node.textContent?.trim();
  return textContent ?? "";
};

const defaultGetItemLabel = <TData>(
  item: LayoutItem<TData> | null | undefined,
  node?: HTMLElement | null,
): string => {
  const nodeLabel = resolveNodeLabel(node);
  if (nodeLabel) return nodeLabel;
  if (item?.i) return `item ${item.i}`;
  return "item";
};

const formatGridPosition = <TData>(
  item: LayoutItem<TData> | null | undefined,
) => {
  if (!item) return "";
  return `column ${item.x + 1}, row ${item.y + 1}`;
};

const formatGridSize = <TData>(item: LayoutItem<TData> | null | undefined) => {
  if (!item) return "";
  return `${item.w} by ${item.h}`;
};

const createDefaultLiveAnnouncements = <TData>(): LiveAnnouncements<TData> => ({
  onDragStart: ({ item, node, getItemLabel }) => {
    if (!item) return undefined;
    const label = getItemLabel(item, node);
    const position = formatGridPosition(item);
    return position
      ? `Picked up ${label}. ${position}.`
      : `Picked up ${label}.`;
  },
  onDrag: ({ item, node, getItemLabel }) => {
    if (!item) return undefined;
    const label = getItemLabel(item, node);
    const position = formatGridPosition(item);
    return position ? `Moved ${label} to ${position}.` : `Moved ${label}.`;
  },
  onDragStop: ({ item, node, getItemLabel }) => {
    if (!item) return undefined;
    const label = getItemLabel(item, node);
    const position = formatGridPosition(item);
    return position ? `Dropped ${label} at ${position}.` : `Dropped ${label}.`;
  },
  onResizeStart: ({ item, node, getItemLabel }) => {
    if (!item) return undefined;
    const label = getItemLabel(item, node);
    const size = formatGridSize(item);
    return size ? `Resizing ${label}. Size ${size}.` : `Resizing ${label}.`;
  },
  onResize: ({ item, node, getItemLabel }) => {
    if (!item) return undefined;
    const label = getItemLabel(item, node);
    const size = formatGridSize(item);
    return size ? `Resized ${label} to ${size}.` : `Resized ${label}.`;
  },
  onResizeStop: ({ item, node, getItemLabel }) => {
    if (!item) return undefined;
    const label = getItemLabel(item, node);
    const size = formatGridSize(item);
    return size
      ? `Finished resizing ${label}. Size ${size}.`
      : `Finished resizing ${label}.`;
  },
  onFocus: ({ item, node, getItemLabel }) => {
    if (!item) return undefined;
    const label = getItemLabel(item, node);
    const position = formatGridPosition(item);
    return position ? `Focused ${label}. ${position}.` : `Focused ${label}.`;
  },
});

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

export const defaultProps: DefaultProps = {
  autoSize: true,
  autoScroll: true,
  cols: 12,
  className: "",
  style: {},
  dragHandle: "",
  dragTouchDelayDuration: DRAG_TOUCH_DELAY_DURATION,
  dragCancel: "",
  containerPadding: null,
  rowHeight: 150,
  maxRows: Number.POSITIVE_INFINITY,
  // infinite vertical growth
  layout: [],
  margin: 10,
  isBounded: false,
  isDraggable: true,
  isResizable: true,
  transformScale: 1,
  validation: isDevelopment,
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
};

const resolveCompactor = <TData>(props: Props<TData>): Compactor<TData> =>
  resolveDefaultCompactor(props.compactor);

export const getDerivedStateFromProps = <TData>(
  nextProps: Props<TData>,
  prevState: DndGridState<TData>,
  layoutSyncWarnings?: LayoutSyncWarnings,
): Partial<DndGridState<TData>> | null => {
  let newLayoutBase: Layout<TData> | null | undefined;
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
      layoutSyncWarnings,
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

export const useDndGrid = <TData = unknown>(
  incomingProps: UseDndGridOptions<TData>,
): UseDndGridResult<TData> => {
  const mergedProps = { ...defaultProps, ...incomingProps } as Props<TData>;
  const validatedLayout = React.useMemo(
    () =>
      mergedProps.validation
        ? validateLayout(mergedProps.layout)
        : mergedProps.layout,
    [mergedProps.layout, mergedProps.validation],
  );
  const props = { ...mergedProps, layout: validatedLayout } as Props<TData>;
  const hasLayoutProp = Object.hasOwn(incomingProps, "layout");
  const dropEnabled =
    typeof incomingProps.onDrop === "function" ||
    typeof incomingProps.onDropDragOver === "function";
  const dropEnabledRef = React.useRef(dropEnabled);
  dropEnabledRef.current = dropEnabled;
  const missingLayoutItemWarningsRef = React.useRef(new Set<string>());
  const unusedLayoutItemWarningsRef = React.useRef(new Set<string>());
  const layoutSyncWarnings = isDevelopment
    ? {
        missingLayoutItems: missingLayoutItemWarningsRef.current,
        unusedLayoutItems: unusedLayoutItemWarningsRef.current,
      }
    : undefined;
  const compactor = resolveCompactor(props);
  const initialLayout = synchronizeLayoutWithChildren(
    props.layout,
    props.children,
    props.cols,
    compactor,
    layoutSyncWarnings,
  );
  const initialActiveItemId =
    getFocusableItemIds(initialLayout, compactor, props.children)[0] ?? null;
  const [state, setState] = React.useState<DndGridState<TData>>(() => ({
    activeDrag: null,
    activeItemId: initialActiveItemId,
    settlingItem: null,
    layout: initialLayout,
    mounted: false,
    oldDragItem: null,
    oldLayout: null,
    oldResizeItem: null,
    resizing: false,
    droppingDOMNode: null,
    children: props.children,
    propsLayout: props.layout,
    compactor,
  }));

  const stateRef = React.useRef(state);
  stateRef.current = state;
  const propsRef = React.useRef(props);
  propsRef.current = props;
  const dragCallbackThrottleRef = React.useRef(
    createCallbackThrottle<GridDragEvent<TData>>(),
  );
  const resizeCallbackThrottleRef = React.useRef(
    createCallbackThrottle<GridResizeEvent<TData>>(),
  );
  const resolvedAnimationConfig = React.useMemo(
    () => resolveAnimationConfig(props.animationConfig),
    [props.animationConfig],
  );
  const animationConfigRef = React.useRef(resolvedAnimationConfig);
  animationConfigRef.current = resolvedAnimationConfig;
  const prefersReducedMotion = useReducedMotion();
  const reducedMotion = resolveReducedMotion(
    props.reducedMotion,
    prefersReducedMotion,
  );
  const reducedMotionRef = React.useRef(reducedMotion);
  reducedMotionRef.current = reducedMotion;
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const edgeScroll = useEdgeScroll(props.autoScroll);
  const edgeScrollRef = React.useRef(edgeScroll);
  edgeScrollRef.current = edgeScroll;
  const dragEnterCounterRef = React.useRef(0);
  const prevLayoutRef = React.useRef<Layout<TData> | null | undefined>(
    undefined,
  );
  const lastLayoutChangeRef = React.useRef<Layout<TData> | null>(null);
  const itemRefs = React.useRef(new Map<string, HTMLElement | null>());
  const [liveMessage, setLiveMessage] = React.useState(() => ({
    id: 0,
    text: "",
  }));
  const lastDragAnnouncementRef = React.useRef<{
    id: string;
    x: number;
    y: number;
  } | null>(null);
  const lastResizeAnnouncementRef = React.useRef<{
    id: string;
    w: number;
    h: number;
  } | null>(null);
  const lastFocusAnnouncementRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    return () => {
      dragCallbackThrottleRef.current.cancel();
      resizeCallbackThrottleRef.current.cancel();
    };
  }, []);

  const announce = React.useCallback((message?: string | null) => {
    if (!message) return;
    setLiveMessage((prev) => ({
      id: prev.id + 1,
      text: message,
    }));
  }, []);

  const resolveLiveAnnouncements = React.useCallback(() => {
    const liveAnnouncements = propsRef.current.liveAnnouncements;
    if (liveAnnouncements === false || liveAnnouncements?.enabled === false) {
      return null;
    }
    const announcements: LiveAnnouncements<TData> = {
      ...createDefaultLiveAnnouncements<TData>(),
      ...(liveAnnouncements?.announcements ?? {}),
    };
    const getItemLabel: LiveAnnouncementContext<TData>["getItemLabel"] =
      liveAnnouncements?.getItemLabel ?? defaultGetItemLabel;
    return {
      announcements,
      getItemLabel,
    };
  }, []);

  const announceEvent = React.useCallback(
    (
      event: keyof LiveAnnouncements<TData>,
      data: {
        item: LayoutItem<TData> | null | undefined;
        previousItem?: LayoutItem<TData> | null | undefined;
        node?: HTMLElement | null;
        layout?: Layout<TData>;
      },
    ) => {
      const resolved = resolveLiveAnnouncements();
      if (!resolved) return;
      const context: LiveAnnouncementContext<TData> = {
        item: data.item,
        previousItem: data.previousItem,
        node: data.node,
        layout: data.layout ?? stateRef.current.layout,
        cols: propsRef.current.cols,
        maxRows: propsRef.current.maxRows,
        rowHeight: propsRef.current.rowHeight,
        getItemLabel: resolved.getItemLabel,
      };
      const message = resolved.announcements[event]?.(context);
      announce(message);
    },
    [announce, resolveLiveAnnouncements],
  );

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
    (
      newLayout: Layout<TData>,
      oldLayout?: Layout<TData> | null | undefined,
    ) => {
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

  const focusItemById = React.useCallback((id: string) => {
    const node = itemRefs.current.get(id);
    if (!node || !("focus" in node)) return;
    try {
      node.focus({ preventScroll: true });
    } catch (_e) {
      node.focus();
    }
  }, []);

  const setActiveItemId = React.useCallback((id: string | null) => {
    if (id === null) {
      lastFocusAnnouncementRef.current = null;
    }
    setState((prevState) => {
      if (prevState.activeItemId === id) return prevState;
      return {
        ...prevState,
        activeItemId: id,
      };
    });
  }, []);

  const registerItemRef = React.useCallback(
    (id: string, node: HTMLElement | null) => {
      if (node) {
        itemRefs.current.set(id, node);
        return;
      }
      itemRefs.current.delete(id);
    },
    [],
  );

  const onItemFocus = React.useCallback(
    (id: string) => {
      setActiveItemId(id);
      if (lastFocusAnnouncementRef.current === id) return;
      lastFocusAnnouncementRef.current = id;
      const item = getLayoutItem(stateRef.current.layout, id);
      const node = itemRefs.current.get(id);
      announceEvent("onFocus", {
        item,
        node,
      });
    },
    [announceEvent, setActiveItemId],
  );

  const onItemKeyDown = React.useCallback(
    (
      event: React.KeyboardEvent<HTMLElement>,
      id: string,
      keyboardState: { isPressed: boolean; isResizing: boolean },
    ) => {
      if (event.currentTarget !== event.target) return;
      if (keyboardState.isPressed || keyboardState.isResizing) return;
      if (event.defaultPrevented) return;
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
        return;
      }
      const isArrow =
        event.key === "ArrowLeft" ||
        event.key === "ArrowRight" ||
        event.key === "ArrowUp" ||
        event.key === "ArrowDown";
      if (!isArrow) return;
      const focusableIds = getFocusableItemIds(
        stateRef.current.layout,
        resolveCompactor(propsRef.current),
        propsRef.current.children,
      );
      if (focusableIds.length === 0) return;
      const currentIndex = focusableIds.indexOf(id);
      if (currentIndex === -1) return;
      const direction =
        event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : -1;
      const nextIndex =
        (currentIndex + direction + focusableIds.length) % focusableIds.length;
      const nextId = focusableIds[nextIndex];
      if (!nextId || nextId === id) return;
      event.preventDefault();
      setActiveItemId(nextId);
      focusItemById(nextId);
    },
    [focusItemById, setActiveItemId],
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
    (innerRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
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

  const measure = React.useCallback((): DndGridMeasurements => {
    const node = containerRef.current;
    const { margin, containerPadding } = resolveSpacing();
    const { cols, rowHeight, maxRows, width } = propsRef.current;
    const positionParams: PositionParams = {
      cols,
      margin,
      maxRows,
      rowHeight,
      containerWidth: width,
      containerPadding,
    };
    return {
      containerRect: node ? node.getBoundingClientRect() : null,
      positionParams,
      columnWidth: calcGridColWidth(positionParams),
    };
  }, [resolveSpacing]);

  const scroll = React.useCallback((options: ScrollToOptions) => {
    const node = containerRef.current;
    if (!node) return;
    if (typeof node.scrollTo === "function") {
      node.scrollTo(options);
      return;
    }
    if (typeof options.left === "number") {
      node.scrollLeft = options.left;
    }
    if (typeof options.top === "number") {
      node.scrollTop = options.top;
    }
  }, []);

  const commit = React.useCallback(
    (layout?: Layout<TData>) => {
      const nextLayout = layout ?? stateRef.current.layout;
      if (layout) {
        setState((prevState) => ({
          ...prevState,
          layout: nextLayout,
        }));
      }
      onLayoutMaybeChanged(nextLayout, stateRef.current.layout);
    },
    [onLayoutMaybeChanged],
  );

  const move = React.useCallback(
    (id: string, x: number, y: number, options?: { commit?: boolean }) => {
      const { layout } = stateRef.current;
      const { cols } = propsRef.current;
      const compactor = resolveCompactor(propsRef.current);
      const l = getLayoutItem(layout, id);
      if (!l) return layout;
      const nextLayout = moveElement(
        layout,
        l,
        x,
        y,
        true,
        compactor,
        cols as number,
      );
      const updatedLayout = compactor.allowOverlap
        ? nextLayout
        : compactor.compact(nextLayout, cols as number);
      setState((prevState) => ({
        ...prevState,
        layout: updatedLayout,
      }));
      if (options?.commit !== false) {
        onLayoutMaybeChanged(updatedLayout, layout);
      }
      return updatedLayout;
    },
    [onLayoutMaybeChanged],
  );

  const resize = React.useCallback(
    (
      id: string,
      w: number,
      h: number,
      options?: { handle?: ResizeHandleAxis; commit?: boolean },
    ) => {
      const { layout } = stateRef.current;
      const { cols } = propsRef.current;
      const compactor = resolveCompactor(propsRef.current);
      const { allowOverlap, preventCollision } = compactor;
      let shouldMoveItem = false;
      let finalLayout: Layout<TData> = layout;
      let x: number | undefined;
      let y: number | undefined;
      const handle = options?.handle ?? "se";
      const [newLayout, l] = withLayoutItem(layout, id, (l) => {
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

        if (preventCollision && !allowOverlap) {
          const collisions = getAllCollisions(layout, {
            ...l,
            w,
            h,
            x: x ?? l.x,
            y: y ?? l.y,
          }).filter((layoutItem) => layoutItem.i !== l.i);

          if (collisions.length > 0) {
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
      if (!l) return layout;
      finalLayout = newLayout;

      if (shouldMoveItem && x !== undefined && y !== undefined) {
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
      setState((prevState) => ({
        ...prevState,
        layout: updatedLayout,
      }));
      if (options?.commit !== false) {
        onLayoutMaybeChanged(updatedLayout, layout);
      }
      return updatedLayout;
    },
    [onLayoutMaybeChanged],
  );

  const onDragStart = React.useCallback(
    (dragEvent: GridItemDragEvent) => {
      const { id, event, node, newPosition } = dragEvent;
      const { layout } = stateRef.current;
      const l = getLayoutItem(layout, id);
      if (!l) return;
      edgeScrollRef.current.handleDragStart(event, node, newPosition);
      const placeholder = {
        w: l.w,
        h: l.h,
        x: l.x,
        y: l.y,
        placeholder: true,
        i: id,
      };
      setState((prevState) => ({
        ...prevState,
        oldDragItem: cloneLayoutItem(l),
        oldLayout: layout,
        activeDrag: placeholder,
      }));
      lastDragAnnouncementRef.current = { id: l.i, x: l.x, y: l.y };
      announceEvent("onDragStart", {
        item: l,
        node,
        layout,
      });
      const callbackEvent: GridDragEvent<TData> = {
        type: "dragStart",
        layout,
        previousItem: l,
        item: l,
        placeholder: null,
        event,
        node,
      };
      return propsRef.current.onDragStart(callbackEvent);
    },
    [announceEvent],
  );

  const onDrag = React.useCallback(
    (dragEvent: GridItemDragEvent) => {
      const { id, x, y, event, node, newPosition } = dragEvent;
      const { oldDragItem } = stateRef.current;
      const { layout } = stateRef.current;
      const { cols } = propsRef.current;
      const compactor = resolveCompactor(propsRef.current);
      const { allowOverlap } = compactor;
      const l = getLayoutItem(layout, id);
      if (!l) return;
      edgeScrollRef.current.handleDrag(event, node, newPosition);
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
      const updatedItem = getLayoutItem(updatedLayout, id) ?? l;
      const placeholder = {
        w: updatedItem.w,
        h: updatedItem.h,
        x: updatedItem.x,
        y: updatedItem.y,
        placeholder: true,
        i: updatedItem.i,
      };
      const lastDrag = lastDragAnnouncementRef.current;
      const previousItem =
        lastDrag && lastDrag.id === updatedItem.i
          ? { ...updatedItem, x: lastDrag.x, y: lastDrag.y }
          : undefined;
      if (
        !lastDrag ||
        lastDrag.id !== updatedItem.i ||
        lastDrag.x !== updatedItem.x ||
        lastDrag.y !== updatedItem.y
      ) {
        lastDragAnnouncementRef.current = {
          id: updatedItem.i,
          x: updatedItem.x,
          y: updatedItem.y,
        };
        announceEvent("onDrag", {
          item: updatedItem,
          previousItem,
          node,
          layout: updatedLayout,
        });
      }
      const callbackEvent: GridDragEvent<TData> = {
        type: "drag",
        layout: updatedLayout,
        previousItem: oldDragItem,
        item: updatedItem,
        placeholder,
        event,
        node,
      };
      dragCallbackThrottleRef.current.run(
        propsRef.current.onDrag,
        callbackEvent,
        resolveCallbackThrottleMs(propsRef.current.callbackThrottle, "drag"),
      );
      setState((prevState) => ({
        ...prevState,
        layout: updatedLayout,
        activeDrag: placeholder,
      }));
    },
    [announceEvent],
  );

  const onDragStop = React.useCallback(
    (dragEvent: GridItemDragEvent) => {
      const { id, x, y, event, node } = dragEvent;
      edgeScrollRef.current.handleDragStop();
      if (!stateRef.current.activeDrag) return;
      const { oldDragItem, oldLayout } = stateRef.current;
      const { layout } = stateRef.current;
      const { cols } = propsRef.current;
      const compactor = resolveCompactor(propsRef.current);
      const { allowOverlap } = compactor;
      const l = getLayoutItem(layout, id);
      if (!l) return;
      const nextLayout = moveElement(
        layout,
        l,
        x,
        y,
        true,
        compactor,
        cols as number,
      );
      const newLayout = allowOverlap
        ? nextLayout
        : compactor.compact(nextLayout, cols as number);
      const updatedItem = getLayoutItem(newLayout, id) ?? l;
      dragCallbackThrottleRef.current.flush(propsRef.current.onDrag);
      const lastDrag = lastDragAnnouncementRef.current;
      const previousItem =
        lastDrag && lastDrag.id === updatedItem.i
          ? { ...updatedItem, x: lastDrag.x, y: lastDrag.y }
          : undefined;
      lastDragAnnouncementRef.current = {
        id: updatedItem.i,
        x: updatedItem.x,
        y: updatedItem.y,
      };
      announceEvent("onDragStop", {
        item: updatedItem,
        previousItem,
        node,
        layout: newLayout,
      });
      const callbackEvent: GridDragEvent<TData> = {
        type: "dragStop",
        layout: newLayout,
        previousItem: oldDragItem,
        item: updatedItem,
        placeholder: null,
        event,
        node,
      };
      propsRef.current.onDragStop(callbackEvent);
      if (
        reducedMotionRef.current ||
        !animationConfigRef.current.springs.enabled
      ) {
        setState((prevState) => ({
          ...prevState,
          settlingItem: null,
          layout: newLayout,
          activeDrag: null,
          oldDragItem: null,
          oldLayout: null,
        }));
      } else {
        const placeholder = {
          w: updatedItem.w,
          h: updatedItem.h,
          x: updatedItem.x,
          y: updatedItem.y,
          placeholder: true,
          i: updatedItem.i,
        };
        setState((prevState) => ({
          ...prevState,
          settlingItem: id,
          layout: newLayout,
          activeDrag: placeholder,
          oldDragItem: null,
          oldLayout: null,
        }));
      }
      onLayoutMaybeChanged(newLayout, oldLayout);
    },
    [announceEvent, onLayoutMaybeChanged],
  );

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
    (resizeEvent: GridItemResizeEvent) => {
      const { id, event, node, handle } = resizeEvent;
      const { layout } = stateRef.current;
      const l = getLayoutItem(layout, id);
      if (!l) return;
      setState((prevState) => ({
        ...prevState,
        oldResizeItem: cloneLayoutItem(l),
        oldLayout: stateRef.current.layout,
        resizing: true,
      }));
      lastResizeAnnouncementRef.current = { id: l.i, w: l.w, h: l.h };
      announceEvent("onResizeStart", {
        item: l,
        node,
        layout,
      });
      const callbackEvent: GridResizeEvent<TData> = {
        type: "resizeStart",
        layout,
        previousItem: l,
        item: l,
        placeholder: null,
        event,
        node,
        handle,
      };
      propsRef.current.onResizeStart(callbackEvent);
    },
    [announceEvent],
  );

  const onResize = React.useCallback(
    (resizeEvent: GridItemResizeEvent) => {
      let { id, w, h, event, node, handle } = resizeEvent;
      const { oldResizeItem } = stateRef.current;
      const { layout } = stateRef.current;
      const { cols } = propsRef.current;
      const compactor = resolveCompactor(propsRef.current);
      const { allowOverlap, preventCollision } = compactor;
      let shouldMoveItem = false;
      let finalLayout: Layout<TData> = layout;
      let x: number | undefined;
      let y: number | undefined;
      const [newLayout, l] = withLayoutItem(layout, id, (l) => {
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

        if (preventCollision && !allowOverlap) {
          const collisions = getAllCollisions(layout, {
            ...l,
            w,
            h,
            x: x ?? l.x,
            y: y ?? l.y,
          }).filter((layoutItem) => layoutItem.i !== l.i);

          if (collisions.length > 0) {
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
      if (!l) return;
      finalLayout = newLayout;

      if (shouldMoveItem && x !== undefined && y !== undefined) {
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
      const updatedItem = getLayoutItem(updatedLayout, id) ?? l;
      const placeholder = {
        w: updatedItem.w,
        h: updatedItem.h,
        x: updatedItem.x,
        y: updatedItem.y,
        static: true,
        i: updatedItem.i,
      };
      const lastResize = lastResizeAnnouncementRef.current;
      const previousItem =
        lastResize && lastResize.id === updatedItem.i
          ? { ...updatedItem, w: lastResize.w, h: lastResize.h }
          : undefined;
      if (
        !lastResize ||
        lastResize.id !== updatedItem.i ||
        lastResize.w !== updatedItem.w ||
        lastResize.h !== updatedItem.h
      ) {
        lastResizeAnnouncementRef.current = {
          id: updatedItem.i,
          w: updatedItem.w,
          h: updatedItem.h,
        };
        announceEvent("onResize", {
          item: updatedItem,
          previousItem,
          node,
          layout: updatedLayout,
        });
      }
      const callbackEvent: GridResizeEvent<TData> = {
        type: "resize",
        layout: updatedLayout,
        previousItem: oldResizeItem,
        item: updatedItem,
        placeholder,
        event,
        node,
        handle,
      };
      resizeCallbackThrottleRef.current.run(
        propsRef.current.onResize,
        callbackEvent,
        resolveCallbackThrottleMs(propsRef.current.callbackThrottle, "resize"),
      );
      setState((prevState) => ({
        ...prevState,
        layout: updatedLayout,
        activeDrag: placeholder,
      }));
    },
    [announceEvent],
  );

  const onResizeStop = React.useCallback(
    (resizeEvent: GridItemResizeEvent) => {
      const { id, event, node, handle } = resizeEvent;
      const { layout, oldResizeItem, oldLayout } = stateRef.current;
      const { cols } = propsRef.current;
      const compactor = resolveCompactor(propsRef.current);
      const { allowOverlap } = compactor;
      const l = getLayoutItem(layout, id);
      if (!l) return;
      const newLayout = allowOverlap
        ? layout
        : compactor.compact(layout, cols as number);
      const updatedItem = getLayoutItem(newLayout, id) ?? l;
      resizeCallbackThrottleRef.current.flush(propsRef.current.onResize);
      const lastResize = lastResizeAnnouncementRef.current;
      const previousItem =
        lastResize && lastResize.id === updatedItem.i
          ? { ...updatedItem, w: lastResize.w, h: lastResize.h }
          : undefined;
      lastResizeAnnouncementRef.current = {
        id: updatedItem.i,
        w: updatedItem.w,
        h: updatedItem.h,
      };
      announceEvent("onResizeStop", {
        item: updatedItem,
        previousItem,
        node,
        layout: newLayout,
      });
      const callbackEvent: GridResizeEvent<TData> = {
        type: "resizeStop",
        layout: newLayout,
        previousItem: oldResizeItem,
        item: updatedItem,
        placeholder: null,
        event,
        node,
        handle,
      };
      propsRef.current.onResizeStop(callbackEvent);
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
    [announceEvent, onLayoutMaybeChanged],
  );

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

  type DroppingUpdate = {
    event: Event | React.DragEvent<HTMLElement>;
    dragOverEvent?: DragOverEvent;
    gridEl: HTMLElement | null;
    clientX: number;
    clientY: number;
  };

  const updateDroppingPlaceholder = React.useCallback(
    ({ event, dragOverEvent, gridEl, clientX, clientY }: DroppingUpdate) => {
      if (!gridEl) return;
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
      const onDragOverResult = onDropDragOver?.(dragOverEvent);

      if (onDragOverResult === false) {
        if (stateRef.current.droppingDOMNode) {
          removeDroppingPlaceholder();
        }

        return false;
      }

      const finalDroppingItem = { ...droppingItem, ...onDragOverResult };
      const { layout } = stateRef.current;
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
        clientX,
        clientY,
        itemPixelWidth,
        itemPixelHeight,
        transformScale,
      );
      const droppingPosition: DroppingPosition = {
        left: clampedGridX,
        top: clampedGridY,
        e: event as Event,
      };

      if (!stateRef.current.droppingDOMNode) {
        const calculatedPosition = calcXY(
          positionParams,
          clampedGridY,
          clampedGridX,
          finalDroppingItem.w as number,
          finalDroppingItem.h as number,
        );
        const nextDroppingItem: LayoutItem<TData> = {
          ...finalDroppingItem,
          x: calculatedPosition.x,
          y: calculatedPosition.y,
          static: false,
          isDraggable: true,
        } as LayoutItem<TData>;
        setState((prevState) => ({
          ...prevState,
          droppingDOMNode: React.createElement("div", {
            key: finalDroppingItem.i,
          }),
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

  const onDragOver = React.useCallback<React.DragEventHandler<HTMLDivElement>>(
    (e) => {
      if (!dropEnabledRef.current) return;
      e.preventDefault();
      e.stopPropagation();

      const target = e.nativeEvent.target;
      if (
        isFirefox &&
        (!(target instanceof HTMLElement) ||
          !target.classList.contains(layoutClassName))
      ) {
        return false;
      }

      return updateDroppingPlaceholder({
        event: e,
        dragOverEvent: e as unknown as DragOverEvent,
        gridEl: e.currentTarget,
        clientX: e.clientX,
        clientY: e.clientY,
      });
    },
    [updateDroppingPlaceholder],
  );

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
      if (!dropEnabledRef.current) return;
      if (!dndRect || !e) {
        const { droppingItem } = propsRef.current;
        const { layout } = stateRef.current;
        const item = layout.find((l) => l.i === droppingItem.i);
        dragEnterCounterRef.current = 0;
        removeDroppingPlaceholder();
        if (!e) return;
        propsRef.current.onDrop?.(layout, item, e);
        return;
      }

      const gridEl = containerRef.current;
      return updateDroppingPlaceholder({
        event: e,
        dragOverEvent: e as DragOverEvent,
        gridEl,
        clientX: dndRect.left,
        clientY: dndRect.top,
      });
    },
    [removeDroppingPlaceholder, updateDroppingPlaceholder],
  );

  const onDragLeave = React.useCallback<React.DragEventHandler<HTMLDivElement>>(
    (e) => {
      if (!dropEnabledRef.current) return;
      e.preventDefault();
      e.stopPropagation();
      dragEnterCounterRef.current -= 1;

      if (dragEnterCounterRef.current === 0) {
        removeDroppingPlaceholder();
      }
    },
    [removeDroppingPlaceholder],
  );

  const onDragEnter = React.useCallback<React.DragEventHandler<HTMLDivElement>>(
    (e) => {
      if (!dropEnabledRef.current) return;
      e.preventDefault();
      e.stopPropagation();
      dragEnterCounterRef.current += 1;
    },
    [],
  );

  const onDrop = React.useCallback<React.DragEventHandler<HTMLDivElement>>(
    (e) => {
      if (!dropEnabledRef.current) return;
      e.preventDefault();
      e.stopPropagation();
      const { droppingItem } = propsRef.current;
      const { layout } = stateRef.current;
      const item = layout.find((l) => l.i === droppingItem.i);
      dragEnterCounterRef.current = 0;
      removeDroppingPlaceholder();
      propsRef.current.onDrop?.(layout, item, e.nativeEvent);
    },
    [removeDroppingPlaceholder],
  );

  const layoutState = state.layout;
  const droppingPositionState = state.droppingPosition;
  const activeDrag = state.activeDrag;
  const resizing = state.resizing;
  const settlingItem = state.settlingItem;

  const getPlaceholderProps = React.useCallback(() => {
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
      animationConfig,
    } = propsRef.current;
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
    return {
      layout: layoutState,
      w: activeDrag.w,
      h: activeDrag.h,
      x: activeDrag.x,
      y: activeDrag.y,
      i: activeDrag.i,
      className: placeholderClassName,
      containerWidth: width,
      cols: cols as number,
      margin,
      containerPadding: containerPadding ?? margin,
      maxRows,
      rowHeight,
      isDraggable: false,
      isResizable: false,
      isBounded: false,
      transformScale,
      reducedMotion,
      animationConfig,
      style: resolvedPlaceholderStyle,
      tabIndex: -1,
      children: React.createElement("div"),
    } satisfies GridItemProps<TData>;
  }, [reducedMotion, activeDrag, layoutState, resizing, settlingItem]);

  const childKeys = React.useMemo(
    () => getChildKeys(props.children),
    [props.children],
  );
  const ariaRowCount = React.useMemo(() => {
    if (Number.isFinite(props.maxRows)) return props.maxRows as number;
    const ariaLayout = hasLayoutProp ? props.layout : state.layout;
    const layoutWithChildren = ariaLayout.filter((item) =>
      childKeys.has(item.i),
    );
    return layoutWithChildren.length === 0 ? 0 : bottom(layoutWithChildren);
  }, [childKeys, hasLayoutProp, props.layout, props.maxRows, state.layout]);
  const ariaItemIndices = React.useMemo(() => {
    const sortedItems = sortLayoutItems(state.layout, compactor);
    const indexableItems = sortedItems.filter(
      (item) => childKeys.has(item.i) && !item.static,
    );
    const setSize = indexableItems.length;
    const posInSetById = new Map<string, number>();
    indexableItems.forEach((item, index) => {
      posInSetById.set(item.i, index + 1);
    });

    const indices = new Map<
      string,
      {
        rowIndex: number;
        colIndex: number;
        posInSet?: number;
        setSize?: number;
      }
    >();
    sortedItems.forEach((item) => {
      if (!childKeys.has(item.i)) return;
      const posInSet = posInSetById.get(item.i);
      indices.set(item.i, {
        rowIndex: item.y + 1,
        colIndex: item.x + 1,
        posInSet,
        setSize: posInSet ? setSize : undefined,
      });
    });
    return indices;
  }, [state.layout, compactor, childKeys]);

  const focusableItemIds = React.useMemo(
    () => getFocusableItemIds(state.layout, compactor, props.children),
    [state.layout, compactor, props.children],
  );
  const focusableItemIdSet = React.useMemo(
    () => new Set(focusableItemIds),
    [focusableItemIds],
  );
  const activeItemId = state.activeItemId ?? focusableItemIds[0] ?? null;

  const getItemProps = React.useCallback(
    (child: React.ReactNode, options?: UseDndGridItemOptions) => {
      if (!React.isValidElement(child) || child.key == null) return null;
      const childKey = String(child.key);
      const l = getLayoutItem(layoutState, childKey);
      if (!l) {
        if (isDevelopment) {
          const warnedKeys = missingLayoutItemWarningsRef.current;
          if (!warnedKeys.has(childKey)) {
            warnedKeys.add(childKey);
            console.warn(
              `DndGrid: Missing layout item for child key "${childKey}". Add a layout entry with i: "${childKey}".`,
            );
          }
        }
        return null;
      }
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
        dragCancel,
        dragHandle,
        resizeHandles,
        resizeHandle,
        constraints,
        slotProps,
        animationConfig,
      } = propsRef.current;
      const draggable =
        typeof l.isDraggable === "boolean"
          ? l.isDraggable
          : !l.static && isDraggable;
      const resizable =
        typeof l.isResizable === "boolean"
          ? l.isResizable
          : !l.static && isResizable;
      const resizeHandlesOptions = l.resizeHandles || resizeHandles;
      const bounded = draggable && isBounded && l.isBounded !== false;
      const ariaIndices = ariaItemIndices.get(l.i);
      const isFocusable = focusableItemIdSet.has(l.i);
      const tabIndex = isFocusable ? (l.i === activeItemId ? 0 : -1) : -1;
      return {
        containerWidth: width,
        cols: cols as number,
        margin,
        containerPadding: containerPadding ?? margin,
        maxRows,
        rowHeight,
        layout: layoutState,
        constraints,
        cancel: dragCancel,
        handle: dragHandle,
        onDragStop,
        onDragStart,
        onDrag,
        onResizeStart,
        onResize,
        onResizeStop,
        onSettleComplete,
        isDraggable: draggable,
        dragTouchDelayDuration,
        isResizable: resizable,
        isBounded: bounded,
        transformScale,
        reducedMotion,
        animationConfig,
        w: l.w,
        h: l.h,
        x: l.x,
        y: l.y,
        i: l.i,
        minH: l.minH,
        minW: l.minW,
        maxH: l.maxH,
        maxW: l.maxW,
        static: l.static,
        droppingPosition: options?.isDroppingItem
          ? droppingPositionState
          : undefined,
        resizeHandles: resizeHandlesOptions,
        resizeHandle,
        slotProps,
        tabIndex,
        ariaRowIndex: ariaIndices?.rowIndex,
        ariaColIndex: ariaIndices?.colIndex,
        ariaPosInSet: ariaIndices?.posInSet,
        ariaSetSize: ariaIndices?.setSize,
        onItemFocus: isFocusable ? onItemFocus : undefined,
        onItemKeyDown: isFocusable ? onItemKeyDown : undefined,
        registerItemRef: isFocusable ? registerItemRef : undefined,
        children: child as ReactElement,
      } satisfies GridItemProps<TData>;
    },
    [
      activeItemId,
      ariaItemIndices,
      focusableItemIdSet,
      onDrag,
      onDragStart,
      onDragStop,
      onItemFocus,
      onItemKeyDown,
      onResize,
      onResizeStart,
      onResizeStop,
      onSettleComplete,
      reducedMotion,
      registerItemRef,
      layoutState,
      droppingPositionState,
    ],
  );

  const getDroppingItemProps = React.useCallback(() => {
    if (!state.droppingDOMNode) return null;
    return getItemProps(state.droppingDOMNode, { isDroppingItem: true });
  }, [getItemProps, state.droppingDOMNode]);

  const {
    className,
    style,
    cols,
    "aria-label": ariaLabel,
    "aria-labelledby": ariaLabelledBy,
    "aria-describedby": ariaDescribedBy,
  } = props;
  const containerHeightValue = containerHeight();
  const mergedClassName = React.useMemo(
    () => clsx(layoutClassName, className),
    [className],
  );
  const mergedStyle = React.useMemo<React.CSSProperties>(
    () => ({
      height: containerHeightValue,
      ...style,
    }),
    [containerHeightValue, style],
  );

  const gridProps = React.useMemo<UseDndGridGridProps>(
    () => ({
      ref: setContainerRef,
      role: "grid",
      className: mergedClassName,
      style: mergedStyle,
      "aria-label": ariaLabel,
      "aria-labelledby": ariaLabelledBy,
      "aria-describedby": ariaDescribedBy,
      "aria-rowcount": ariaRowCount,
      "aria-colcount": cols,
      "data-dnd-grid": "",
      onDrop: dropEnabled ? onDrop : undefined,
      onDragLeave: dropEnabled ? onDragLeave : undefined,
      onDragEnter: dropEnabled ? onDragEnter : undefined,
      onDragOver: dropEnabled ? onDragOver : undefined,
    }),
    [
      ariaDescribedBy,
      ariaLabel,
      ariaLabelledBy,
      ariaRowCount,
      cols,
      dropEnabled,
      mergedClassName,
      mergedStyle,
      onDragEnter,
      onDragLeave,
      onDragOver,
      onDrop,
      setContainerRef,
    ],
  );

  const liveAnnouncements = props.liveAnnouncements;
  const liveAnnouncementsEnabled =
    liveAnnouncements !== false && liveAnnouncements?.enabled !== false;
  const liveRegion = liveAnnouncementsEnabled
    ? {
        props: {
          "data-dnd-grid-live-region": "",
          role: (liveAnnouncements?.liveRegion?.role ??
            defaultLiveRegion.role) as React.AriaRole,
          "aria-live":
            liveAnnouncements?.liveRegion?.ariaLive ??
            defaultLiveRegion.ariaLive,
          "aria-atomic":
            liveAnnouncements?.liveRegion?.ariaAtomic ??
            defaultLiveRegion.ariaAtomic,
          "aria-relevant":
            liveAnnouncements?.liveRegion?.ariaRelevant ??
            defaultLiveRegion.ariaRelevant,
          style: visuallyHiddenStyle,
        },
        message: liveMessage,
      }
    : null;
  const liveRegionElement = liveRegion
    ? React.createElement(
        "div",
        liveRegion.props,
        React.createElement(
          "span",
          { key: liveRegion.message.id },
          liveRegion.message.text,
        ),
      )
    : null;

  React.useLayoutEffect(() => {
    const derived = getDerivedStateFromProps(
      {
        ...propsRef.current,
        layout: props.layout,
        compactor: props.compactor,
        children: props.children,
      },
      stateRef.current,
      layoutSyncWarnings,
    );
    if (derived) {
      setState((prevState) => ({
        ...prevState,
        ...derived,
      }));
    }
  }, [props.layout, props.compactor, props.children, layoutSyncWarnings]);

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
    if (focusableItemIds.length === 0) {
      if (state.activeItemId !== null) {
        setActiveItemId(null);
      }
      return;
    }
    if (!state.activeItemId || !focusableItemIdSet.has(state.activeItemId)) {
      setActiveItemId(focusableItemIds[0]);
    }
  }, [
    focusableItemIds,
    focusableItemIdSet,
    setActiveItemId,
    state.activeItemId,
  ]);

  const apiRef = React.useRef<UseDndGridApi<TData> | null>(null);
  if (!apiRef.current) {
    apiRef.current = {
      measure,
      scroll,
      move,
      resize,
      commit,
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
    };
  }
  const api = apiRef.current as UseDndGridApi<TData>;
  api.state = state;

  const itemProps = React.useMemo<UseDndGridItemProps<TData>>(
    () => ({
      getItemProps,
      getDroppingItemProps,
      getPlaceholderProps,
    }),
    [getDroppingItemProps, getItemProps, getPlaceholderProps],
  );

  return {
    gridProps,
    itemProps,
    state,
    api,
    liveRegion,
    liveRegionElement,
  };
};
