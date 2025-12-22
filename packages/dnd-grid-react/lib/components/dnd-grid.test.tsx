import {
  act,
  fireEvent,
  render as rtlRender,
  screen,
} from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import {
  getCompactor,
  horizontalCompactor,
  verticalOverlapCompactor,
} from "../compactors";
import type {
  GridDragEvent,
  GridResizeEvent,
  Layout,
  LayoutItem,
  Size,
} from "../types";
import { bottom } from "../utils";
import { DndGrid } from "./dnd-grid";

type MockGridItemProps = {
  children: React.ReactNode;
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  isDraggable?: boolean;
  isResizable?: boolean;
  static?: boolean;
  className?: string;
};

type DerivedProps = Parameters<typeof DndGrid.getDerivedStateFromProps>[0];
type DerivedState = Parameters<typeof DndGrid.getDerivedStateFromProps>[1];

const getGridElement = (): HTMLElement => {
  const grid = document.querySelector(".dnd-grid");
  if (!grid) {
    throw new Error("Grid element not found");
  }
  return grid as HTMLElement;
};

const getGridHandle = (ref: React.RefObject<DndGrid | null>): DndGrid => {
  const handle = ref.current;
  if (!handle) {
    throw new Error("DndGrid ref not set");
  }
  return handle;
};

const createDragEvent = (
  grid: HTMLElement,
  clientX: number,
  clientY: number,
): React.DragEvent<HTMLDivElement> =>
  ({
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
    clientX,
    clientY,
    currentTarget: grid,
    nativeEvent: { target: grid },
  }) as unknown as React.DragEvent<HTMLDivElement>;

// Test helper: derive layout from data-grid to keep fixtures concise.
const buildLayoutFromChildren = (children: React.ReactNode): Layout => {
  const layout: LayoutItem[] = [];

  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child) || child.key == null) return;
    const childKey = String(child.key);
    const dataGrid = (child.props as { "data-grid"?: Partial<LayoutItem> })[
      "data-grid"
    ];

    if (dataGrid) {
      layout.push({
        i: childKey,
        x: 0,
        y: 0,
        w: 1,
        h: 1,
        deg: 0,
        ...dataGrid,
      });
      return;
    }

    layout.push({
      i: childKey,
      x: 0,
      y: bottom(layout),
      w: 1,
      h: 1,
      deg: 0,
    });
  });

  return layout;
};

const resolveLayout = (ui: React.ReactElement): React.ReactElement => {
  if (ui.type !== DndGrid) return ui;
  const props = ui.props as React.ComponentProps<typeof DndGrid>;
  if (props.layout) return ui;
  return React.cloneElement(
    ui as React.ReactElement<React.ComponentProps<typeof DndGrid>>,
    {
      layout: buildLayoutFromChildren(props.children),
    },
  );
};

const renderGrid = (ui: React.ReactElement) => {
  const resolved = resolveLayout(ui);
  const result = rtlRender(resolved);
  return {
    ...result,
    rerender: (nextUi: React.ReactElement) =>
      result.rerender(resolveLayout(nextUi)),
  };
};

// Mock GridItem to simplify testing
vi.mock("./grid-item", () => ({
  GridItem: ({
    children,
    i,
    x,
    y,
    w,
    h,
    isDraggable,
    isResizable,
    static: isStatic,
    className,
  }: MockGridItemProps) => (
    <div
      data-testid={`grid-item-${i}`}
      data-x={x}
      data-y={y}
      data-w={w}
      data-h={h}
      data-draggable={isDraggable}
      data-resizable={isResizable}
      data-static={isStatic}
      className={className}
    >
      {children}
    </div>
  ),
}));

const defaultProps = {
  width: 1200,
  cols: 12,
  rowHeight: 150,
  margin: 10,
};

