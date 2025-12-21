# dnd-grid

A draggable, resizable grid layout for React with sensible defaults and full control when you need it.

[![npm version](https://img.shields.io/npm/v/@dnd-grid/react.svg)](https://www.npmjs.com/package/@dnd-grid/react)
[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE.md)

## Highlights

- **Drag, drop, resize** - Smooth interactions with 8 resize handles
- **Smart layout** - Collision handling and compaction built in
- **Per-item control** - Toggle dragging, resizing, and bounds per item
- **TypeScript first** - Complete types, great editor support
- **React 17, 18, 19** - Works across modern React versions

## Quick start

```bash
npm install @dnd-grid/react
```

Import the styles once at app entry. This includes the grid layout, drag previews, and resize handles.

```tsx
import "@dnd-grid/react/styles.css";
```

## Basic usage

```tsx
import { useState } from "react";
import { DndGrid } from "@dnd-grid/react";
import "@dnd-grid/react/styles.css";

const layout = [
  { i: "a", x: 0, y: 0, w: 2, h: 2, deg: 0 },
  { i: "b", x: 2, y: 0, w: 2, h: 2, deg: 0 },
  { i: "c", x: 4, y: 0, w: 2, h: 2, deg: 0 },
];

export default function App() {
  return (
    <DndGrid layout={layout} cols={12} rowHeight={30} width={1200}>
      <div key="a">A</div>
      <div key="b">B</div>
      <div key="c">C</div>
    </DndGrid>
  );
}
```

## Controlled layout

```tsx
import { DndGrid } from "@dnd-grid/react";
import "@dnd-grid/react/styles.css";

export default function App() {
  const [layout, setLayout] = useState([
    { i: "a", x: 0, y: 0, w: 2, h: 2, deg: 0 },
  ]);

  return (
    <DndGrid
      layout={layout}
      onLayoutChange={setLayout}
      cols={12}
      rowHeight={30}
      width={1200}
    >
      <div key="a">A</div>
    </DndGrid>
  );
}
```

## Layout model

Each item in `layout` maps to a child by `key` and defines position + size:

- `i` - Stable id, must match the child key
- `x`, `y` - Column and row position
- `w`, `h` - Width and height in grid units
- `deg` - Optional rotation in degrees

## Styles

Bring your own UI. The grid ships with a small stylesheet for layout and handles, and you can override it in your app:

```tsx
import "@dnd-grid/react/styles.css";
```

## Docs

See the full API, props, and guides at https://dnd-grid.com/docs.

## License

[MIT](LICENSE.md)
