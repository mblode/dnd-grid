<div align="center">

# [dnd-grid](https://blode.co/dnd-grid)

**A draggable and resizable grid layout for React, with weighted drag physics and a headless layout engine**

Give users a dashboard they can rearrange, and get the new layout back as JSON.

<p align="center">
  <a href="https://www.npmjs.com/package/@dnd-grid/react">
    <img src="https://img.shields.io/npm/v/@dnd-grid/react?style=flat&colorA=000000&colorB=000000" />
  </a>
  <a href="https://github.com/mblode/dnd-grid/blob/main/LICENSE.md">
    <img src="https://img.shields.io/github/license/mblode/dnd-grid?style=flat&colorA=000000&colorB=000000" />
  </a>
</p>

</div>

## Demo

Drag, resize, and drop across every example on the site, or read the API reference in the docs.

<p>
<a href="https://blode.co/dnd-grid">
<img alt="View the demo" src=".github/assets/demo.svg" width="200" />
</a>
<a href="https://blode.co/dnd-grid/docs">
<img alt="Read the docs" src=".github/assets/documentation.svg" width="200" />
</a>
</p>

## Install

```bash
npm install @dnd-grid/react
```

Add the styles to your global CSS:

```css
@import "@dnd-grid/react/styles.css";
```

## Quickstart

```tsx
import { DndGrid, type Layout } from "@dnd-grid/react";
import { useState } from "react";

const initialLayout: Layout = [
  { id: "a", x: 0, y: 0, w: 3, h: 2 },
  { id: "b", x: 3, y: 0, w: 3, h: 2 },
  { id: "c", x: 6, y: 0, w: 6, h: 2 },
];

export function Dashboard() {
  const [layout, setLayout] = useState<Layout>(initialLayout);

  return (
    <DndGrid cols={12} layout={layout} onLayoutChange={setLayout} rowHeight={50}>
      {layout.map((item) => (
        <div key={item.id}>{item.id}</div>
      ))}
    </DndGrid>
  );
}
```

## What you can do

- **Drag and resize:** weighted drag physics, configurable resize handles, edge auto-scroll, and a touch drag delay so page scrolling still works.
- **Go responsive:** breakpoint column maps, with container width measured automatically.
- **Control packing:** vertical, horizontal, and overlap compactors, plus position, size, and aspect-ratio constraints.
- **Persist layouts:** add and remove items, then serialize the layout and restore it later.
- **Theme it:** `base.css` and `theme.css` split apart, CSS variables, and data attributes on every item.
- **Announce changes:** grid semantics with configurable aria-live announcements.

## Notes

- Works with React 17, 18, and 19.
- `@dnd-grid/core` is the same layout engine with no React dependency, for building an adapter to another framework.
- Based on [react-grid-layout](https://github.com/react-grid-layout/react-grid-layout) by Samuel Reed, adding weighted drag physics, edge auto-scroll, touch drag delay, and stronger styling defaults.

## License

MIT

---

Crafted by [<img src="https://blode.co/avatar-circle.png" width="20" align="top" />](https://blode.co) [Matthew Blode](https://blode.co)
