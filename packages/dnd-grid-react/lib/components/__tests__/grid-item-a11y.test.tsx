import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { GridItem } from "../grid-item";

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
  }) =>
    React.cloneElement(children, {
      "data-draggable": !disabled,
      "data-allow-mobile-scroll": allowMobileScroll ? "true" : "false",
    } as React.HTMLAttributes<HTMLElement>),
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
  maxRows: Infinity,
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
  maxH: Infinity,
  id: "test-item",
};

describe("GridItem A11y", () => {
  it("is focusable via tab", async () => {
    const user = userEvent.setup();
    render(<GridItem {...defaultProps} />);
    const item = screen.getByTestId("child");

    expect(item).toHaveAttribute("tabIndex", "0");

    await user.tab();
    expect(item).toHaveFocus();
  });

  it("applies gridcell role and indices", () => {
    render(
      <GridItem
        {...defaultProps}
        ariaRowIndex={2}
        ariaColIndex={3}
        ariaPosInSet={1}
        ariaSetSize={4}
      />,
    );
    const item = screen.getByTestId("child");

    expect(item).toHaveAttribute("role", "gridcell");
    expect(item).toHaveAttribute("aria-rowindex", "2");
    expect(item).toHaveAttribute("aria-colindex", "3");
    expect(item).toHaveAttribute("aria-posinset", "1");
    expect(item).toHaveAttribute("aria-setsize", "4");
  });

  it("hides placeholders from assistive tech", () => {
    render(<GridItem {...defaultProps} className="dnd-grid-placeholder" />);
    const item = screen.getByTestId("child");

    expect(item).toHaveAttribute("role", "presentation");
    expect(item).toHaveAttribute("aria-hidden", "true");
    expect(item).not.toHaveAttribute("aria-rowindex");
  });

  it("treats dropping placeholders as hidden", () => {
    render(
      <GridItem
        {...defaultProps}
        droppingPosition={{ left: 0, top: 0, e: new MouseEvent("mousemove") }}
      />,
    );
    const item = screen.getByTestId("child");

    expect(item).toHaveAttribute("role", "presentation");
    expect(item).toHaveAttribute("aria-hidden", "true");
  });

  it("enters pressed state on Space", async () => {
    const user = userEvent.setup();
    render(<GridItem {...defaultProps} />);
    const item = screen.getByTestId("child");

    await user.tab();
    await user.keyboard(" ");

    expect(item).toHaveAttribute("aria-pressed", "true");
  });

  it("enters pressed state on Enter", async () => {
    const user = userEvent.setup();
    render(<GridItem {...defaultProps} />);
    const item = screen.getByTestId("child");

    await user.tab();
    await user.keyboard("{Enter}");

    expect(item).toHaveAttribute("aria-pressed", "true");
  });

  it("exits pressed state on Escape", async () => {
    const user = userEvent.setup();
    const onDragEnd = vi.fn();
    render(<GridItem {...defaultProps} onDragEnd={onDragEnd} />);
    const item = screen.getByTestId("child");

    await user.tab();
    await user.keyboard(" ");
    expect(item).toHaveAttribute("aria-pressed", "true");

    await user.keyboard("{Escape}");
    expect(item).toHaveAttribute("aria-pressed", "false");
    expect(onDragEnd).toHaveBeenCalled();
  });

  it("triggers onDrag on ArrowRight when pressed", async () => {
    const user = userEvent.setup();
    const onDrag = vi.fn();
    render(<GridItem {...defaultProps} onDrag={onDrag} />);

    await user.tab();
    await user.keyboard(" "); // Pick up

    await user.keyboard("{ArrowRight}");

    expect(onDrag).toHaveBeenCalled();
    expect(onDrag.mock.calls[0][0].x).toBe(1);
  });

  it("triggers onDrag on ArrowLeft when pressed", async () => {
    const user = userEvent.setup();
    const onDrag = vi.fn();
    render(
      <GridItem
        {...defaultProps}
        onDrag={onDrag}
        x={1}
        layout={[{ id: "test-item", x: 1, y: 0, w: 2, h: 2 }]}
      />,
    );

    await user.tab();
    await user.keyboard(" "); // Pick up

    await user.keyboard("{ArrowLeft}");

    expect(onDrag).toHaveBeenCalled();
    expect(onDrag.mock.calls[0][0].x).toBe(0);
  });

  it("triggers onDrag on ArrowDown when pressed", async () => {
    const user = userEvent.setup();
    const onDrag = vi.fn();
    render(<GridItem {...defaultProps} onDrag={onDrag} />);

    await user.tab();
    await user.keyboard(" "); // Pick up

    await user.keyboard("{ArrowDown}");

    expect(onDrag).toHaveBeenCalled();
    expect(onDrag.mock.calls[0][0].y).toBe(1);
  });

  it("triggers onDrag on ArrowUp when pressed", async () => {
    const user = userEvent.setup();
    const onDrag = vi.fn();
    render(
      <GridItem
        {...defaultProps}
        onDrag={onDrag}
        y={1}
        layout={[{ id: "test-item", x: 0, y: 1, w: 2, h: 2 }]}
      />,
    );

    await user.tab();
    await user.keyboard(" "); // Pick up

    await user.keyboard("{ArrowUp}");

    expect(onDrag).toHaveBeenCalled();
    expect(onDrag.mock.calls[0][0].y).toBe(0);
  });

  it("triggers onResize on Shift+ArrowRight when pressed", async () => {
    const user = userEvent.setup();
    const onResize = vi.fn();
    render(<GridItem {...defaultProps} onResize={onResize} />);

    await user.tab();
    await user.keyboard(" "); // Pick up
    await user.keyboard("{Shift>}{ArrowRight}{/Shift}");

    expect(onResize).toHaveBeenCalled();
    const resizeEvent = onResize.mock.calls[0][0];
    expect(resizeEvent.handle).toBe("se");
    expect(resizeEvent.w).toBe(3);
    expect(resizeEvent.h).toBe(2);
  });

  it("commits resize on Space", async () => {
    const user = userEvent.setup();
    const onResizeEnd = vi.fn();
    render(<GridItem {...defaultProps} onResizeEnd={onResizeEnd} />);

    await user.tab();
    await user.keyboard(" "); // Pick up
    await user.keyboard("{Shift>}{ArrowRight}{/Shift}");
    await user.keyboard(" "); // Drop

    expect(onResizeEnd).toHaveBeenCalled();
  });

  it("cancels resize on Escape", async () => {
    const user = userEvent.setup();
    const onResize = vi.fn();
    const onResizeEnd = vi.fn();
    render(
      <GridItem
        {...defaultProps}
        onResize={onResize}
        onResizeEnd={onResizeEnd}
      />,
    );

    await user.tab();
    await user.keyboard(" "); // Pick up
    await user.keyboard("{Shift>}{ArrowRight}{/Shift}");
    await user.keyboard("{Escape}");

    expect(onResizeEnd).toHaveBeenCalled();
    const lastResizeEvent =
      onResize.mock.calls[onResize.mock.calls.length - 1][0];
    expect(lastResizeEvent.w).toBe(2);
    expect(lastResizeEvent.h).toBe(2);
  });

  it("does not trigger onDrag when not pressed", async () => {
    const user = userEvent.setup();
    const onDrag = vi.fn();
    render(<GridItem {...defaultProps} onDrag={onDrag} />);

    await user.tab();
    await user.keyboard("{ArrowRight}");

    expect(onDrag).not.toHaveBeenCalled();
  });

  it("does not trigger onResize when not pressed", async () => {
    const user = userEvent.setup();
    const onResize = vi.fn();
    render(<GridItem {...defaultProps} onResize={onResize} />);

    await user.tab();
    await user.keyboard("{Shift>}{ArrowRight}{/Shift}");

    expect(onResize).not.toHaveBeenCalled();
  });
});
