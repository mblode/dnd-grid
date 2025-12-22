import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Layout, ResponsiveLayouts, Spacing } from "../types";
import { useDndGridResponsiveLayout } from "../use-dnd-grid-responsive-layout";

type TestProps = {
  width: number;
  layouts: ResponsiveLayouts;
  margin?: Spacing | Record<string, Spacing>;
};

const TestComponent = ({ width, layouts, margin }: TestProps) => {
  const result = useDndGridResponsiveLayout({
    width,
    layouts,
    margin: margin ?? 10,
  });
  const serializedMargin =
    typeof result.margin === "number"
      ? String(result.margin)
      : JSON.stringify(result.margin);

  return (
    <div
      data-testid="result"
      data-breakpoint={result.breakpoint}
      data-cols={result.cols}
      data-layout={JSON.stringify(result.layout)}
      data-margin={serializedMargin}
    />
  );
};

describe("useDndGridResponsiveLayout", () => {
  it("returns layout for the active breakpoint", () => {
    const layouts: ResponsiveLayouts = {
      lg: [{ i: "a", x: 0, y: 0, w: 2, h: 2 }],
      md: [{ i: "a", x: 1, y: 0, w: 3, h: 2 }],
    };
    render(<TestComponent width={1200} layouts={layouts} />);

    const node = screen.getByTestId("result");
    expect(node.dataset.breakpoint).toBe("lg");
    expect(node.dataset.cols).toBe("12");

    const parsedLayout = JSON.parse(node.dataset.layout || "[]") as Layout;
    expect(parsedLayout[0]?.x).toBe(0);
    expect(node.dataset.margin).toBe("10");
  });

  it("updates breakpoint and cols when width changes", () => {
    const layouts: ResponsiveLayouts = {
      lg: [{ i: "a", x: 0, y: 0, w: 2, h: 2 }],
      md: [{ i: "a", x: 1, y: 0, w: 3, h: 2 }],
    };
    const margin = {
      lg: 16,
      md: { top: 12, right: 16, bottom: 12, left: 16 },
    };
    const { rerender } = render(
      <TestComponent width={1200} layouts={layouts} margin={margin} />,
    );

    rerender(<TestComponent width={800} layouts={layouts} margin={margin} />);

    const node = screen.getByTestId("result");
    expect(node.dataset.breakpoint).toBe("sm");
    expect(node.dataset.cols).toBe("6");
  });
});
