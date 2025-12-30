import { act, render } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AutoScrollOptions } from "../types";
import { AutoScrollActivator, TraversalOrder } from "../types";
import { type EdgeScrollHandlers, useEdgeScroll } from "../use-edge-scroll";

interface HarnessProps {
  options?: AutoScrollOptions;
  onReady: (handlers: EdgeScrollHandlers) => void;
}

const mockRaf = () => {
  const originalRequest = window.requestAnimationFrame;
  const originalCancel = window.cancelAnimationFrame;

  window.requestAnimationFrame = (callback) =>
    window.setTimeout(() => callback(0), 0);
  window.cancelAnimationFrame = (id) => {
    clearTimeout(id);
  };

  return () => {
    window.requestAnimationFrame = originalRequest;
    window.cancelAnimationFrame = originalCancel;
  };
};

const EdgeScrollHarness = ({ options, onReady }: HarnessProps) => {
  const handlers = useEdgeScroll(options);
  React.useEffect(() => {
    onReady(handlers);
  }, [handlers, onReady]);
  return null;
};

const createScrollableContainer = () => {
  const container = document.createElement("div");
  container.style.overflow = "auto";
  Object.defineProperty(container, "scrollHeight", {
    value: 300,
    configurable: true,
  });
  Object.defineProperty(container, "clientHeight", {
    value: 100,
    configurable: true,
  });
  Object.defineProperty(container, "scrollWidth", {
    value: 100,
    configurable: true,
  });
  Object.defineProperty(container, "clientWidth", {
    value: 100,
    configurable: true,
  });
  container.scrollTop = 0;
  container.scrollLeft = 0;
  container.scrollBy = ((arg1?: number | ScrollToOptions, arg2?: number) => {
    const left = typeof arg1 === "object" ? (arg1.left ?? 0) : (arg1 ?? 0);
    const top = typeof arg1 === "object" ? (arg1.top ?? 0) : (arg2 ?? 0);
    container.scrollTop += top;
    container.scrollLeft += left;
  }) as typeof container.scrollBy;
  container.getBoundingClientRect = () =>
    ({
      top: 0,
      left: 0,
      right: 100,
      bottom: 100,
      width: 100,
      height: 100,
      x: 0,
      y: 0,
      toJSON: () => "",
    }) as DOMRect;

  const node = document.createElement("div");
  node.getBoundingClientRect = () =>
    ({
      top: 10,
      left: 10,
      right: 20,
      bottom: 20,
      width: 10,
      height: 10,
      x: 10,
      y: 10,
      toJSON: () => "",
    }) as DOMRect;
  container.appendChild(node);
  document.body.appendChild(container);

  return { container, node };
};

