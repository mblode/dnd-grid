# dnd-grid

A drag-and-drop (DnD), resizable grid layout for React with sensible defaults and full control when you need it.

[![npm version](https://img.shields.io/npm/v/@dnd-grid/react.svg)](https://www.npmjs.com/package/@dnd-grid/react)
[![MIT Licence](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE.md)

## Highlights

- **Drag-and-drop and resize** - smooth interactions with 8 resize handles
- **Smart layout** - collision handling and compaction built in
- **Per-item control** - toggle dragging, resizing, and bounds per item
- **TypeScript first** - complete types, great editor support
- **Styling hooks** - CSS variables, data attributes, and item state hook
- **React 17, 18, 19** - works across modern React versions

## Quick start

```bash
npm install @dnd-grid/react
```

Import the styles once at app entry. This includes the grid layout, drag previews, and resize handles.

```tsx
import "@dnd-grid/react/styles.css";
```

If you want to split layout and theme, import the layers separately:

```tsx
import "@dnd-grid/react/base.css";
import "@dnd-grid/react/theme.css";
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
- `deg` - Rotation in degrees (use `0` for none)

## Styles

Bring your own UI. The grid ships with a small stylesheet for layout and handles, and you can override it in your app:

```tsx
import "@dnd-grid/react/styles.css";
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

The grid also adds composable `data-*` attributes for state-aware styling:

- `data-dnd-grid` on the container
- `data-dnd-grid-item` on each item
- `data-dnd-grid-handle` and `data-handle-axis` on resize handles
- `data-dragging`, `data-resizing`, `data-settling`, `data-disabled`, `data-draggable`, `data-resizable` on items when true

```css
[data-dnd-grid-item][data-dragging] {
  opacity: 0.8;
}

[data-dnd-grid-handle][data-handle-axis="se"] {
  cursor: se-resize;
}
```

## Item state hook

Access an item's layout and interaction state from within its child component:

```tsx
import { useDndGridItemState } from "@dnd-grid/react";

function Card() {
  const { item, state } = useDndGridItemState();
  return (
    <div className={state.dragging ? "is-dragging" : ""}>
      {state.dragging ? "Moving..." : `Item ${item.i}`}
    </div>
  );
}
```

The hook must be used inside a `DndGrid` item (it throws if rendered elsewhere).

## Documentation

See the full API, props, and guides at https://dnd-grid.com/docs.

## Licence

[MIT](LICENSE.md)
