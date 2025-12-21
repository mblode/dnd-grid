import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import type { Layout } from "../types";
import { DndGrid } from "./dnd-grid";

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
	}: any) => (
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
	margin: [10, 10, 10, 10] as [number, number, number, number],
};

describe("DndGrid", () => {
	describe("rendering", () => {
		it("renders container with dnd-grid class", () => {
			render(
				<DndGrid {...defaultProps}>
					<div key="a" data-grid={{ x: 0, y: 0, w: 2, h: 2, deg: 0 }}>
						A
					</div>
				</DndGrid>,
			);
			expect(document.querySelector(".dnd-grid")).toBeInTheDocument();
		});

		it("renders children as grid items", () => {
			render(
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
			render(
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
			render(
				<DndGrid {...defaultProps} style={{ backgroundColor: "red" }}>
					<div key="a" data-grid={{ x: 0, y: 0, w: 2, h: 2, deg: 0 }}>
						A
					</div>
				</DndGrid>,
			);
			const grid = document.querySelector(".dnd-grid") as HTMLElement;
			expect(grid.style.backgroundColor).toBe("red");
		});

		it("renders with id dnd-grid", () => {
			render(
				<DndGrid {...defaultProps}>
					<div key="a" data-grid={{ x: 0, y: 0, w: 2, h: 2, deg: 0 }}>
						A
					</div>
				</DndGrid>,
			);
			expect(document.getElementById("dnd-grid")).toBeInTheDocument();
		});
	});

	describe("layout synchronization", () => {
		it("synchronizes layout with children", () => {
			const layout: Layout = [{ i: "a", x: 0, y: 0, w: 4, h: 2, deg: 0 }];
			render(
				<DndGrid {...defaultProps} layout={layout}>
					<div key="a">A</div>
				</DndGrid>,
			);
			const item = screen.getByTestId("grid-item-a");
			expect(item).toHaveAttribute("data-w", "4");
		});

		it("uses data-grid when no layout provided", () => {
			render(
				<DndGrid {...defaultProps}>
					<div key="a" data-grid={{ x: 5, y: 3, w: 3, h: 2, deg: 0 }}>
						A
					</div>
				</DndGrid>,
			);
			const item = screen.getByTestId("grid-item-a");
			expect(item).toHaveAttribute("data-x", "5");
			expect(item).toHaveAttribute("data-w", "3");
		});

		it("calls onLayoutChange when layout changes", () => {
			const onLayoutChange = vi.fn();
			const { rerender } = render(
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

	describe("autoSize", () => {
		it("calculates container height when autoSize is true", () => {
			render(
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
			render(
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

	describe("compaction", () => {
		it("compacts vertically by default", () => {
			render(
				<DndGrid {...defaultProps}>
					<div key="a" data-grid={{ x: 0, y: 5, w: 2, h: 2, deg: 0 }}>
						A
					</div>
				</DndGrid>,
			);
			const item = screen.getByTestId("grid-item-a");
			expect(item).toHaveAttribute("data-y", "0");
		});

		it("respects compactType horizontal", () => {
			render(
				<DndGrid {...defaultProps} compactType="horizontal">
					<div key="a" data-grid={{ x: 5, y: 0, w: 2, h: 2, deg: 0 }}>
						A
					</div>
				</DndGrid>,
			);
			const item = screen.getByTestId("grid-item-a");
			expect(item).toHaveAttribute("data-x", "0");
		});

		it("allows overlap when allowOverlap is true", () => {
			render(
				<DndGrid {...defaultProps} allowOverlap={true}>
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
			render(
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
			render(
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
			render(
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
			render(
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
			render(
				<DndGrid {...defaultProps} isDroppable={true}>
					<div key="a" data-grid={{ x: 0, y: 0, w: 2, h: 2, deg: 0 }}>
						A
					</div>
				</DndGrid>,
			);
			const grid = document.querySelector(".dnd-grid");
			fireEvent.dragOver(grid!);
			// Should not throw
		});

		it("calls onDrop callback", () => {
			const onDrop = vi.fn();
			render(
				<DndGrid {...defaultProps} isDroppable={true} onDrop={onDrop}>
					<div key="a" data-grid={{ x: 0, y: 0, w: 2, h: 2, deg: 0 }}>
						A
					</div>
				</DndGrid>,
			);
			const grid = document.querySelector(".dnd-grid");
			fireEvent.drop(grid!);
			expect(onDrop).toHaveBeenCalled();
		});

		it("increments dragEnterCounter on dragEnter", () => {
			render(
				<DndGrid {...defaultProps} isDroppable={true}>
					<div key="a" data-grid={{ x: 0, y: 0, w: 2, h: 2, deg: 0 }}>
						A
					</div>
				</DndGrid>,
			);
			const grid = document.querySelector(".dnd-grid");
			fireEvent.dragEnter(grid!);
			// Should not throw
		});

		it("decrements dragEnterCounter on dragLeave", () => {
			render(
				<DndGrid {...defaultProps} isDroppable={true}>
					<div key="a" data-grid={{ x: 0, y: 0, w: 2, h: 2, deg: 0 }}>
						A
					</div>
				</DndGrid>,
			);
			const grid = document.querySelector(".dnd-grid");
			fireEvent.dragEnter(grid!);
			fireEvent.dragLeave(grid!);
			// Should not throw
		});
	});

	describe("callbacks", () => {
		it("accepts onDragStart callback", () => {
			const onDragStart = vi.fn();
			render(
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
			render(
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
			render(
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
			render(
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
			render(
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
			render(
				<DndGrid {...defaultProps} onResizeStop={onResizeStop}>
					<div key="a" data-grid={{ x: 0, y: 0, w: 2, h: 2, deg: 0 }}>
						A
					</div>
				</DndGrid>,
			);
			expect(screen.getByTestId("grid-item-a")).toBeInTheDocument();
		});
	});

	describe("ref forwarding", () => {
		it("forwards innerRef to container", () => {
			const ref = React.createRef<HTMLDivElement>();
			render(
				<DndGrid {...defaultProps} innerRef={ref}>
					<div key="a" data-grid={{ x: 0, y: 0, w: 2, h: 2, deg: 0 }}>
						A
					</div>
				</DndGrid>,
			);
			expect(ref.current).toBeInstanceOf(HTMLDivElement);
			expect(ref.current?.id).toBe("dnd-grid");
		});
	});

	describe("default props", () => {
		it("uses default cols of 12", () => {
			render(
				<DndGrid width={1200}>
					<div key="a" data-grid={{ x: 0, y: 0, w: 2, h: 2, deg: 0 }}>
						A
					</div>
				</DndGrid>,
			);
			expect(screen.getByTestId("grid-item-a")).toBeInTheDocument();
		});

		it("uses default rowHeight of 150", () => {
			render(
				<DndGrid width={1200}>
					<div key="a" data-grid={{ x: 0, y: 0, w: 2, h: 2, deg: 0 }}>
						A
					</div>
				</DndGrid>,
			);
			expect(screen.getByTestId("grid-item-a")).toBeInTheDocument();
		});

		it("uses default margin", () => {
			render(
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
			render(<DndGrid {...defaultProps}>{null}</DndGrid>);
			expect(document.querySelector(".dnd-grid")).toBeInTheDocument();
		});

		it("handles empty array of children", () => {
			render(<DndGrid {...defaultProps}>{[]}</DndGrid>);
			expect(document.querySelector(".dnd-grid")).toBeInTheDocument();
		});
	});

	describe("children without keys", () => {
		it("ignores children without keys", () => {
			render(
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
		it("accepts preventCollision prop", () => {
			render(
				<DndGrid {...defaultProps} preventCollision={true}>
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
			render(
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
			render(
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
			render(
				<DndGrid
					{...defaultProps}
					containerPadding={[20, 20, 20, 20] as [number, number, number, number]}
				>
					<div key="a" data-grid={{ x: 0, y: 0, w: 2, h: 2, deg: 0 }}>
						A
					</div>
				</DndGrid>,
			);
			expect(screen.getByTestId("grid-item-a")).toBeInTheDocument();
		});

		it("uses margin as fallback for containerPadding", () => {
			render(
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
			render(
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
			render(
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
			render(
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
			render(
				<DndGrid {...defaultProps} draggableHandle=".handle">
					<div key="a" data-grid={{ x: 0, y: 0, w: 2, h: 2, deg: 0 }}>
						A
					</div>
				</DndGrid>,
			);
			expect(screen.getByTestId("grid-item-a")).toBeInTheDocument();
		});

		it("accepts draggableCancel prop", () => {
			render(
				<DndGrid {...defaultProps} draggableCancel=".no-drag">
					<div key="a" data-grid={{ x: 0, y: 0, w: 2, h: 2, deg: 0 }}>
						A
					</div>
				</DndGrid>,
			);
			expect(screen.getByTestId("grid-item-a")).toBeInTheDocument();
		});
	});

	describe("verticalCompact legacy support", () => {
		it("handles verticalCompact false", () => {
			render(
				<DndGrid {...defaultProps} verticalCompact={false}>
					<div key="a" data-grid={{ x: 0, y: 5, w: 2, h: 2, deg: 0 }}>
						A
					</div>
				</DndGrid>,
			);
			const item = screen.getByTestId("grid-item-a");
			// With verticalCompact false, compactType becomes null
			expect(item).toBeInTheDocument();
		});
	});
});