describe("useEdgeScroll", () => {
  let restoreRaf: (() => void) | null = null;

  afterEach(() => {
    restoreRaf?.();
    restoreRaf = null;
    vi.useRealTimers();
    document.body.innerHTML = "";
  });

  it("scrolls when pointer nears the edge", () => {
    vi.useFakeTimers();
    let handlers: EdgeScrollHandlers | null = null;

    render(
      <EdgeScrollHarness
        onReady={(value) => {
          handlers = value;
        }}
        options={{ order: TraversalOrder.ReversedTreeOrder, interval: 5 }}
      />
    );

    act(() => {});
    if (!handlers) {
      throw new Error("Edge scroll handlers were not initialized.");
    }

    const { container, node } = createScrollableContainer();

    const startEvent = new MouseEvent("mousedown", {
      clientX: 50,
      clientY: 50,
    });
    act(() => {
      handlers?.handleDragStart(startEvent, node, { left: 0, top: 0 });
    });

    const moveEvent1 = new MouseEvent("mousemove", {
      clientX: 50,
      clientY: 60,
    });
    act(() => {
      handlers?.handleDrag(moveEvent1, node, { left: 0, top: 10 });
    });

    const moveEvent2 = new MouseEvent("mousemove", {
      clientX: 50,
      clientY: 95,
    });
    act(() => {
      handlers?.handleDrag(moveEvent2, node, { left: 0, top: 20 });
    });

    act(() => {
      vi.advanceTimersByTime(20);
    });

    expect(container.scrollTop).toBeGreaterThan(0);

    const scrolled = container.scrollTop;
    act(() => {
      handlers?.handleDragEnd();
      vi.advanceTimersByTime(20);
    });

    expect(container.scrollTop).toBe(scrolled);
  });

  it("compensates for layout shift on drag start", () => {
    vi.useFakeTimers();
    restoreRaf = mockRaf();
    let handlers: EdgeScrollHandlers | null = null;

    render(
      <EdgeScrollHarness
        onReady={(value) => {
          handlers = value;
        }}
        options={{ interval: 5 }}
      />
    );

    act(() => {});
    if (!handlers) {
      throw new Error("Edge scroll handlers were not initialized.");
    }

    const { container, node } = createScrollableContainer();
    const scrollBySpy = vi.fn(
      (arg1?: number | ScrollToOptions, arg2?: number) => {
        const left = typeof arg1 === "object" ? (arg1.left ?? 0) : (arg1 ?? 0);
        const top = typeof arg1 === "object" ? (arg1.top ?? 0) : (arg2 ?? 0);
        container.scrollTop += top;
        container.scrollLeft += left;
      }
    );
    container.scrollBy = scrollBySpy as typeof container.scrollBy;

    let rectTop = 10;
    node.getBoundingClientRect = () =>
      ({
        top: rectTop,
        left: 10,
        right: 20,
        bottom: rectTop + 10,
        width: 10,
        height: 10,
        x: 10,
        y: rectTop,
        toJSON: () => "",
      }) as DOMRect;

    const startEvent = new MouseEvent("mousedown", {
      clientX: 50,
      clientY: 50,
    });

    act(() => {
      handlers?.handleDragStart(startEvent, node, { left: 0, top: 0 });
    });

    rectTop = 30;

    act(() => {
      vi.runOnlyPendingTimers();
    });

    expect(scrollBySpy).toHaveBeenCalled();
    const [scrollArg] = scrollBySpy.mock.calls[0] ?? [];
    expect(scrollArg).toMatchObject({ top: 20, left: 0 });
  });

  it("re-evaluates auto scroll when scroll containers move", () => {
    vi.useFakeTimers();
    restoreRaf = mockRaf();
    let handlers: EdgeScrollHandlers | null = null;

    render(
      <EdgeScrollHarness
        onReady={(value) => {
          handlers = value;
        }}
        options={{
          activator: AutoScrollActivator.DraggableRect,
          interval: 5,
        }}
      />
    );

    act(() => {});
    if (!handlers) {
      throw new Error("Edge scroll handlers were not initialized.");
    }

    const { container, node } = createScrollableContainer();
    let rectTop = 85;
    node.getBoundingClientRect = () =>
      ({
        top: rectTop,
        left: 10,
        right: 20,
        bottom: rectTop + 10,
        width: 10,
        height: 10,
        x: 10,
        y: rectTop,
        toJSON: () => "",
      }) as DOMRect;

    const startEvent = new MouseEvent("mousedown", {
      clientX: 50,
      clientY: 50,
    });

    act(() => {
      handlers?.handleDragStart(startEvent, node, { left: 0, top: 0 });
    });

    const moveEvent = new MouseEvent("mousemove", {
      clientX: 50,
      clientY: 95,
    });
    act(() => {
      handlers?.handleDrag(moveEvent, node, { left: 0, top: 20 });
    });

    act(() => {
      vi.advanceTimersByTime(20);
    });

    expect(container.scrollTop).toBeGreaterThan(0);

    rectTop = 10;
    act(() => {
      container.dispatchEvent(new Event("scroll"));
      vi.runOnlyPendingTimers();
    });

    const scrolled = container.scrollTop;
    act(() => {
      vi.advanceTimersByTime(20);
    });

    expect(container.scrollTop).toBe(scrolled);
  });
});
