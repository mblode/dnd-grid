"use client";

import { forwardRef } from "react";

export type ResizeHandleAxis = "n" | "e" | "s" | "w" | "ne" | "nw" | "se" | "sw";

interface Props {
  handleAxis: ResizeHandleAxis;
}

export const ResizeHandle = forwardRef<HTMLDivElement, Props>(
  ({ handleAxis, ...restProps }, ref) => {
    return (
      <div
        ref={ref}
        className={`react-resizable-handle react-resizable-handle-${handleAxis} resize-handle resize-handle-${handleAxis}`}
        {...restProps}
      />
    );
  }
);

ResizeHandle.displayName = "ResizeHandle";
