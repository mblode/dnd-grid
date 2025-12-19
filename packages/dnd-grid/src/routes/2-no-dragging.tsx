import React, { useMemo, useState } from "react";
import { ReactGridLayout } from "../../dist/main";
import _ from "lodash";

type Props = {
  items?: number;
  rowHeight?: number;
  cols?: number;
  isDraggable?: boolean;
  isResizable?: boolean;
};

export const NoDragging = ({
  items = 50,
  rowHeight = 30,
  cols = 12,
  isResizable = false,
  isDraggable = false
}: Props) => {
  const generateDOM = () => {
    return _.map(_.range(items), function (i) {
      return (
        <div key={i}>
          <span className="text">{i}</span>
        </div>
      );
    });
  };

  const generateLayout = () => {
    return _.map(new Array(items), function (item, i) {
      const y = Math.ceil(Math.random() * 4) + 1;
      return {
        x: (i * 2) % 12,
        y: Math.floor(i / 6) * y,
        w: 2,
        h: y,
        deg: 0,
        i: i.toString()
      };
    });
  };
  const [layout, setLayout] = useState(generateLayout());

  const handleLayoutChange = layout => {
    setLayout(layout);
  };

  return (
    <ReactGridLayout
      width={500}
      layout={layout}
      onLayoutChange={handleLayoutChange}
      rowHeight={rowHeight}
      cols={cols}
      isResizable={isResizable}
      isDraggable={isDraggable}
    >
      {generateDOM()}
    </ReactGridLayout>
  );
};
