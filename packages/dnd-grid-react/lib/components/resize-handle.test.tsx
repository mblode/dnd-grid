import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it } from "vitest";
import { ResizeHandle } from "./resize-handle";

describe("ResizeHandle", () => {
	it("renders with correct class for se axis", () => {
		render(<ResizeHandle handleAxis="se" />);
		const handle = document.querySelector(".react-resizable-handle-se");
		expect(handle).toBeInTheDocument();
	});

	it("renders with correct class for ne axis", () => {
		render(<ResizeHandle handleAxis="ne" />);
		const handle = document.querySelector(".react-resizable-handle-ne");
		expect(handle).toBeInTheDocument();
	});

	it("includes base react-resizable-handle class", () => {
		render(<ResizeHandle handleAxis="sw" />);
		const handle = document.querySelector(".react-resizable-handle");
		expect(handle).toBeInTheDocument();
	});

	it("includes dnd-grid-resize-handle class", () => {
		render(<ResizeHandle handleAxis="nw" />);
		const handle = document.querySelector(".dnd-grid-resize-handle");
		expect(handle).toBeInTheDocument();
	});

	it("forwards ref correctly", () => {
		const ref = React.createRef<HTMLDivElement>();
		render(<ResizeHandle ref={ref} handleAxis="sw" />);
		expect(ref.current).toBeInstanceOf(HTMLDivElement);
	});

	it("spreads additional props", () => {
		render(<ResizeHandle handleAxis="w" data-testid="resize-handle" />);
		expect(screen.getByTestId("resize-handle")).toBeInTheDocument();
	});

	it("renders all handle axes correctly", () => {
		const axes = ["s", "w", "e", "n", "sw", "nw", "se", "ne"] as const;
		for (const axis of axes) {
			const { container, unmount } = render(<ResizeHandle handleAxis={axis} />);
			expect(
				container.querySelector(`.react-resizable-handle-${axis}`),
			).toBeInTheDocument();
			unmount();
		}
	});

	it("renders a div element", () => {
		render(<ResizeHandle handleAxis="se" data-testid="handle" />);
		const handle = screen.getByTestId("handle");
		expect(handle.tagName).toBe("DIV");
	});

	it("combines all expected classes", () => {
		render(<ResizeHandle handleAxis="se" data-testid="handle" />);
		const handle = screen.getByTestId("handle");
		expect(handle).toHaveClass("react-resizable-handle");
		expect(handle).toHaveClass("react-resizable-handle-se");
		expect(handle).toHaveClass("dnd-grid-resize-handle");
	});

	it("accepts custom data attributes via rest props", () => {
		render(
			<ResizeHandle
				handleAxis="se"
				data-testid="handle"
				data-custom="custom-value"
			/>,
		);
		const handle = screen.getByTestId("handle");
		// This tests the spread behavior for data attributes
		expect(handle).toHaveAttribute("data-custom", "custom-value");
	});
});
