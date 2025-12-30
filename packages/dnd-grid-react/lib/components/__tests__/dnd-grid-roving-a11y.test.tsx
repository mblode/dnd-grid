import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type React from "react";
import { describe, expect, it, vi } from "vitest";
import { DndGrid } from "../dnd-grid";

vi.mock("react-draggable", () => ({
  DraggableCore: ({ children }: { children: React.ReactElement }) => children,
}));

vi.mock("react-resizable", () => ({
  Resizable: ({ children }: { children: React.ReactElement }) => children,
}));

const baseProps = {
  width: 1200,
  cols: 12,
  rowHeight: 150,
  gap: 10,
};

describe("DndGrid roving tabindex", () => {
  it("sets initial tabbable item based on layout order", () => {
    render(
      <DndGrid
        {...baseProps}
        layout={[
          { id: "a", x: 0, y: 1, w: 2, h: 2 },
          { id: "b", x: 0, y: 0, w: 2, h: 2 },
        ]}
      >
        <div data-testid="item-a" key="a">
          A
        </div>
        <div data-testid="item-b" key="b">
          B
        </div>
      </DndGrid>
    );

    const itemA = screen.getByTestId("item-a");
    const itemB = screen.getByTestId("item-b");

    expect(itemB).toHaveAttribute("tabIndex", "0");
    expect(itemA).toHaveAttribute("tabIndex", "-1");
  });

  it("moves focus with arrow keys through layout order", async () => {
    const user = userEvent.setup();
    render(
      <DndGrid
        {...baseProps}
        layout={[
          { id: "a", x: 0, y: 0, w: 2, h: 2 },
          { id: "b", x: 2, y: 0, w: 2, h: 2 },
        ]}
      >
        <div data-testid="item-a" key="a">
          A
        </div>
        <div data-testid="item-b" key="b">
          B
        </div>
      </DndGrid>
    );

    const itemA = screen.getByTestId("item-a");
    const itemB = screen.getByTestId("item-b");

    await user.tab();
    expect(itemA).toHaveFocus();

    await user.keyboard("{ArrowRight}");
    expect(itemB).toHaveFocus();
    expect(itemB).toHaveAttribute("tabIndex", "0");
    expect(itemA).toHaveAttribute("tabIndex", "-1");

    await user.keyboard("{ArrowLeft}");
    expect(itemA).toHaveFocus();
    expect(itemA).toHaveAttribute("tabIndex", "0");
    expect(itemB).toHaveAttribute("tabIndex", "-1");
  });
});
