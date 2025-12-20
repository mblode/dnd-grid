# dnd-grid

A draggable and resizable grid layout for React.

[![npm version](https://img.shields.io/npm/v/@dnd-grid/react.svg)](https://www.npmjs.com/package/@dnd-grid/react)
[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE.md)

## Features

- **Drag and drop** - Move items freely around the grid
- **Resize** - Resize from any edge or corner with 8 handle positions
- **Smart layout** - Automatic collision detection and compaction
- **Flexible** - Per-item controls for drag, resize, and bounds
- **TypeScript** - Full type definitions included
- **React 17, 18, 19** - Works with all modern React versions

## Installation

```bash
npm install @dnd-grid/react react-draggable react-resizable
```

## Usage

```tsx
import { DndGrid } from "@dnd-grid/react";
import "@dnd-grid/react/styles.css";

const layout = [
  { i: "a", x: 0, y: 0, w: 2, h: 2, deg: 0 },
  { i: "b", x: 2, y: 0, w: 2, h: 2, deg: 0 },
  { i: "c", x: 4, y: 0, w: 2, h: 2, deg: 0 },
];

function App() {
  return (
    <DndGrid layout={layout} cols={12} rowHeight={30} width={1200}>
      <div key="a">A</div>
      <div key="b">B</div>
      <div key="c">C</div>
    </DndGrid>
  );
}
```

## Documentation

[Read the full documentation](https://dnd-grid.com/docs)

## License

[MIT](LICENSE.md)
