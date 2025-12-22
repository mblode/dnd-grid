# @dnd-grid/react

A drag-and-drop (DnD), resizable grid layout with responsive breakpoints for React.

## Installation

```bash
npm install @dnd-grid/react
```

## Usage

```tsx
import { useState } from "react";
import { DndGrid, type Layout } from "@dnd-grid/react";
import "@dnd-grid/react/styles.css";

const layout: Layout = [
  { i: "a", x: 0, y: 0, w: 2, h: 2 },
  { i: "b", x: 2, y: 0, w: 2, h: 2 },
  { i: "c", x: 4, y: 0, w: 2, h: 2 },
];

function MyGrid() {
  const [currentLayout, setLayout] = useState(layout);

  return (
    <DndGrid
      layout={currentLayout}
      cols={12}
      rowHeight={30}
      width={1200}
      onLayoutChange={(newLayout) => setLayout(newLayout)}
    >
      <div key="a">A</div>
      <div key="b">B</div>
      <div key="c">C</div>
    </DndGrid>
  );
}
```

## Features

- 100% React - no jQuery
- Compatible with server-rendered apps
- Drag-and-drop widgets
- Resizable widgets
- Auto-scroll near edges while dragging
- State-aware styling via data attributes and item hooks
- Static widgets
- Configurable packing: horizontal, vertical, or off
- Bounds checking for dragging and resizing
- Widgets may be added or removed without rebuilding grid
- Layout can be serialised and restored
- Grid items placed using CSS transforms

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `layout` | `Layout` | `[]` | Array of layout items |
| `cols` | `number` | `12` | Number of columns |
| `rowHeight` | `number` | `150` | Height of a row in pixels |
| `width` | `number` | required | Width of the grid container |
| `autoSize` | `boolean` | `true` | Auto-size the container height |
| `maxRows` | `number` | `Infinity` | Maximum number of rows |
| `margin` | `number \| { top: number; right: number; bottom: number; left: number }` | `10` | Margin around items |
| `containerPadding` | `number \| { top: number; right: number; bottom: number; left: number } \| null` | `null` | Container padding (null uses margin) |
| `isDraggable` | `boolean` | `true` | Enable dragging |
| `isResizable` | `boolean` | `true` | Enable resizing |
| `autoScroll` | `boolean \| AutoScrollOptions` | `true` | Auto-scroll when dragging near scroll edges |
| `isBounded` | `boolean` | `false` | Keep items within container bounds |
| `isDroppable` | `boolean` | `false` | Enable dropping items from outside |
| `compactor` | `Compactor` | `verticalCompactor` | Compaction strategy |
| `constraints` | `LayoutConstraint[]` | `defaultConstraints` | Constraints applied during drag/resize |
| `resizeHandles` | `ResizeHandleAxis[]` | `["se"]` | Resize handle positions |
| `transformScale` | `number` | `1` | Scale factor for CSS transforms |
| `dragTouchDelayDuration` | `number` | `250` | Touch delay before drag starts (ms) |

Layout must be defined via the `layout` prop; `data-grid` on children is not supported.

## Responsive layouts

Compose responsive behavior with hooks:

```tsx
import { DndGrid, useContainerWidth, useDndGridResponsiveLayout } from "@dnd-grid/react";

const layouts = {
  lg: [{ i: "a", x: 0, y: 0, w: 3, h: 2 }],
  md: [{ i: "a", x: 0, y: 0, w: 4, h: 2 }],
};

function ResponsiveGrid() {
  const { width, containerRef, mounted } = useContainerWidth({
    measureBeforeMount: true,
  });

  const { gridProps, handleLayoutChange } = useDndGridResponsiveLayout({
    width,
    layouts,
    margin: { lg: 16, md: { top: 12, right: 16, bottom: 12, left: 16 } },
    containerPadding: 16,
  });

  return (
    <div ref={containerRef}>
      {mounted && (
        <DndGrid width={width} {...gridProps} onLayoutChange={handleLayoutChange}>
          <div key="a">A</div>
          <div key="b">B</div>
        </DndGrid>
      )}
    </div>
  );
}
```

## Layout item

Each item in the layout array has these properties:

```ts
interface LayoutItem {
  i: string;      // Unique identifier
  x: number;      // X position in grid units
  y: number;      // Y position in grid units
  w: number;      // Width in grid units
  h: number;      // Height in grid units
  minW?: number;  // Minimum width
  maxW?: number;  // Maximum width
  minH?: number;  // Minimum height
  maxH?: number;  // Maximum height
  resizeHandles?: ResizeHandleAxis[]; // Override resize handle positions
  constraints?: LayoutConstraint[]; // Per-item constraints
  static?: boolean;     // Cannot be moved or resized
  isDraggable?: boolean; // Override grid isDraggable
  isResizable?: boolean; // Override grid isResizable
  isBounded?: boolean;   // Override grid isBounded
}
```

## Styles

The default stylesheet ships as layout + theme layers. Import the combined file, or split them as needed:

