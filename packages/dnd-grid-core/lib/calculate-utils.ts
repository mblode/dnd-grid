import type { Position, PositionParams } from "./types";

export const calcGridColWidth = (positionParams: PositionParams): number => {
  const { gap, containerPadding, containerWidth, cols } = positionParams;
  if (cols <= 0) {
    return 0;
  }
  return (
    (containerWidth -
      gap[1] * (cols - 1) -
      containerPadding[1] -
      containerPadding[3]) /
    cols
  );
};

export const calcGridItemWHPx = (
  gridUnits: number,
  colOrRowSize: number,
  marginPx: number
): number => {
  if (!Number.isFinite(gridUnits)) {
    return gridUnits;
  }
  return Math.round(
    colOrRowSize * gridUnits + Math.max(0, gridUnits - 1) * marginPx
  );
};

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
    | undefined
): Position => {
  const { gap, containerPadding, rowHeight } = positionParams;
  const colWidth = calcGridColWidth(positionParams);
  const rotation = deg ?? 0;
  const out: Position = {
    width: 0,
    height: 0,
    top: 0,
    left: 0,
    deg: 0,
  };

  if (state?.resizing) {
    out.width = Math.round(state.resizing.width);
    out.height = Math.round(state.resizing.height);
  } else {
    out.width = calcGridItemWHPx(w, colWidth, gap[1]);
    out.height = calcGridItemWHPx(h, rowHeight, gap[0]);
  }

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
  } else {
    out.top = Math.round((rowHeight + gap[0]) * y + containerPadding[0]);
    out.left = Math.round((colWidth + gap[1]) * x + containerPadding[3]);
    out.deg = rotation;
  }

  if (!(state?.dragging || state?.resizing)) {
    if (Number.isFinite(w)) {
      const siblingLeft = Math.round(
        (colWidth + gap[1]) * (x + w) + containerPadding[3]
      );
      const actualMarginRight = siblingLeft - out.left - out.width;
      if (actualMarginRight !== gap[1]) {
        out.width += actualMarginRight - gap[1];
      }
    }

    if (Number.isFinite(h)) {
      const siblingTop = Math.round(
        (rowHeight + gap[0]) * (y + h) + containerPadding[0]
      );
      const actualMarginBottom = siblingTop - out.top - out.height;
      if (actualMarginBottom !== gap[0]) {
        out.height += actualMarginBottom - gap[0];
      }
    }
  }

  return out;
};

export const calcXYRaw = (
  positionParams: PositionParams,
  top: number,
  left: number
): {
  x: number;
  y: number;
} => {
  const { gap, containerPadding, rowHeight } = positionParams;
  const colWidth = calcGridColWidth(positionParams);
  const x = Math.round((left - containerPadding[3]) / (colWidth + gap[1]));
  const y = Math.round((top - containerPadding[0]) / (rowHeight + gap[0]));
  return { x, y };
};

export const calcXY = (
  positionParams: PositionParams,
  top: number,
  left: number,
  w: number,
  h: number
): {
  x: number;
  y: number;
} => {
  const { cols, maxRows } = positionParams;
  const raw = calcXYRaw(positionParams, top, left);
  const x = clamp(raw.x, 0, cols - w);
  const y = clamp(raw.y, 0, maxRows - h);
  return {
    x,
    y,
  };
};

export const calcWHRaw = (
  positionParams: PositionParams,
  width: number,
  height: number
): {
  w: number;
  h: number;
} => {
  const { gap, rowHeight } = positionParams;
  const colWidth = calcGridColWidth(positionParams);
  const w = Math.round((width + gap[1]) / (colWidth + gap[1]));
  const h = Math.round((height + gap[0]) / (rowHeight + gap[0]));
  return { w, h };
};

export const clamp = (
  num: number,
  lowerBound: number,
  upperBound: number
): number => {
  return Math.max(Math.min(num, upperBound), lowerBound);
};
