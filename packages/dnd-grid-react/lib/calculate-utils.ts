import type { Position, PositionParams } from "./types";

// Helper for generating column width
export const calcGridColWidth = (positionParams: PositionParams): number => {
  const { margin, containerPadding, containerWidth, cols } = positionParams;
  // Guard against division by zero
  if (cols <= 0) return 0;
  return (
    (containerWidth -
      margin[1] * (cols - 1) -
      containerPadding[1] -
      containerPadding[3]) /
    cols
  );
};
// This can either be called:
// calcGridItemWHPx(w, colWidth, margin[1])
// or
// calcGridItemWHPx(h, rowHeight, margin[0])
export const calcGridItemWHPx = (
  gridUnits: number,
  colOrRowSize: number,
  marginPx: number,
): number => {
  // 0 * Infinity === NaN, which causes problems with resize contraints
  if (!Number.isFinite(gridUnits)) return gridUnits;
  return Math.round(
    colOrRowSize * gridUnits + Math.max(0, gridUnits - 1) * marginPx,
  );
};

/**
 * Return position on the page given an x, y, w, h.
 * left, top, width, height are all in pixels.
 */
export const calcGridItemPosition = (
  positionParams: PositionParams,
  x: number,
  y: number,
  w: number,
  h: number,
  deg?: number,
  state?:
    | {
        resizing?: {
          width: number;
          height: number;
          top?: number;
          left?: number;
        };
        dragging?: {
          top: number;
          left: number;
          deg: number;
        };
      }
    | null
    | undefined,
): Position => {
  const { margin, containerPadding, rowHeight } = positionParams;
  const colWidth = calcGridColWidth(positionParams);
  const rotation = deg ?? 0;
  const out: Position = {
    width: 0,
    height: 0,
    top: 0,
    left: 0,
    deg: 0,
  };

  // If resizing, use the exact width and height as returned from resizing callbacks.
  if (state?.resizing) {
    out.width = Math.round(state.resizing.width);
    out.height = Math.round(state.resizing.height);
  } // Otherwise, calculate from grid units.
  else {
    out.width = calcGridItemWHPx(w, colWidth, margin[1]);
    out.height = calcGridItemWHPx(h, rowHeight, margin[0]);
  }

  // If dragging, use the exact width and height as returned from dragging callbacks.
  if (state?.dragging) {
    out.top = Math.round(state.dragging.top);
    out.left = Math.round(state.dragging.left);
    out.deg = state.dragging.deg;
  } else if (
    state?.resizing &&
    typeof state.resizing.top === "number" &&
    typeof state.resizing.left === "number"
  ) {
    out.top = Math.round(state.resizing.top);
    out.left = Math.round(state.resizing.left);
    out.deg = rotation;
  } // Otherwise, calculate from grid units.
  else {
    out.top = Math.round((rowHeight + margin[0]) * y + containerPadding[0]);
    out.left = Math.round((colWidth + margin[1]) * x + containerPadding[3]);
    out.deg = rotation;
  }

  if (!state?.dragging && !state?.resizing) {
    if (Number.isFinite(w)) {
      const siblingLeft = Math.round(
        (colWidth + margin[1]) * (x + w) + containerPadding[3],
      );
      const actualMarginRight = siblingLeft - out.left - out.width;
      if (actualMarginRight !== margin[1]) {
        out.width += actualMarginRight - margin[1];
      }
    }

    if (Number.isFinite(h)) {
      const siblingTop = Math.round(
        (rowHeight + margin[0]) * (y + h) + containerPadding[0],
      );
      const actualMarginBottom = siblingTop - out.top - out.height;
      if (actualMarginBottom !== margin[0]) {
        out.height += actualMarginBottom - margin[0];
      }
    }
  }

  return out;
};

/**
 * Translate x and y coordinates from pixels to grid units.
 */
export const calcXYRaw = (
  positionParams: PositionParams,
  top: number,
  left: number,
): {
  x: number;
  y: number;
} => {
  const { margin, containerPadding, rowHeight } = positionParams;
  const colWidth = calcGridColWidth(positionParams);
  const x = Math.round((left - containerPadding[3]) / (colWidth + margin[1]));
  const y = Math.round((top - containerPadding[0]) / (rowHeight + margin[0]));
  return { x, y };
};

export const calcXY = (
  positionParams: PositionParams,
  top: number,
  left: number,
  w: number,
  h: number,
): {
  x: number;
  y: number;
} => {
  const { cols, maxRows } = positionParams;
  const raw = calcXYRaw(positionParams, top, left);
  // Capping
  const x = clamp(raw.x, 0, cols - w);
  const y = clamp(raw.y, 0, maxRows - h);
  return {
    x,
    y,
  };
};

/**
 * Given a height and width in pixel values, calculate grid units.
 */
export const calcWHRaw = (
  positionParams: PositionParams,
  width: number,
  height: number,
): {
  w: number;
  h: number;
} => {
  const { margin, rowHeight } = positionParams;
  const colWidth = calcGridColWidth(positionParams);
  const w = Math.round((width + margin[1]) / (colWidth + margin[1]));
  const h = Math.round((height + margin[0]) / (rowHeight + margin[0]));
  return { w, h };
};
// Similar to _.clamp
export const clamp = (
  num: number,
  lowerBound: number,
  upperBound: number,
): number => {
  return Math.max(Math.min(num, upperBound), lowerBound);
};
