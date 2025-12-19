import React, { useMemo, useState } from "react";
import { ReactGridLayout } from "../../dist/main";
import _ from "lodash";

type Props = {
  rowHeight?: number;
  cols?: number;
};

export const StaticElements = ({ rowHeight = 30, cols = 12 }: Props) => {
  return (
    <ReactGridLayout width={500} rowHeight={rowHeight} cols={cols}>
      <div key="1" data-grid={{ x: 0, y: 0, w: 2, h: 3, deg: 0 }}>
        <span className="text">1</span>
      </div>
      <div key="2" data-grid={{ x: 2, y: 0, w: 4, h: 3, static: true, deg: 0 }}>
        <span className="text">2 - Static</span>
      </div>
      <div key="3" data-grid={{ x: 6, y: 0, w: 2, h: 3, deg: 0 }}>
        <span className="text">3</span>
      </div>
      <div
        key="4"
        data-grid={{
          x: 8,
          y: 0,
          w: 4,
          h: 3,
          deg: 0
        }}
      >
        <span className="text">
          4 - Draggable with Handle
          <hr />
          <hr />
          <span className="react-grid-dragHandleExample">[DRAG HERE]</span>
          <hr />
          <hr />
        </span>
      </div>
    </ReactGridLayout>
  );
};
