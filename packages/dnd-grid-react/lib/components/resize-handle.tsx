import clsx from "clsx";
import React from "react";
import type { ResizeHandleAxis } from "../types";

type ResizeHandleProps = React.HTMLAttributes<HTMLDivElement> & {
  handleAxis: ResizeHandleAxis;
};

export const ResizeHandle = React.forwardRef<HTMLDivElement, ResizeHandleProps>(
  (props, ref) => {
    const { handleAxis, className, style, ...restProps } = props;

    return (
      <div
        ref={ref}
        className={clsx(
          "react-resizable-handle",
          `react-resizable-handle-${handleAxis}`,
          "dnd-grid-resize-handle",
          className,
        )}
        style={style}
        data-dnd-grid-handle=""
        data-handle-axis={handleAxis}
        {...restProps}
      />
    );
  },
);
