import { act, render, screen } from "@testing-library/react";
import React from "react";
import type { DraggableData } from "react-draggable";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { calcGridColWidth } from "../../calculate-utils";
import type { Position, ReactRef, ResizeHandleAxis, Size } from "../../types";
import { GridItem } from "../grid-item";

let lastAllowMobileScroll: boolean | undefined;

// Mock react-draggable
vi.mock("react-draggable", () => ({
  DraggableCore: ({
    children,
    disabled,
    allowMobileScroll,
  }: {
    children: React.ReactElement<{ className?: string }>;
    disabled: boolean;
    allowMobileScroll?: boolean;
  }) => {
    lastAllowMobileScroll = allowMobileScroll;
    return React.cloneElement(children, {
      "data-draggable": !disabled,
      "data-allow-mobile-scroll": allowMobileScroll ? "true" : "false",
    } as React.HTMLAttributes<HTMLElement>);
  },
}));

// Mock react-resizable
vi.mock("react-resizable", () => ({
  Resizable: ({
    children,
    className,
  }: {
    children: React.ReactElement<{ className?: string }>;
    className?: string;
  }) => {
    return React.cloneElement(children, {
      "data-resizable": true,
      className: `${children.props.className || ""} ${className || ""}`.trim(),
    } as React.HTMLAttributes<HTMLElement>);
  },
}));

const defaultProps = {
  children: <div data-testid="child">Content</div>,
  layout: [{ id: "test-item", x: 0, y: 0, w: 2, h: 2 }],
  cols: 12,
  containerWidth: 1200,
  gap: 10,
  containerPadding: 10,
  rowHeight: 150,
  maxRows: Number.POSITIVE_INFINITY,
  draggable: true,
  resizable: true,
  bounded: false,
  transformScale: 1,
  className: "",
  cancel: "",
  dragTouchDelayDuration: 0,
  handle: "",
  x: 0,
  y: 0,
  w: 2,
  h: 2,
  minW: 1,
  maxW: 12,
  minH: 1,
  maxH: Number.POSITIVE_INFINITY,
  id: "test-item",
};

const pxRegex = /\d+px/;

interface ResizeCallbackData {
  node: HTMLElement;
  size: Size;
  handle: ResizeHandleAxis;
}

const getHandle = (ref: React.RefObject<GridItem | null>): GridItem => {
  const handle = ref.current;
  if (!handle) {
    throw new Error("GridItem ref not set");
  }
  return handle;
};

const createDragData = (
  node: HTMLElement,
  overrides: Partial<DraggableData> = {}
): DraggableData => ({
  node,
  x: 0,
  y: 0,
  deltaX: 0,
  deltaY: 0,
  lastX: 0,
  lastY: 0,
  ...overrides,
});

const createResizeData = (
  node: HTMLElement,
  size: Size,
  handle: ResizeHandleAxis
): ResizeCallbackData => ({
  node,
  size,
  handle,
});

const setNavigatorMaxTouchPoints = (value: number) => {
  Object.defineProperty(navigator, "maxTouchPoints", {
    configurable: true,
    writable: true,
    value,
  });
};

