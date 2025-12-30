import {
  act,
  fireEvent,
  render as rtlRender,
  screen,
} from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import {
  horizontalCompactor,
  verticalCompactor,
  verticalOverlapCompactor,
} from "../../compactors";
import type {
  AnimationConfig,
  GridItemDragEvent,
  GridItemResizeEvent,
  Layout,
  LayoutItem,
  Size,
} from "../../types";
import { bottom } from "../../utils";
import { DndGrid } from "../dnd-grid";

interface MockGridItemProps {
  children: React.ReactNode;
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  draggable?: boolean;
  resizable?: boolean;
  animationConfig?: AnimationConfig;
  static?: boolean;
  className?: string;
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
  clientY: number
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
    if (!React.isValidElement(child) || child.key == null) {
      return;
    }
    const childKey = String(child.key);
    const dataGrid = (child.props as { "data-grid"?: Partial<LayoutItem> })[
      "data-grid"
    ];

    if (dataGrid) {
      layout.push({
        id: childKey,
        x: 0,
        y: 0,
        w: 1,
        h: 1,
        ...dataGrid,
      });
      return;
    }

    layout.push({
      id: childKey,
      x: 0,
      y: bottom(layout),
      w: 1,
      h: 1,
    });
  });

  return layout;
};

const resolveLayout = (ui: React.ReactElement): React.ReactElement => {
  if (ui.type !== DndGrid) {
    return ui;
  }
  const props = ui.props as React.ComponentProps<typeof DndGrid>;
  if (props.layout) {
    return ui;
  }
  return React.cloneElement(
    ui as React.ReactElement<React.ComponentProps<typeof DndGrid>>,
    {
      layout: buildLayoutFromChildren(props.children),
    }
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
vi.mock("../grid-item", () => ({
  GridItem: ({
    children,
    id,
    x,
    y,
    w,
    h,
    draggable,
    resizable,
    static: isStatic,
    className,
    tabIndex,
    ariaRowIndex,
    ariaColIndex,
    ariaPosInSet,
    ariaSetSize,
    onItemFocus,
    onItemKeyDown,
    registerItemRef,
  }: MockGridItemProps) => (
    <div
      className={className}
      data-aria-colindex={ariaColIndex}
      data-aria-posinset={ariaPosInSet}
      data-aria-rowindex={ariaRowIndex}
      data-aria-setsize={ariaSetSize}
      data-dnd-grid-item=""
      data-dnd-grid-item-id={id}
      data-draggable={draggable}
      data-h={h}
      data-resizable={resizable}
      data-static={isStatic}
      data-testid={`grid-item-${id}`}
      data-w={w}
      data-x={x}
      data-y={y}
      onFocus={() => onItemFocus?.(id)}
      onKeyDown={(event) =>
        onItemKeyDown?.(event, id, { isPressed: false, isResizing: false })
      }
      ref={(node) => registerItemRef?.(id, node)}
      role="gridcell"
      tabIndex={tabIndex}
    >
      {children}
    </div>
  ),
}));

const defaultProps = {
  width: 1200,
  cols: 12,
  rowHeight: 150,
  gap: 10,
};

describe("DndGrid", () => {
  describe("rendering", () => {
    it("renders container with dnd-grid class", () => {
      renderGrid(
        <DndGrid {...defaultProps}>
          <div data-grid={{ x: 0, y: 0, w: 2, h: 2 }} key="a">
            A
          </div>
        </DndGrid>
      );
      expect(document.querySelector(".dnd-grid")).toBeInTheDocument();
    });

    it("renders children as grid items", () => {
      renderGrid(
        <DndGrid {...defaultProps}>
          <div data-grid={{ x: 0, y: 0, w: 2, h: 2 }} key="a">
            A
          </div>
          <div data-grid={{ x: 2, y: 0, w: 2, h: 2 }} key="b">
            B
          </div>
        </DndGrid>
      );
      expect(screen.getByTestId("grid-item-a")).toBeInTheDocument();
      expect(screen.getByTestId("grid-item-b")).toBeInTheDocument();
    });

    it("applies custom className", () => {
      renderGrid(
        <DndGrid {...defaultProps} className="custom-grid">
          <div data-grid={{ x: 0, y: 0, w: 2, h: 2 }} key="a">
            A
          </div>
        </DndGrid>
      );
      expect(
        document.querySelector(".dnd-grid.custom-grid")
      ).toBeInTheDocument();
    });

    it("applies custom style", () => {
      renderGrid(
        <DndGrid {...defaultProps} style={{ backgroundColor: "red" }}>
          <div data-grid={{ x: 0, y: 0, w: 2, h: 2 }} key="a">
            A
          </div>
        </DndGrid>
      );
      const grid = document.querySelector(".dnd-grid") as HTMLElement;
      expect(grid.style.backgroundColor).toBe("red");
    });
  });

  describe("aria semantics", () => {
    it("sets grid role and counts", () => {
      renderGrid(
        <DndGrid {...defaultProps} cols={4}>
          <div data-grid={{ x: 0, y: 0, w: 1, h: 2 }} key="a">
            A
          </div>
          <div data-grid={{ x: 1, y: 2, w: 1, h: 1 }} key="b">
            B
          </div>
        </DndGrid>
      );
      const grid = getGridElement();
      expect(grid).toHaveAttribute("role", "grid");
      expect(grid).toHaveAttribute("aria-colcount", "4");
      expect(grid).toHaveAttribute("aria-rowcount", "3");
    });

    it("accepts grid label props", () => {
      renderGrid(
        <DndGrid
          {...defaultProps}
          aria-describedby="grid-desc"
          aria-label="Layout grid"
          aria-labelledby="grid-label"
        >
          <div data-grid={{ x: 0, y: 0, w: 2, h: 2 }} key="a">
            A
          </div>
        </DndGrid>
      );
      const grid = getGridElement();
      expect(grid).toHaveAttribute("aria-label", "Layout grid");
      expect(grid).toHaveAttribute("aria-labelledby", "grid-label");
      expect(grid).toHaveAttribute("aria-describedby", "grid-desc");
    });

    it("computes item aria indices and set membership", () => {
      renderGrid(
        <DndGrid {...defaultProps}>
          <div data-grid={{ x: 0, y: 0, w: 1, h: 1 }} key="a">
            A
          </div>
          <div data-grid={{ x: 1, y: 0, w: 1, h: 1, static: true }} key="b">
            B
          </div>
          <div data-grid={{ x: 0, y: 1, w: 1, h: 1 }} key="c">
            C
          </div>
        </DndGrid>
      );

      const itemA = screen.getByTestId("grid-item-a");
      const itemB = screen.getByTestId("grid-item-b");
      const itemC = screen.getByTestId("grid-item-c");

      expect(itemA).toHaveAttribute("data-aria-rowindex", "1");
      expect(itemA).toHaveAttribute("data-aria-colindex", "1");
      expect(itemA).toHaveAttribute("data-aria-posinset", "1");
      expect(itemA).toHaveAttribute("data-aria-setsize", "2");

      expect(itemB).toHaveAttribute("data-aria-rowindex", "1");
      expect(itemB).toHaveAttribute("data-aria-colindex", "2");
      expect(itemB).not.toHaveAttribute("data-aria-posinset");
      expect(itemB).not.toHaveAttribute("data-aria-setsize");

      expect(itemC).toHaveAttribute("data-aria-rowindex", "2");
      expect(itemC).toHaveAttribute("data-aria-colindex", "1");
      expect(itemC).toHaveAttribute("data-aria-posinset", "2");
      expect(itemC).toHaveAttribute("data-aria-setsize", "2");
    });
  });

  describe("layout synchronization", () => {
    it("synchronizes layout with children", () => {
      const layout: Layout = [{ id: "a", x: 0, y: 0, w: 4, h: 2 }];
      renderGrid(
        <DndGrid {...defaultProps} layout={layout}>
          <div key="a">A</div>
        </DndGrid>
      );
      const item = screen.getByTestId("grid-item-a");
      expect(item).toHaveAttribute("data-w", "4");
    });

    it("adds default layout items when missing", () => {
      renderGrid(
        <DndGrid {...defaultProps} layout={[]}>
          <div key="a">A</div>
        </DndGrid>
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
          <div data-grid={{ x: 0, y: 0, w: 2, h: 2 }} key="a">
            A
          </div>
        </DndGrid>
      );

      // Trigger a layout change by updating children
      rerender(
        <DndGrid {...defaultProps} onLayoutChange={onLayoutChange}>
          <div data-grid={{ x: 0, y: 0, w: 2, h: 2 }} key="a">
            A
          </div>
          <div data-grid={{ x: 2, y: 0, w: 2, h: 2 }} key="b">
            B
          </div>
        </DndGrid>
      );

      expect(onLayoutChange).toHaveBeenCalled();
    });
  });

  describe("derived state", () => {
    it("recomputes layout when layout prop changes", () => {
      const prevLayout: Layout = [{ id: "a", x: 0, y: 0, w: 1, h: 1 }];
      const nextLayout: Layout = [{ id: "a", x: 2, y: 0, w: 1, h: 1 }];
      const prevState = {
        activeDrag: null,
        activeItemId: null,
        settlingItem: null,
        layout: prevLayout,
        mounted: false,
        oldDragItem: null,
        oldLayout: null,
        oldResizeItem: null,
        resizing: false,
        droppingDOMNode: null,
        propsLayout: prevLayout,
        compactor: verticalCompactor,
        children: [<div key="a" />],
      } as DerivedState;

      const derived = DndGrid.getDerivedStateFromProps(
        {
          ...defaultProps,
          layout: nextLayout,
          children: <div key="a" />,
        } as DerivedProps,
        prevState
      );

      expect(derived?.layout?.[0].x).toBe(2);
    });

    it("recomputes layout when children change", () => {
      const prevLayout: Layout = [{ id: "a", x: 0, y: 0, w: 1, h: 1 }];
      const prevState = {
        activeDrag: null,
        activeItemId: null,
        settlingItem: null,
        layout: prevLayout,
        mounted: false,
        oldDragItem: null,
        oldLayout: null,
        oldResizeItem: null,
        resizing: false,
        droppingDOMNode: null,
        propsLayout: prevLayout,
        compactor: verticalCompactor,
        children: [<div key="a" />],
      } as DerivedState;

      const derived = DndGrid.getDerivedStateFromProps(
        {
          ...defaultProps,
          layout: prevLayout,
          children: <div key="b" />,
        } as DerivedProps,
        prevState
      );

      expect(derived?.layout?.[0].id).toBe("b");
    });

    it("clears active drag when the active item is removed", () => {
      const prevLayout: Layout = [
        { id: "a", x: 0, y: 0, w: 1, h: 1 },
        { id: "b", x: 0, y: 2, w: 1, h: 1 },
      ];
      const nextLayout: Layout = [{ id: "b", x: 0, y: 2, w: 1, h: 1 }];
      const prevState = {
        activeDrag: { id: "a", x: 0, y: 0, w: 1, h: 1 },
        activeItemId: null,
        settlingItem: "a",
        layout: prevLayout,
        mounted: false,
        oldDragItem: { id: "a", x: 0, y: 0, w: 1, h: 1 },
        oldLayout: prevLayout,
        oldResizeItem: null,
        resizing: false,
        droppingDOMNode: null,
        propsLayout: prevLayout,
        compactor: verticalCompactor,
        children: [<div key="a" />, <div key="b" />],
      } as DerivedState;

      const derived = DndGrid.getDerivedStateFromProps(
        {
          ...defaultProps,
          layout: nextLayout,
          children: <div key="b" />,
        } as DerivedProps,
        prevState
      );

      expect(derived).not.toBeNull();
      expect(derived?.activeDrag).toBeNull();
      expect(derived?.settlingItem).toBeNull();
      expect(derived?.layout?.[0].id).toBe("b");
      expect(derived?.layout?.[0].y).toBe(0);
    });
  });

  describe("validation", () => {
    it("throws on invalid layout when validation is enabled", () => {
      const badLayout: Layout = [
        { id: "a", x: 0, y: 0, w: 1, h: 1 },
        { id: "a", x: 1, y: 0, w: 1, h: 1 },
      ];
      expect(() =>
        renderGrid(
          <DndGrid {...defaultProps} layout={badLayout} validation={true}>
            <div key="a">A</div>
          </DndGrid>
        )
      ).toThrow();
    });

    it("skips validation when disabled", () => {
      const badLayout: Layout = [
        { id: "a", x: 0, y: 0, w: 1, h: 1 },
        { id: "a", x: 1, y: 0, w: 1, h: 1 },
      ];
      expect(() =>
        renderGrid(
          <DndGrid {...defaultProps} layout={badLayout} validation={false}>
            <div key="a">A</div>
          </DndGrid>
        )
      ).not.toThrow();
    });
  });

  describe("autoSize", () => {
    it("calculates container height when autoSize is true", () => {
      renderGrid(
        <DndGrid {...defaultProps} autoSize={true}>
          <div data-grid={{ x: 0, y: 0, w: 2, h: 2 }} key="a">
            A
          </div>
        </DndGrid>
      );
      const grid = document.querySelector(".dnd-grid") as HTMLElement;
      expect(grid.style.height).toMatch(/\d+px/);
    });

    it("does not set height when autoSize is false", () => {
      renderGrid(
        <DndGrid {...defaultProps} autoSize={false}>
          <div data-grid={{ x: 0, y: 0, w: 2, h: 2 }} key="a">
            A
          </div>
        </DndGrid>
      );
      const grid = document.querySelector(".dnd-grid") as HTMLElement;
      expect(grid.style.height).toBe("");
    });
  });

  describe("containerHeight", () => {
    it("uses containerPadding when provided", () => {
      const ref = React.createRef<DndGrid>();
      const layout: Layout = [{ id: "a", x: 0, y: 0, w: 1, h: 2 }];
      renderGrid(
        <DndGrid
          {...defaultProps}
          containerPadding={{ top: 20, right: 20, bottom: 20, left: 20 }}
          gap={10}
          layout={layout}
          ref={ref}
          rowHeight={100}
        >
          <div key="a">A</div>
        </DndGrid>
      );

      expect(ref.current?.containerHeight()).toBe("250px");
    });

    it("falls back to gap when containerPadding is null", () => {
      const ref = React.createRef<DndGrid>();
      const layout: Layout = [{ id: "a", x: 0, y: 0, w: 1, h: 1 }];
      renderGrid(
        <DndGrid
          {...defaultProps}
          containerPadding={null}
          gap={5}
          layout={layout}
          ref={ref}
          rowHeight={50}
        >
          <div key="a">A</div>
        </DndGrid>
      );

      expect(ref.current?.containerHeight()).toBe("60px");
    });

    it("clamps empty layouts to zero height", () => {
      const ref = React.createRef<DndGrid>();
      renderGrid(
        <DndGrid
          {...defaultProps}
          containerPadding={0}
          gap={10}
          layout={[]}
          ref={ref}
          rowHeight={50}
        />
      );

      expect(ref.current?.containerHeight()).toBe("0px");
    });
  });

  describe("compaction", () => {
    it("compacts vertically by default", () => {
      renderGrid(
        <DndGrid {...defaultProps}>
          <div data-grid={{ x: 0, y: 5, w: 2, h: 2 }} key="a">
            A
          </div>
        </DndGrid>
      );
      const item = screen.getByTestId("grid-item-a");
      expect(item).toHaveAttribute("data-y", "0");
    });

    it("respects horizontal compactor", () => {
      renderGrid(
        <DndGrid {...defaultProps} compactor={horizontalCompactor}>
          <div data-grid={{ x: 5, y: 0, w: 2, h: 2 }} key="a">
            A
          </div>
        </DndGrid>
      );
      const item = screen.getByTestId("grid-item-a");
      expect(item).toHaveAttribute("data-x", "0");
    });

    it("allows overlap when compactor allows overlap", () => {
      renderGrid(
        <DndGrid {...defaultProps} compactor={verticalOverlapCompactor}>
          <div data-grid={{ x: 0, y: 0, w: 2, h: 2 }} key="a">
            A
          </div>
          <div data-grid={{ x: 1, y: 0, w: 2, h: 2 }} key="b">
            B
          </div>
        </DndGrid>
      );
      const itemB = screen.getByTestId("grid-item-b");
      expect(itemB).toHaveAttribute("data-x", "1");
    });
  });

  describe("draggable/resizable props", () => {
    it("passes draggable to grid items", () => {
      renderGrid(
        <DndGrid {...defaultProps} draggable={true}>
          <div data-grid={{ x: 0, y: 0, w: 2, h: 2 }} key="a">
            A
          </div>
        </DndGrid>
      );
      const item = screen.getByTestId("grid-item-a");
      expect(item).toHaveAttribute("data-draggable", "true");
    });

    it("passes resizable to grid items", () => {
      renderGrid(
        <DndGrid {...defaultProps} resizable={true}>
          <div data-grid={{ x: 0, y: 0, w: 2, h: 2 }} key="a">
            A
          </div>
        </DndGrid>
      );
      const item = screen.getByTestId("grid-item-a");
      expect(item).toHaveAttribute("data-resizable", "true");
    });

    it("respects static items", () => {
      const layout: Layout = [
        { id: "static", x: 0, y: 0, w: 2, h: 2, static: true },
      ];
      renderGrid(
        <DndGrid {...defaultProps} draggable={true} layout={layout}>
          <div key="static">Static</div>
        </DndGrid>
      );
      const item = screen.getByTestId("grid-item-static");
      expect(item).toHaveAttribute("data-draggable", "false");
    });

    it("respects item-level draggable override", () => {
      const layout: Layout = [
        { id: "a", x: 0, y: 0, w: 2, h: 2, draggable: false },
      ];
      renderGrid(
        <DndGrid {...defaultProps} draggable={true} layout={layout}>
          <div key="a">A</div>
        </DndGrid>
      );
      const item = screen.getByTestId("grid-item-a");
      expect(item).toHaveAttribute("data-draggable", "false");
    });
  });

  describe("drop functionality", () => {
    it("enables drop when onDrop is provided", () => {
      const ref = React.createRef<DndGrid>();
      const onDrop = vi.fn();
      renderGrid(
        <DndGrid {...defaultProps} onDrop={onDrop} ref={ref}>
          <div data-grid={{ x: 0, y: 0, w: 2, h: 2 }} key="a">
            A
          </div>
        </DndGrid>
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
        <DndGrid {...defaultProps} onDrop={onDrop}>
          <div data-grid={{ x: 0, y: 0, w: 2, h: 2 }} key="a">
            A
          </div>
        </DndGrid>
      );
      const grid = getGridElement();
      fireEvent.drop(grid);
      expect(onDrop).toHaveBeenCalled();
    });

    it("increments dragEnterCounter on dragEnter", () => {
      renderGrid(
        <DndGrid {...defaultProps} onDropDragOver={() => undefined}>
          <div data-grid={{ x: 0, y: 0, w: 2, h: 2 }} key="a">
            A
          </div>
        </DndGrid>
      );
      const grid = getGridElement();
      fireEvent.dragEnter(grid);
      // Should not throw
    });

    it("decrements dragEnterCounter on dragLeave", () => {
      renderGrid(
        <DndGrid {...defaultProps} onDropDragOver={() => undefined}>
          <div data-grid={{ x: 0, y: 0, w: 2, h: 2 }} key="a">
            A
          </div>
        </DndGrid>
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
        <DndGrid {...defaultProps} onDrop={onDrop} ref={ref}>
          <div data-grid={{ x: 0, y: 0, w: 2, h: 2 }} key="a">
            A
          </div>
        </DndGrid>
      );
      const grid = getGridElement();
      const handle = getGridHandle(ref);

      act(() => {
        handle.onDragOver(createDragEvent(grid, 50, 50));
      });

      expect(ref.current?.state.droppingDOMNode).not.toBeNull();
      expect(
        ref.current?.state.layout.some(
          (item) => item.id === "__dropping-elem__"
        )
      ).toBe(true);

      act(() => {
        fireEvent.drop(grid);
      });

      expect(onDrop).toHaveBeenCalled();
      expect(ref.current?.state.droppingDOMNode).toBeNull();
      expect(
        ref.current?.state.layout.some(
          (item) => item.id === "__dropping-elem__"
        )
      ).toBe(false);
    });

    it("removes placeholder when onDropDragOver returns false", () => {
      const onDropDragOver = vi
        .fn()
        .mockReturnValueOnce(undefined)
        .mockReturnValue(false);
      const ref = React.createRef<DndGrid>();
      renderGrid(
        <DndGrid {...defaultProps} onDropDragOver={onDropDragOver} ref={ref}>
          <div data-grid={{ x: 0, y: 0, w: 2, h: 2 }} key="a">
            A
          </div>
        </DndGrid>
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
        <DndGrid {...defaultProps} onDropDragOver={() => undefined} ref={ref}>
          <div data-grid={{ x: 0, y: 0, w: 2, h: 2 }} key="a">
            A
          </div>
        </DndGrid>
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
        <DndGrid {...defaultProps} onDropDragOver={() => undefined} ref={ref}>
          <div data-grid={{ x: 0, y: 0, w: 2, h: 2 }} key="a">
            A
          </div>
        </DndGrid>
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
        <DndGrid {...defaultProps} onDrop={onDrop} ref={ref}>
          <div data-grid={{ x: 0, y: 0, w: 2, h: 2 }} key="a">
            A
          </div>
        </DndGrid>
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
        <DndGrid {...defaultProps} onDropDragOver={() => undefined} ref={ref}>
          <div data-grid={{ x: 0, y: 0, w: 2, h: 2 }} key="a">
            A
          </div>
        </DndGrid>
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
          (item) => item.id === "__dropping-elem__"
        )
      ).toBe(true);
    });

    it("handles missing document lookup for grid element", () => {
      const ref = React.createRef<DndGrid>();
      renderGrid(
        <DndGrid {...defaultProps} onDropDragOver={() => undefined} ref={ref}>
          <div data-grid={{ x: 0, y: 0, w: 2, h: 2 }} key="a">
            A
          </div>
        </DndGrid>
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

    it("updates dropping placeholder with handleExternalDrag", () => {
      const ref = React.createRef<DndGrid>();
      renderGrid(
        <DndGrid {...defaultProps} onDropDragOver={() => undefined} ref={ref}>
          <div data-grid={{ x: 0, y: 0, w: 2, h: 2 }} key="a">
            A
          </div>
        </DndGrid>
      );

      act(() => {
        ref.current?.handleExternalDrag({ clientX: 10, clientY: 10 });
      });

      expect(ref.current?.state.droppingDOMNode).not.toBeNull();
    });

    it("uses event coordinates for handleExternalDrag", () => {
      const ref = React.createRef<DndGrid>();
      renderGrid(
        <DndGrid {...defaultProps} onDropDragOver={() => undefined} ref={ref}>
          <div data-grid={{ x: 0, y: 0, w: 2, h: 2 }} key="a">
            A
          </div>
        </DndGrid>
      );

      act(() => {
        ref.current?.handleExternalDrag({
          event: new MouseEvent("mousemove", { clientX: 10, clientY: 10 }),
        });
      });

      expect(ref.current?.state.droppingDOMNode).not.toBeNull();
    });

    it("commits drops with handleExternalDrag", () => {
      const onDrop = vi.fn();
      const ref = React.createRef<DndGrid>();
      renderGrid(
        <DndGrid {...defaultProps} onDrop={onDrop} ref={ref}>
          <div data-grid={{ x: 0, y: 0, w: 2, h: 2 }} key="a">
            A
          </div>
        </DndGrid>
      );

      act(() => {
        ref.current?.handleExternalDrag({ clientX: 10, clientY: 10 });
      });

      act(() => {
        ref.current?.handleExternalDrag({
          clientX: 10,
          clientY: 10,
          type: "drop",
        });
      });

      expect(onDrop).toHaveBeenCalled();
      expect(ref.current?.state.droppingDOMNode).toBeNull();
    });
  });

  describe("callbacks", () => {
    it("accepts onDragStart callback", () => {
      const onDragStart = vi.fn();
      renderGrid(
        <DndGrid {...defaultProps} onDragStart={onDragStart}>
          <div data-grid={{ x: 0, y: 0, w: 2, h: 2 }} key="a">
            A
          </div>
        </DndGrid>
      );
      expect(screen.getByTestId("grid-item-a")).toBeInTheDocument();
    });

    it("accepts onDrag callback", () => {
      const onDrag = vi.fn();
      renderGrid(
        <DndGrid {...defaultProps} onDrag={onDrag}>
          <div data-grid={{ x: 0, y: 0, w: 2, h: 2 }} key="a">
            A
          </div>
        </DndGrid>
      );
      expect(screen.getByTestId("grid-item-a")).toBeInTheDocument();
    });

    it("accepts onDragEnd callback", () => {
      const onDragEnd = vi.fn();
      renderGrid(
        <DndGrid {...defaultProps} onDragEnd={onDragEnd}>
          <div data-grid={{ x: 0, y: 0, w: 2, h: 2 }} key="a">
            A
          </div>
        </DndGrid>
      );
      expect(screen.getByTestId("grid-item-a")).toBeInTheDocument();
    });

    it("accepts onResizeStart callback", () => {
      const onResizeStart = vi.fn();
      renderGrid(
        <DndGrid {...defaultProps} onResizeStart={onResizeStart}>
          <div data-grid={{ x: 0, y: 0, w: 2, h: 2 }} key="a">
            A
          </div>
        </DndGrid>
      );
      expect(screen.getByTestId("grid-item-a")).toBeInTheDocument();
    });

    it("accepts onResize callback", () => {
      const onResize = vi.fn();
      renderGrid(
        <DndGrid {...defaultProps} onResize={onResize}>
          <div data-grid={{ x: 0, y: 0, w: 2, h: 2 }} key="a">
            A
          </div>
        </DndGrid>
      );
      expect(screen.getByTestId("grid-item-a")).toBeInTheDocument();
    });

    it("accepts onResizeEnd callback", () => {
      const onResizeEnd = vi.fn();
      renderGrid(
        <DndGrid {...defaultProps} onResizeEnd={onResizeEnd}>
          <div data-grid={{ x: 0, y: 0, w: 2, h: 2 }} key="a">
            A
          </div>
        </DndGrid>
      );
      expect(screen.getByTestId("grid-item-a")).toBeInTheDocument();
    });
  });

  describe("live announcements", () => {
    it("renders a live region by default", () => {
      renderGrid(
        <DndGrid {...defaultProps}>
          <div data-grid={{ x: 0, y: 0, w: 2, h: 2 }} key="a">
            A
          </div>
        </DndGrid>
      );
      const liveRegion = document.querySelector(
        "[data-dnd-grid-live-region]"
      ) as HTMLElement;
      expect(liveRegion).toBeInTheDocument();
      expect(liveRegion).toHaveAttribute("role", "status");
      expect(liveRegion).toHaveAttribute("aria-live", "polite");
      expect(liveRegion).toHaveAttribute("aria-atomic", "true");
    });

    it("can disable live announcements", () => {
      renderGrid(
        <DndGrid {...defaultProps} liveAnnouncements={false}>
          <div data-grid={{ x: 0, y: 0, w: 2, h: 2 }} key="a">
            A
          </div>
        </DndGrid>
      );
      expect(
        document.querySelector("[data-dnd-grid-live-region]")
      ).not.toBeInTheDocument();
    });

    it("announces drag, resize, and focus updates", () => {
      const announcements = {
        onDragStart: vi.fn(() => "drag-start"),
        onDrag: vi.fn(() => "drag-move"),
        onDragEnd: vi.fn(() => "drag-stop"),
        onResizeStart: vi.fn(() => "resize-start"),
        onResize: vi.fn(() => "resize"),
        onResizeEnd: vi.fn(() => "resize-stop"),
        onFocus: vi.fn(() => "focus"),
      };
      const layout: Layout = [{ id: "a", x: 0, y: 0, w: 2, h: 2 }];
      const ref = React.createRef<DndGrid>();

      renderGrid(
        <DndGrid
          {...defaultProps}
          layout={layout}
          liveAnnouncements={{ announcements }}
          ref={ref}
        >
          <div key="a">A</div>
        </DndGrid>
      );

      const liveRegion = document.querySelector(
        "[data-dnd-grid-live-region]"
      ) as HTMLElement;
      const node = document.createElement("div");
      const handle = getGridHandle(ref);
      const dragStartEvent: GridItemDragEvent = {
        id: "a",
        x: 0,
        y: 0,
        event: new MouseEvent("mousedown"),
        node,
        newPosition: { left: 0, top: 0 },
      };
      const dragMoveEvent: GridItemDragEvent = {
        id: "a",
        x: 1,
        y: 0,
        event: new MouseEvent("mousemove"),
        node,
        newPosition: { left: 10, top: 10 },
      };
      const dragEndEvent: GridItemDragEvent = {
        id: "a",
        x: 1,
        y: 0,
        event: new MouseEvent("mouseup"),
        node,
        newPosition: { left: 10, top: 10 },
      };

      act(() => {
        handle.onDragStart(dragStartEvent);
      });
      expect(announcements.onDragStart).toHaveBeenCalled();
      expect(liveRegion.textContent).toBe("drag-start");

      act(() => {
        handle.onDrag(dragMoveEvent);
      });
      expect(announcements.onDrag).toHaveBeenCalled();
      expect(liveRegion.textContent).toBe("drag-move");

      act(() => {
        handle.onDragEnd(dragEndEvent);
      });
      expect(announcements.onDragEnd).toHaveBeenCalled();
      expect(liveRegion.textContent).toBe("drag-stop");

      const resizeEvent: GridItemResizeEvent = {
        id: "a",
        w: 2,
        h: 2,
        event: new Event("resize"),
        node,
        size: { width: 100, height: 100 },
        handle: "se",
      };
      act(() => {
        handle.onResizeStart(resizeEvent);
      });
      expect(announcements.onResizeStart).toHaveBeenCalled();
      expect(liveRegion.textContent).toBe("resize-start");

      act(() => {
        handle.onResize({ ...resizeEvent, w: 3, h: 4 });
      });
      expect(announcements.onResize).toHaveBeenCalled();
      expect(liveRegion.textContent).toBe("resize");

      act(() => {
        handle.onResizeEnd({ ...resizeEvent, w: 3, h: 4 });
      });
      expect(announcements.onResizeEnd).toHaveBeenCalled();
      expect(liveRegion.textContent).toBe("resize-stop");

      const item = screen.getByTestId("grid-item-a");
      fireEvent.focus(item);
      expect(announcements.onFocus).toHaveBeenCalled();
      expect(liveRegion.textContent).toBe("focus");
    });

    it("dedupes drag move announcements by grid position", () => {
      const onDrag = vi.fn(() => "drag-move");
      const layout: Layout = [{ id: "a", x: 0, y: 0, w: 2, h: 2 }];
      const ref = React.createRef<DndGrid>();

      renderGrid(
        <DndGrid
          {...defaultProps}
          layout={layout}
          liveAnnouncements={{ announcements: { onDrag } }}
          ref={ref}
        >
          <div key="a">A</div>
        </DndGrid>
      );

      const node = document.createElement("div");
      const handle = getGridHandle(ref);
      const dragStartEvent: GridItemDragEvent = {
        id: "a",
        x: 0,
        y: 0,
        event: new MouseEvent("mousedown"),
        node,
        newPosition: { left: 0, top: 0 },
      };
      const dragMoveEvent: GridItemDragEvent = {
        id: "a",
        x: 1,
        y: 0,
        event: new MouseEvent("mousemove"),
        node,
        newPosition: { left: 10, top: 10 },
      };

      act(() => {
        handle.onDragStart(dragStartEvent);
      });
      act(() => {
        handle.onDrag(dragMoveEvent);
      });
      act(() => {
        handle.onDrag(dragMoveEvent);
      });

      expect(onDrag).toHaveBeenCalledTimes(1);
    });
  });

  describe("drag and resize handlers", () => {
    it("updates layout during drag lifecycle", () => {
      const layout: Layout = [{ id: "a", x: 0, y: 0, w: 2, h: 2 }];
      const onDragStart = vi.fn();
      const onDrag = vi.fn();
      const onDragEnd = vi.fn();
      const ref = React.createRef<DndGrid>();

      renderGrid(
        <DndGrid
          {...defaultProps}
          layout={layout}
          onDrag={onDrag}
          onDragEnd={onDragEnd}
          onDragStart={onDragStart}
          ref={ref}
        >
          <div key="a">A</div>
        </DndGrid>
      );

      const node = document.createElement("div");
      const handle = getGridHandle(ref);
      const dragStartEvent: GridItemDragEvent = {
        id: "a",
        x: 0,
        y: 0,
        event: new MouseEvent("mousedown"),
        node,
        newPosition: { left: 0, top: 0 },
      };
      const dragMoveEvent: GridItemDragEvent = {
        id: "a",
        x: 2,
        y: 1,
        event: new MouseEvent("mousemove"),
        node,
        newPosition: { left: 10, top: 10 },
      };
      const dragEndEvent: GridItemDragEvent = {
        id: "a",
        x: 2,
        y: 1,
        event: new MouseEvent("mouseup"),
        node,
        newPosition: { left: 10, top: 10 },
      };
      act(() => {
        handle.onDragStart(dragStartEvent);
      });

      expect(onDragStart).toHaveBeenCalled();
      const dragStartPayload = onDragStart.mock.calls[0][0];
      expect(dragStartPayload.type).toBe("dragStart");
      expect(dragStartPayload.item?.id).toBe("a");
      expect(ref.current?.state.activeDrag?.id).toBe("a");

      act(() => {
        handle.onDrag(dragMoveEvent);
      });

      expect(onDrag).toHaveBeenCalled();
      const dragPayload = onDrag.mock.calls[0][0];
      expect(dragPayload.type).toBe("drag");
      expect(dragPayload.item?.id).toBe("a");
      expect(ref.current?.state.layout.find((item) => item.id === "a")?.x).toBe(
        2
      );
      const draggedItem = ref.current?.state.layout.find(
        (item) => item.id === "a"
      );
      expect(ref.current?.state.activeDrag?.x).toBe(draggedItem?.x);
      expect(ref.current?.state.activeDrag?.y).toBe(draggedItem?.y);

      act(() => {
        handle.onDragEnd(dragEndEvent);
      });

      expect(onDragEnd).toHaveBeenCalled();
      const dragEndPayload = onDragEnd.mock.calls[0][0];
      expect(dragEndPayload.type).toBe("dragEnd");
      expect(dragEndPayload.item?.id).toBe("a");
      expect(ref.current?.state.settlingItem).toBe("a");
      const settledItem = ref.current?.state.layout.find(
        (item) => item.id === "a"
      );
      expect(ref.current?.state.activeDrag?.x).toBe(settledItem?.x);
      expect(ref.current?.state.activeDrag?.y).toBe(settledItem?.y);

      act(() => {
        ref.current?.onSettleComplete("a");
      });

      expect(ref.current?.state.activeDrag).toBeNull();
    });

    it("moves colliding items out of the way when dragging upward", () => {
      const layout: Layout = [
        { id: "a", x: 0, y: 0, w: 2, h: 2 },
        { id: "b", x: 0, y: 2, w: 2, h: 2 },
      ];
      const ref = React.createRef<DndGrid>();

      renderGrid(
        <DndGrid {...defaultProps} layout={layout} ref={ref}>
          <div key="a">A</div>
          <div key="b">B</div>
        </DndGrid>
      );

      const node = document.createElement("div");
      const handle = getGridHandle(ref);
      const dragStartEvent: GridItemDragEvent = {
        id: "b",
        x: 0,
        y: 2,
        event: new MouseEvent("mousedown"),
        node,
        newPosition: { left: 0, top: 0 },
      };
      const dragMoveEvent: GridItemDragEvent = {
        id: "b",
        x: 0,
        y: 0,
        event: new MouseEvent("mousemove"),
        node,
        newPosition: { left: 0, top: 0 },
      };

      act(() => {
        handle.onDragStart(dragStartEvent);
      });

      act(() => {
        handle.onDrag(dragMoveEvent);
      });

      const movedLayout = ref.current?.state.layout ?? [];
      const itemA = movedLayout.find((item) => item.id === "a");
      const itemB = movedLayout.find((item) => item.id === "b");

      expect(itemB?.y).toBe(0);
      expect(itemA?.y).toBe(2);
    });

    it("updates layout during resize lifecycle", () => {
      const layout: Layout = [{ id: "a", x: 0, y: 0, w: 2, h: 2 }];
      const onResize = vi.fn();
      const onResizeEnd = vi.fn();
      const ref = React.createRef<DndGrid>();

      renderGrid(
        <DndGrid
          {...defaultProps}
          layout={layout}
          onResize={onResize}
          onResizeEnd={onResizeEnd}
          ref={ref}
        >
          <div key="a">A</div>
        </DndGrid>
      );

      const node = document.createElement("div");
      const handle = getGridHandle(ref);
      const resizeSize: Size = { width: 100, height: 100 };
      const resizeEvent: GridItemResizeEvent = {
        id: "a",
        w: 2,
        h: 2,
        event: new Event("resize"),
        node,
        size: resizeSize,
        handle: "se",
      };
      act(() => {
        handle.onResizeStart(resizeEvent);
      });

      expect(ref.current?.state.resizing).toBe(true);

      act(() => {
        handle.onResize({ ...resizeEvent, w: 3, h: 4 });
      });

      expect(onResize).toHaveBeenCalled();
      const resizePayload = onResize.mock.calls[0][0];
      expect(resizePayload.type).toBe("resize");
      expect(resizePayload.handle).toBe("se");
      expect(ref.current?.state.activeDrag?.id).toBe("a");
      expect(ref.current?.state.layout.find((item) => item.id === "a")?.w).toBe(
        3
      );
      expect(ref.current?.state.layout.find((item) => item.id === "a")?.h).toBe(
        4
      );

      act(() => {
        handle.onResizeEnd({ ...resizeEvent, w: 3, h: 4 });
      });

      expect(onResizeEnd).toHaveBeenCalled();
      const resizeEndPayload = onResizeEnd.mock.calls[0][0];
      expect(resizeEndPayload.type).toBe("resizeEnd");
      expect(resizeEndPayload.handle).toBe("se");
      expect(ref.current?.state.resizing).toBe(false);
      expect(ref.current?.state.activeDrag).toBeNull();
    });
  });

  describe("ref forwarding", () => {
    it("forwards innerRef to container", () => {
      const ref = React.createRef<HTMLDivElement>();
      renderGrid(
        <DndGrid {...defaultProps} innerRef={ref}>
          <div data-grid={{ x: 0, y: 0, w: 2, h: 2 }} key="a">
            A
          </div>
        </DndGrid>
      );
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });
  });

  describe("default props", () => {
    it("uses default cols of 12", () => {
      renderGrid(
        <DndGrid width={1200}>
          <div data-grid={{ x: 0, y: 0, w: 2, h: 2 }} key="a">
            A
          </div>
        </DndGrid>
      );
      expect(screen.getByTestId("grid-item-a")).toBeInTheDocument();
    });

    it("uses default rowHeight of 150", () => {
      renderGrid(
        <DndGrid width={1200}>
          <div data-grid={{ x: 0, y: 0, w: 2, h: 2 }} key="a">
            A
          </div>
        </DndGrid>
      );
      expect(screen.getByTestId("grid-item-a")).toBeInTheDocument();
    });

    it("uses default gap", () => {
      renderGrid(
        <DndGrid width={1200}>
          <div data-grid={{ x: 0, y: 0, w: 2, h: 2 }} key="a">
            A
          </div>
        </DndGrid>
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
          <div data-grid={{ x: 0, y: 0, w: 2, h: 2 }}>No Key</div>
          <div data-grid={{ x: 2, y: 0, w: 2, h: 2 }} key="a">
            With Key
          </div>
        </DndGrid>
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
          compactor={{ ...verticalCompactor, preventCollision: true }}
        >
          <div data-grid={{ x: 0, y: 0, w: 2, h: 2 }} key="a">
            A
          </div>
        </DndGrid>
      );
      expect(screen.getByTestId("grid-item-a")).toBeInTheDocument();
    });
  });

  describe("bounded", () => {
    it("passes bounded to grid items", () => {
      renderGrid(
        <DndGrid {...defaultProps} bounded={true}>
          <div data-grid={{ x: 0, y: 0, w: 2, h: 2 }} key="a">
            A
          </div>
        </DndGrid>
      );
      expect(screen.getByTestId("grid-item-a")).toBeInTheDocument();
    });
  });

  describe("transformScale", () => {
    it("accepts transformScale prop", () => {
      renderGrid(
        <DndGrid {...defaultProps} transformScale={1.5}>
          <div data-grid={{ x: 0, y: 0, w: 2, h: 2 }} key="a">
            A
          </div>
        </DndGrid>
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
          <div data-grid={{ x: 0, y: 0, w: 2, h: 2 }} key="a">
            A
          </div>
        </DndGrid>
      );
      expect(screen.getByTestId("grid-item-a")).toBeInTheDocument();
    });

    it("uses gap as fallback for containerPadding", () => {
      renderGrid(
        <DndGrid {...defaultProps} containerPadding={null}>
          <div data-grid={{ x: 0, y: 0, w: 2, h: 2 }} key="a">
            A
          </div>
        </DndGrid>
      );
      expect(screen.getByTestId("grid-item-a")).toBeInTheDocument();
    });
  });

  describe("maxRows", () => {
    it("accepts maxRows prop", () => {
      renderGrid(
        <DndGrid {...defaultProps} maxRows={10}>
          <div data-grid={{ x: 0, y: 0, w: 2, h: 2 }} key="a">
            A
          </div>
        </DndGrid>
      );
      expect(screen.getByTestId("grid-item-a")).toBeInTheDocument();
    });
  });

  describe("resizeHandles", () => {
    it("accepts resizeHandles prop", () => {
      renderGrid(
        <DndGrid {...defaultProps} resizeHandles={["se", "ne", "sw", "nw"]}>
          <div data-grid={{ x: 0, y: 0, w: 2, h: 2 }} key="a">
            A
          </div>
        </DndGrid>
      );
      expect(screen.getByTestId("grid-item-a")).toBeInTheDocument();
    });
  });

  describe("droppingItem", () => {
    it("accepts custom droppingItem", () => {
      renderGrid(
        <DndGrid
          {...defaultProps}
          droppingItem={{ id: "custom-drop", w: 2, h: 2 }}
          onDropDragOver={() => undefined}
        >
          <div data-grid={{ x: 0, y: 0, w: 2, h: 2 }} key="a">
            A
          </div>
        </DndGrid>
      );
      expect(screen.getByTestId("grid-item-a")).toBeInTheDocument();
    });
  });

  describe("draggable handles", () => {
    it("accepts dragHandle prop", () => {
      renderGrid(
        <DndGrid {...defaultProps} dragHandle=".handle">
          <div data-grid={{ x: 0, y: 0, w: 2, h: 2 }} key="a">
            A
          </div>
        </DndGrid>
      );
      expect(screen.getByTestId("grid-item-a")).toBeInTheDocument();
    });

    it("accepts dragCancel prop", () => {
      renderGrid(
        <DndGrid {...defaultProps} dragCancel=".no-drag">
          <div data-grid={{ x: 0, y: 0, w: 2, h: 2 }} key="a">
            A
          </div>
        </DndGrid>
      );
      expect(screen.getByTestId("grid-item-a")).toBeInTheDocument();
    });
  });
});
