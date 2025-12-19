import React, { useMemo, useState } from "react";
import { ReactGridLayout } from "../../dist/main";
import _ from "lodash";
import { useResizeDetector } from "react-resize-detector";

const BLOCK_GAP = 14;
const DRAG_TOUCH_DELAY_DURATION = 250; // in ms

type Props = {
  items?: number;
  cols?: number;
  rowHeight?: number;
};

export const Showcase = ({ items = 3, rowHeight = 24, cols = 4 }: Props) => {
  const { width = 500, ref } = useResizeDetector();

  const generateLayout = () => {
    return [
      {
        x: 0,
        y: 0,
        w: 2,
        h: 6,
        deg: 0,
        i: "a"
      },
      {
        x: 2,
        y: 0,
        w: 2,
        h: 6,
        deg: 0,
        i: "b"
      },
      {
        x: 0,
        y: 4,
        w: 2,
        h: 6,
        deg: 0,
        i: "c"
      }
    ];
  };

  const [layout, setLayout] = useState(generateLayout());

  const handleLayoutChange = layout => {
    setLayout(layout);
  };

  const children = useMemo(() => {
    return _.map(_.range(items), function (i) {
      return (
        <div key={i}>
          <span className="text">{i}</span>
        </div>
      );
    });
  }, []);

  return (
    <ReactGridLayout
      innerRef={ref}
      className="layout"
      layout={layout}
      cols={cols}
      rowHeight={rowHeight}
      width={width}
      margin={[BLOCK_GAP, BLOCK_GAP, BLOCK_GAP, BLOCK_GAP]}
      isDraggable
      isResizable
      resizeHandles={["n", "e", "s", "w", "sw", "nw", "se", "ne"]}
      dragTouchDelayDuration={DRAG_TOUCH_DELAY_DURATION}
      isDroppable
      containerPadding={[0, 0, 0, 0]}
      onLayoutChange={handleLayoutChange}
    >
      {children}
    </ReactGridLayout>
  );
};
