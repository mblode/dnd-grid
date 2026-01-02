import "./styles/index.css";

// biome-ignore lint/performance/noBarrelFile: public entrypoint re-exports.
export {
  compactItemHorizontal,
  compactItemVertical,
  horizontalCompactor,
  horizontalOverlapCompactor,
  noCompactor,
  resolveCompactionCollision,
  verticalCompactor,
  verticalOverlapCompactor,
} from "./compactors";
export {
  DndGrid,
  type DndGridHandle,
  type DndGridProps,
} from "./components/dnd-grid";
export type { GridItemProps } from "./components/grid-item";
export { GridItem } from "./components/grid-item";
export { ResizeHandle } from "./components/resize-handle";
export {
  ResponsiveDndGrid,
  type ResponsiveDndGridHandle,
  type ResponsiveDndGridProps,
} from "./components/responsive-dnd-grid";
export {
  applyPositionConstraints,
  applySizeConstraints,
  aspectRatio,
  boundedX,
  boundedY,
  containerBounds,
  defaultConstraints,
  gridBounds,
  maxSize,
  minMaxSize,
  minSize,
  snapToGrid,
} from "./constraints";
export {
  fastHorizontalCompactor,
  fastHorizontalOverlapCompactor,
  fastVerticalCompactor,
  fastVerticalOverlapCompactor,
} from "./extras";
export { findEmptyPosition } from "./find-empty-position";
export type {
  LayoutCommand,
  LayoutEngine,
  LayoutEngineOptions,
  LayoutEnginePlugin,
  LayoutEnginePluginContext,
  LayoutState,
} from "./layout-engine";
export { createLayoutEngine } from "./layout-engine";
export type { PointWithTimestamp, SpringConfig, SpringState } from "./spring";
export {
  calculateRotationWeight,
  calculateVelocityFromHistory,
  createLiveSpring,
  MAX_ROTATION,
  SPRING_DEFAULTS,
  VELOCITY_SCALE,
  VELOCITY_WINDOW_MS,
  velocityToRotation,
} from "./spring";
export type {
  AnimationConfig,
  AnimationSpringConfig,
  AutoScrollOptions,
  Breakpoint,
  BreakpointCols,
  Breakpoints,
  CallbackThrottleOptions,
  Compactor,
  ConstraintContext,
  DroppingPosition,
  GridDragEvent,
  GridItemDragEvent,
  GridItemResizeEvent,
  GridResizeEvent,
  ItemState,
  Layout,
  LayoutConstraint,
  LayoutItem,
  LiveAnnouncementContext,
  LiveAnnouncements,
  LiveAnnouncementsOptions,
  LiveRegionSettings,
  MissingLayoutStrategy,
  Position,
  ReducedMotionSetting,
  ResizeHandleAxis,
  ResponsiveLayouts,
  ResponsiveSpacing,
  SlotProps,
  Spacing,
  SpacingObject,
} from "./types";
export { AutoScrollActivator, TraversalOrder } from "./types";
export type {
  UseContainerWidthOptions,
  UseContainerWidthResult,
} from "./use-container-width";
export { useContainerWidth } from "./use-container-width";
export type {
  DndGridMeasurements,
  DndGridState,
  ExternalDragUpdate,
  UseDndGridApi,
  UseDndGridGridProps,
  UseDndGridItemProps,
  UseDndGridOptions,
  UseDndGridResult,
} from "./use-dnd-grid";
export { useDndGrid } from "./use-dnd-grid";
export type {
  UseDndGridResponsiveLayoutOptions,
  UseDndGridResponsiveLayoutResult,
} from "./use-dnd-grid-responsive-layout";
export { useDndGridResponsiveLayout } from "./use-dnd-grid-responsive-layout";
export type { EdgeScrollHandlers } from "./use-edge-scroll";
export { useEdgeScroll } from "./use-edge-scroll";
export {
  DndGridItemContext,
  useDndGridItemState,
  useOptionalDndGridItemState,
} from "./use-item-state";
export { useReducedMotion } from "./use-reduced-motion";
export { layoutItemSchema, layoutSchema, validateLayout } from "./validation";
