import {
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors
} from "@dnd-kit/core";
import React, { useState } from "react";
import _ from "lodash";
import { Responsive, WidthProvider } from "react-grid-layout";
const ResponsiveReactGridLayout = WidthProvider(Responsive);
import { createPortal } from "react-dom";

import { DndContext, DragOverlay, useDraggable } from "@dnd-kit/core";

class DragFromOutsideLayout extends React.Component {
  static defaultProps = {
    className: "layout",
    rowHeight: 30,
    onLayoutChange: function () {},
    cols: { lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }
  };

  state = {
    currentBreakpoint: "lg",
    compactType: "vertical",
    mounted: false,
    layouts: { lg: generateLayout() }
  };

  componentDidMount() {
    this.setState({ mounted: true });
  }

  generateDOM() {
    return _.map(this.state.layouts.lg, function (l, i) {
      return (
        <div key={i} className={l.static ? "static" : ""}>
          {l.static ? (
            <span
              className="text"
              title="This item is static and cannot be removed or resized."
            >
              Static - {i}
            </span>
          ) : (
            <span className="text">{i}</span>
          )}
        </div>
      );
    });
  }

  onBreakpointChange = breakpoint => {
    this.setState({
      currentBreakpoint: breakpoint
    });
  };

  onCompactTypeChange = () => {
    const { compactType: oldCompactType } = this.state;
    const compactType =
      oldCompactType === "horizontal"
        ? "vertical"
        : oldCompactType === "vertical"
          ? null
          : "horizontal";
    this.setState({ compactType });
  };

  onLayoutChange = (layout, layouts) => {
    this.props.onLayoutChange(layout, layouts);
  };

  onNewLayout = () => {
    this.setState({
      layouts: { lg: generateLayout() }
    });
  };

  onDrop = (layout, layoutItem, _event) => {
    alert(
      `Dropped element props:\n${JSON.stringify(layoutItem, ["x", "y", "w", "h"], 2)}`
    );
  };

  onDropDragOver = x => {
    // console.log({x})
  };

  render() {
    return (
      <div>
        <div>
          Current Breakpoint: {this.state.currentBreakpoint} (
          {this.props.cols[this.state.currentBreakpoint]} columns)
        </div>
        <div style={{ paddingBottom: 300 }}>
          Compaction type:{" "}
          {_.capitalize(this.state.compactType) || "No Compaction"}
        </div>
        <button onClick={this.onNewLayout}>Generate New Layout</button>
        <button onClick={this.onCompactTypeChange}>
          Change Compaction Type
        </button>

        <div id="react-grid-layout">
          <ResponsiveReactGridLayout
            {...this.props}
            layouts={this.state.layouts}
            onBreakpointChange={this.onBreakpointChange}
            onLayoutChange={this.onLayoutChange}
            onDrop={this.onDrop}
            // WidthProvider option
            measureBeforeMount={false}
            // I like to have it animate on mount. If you don't, delete `useCSSTransforms` (it's default `true`)
            // and set `measureBeforeMount={true}`.
            useCSSTransforms={this.state.mounted}
            compactType={this.state.compactType}
            preventCollision={!this.state.compactType}
            onDropDragOver={this.onDropDragOver}
            isDroppable={true}
            containerPadding={[0, 0, 100, 0]}
            dndRect={this.props.dndRect}
            dndEvent={this.props.dndEvent}
          >
            {this.generateDOM()}
          </ResponsiveReactGridLayout>
        </div>
      </div>
    );
  }
}

function generateLayout() {
  return _.map(_.range(0, 25), function (item, i) {
    var y = Math.ceil(Math.random() * 4) + 1;
    return {
      x: Math.round(Math.random() * 5) * 2,
      y: Math.floor(i / 6) * y,
      w: 2,
      h: y,
      deg: 0,
      i: i.toString(),
      static: Math.random() < 0.05
    };
  });
}

const Draggable = props => {
  const { attributes, listeners, setNodeRef } = useDraggable({
    id: props.id
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{ touchAction: "manipulation" }}
    >
      {props.children}
    </div>
  );
};

const Item = ({ value }) => {
  return <div style={{ width: 100 }}>{value}</div>;
};

const App = () => {
  const [activeId, setActiveId] = useState(null);
  const [dndRect, setDndRect] = useState(null);
  const [dndEvent, setDndEvent] = useState(null);

  const touchSensor = useSensor(TouchSensor, {
    // Press delay of 250ms, with tolerance of 5px of movement
    activationConstraint: {
      delay: 250,
      tolerance: 5
    }
  });
  const mouseSensor = useSensor(MouseSensor);
  const keyboardSensor = useSensor(KeyboardSensor);
  const sensors = useSensors(mouseSensor, touchSensor, keyboardSensor);

  function handleDragStart(event) {
    setActiveId(event.active.id);
  }

  function handleDragMove(event) {
    const translated = event?.active?.rect?.current?.translated;

    setDndRect(translated);
    setDndEvent(event?.activatorEvent);
  }

  function handleDragEnd() {
    setActiveId(null);
    setDndRect(undefined);
    setDndEvent(undefined);
  }

  return (
    <DndContext
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      autoScroll={false}
      sensors={sensors}
    >
      <div style={{ display: "flex", flexDirection: "row" }}>
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            overflow: "auto",
            maxHeight: "100vh"
          }}
        >
          <div style={{ height: "110vh", width: 100, background: "red" }}></div>
          <Draggable id="1sdsds">
            <div style={{ height: 100, width: 100, background: "blue" }}></div>
          </Draggable>
          <div style={{ height: 100, width: 100, background: "red" }}></div>
        </div>
        <div style={{ width: "100%" }}>
          <DragFromOutsideLayout dndRect={dndRect} dndEvent={dndEvent} />
        </div>
      </div>

      {activeId &&
        createPortal(
          <DragOverlay>
            <Item value={`Item ${activeId}`} />
          </DragOverlay>,
          document.body
        )}
    </DndContext>
  );
};

if (process.env.STATIC_EXAMPLES === true) {
  import("../../test/test-hook.jsx").then(fn => fn.default(App));
}

export default App;
