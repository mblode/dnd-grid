import type { Compactor, CompactType } from "./types";
import { compact, moveElement } from "./utils";

const createLegacyCompactor = (
  compactType: CompactType,
  allowOverlap: boolean,
  preventCollision: boolean,
): Compactor => ({
  type: compactType ?? null,
  allowOverlap,
  preventCollision,
  compact(layout, cols) {
    return compact(layout, compactType, cols, allowOverlap);
  },
  onMove(layout, item, x, y, cols) {
    return moveElement(
      layout,
      item,
      x,
      y,
      true,
      preventCollision,
      compactType,
      cols,
      allowOverlap,
    );
  },
});

const compactorCache = new Map<string, Compactor>();

export const getCompactor = (
  compactType: CompactType = "vertical",
  allowOverlap = false,
  preventCollision = false,
): Compactor => {
  const key = `${compactType ?? "null"}|${allowOverlap ? 1 : 0}|${preventCollision ? 1 : 0}`;
  const existing = compactorCache.get(key);
  if (existing) {
    return existing;
  }
  const compactor = createLegacyCompactor(
    compactType,
    allowOverlap,
    preventCollision,
  );
  compactorCache.set(key, compactor);
  return compactor;
};

export const verticalCompactor = getCompactor("vertical", false, false);
export const horizontalCompactor = getCompactor("horizontal", false, false);
export const noCompactor = getCompactor(null, false, false);
export const verticalOverlapCompactor = getCompactor("vertical", true, false);
export const horizontalOverlapCompactor = getCompactor(
  "horizontal",
  true,
  false,
);
