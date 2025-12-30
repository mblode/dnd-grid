import { getEventCoordinates } from "@dnd-kit/utilities";

export interface PointerPosition {
  x: number;
  y: number;
}

let lastPointerPosition: PointerPosition | null = null;
let lastPointerEvent: Event | null = null;

export const setPointerPosition = (
  coordinates: PointerPosition | null
): void => {
  if (!coordinates) {
    return;
  }
  lastPointerPosition = coordinates;
};

export const setPointerEvent = (event: Event | null): void => {
  if (!event) {
    return;
  }
  lastPointerEvent = event;
};

export const setPointerPositionFromEvent = (event: Event): void => {
  setPointerEvent(event);
  setPointerPosition(getEventCoordinates(event));
};

export const getPointerPosition = (): PointerPosition | null =>
  lastPointerPosition;

export const getPointerEvent = (): Event | null => lastPointerEvent;

export const clearPointerPosition = (): void => {
  lastPointerPosition = null;
  lastPointerEvent = null;
};
