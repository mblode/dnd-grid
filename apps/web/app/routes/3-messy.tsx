import React, { useMemo, useState } from "react";
import { ReactGridLayout } from "../../dist/main";
import _ from "lodash";

type Props = {
  items?: number;
  rowHeight?: number;
  cols?: number;
};

export const Messy = ({ items = 50, rowHeight = 30, cols = 12 }: Props) => {
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
      const w = Math.ceil(Math.random() * 4);
      const y = Math.ceil(Math.random() * 4) + 1;
      return {
        x: (i * 2) % 12,
        y: Math.floor(i / 6) * y,
        w: w,
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
    >
      {generateDOM()}
    </ReactGridLayout>
  );
};
