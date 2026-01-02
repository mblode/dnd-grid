/** @knipignore */
// biome-ignore lint/performance/noBarrelFile: public re-export of core constraints.
export {
  applyPositionConstraints,
  applySizeConstraints,
  aspectRatio,
  boundedX,
  boundedY,
  containerBounds,
  defaultConstraints,
  getDefaultConstraints,
  gridBounds,
  maxSize,
  minMaxSize,
  minSize,
  resolveConstraints,
  snapToGrid,
} from "@dnd-grid/core";
