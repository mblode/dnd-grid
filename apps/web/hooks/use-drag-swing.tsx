"use client";

import type {
  DragEndEvent,
  DragMoveEvent,
  DragStartEvent,
} from "@dnd-kit/core";
import { useDndMonitor } from "@dnd-kit/core";
import { autorun } from "mobx";
import { useCallback, useEffect, useRef } from "react";
import { getPointerPosition } from "@/lib/dnd/pointer-tracker";
import {
  calculateVelocityFromHistory,
  createLiveSpring,
  type DragSwingSettings,
  type PointWithTimestamp,
  velocityToRotation,
} from "@/lib/spring";
import { useStore } from "@/lib/stores/store";

interface UseDragSwingReturn {
  overlayRef: React.RefObject<HTMLDivElement | null>;
  scaleRef: React.RefObject<HTMLDivElement | null>;
}

const REST_SCALE = 1;

export function useDragSwing(): UseDragSwingReturn {
  const store = useStore();

  const overlayRef = useRef<HTMLDivElement>(null);
  const scaleRef = useRef<HTMLDivElement>(null);

  const springAnimationFrameRef = useRef<number | null>(null);
  const positionHistoryRef = useRef<PointWithTimestamp[]>([]);
  const isDraggingRef = useRef(false);
  const isSettlingRef = useRef(false);
  const settleStartTimeRef = useRef<number | null>(null);
  const settleFrameCountRef = useRef(0);
  const dragStartPointerRef = useRef<{ x: number; y: number } | null>(null);
  const lastPointerRef = useRef<{ x: number; y: number } | null>(null);
  const lastSampleTimeRef = useRef<number | null>(null);
  const currentRotationRef = useRef(0);
  const currentScaleRef = useRef(1);
  const settingsRef = useRef<DragSwingSettings>(store.dragSwingSettings);

  // Live spring instances for continuous animation (like Framer Motion's useSpring)
  const rotationSpringRef = useRef(
    createLiveSpring({
      stiffness: store.dragSwingSettings.rotationSpring.stiffness,
      damping: store.dragSwingSettings.rotationSpring.damping,
      mass: store.dragSwingSettings.rotationSpring.mass,
      restSpeed: store.dragSwingSettings.rotationSpring.restSpeed,
      restDistance: store.dragSwingSettings.rotationSpring.restDistance,
    })
  );
  const scaleSpringRef = useRef(
    createLiveSpring({
      stiffness: store.dragSwingSettings.scaleSpring.stiffness,
      damping: store.dragSwingSettings.scaleSpring.damping,
      restSpeed: store.dragSwingSettings.scaleSpring.restSpeed,
      restDistance: store.dragSwingSettings.scaleSpring.restDistance,
    })
  );

  useEffect(() => {
    const dispose = autorun(() => {
      const settings = store.dragSwingSettings;
      const nextSettings: DragSwingSettings = {
        velocityWindowMs: settings.velocityWindowMs,
        velocityScale: settings.velocityScale,
        maxRotation: settings.maxRotation,
        dragScale: settings.dragScale,
        rotationSpring: {
          stiffness: settings.rotationSpring.stiffness,
          damping: settings.rotationSpring.damping,
          mass: settings.rotationSpring.mass,
          restSpeed: settings.rotationSpring.restSpeed,
          restDistance: settings.rotationSpring.restDistance,
        },
        scaleSpring: {
          stiffness: settings.scaleSpring.stiffness,
          damping: settings.scaleSpring.damping,
          restSpeed: settings.scaleSpring.restSpeed,
          restDistance: settings.scaleSpring.restDistance,
        },
      };

      settingsRef.current = nextSettings;
      rotationSpringRef.current.setConfig(nextSettings.rotationSpring);
      scaleSpringRef.current.setConfig(nextSettings.scaleSpring);
    });

    return () => dispose();
  }, [store]);

  // Update CSS custom properties
  const updateRotation = useCallback((value: number) => {
    if (overlayRef.current) {
      overlayRef.current.style.setProperty("--motion-rotate", `${value}deg`);
    }
  }, []);

  const updateScale = useCallback((value: number) => {
    if (scaleRef.current) {
      scaleRef.current.style.setProperty("--motion-scale", `${value}`);
    }
  }, []);

  /**
   * Update spring targets during drag
   * This matches swing-card.tsx behavior where rotateRaw.set() updates the target
   */
  const updateSpringTargets = useCallback(
    (targetRotation: number, targetScale: number) => {
      rotationSpringRef.current.setTarget(targetRotation);
      scaleSpringRef.current.setTarget(targetScale);
    },
    []
  );

  /**
   * Record a pointer sample and update spring targets from velocity.
   * This keeps velocity decaying to 0 even when no new drag events fire.
   */
  const recordPointerSample = useCallback(
    (now: number, pointer: { x: number; y: number }) => {
      let positionHistory: PointWithTimestamp[] = [
        ...positionHistoryRef.current,
        {
          x: pointer.x,
          y: pointer.y,
          timestamp: now,
        },
      ];

      // Keep only the most recent velocity window of history
      positionHistory = positionHistory.filter(
        (entry) => now - entry.timestamp < settingsRef.current.velocityWindowMs
      );

      // Calculate velocity from history using Bento algorithm
      const velocity = calculateVelocityFromHistory(
        positionHistory,
        settingsRef.current.velocityWindowMs
      );

      // Convert velocity to rotation using Bento formula
      // INVERTED: drag right = tilt left (negative rotation) due to inertia
      const targetRotation = velocityToRotation(
        velocity.x,
        settingsRef.current.velocityScale,
        settingsRef.current.maxRotation
      );

      // Update spring targets - spring will smoothly animate toward targetRotation
      // This matches swing-card.tsx: rotateRaw.set(targetRotation)
      updateSpringTargets(targetRotation, settingsRef.current.dragScale);

      positionHistoryRef.current = positionHistory;
      lastSampleTimeRef.current = now;
    },
    [updateSpringTargets]
  );

  /**
   * Start continuous spring animation loop
   * This matches swing-card.tsx useSpring behavior - continuously smoothing values
   */
  const startSpringAnimation = useCallback(() => {
    if (springAnimationFrameRef.current !== null) {
      return;
    }

    const rotationSpring = rotationSpringRef.current;
    const scaleSpring = scaleSpringRef.current;
    const restScale = REST_SCALE;

    // Initialize springs with current state
    rotationSpring.setCurrent(currentRotationRef.current);
    scaleSpring.setCurrent(currentScaleRef.current);

    // Safety guard: maximum settling duration (2 seconds at 60fps = 120 frames)
    // This prevents infinite loops if springs never settle
    const MAX_SETTLE_FRAMES = 120;
    const MAX_SETTLE_DURATION_MS = 2000;

    const animate = () => {
      const now = performance.now();
      if (isSettlingRef.current) {
        if (settleStartTimeRef.current === null) {
          settleStartTimeRef.current = now;
          settleFrameCountRef.current = 0;
        }
        settleFrameCountRef.current += 1;
        const settleDuration = now - settleStartTimeRef.current;

        // Safety check: force exit if settling runs too long
        if (
          settleFrameCountRef.current > MAX_SETTLE_FRAMES ||
          settleDuration > MAX_SETTLE_DURATION_MS
        ) {
          isSettlingRef.current = false;
          settleStartTimeRef.current = null;
          settleFrameCountRef.current = 0;
          rotationSpring.setCurrent(0);
          rotationSpring.setTarget(0);
          scaleSpring.setCurrent(restScale);
          scaleSpring.setTarget(restScale);
          updateRotation(0);
          updateScale(restScale);
          springAnimationFrameRef.current = null;
          return;
        }
      }

      if (isDraggingRef.current && lastPointerRef.current) {
        const lastSampleTime = lastSampleTimeRef.current;
        if (lastSampleTime === null || now - lastSampleTime > 16) {
          recordPointerSample(now, lastPointerRef.current);
        }
      }

      const rotationState = rotationSpring.step(now);
      const scaleState = scaleSpring.step(now);

      currentRotationRef.current = rotationState.value;
      currentScaleRef.current = scaleState.value;
      updateRotation(rotationState.value);
      updateScale(scaleState.value);

      // Check if ALL springs are done
      const allSpringsDone = rotationState.done && scaleState.done;

      // Continue animation while dragging or if settling after drag
      if (isDraggingRef.current || (isSettlingRef.current && !allSpringsDone)) {
        springAnimationFrameRef.current = requestAnimationFrame(animate);
      } else {
        isSettlingRef.current = false;
        settleStartTimeRef.current = null;
        settleFrameCountRef.current = 0;
        springAnimationFrameRef.current = null;
      }
    };

    springAnimationFrameRef.current = requestAnimationFrame(animate);
  }, [recordPointerSample, updateRotation, updateScale]);

  // Apply initial scale/shadow and start physics loop on mount
  // (component mounts after drag starts, so handleDragStart won't fire)
  useEffect(() => {
    isDraggingRef.current = true;
    isSettlingRef.current = false;
    positionHistoryRef.current = [];
    lastSampleTimeRef.current = null;
    lastPointerRef.current = getPointerPosition();
    settleStartTimeRef.current = null;
    settleFrameCountRef.current = 0;

    currentRotationRef.current = 0;
    currentScaleRef.current = REST_SCALE;
    updateRotation(0);
    updateScale(REST_SCALE);

    // Set scale spring target directly (setState is async, so we can't rely on state being updated)
    // This matches swing-card.tsx handleDragStart: scaleRaw.set(dragScale)
    scaleSpringRef.current.setTarget(settingsRef.current.dragScale);

    // Start continuous spring animation (matches swing-card.tsx useSpring behavior)
    startSpringAnimation();

    // Animate shadow on the card element
    const cardElement = overlayRef.current?.querySelector(
      "[data-overlay-card]"
    ) as HTMLElement | null;

    if (cardElement) {
      cardElement.animate(
        [
          { boxShadow: "0 0 0 0 rgba(0,0,0,0)" },
          {
            boxShadow:
              "0 25px 50px -12px rgba(0,0,0,0.15), 0 12px 24px -8px rgba(0,0,0,0.1)",
          },
        ],
        {
          duration: 200,
          easing: "cubic-bezier(.2, 0, 0, 1)",
          fill: "forwards",
        }
      );
    }
  }, [startSpringAnimation, updateRotation, updateScale]);

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const activatorEvent = event.activatorEvent;

      const trackedPointer = getPointerPosition();
      if (trackedPointer) {
        dragStartPointerRef.current = trackedPointer;
        lastPointerRef.current = trackedPointer;
      } else {
        let pointerX: number | null = null;
        let pointerY: number | null = null;
        if (activatorEvent instanceof MouseEvent) {
          pointerX = activatorEvent.clientX;
          pointerY = activatorEvent.clientY;
        } else if (
          activatorEvent instanceof TouchEvent &&
          activatorEvent.touches.length > 0
        ) {
          pointerX = activatorEvent.touches[0].clientX;
          pointerY = activatorEvent.touches[0].clientY;
        } else if (
          (activatorEvent as unknown as PointerEvent).clientX !== undefined
        ) {
          pointerX = (activatorEvent as unknown as PointerEvent).clientX;
          pointerY = (activatorEvent as unknown as PointerEvent).clientY;
        }

        dragStartPointerRef.current =
          pointerX !== null && pointerY !== null
            ? { x: pointerX, y: pointerY }
            : null;
        if (pointerX !== null && pointerY !== null) {
          lastPointerRef.current = { x: pointerX, y: pointerY };
        }
      }

      positionHistoryRef.current = [];
      lastSampleTimeRef.current = null;
      isDraggingRef.current = true;
      isSettlingRef.current = false;
      settleStartTimeRef.current = null;
      settleFrameCountRef.current = 0;

      // Set scale spring target directly (setState is async, so we can't rely on state being updated)
      // This matches swing-card.tsx handleDragStart: scaleRaw.set(dragScale)
      scaleSpringRef.current.setTarget(settingsRef.current.dragScale);

      // Start continuous spring animation (matches swing-card.tsx useSpring behavior)
      startSpringAnimation();
    },
    [startSpringAnimation]
  );

  /**
   * onDrag event handler
   * Uses Bento-style velocity-based rotation with a sliding velocity window
   */
  const handleDragMove = useCallback(
    (event: DragMoveEvent) => {
      const now = performance.now();

      let pointerX = 0;
      let pointerY = 0;
      const dragStartPointer = dragStartPointerRef.current;
      const trackedPointer = getPointerPosition();

      if (trackedPointer) {
        pointerX = trackedPointer.x;
        pointerY = trackedPointer.y;
      } else if (dragStartPointer) {
        pointerX = dragStartPointer.x + event.delta.x;
        pointerY = dragStartPointer.y + event.delta.y;
      } else {
        const activatorEvent = event.activatorEvent;
        // Get pointer position from event for velocity tracking
        // This matches swing-card.tsx which uses info.point.x/y (pointer position)
        if (activatorEvent instanceof MouseEvent) {
          pointerX = activatorEvent.clientX;
          pointerY = activatorEvent.clientY;
        } else if (
          activatorEvent instanceof TouchEvent &&
          activatorEvent.touches.length > 0
        ) {
          pointerX = activatorEvent.touches[0].clientX;
          pointerY = activatorEvent.touches[0].clientY;
        } else if (
          (activatorEvent as unknown as PointerEvent).clientX !== undefined
        ) {
          pointerX = (activatorEvent as unknown as PointerEvent).clientX;
          pointerY = (activatorEvent as unknown as PointerEvent).clientY;
        }
      }

      const pointer = { x: pointerX, y: pointerY };
      lastPointerRef.current = pointer;
      recordPointerSample(now, pointer);
    },
    [recordPointerSample]
  );

  const handleDragEnd = useCallback(
    (_event: DragEndEvent) => {
      isDraggingRef.current = false;
      dragStartPointerRef.current = null;
      lastPointerRef.current = null;
      lastSampleTimeRef.current = null;

      // Set spring targets to 0 (rotation) and 1 (scale)
      // This matches swing-card.tsx handleDragEnd: rotateRaw.set(0), scaleRaw.set(1)
      updateSpringTargets(0, REST_SCALE);

      // Keep the spring loop alive while we settle back to rest.
      isSettlingRef.current = true;
      settleStartTimeRef.current = performance.now();
      settleFrameCountRef.current = 0;

      const cardElement = overlayRef.current?.querySelector(
        "[data-overlay-card]"
      ) as HTMLElement | null;
      if (cardElement) {
        const rect = cardElement.getBoundingClientRect();
        const baseWidth = cardElement.offsetWidth || rect.width;
        const baseHeight = cardElement.offsetHeight || rect.height;
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const startRect = {
          left: centerX - baseWidth / 2,
          top: centerY - baseHeight / 2,
          width: baseWidth,
          height: baseHeight,
        };

        store.startSettling(
          startRect,
          currentRotationRef.current,
          currentScaleRef.current || REST_SCALE
        );
      }

      positionHistoryRef.current = [];
      startSpringAnimation();
    },
    [startSpringAnimation, store, updateSpringTargets]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (springAnimationFrameRef.current) {
        cancelAnimationFrame(springAnimationFrameRef.current);
        springAnimationFrameRef.current = null;
      }
    };
  }, []);

  useDndMonitor({
    onDragStart: handleDragStart,
    onDragMove: handleDragMove,
    onDragEnd: handleDragEnd,
    onDragCancel: handleDragEnd,
  });

  return { overlayRef, scaleRef };
}
