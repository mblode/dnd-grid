import { useCallback, useRef, useState } from "react";
import type { DraggableEventHandler } from "react-draggable";
import { calcGridColWidth, calcGridItemPosition } from "./calculate-utils";
import type { Position, PositionParams, ResizeHandleAxis } from "./types";

const keyboardResizeHandle: ResizeHandleAxis = "se";

type ResizeCallbackData = {
  node: HTMLElement;
  size: { width: number; height: number };
  handle: ResizeHandleAxis;
};

type ResizeCallback = (
  e: Event,
  data: ResizeCallbackData,
  position: Position,
) => void;

const isEditableElement = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tagName = target.tagName;
  return tagName === "INPUT" || tagName === "TEXTAREA" || tagName === "SELECT";
};

interface UseKeyboardMoveParams {
  onDragStart: DraggableEventHandler;
  onDrag: DraggableEventHandler;
  onDragStop: DraggableEventHandler;
  onResizeStart: ResizeCallback;
  onResize: ResizeCallback;
  onResizeStop: ResizeCallback;
  getPositionParams: () => PositionParams;
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  isDraggable: boolean;
  isResizable: boolean;
  nodeRef: React.RefObject<HTMLElement | null>;
}

export const useKeyboardMove = ({
  onDragStart,
  onDrag,
  onDragStop,
  onResizeStart,
  onResize,
  onResizeStop,
  getPositionParams,
  i: _i,
  x,
  y,
  w,
  h,
  isDraggable,
  isResizable,
  nodeRef,
}: UseKeyboardMoveParams) => {
  const [isPressed, setIsPressed] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const isPressedRef = useRef(false);
  const isResizingRef = useRef(false);
  const modeRef = useRef<"move" | "resize" | null>(null);
  const originalGeometryRef = useRef<{
    x: number;
    y: number;
    w: number;
    h: number;
  } | null>(null);
  const dragStartedRef = useRef(false);
  const resizeStartedRef = useRef(false);

  const setPressed = useCallback((next: boolean) => {
    isPressedRef.current = next;
    setIsPressed(next);
  }, []);

  const setResizing = useCallback((next: boolean) => {
    isResizingRef.current = next;
    setIsResizing(next);
  }, []);

  const resetInteraction = useCallback(() => {
    setPressed(false);
    setResizing(false);
    modeRef.current = null;
    originalGeometryRef.current = null;
    dragStartedRef.current = false;
    resizeStartedRef.current = false;
  }, [setPressed, setResizing]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const node = nodeRef.current;
      if (!node) return;
      if (e.defaultPrevented) return;
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      if (isEditableElement(e.target)) return;

      const isSpace = e.key === " ";
      const isEnter = e.key === "Enter";
      const isArrow = [
        "ArrowUp",
        "ArrowDown",
        "ArrowLeft",
        "ArrowRight",
      ].includes(e.key);
      const isEscape = e.key === "Escape";
      const isPressedState = isPressedRef.current;
      const isResizingState = isResizingRef.current;
      const canPickUp = isDraggable || isResizable;

      if (isSpace || isEnter) {
        if (!isPressedState && !isResizingState) {
          // Pickup
          if (!canPickUp) return;
          e.preventDefault();
          setPressed(true);
          modeRef.current = null;
          originalGeometryRef.current = { x, y, w, h };
          resizeStartedRef.current = false;
          dragStartedRef.current = false;
          if (isDraggable) {
            onDragStart(e as unknown as MouseEvent, {
              node,
              x: 0,
              y: 0,
              deltaX: 0,
              deltaY: 0,
              lastX: 0,
              lastY: 0,
            });
            dragStartedRef.current = true;
          }
        } else {
          // Drop
          e.preventDefault();
          if (isResizingState && resizeStartedRef.current) {
            const positionParams = getPositionParams();
            const position = calcGridItemPosition(
              positionParams,
              x,
              y,
              w,
              h,
              0,
            );
            onResizeStop(
              e as unknown as Event,
              {
                node,
                size: { width: position.width, height: position.height },
                handle: keyboardResizeHandle,
              },
              position,
            );
          } else if (dragStartedRef.current) {
            onDragStop(e as unknown as MouseEvent, {
              node,
              x: 0,
              y: 0,
              deltaX: 0,
              deltaY: 0,
              lastX: 0,
              lastY: 0,
            });
          }
          resetInteraction();
        }
      } else if (isEscape) {
        if (isPressedState || isResizingState) {
          e.preventDefault();
          const original = originalGeometryRef.current;
          if (isResizingState && resizeStartedRef.current && original) {
            const positionParams = getPositionParams();
            const position = calcGridItemPosition(
              positionParams,
              x,
              y,
              w,
              h,
              0,
            );
            const targetPosition = calcGridItemPosition(
              positionParams,
              x,
              y,
              original.w,
              original.h,
              0,
            );
            const resizeData = {
              node,
              size: {
                width: targetPosition.width,
                height: targetPosition.height,
              },
              handle: keyboardResizeHandle,
            };
            onResize(e as unknown as Event, resizeData, position);
            onResizeStop(e as unknown as Event, resizeData, position);
          } else if (dragStartedRef.current) {
            if (original) {
              const positionParams = getPositionParams();
              const { margin, rowHeight } = positionParams;
              const colWidth = calcGridColWidth(positionParams);
              const gridUnitX = colWidth + margin[1];
              const gridUnitY = rowHeight + margin[0];
              const deltaX = (original.x - x) * gridUnitX;
              const deltaY = (original.y - y) * gridUnitY;
              if (deltaX !== 0 || deltaY !== 0) {
                onDrag(e as unknown as MouseEvent, {
                  node,
                  x: 0,
                  y: 0,
                  deltaX,
                  deltaY,
                  lastX: 0,
                  lastY: 0,
                });
              }
            }
            onDragStop(e as unknown as MouseEvent, {
              node,
              x: 0,
              y: 0,
              deltaX: 0,
              deltaY: 0,
              lastX: 0,
              lastY: 0,
            });
          }
          resetInteraction();
        }
      } else if (isArrow && isPressedState) {
        if (e.shiftKey) {
          if (!isResizable) return;
          if (modeRef.current && modeRef.current !== "resize") return;
          e.preventDefault();
          const positionParams = getPositionParams();
          if (!resizeStartedRef.current) {
            if (dragStartedRef.current) {
              onDragStop(e as unknown as MouseEvent, {
                node,
                x: 0,
                y: 0,
                deltaX: 0,
                deltaY: 0,
                lastX: 0,
                lastY: 0,
              });
              dragStartedRef.current = false;
            }
            const position = calcGridItemPosition(
              positionParams,
              x,
              y,
              w,
              h,
              0,
            );
            onResizeStart(
              e as unknown as Event,
              {
                node,
                size: { width: position.width, height: position.height },
                handle: keyboardResizeHandle,
              },
              position,
            );
            resizeStartedRef.current = true;
            setResizing(true);
          }
          modeRef.current = "resize";
          let deltaW = 0;
          let deltaH = 0;
          if (e.key === "ArrowRight") deltaW = 1;
          if (e.key === "ArrowLeft") deltaW = -1;
          if (e.key === "ArrowDown") deltaH = 1;
          if (e.key === "ArrowUp") deltaH = -1;
          const nextW = Math.max(1, w + deltaW);
          const nextH = Math.max(1, h + deltaH);
          if (nextW === w && nextH === h) return;
          const position = calcGridItemPosition(positionParams, x, y, w, h, 0);
          const nextPosition = calcGridItemPosition(
            positionParams,
            x,
            y,
            nextW,
            nextH,
            0,
          );
          onResize(
            e as unknown as Event,
            {
              node,
              size: {
                width: nextPosition.width,
                height: nextPosition.height,
              },
              handle: keyboardResizeHandle,
            },
            position,
          );
        } else {
          if (!isDraggable) return;
          if (modeRef.current && modeRef.current !== "move") return;
          e.preventDefault();
          modeRef.current = "move";
          const positionParams = getPositionParams();
          const { margin, rowHeight } = positionParams;
          const colWidth = calcGridColWidth(positionParams);
          let deltaX = 0;
          let deltaY = 0;
          const gridUnitX = colWidth + margin[1];
          const gridUnitY = rowHeight + margin[0];

          if (e.key === "ArrowRight") deltaX = gridUnitX;
          if (e.key === "ArrowLeft") deltaX = -gridUnitX;
          if (e.key === "ArrowDown") deltaY = gridUnitY;
          if (e.key === "ArrowUp") deltaY = -gridUnitY;

          onDrag(e as unknown as MouseEvent, {
            node,
            x: 0, // logic uses deltas mostly?
            y: 0,
            deltaX,
            deltaY,
            lastX: 0,
            lastY: 0,
          });
        }
      }
    },
    [
      getPositionParams,
      isDraggable,
      isResizable,
      onDrag,
      onDragStart,
      onDragStop,
      onResize,
      onResizeStart,
      onResizeStop,
      resetInteraction,
      setPressed,
      setResizing,
      nodeRef,
      x,
      y,
      w,
      h,
    ],
  );

  return {
    onKeyDown,
    isPressed,
    isResizing,
  };
};
