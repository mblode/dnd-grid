import { useCallback, useEffect, useRef, useState } from "react";
import type { AutoScrollOptions } from "./types";
import { AutoScrollActivator, TraversalOrder } from "./types";

interface Coordinates {
  x: number;
  y: number;
}

interface FrameHandle {
  id: number;
  type: "raf" | "timeout";
}

interface ClientRect {
  top: number;
  right: number;
  bottom: number;
  left: number;
  width: number;
  height: number;
}

const Direction = {
  Forward: 1,
  Backward: -1,
} as const;

type Direction = (typeof Direction)[keyof typeof Direction];

interface ScrollIntent {
  x: Record<Direction, boolean>;
  y: Record<Direction, boolean>;
}

const defaultThreshold = {
  x: 0.2,
  y: 0.2,
};

const defaultScrollIntent: ScrollIntent = {
  x: {
    [Direction.Backward]: false,
    [Direction.Forward]: false,
  },
  y: {
    [Direction.Backward]: false,
    [Direction.Forward]: false,
  },
};

const canUseDOM =
  typeof window !== "undefined" && typeof document !== "undefined";

const OVERFLOW_REGEX = /(auto|scroll|overlay)/;

const scheduleFrame = (callback: FrameRequestCallback): FrameHandle | null => {
  if (!canUseDOM) {
    return null;
  }
  if (typeof window.requestAnimationFrame === "function") {
    return { id: window.requestAnimationFrame(callback), type: "raf" };
  }
  return {
    id: window.setTimeout(
      () =>
        callback(typeof performance !== "undefined" ? performance.now() : 0),
      16
    ),
    type: "timeout",
  };
};

const cancelFrame = (handle: FrameHandle | null) => {
  if (!handle) {
    return;
  }
  if (
    handle.type === "raf" &&
    typeof window.cancelAnimationFrame === "function"
  ) {
    window.cancelAnimationFrame(handle.id);
    return;
  }
  clearTimeout(handle.id);
};

const getWindow = (node?: Element | null): Window => {
  if (node?.ownerDocument?.defaultView) {
    return node.ownerDocument.defaultView;
  }
  return window;
};

const isDocument = (node: Node | null | undefined): node is Document =>
  Boolean(node && node.nodeType === Node.DOCUMENT_NODE);

const isHTMLElement = (node: Node | null | undefined): node is HTMLElement =>
  Boolean(node && node.nodeType === Node.ELEMENT_NODE && "style" in node);

const isSVGElement = (node: Node | null | undefined): node is SVGElement =>
  Boolean(
    node &&
      node.nodeType === Node.ELEMENT_NODE &&
      (node as Element).namespaceURI === "http://www.w3.org/2000/svg"
  );

const isScrollable = (
  element: Element,
  computedStyle = getWindow(element).getComputedStyle(element)
): boolean => {
  const properties = ["overflow", "overflowX", "overflowY"];
  return properties.some((property) => {
    const value = computedStyle[property as keyof CSSStyleDeclaration];
    return typeof value === "string" ? OVERFLOW_REGEX.test(value) : false;
  });
};

const isFixed = (
  node: Element,
  computedStyle = getWindow(node).getComputedStyle(node)
): boolean => computedStyle.position === "fixed";

const getScrollableAncestors = (
  element: Element | null,
  limit?: number
): Element[] => {
  const scrollParents: Element[] = [];

  if (!(canUseDOM && element)) {
    return scrollParents;
  }

  const findScrollableAncestors = (node: Node | null): Element[] => {
    if (limit != null && scrollParents.length >= limit) {
      return scrollParents;
    }

    if (!node) {
      return scrollParents;
    }

    if (
      isDocument(node) &&
      node.scrollingElement &&
      !scrollParents.includes(node.scrollingElement)
    ) {
      scrollParents.push(node.scrollingElement);
      return scrollParents;
    }

    if (!isHTMLElement(node) || isSVGElement(node)) {
      return scrollParents;
    }

    if (scrollParents.includes(node)) {
      return scrollParents;
    }

    const computedStyle = getWindow(element).getComputedStyle(node);

    if (node !== element && isScrollable(node, computedStyle)) {
      scrollParents.push(node);
    }

    if (isFixed(node, computedStyle)) {
      return scrollParents;
    }

    return findScrollableAncestors(node.parentNode);
  };

  return findScrollableAncestors(element);
};

