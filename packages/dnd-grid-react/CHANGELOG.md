# Changelog

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
- **Bounds checking**: keep items within container bounds with `isBounded`
- **Overlap support**: allow items to overlap with `allowOverlap`
- **CSS transforms**: GPU-accelerated positioning via CSS transforms
- **TypeScript**: full TypeScript support with exported types

### Exported types

- `DndGrid` - main grid component
- `GridItem` - individual grid item component
- `Layout` - array of layout items
- `LayoutItem` - single layout item definition
- `DndGridProps` - props for DndGrid component
- `EventCallback` - callback type for drag/resize events
- `ResizeHandleAxis` - resize handle position type
- `CompactType` - compaction mode type
- `Position` - position object type
- `DroppingPosition` - drop position type

### Acknowledgements

Based on [react-grid-layout](https://github.com/react-grid-layout/react-grid-layout) by Samuel Reed (STRML). Differences: weighted swing physics, better styling defaults (`base.css`/`theme.css`, CSS vars, data attributes), touch drag delay, edge auto-scroll, item state hook.
