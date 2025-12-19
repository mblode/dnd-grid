import React, { useCallback, useState } from "react";
import { ReactGridLayout } from "../../dist/main";
import _ from "lodash";

type Props = {
  rowHeight?: number;
  cols?: number;
};

export const DynamicAddRemove = ({ rowHeight = 100, cols = 12 }: Props) => {
  const [newCounter, setNewCounter] = useState(0);

  const [layout, setLayout] = useState(
    [0, 1, 2, 3, 4].map((i, key, list) => ({
      i: i.toString(),
      x: i * 2,
      y: 0,
      w: 2,
      h: 2,
      deg: 0,
      add: i === list.length - 1
    }))
  );

  const handleLayoutChange = layout => {
    setLayout(layout);
  };

  const onAddItem = useCallback(() => {
    /*eslint no-console: 0*/
    console.log("adding", "n" + newCounter);
    setLayout(
      layout.concat({
        i: "n" + newCounter,
        x: (layout.length * 2) % (cols || 12),
        y: Infinity, // puts it at the bottom
        w: 2,
        h: 2,
        deg: 0,
        add: false
      })
    );
    setNewCounter(newCounter + 1);
  }, []);

  const onRemoveItem = (i: string) => {
    console.log("removing", i);
    setLayout(_.reject(layout, { i: i }));
  };

  const createElement = el => {
    console.log(el);
    return (
      <div key={el.i} data-grid={el}>
        <span className="text">{el.i}</span>

        <span
          className="remove"
          style={{
            position: "absolute",
            right: "2px",
            top: 0,
            cursor: "pointer",
            width: 40,
            height: 40
          }}
          onClick={e => {
            e.stopPropagation();
            e.preventDefault();
            onRemoveItem(el.i);
          }}
        >
          x
        </span>
      </div>
    );
  };

  return (
    <>
      {newCounter}
      <button onClick={onAddItem}>Add Item</button>
      <ReactGridLayout
        width={500}
        layout={layout}
        onLayoutChange={handleLayoutChange}
        rowHeight={rowHeight}
        cols={cols}
      >
        {_.map(layout, el => createElement(el))}
      </ReactGridLayout>
    </>
  );
};
