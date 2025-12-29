# Changelog

## 1.1.5

### Patch Changes

- d450b2e: Improve external drag API
- Updated dependencies [d450b2e]
  - @dnd-grid/core@1.1.5

## 1.1.4

### Patch Changes

- 72b78fc: update readme
- Updated dependencies [72b78fc]
  - @dnd-grid/core@1.1.4

## 1.1.3

### Patch Changes

- 5e0444a: remove fixed width dnd grid
- Updated dependencies [5e0444a]
  - @dnd-grid/core@1.1.3

## 1.1.2

### Patch Changes

- 75b54a9: improve the dx
- Updated dependencies [75b54a9]
  - @dnd-grid/core@1.1.2

## 1.1.1

### Patch Changes

- 44e41b9: chore: align core/react release workflow
- Updated dependencies [44e41b9]
  - @dnd-grid/core@1.1.1

## 1.1.0

### Minor Changes

- f62c7a2: Fix swing settling and placeholder alignment; export rotation weight helper

### Patch Changes

- 3a1f33f: placeholder improvements

## 1.0.7

### Patch Changes

- 708d8dd: Revert size-weighted swing

## 1.0.6

### Patch Changes

- d7ad09a: fix type errors

## 1.0.5

### Patch Changes

- 4910131: improve compactor logic

## 1.0.3 (Unreleased)

### Breaking

- Removed `deg` from the public `LayoutItem` API (rotation is internal only).

### Added

- Edge auto-scrolling during drag via the `autoScroll` prop and `useEdgeScroll`.

## 1.0.2 (Dec 21, 2025)

### Added

- GitHub Actions workflow to publish `@dnd-grid/react` to npm on version tags.
- `useDndGridItemState` hook (and `DndGridItemContext` export) for per-item state access.
- `data-*` attributes on the grid, items, and resize handles for stateful styling.
- Split styles into layered `base.css` and `theme.css`, with new `@dnd-grid/react` CSS exports.
- Trusted publishing via npm OIDC in GitHub Actions (no long-lived tokens).

## 1.0.0 (Dec 20, 2025)

Initial release of `dnd-grid`, a drag-and-drop, resizable grid layout library for React.

### Features

- **Drag-and-drop**: fully draggable grid items with smooth animations
- **Resizable**: 8-direction resize handles (n, s, e, w, ne, nw, se, sw)
- **Rotation support**: items can be rotated with the `deg` property
- **Touch support**: mobile-friendly with configurable touch delay (`dragTouchDelayDuration`)
- **Collision detection**: automatic collision handling and item displacement
- **Compaction**: vertical, horizontal, or no compaction modes
- **Static items**: mark items as static to prevent dragging/resizing
- **Bounds checking**: keep items within container bounds with `bounded`
- **Overlap support**: allow items to overlap with `allowOverlap`
- **CSS transforms**: GPU-accelerated positioning via CSS transforms
- **TypeScript**: full TypeScript support with exported types

### Exported types

- `DndGrid` - main grid component
- `GridItem` - individual grid item component
- `Layout` - array of layout items
- `LayoutItem` - single layout item definition
- `DndGridProps` - props for DndGrid component
- `GridDragEvent` - event object for drag callbacks
- `GridResizeEvent` - event object for resize callbacks
- `ResizeHandleAxis` - resize handle position type
- `CompactType` - compaction mode type
- `Position` - position object type
- `DroppingPosition` - drop position type

### Acknowledgements

Based on [react-grid-layout](https://github.com/react-grid-layout/react-grid-layout) by Samuel Reed (STRML). Differences: weighted swing physics, better styling defaults (`base.css`/`theme.css`, CSS vars, data attributes), touch drag delay, edge auto-scroll, item state hook.
