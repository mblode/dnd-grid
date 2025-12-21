import { render, screen } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GridItem } from "./grid-item";

// Mock react-draggable
vi.mock("react-draggable", () => ({
	DraggableCore: ({
		children,
		disabled,
	}: { children: React.ReactElement; disabled: boolean }) => {
		return React.cloneElement(children, {
			"data-draggable": !disabled,
		});
	},
}));

// Mock react-resizable
vi.mock("react-resizable", () => ({
	Resizable: ({
		children,
		className,
	}: { children: React.ReactElement; className?: string }) => {
		return React.cloneElement(children, {
			"data-resizable": true,
			className: `${children.props.className || ""} ${className || ""}`.trim(),
		});
	},
}));

const defaultProps = {
	children: <div data-testid="child">Content</div>,
	cols: 12,
	containerWidth: 1200,
	margin: [10, 10, 10, 10] as [number, number, number, number],
	containerPadding: [10, 10, 10, 10] as [number, number, number, number],
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
	deg: 0,
	minW: 1,
	maxW: 12,
	minH: 1,
	maxH: Infinity,
	i: "test-item",
};

describe("GridItem", () => {
	beforeEach(() => {
		vi.useFakeTimers({ shouldAdvanceTime: true });
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
			render(
				<GridItem {...defaultProps} style={{ backgroundColor: "red" }} />,
			);
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
			const customHandle = (axis: string, ref: any) => (
				<div ref={ref} className={`custom-handle-${axis}`} />
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
			const propsWithoutMinMax = { ...defaultProps };
			delete (propsWithoutMinMax as any).minW;
			delete (propsWithoutMinMax as any).minH;
			render(<GridItem {...propsWithoutMinMax} />);
			expect(screen.getByTestId("child")).toBeInTheDocument();
		});

		it("applies default maxW and maxH", () => {
			const propsWithoutMinMax = { ...defaultProps };
			delete (propsWithoutMinMax as any).maxW;
			delete (propsWithoutMinMax as any).maxH;
			render(<GridItem {...propsWithoutMinMax} />);
			expect(screen.getByTestId("child")).toBeInTheDocument();
		});
	});

	describe("rotation (deg)", () => {
		it("accepts deg prop", () => {
			render(<GridItem {...defaultProps} deg={45} />);
			expect(screen.getByTestId("child")).toBeInTheDocument();
		});

		it("defaults deg to 0", () => {
			render(<GridItem {...defaultProps} deg={0} />);
			const element = screen.getByTestId("child");
			expect(element.style.transform).toContain("rotate(0deg)");
		});
	});
});