describe("GridItem", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    lastAllowMobileScroll = undefined;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe("rendering", () => {
    it("renders children", () => {
      render(<GridItem {...defaultProps} />);
      expect(screen.getByTestId("child")).toBeInTheDocument();
    });

    it("applies dnd-grid-item class", () => {
      render(<GridItem {...defaultProps} />);
      const element = screen.getByTestId("child");
      expect(element).toHaveClass("dnd-grid-item");
    });

    it("applies static class when static prop is true", () => {
      render(<GridItem {...defaultProps} static={true} />);
      const element = screen.getByTestId("child");
      expect(element).toHaveClass("static");
    });

    it("applies dnd-draggable class when draggable is true", () => {
      render(<GridItem {...defaultProps} draggable={true} />);
      const element = screen.getByTestId("child");
      expect(element).toHaveClass("dnd-draggable");
    });

    it("does not apply dnd-draggable class when draggable is false", () => {
      render(<GridItem {...defaultProps} draggable={false} />);
      const element = screen.getByTestId("child");
      expect(element).not.toHaveClass("dnd-draggable");
    });

    it("applies custom className", () => {
      render(<GridItem {...defaultProps} className="custom-class" />);
      const element = screen.getByTestId("child");
      expect(element).toHaveClass("custom-class");
    });

    it("applies slotProps item className", () => {
      render(
        <GridItem
          {...defaultProps}
          slotProps={{ item: { className: "slot-item-class" } }}
        />
      );
      const element = screen.getByTestId("child");
      expect(element).toHaveClass("slot-item-class");
    });

    it("applies slotProps item style function", () => {
      render(
        <GridItem
          {...defaultProps}
          slotProps={{
            item: {
              style: (item, state) => ({
                backgroundColor:
                  item.id === "test-item" && !state.dragging ? "blue" : "red",
              }),
            },
          }}
        />
      );
      const element = screen.getByTestId("child");
      expect(element.style.backgroundColor).toBe("blue");
    });

    it("preserves child className", () => {
      render(
        <GridItem {...defaultProps}>
          <div className="child-class" data-testid="child">
            Content
          </div>
        </GridItem>
      );
      const element = screen.getByTestId("child");
      expect(element).toHaveClass("child-class");
    });
  });

  describe("positioning", () => {
    it("applies position styles", () => {
      render(<GridItem {...defaultProps} x={1} y={1} />);
      const element = screen.getByTestId("child");
      const style = element.style;
      expect(style.position).toBe("absolute");
    });

    it("includes width and height in style", () => {
      render(<GridItem {...defaultProps} />);
      const element = screen.getByTestId("child");
      const style = element.style;
      expect(style.width).toMatch(pxRegex);
      expect(style.height).toMatch(pxRegex);
    });

    it("calculates position based on grid coordinates", () => {
      render(<GridItem {...defaultProps} x={0} y={0} />);
      const element = screen.getByTestId("child");
      const style = element.style;
      expect(style.transform).toBeDefined();
      expect(style.transform).toContain("translate");
    });
  });

  describe("createStyle", () => {
    it("compensates for scale and uses spring rotation", () => {
      const ref = React.createRef<GridItem>();
      render(
        <div className="dnd-grid">
          <GridItem ref={ref} {...defaultProps} />
        </div>
      );
      const handle = getHandle(ref);

      act(() => {
        handle.setState({
          currentScale: 1.2,
          currentRotation: 15,
        });
      });

      const pos: Position = {
        left: 10,
        top: 20,
        width: 100,
        height: 50,
        deg: 0,
      };
      const style = handle.createStyle(pos);

      expect(style.transform).toContain("scale(1.2)");
      expect(style.transform).toContain("rotate(15deg)");
      expect(style.transform).toContain("translate(20px,25px)");
    });

    it("uses animated position when settling", () => {
      const ref = React.createRef<GridItem>();
      render(
        <div className="dnd-grid">
          <GridItem ref={ref} {...defaultProps} />
        </div>
      );
      const handle = getHandle(ref);

      act(() => {
        handle.setState({
          isAnimating: true,
          animatedX: 200,
          animatedY: 100,
          currentScale: 1,
        });
      });

      const pos: Position = {
        left: 10,
        top: 20,
        width: 100,
        height: 50,
        deg: 0,
      };
      const style = handle.createStyle(pos);
      expect(style.transform).toContain("translate(200px,100px)");
    });
  });

  describe("draggable behavior", () => {
    it("has dnd-draggable class when draggable is true", () => {
      render(<GridItem {...defaultProps} draggable={true} />);
      const element = screen.getByTestId("child");
      expect(element).toHaveClass("dnd-draggable");
    });

    it("does not have dnd-draggable class when draggable is false", () => {
      render(<GridItem {...defaultProps} draggable={false} />);
      const element = screen.getByTestId("child");
      expect(element).not.toHaveClass("dnd-draggable");
    });

    it("is not draggable when static is true", () => {
      render(<GridItem {...defaultProps} draggable={true} static={true} />);
      const element = screen.getByTestId("child");
      // Static items are rendered with draggable=false passed to component
      expect(element).toHaveClass("static");
    });
  });

  describe("resizable behavior", () => {
    it("includes resizable wrapper when resizable is true", () => {
      render(<GridItem {...defaultProps} resizable={true} />);
      const element = screen.getByTestId("child");
      expect(element).toHaveAttribute("data-resizable", "true");
    });

    it("includes react-resizable-hide class when resizable is false", () => {
      render(<GridItem {...defaultProps} resizable={false} />);
      const element = screen.getByTestId("child");
      expect(element).toHaveClass("react-resizable-hide");
    });
  });

  describe("bounded mode", () => {
    it("accepts bounded prop", () => {
      render(<GridItem {...defaultProps} bounded={true} />);
      expect(screen.getByTestId("child")).toBeInTheDocument();
    });

    it("renders correctly with bounded false", () => {
      render(<GridItem {...defaultProps} bounded={false} />);
      expect(screen.getByTestId("child")).toBeInTheDocument();
    });
  });

  describe("drag lifecycle", () => {
    it("starts drag after touch delay", () => {
      const handleDragStart = vi.fn();
      const ref = React.createRef<GridItem>();
      render(
        <div className="dnd-grid">
          <GridItem {...defaultProps} dragTouchDelayDuration={50} ref={ref} />
        </div>
      );

      const handle = getHandle(ref);
      handle.draggableCoreRef.current = {
        handleDragStart,
      } as unknown as typeof handle.draggableCoreRef.current;

      act(() => {
        handle.startDragDelayTimeout(new Event("touchstart"));
        vi.advanceTimersByTime(50);
      });

      expect(handleDragStart).toHaveBeenCalled();
      expect(handle.state.allowedToDrag).toBe(true);
    });

    it("blocks drag start for touch events when delay is active", () => {
      const originalMaxTouchPoints = navigator.maxTouchPoints;
      setNavigatorMaxTouchPoints(1);
      const onDragStart = vi.fn();
      const ref = React.createRef<GridItem>();
      render(
        <div className="dnd-grid">
          <GridItem
            {...defaultProps}
            dragTouchDelayDuration={200}
            onDragStart={onDragStart}
            ref={ref}
          />
        </div>
      );
      const handle = getHandle(ref);

      const node = screen.getByTestId("child");
      const touchEvent = { touches: [{}] } as unknown as TouchEvent;
      const result = handle.onDragStart(touchEvent, createDragData(node));

      expect(result).toBe(false);
      expect(onDragStart).not.toHaveBeenCalled();
      expect(handle.state.dragging).toBe(false);
      setNavigatorMaxTouchPoints(originalMaxTouchPoints);
    });

    it("ignores drag updates when not dragging", () => {
      const onDrag = vi.fn();
      const ref = React.createRef<GridItem>();
      render(
        <div className="dnd-grid">
          <GridItem {...defaultProps} onDrag={onDrag} ref={ref} />
        </div>
      );
      const handle = getHandle(ref);

      const node = screen.getByTestId("child");
      act(() => {
        handle.onDrag(
          new MouseEvent("mousemove"),
          createDragData(node, { deltaX: 10, deltaY: 10 })
        );
      });

      expect(onDrag).not.toHaveBeenCalled();
      expect(handle.state.dragging).toBe(false);
    });

    it("uses pointer coordinates for non-mouse drag events", () => {
      const onDragStart = vi.fn();
      const onDrag = vi.fn();
      const ref = React.createRef<GridItem>();
      render(
        <div className="dnd-grid">
          <GridItem
            {...defaultProps}
            onDrag={onDrag}
            onDragStart={onDragStart}
            ref={ref}
          />
        </div>
      );

      const handle = getHandle(ref);
      vi.spyOn(handle, "startSpringAnimation").mockImplementation(
        () => undefined
      );
      const node = screen.getByTestId("child");
      act(() => {
        handle.onDragStart(new MouseEvent("mousedown"), createDragData(node));
      });

      act(() => {
        const pointerEvent = { clientX: 123, clientY: 456 } as PointerEvent;
        handle.onDrag(
          pointerEvent,
          createDragData(node, { deltaX: 5, deltaY: 5 })
        );
      });

      expect(onDrag).toHaveBeenCalled();
    });

    it("ignores drag stop when not dragging", () => {
      const onDragEnd = vi.fn();
      const ref = React.createRef<GridItem>();
      render(
        <div className="dnd-grid">
          <GridItem {...defaultProps} onDragEnd={onDragEnd} ref={ref} />
        </div>
      );
      const handle = getHandle(ref);

      const node = screen.getByTestId("child");
      act(() => {
        handle.onDragEnd(new MouseEvent("mouseup"), createDragData(node));
      });

      expect(onDragEnd).not.toHaveBeenCalled();
      expect(handle.state.dragging).toBe(false);
    });

    it("clamps drag movement when bounded", () => {
      const ref = React.createRef<GridItem>();
      const onDragStart = vi.fn();
      const onDrag = vi.fn();
      render(
        <div className="dnd-grid" data-testid="grid">
          <GridItem
            {...defaultProps}
            bounded={true}
            cols={3}
            containerPadding={0}
            containerWidth={300}
            gap={0}
            h={1}
            onDrag={onDrag}
            onDragStart={onDragStart}
            ref={ref}
            rowHeight={100}
            w={1}
          />
        </div>
      );
      const handle = getHandle(ref);
      vi.spyOn(handle, "startSpringAnimation").mockImplementation(
        () => undefined
      );

      const grid = screen.getByTestId("grid");
      Object.defineProperty(grid, "clientHeight", { value: 200 });

      const node = screen.getByTestId("child");
      act(() => {
        handle.onDragStart(new MouseEvent("mousedown"), createDragData(node));
      });

      act(() => {
        handle.onDrag(
          new MouseEvent("mousemove", { clientX: 500, clientY: 500 }),
          createDragData(node, { deltaX: 500, deltaY: 500 })
        );
      });

      expect(onDrag).toHaveBeenCalled();
      const dragEvent = onDrag.mock.calls[0][0];
      expect(dragEvent.newPosition.left).toBe(200);
      expect(dragEvent.newPosition.top).toBe(100);
    });

    it("enters settling state on drag stop", () => {
      const onDragStart = vi.fn();
      const onDragEnd = vi.fn();
      const ref = React.createRef<GridItem>();
      render(
        <div className="dnd-grid">
          <GridItem
            {...defaultProps}
            onDragEnd={onDragEnd}
            onDragStart={onDragStart}
            ref={ref}
          />
        </div>
      );
      const handle = getHandle(ref);
      vi.spyOn(handle, "startSpringAnimation").mockImplementation(
        () => undefined
      );

      const node = screen.getByTestId("child");
      act(() => {
        handle.onDragStart(new MouseEvent("mousedown"), createDragData(node));
      });

      expect(onDragStart).toHaveBeenCalled();
      expect(document.body.classList.contains("dnd-grid-dragging")).toBe(true);

      act(() => {
        handle.onDragEnd(new MouseEvent("mouseup"), createDragData(node));
      });

      expect(onDragEnd).toHaveBeenCalled();
      expect(handle.state.dragging).toBe(false);
      expect(handle._isSettling).toBe(true);
      expect(handle.state.isAnimating).toBe(true);
      expect(document.body.classList.contains("dnd-grid-dragging")).toBe(false);
    });

    it("clears settling state when drag restarts", () => {
      const ref = React.createRef<GridItem>();
      render(
        <div className="dnd-grid">
          <GridItem {...defaultProps} ref={ref} />
        </div>
      );
      const handle = getHandle(ref);
      vi.spyOn(handle, "startSpringAnimation").mockImplementation(
        () => undefined
      );

      const node = screen.getByTestId("child");
      act(() => {
        handle.onDragStart(new MouseEvent("mousedown"), createDragData(node));
        handle.onDragEnd(new MouseEvent("mouseup"), createDragData(node));
      });

      expect(handle._isSettling).toBe(true);

      act(() => {
        handle.onDragStart(new MouseEvent("mousedown"), createDragData(node));
      });

      expect(handle._isSettling).toBe(false);
    });
  });

  describe("touch handling", () => {
    it("allows mobile scroll when touch delay is enabled", () => {
      const originalMaxTouchPoints = navigator.maxTouchPoints;
      setNavigatorMaxTouchPoints(1);
      render(
        <div className="dnd-grid">
          <GridItem {...defaultProps} dragTouchDelayDuration={250} />
        </div>
      );
      expect(lastAllowMobileScroll).toBe(true);
      setNavigatorMaxTouchPoints(originalMaxTouchPoints);
    });

    it("prevents default when allowedToDrag is true", () => {
      const ref = React.createRef<GridItem>();
      render(
        <div className="dnd-grid">
          <GridItem {...defaultProps} ref={ref} />
        </div>
      );
      const handle = getHandle(ref);

      const event = new Event("touchmove");
      const preventDefaultSpy = vi.spyOn(event, "preventDefault");
      act(() => {
        handle.setState({ allowedToDrag: true });
      });
      act(() => {
        handle.handleTouchMove(event);
      });

      expect(preventDefaultSpy).toHaveBeenCalled();
    });

    it("resets delay timeout when not allowed to drag", () => {
      const ref = React.createRef<GridItem>();
      render(
        <div className="dnd-grid">
          <GridItem {...defaultProps} ref={ref} />
        </div>
      );
      const handle = getHandle(ref);

      const resetSpy = vi.spyOn(handle, "resetDelayTimeout");

      act(() => {
        handle.setState({ allowedToDrag: false });
        handle.handleTouchMove(new Event("touchmove"));
      });

      expect(resetSpy).toHaveBeenCalled();
    });
  });

  describe("spring animation", () => {
    it("stops animation when not dragging or settling", () => {
      const ref = React.createRef<GridItem>();
      render(
        <div className="dnd-grid">
          <GridItem {...defaultProps} ref={ref} />
        </div>
      );
      const handle = getHandle(ref);

      act(() => {
        handle.setState({ isAnimating: true, dragging: false });
        handle.startSpringAnimation();
      });
      act(() => {
        vi.runAllTimers();
      });

      expect(handle.springAnimationFrame).toBeNull();
      expect(handle.state.isAnimating).toBe(false);
    });

    it("calls onSettleComplete when settling finishes", () => {
      const onSettleComplete = vi.fn();
      const ref = React.createRef<GridItem>();
      render(
        <div className="dnd-grid">
          <GridItem
            {...defaultProps}
            onSettleComplete={onSettleComplete}
            ref={ref}
          />
        </div>
      );
      const handle = getHandle(ref);
      const node = screen.getByTestId("child");
      act(() => {
        handle.onDragStart(new MouseEvent("mousedown"), createDragData(node));
        handle.onDragEnd(new MouseEvent("mouseup"), createDragData(node));
        vi.advanceTimersByTime(2000);
      });

      expect(onSettleComplete).toHaveBeenCalledWith("test-item");
      expect(handle._isSettling).toBe(false);
    });

    it("keeps animation active during long drags and settles on stop", () => {
      const onSettleComplete = vi.fn();
      const onDragEnd = vi.fn();
      const ref = React.createRef<GridItem>();
      render(
        <div className="dnd-grid">
          <GridItem
            {...defaultProps}
            onDragEnd={onDragEnd}
            onSettleComplete={onSettleComplete}
            ref={ref}
          />
        </div>
      );
      const handle = getHandle(ref);

      const node = screen.getByTestId("child");
      act(() => {
        handle.onDragStart(new MouseEvent("mousedown"), createDragData(node));
      });
      act(() => {
        vi.advanceTimersByTime(2500);
      });

      expect(handle.springAnimationFrame).not.toBeNull();

      act(() => {
        handle.onDragEnd(new MouseEvent("mouseup"), createDragData(node));
      });
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      expect(onSettleComplete).toHaveBeenCalledWith("test-item");
    });
  });

  describe("reduced motion", () => {
    it("skips spring animation when reduced motion is enabled", () => {
      const ref = React.createRef<GridItem>();
      render(
        <div className="dnd-grid">
          <GridItem {...defaultProps} reducedMotion="always" ref={ref} />
        </div>
      );
      const handle = getHandle(ref);

      act(() => {
        handle.startSpringAnimation();
      });

      expect(handle.springAnimationFrame).toBeNull();
    });

    it("skips WAAPI animations when reduced motion is enabled", () => {
      const animateSpy = vi.spyOn(Element.prototype, "animate");
      const initialCalls = animateSpy.mock.calls.length;
      const ref = React.createRef<GridItem>();
      render(
        <div className="dnd-grid">
          <GridItem {...defaultProps} reducedMotion="always" ref={ref} />
        </div>
      );
      const handle = getHandle(ref);
      const node = screen.getByTestId("child");

      act(() => {
        handle.onDragStart(new MouseEvent("mousedown"), createDragData(node));
        handle.onDragEnd(new MouseEvent("mouseup"), createDragData(node));
      });

      expect(animateSpy.mock.calls.length).toBe(initialCalls);
    });

    it("calls onSettleComplete immediately when reduced motion is enabled", () => {
      const onSettleComplete = vi.fn();
      const ref = React.createRef<GridItem>();
      render(
        <div className="dnd-grid">
          <GridItem
            {...defaultProps}
            onSettleComplete={onSettleComplete}
            reducedMotion="always"
            ref={ref}
          />
        </div>
      );
      const handle = getHandle(ref);
      const node = screen.getByTestId("child");

      act(() => {
        handle.onDragStart(new MouseEvent("mousedown"), createDragData(node));
        handle.onDragEnd(new MouseEvent("mouseup"), createDragData(node));
      });

      expect(onSettleComplete).toHaveBeenCalledWith("test-item");
    });
  });

  describe("animation config", () => {
    it("skips spring animation when springs are disabled", () => {
      const ref = React.createRef<GridItem>();
      render(
        <div className="dnd-grid">
          <GridItem
            {...defaultProps}
            animationConfig={{ springs: { enabled: false } }}
            ref={ref}
          />
        </div>
      );
      const handle = getHandle(ref);

      act(() => {
        handle.startSpringAnimation();
      });

      expect(handle.springAnimationFrame).toBeNull();
    });

    it("uses custom shadow durations and easings", () => {
      const animateSpy = vi.spyOn(Element.prototype, "animate");
      const initialCalls = animateSpy.mock.calls.length;
      const ref = React.createRef<GridItem>();
      render(
        <div className="dnd-grid">
          <GridItem
            {...defaultProps}
            animationConfig={{
              shadow: {
                dragStartDuration: 140,
                dragStopDuration: 80,
                dragStartEasing: "linear",
                dragStopEasing: "ease-in",
              },
            }}
            ref={ref}
          />
        </div>
      );
      const handle = getHandle(ref);
      const node = screen.getByTestId("child");

      act(() => {
        handle.onDragStart(new MouseEvent("mousedown"), createDragData(node));
        handle.onDragEnd(new MouseEvent("mouseup"), createDragData(node));
      });

      const calls = animateSpy.mock.calls.slice(initialCalls);
      const firstOptions = calls[0]?.[1] as
        | KeyframeAnimationOptions
        | undefined;
      const secondOptions = calls[1]?.[1] as
        | KeyframeAnimationOptions
        | undefined;
      expect(calls.length).toBeGreaterThanOrEqual(2);
      expect(firstOptions?.duration).toBe(140);
      expect(firstOptions?.easing).toBe("linear");
      expect(secondOptions?.duration).toBe(80);
      expect(secondOptions?.easing).toBe("ease-in");
    });
  });

  describe("shouldComponentUpdate", () => {
    it("updates when children change", () => {
      const { rerender } = render(<GridItem {...defaultProps} />);
      rerender(
        <GridItem {...defaultProps}>
          <div data-testid="new-child">New Content</div>
        </GridItem>
      );
      expect(screen.getByTestId("new-child")).toBeInTheDocument();
    });

    it("updates when position props change", () => {
      const { rerender } = render(<GridItem {...defaultProps} x={0} />);
      rerender(<GridItem {...defaultProps} x={5} />);
      // Component should re-render with new position
      expect(screen.getByTestId("child")).toBeInTheDocument();
    });

    it("updates when dimensions change", () => {
      const { rerender } = render(<GridItem {...defaultProps} h={2} w={2} />);
      rerender(<GridItem {...defaultProps} h={3} w={4} />);
      expect(screen.getByTestId("child")).toBeInTheDocument();
    });
  });

  describe("callbacks", () => {
    it("accepts onDragStart callback", () => {
      const onDragStart = vi.fn();
      render(<GridItem {...defaultProps} onDragStart={onDragStart} />);
      expect(screen.getByTestId("child")).toBeInTheDocument();
    });

    it("accepts onDrag callback", () => {
      const onDrag = vi.fn();
      render(<GridItem {...defaultProps} onDrag={onDrag} />);
      expect(screen.getByTestId("child")).toBeInTheDocument();
    });

    it("accepts onDragEnd callback", () => {
      const onDragEnd = vi.fn();
      render(<GridItem {...defaultProps} onDragEnd={onDragEnd} />);
      expect(screen.getByTestId("child")).toBeInTheDocument();
    });

    it("accepts onResizeStart callback", () => {
      const onResizeStart = vi.fn();
      render(<GridItem {...defaultProps} onResizeStart={onResizeStart} />);
      expect(screen.getByTestId("child")).toBeInTheDocument();
    });

    it("accepts onResize callback", () => {
      const onResize = vi.fn();
      render(<GridItem {...defaultProps} onResize={onResize} />);
      expect(screen.getByTestId("child")).toBeInTheDocument();
    });

    it("accepts onResizeEnd callback", () => {
      const onResizeEnd = vi.fn();
      render(<GridItem {...defaultProps} onResizeEnd={onResizeEnd} />);
      expect(screen.getByTestId("child")).toBeInTheDocument();
    });

    it("accepts onSettleComplete callback", () => {
      const onSettleComplete = vi.fn();
      render(
        <GridItem {...defaultProps} onSettleComplete={onSettleComplete} />
      );
      expect(screen.getByTestId("child")).toBeInTheDocument();
    });
  });

  describe("dropping position", () => {
    it("handles droppingPosition prop", () => {
      const droppingPosition = {
        left: 100,
        top: 100,
        e: new Event("dragover"),
      };
      render(
        <GridItem {...defaultProps} droppingPosition={droppingPosition} />
      );
      const element = screen.getByTestId("child");
      expect(element).toHaveClass("dropping");
    });

    it("does not have dropping class without droppingPosition", () => {
      render(<GridItem {...defaultProps} />);
      const element = screen.getByTestId("child");
      expect(element).not.toHaveClass("dropping");
    });
  });

  describe("custom styles", () => {
    it("applies custom style prop", () => {
      render(<GridItem {...defaultProps} style={{ backgroundColor: "red" }} />);
      const element = screen.getByTestId("child");
      expect(element.style.backgroundColor).toBe("red");
    });

    it("preserves child styles", () => {
      render(
        <GridItem {...defaultProps}>
          <div data-testid="child" style={{ color: "blue" }}>
            Content
          </div>
        </GridItem>
      );
      const element = screen.getByTestId("child");
      expect(element.style.color).toBe("blue");
    });
  });

  describe("resize handles", () => {
    it("accepts resizeHandles prop", () => {
      render(<GridItem {...defaultProps} resizeHandles={["se", "ne"]} />);
      expect(screen.getByTestId("child")).toBeInTheDocument();
    });

    it("accepts custom resizeHandle prop", () => {
      const customHandle = (
        axis: ResizeHandleAxis,
        ref: ReactRef<HTMLElement>
      ) => (
        <div
          className={`custom-handle-${axis}`}
          ref={ref as React.Ref<HTMLDivElement>}
        />
      );
      render(<GridItem {...defaultProps} resizeHandle={customHandle} />);
      expect(screen.getByTestId("child")).toBeInTheDocument();
    });
  });

  describe("constraints", () => {
    it("accepts min/max width constraints", () => {
      render(<GridItem {...defaultProps} maxW={8} minW={2} />);
      expect(screen.getByTestId("child")).toBeInTheDocument();
    });

    it("accepts min/max height constraints", () => {
      render(<GridItem {...defaultProps} maxH={4} minH={1} />);
      expect(screen.getByTestId("child")).toBeInTheDocument();
    });
  });

  describe("resize handling", () => {
    it("clamps resize to min constraints and updates resizing state", () => {
      const onResize = vi.fn();
      const ref = React.createRef<GridItem>();
      render(
        <div className="dnd-grid">
          <GridItem
            {...defaultProps}
            minH={2}
            minW={2}
            onResize={onResize}
            ref={ref}
          />
        </div>
      );
      const handle = getHandle(ref);

      const position: Position = {
        left: 0,
        top: 0,
        width: 100,
        height: 100,
        deg: 0,
      };
      const positionParams = handle.getPositionParams();
      const colWidth = calcGridColWidth(positionParams);
      const size: Size = {
        width: colWidth,
        height: positionParams.rowHeight,
      };
      const node = screen.getByTestId("child");

      act(() => {
        handle.onResizeStart(
          new Event("resize"),
          createResizeData(node, size, "se"),
          position
        );
        handle.onResize(
          new Event("resize"),
          createResizeData(node, size, "se"),
          position
        );
      });

      expect(onResize).toHaveBeenCalled();
      const resizeEvent = onResize.mock.calls[0][0];
      expect(resizeEvent.w).toBe(2);
      expect(resizeEvent.h).toBe(2);
      expect(handle.state.resizing).toBe(true);
    });

    it("sets the resize cursor on the body during resize", () => {
      const onResizeStart = vi.fn();
      const onResizeEnd = vi.fn();
      const ref = React.createRef<GridItem>();
      render(
        <div className="dnd-grid">
          <GridItem
            {...defaultProps}
            onResizeEnd={onResizeEnd}
            onResizeStart={onResizeStart}
            ref={ref}
          />
        </div>
      );
      const handle = getHandle(ref);

      const position: Position = {
        left: 0,
        top: 0,
        width: 100,
        height: 100,
        deg: 0,
      };
      const size: Size = { width: 120, height: 120 };
      const node = screen.getByTestId("child");
      const resizeData = createResizeData(node, size, "se");

      act(() => {
        handle.onResizeStart(new Event("resize"), resizeData, position);
      });

      expect(document.body.classList.contains("dnd-grid-resizing")).toBe(true);
      expect(
        document.body.style.getPropertyValue("--dnd-grid-resize-cursor")
      ).toBe("se-resize");

      act(() => {
        handle.onResizeEnd(new Event("resize"), resizeData, position);
      });

      expect(document.body.classList.contains("dnd-grid-resizing")).toBe(false);
      expect(
        document.body.style.getPropertyValue("--dnd-grid-resize-cursor")
      ).toBe("");
    });

    it("routes resize events through wrapper callbacks", () => {
      const onResizeStart = vi.fn();
      const onResize = vi.fn();
      const onResizeEnd = vi.fn();
      const ref = React.createRef<GridItem>();
      render(
        <div className="dnd-grid">
          <GridItem
            {...defaultProps}
            onResize={onResize}
            onResizeEnd={onResizeEnd}
            onResizeStart={onResizeStart}
            ref={ref}
          />
        </div>
      );
      const handle = getHandle(ref);

      const position: Position = {
        left: 0,
        top: 0,
        width: 100,
        height: 100,
        deg: 0,
      };
      const size: Size = { width: 120, height: 120 };
      const node = screen.getByTestId("child");
      const resizeData = createResizeData(node, size, "se");

      act(() => {
        handle.onResizeStart(new Event("resize"), resizeData, position);
        handle.onResize(new Event("resize"), resizeData, position);
        handle.onResizeEnd(new Event("resize"), resizeData, position);
      });

      expect(onResizeStart).toHaveBeenCalled();
      expect(onResize).toHaveBeenCalled();
      expect(onResizeEnd).toHaveBeenCalled();
      expect(handle.state.resizing).toBe(false);
    });
  });

  describe("transform scale", () => {
    it("accepts transformScale prop", () => {
      render(<GridItem {...defaultProps} transformScale={1.5} />);
      expect(screen.getByTestId("child")).toBeInTheDocument();
    });

    it("defaults to transformScale of 1", () => {
      render(<GridItem {...defaultProps} />);
      expect(screen.getByTestId("child")).toBeInTheDocument();
    });
  });

  describe("touch delay", () => {
    it("accepts dragTouchDelayDuration prop", () => {
      render(<GridItem {...defaultProps} dragTouchDelayDuration={250} />);
      expect(screen.getByTestId("child")).toBeInTheDocument();
    });

    it("defaults to dragTouchDelayDuration of 0", () => {
      render(<GridItem {...defaultProps} />);
      expect(screen.getByTestId("child")).toBeInTheDocument();
    });
  });

  describe("default props", () => {
    it("applies default minW and minH", () => {
      const { minW: _minW, minH: _minH, ...propsWithoutMinMax } = defaultProps;
      render(<GridItem {...propsWithoutMinMax} />);
      expect(screen.getByTestId("child")).toBeInTheDocument();
    });

    it("applies default maxW and maxH", () => {
      const { maxW: _maxW, maxH: _maxH, ...propsWithoutMinMax } = defaultProps;
      render(<GridItem {...propsWithoutMinMax} />);
      expect(screen.getByTestId("child")).toBeInTheDocument();
    });
  });
});
