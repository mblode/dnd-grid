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
  layout: [{ i: "test-item", x: 0, y: 0, w: 2, h: 2 }],
  cols: 12,
  containerWidth: 1200,
  margin: 10,
  containerPadding: 10,
  rowHeight: 150,
  maxRows: Infinity,
  isDraggable: true,
  isResizable: true,
  isBounded: false,
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
  maxH: Infinity,
  i: "test-item",
};

type ResizeCallbackData = {
  node: HTMLElement;
  size: Size;
  handle: ResizeHandleAxis;
};

const getHandle = (ref: React.RefObject<GridItem | null>): GridItem => {
  const handle = ref.current;
  if (!handle) {
    throw new Error("GridItem ref not set");
  }
  return handle;
};

const createDragData = (
  node: HTMLElement,
  overrides: Partial<DraggableData> = {},
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
  handle: ResizeHandleAxis,
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

    it("applies dnd-draggable class when isDraggable is true", () => {
      render(<GridItem {...defaultProps} isDraggable={true} />);
      const element = screen.getByTestId("child");
      expect(element).toHaveClass("dnd-draggable");
    });

    it("does not apply dnd-draggable class when isDraggable is false", () => {
      render(<GridItem {...defaultProps} isDraggable={false} />);
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
        />,
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
                  item.i === "test-item" && !state.dragging ? "blue" : "red",
              }),
            },
          }}
        />,
      );
      const element = screen.getByTestId("child");
      expect(element.style.backgroundColor).toBe("blue");
    });

    it("preserves child className", () => {
      render(
        <GridItem {...defaultProps}>
          <div data-testid="child" className="child-class">
            Content
          </div>
        </GridItem>,
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
      expect(style.width).toMatch(/\d+px/);
      expect(style.height).toMatch(/\d+px/);
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
        </div>,
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
        </div>,
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
    it("has dnd-draggable class when isDraggable is true", () => {
      render(<GridItem {...defaultProps} isDraggable={true} />);
      const element = screen.getByTestId("child");
      expect(element).toHaveClass("dnd-draggable");
    });

    it("does not have dnd-draggable class when isDraggable is false", () => {
      render(<GridItem {...defaultProps} isDraggable={false} />);
      const element = screen.getByTestId("child");
      expect(element).not.toHaveClass("dnd-draggable");
    });

    it("is not draggable when static is true", () => {
      render(<GridItem {...defaultProps} static={true} isDraggable={true} />);
      const element = screen.getByTestId("child");
      // Static items are rendered with isDraggable=false passed to component
      expect(element).toHaveClass("static");
    });
  });

  describe("resizable behavior", () => {
    it("includes resizable wrapper when isResizable is true", () => {
      render(<GridItem {...defaultProps} isResizable={true} />);
      const element = screen.getByTestId("child");
      expect(element).toHaveAttribute("data-resizable", "true");
    });

    it("includes react-resizable-hide class when isResizable is false", () => {
      render(<GridItem {...defaultProps} isResizable={false} />);
      const element = screen.getByTestId("child");
      expect(element).toHaveClass("react-resizable-hide");
    });
  });

  describe("bounded mode", () => {
    it("accepts isBounded prop", () => {
      render(<GridItem {...defaultProps} isBounded={true} />);
      expect(screen.getByTestId("child")).toBeInTheDocument();
    });

    it("renders correctly with isBounded false", () => {
      render(<GridItem {...defaultProps} isBounded={false} />);
      expect(screen.getByTestId("child")).toBeInTheDocument();
    });
  });

  describe("drag lifecycle", () => {
    it("starts drag after touch delay", () => {
      const handleDragStart = vi.fn();
      const ref = React.createRef<GridItem>();
      render(
        <div className="dnd-grid">
          <GridItem {...defaultProps} ref={ref} dragTouchDelayDuration={50} />
        </div>,
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
            ref={ref}
            onDragStart={onDragStart}
            dragTouchDelayDuration={200}
          />
        </div>,
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
          <GridItem {...defaultProps} ref={ref} onDrag={onDrag} />
        </div>,
      );
      const handle = getHandle(ref);

      const node = screen.getByTestId("child");
      act(() => {
        handle.onDrag(
          new MouseEvent("mousemove"),
          createDragData(node, { deltaX: 10, deltaY: 10 }),
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
            ref={ref}
            onDragStart={onDragStart}
            onDrag={onDrag}
          />
        </div>,
      );

      const handle = getHandle(ref);
      vi.spyOn(handle, "startSpringAnimation").mockImplementation(() => {});
      const node = screen.getByTestId("child");
      act(() => {
        handle.onDragStart(new MouseEvent("mousedown"), createDragData(node));
      });

      act(() => {
        const pointerEvent = { clientX: 123, clientY: 456 } as PointerEvent;
        handle.onDrag(
          pointerEvent,
          createDragData(node, { deltaX: 5, deltaY: 5 }),
        );
      });

      expect(onDrag).toHaveBeenCalled();
    });

    it("ignores drag stop when not dragging", () => {
      const onDragStop = vi.fn();
      const ref = React.createRef<GridItem>();
      render(
        <div className="dnd-grid">
          <GridItem {...defaultProps} ref={ref} onDragStop={onDragStop} />
        </div>,
      );
      const handle = getHandle(ref);

      const node = screen.getByTestId("child");
      act(() => {
        handle.onDragStop(new MouseEvent("mouseup"), createDragData(node));
      });

      expect(onDragStop).not.toHaveBeenCalled();
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
            ref={ref}
            onDragStart={onDragStart}
            onDrag={onDrag}
            isBounded={true}
            containerWidth={300}
            cols={3}
            rowHeight={100}
            margin={0}
            containerPadding={0}
            w={1}
            h={1}
          />
        </div>,
      );
      const handle = getHandle(ref);
      vi.spyOn(handle, "startSpringAnimation").mockImplementation(() => {});

      const grid = screen.getByTestId("grid");
      Object.defineProperty(grid, "clientHeight", { value: 200 });

      const node = screen.getByTestId("child");
      act(() => {
        handle.onDragStart(new MouseEvent("mousedown"), createDragData(node));
      });

      act(() => {
        handle.onDrag(
          new MouseEvent("mousemove", { clientX: 500, clientY: 500 }),
          createDragData(node, { deltaX: 500, deltaY: 500 }),
        );
      });

      expect(onDrag).toHaveBeenCalled();
      const dragEvent = onDrag.mock.calls[0][3];
      expect(dragEvent.newPosition.left).toBe(200);
      expect(dragEvent.newPosition.top).toBe(100);
    });

    it("enters settling state on drag stop", () => {
      const onDragStart = vi.fn();
      const onDragStop = vi.fn();
      const ref = React.createRef<GridItem>();
      render(
        <div className="dnd-grid">
          <GridItem
            {...defaultProps}
            ref={ref}
            onDragStart={onDragStart}
            onDragStop={onDragStop}
          />
        </div>,
      );
      const handle = getHandle(ref);
      vi.spyOn(handle, "startSpringAnimation").mockImplementation(() => {});

      const node = screen.getByTestId("child");
      act(() => {
        handle.onDragStart(new MouseEvent("mousedown"), createDragData(node));
      });

      expect(onDragStart).toHaveBeenCalled();
      expect(document.body.classList.contains("dnd-grid-dragging")).toBe(true);

      act(() => {
        handle.onDragStop(new MouseEvent("mouseup"), createDragData(node));
      });

      expect(onDragStop).toHaveBeenCalled();
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
        </div>,
      );
      const handle = getHandle(ref);
      vi.spyOn(handle, "startSpringAnimation").mockImplementation(() => {});

      const node = screen.getByTestId("child");
      act(() => {
        handle.onDragStart(new MouseEvent("mousedown"), createDragData(node));
        handle.onDragStop(new MouseEvent("mouseup"), createDragData(node));
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
        </div>,
      );
      expect(lastAllowMobileScroll).toBe(true);
      setNavigatorMaxTouchPoints(originalMaxTouchPoints);
    });

    it("prevents default when allowedToDrag is true", () => {
      const ref = React.createRef<GridItem>();
      render(
        <div className="dnd-grid">
          <GridItem {...defaultProps} ref={ref} />
        </div>,
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
        </div>,
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
        </div>,
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
            ref={ref}
            onSettleComplete={onSettleComplete}
          />
        </div>,
      );
      const handle = getHandle(ref);
      const node = screen.getByTestId("child");
      act(() => {
        handle.onDragStart(new MouseEvent("mousedown"), createDragData(node));
        handle.onDragStop(new MouseEvent("mouseup"), createDragData(node));
        vi.advanceTimersByTime(2000);
      });

      expect(onSettleComplete).toHaveBeenCalledWith("test-item");
      expect(handle._isSettling).toBe(false);
    });

    it("keeps animation active during long drags and settles on stop", () => {
      const onSettleComplete = vi.fn();
      const onDragStop = vi.fn();
      const ref = React.createRef<GridItem>();
      render(
        <div className="dnd-grid">
          <GridItem
            {...defaultProps}
            ref={ref}
            onDragStop={onDragStop}
            onSettleComplete={onSettleComplete}
          />
        </div>,
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
        handle.onDragStop(new MouseEvent("mouseup"), createDragData(node));
      });
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      expect(onSettleComplete).toHaveBeenCalledWith("test-item");
    });
  });

  describe("shouldComponentUpdate", () => {
    it("updates when children change", () => {
      const { rerender } = render(<GridItem {...defaultProps} />);
      rerender(
        <GridItem {...defaultProps}>
          <div data-testid="new-child">New Content</div>
        </GridItem>,
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
      const { rerender } = render(<GridItem {...defaultProps} w={2} h={2} />);
      rerender(<GridItem {...defaultProps} w={4} h={3} />);
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

    it("accepts onDragStop callback", () => {
      const onDragStop = vi.fn();
      render(<GridItem {...defaultProps} onDragStop={onDragStop} />);
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

    it("accepts onResizeStop callback", () => {
      const onResizeStop = vi.fn();
      render(<GridItem {...defaultProps} onResizeStop={onResizeStop} />);
      expect(screen.getByTestId("child")).toBeInTheDocument();
    });

    it("accepts onSettleComplete callback", () => {
      const onSettleComplete = vi.fn();
      render(
        <GridItem {...defaultProps} onSettleComplete={onSettleComplete} />,
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
        <GridItem {...defaultProps} droppingPosition={droppingPosition} />,
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
        </GridItem>,
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
        ref: ReactRef<HTMLElement>,
      ) => (
        <div
          ref={ref as React.Ref<HTMLDivElement>}
          className={`custom-handle-${axis}`}
        />
      );
      render(<GridItem {...defaultProps} resizeHandle={customHandle} />);
      expect(screen.getByTestId("child")).toBeInTheDocument();
    });
  });

  describe("constraints", () => {
    it("accepts min/max width constraints", () => {
      render(<GridItem {...defaultProps} minW={2} maxW={8} />);
      expect(screen.getByTestId("child")).toBeInTheDocument();
    });

    it("accepts min/max height constraints", () => {
      render(<GridItem {...defaultProps} minH={1} maxH={4} />);
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
            ref={ref}
            onResize={onResize}
            minW={2}
            minH={2}
          />
        </div>,
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
          position,
        );
        handle.onResize(
          new Event("resize"),
          createResizeData(node, size, "se"),
          position,
        );
      });

      expect(onResize).toHaveBeenCalled();
      expect(onResize.mock.calls[0][1]).toBe(2);
      expect(onResize.mock.calls[0][2]).toBe(2);
      expect(handle.state.resizing).toBe(true);
    });

    it("sets the resize cursor on the body during resize", () => {
      const onResizeStart = vi.fn();
      const onResizeStop = vi.fn();
      const ref = React.createRef<GridItem>();
      render(
        <div className="dnd-grid">
          <GridItem
            {...defaultProps}
            ref={ref}
            onResizeStart={onResizeStart}
            onResizeStop={onResizeStop}
          />
        </div>,
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
        document.body.style.getPropertyValue("--dnd-grid-resize-cursor"),
      ).toBe("se-resize");

      act(() => {
        handle.onResizeStop(new Event("resize"), resizeData, position);
      });

      expect(document.body.classList.contains("dnd-grid-resizing")).toBe(false);
      expect(
        document.body.style.getPropertyValue("--dnd-grid-resize-cursor"),
      ).toBe("");
    });

    it("routes resize events through wrapper callbacks", () => {
      const onResizeStart = vi.fn();
      const onResize = vi.fn();
      const onResizeStop = vi.fn();
      const ref = React.createRef<GridItem>();
      render(
        <div className="dnd-grid">
          <GridItem
            {...defaultProps}
            ref={ref}
            onResizeStart={onResizeStart}
            onResize={onResize}
            onResizeStop={onResizeStop}
          />
        </div>,
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
        handle.onResizeStop(new Event("resize"), resizeData, position);
      });

      expect(onResizeStart).toHaveBeenCalled();
      expect(onResize).toHaveBeenCalled();
      expect(onResizeStop).toHaveBeenCalled();
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
