# dnd-grid

A draggable and resizable grid layout with responsive breakpoints for React.

## Installation

```bash
npm install dnd-grid
```

## Usage

```tsx
import { DndGrid, type Layout } from "dnd-grid";

const layout: Layout = [
  { i: "a", x: 0, y: 0, w: 2, h: 2, deg: 0 },
  { i: "b", x: 2, y: 0, w: 2, h: 2, deg: 0 },
  { i: "c", x: 4, y: 0, w: 2, h: 2, deg: 0 },
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
- Draggable widgets
- Resizable widgets
- Static widgets
- Configurable packing: horizontal, vertical, or off
- Bounds checking for dragging and resizing
- Widgets may be added or removed without rebuilding grid
- Layout can be serialized and restored
- Grid Items placed using CSS Transforms

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `layout` | `Layout` | `[]` | Array of layout items |
| `cols` | `number` | `12` | Number of columns |
| `rowHeight` | `number` | `150` | Height of a row in pixels |
| `width` | `number` | required | Width of the grid container |
| `margin` | `[number, number, number, number]` | `[10, 10, 10, 10]` | Margin around items [top, right, bottom, left] |
| `containerPadding` | `[number, number, number, number]` | `null` | Container padding [top, right, bottom, left] |
| `isDraggable` | `boolean` | `true` | Enable dragging |
| `isResizable` | `boolean` | `true` | Enable resizing |
| `isBounded` | `boolean` | `false` | Keep items within container bounds |
| `isDroppable` | `boolean` | `false` | Enable dropping items from outside |
| `allowOverlap` | `boolean` | `false` | Allow items to overlap |
| `preventCollision` | `boolean` | `false` | Prevent items from colliding |
| `compactType` | `"vertical" \| "horizontal" \| null` | `"vertical"` | Compacting direction |
| `resizeHandles` | `ResizeHandleAxis[]` | `["se"]` | Resize handle positions |
| `transformScale` | `number` | `1` | Scale factor for CSS transforms |
| `dragTouchDelayDuration` | `number` | `0` | Touch delay before drag starts (ms) |

## Layout Item

Each item in the layout array has these properties:

```ts
interface LayoutItem {
  i: string;      // Unique identifier
  x: number;      // X position in grid units
  y: number;      // Y position in grid units
  w: number;      // Width in grid units
  h: number;      // Height in grid units
  deg?: number;   // Rotation in degrees
  minW?: number;  // Minimum width
  maxW?: number;  // Maximum width
  minH?: number;  // Minimum height
  maxH?: number;  // Maximum height
  static?: boolean;     // Cannot be moved or resized
  isDraggable?: boolean; // Override grid isDraggable
  isResizable?: boolean; // Override grid isResizable
  isBounded?: boolean;   // Override grid isBounded
}
```

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
| `onDropDragOver` | `(e) => { w?: number; h?: number } \| false` | Customize dropping item |

## CSS Classes

The grid uses the following CSS classes:

- `.dnd-grid` - Grid container
- `.dnd-grid-item` - Grid item
- `.dnd-grid-placeholder` - Placeholder during drag/resize
- `.dnd-draggable` - Draggable item
- `.dnd-draggable-dragging` - Item being dragged

## Acknowledgements

This project is based on [react-grid-layout](https://github.com/react-grid-layout/react-grid-layout) by Samuel Reed (STRML). The original project provided the foundation for the grid layout algorithms and core functionality.

## License

MIT License - Copyright (c) 2025 Matthew Blode
