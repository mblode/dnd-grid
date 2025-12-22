import { calcGridColWidth, calcGridItemWHPx } from "./calculate-utils";
import type {
  ConstraintContext,
  LayoutConstraint,
  LayoutItem,
  ResizeHandleAxis,
} from "./types";

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

export const gridBounds: LayoutConstraint = {
  name: "gridBounds",
  constrainPosition(
    item: LayoutItem,
    x: number,
    y: number,
    { cols, maxRows }: ConstraintContext,
  ): { x: number; y: number } {
    return {
      x: clamp(x, 0, Math.max(0, cols - item.w)),
      y: clamp(y, 0, Math.max(0, maxRows - item.h)),
    };
  },
  constrainSize(
    item: LayoutItem,
    w: number,
    h: number,
    handle: ResizeHandleAxis,
    { cols, maxRows }: ConstraintContext,
  ): { w: number; h: number } {
    const maxW =
      handle === "w" || handle === "nw" || handle === "sw"
        ? item.x + item.w
        : cols - item.x;
    const maxH =
      handle === "n" || handle === "nw" || handle === "ne"
        ? item.y + item.h
        : maxRows - item.y;
    return {
      w: clamp(w, 1, Math.max(1, maxW)),
      h: clamp(h, 1, Math.max(1, maxH)),
    };
  },
};

export const minMaxSize: LayoutConstraint = {
  name: "minMaxSize",
  constrainSize(
    item: LayoutItem,
    w: number,
    h: number,
  ): { w: number; h: number } {
    return {
      w: clamp(w, item.minW ?? 1, item.maxW ?? Number.POSITIVE_INFINITY),
      h: clamp(h, item.minH ?? 1, item.maxH ?? Number.POSITIVE_INFINITY),
    };
  },
};

export const containerBounds: LayoutConstraint = {
  name: "containerBounds",
  constrainPosition(
    item: LayoutItem,
    x: number,
    y: number,
    {
      cols,
      maxRows,
      containerHeight,
      rowHeight,
      margin,
      containerPadding,
    }: ConstraintContext,
  ): { x: number; y: number } {
    const paddingY = containerPadding[0] + containerPadding[2];
    const availableHeight =
      containerHeight > 0 ? containerHeight - paddingY : 0;
    const visibleRows =
      availableHeight > 0
        ? Math.floor((availableHeight + margin[0]) / (rowHeight + margin[0]))
        : maxRows;
    return {
      x: clamp(x, 0, Math.max(0, cols - item.w)),
      y: clamp(y, 0, Math.max(0, visibleRows - item.h)),
    };
  },
};

export const boundedX: LayoutConstraint = {
  name: "boundedX",
  constrainPosition(
    item: LayoutItem,
    x: number,
    y: number,
    { cols }: ConstraintContext,
  ): { x: number; y: number } {
    return {
      x: clamp(x, 0, Math.max(0, cols - item.w)),
      y,
    };
  },
};

export const boundedY: LayoutConstraint = {
  name: "boundedY",
  constrainPosition(
    item: LayoutItem,
    x: number,
    y: number,
    { maxRows }: ConstraintContext,
  ): { x: number; y: number } {
    return {
      x,
      y: clamp(y, 0, Math.max(0, maxRows - item.h)),
    };
  },
};

export const aspectRatio = (ratio: number): LayoutConstraint => ({
  name: `aspectRatio(${ratio})`,
  constrainSize(
    _item: LayoutItem,
    w: number,
    _h: number,
    _handle: ResizeHandleAxis,
    context: ConstraintContext,
  ): { w: number; h: number } {
    const { cols, containerWidth, rowHeight, margin, containerPadding } =
      context;
    const colWidth = calcGridColWidth({
      cols,
      containerWidth,
      rowHeight,
      maxRows: context.maxRows,
      margin,
      containerPadding,
    });
    const pixelWidth = calcGridItemWHPx(w, colWidth, margin[1]);
    const pixelHeight = pixelWidth / ratio;
    const h = Math.max(
      1,
      Math.round((pixelHeight + margin[0]) / (rowHeight + margin[0])),
    );
    return { w, h };
  },
});

export const snapToGrid = (
  stepX: number,
  stepY: number = stepX,
): LayoutConstraint => {
  if (stepX <= 0 || stepY <= 0) {
    throw new Error(
      `snapToGrid: step values must be positive (got stepX=${stepX}, stepY=${stepY})`,
    );
  }

  return {
    name: `snapToGrid(${stepX}, ${stepY})`,
    constrainPosition(
      _item: LayoutItem,
      x: number,
      y: number,
    ): { x: number; y: number } {
      return {
        x: Math.round(x / stepX) * stepX,
        y: Math.round(y / stepY) * stepY,
      };
    },
  };
};

export const minSize = (minW: number, minH: number): LayoutConstraint => ({
  name: `minSize(${minW}, ${minH})`,
  constrainSize(
    _item: LayoutItem,
    w: number,
    h: number,
  ): { w: number; h: number } {
    return {
      w: Math.max(minW, w),
      h: Math.max(minH, h),
    };
  },
});

export const maxSize = (maxW: number, maxH: number): LayoutConstraint => ({
  name: `maxSize(${maxW}, ${maxH})`,
  constrainSize(
    _item: LayoutItem,
    w: number,
    h: number,
  ): { w: number; h: number } {
    return {
      w: Math.min(maxW, w),
      h: Math.min(maxH, h),
    };
  },
});

export const defaultConstraints: LayoutConstraint[] = [gridBounds, minMaxSize];

export const applyPositionConstraints = (
  constraints: LayoutConstraint[],
  item: LayoutItem,
  x: number,
  y: number,
  context: ConstraintContext,
): { x: number; y: number } => {
  let result = { x, y };

  for (const constraint of constraints) {
    if (constraint.constrainPosition) {
      result = constraint.constrainPosition(item, result.x, result.y, context);
    }
  }

  if (item.constraints) {
    for (const constraint of item.constraints) {
      if (constraint.constrainPosition) {
        result = constraint.constrainPosition(
          item,
          result.x,
          result.y,
          context,
        );
      }
    }
  }

  return result;
};

export const applySizeConstraints = (
  constraints: LayoutConstraint[],
  item: LayoutItem,
  w: number,
  h: number,
  handle: ResizeHandleAxis,
  context: ConstraintContext,
): { w: number; h: number } => {
  let result = { w, h };

  for (const constraint of constraints) {
    if (constraint.constrainSize) {
      result = constraint.constrainSize(
        item,
        result.w,
        result.h,
        handle,
        context,
      );
    }
  }

  if (item.constraints) {
    for (const constraint of item.constraints) {
      if (constraint.constrainSize) {
        result = constraint.constrainSize(
          item,
          result.w,
          result.h,
          handle,
          context,
        );
      }
    }
  }

  return result;
};