const getFirstScrollableAncestor = (
  element: Element | null
): Element | null => {
  const [firstAncestor] = getScrollableAncestors(element, 1);
  return firstAncestor ?? null;
};

const isDocumentScrollingElement = (element: Element): boolean =>
  canUseDOM && element === document.scrollingElement;

const getScrollEventTarget = (
  element: Element
): HTMLElement | Window | null => {
  if (!canUseDOM) {
    return null;
  }
  if (isDocumentScrollingElement(element)) {
    return getWindow(element);
  }
  return element as HTMLElement;
};

const getScrollPosition = (scrollContainer: Element) => {
  const minScroll = { x: 0, y: 0 };
  const scrollElement = scrollContainer as HTMLElement;
  const dimensions = isDocumentScrollingElement(scrollElement)
    ? { height: window.innerHeight, width: window.innerWidth }
    : { height: scrollElement.clientHeight, width: scrollElement.clientWidth };
  const maxScroll = {
    x: scrollElement.scrollWidth - dimensions.width,
    y: scrollElement.scrollHeight - dimensions.height,
  };
  return {
    isTop: scrollElement.scrollTop <= minScroll.y,
    isLeft: scrollElement.scrollLeft <= minScroll.x,
    isBottom: scrollElement.scrollTop >= maxScroll.y,
    isRight: scrollElement.scrollLeft >= maxScroll.x,
    maxScroll,
    minScroll,
  };
};

const getRectDelta = (
  rect: ClientRect | null,
  initialRect: ClientRect | null
): Coordinates => {
  if (!(rect && initialRect)) {
    return { x: 0, y: 0 };
  }
  return {
    x: rect.left - initialRect.left,
    y: rect.top - initialRect.top,
  };
};

const getScrollElementRect = (element: Element): ClientRect => {
  if (element === document.scrollingElement) {
    const { innerWidth, innerHeight } = window;
    return {
      top: 0,
      left: 0,
      right: innerWidth,
      bottom: innerHeight,
      width: innerWidth,
      height: innerHeight,
    };
  }

  const { top, left, right, bottom } = element.getBoundingClientRect();
  return {
    top,
    left,
    right,
    bottom,
    width: element.clientWidth,
    height: element.clientHeight,
  };
};

const getScrollDirectionAndSpeed = (
  scrollContainer: Element,
  scrollContainerRect: ClientRect,
  { top, left, right, bottom }: ClientRect,
  acceleration = 10,
  thresholdPercentage = defaultThreshold
) => {
  const { isTop, isBottom, isLeft, isRight } =
    getScrollPosition(scrollContainer);
  const direction = { x: 0, y: 0 };
  const speed = { x: 0, y: 0 };
  const threshold = {
    height: scrollContainerRect.height * thresholdPercentage.y,
    width: scrollContainerRect.width * thresholdPercentage.x,
  };

  if (!isTop && top <= scrollContainerRect.top + threshold.height) {
    direction.y = Direction.Backward;
    speed.y =
      acceleration *
      Math.abs(
        (scrollContainerRect.top + threshold.height - top) / threshold.height
      );
  } else if (
    !isBottom &&
    bottom >= scrollContainerRect.bottom - threshold.height
  ) {
    direction.y = Direction.Forward;
    speed.y =
      acceleration *
      Math.abs(
        (scrollContainerRect.bottom - threshold.height - bottom) /
          threshold.height
      );
  }

  if (!isRight && right >= scrollContainerRect.right - threshold.width) {
    direction.x = Direction.Forward;
    speed.x =
      acceleration *
      Math.abs(
        (scrollContainerRect.right - threshold.width - right) / threshold.width
      );
  } else if (!isLeft && left <= scrollContainerRect.left + threshold.width) {
    direction.x = Direction.Backward;
    speed.x =
      acceleration *
      Math.abs(
        (scrollContainerRect.left + threshold.width - left) / threshold.width
      );
  }

  return { direction, speed };
};

