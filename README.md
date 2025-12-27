# dnd-grid

A drag-and-drop, resizable grid layout for React

<p>
  <a href="https://www.npmjs.com/package/@dnd-grid/react"><img src="https://img.shields.io/npm/v/@dnd-grid/react.svg" alt="npm version"></a>
  <a href="LICENSE.md"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT Licence"></a>
</p>

<p align="center">
  <a href="https://dnd-grid.com">
    <img alt="dnd-grid – A drag-and-drop, resizable grid layout for React" src=".github/assets/banner.png">
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

## Documentation

To learn how to get started with **dnd-grid**, visit the official documentation website for API docs, guides, and examples.

<p>
<a href="https://dnd-grid.com/docs">
<img alt="Visit dnd-grid documentation" src=".github/assets/documentation.svg" width="200" />
</a>
</p>

## Licence

[MIT](LICENSE.md)
