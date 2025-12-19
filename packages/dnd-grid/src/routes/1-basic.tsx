import React, { useMemo, useState } from "react";
import { ReactGridLayout } from "../../dist/main";
import _ from "lodash";

type Props = {
  items?: number;
  rowHeight?: number;
  cols?: number;
};

export const Basic = ({ items = 20, rowHeight = 30, cols = 12 }: Props) => {
  const [scale, setScale] = useState(1);

  const generateDOM = () => {
    return _.map(_.range(items), function (i) {
      return (
        <div key={i}>
          <span className="text text-f-xl">{i}</span>
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
    <div>
      <style>
        {`
      :root {
        --scale-factor: ${scale};
      }
    `}
      </style>

      <input
        type="range"
        min="0.1"
        max="5"
        step="0.1"
        value={scale}
        onChange={e => setScale(parseFloat(e.target.value))}
      />
      <span>{scale}</span>
      <ReactGridLayout
        width={500 * scale}
        layout={layout}
        onLayoutChange={handleLayoutChange}
        rowHeight={rowHeight * scale}
        cols={cols}
      >
        {generateDOM()}
      </ReactGridLayout>
    </div>
  );
};