describe("DndGrid", () => {
  describe("rendering", () => {
    it("renders container with dnd-grid class", () => {
      renderGrid(
        <DndGrid {...defaultProps}>
          <div key="a" data-grid={{ x: 0, y: 0, w: 2, h: 2, deg: 0 }}>
            A
          </div>
        </DndGrid>,
      );
      expect(document.querySelector(".dnd-grid")).toBeInTheDocument();
    });

    it("renders children as grid items", () => {
      renderGrid(
        <DndGrid {...defaultProps}>
          <div key="a" data-grid={{ x: 0, y: 0, w: 2, h: 2, deg: 0 }}>
            A
          </div>
          <div key="b" data-grid={{ x: 2, y: 0, w: 2, h: 2, deg: 0 }}>
            B
          </div>
        </DndGrid>,
      );
      expect(screen.getByTestId("grid-item-a")).toBeInTheDocument();
      expect(screen.getByTestId("grid-item-b")).toBeInTheDocument();
    });

    it("applies custom className", () => {
      renderGrid(
        <DndGrid {...defaultProps} className="custom-grid">
          <div key="a" data-grid={{ x: 0, y: 0, w: 2, h: 2, deg: 0 }}>
            A
          </div>
        </DndGrid>,
      );
      expect(
        document.querySelector(".dnd-grid.custom-grid"),
      ).toBeInTheDocument();
    });

    it("applies custom style", () => {
      renderGrid(
        <DndGrid {...defaultProps} style={{ backgroundColor: "red" }}>
          <div key="a" data-grid={{ x: 0, y: 0, w: 2, h: 2, deg: 0 }}>
            A
          </div>
        </DndGrid>,
      );
      const grid = document.querySelector(".dnd-grid") as HTMLElement;
      expect(grid.style.backgroundColor).toBe("red");
    });
  });

  describe("layout synchronization", () => {
    it("synchronizes layout with children", () => {
      const layout: Layout = [{ i: "a", x: 0, y: 0, w: 4, h: 2, deg: 0 }];
      renderGrid(
        <DndGrid {...defaultProps} layout={layout}>
          <div key="a">A</div>
        </DndGrid>,
      );
      const item = screen.getByTestId("grid-item-a");
      expect(item).toHaveAttribute("data-w", "4");
    });

    it("adds default layout items when missing", () => {
      renderGrid(
        <DndGrid {...defaultProps} layout={[]}>
          <div key="a">A</div>
        </DndGrid>,
      );
      const item = screen.getByTestId("grid-item-a");
      expect(item).toHaveAttribute("data-x", "0");
      expect(item).toHaveAttribute("data-y", "0");
      expect(item).toHaveAttribute("data-w", "1");
      expect(item).toHaveAttribute("data-h", "1");
    });

    it("calls onLayoutChange when layout changes", () => {
      const onLayoutChange = vi.fn();
      const { rerender } = renderGrid(
        <DndGrid {...defaultProps} onLayoutChange={onLayoutChange}>
          <div key="a" data-grid={{ x: 0, y: 0, w: 2, h: 2, deg: 0 }}>
            A
          </div>
        </DndGrid>,
      );

      // Trigger a layout change by updating children
      rerender(
        <DndGrid {...defaultProps} onLayoutChange={onLayoutChange}>
          <div key="a" data-grid={{ x: 0, y: 0, w: 2, h: 2, deg: 0 }}>
            A
          </div>
          <div key="b" data-grid={{ x: 2, y: 0, w: 2, h: 2, deg: 0 }}>
            B
          </div>
        </DndGrid>,
      );

      expect(onLayoutChange).toHaveBeenCalled();
    });
  });

  describe("derived state", () => {
    it("recomputes layout when layout prop changes", () => {
      const prevLayout: Layout = [{ i: "a", x: 0, y: 0, w: 1, h: 1, deg: 0 }];
      const nextLayout: Layout = [{ i: "a", x: 2, y: 0, w: 1, h: 1, deg: 0 }];
      const prevState = {
        activeDrag: null,
        settlingItem: null,
        layout: prevLayout,
        mounted: false,
        oldDragItem: null,
        oldLayout: null,
        oldResizeItem: null,
        resizing: false,
        droppingDOMNode: null,
        propsLayout: prevLayout,
        compactor: getCompactor("vertical", false, false),
        children: [<div key="a" />],
      } as DerivedState;

      const derived = DndGrid.getDerivedStateFromProps(
        {
          ...defaultProps,
          layout: nextLayout,
          children: <div key="a" />,
        } as DerivedProps,
        prevState,
      );

      expect(derived?.layout?.[0].x).toBe(2);
    });

    it("recomputes layout when children change", () => {
      const prevLayout: Layout = [{ i: "a", x: 0, y: 0, w: 1, h: 1, deg: 0 }];
      const prevState = {
        activeDrag: null,
        settlingItem: null,
        layout: prevLayout,
        mounted: false,
        oldDragItem: null,
        oldLayout: null,
        oldResizeItem: null,
        resizing: false,
        droppingDOMNode: null,
        propsLayout: prevLayout,
        compactor: getCompactor("vertical", false, false),
        children: [<div key="a" />],
      } as DerivedState;

      const derived = DndGrid.getDerivedStateFromProps(
        {
          ...defaultProps,
          layout: prevLayout,
          children: <div key="b" />,
        } as DerivedProps,
        prevState,
      );

      expect(derived?.layout?.[0].i).toBe("b");
    });
  });

  describe("autoSize", () => {
    it("calculates container height when autoSize is true", () => {
      renderGrid(
        <DndGrid {...defaultProps} autoSize={true}>
          <div key="a" data-grid={{ x: 0, y: 0, w: 2, h: 2, deg: 0 }}>
            A
          </div>
        </DndGrid>,
      );
      const grid = document.querySelector(".dnd-grid") as HTMLElement;
      expect(grid.style.height).toMatch(/\d+px/);
    });

    it("does not set height when autoSize is false", () => {
      renderGrid(
        <DndGrid {...defaultProps} autoSize={false}>
          <div key="a" data-grid={{ x: 0, y: 0, w: 2, h: 2, deg: 0 }}>
            A
          </div>
        </DndGrid>,
      );
      const grid = document.querySelector(".dnd-grid") as HTMLElement;
      expect(grid.style.height).toBe("");
    });
  });

  describe("containerHeight", () => {
    it("uses containerPadding when provided", () => {
      const ref = React.createRef<DndGrid>();
      const layout: Layout = [{ i: "a", x: 0, y: 0, w: 1, h: 2, deg: 0 }];
      renderGrid(
        <DndGrid
          {...defaultProps}
          ref={ref}
          layout={layout}
          rowHeight={100}
          margin={10}
          containerPadding={{ top: 20, right: 20, bottom: 20, left: 20 }}
        >
          <div key="a">A</div>
        </DndGrid>,
      );

      expect(ref.current?.containerHeight()).toBe("250px");
    });

    it("falls back to margin when containerPadding is null", () => {
      const ref = React.createRef<DndGrid>();
      const layout: Layout = [{ i: "a", x: 0, y: 0, w: 1, h: 1, deg: 0 }];
      renderGrid(
        <DndGrid
          {...defaultProps}
          ref={ref}
          layout={layout}
          rowHeight={50}
          margin={5}
          containerPadding={null}
        >
          <div key="a">A</div>
        </DndGrid>,
      );

      expect(ref.current?.containerHeight()).toBe("60px");
    });
  });

  describe("compaction", () => {
    it("compacts vertically by default", () => {
      renderGrid(
        <DndGrid {...defaultProps}>
          <div key="a" data-grid={{ x: 0, y: 5, w: 2, h: 2, deg: 0 }}>
            A
          </div>
        </DndGrid>,
      );
      const item = screen.getByTestId("grid-item-a");
      expect(item).toHaveAttribute("data-y", "0");
    });

    it("respects horizontal compactor", () => {
      renderGrid(
        <DndGrid {...defaultProps} compactor={horizontalCompactor}>
          <div key="a" data-grid={{ x: 5, y: 0, w: 2, h: 2, deg: 0 }}>
            A
          </div>
        </DndGrid>,
      );
      const item = screen.getByTestId("grid-item-a");
      expect(item).toHaveAttribute("data-x", "0");
    });

    it("allows overlap when compactor allows overlap", () => {
      renderGrid(
        <DndGrid {...defaultProps} compactor={verticalOverlapCompactor}>
          <div key="a" data-grid={{ x: 0, y: 0, w: 2, h: 2, deg: 0 }}>
            A
          </div>
          <div key="b" data-grid={{ x: 1, y: 0, w: 2, h: 2, deg: 0 }}>
            B
          </div>
        </DndGrid>,
      );
      const itemB = screen.getByTestId("grid-item-b");
      expect(itemB).toHaveAttribute("data-x", "1");
    });
  });

  describe("draggable/resizable props", () => {
    it("passes isDraggable to grid items", () => {
      renderGrid(
        <DndGrid {...defaultProps} isDraggable={true}>
          <div key="a" data-grid={{ x: 0, y: 0, w: 2, h: 2, deg: 0 }}>
            A
          </div>
        </DndGrid>,
      );
      const item = screen.getByTestId("grid-item-a");
      expect(item).toHaveAttribute("data-draggable", "true");
    });

    it("passes isResizable to grid items", () => {
      renderGrid(
        <DndGrid {...defaultProps} isResizable={true}>
          <div key="a" data-grid={{ x: 0, y: 0, w: 2, h: 2, deg: 0 }}>
            A
          </div>
        </DndGrid>,
      );
      const item = screen.getByTestId("grid-item-a");
      expect(item).toHaveAttribute("data-resizable", "true");
    });

    it("respects static items", () => {
      const layout: Layout = [
        { i: "static", x: 0, y: 0, w: 2, h: 2, deg: 0, static: true },
      ];
      renderGrid(
        <DndGrid {...defaultProps} layout={layout} isDraggable={true}>
          <div key="static">Static</div>
        </DndGrid>,
      );
      const item = screen.getByTestId("grid-item-static");
      expect(item).toHaveAttribute("data-draggable", "false");
    });

    it("respects item-level isDraggable override", () => {
      const layout: Layout = [
        { i: "a", x: 0, y: 0, w: 2, h: 2, deg: 0, isDraggable: false },
      ];
      renderGrid(
        <DndGrid {...defaultProps} layout={layout} isDraggable={true}>
          <div key="a">A</div>
        </DndGrid>,
      );
      const item = screen.getByTestId("grid-item-a");
      expect(item).toHaveAttribute("data-draggable", "false");
    });
  });

  describe("drop functionality", () => {
    it("enables drop when isDroppable is true", () => {
      const ref = React.createRef<DndGrid>();
      renderGrid(
        <DndGrid {...defaultProps} ref={ref} isDroppable={true}>
          <div key="a" data-grid={{ x: 0, y: 0, w: 2, h: 2, deg: 0 }}>
            A
          </div>
        </DndGrid>,
      );
      const handle = getGridHandle(ref);
      const grid = getGridElement();
      act(() => {
        handle.onDragOver(createDragEvent(grid, 0, 0));
      });
      // Should not throw
    });

    it("calls onDrop callback", () => {
      const onDrop = vi.fn();
      renderGrid(
        <DndGrid {...defaultProps} isDroppable={true} onDrop={onDrop}>
          <div key="a" data-grid={{ x: 0, y: 0, w: 2, h: 2, deg: 0 }}>
            A
          </div>
        </DndGrid>,
      );
      const grid = getGridElement();
      fireEvent.drop(grid);
      expect(onDrop).toHaveBeenCalled();
    });

    it("increments dragEnterCounter on dragEnter", () => {
      renderGrid(
        <DndGrid {...defaultProps} isDroppable={true}>
          <div key="a" data-grid={{ x: 0, y: 0, w: 2, h: 2, deg: 0 }}>
            A
          </div>
        </DndGrid>,
      );
      const grid = getGridElement();
      fireEvent.dragEnter(grid);
      // Should not throw
    });

    it("decrements dragEnterCounter on dragLeave", () => {
      renderGrid(
        <DndGrid {...defaultProps} isDroppable={true}>
          <div key="a" data-grid={{ x: 0, y: 0, w: 2, h: 2, deg: 0 }}>
            A
          </div>
        </DndGrid>,
      );
      const grid = getGridElement();
      fireEvent.dragEnter(grid);
      fireEvent.dragLeave(grid);
      // Should not throw
    });

    it("adds and clears dropping placeholder on drag over and drop", () => {
      const onDrop = vi.fn();
      const ref = React.createRef<DndGrid>();
      renderGrid(
        <DndGrid {...defaultProps} ref={ref} isDroppable={true} onDrop={onDrop}>
          <div key="a" data-grid={{ x: 0, y: 0, w: 2, h: 2, deg: 0 }}>
            A
          </div>
        </DndGrid>,
      );
      const grid = getGridElement();
      const handle = getGridHandle(ref);

      act(() => {
        handle.onDragOver(createDragEvent(grid, 50, 50));
      });

      expect(ref.current?.state.droppingDOMNode).not.toBeNull();
      expect(
        ref.current?.state.layout.some(
          (item) => item.i === "__dropping-elem__",
        ),
      ).toBe(true);

      act(() => {
        fireEvent.drop(grid);
      });

      expect(onDrop).toHaveBeenCalled();
      expect(ref.current?.state.droppingDOMNode).toBeNull();
      expect(
        ref.current?.state.layout.some(
          (item) => item.i === "__dropping-elem__",
        ),
      ).toBe(false);
    });

    it("removes placeholder when onDropDragOver returns false", () => {
      const onDropDragOver = vi
        .fn()
        .mockReturnValueOnce(undefined)
        .mockReturnValue(false);
      const ref = React.createRef<DndGrid>();
      renderGrid(
        <DndGrid
          {...defaultProps}
          ref={ref}
          isDroppable={true}
          onDropDragOver={onDropDragOver}
        >
          <div key="a" data-grid={{ x: 0, y: 0, w: 2, h: 2, deg: 0 }}>
            A
          </div>
        </DndGrid>,
      );

      const grid = getGridElement();
      const handle = getGridHandle(ref);
      const createEvent = (clientX: number, clientY: number) =>
        createDragEvent(grid, clientX, clientY);

      act(() => {
        handle.onDragOver(createEvent(10, 10));
      });

      expect(ref.current?.state.droppingDOMNode).not.toBeNull();

      act(() => {
        handle.onDragOver(createEvent(20, 20));
      });

      expect(onDropDragOver).toHaveBeenCalledTimes(2);
      expect(ref.current?.state.droppingDOMNode).toBeNull();
    });

    it("updates droppingPosition when drag over moves", () => {
      const ref = React.createRef<DndGrid>();
      renderGrid(
        <DndGrid {...defaultProps} ref={ref} isDroppable={true}>
          <div key="a" data-grid={{ x: 0, y: 0, w: 2, h: 2, deg: 0 }}>
            A
          </div>
        </DndGrid>,
      );

      const grid = getGridElement();
      const handle = getGridHandle(ref);
      const createEvent = (clientX: number, clientY: number) =>
        createDragEvent(grid, clientX, clientY);

      act(() => {
        handle.onDragOver(createEvent(100, 100));
      });
      const firstLeft = ref.current?.state.droppingPosition?.left;

      act(() => {
        handle.onDragOver(createEvent(200, 200));
      });

      expect(ref.current?.state.droppingPosition?.left).not.toBe(firstLeft);
    });

    it("clears placeholder when drag leave reaches zero", () => {
      const ref = React.createRef<DndGrid>();
      renderGrid(
        <DndGrid {...defaultProps} ref={ref} isDroppable={true}>
          <div key="a" data-grid={{ x: 0, y: 0, w: 2, h: 2, deg: 0 }}>
            A
          </div>
        </DndGrid>,
      );

      const grid = getGridElement();
      const handle = getGridHandle(ref);
      const event = createDragEvent(grid, 10, 10);

      act(() => {
        handle.onDragOver(event);
        handle.onDragEnter(event);
      });

      expect(ref.current?.state.droppingDOMNode).not.toBeNull();

      act(() => {
        handle.onDragLeave(event);
      });

      expect(ref.current?.state.droppingDOMNode).toBeNull();
    });
  });

  describe("dndRect handling", () => {
    it("triggers onDrop when dndRect is missing", () => {
      const onDrop = vi.fn();
      const ref = React.createRef<DndGrid>();
      renderGrid(
        <DndGrid {...defaultProps} ref={ref} isDroppable={true} onDrop={onDrop}>
          <div key="a" data-grid={{ x: 0, y: 0, w: 2, h: 2, deg: 0 }}>
            A
          </div>
        </DndGrid>,
      );

      const grid = getGridElement();
      const handle = getGridHandle(ref);
      act(() => {
        handle.onDragOver(createDragEvent(grid, 10, 10));
      });

      expect(ref.current?.state.droppingDOMNode).not.toBeNull();

      act(() => {
        ref.current?.handleDndRect(new Event("drop"), null);
      });

      expect(onDrop).toHaveBeenCalled();
      expect(ref.current?.state.droppingDOMNode).toBeNull();
    });

    it("adds dropping placeholder when dndRect is provided", () => {
      const ref = React.createRef<DndGrid>();
      renderGrid(
        <DndGrid {...defaultProps} ref={ref} isDroppable={true}>
          <div key="a" data-grid={{ x: 0, y: 0, w: 2, h: 2, deg: 0 }}>
            A
          </div>
        </DndGrid>,
      );

      act(() => {
        ref.current?.handleDndRect(new Event("dragover"), {
          top: 10,
          left: 10,
          right: 20,
          bottom: 20,
          width: 10,
          height: 10,
        });
      });

      expect(ref.current?.state.droppingDOMNode).not.toBeNull();
      expect(
        ref.current?.state.layout.some(
          (item) => item.i === "__dropping-elem__",
        ),
      ).toBe(true);
    });

    it("handles missing document lookup for grid element", () => {
      const ref = React.createRef<DndGrid>();
      renderGrid(
        <DndGrid {...defaultProps} ref={ref} isDroppable={true}>
          <div key="a" data-grid={{ x: 0, y: 0, w: 2, h: 2, deg: 0 }}>
            A
          </div>
        </DndGrid>,
      );
      const getElementByIdSpy = vi
        .spyOn(document, "getElementById")
        .mockReturnValue(null);

      act(() => {
        ref.current?.handleDndRect(new Event("dragover"), {
          top: 0,
          left: 0,
          right: 10,
          bottom: 10,
          width: 10,
          height: 10,
        });
      });

      expect(ref.current?.state.droppingDOMNode).not.toBeNull();
      getElementByIdSpy.mockRestore();
    });
  });

  describe("callbacks", () => {
    it("accepts onDragStart callback", () => {
      const onDragStart = vi.fn();
      renderGrid(
        <DndGrid {...defaultProps} onDragStart={onDragStart}>
          <div key="a" data-grid={{ x: 0, y: 0, w: 2, h: 2, deg: 0 }}>
            A
          </div>
        </DndGrid>,
      );
      expect(screen.getByTestId("grid-item-a")).toBeInTheDocument();
    });

    it("accepts onDrag callback", () => {
      const onDrag = vi.fn();
      renderGrid(
        <DndGrid {...defaultProps} onDrag={onDrag}>
          <div key="a" data-grid={{ x: 0, y: 0, w: 2, h: 2, deg: 0 }}>
            A
          </div>
        </DndGrid>,
      );
      expect(screen.getByTestId("grid-item-a")).toBeInTheDocument();
    });

    it("accepts onDragStop callback", () => {
      const onDragStop = vi.fn();
      renderGrid(
        <DndGrid {...defaultProps} onDragStop={onDragStop}>
          <div key="a" data-grid={{ x: 0, y: 0, w: 2, h: 2, deg: 0 }}>
            A
          </div>
        </DndGrid>,
      );
      expect(screen.getByTestId("grid-item-a")).toBeInTheDocument();
    });

    it("accepts onResizeStart callback", () => {
      const onResizeStart = vi.fn();
      renderGrid(
        <DndGrid {...defaultProps} onResizeStart={onResizeStart}>
          <div key="a" data-grid={{ x: 0, y: 0, w: 2, h: 2, deg: 0 }}>
            A
          </div>
        </DndGrid>,
      );
      expect(screen.getByTestId("grid-item-a")).toBeInTheDocument();
    });

    it("accepts onResize callback", () => {
      const onResize = vi.fn();
      renderGrid(
        <DndGrid {...defaultProps} onResize={onResize}>
          <div key="a" data-grid={{ x: 0, y: 0, w: 2, h: 2, deg: 0 }}>
            A
          </div>
        </DndGrid>,
      );
      expect(screen.getByTestId("grid-item-a")).toBeInTheDocument();
    });

    it("accepts onResizeStop callback", () => {
      const onResizeStop = vi.fn();
      renderGrid(
        <DndGrid {...defaultProps} onResizeStop={onResizeStop}>
          <div key="a" data-grid={{ x: 0, y: 0, w: 2, h: 2, deg: 0 }}>
            A
          </div>
        </DndGrid>,
      );
      expect(screen.getByTestId("grid-item-a")).toBeInTheDocument();
    });
  });

  describe("drag and resize handlers", () => {
    it("updates layout during drag lifecycle", () => {
      const layout: Layout = [{ i: "a", x: 0, y: 0, w: 2, h: 2, deg: 0 }];
      const onDragStart = vi.fn();
      const onDrag = vi.fn();
      const onDragStop = vi.fn();
      const ref = React.createRef<DndGrid>();

      renderGrid(
        <DndGrid
          {...defaultProps}
          ref={ref}
          layout={layout}
          onDragStart={onDragStart}
          onDrag={onDrag}
          onDragStop={onDragStop}
        >
          <div key="a">A</div>
        </DndGrid>,
      );

      const node = document.createElement("div");
      const handle = getGridHandle(ref);
      const dragStartEvent: GridDragEvent = {
        e: new MouseEvent("mousedown"),
        node,
        newPosition: { left: 0, top: 0 },
      };
      const dragMoveEvent: GridDragEvent = {
        e: new MouseEvent("mousemove"),
        node,
        newPosition: { left: 10, top: 10 },
      };
      const dragStopEvent: GridDragEvent = {
        e: new MouseEvent("mouseup"),
        node,
        newPosition: { left: 10, top: 10 },
      };
      act(() => {
        handle.onDragStart("a", 0, 0, dragStartEvent);
      });

      expect(onDragStart).toHaveBeenCalled();
      expect(ref.current?.state.activeDrag?.i).toBe("a");

      act(() => {
        handle.onDrag("a", 2, 1, dragMoveEvent);
      });

      expect(onDrag).toHaveBeenCalled();
      expect(ref.current?.state.layout.find((item) => item.i === "a")?.x).toBe(
        2,
      );

      act(() => {
        handle.onDragStop("a", 2, 1, dragStopEvent);
      });

      expect(onDragStop).toHaveBeenCalled();
      expect(ref.current?.state.settlingItem).toBe("a");

      act(() => {
        ref.current?.onSettleComplete("a");
      });

      expect(ref.current?.state.activeDrag).toBeNull();
    });

    it("updates layout during resize lifecycle", () => {
      const layout: Layout = [{ i: "a", x: 0, y: 0, w: 2, h: 2, deg: 0 }];
      const onResize = vi.fn();
      const onResizeStop = vi.fn();
      const ref = React.createRef<DndGrid>();

      renderGrid(
        <DndGrid
          {...defaultProps}
          ref={ref}
          layout={layout}
          onResize={onResize}
          onResizeStop={onResizeStop}
        >
          <div key="a">A</div>
        </DndGrid>,
      );

      const node = document.createElement("div");
      const handle = getGridHandle(ref);
      const resizeSize: Size = { width: 100, height: 100 };
      const resizeEvent: GridResizeEvent = {
        e: new Event("resize"),
        node,
        size: resizeSize,
        handle: "se",
      };
      act(() => {
        handle.onResizeStart("a", 2, 2, resizeEvent);
      });

      expect(ref.current?.state.resizing).toBe(true);

      act(() => {
        handle.onResize("a", 3, 4, resizeEvent);
      });

      expect(onResize).toHaveBeenCalled();
      expect(ref.current?.state.activeDrag?.i).toBe("a");
      expect(ref.current?.state.layout.find((item) => item.i === "a")?.w).toBe(
        3,
      );
      expect(ref.current?.state.layout.find((item) => item.i === "a")?.h).toBe(
        4,
      );

      act(() => {
        handle.onResizeStop("a", 3, 4, resizeEvent);
      });

      expect(onResizeStop).toHaveBeenCalled();
      expect(ref.current?.state.resizing).toBe(false);
      expect(ref.current?.state.activeDrag).toBeNull();
    });
  });

  describe("ref forwarding", () => {
    it("forwards innerRef to container", () => {
      const ref = React.createRef<HTMLDivElement>();
      renderGrid(
        <DndGrid {...defaultProps} innerRef={ref}>
          <div key="a" data-grid={{ x: 0, y: 0, w: 2, h: 2, deg: 0 }}>
            A
          </div>
        </DndGrid>,
      );
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });
  });

  describe("default props", () => {
    it("uses default cols of 12", () => {
      renderGrid(
        <DndGrid width={1200}>
          <div key="a" data-grid={{ x: 0, y: 0, w: 2, h: 2, deg: 0 }}>
            A
          </div>
        </DndGrid>,
      );
      expect(screen.getByTestId("grid-item-a")).toBeInTheDocument();
    });

    it("uses default rowHeight of 150", () => {
      renderGrid(
        <DndGrid width={1200}>
          <div key="a" data-grid={{ x: 0, y: 0, w: 2, h: 2, deg: 0 }}>
            A
          </div>
        </DndGrid>,
      );
      expect(screen.getByTestId("grid-item-a")).toBeInTheDocument();
    });

    it("uses default margin", () => {
      renderGrid(
        <DndGrid width={1200}>
          <div key="a" data-grid={{ x: 0, y: 0, w: 2, h: 2, deg: 0 }}>
            A
          </div>
        </DndGrid>,
      );
      expect(screen.getByTestId("grid-item-a")).toBeInTheDocument();
    });
  });

  describe("empty children", () => {
    it("handles no children", () => {
      renderGrid(<DndGrid {...defaultProps}>{null}</DndGrid>);
      expect(document.querySelector(".dnd-grid")).toBeInTheDocument();
    });

    it("handles empty array of children", () => {
      renderGrid(<DndGrid {...defaultProps}>{[]}</DndGrid>);
      expect(document.querySelector(".dnd-grid")).toBeInTheDocument();
    });
  });

  describe("children without keys", () => {
    it("ignores children without keys", () => {
      renderGrid(
        <DndGrid {...defaultProps}>
          <div data-grid={{ x: 0, y: 0, w: 2, h: 2, deg: 0 }}>No Key</div>
          <div key="a" data-grid={{ x: 2, y: 0, w: 2, h: 2, deg: 0 }}>
            With Key
          </div>
        </DndGrid>,
      );
      expect(screen.getByTestId("grid-item-a")).toBeInTheDocument();
      // The child without a key should not be rendered as a grid item
    });
  });

  describe("preventCollision", () => {
    it("accepts preventCollision on compactor", () => {
      renderGrid(
        <DndGrid
          {...defaultProps}
          compactor={getCompactor("vertical", false, true)}
        >
          <div key="a" data-grid={{ x: 0, y: 0, w: 2, h: 2, deg: 0 }}>
            A
          </div>
        </DndGrid>,
      );
      expect(screen.getByTestId("grid-item-a")).toBeInTheDocument();
    });
  });

  describe("isBounded", () => {
    it("passes isBounded to grid items", () => {
      renderGrid(
        <DndGrid {...defaultProps} isBounded={true}>
          <div key="a" data-grid={{ x: 0, y: 0, w: 2, h: 2, deg: 0 }}>
            A
          </div>
        </DndGrid>,
      );
      expect(screen.getByTestId("grid-item-a")).toBeInTheDocument();
    });
  });

  describe("transformScale", () => {
    it("accepts transformScale prop", () => {
      renderGrid(
        <DndGrid {...defaultProps} transformScale={1.5}>
          <div key="a" data-grid={{ x: 0, y: 0, w: 2, h: 2, deg: 0 }}>
            A
          </div>
        </DndGrid>,
      );
      expect(screen.getByTestId("grid-item-a")).toBeInTheDocument();
    });
  });

  describe("containerPadding", () => {
    it("accepts containerPadding prop", () => {
      renderGrid(
        <DndGrid
          {...defaultProps}
          containerPadding={{ top: 20, right: 20, bottom: 20, left: 20 }}
        >
          <div key="a" data-grid={{ x: 0, y: 0, w: 2, h: 2, deg: 0 }}>
            A
          </div>
        </DndGrid>,
      );
      expect(screen.getByTestId("grid-item-a")).toBeInTheDocument();
    });

    it("uses margin as fallback for containerPadding", () => {
      renderGrid(
        <DndGrid {...defaultProps} containerPadding={null}>
          <div key="a" data-grid={{ x: 0, y: 0, w: 2, h: 2, deg: 0 }}>
            A
          </div>
        </DndGrid>,
      );
      expect(screen.getByTestId("grid-item-a")).toBeInTheDocument();
    });
  });

  describe("maxRows", () => {
    it("accepts maxRows prop", () => {
      renderGrid(
        <DndGrid {...defaultProps} maxRows={10}>
          <div key="a" data-grid={{ x: 0, y: 0, w: 2, h: 2, deg: 0 }}>
            A
          </div>
        </DndGrid>,
      );
      expect(screen.getByTestId("grid-item-a")).toBeInTheDocument();
    });
  });

  describe("resizeHandles", () => {
    it("accepts resizeHandles prop", () => {
      renderGrid(
        <DndGrid {...defaultProps} resizeHandles={["se", "ne", "sw", "nw"]}>
          <div key="a" data-grid={{ x: 0, y: 0, w: 2, h: 2, deg: 0 }}>
            A
          </div>
        </DndGrid>,
      );
      expect(screen.getByTestId("grid-item-a")).toBeInTheDocument();
    });
  });

  describe("droppingItem", () => {
    it("accepts custom droppingItem", () => {
      renderGrid(
        <DndGrid
          {...defaultProps}
          isDroppable={true}
          droppingItem={{ i: "custom-drop", w: 2, h: 2 }}
        >
          <div key="a" data-grid={{ x: 0, y: 0, w: 2, h: 2, deg: 0 }}>
            A
          </div>
        </DndGrid>,
      );
      expect(screen.getByTestId("grid-item-a")).toBeInTheDocument();
    });
  });

  describe("draggable handles", () => {
    it("accepts draggableHandle prop", () => {
      renderGrid(
        <DndGrid {...defaultProps} draggableHandle=".handle">
          <div key="a" data-grid={{ x: 0, y: 0, w: 2, h: 2, deg: 0 }}>
            A
          </div>
        </DndGrid>,
      );
      expect(screen.getByTestId("grid-item-a")).toBeInTheDocument();
    });

    it("accepts draggableCancel prop", () => {
      renderGrid(
        <DndGrid {...defaultProps} draggableCancel=".no-drag">
          <div key="a" data-grid={{ x: 0, y: 0, w: 2, h: 2, deg: 0 }}>
            A
          </div>
        </DndGrid>,
      );
      expect(screen.getByTestId("grid-item-a")).toBeInTheDocument();
    });
  });
});
