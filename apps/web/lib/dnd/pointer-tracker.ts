import { getEventCoordinates } from "@dnd-kit/utilities";

export type PointerPosition = { x: number; y: number };

let lastPointerPosition: PointerPosition | null = null;

export const setPointerPosition = (
  coordinates: PointerPosition | null,
): void => {
  if (!coordinates) {
    return;
  }
  lastPointerPosition = coordinates;
};

export const setPointerPositionFromEvent = (event: Event): void => {
  setPointerPosition(getEventCoordinates(event));
};

export const getPointerPosition = (): PointerPosition | null =>
  lastPointerPosition;

export const clearPointerPosition = (): void => {
  lastPointerPosition = null;
};
