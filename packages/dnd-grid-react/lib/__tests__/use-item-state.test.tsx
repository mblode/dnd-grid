import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ItemState, LayoutItem } from "../types";
import {
  DndGridItemContext,
  useDndGridItemState,
  useOptionalDndGridItemState,
} from "../use-item-state";

const TestConsumer = () => {
  const { item, state } = useDndGridItemState();
  return (
    <div data-testid="state">
      {item.id}:{state.dragging ? "dragging" : "idle"}
    </div>
  );
};

const OptionalConsumer = () => {
  const context = useOptionalDndGridItemState();
  return (
    <div data-testid="optional">{context ? context.item.id : "missing"}</div>
  );
};

describe("useDndGridItemState", () => {
  it("returns context values when used within provider", () => {
    const item: LayoutItem = { id: "a", x: 0, y: 0, w: 1, h: 1 };
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

  it("returns null when optional hook is used outside provider", () => {
    render(<OptionalConsumer />);
    expect(screen.getByTestId("optional")).toHaveTextContent("missing");
  });
});
