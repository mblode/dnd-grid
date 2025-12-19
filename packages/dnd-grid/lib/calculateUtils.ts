import { Position, PositionParams } from "./types";

// Helper for generating column width
export function calcGridColWidth(positionParams: PositionParams): number {
  const { margin, containerPadding, containerWidth, cols } = positionParams;
  return (
    (containerWidth -
      margin[1] * (cols - 1) -
      containerPadding[1] -
      containerPadding[3]) /
    cols
  );
}
// This can either be called:
// calcGridItemWHPx(w, colWidth, margin[0])
// or
// calcGridItemWHPx(h, rowHeight, margin[1])
export function calcGridItemWHPx(
  gridUnits: number,
  colOrRowSize: number,
  marginPx: number
): number {
  // 0 * Infinity === NaN, which causes problems with resize contraints
  if (!Number.isFinite(gridUnits)) return gridUnits;
  return Math.round(
    colOrRowSize * gridUnits + Math.max(0, gridUnits - 1) * marginPx
  );
}

/**
 * Return position on the page given an x, y, w, h.
 * left, top, width, height are all in pixels.
 */
export function calcGridItemPosition(
  positionParams: PositionParams,
  x: number,
  y: number,
  w: number,
  h: number,
  deg: number,
  state?: Record<string, any> | null | undefined
): Position {
  const { margin, containerPadding, rowHeight } = positionParams;
  const colWidth = calcGridColWidth(positionParams);
  const out: Position = {
    width: 0,
    height: 0,
    top: 0,
    left: 0,
    deg: 0
  };

  // If resizing, use the exact width and height as returned from resizing callbacks.
  if (state && state.resizing) {
    out.width = Math.round(state.resizing.width);
    out.height = Math.round(state.resizing.height);
  } // Otherwise, calculate from grid units.
  else {
    out.width = calcGridItemWHPx(w, colWidth, margin[1]);
    out.height = calcGridItemWHPx(h, rowHeight, margin[0]);
  }

  // If dragging, use the exact width and height as returned from dragging callbacks.
  if (state && state.dragging) {
    out.top = Math.round(state.dragging.top);
    out.left = Math.round(state.dragging.left);
    out.deg = state.dragging.deg;
  } else if (
    state &&
    state.resizing &&
    typeof state.resizing.top === "number" &&
    typeof state.resizing.left === "number"
  ) {
    out.top = Math.round(state.resizing.top);
    out.left = Math.round(state.resizing.left);
    out.deg = deg;
  } // Otherwise, calculate from grid units.
  else {
    out.top = Math.round((rowHeight + margin[0]) * y + containerPadding[0]);
    out.left = Math.round((colWidth + margin[3]) * x + containerPadding[3]);
    out.deg = deg;
  }

  return out;
}

/**
 * Translate x and y coordinates from pixels to grid units.
 */
export function calcXY(
  positionParams: PositionParams,
  top: number,
  left: number,
  w: number,
  h: number
): {
  x: number;
  y: number;
} {
  const { margin, cols, rowHeight, maxRows } = positionParams;
  const colWidth = calcGridColWidth(positionParams);
  // left = colWidth * x + margin * (x + 1)
  // l = cx + m(x+1)
  // l = cx + mx + m
  // l - m = cx + mx
  // l - m = x(c + m)
  // (l - m) / (c + m) = x
  // x = (left - margin) / (coldWidth + margin)
  let x = Math.round((left - margin[1]) / (colWidth + margin[1]));
  let y = Math.round((top - margin[0]) / (rowHeight + margin[0]));
  // Capping
  x = clamp(x, 0, cols - w);
  y = clamp(y, 0, maxRows - h);
  return {
    x,
    y
  };
}

/**
 * Given a height and width in pixel values, calculate grid units.
 */
export function calcWH(
  positionParams: PositionParams,
  width: number,
  height: number,
  x: number,
  y: number,
  handle: string
): {
  w: number;
  h: number;
} {
  const { margin, maxRows, cols, rowHeight } = positionParams;
  const colWidth = calcGridColWidth(positionParams);
  // width = colWidth * w - (margin * (w - 1))
  // ...
  // w = (width + margin) / (colWidth + margin)
  const w = Math.round((width + margin[0]) / (colWidth + margin[0]));
  const h = Math.round((height + margin[1]) / (rowHeight + margin[1]));

  // Capping
  let _w = clamp(w, 0, cols - x);

  let _h = clamp(h, 0, maxRows - y);

  if (["sw", "w", "nw"].indexOf(handle) !== -1) {
    _w = clamp(w, 0, cols);
  }

  if (["nw", "n", "ne"].indexOf(handle) !== -1) {
    _h = clamp(h, 0, maxRows);
  }

  return {
    w: _w,
    h: _h
  };
}
// Similar to _.clamp
export function clamp(
  num: number,
  lowerBound: number,
  upperBound: number
): number {
  return Math.max(Math.min(num, upperBound), lowerBound);
}
