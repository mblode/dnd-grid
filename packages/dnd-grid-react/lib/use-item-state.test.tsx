import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ItemState, LayoutItem } from "./types";
import { DndGridItemContext, useDndGridItemState } from "./use-item-state";

const TestConsumer = () => {
  const { item, state } = useDndGridItemState();
  return (
    <div data-testid="state">
      {item.i}:{state.dragging ? "dragging" : "idle"}
    </div>
  );
};

describe("useDndGridItemState", () => {
  it("returns context values when used within provider", () => {
    const item: LayoutItem = { i: "a", x: 0, y: 0, w: 1, h: 1, deg: 0 };
    const state: ItemState = {
      dragging: true,
      resizing: false,
      settling: false,
      disabled: false,
    };
    render(
      <DndGridItemContext.Provider value={{ item, state }}>
        <TestConsumer />
      </DndGridItemContext.Provider>,
    );

    expect(screen.getByTestId("state")).toHaveTextContent("a:dragging");
  });

  it("throws when used outside provider", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    expect(() => render(<TestConsumer />)).toThrow(
      /useDndGridItemState must be used within a DndGrid item/i,
    );
    consoleError.mockRestore();
  });
});
