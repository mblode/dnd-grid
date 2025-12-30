import { describe, expect, it, vi } from "vitest";
import { noCompactor } from "../compactors";
import {
  createLayoutEngine,
  type LayoutEngineOptions,
  type LayoutEnginePlugin,
  type LayoutState,
} from "../layout-engine";
import type { Layout } from "../types";

const baseOptions: LayoutEngineOptions = {
  cols: 12,
  maxRows: 100,
  rowHeight: 10,
  gap: [0, 0, 0, 0],
  containerPadding: [0, 0, 0, 0],
  containerWidth: 1200,
  containerHeight: 800,
  compactor: noCompactor,
  constraints: [],
};

const createLayout = (): Layout => [
  { id: "a", x: 0, y: 0, w: 1, h: 1 },
  { id: "b", x: 2, y: 0, w: 1, h: 1 },
];

describe("createLayoutEngine", () => {
  it("moves and resizes items", () => {
    const engine = createLayoutEngine(baseOptions);
    engine.setState({ layout: createLayout() });

    engine.commands.move({ type: "move", id: "a", x: 3, y: 0 });
    expect(
      engine.getState().layout.find((item) => item.id === "a")
    ).toMatchObject({
      x: 3,
      y: 0,
    });

    engine.commands.resize({ type: "resize", id: "a", w: 2, h: 2 });
    expect(
      engine.getState().layout.find((item) => item.id === "a")
    ).toMatchObject({
      w: 2,
      h: 2,
    });
  });

  it("notifies subscribers on state updates", () => {
    const engine = createLayoutEngine(baseOptions);
    engine.setState({ layout: createLayout() });

    const listener = vi.fn<(state: LayoutState) => void>();
    const unsubscribe = engine.subscribe(listener);

    engine.commands.move({ type: "move", id: "a", x: 4, y: 0 });

    expect(listener).toHaveBeenCalled();
    const latestState = listener.mock.calls.at(-1)?.[0];
    expect(latestState?.layout.find((item) => item.id === "a")).toMatchObject({
      x: 4,
      y: 0,
    });

    unsubscribe();
  });

  it("invokes plugin hooks", () => {
    const onInit = vi.fn();
    const onCommand = vi.fn();
    const onStateChange = vi.fn();
    const onOptionsChange = vi.fn();

    const plugin: LayoutEnginePlugin = {
      name: "test-plugin",
      onInit,
      onCommand,
      onStateChange,
      onOptionsChange,
    };

    const engine = createLayoutEngine({
      ...baseOptions,
      plugins: [plugin],
    });

    engine.setState({ layout: createLayout() });
    engine.commands.move({ type: "move", id: "a", x: 1, y: 0 });
    engine.commands.compact();
    engine.setOptions((prev) => ({ ...prev, cols: prev.cols + 1 }));

    expect(onInit).toHaveBeenCalledTimes(1);
    expect(onCommand).toHaveBeenCalledWith(
      expect.objectContaining({ type: "move", id: "a" }),
      expect.any(Object)
    );
    expect(onCommand).toHaveBeenCalledWith(
      expect.objectContaining({ type: "compact" }),
      expect.any(Object)
    );
    expect(onStateChange).toHaveBeenCalled();
    expect(onOptionsChange).toHaveBeenCalled();
  });

  it("throws on invalid options when validation is enabled", () => {
    const options = { ...baseOptions, cols: -1 };
    expect(() => createLayoutEngine(options)).toThrow(
      /LayoutEngineOptions validation failed/
    );
  });
});
