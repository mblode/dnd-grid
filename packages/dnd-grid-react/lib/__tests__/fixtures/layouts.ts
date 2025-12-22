import type { Layout } from "../../types";

// Simple 2-item layout
export const simpleLayout: Layout = [
  { i: "a", x: 0, y: 0, w: 2, h: 2 },
  { i: "b", x: 2, y: 0, w: 2, h: 2 },
];

// Layout with collision
export const collidingLayout: Layout = [
  { i: "a", x: 0, y: 0, w: 2, h: 2 },
  { i: "b", x: 1, y: 1, w: 2, h: 2 },
];

// Layout with static item
export const layoutWithStatic: Layout = [
  { i: "static", x: 0, y: 0, w: 2, h: 2, static: true },
  { i: "dynamic", x: 2, y: 0, w: 2, h: 2 },
];

// Complex grid layout
export const complexLayout: Layout = [
  { i: "a", x: 0, y: 0, w: 4, h: 2 },
  { i: "b", x: 4, y: 0, w: 4, h: 2 },
  { i: "c", x: 8, y: 0, w: 4, h: 2 },
  { i: "d", x: 0, y: 2, w: 6, h: 2 },
  { i: "e", x: 6, y: 2, w: 6, h: 2 },
];

// Empty layout
export const emptyLayout: Layout = [];

// Layout for testing vertical compaction
export const gappyLayout: Layout = [
  { i: "a", x: 0, y: 5, w: 2, h: 2 },
  { i: "b", x: 4, y: 10, w: 2, h: 2 },
];

// Layout for testing horizontal compaction
export const horizontalGappyLayout: Layout = [
  { i: "a", x: 5, y: 0, w: 2, h: 2 },
  { i: "b", x: 10, y: 0, w: 2, h: 2 },
];