const getEventCoordinates = (event?: Event | null): Coordinates | null => {
  if (!event) {
    return null;
  }
  const eventAny = event as
    | MouseEvent
    | TouchEvent
    | PointerEvent
    | (Event & { touches?: TouchList; changedTouches?: TouchList });

  if ("touches" in eventAny && eventAny.touches?.length) {
    const touch = eventAny.touches[0];
    return { x: touch.clientX, y: touch.clientY };
  }

  if ("changedTouches" in eventAny && eventAny.changedTouches?.length) {
    const touch = eventAny.changedTouches[0];
    return { x: touch.clientX, y: touch.clientY };
  }

  if ("clientX" in eventAny && typeof eventAny.clientX === "number") {
    return { x: eventAny.clientX, y: eventAny.clientY };
  }

  return null;
};

const normalizeAutoScrollOptions = (
  autoScroll?: boolean | AutoScrollOptions
): AutoScrollOptions => {
  if (typeof autoScroll === "object" && autoScroll !== null) {
    return {
      ...autoScroll,
      enabled: autoScroll.enabled !== false,
    };
  }

  if (autoScroll === false) {
    return { enabled: false };
  }

  return { enabled: true };
};

const resolveLayoutShiftCompensation = (
  config: AutoScrollOptions["layoutShiftCompensation"]
) => {
  if (typeof config === "boolean") {
    return { x: config, y: config };
  }
  if (config) {
    return {
      x: config.x !== false,
      y: config.y !== false,
    };
  }
  return { x: true, y: true };
};

export interface EdgeScrollHandlers {
  handleDragStart: (
    event?: Event | null,
    node?: HTMLElement | null,
    newPosition?: { left: number; top: number }
  ) => void;
  handleDrag: (
    event?: Event | null,
    node?: HTMLElement | null,
    newPosition?: { left: number; top: number }
  ) => void;
  handleDragEnd: () => void;
  isScrolling: boolean;
}

