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
  { id: "a", x: 0, y: 0, w: 2, h: 2 },
  { id: "b", x: 2, y: 0, w: 2, h: 2 },
  { id: "c", x: 4, y: 0, w: 2, h: 2 },
];

function MyGrid() {
  const [currentLayout, setLayout] = useState(layout);

  return (
    <DndGrid
      layout={currentLayout}
      cols={12}
      rowHeight={30}
      onLayoutChange={(newLayout) => setLayout(newLayout)}
    >
      <div key="a">A</div>
      <div key="b">B</div>
      <div key="c">C</div>
    </DndGrid>
  );
}
```

## Headless usage (advanced)

`DndGrid` is the recommended default. If you need a custom wrapper or want to
control item rendering, use the headless `useDndGrid` hook and render
`GridItem` manually.

Docs: https://dnd-grid.com/docs/hooks/use-dnd-grid

## Auto width by default

`DndGrid` and `ResponsiveDndGrid` measure container width with
`ResizeObserver`. Use `containerProps` to style the measurement wrapper, and
`measureBeforeMount` / `initialWidth` to control the first render.

```tsx
import { DndGrid, type Layout } from "@dnd-grid/react";

const layout: Layout = [
  { id: "a", x: 0, y: 0, w: 2, h: 2 },
  { id: "b", x: 2, y: 0, w: 2, h: 2 },
];

function MyGrid() {
  return (
    <DndGrid
      layout={layout}
      cols={12}
      rowHeight={30}
      containerProps={{ className: "w-full", style: { maxWidth: 600 } }}
    >
      <div key="a">A</div>
      <div key="b">B</div>
    </DndGrid>
  );
}
```

## Fixed width (when you already have it)

If you already measure width (SSR or custom measurement), use
`FixedWidthDndGrid` and pass the width yourself:

```tsx
import {
  FixedWidthDndGrid,
  type Layout,
  useContainerWidth,
} from "@dnd-grid/react";

const layout: Layout = [
  { id: "a", x: 0, y: 0, w: 2, h: 2 },
  { id: "b", x: 2, y: 0, w: 2, h: 2 },
];

