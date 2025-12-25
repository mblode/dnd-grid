import type { Layout } from "../../types";

export const simpleLayout: Layout = [
  { id: "a", x: 0, y: 0, w: 2, h: 2 },
  { id: "b", x: 2, y: 0, w: 2, h: 2 },
];

export const collidingLayout: Layout = [
  { id: "a", x: 0, y: 0, w: 2, h: 2 },
  { id: "b", x: 1, y: 1, w: 2, h: 2 },
];

export const layoutWithStatic: Layout = [
  { id: "static", x: 0, y: 0, w: 2, h: 2, static: true },
  { id: "dynamic", x: 2, y: 0, w: 2, h: 2 },
];

export const complexLayout: Layout = [
  { id: "a", x: 0, y: 0, w: 4, h: 2 },
  { id: "b", x: 4, y: 0, w: 4, h: 2 },
  { id: "c", x: 8, y: 0, w: 4, h: 2 },
  { id: "d", x: 0, y: 2, w: 6, h: 2 },
  { id: "e", x: 6, y: 2, w: 6, h: 2 },
];

export const gappyLayout: Layout = [
  { id: "a", x: 0, y: 5, w: 2, h: 2 },
  { id: "b", x: 4, y: 10, w: 2, h: 2 },
];

export const horizontalGappyLayout: Layout = [
  { id: "a", x: 5, y: 0, w: 2, h: 2 },
  { id: "b", x: 10, y: 0, w: 2, h: 2 },
];

export const emptyLayout: Layout = [];
