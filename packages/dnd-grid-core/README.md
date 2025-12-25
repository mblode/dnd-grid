# @dnd-grid/core

Headless layout engine and grid utilities for dnd-grid. Use this package to
build adapters for non-React runtimes or custom renderers.

## Installation

```bash
npm install @dnd-grid/core
```

## Layout engine

```ts
import { createLayoutEngine, type Layout } from "@dnd-grid/core";

const layout: Layout = [
  { id: "a", x: 0, y: 0, w: 2, h: 2 },
  { id: "b", x: 2, y: 0, w: 2, h: 2 },
];

const engine = createLayoutEngine({
  cols: 12,
  maxRows: 100,
  rowHeight: 30,
  gap: 10,
  containerPadding: 10,
  containerWidth: 1200,
  containerHeight: 800,
  state: { layout },
});

engine.commands.move({ type: "move", id: "a", x: 1, y: 0 });

const nextLayout = engine.selectors.getLayout();
```

## What it exports

- Layout engine: `createLayoutEngine` + related types.
- Compactors, constraints, responsive utilities, validation helpers, and types.

## Related packages

- `@dnd-grid/react` is the React adapter with DOM events, styles, and hooks.