function MyGrid() {
  const { width, containerRef, mounted } = useContainerWidth({
    measureBeforeMount: true,
    initialWidth: 600,
  });

  return (
    <div ref={containerRef} className="w-full" style={{ maxWidth: 600 }}>
      {mounted && width > 0 && (
        <FixedWidthDndGrid
          layout={layout}
          cols={12}
          rowHeight={30}
          width={width}
        >
          <div key="a">A</div>
          <div key="b">B</div>
        </FixedWidthDndGrid>
      )}
    </div>
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
| `children` | `ReactNode` | required | Grid items; each child `key` must match a layout `id`. |
| `layout` | `Layout` | `[]` | Array of layout items; missing entries are derived from children (dev warning). |
| `measureBeforeMount` | `boolean` | `true` | Delay rendering until the container width is measured. |
| `initialWidth` | `number` | `1280` | Width used before measurement when rendering early. |
| `containerProps` | `HTMLAttributes<HTMLDivElement>` | `undefined` | Props applied to the measurement wrapper. |
| `cols` | `number` | `12` | Number of columns |
| `rowHeight` | `number` | `150` | Height of a row in pixels |
| `autoSize` | `boolean` | `true` | Auto-size the container height |
| `maxRows` | `number` | `Infinity` | Maximum number of rows |
| `gap` | `number \| { top: number; right: number; bottom: number; left: number }` | `10` | Gap around items |
| `containerPadding` | `number \| { top: number; right: number; bottom: number; left: number } \| null` | `null` | Container padding (null uses gap) |
| `className` | `string` | `""` | Extra class for the grid container |
| `style` | `CSSProperties` | `{}` | Inline styles for the grid container |
| `draggable` | `boolean` | `true` | Enable dragging |
| `resizable` | `boolean` | `true` | Enable resizing |
| `autoScroll` | `boolean \| AutoScrollOptions` | `true` | Auto-scroll when dragging near scroll edges |
| `bounded` | `boolean` | `false` | Keep items within container bounds |
| `compactor` | `Compactor` | `verticalCompactor` | Compaction strategy |
| `constraints` | `LayoutConstraint[]` | `defaultConstraints` | Constraints applied during drag/resize |
| `validation` | `boolean` | `true in dev, false in prod` | Validate layouts at runtime with Zod |
| `callbackThrottle` | `number \| { drag?: number; resize?: number }` | `undefined` | Throttle `onDrag` and `onResize` callbacks |
| `animationConfig` | `AnimationConfig` | `default config` | Configure spring and shadow animations |
| `reducedMotion` | `ReducedMotionSetting \| boolean` | `"system"` | Motion preference override |
| `resizeHandles` | `ResizeHandleAxis[]` | `["se"]` | Resize handle positions |
| `resizeHandle` | `ReactElement \| ((axis, ref) => ReactElement)` | `undefined` | Custom resize handle component |
| `transformScale` | `number` | `1` | Scale factor for CSS transforms |
| `dragTouchDelayDuration` | `number` | `250` | Touch delay before drag starts (ms) |
| `dragHandle` | `string` | `""` | Selector for drag handles |
| `dragCancel` | `string` | `""` | Selector for elements that cancel drag |
| `droppingItem` | `Partial<LayoutItem>` | `{ id: "__dropping-elem__", w: 1, h: 1 }` | Defaults for the dropping placeholder |
| `slotProps` | `SlotProps` | `undefined` | Slot styling for items, placeholders, and handles |
| `liveAnnouncements` | `LiveAnnouncementsOptions \| false` | `enabled` | Configure aria-live announcements or disable |
| `innerRef` | `Ref<HTMLDivElement>` | `undefined` | Ref to the container element |
| `aria-label` | `string` | `undefined` | Accessible label for the grid |
| `aria-labelledby` | `string` | `undefined` | ID(s) of labelling elements |
| `aria-describedby` | `string` | `undefined` | ID(s) of descriptive elements |

Layout is provided via the `layout` prop; `data-grid` on children is not supported.
Missing layout entries are derived from children (with a dev warning).

Drop behavior is enabled when you provide `onDrop` or `onDropDragOver`.

`DndGrid` renders `role="grid"` and assigns `role="gridcell"` plus row/column indices to items. Placeholders and static items are excluded from set indexing.

## Responsive layouts

Use `ResponsiveDndGrid` for breakpoint-aware layouts:

```tsx
import { ResponsiveDndGrid, type ResponsiveLayouts } from "@dnd-grid/react";

const layouts: ResponsiveLayouts = {
  lg: [{ id: "a", x: 0, y: 0, w: 3, h: 2 }],
  md: [{ id: "a", x: 0, y: 0, w: 4, h: 2 }],
};

function ResponsiveGrid() {
  return (
    <ResponsiveDndGrid
      layouts={layouts}
      gap={{ lg: 16, md: { top: 12, right: 16, bottom: 12, left: 16 } }}
      containerPadding={16}
    >
      <div key="a">A</div>
      <div key="b">B</div>
    </ResponsiveDndGrid>
  );
}
```

For custom wrappers or manual width control, compose
`useDndGridResponsiveLayout` with `FixedWidthDndGrid`.

## Layout item

Each item in the layout array has these properties:

```ts
interface LayoutItem {
  id: string;     // Unique identifier
  x: number;      // X position in grid units
  y: number;      // Y position in grid units
  w: number;      // Width in grid units
  h: number;      // Height in grid units
  minW?: number;  // Minimum width
  maxW?: number;  // Maximum width
  minH?: number;  // Minimum height
  maxH?: number;  // Maximum height
  data?: TData;   // Optional metadata
  resizeHandles?: ResizeHandleAxis[]; // Override resize handle positions
  constraints?: LayoutConstraint[]; // Per-item constraints
  static?: boolean;     // Cannot be moved or resized
  draggable?: boolean; // Override grid draggable
  resizable?: boolean; // Override grid resizable
  bounded?: boolean;   // Override grid bounded
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
  fastVerticalCompactor,
} from "@dnd-grid/react";

<DndGrid compactor={verticalCompactor} />;
<DndGrid compactor={horizontalCompactor} />;
<DndGrid compactor={noCompactor} />;
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
      Item {item.id}
    </div>
  );
}
```

The hook must be used inside a `DndGrid` item (it throws if rendered elsewhere).

## Callbacks

| Callback | Type | Description |
|----------|------|-------------|
| `onLayoutChange` | `(layout: Layout) => void` | Called when layout changes |
| `onDragStart` | `(event: GridDragEvent) => void` | Called when drag starts |
| `onDrag` | `(event: GridDragEvent) => void` | Called during drag |
| `onDragEnd` | `(event: GridDragEvent) => void` | Called when drag ends |
| `onResizeStart` | `(event: GridResizeEvent) => void` | Called when resize starts |
| `onResize` | `(event: GridResizeEvent) => void` | Called during resize |
| `onResizeEnd` | `(event: GridResizeEvent) => void` | Called when resize ends |
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
- `data-dnd-grid-live-region` on the aria-live element
- `data-dnd-grid-item` on each item
- `data-dnd-grid-item-id` on each item
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
