<p align="center">
  <a href="https://dnd-grid.com">
    <img alt="dnd-grid – A drag-and-drop, resizable grid layout for React" src=".github/assets/banner.png">
  </a>
</p>

<p>
  <a href="https://www.npmjs.com/package/@dnd-grid/react"><img src="https://img.shields.io/npm/v/@dnd-grid/react.svg" alt="npm version"></a>
  <a href="LICENSE.md"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT Licence"></a>
</p>

- **Drag + resize:** smooth interactions with weighted drag physics and configurable handles.
- **Responsive layouts:** breakpoint helpers and automatic container width measurement.
- **Compaction + constraints:** packing strategies, collision handling, and bounds control.
- **Edge auto-scroll:** keep dragging near scroll boundaries.
- **Touch-friendly:** configurable touch drag delay.
- **Styling defaults + hooks:** `base.css`/`theme.css`, CSS variables, data attributes, and item state hook.
- **Accessible grid:** grid semantics plus configurable aria-live announcements.
- **Headless core engine:** `@dnd-grid/core` handles layout math with a React adapter on top.
- **Layout persistence:** add/remove widgets and serialize/restore layouts.

## Documentation

To learn how to get started with **dnd-grid**, visit the official documentation website for API docs, guides, and examples.

<p>
<a href="https://dnd-grid.com/docs">
<img alt="Visit dnd-grid documentation" src=".github/assets/documentation.svg" width="200" />
</a>
</p>

## Demo

Try the live demo.

<p>
<a href="https://dnd-grid.com">
<img alt="View dnd-grid demo" src=".github/assets/demo.svg" width="200" />
</a>
</p>

## Installation

```bash
npm install @dnd-grid/react
```

Add the styles to your global CSS:

```css
@import "@dnd-grid/react/styles.css";
```

## Usage

```tsx
import { DndGrid, type Layout } from "@dnd-grid/react";

<DndGrid layout={layout} cols={12} rowHeight={50} onLayoutChange={setLayout}>
  {layout.map((item) => (
    <div key={item.id}>{item.id}</div>
  ))}
</DndGrid>;
```

## Acknowledgements

Based on [react-grid-layout](https://github.com/react-grid-layout/react-grid-layout) by Samuel Reed (STRML). Differences: weighted drag physics, better styling defaults (`base.css`/`theme.css`, CSS vars, data attributes), touch drag delay, edge auto-scroll, item state hook.

## Licence

[MIT](LICENSE.md)
