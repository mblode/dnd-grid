import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type {
  Layout,
  MissingLayoutStrategy,
  ResponsiveLayouts,
  Spacing,
} from "../types";
import { useDndGridResponsiveLayout } from "../use-dnd-grid-responsive-layout";

type TestProps = {
  width: number;
  layouts: ResponsiveLayouts;
  gap?: Spacing | Record<string, Spacing>;
  missingLayoutStrategy?: MissingLayoutStrategy;
};

const TestComponent = ({
  width,
  layouts,
  gap,
  missingLayoutStrategy,
}: TestProps) => {
  const result = useDndGridResponsiveLayout({
    width,
    layouts,
    gap: gap ?? 10,
    missingLayoutStrategy,
  });
  const serializedGap =
    typeof result.gap === "number"
      ? String(result.gap)
      : JSON.stringify(result.gap);

  return (
    <div
      data-testid="result"
      data-breakpoint={result.breakpoint}
      data-cols={result.cols}
      data-layout={JSON.stringify(result.layout)}
      data-gap={serializedGap}
    />
  );
};

describe("useDndGridResponsiveLayout", () => {
  it("returns layout for the active breakpoint", () => {
    const layouts: ResponsiveLayouts = {
      lg: [{ id: "a", x: 0, y: 0, w: 2, h: 2 }],
      md: [{ id: "a", x: 1, y: 0, w: 3, h: 2 }],
    };
    render(<TestComponent width={1200} layouts={layouts} />);

    const node = screen.getByTestId("result");
    expect(node.dataset.breakpoint).toBe("lg");
    expect(node.dataset.cols).toBe("12");

    const parsedLayout = JSON.parse(node.dataset.layout || "[]") as Layout;
    expect(parsedLayout[0]?.x).toBe(0);
    expect(node.dataset.gap).toBe("10");
  });

  it("updates breakpoint and cols when width changes", () => {
    const layouts: ResponsiveLayouts = {
      lg: [{ id: "a", x: 0, y: 0, w: 2, h: 2 }],
      md: [{ id: "a", x: 1, y: 0, w: 3, h: 2 }],
    };
    const gap = {
      lg: 16,
      md: { top: 12, right: 16, bottom: 12, left: 16 },
    };
    const { rerender } = render(
      <TestComponent
        width={1200}
        layouts={layouts}
        gap={gap}
        missingLayoutStrategy="derive"
      />,
    );

    rerender(
      <TestComponent
        width={800}
        layouts={layouts}
        gap={gap}
        missingLayoutStrategy="derive"
      />,
    );

    const node = screen.getByTestId("result");
    expect(node.dataset.breakpoint).toBe("sm");
    expect(node.dataset.cols).toBe("6");
  });

  it("returns empty layout when missingLayoutStrategy is empty", () => {
    const layouts: ResponsiveLayouts = {
      lg: [{ id: "a", x: 0, y: 0, w: 2, h: 2 }],
    };
    render(
      <TestComponent
        width={800}
        layouts={layouts}
        missingLayoutStrategy="empty"
      />,
    );
    const node = screen.getByTestId("result");
    const parsedLayout = JSON.parse(node.dataset.layout || "[]") as Layout;
    expect(parsedLayout).toHaveLength(0);
  });

  it("throws when missingLayoutStrategy is error and layout is missing", () => {
    const layouts: ResponsiveLayouts = {
      lg: [{ id: "a", x: 0, y: 0, w: 2, h: 2 }],
    };
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    expect(() =>
      render(
        <TestComponent
          width={800}
          layouts={layouts}
          gap={10}
          missingLayoutStrategy="error"
        />,
      ),
    ).toThrow(/Responsive layout.*missing/i);

    consoleError.mockRestore();
  });
});