```tsx
import "@dnd-grid/react/styles.css";
```

```tsx
import "@dnd-grid/react/base.css";
import "@dnd-grid/react/theme.css";
```

Theme variables are exposed as CSS custom properties:

```css
:root {
  --dnd-grid-scale: 1;
  --dnd-grid-radius: 24px;
  --dnd-grid-placeholder-bg: rgba(0, 0, 0, 0.012);
  --dnd-grid-placeholder-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.06);
  --dnd-grid-handle-size: 16px;
  --dnd-grid-handle-bg: rgb(255, 255, 255);
  --dnd-grid-handle-shadow: 0 0 1px 1px rgba(0, 0, 0, 0.06),
    0 9px 9px rgba(0, 0, 0, 0.04),
    0 5.83333px 5.27083px rgba(0, 0, 0, 0.03),
    0 3.46667px 2.86667px rgba(0, 0, 0, 0.024),
    0 1.8px 1.4625px rgba(0, 0, 0, 0.02),
    0 0.733333px 0.733333px rgba(0, 0, 0, 0.016);
  --dnd-grid-transition-duration: 200ms;
  --dnd-grid-transition-easing: cubic-bezier(0.2, 0, 0, 1);
}
```

## Compactors

Compactors control how items are packed after drag/resize. You can use the built-ins or provide your own:

```tsx
import {
  verticalCompactor,
  horizontalCompactor,
  noCompactor,
  wrapCompactor,
  fastVerticalCompactor,
} from "@dnd-grid/react";

<DndGrid compactor={verticalCompactor} />;
<DndGrid compactor={horizontalCompactor} />;
<DndGrid compactor={noCompactor} />;
<DndGrid compactor={wrapCompactor} />;
<DndGrid compactor={fastVerticalCompactor} />;
```

## Constraints

Constraints let you enforce rules during drag/resize:

```tsx
import { defaultConstraints, aspectRatio, gridBounds } from "@dnd-grid/react";

<DndGrid constraints={[gridBounds, aspectRatio(16 / 9)]} />;
```

## Item state hook

Read the layout item and interaction state from within a child component:

```tsx
import { useDndGridItemState } from "@dnd-grid/react";

function Card() {
  const { item, state } = useDndGridItemState();
  return (
    <div className={state.resizing ? "is-resizing" : ""}>
      Item {item.i}
    </div>
  );
}
```

The hook must be used inside a `DndGrid` item (it throws if rendered elsewhere).

## Callbacks

| Callback | Type | Description |
|----------|------|-------------|
| `onLayoutChange` | `(layout: Layout) => void` | Called when layout changes |
| `onDragStart` | `(layout, oldItem, newItem, placeholder, e, node) => void` | Called when drag starts |
| `onDrag` | `(layout, oldItem, newItem, placeholder, e, node) => void` | Called during drag |
| `onDragStop` | `(layout, oldItem, newItem, placeholder, e, node) => void` | Called when drag stops |
| `onResizeStart` | `(layout, oldItem, newItem, placeholder, e, node) => void` | Called when resize starts |
| `onResize` | `(layout, oldItem, newItem, placeholder, e, node) => void` | Called during resize |
| `onResizeStop` | `(layout, oldItem, newItem, placeholder, e, node) => void` | Called when resize stops |
| `onDrop` | `(layout, item, e) => void` | Called when item is dropped |
| `onDropDragOver` | `(e) => { w?: number; h?: number } \| false` | Customise dropping item |

## CSS classes

Common CSS classes include:

- `.dnd-grid` - Grid container
- `.dnd-grid-item` - Grid item
- `.dnd-grid-item-content` - Non-placeholder grid item
- `.dnd-grid-placeholder` - Placeholder during drag/resize
- `.dnd-draggable` - Draggable item
- `.dnd-draggable-dragging` - Item being dragged
- `.resizing` - Item currently being resized
- `.static` - Static (locked) item
- `.dnd-grid-animating` - Item settling after drag
- `.dropping` - Dropping placeholder item
- `.dnd-grid-resize-handle` - Resize handle element
- `body.dnd-grid-dragging` - Global dragging state
- `body.dnd-grid-resizing` - Global resizing state

## Data attributes

The grid sets `data-*` attributes for stateful styling:

- `data-dnd-grid` on the container
- `data-dnd-grid-item` on each item
- `data-dnd-grid-handle` and `data-handle-axis` on resize handles
- `data-dragging`, `data-resizing`, `data-settling`, `data-disabled`, `data-draggable`, `data-resizable` on items when true

```css
[data-dnd-grid-item][data-resizing] {
  z-index: 10;
}

[data-dnd-grid-handle][data-handle-axis="sw"] {
  cursor: sw-resize;
}
```

## Acknowledgements

This project is based on [react-grid-layout](https://github.com/react-grid-layout/react-grid-layout) by Samuel Reed (STRML). The original project provided the foundation for the grid layout algorithms and core functionality.

## Licence

MIT Licence - Copyright (c) 2025 Matthew Blode
