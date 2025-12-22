import { act, render } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AutoScrollOptions } from "./types";
import { TraversalOrder } from "./types";
import { type EdgeScrollHandlers, useEdgeScroll } from "./use-edge-scroll";

type HarnessProps = {
  options?: AutoScrollOptions;
  onReady: (handlers: EdgeScrollHandlers) => void;
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
  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = "";
  });

  it("scrolls when pointer nears the edge", () => {
    vi.useFakeTimers();
    let handlers: EdgeScrollHandlers | null = null;

    render(
      <EdgeScrollHarness
        options={{ order: TraversalOrder.ReversedTreeOrder, interval: 5 }}
        onReady={(value) => {
          handlers = value;
        }}
      />,
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
      handlers?.handleDragStop();
      vi.advanceTimersByTime(20);
    });

    expect(container.scrollTop).toBe(scrolled);
  });
});