export const useEdgeScroll = (
  autoScroll: boolean | AutoScrollOptions = true
): EdgeScrollHandlers => {
  const [isScrolling, setIsScrolling] = useState(false);
  const optionsRef = useRef<AutoScrollOptions>({});
  const scrollContainerRef = useRef<Element | null>(null);
  const intervalRef = useRef<number | null>(null);
  const layoutShiftRectRef = useRef<ClientRect | null>(null);
  const layoutShiftFrameRef = useRef<FrameHandle | null>(null);
  const scrollUpdateFrameRef = useRef<FrameHandle | null>(null);
  const scrollListenerTargetsRef = useRef<Set<HTMLElement | Window>>(new Set());
  const scrollSpeedRef = useRef({ x: 0, y: 0 });
  const scrollDirectionRef = useRef({ x: 0, y: 0 });
  const scrollableAncestorsRef = useRef<Element[]>([]);
  const pointerCoordinatesRef = useRef<Coordinates | null>(null);
  const draggingRectRef = useRef<ClientRect | null>(null);
  const previousDeltaRef = useRef<Coordinates | null>(null);
  const scrollIntentRef = useRef<ScrollIntent>(defaultScrollIntent);
  const dragNodeRef = useRef<HTMLElement | null>(null);

  const normalizedOptions = normalizeAutoScrollOptions(autoScroll);
  optionsRef.current = normalizedOptions;

  const cancelLayoutShiftCompensation = useCallback(() => {
    cancelFrame(layoutShiftFrameRef.current);
    layoutShiftFrameRef.current = null;
  }, []);

  const cancelScrollUpdateFrame = useCallback(() => {
    cancelFrame(scrollUpdateFrameRef.current);
    scrollUpdateFrameRef.current = null;
  }, []);

  const clearAutoScrollInterval = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsScrolling(false);
  }, []);

  const setAutoScrollInterval = useCallback(
    (callback: () => void, interval: number) => {
      clearAutoScrollInterval();
      if (!canUseDOM) {
        return;
      }
      intervalRef.current = window.setInterval(callback, interval);
      setIsScrolling(true);
    },
    [clearAutoScrollInterval]
  );

  const resetScrollIntent = useCallback(() => {
    scrollIntentRef.current = defaultScrollIntent;
    previousDeltaRef.current = null;
  }, []);

  const updateScrollIntent = useCallback(
    (delta: Coordinates | null, enabled: boolean) => {
      if (!(enabled && delta)) {
        resetScrollIntent();
        return;
      }

      const previousDelta = previousDeltaRef.current;
      if (!previousDelta) {
        previousDeltaRef.current = delta;
        scrollIntentRef.current = defaultScrollIntent;
        return;
      }

      const direction = {
        x: Math.sign(delta.x - previousDelta.x),
        y: Math.sign(delta.y - previousDelta.y),
      };
      const previousIntent = scrollIntentRef.current;

      scrollIntentRef.current = {
        x: {
          [Direction.Backward]:
            previousIntent.x[Direction.Backward] ||
            direction.x === Direction.Backward,
          [Direction.Forward]:
            previousIntent.x[Direction.Forward] ||
            direction.x === Direction.Forward,
        },
        y: {
          [Direction.Backward]:
            previousIntent.y[Direction.Backward] ||
            direction.y === Direction.Backward,
          [Direction.Forward]:
            previousIntent.y[Direction.Forward] ||
            direction.y === Direction.Forward,
        },
      };
      previousDeltaRef.current = delta;
    },
    [resetScrollIntent]
  );

  const autoScrollTick = useCallback(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) {
      return;
    }
    const scrollLeft = scrollSpeedRef.current.x * scrollDirectionRef.current.x;
    const scrollTop = scrollSpeedRef.current.y * scrollDirectionRef.current.y;
    if (scrollLeft === 0 && scrollTop === 0) {
      return;
    }
    (scrollContainer as HTMLElement).scrollBy(scrollLeft, scrollTop);
  }, []);

  const resolveScrollRect = useCallback(
    (activator?: AutoScrollActivator): ClientRect | null => {
      if (
        activator === AutoScrollActivator.DraggableRect &&
        draggingRectRef.current
      ) {
        return draggingRectRef.current;
      }

      if (pointerCoordinatesRef.current) {
        const { x, y } = pointerCoordinatesRef.current;
        return { top: y, bottom: y, left: x, right: x, width: 0, height: 0 };
      }

      return draggingRectRef.current;
    },
    []
  );

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Auto-scroll logic requires complex scroll boundary and state calculations
  const updateAutoScroll = useCallback(() => {
    const options = optionsRef.current;
    const enabled = options.enabled !== false;

    if (!(canUseDOM && enabled)) {
      clearAutoScrollInterval();
      return;
    }

    const rect = resolveScrollRect(options.activator);
    if (!rect) {
      clearAutoScrollInterval();
      return;
    }

    const scrollableAncestors = scrollableAncestorsRef.current;
    if (!scrollableAncestors.length) {
      clearAutoScrollInterval();
      return;
    }

    const sortedScrollableAncestors =
      options.order === TraversalOrder.TreeOrder
        ? [...scrollableAncestors].reverse()
        : scrollableAncestors;

    for (const scrollContainer of sortedScrollableAncestors) {
      if (options.canScroll?.(scrollContainer) === false) {
        continue;
      }

      const scrollContainerRect = getScrollElementRect(scrollContainer);
      const { direction, speed } = getScrollDirectionAndSpeed(
        scrollContainer,
        scrollContainerRect,
        rect,
        options.acceleration,
        options.threshold
      );

      const scrollIntent = scrollIntentRef.current;
      for (const axis of ["x", "y"] as const) {
        const axisDirection = direction[axis];
        if (
          axisDirection === Direction.Backward ||
          axisDirection === Direction.Forward
        ) {
          if (!scrollIntent[axis][axisDirection]) {
            speed[axis] = 0;
            direction[axis] = 0;
          }
        } else {
          speed[axis] = 0;
        }
      }

      if (speed.x > 0 || speed.y > 0) {
        scrollContainerRef.current = scrollContainer;
        scrollSpeedRef.current = speed;
        scrollDirectionRef.current = direction;
        setAutoScrollInterval(autoScrollTick, options.interval ?? 5);
        return;
      }
    }

    scrollSpeedRef.current = { x: 0, y: 0 };
    scrollDirectionRef.current = { x: 0, y: 0 };
    clearAutoScrollInterval();
  }, [
    autoScrollTick,
    clearAutoScrollInterval,
    resolveScrollRect,
    setAutoScrollInterval,
  ]);

  const updateDraggingRect = useCallback(() => {
    if (!dragNodeRef.current || dragNodeRef.current.isConnected === false) {
      return;
    }
    draggingRectRef.current = dragNodeRef.current.getBoundingClientRect();
  }, []);

  const scheduleScrollUpdate = useCallback(() => {
    if (!canUseDOM || scrollUpdateFrameRef.current) {
      return;
    }
    scrollUpdateFrameRef.current = scheduleFrame(() => {
      scrollUpdateFrameRef.current = null;
      if (optionsRef.current.activator === AutoScrollActivator.DraggableRect) {
        updateDraggingRect();
      }
      updateAutoScroll();
    });
  }, [updateAutoScroll, updateDraggingRect]);

  const handleScroll = useCallback(() => {
    scheduleScrollUpdate();
  }, [scheduleScrollUpdate]);

  const updateScrollListeners = useCallback(
    (scrollableAncestors: Element[]) => {
      if (!canUseDOM) {
        return;
      }
      const nextTargets = new Set<HTMLElement | Window>();

      for (const ancestor of scrollableAncestors) {
        const target = getScrollEventTarget(ancestor);
        if (target) {
          nextTargets.add(target);
        }
      }

      for (const target of scrollListenerTargetsRef.current) {
        if (!nextTargets.has(target)) {
          target.removeEventListener("scroll", handleScroll);
        }
      }

      for (const target of nextTargets) {
        if (!scrollListenerTargetsRef.current.has(target)) {
          target.addEventListener("scroll", handleScroll, { passive: true });
        }
      }

      scrollListenerTargetsRef.current = nextTargets;
    },
    [handleScroll]
  );

  const clearScrollListeners = useCallback(() => {
    for (const target of scrollListenerTargetsRef.current) {
      target.removeEventListener("scroll", handleScroll);
    }
    scrollListenerTargetsRef.current.clear();
  }, [handleScroll]);

  const scheduleLayoutShiftCompensation = useCallback(
    (node: HTMLElement) => {
      const { x, y } = resolveLayoutShiftCompensation(
        optionsRef.current.layoutShiftCompensation
      );
      if (!(x || y)) {
        return;
      }

      cancelLayoutShiftCompensation();
      layoutShiftRectRef.current = node.getBoundingClientRect();
      layoutShiftFrameRef.current = scheduleFrame(() => {
        layoutShiftFrameRef.current = null;
        if (!dragNodeRef.current || dragNodeRef.current.isConnected === false) {
          return;
        }

        const rect = dragNodeRef.current.getBoundingClientRect();
        const rectDelta = getRectDelta(rect, layoutShiftRectRef.current);

        if (!x) {
          rectDelta.x = 0;
        }
        if (!y) {
          rectDelta.y = 0;
        }

        if (Math.abs(rectDelta.x) > 0 || Math.abs(rectDelta.y) > 0) {
          const scrollContainer =
            scrollableAncestorsRef.current[0] ??
            getFirstScrollableAncestor(dragNodeRef.current);

          if (scrollContainer) {
            (scrollContainer as HTMLElement).scrollBy({
              left: rectDelta.x,
              top: rectDelta.y,
            });
          }
        }
      });
    },
    [cancelLayoutShiftCompensation]
  );

  const resolveDragNode = useCallback(
    (node?: HTMLElement | null, event?: Event | null) => {
      if (node) {
        return node;
      }
      const eventTarget = event?.target;
      if (eventTarget instanceof HTMLElement) {
        return eventTarget;
      }
      return dragNodeRef.current;
    },
    []
  );

  const resolveDelta = useCallback(
    (
      newPosition?: { left: number; top: number },
      pointerCoordinates?: Coordinates | null
    ): Coordinates | null => {
      if (pointerCoordinates) {
        return pointerCoordinates;
      }
      if (newPosition) {
        return { x: newPosition.left, y: newPosition.top };
      }
      return null;
    },
    []
  );

  const handleDragStart = useCallback(
    (
      event?: Event | null,
      node?: HTMLElement | null,
      newPosition?: { left: number; top: number }
    ) => {
      const enabled = optionsRef.current.enabled !== false;
      if (!(canUseDOM && enabled)) {
        return;
      }

      const resolvedNode = resolveDragNode(node, event);
      if (resolvedNode) {
        dragNodeRef.current = resolvedNode;
        const scrollableAncestors = getScrollableAncestors(resolvedNode);
        scrollableAncestorsRef.current = scrollableAncestors;
        updateScrollListeners(scrollableAncestors);
        draggingRectRef.current = resolvedNode.getBoundingClientRect();
        scheduleLayoutShiftCompensation(resolvedNode);
      }

      pointerCoordinatesRef.current = getEventCoordinates(event);
      const delta = resolveDelta(newPosition, pointerCoordinatesRef.current);
      updateScrollIntent(delta, enabled);
      updateAutoScroll();
    },
    [
      resolveDragNode,
      resolveDelta,
      updateAutoScroll,
      updateScrollIntent,
      updateScrollListeners,
      scheduleLayoutShiftCompensation,
    ]
  );

  const handleDrag = useCallback(
    (
      event?: Event | null,
      node?: HTMLElement | null,
      newPosition?: { left: number; top: number }
    ) => {
      const enabled = optionsRef.current.enabled !== false;
      if (!(canUseDOM && enabled)) {
        return;
      }

      const resolvedNode = resolveDragNode(node, event);
      if (resolvedNode && dragNodeRef.current !== resolvedNode) {
        dragNodeRef.current = resolvedNode;
        const scrollableAncestors = getScrollableAncestors(resolvedNode);
        scrollableAncestorsRef.current = scrollableAncestors;
        updateScrollListeners(scrollableAncestors);
      }

      if (dragNodeRef.current) {
        draggingRectRef.current = dragNodeRef.current.getBoundingClientRect();
      }

      pointerCoordinatesRef.current = getEventCoordinates(event);
      const delta = resolveDelta(newPosition, pointerCoordinatesRef.current);
      updateScrollIntent(delta, enabled);
      updateAutoScroll();
    },
    [
      resolveDragNode,
      resolveDelta,
      updateAutoScroll,
      updateScrollIntent,
      updateScrollListeners,
    ]
  );

  const handleDragEnd = useCallback(() => {
    clearAutoScrollInterval();
    clearScrollListeners();
    cancelLayoutShiftCompensation();
    cancelScrollUpdateFrame();
    resetScrollIntent();
    scrollableAncestorsRef.current = [];
    dragNodeRef.current = null;
    pointerCoordinatesRef.current = null;
    draggingRectRef.current = null;
    scrollContainerRef.current = null;
    scrollSpeedRef.current = { x: 0, y: 0 };
    scrollDirectionRef.current = { x: 0, y: 0 };
  }, [
    cancelLayoutShiftCompensation,
    cancelScrollUpdateFrame,
    clearAutoScrollInterval,
    clearScrollListeners,
    resetScrollIntent,
  ]);

  useEffect(() => {
    if (normalizedOptions.enabled === false) {
      handleDragEnd();
    }
  }, [normalizedOptions.enabled, handleDragEnd]);

  useEffect(
    () => () => {
      clearAutoScrollInterval();
      clearScrollListeners();
      cancelLayoutShiftCompensation();
      cancelScrollUpdateFrame();
    },
    [
      cancelLayoutShiftCompensation,
      cancelScrollUpdateFrame,
      clearAutoScrollInterval,
      clearScrollListeners,
    ]
  );

  return {
    handleDragStart,
    handleDrag,
    handleDragEnd,
    isScrolling,
  };
};
