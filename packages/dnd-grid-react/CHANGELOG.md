# Changelog

## 1.0.0 (Dec 20, 2025)

Initial release of `dnd-grid`, a draggable and resizable grid layout library for React.

### Features

- **Drag and Drop**: Fully draggable grid items with smooth animations
- **Resizable**: 8-direction resize handles (n, s, e, w, ne, nw, se, sw)
- **Rotation Support**: Items can be rotated with the `deg` property
- **Touch Support**: Mobile-friendly with configurable touch delay (`dragTouchDelayDuration`)
- **Collision Detection**: Automatic collision handling and item displacement
- **Compaction**: Vertical, horizontal, or no compaction modes
- **Static Items**: Mark items as static to prevent dragging/resizing
- **Bounds Checking**: Keep items within container bounds with `isBounded`
- **Overlap Support**: Allow items to overlap with `allowOverlap`
- **CSS Transforms**: GPU-accelerated positioning via CSS transforms
- **TypeScript**: Full TypeScript support with exported types

### Exported Types

- `DndGrid` - Main grid component
- `GridItem` - Individual grid item component
- `Layout` - Array of layout items
- `LayoutItem` - Single layout item definition
- `DndGridProps` - Props for DndGrid component
- `EventCallback` - Callback type for drag/resize events
- `ResizeHandleAxis` - Resize handle position type
- `CompactType` - Compaction mode type
- `Position` - Position object type
- `DroppingPosition` - Drop position type

### Acknowledgements

This project is based on [react-grid-layout](https://github.com/react-grid-layout/react-grid-layout) by Samuel Reed (STRML). The original project provided the foundation for the grid layout algorithms and core functionality.

Key modifications from the original:

- Complete TypeScript rewrite
- React 19 support
- Added rotation (`deg`) support for grid items
- Added touch delay duration for mobile
- Modernized build system (Vite)
- Reduced bundle size by removing unused dependencies
