import React from "react";
import type { ResizeHandleAxis } from "../types";

type ResizeHandleProps = {
  handleAxis: ResizeHandleAxis;
};

export const ResizeHandle = React.forwardRef<HTMLDivElement, ResizeHandleProps>(
  (props, ref) => {
    const { handleAxis, ...restProps } = props;

    return (
      <div
        ref={ref}
        className={`react-resizable-handle react-resizable-handle-${handleAxis} dnd-grid-resize-handle`}
        {...restProps}
      />
    );
  },
);
