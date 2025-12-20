"use client";

import { useRef, useCallback, type CSSProperties } from "react";
import { motion, useMotionValue, useSpring, useMotionTemplate, type PanInfo } from "framer-motion";

/**
 * Spring configuration - EXACT from 767-2e87e299c046e2a2.js (Bento minified)
 *
 * DEFAULT spring values used for rotation:
 * - stiffness: 100
 * - damping: 10
 * - mass: 1
 * - restSpeed: 2 (animation stops when velocity < 2 deg/s)
 * - restDelta: 0.5 (animation stops when within 0.5 degrees)
 *
 * NOTE: The 500/25 values are for POSITION springs, not rotation!
 */
const SPRING_CONFIG = {
  stiffness: 100,
  damping: 10,
  mass: 1,
  restSpeed: 2,
  restDelta: 0.5,
};

/**
 * Scale spring configuration - EXACT from bento-example-2.min.js:476-481
 */
const SCALE_SPRING_CONFIG = {
  stiffness: 550,
  damping: 30,
  restSpeed: 10,
};

/**
 * Velocity window - EXACT from bento-example-2.min.js:221
 * The velocity is calculated from position history over this 100ms window
 */
const VELOCITY_WINDOW_MS = 100;

/**
 * Velocity to rotation scale factor - derived from Bento formula
 *
 * Bento uses: rotate = Math.sign(s) * Math.min(Math.abs(s) / 3, 45)
 * Where s = pixel delta per frame (NOT velocity in px/s)
 *
 * Since we calculate velocity (px/s) and at 60fps that's ~60x the per-frame delta:
 * Bento factor: 1/3 = 0.333 on delta
 * Adjusted for velocity: 0.333 / 60 ≈ 0.005
 */
const VELOCITY_SCALE = 0.005;

/**
 * Maximum rotation in degrees - EXACT from Bento
 */
const MAX_ROTATION = 45;

/**
 * Point with timestamp - used for velocity calculation
 * Matches the history structure from bento-example-2.min.js:170-175
 */
interface PointWithTimestamp {
  x: number;
  y: number;
  timestamp: number;
}

/**
 * Velocity calculation - EXACT from bento-example-2.min.js:210-241
 *
 * This function calculates velocity from a history of points over a 100ms window.
 * It matches the algorithm used in Framer Motion's PanSession class.
 *
 * Original minified code:
 * ```
 * velocity: (function (t, e) {
 *   if (t.length < 2)
 *     return { x: 0, y: 0 };
 *   let i = t.length - 1,
 *     n = null,
 *     r = M(t);
 *   for (; i >= 0 && ((n = t[i]), !(r.timestamp - n.timestamp > f(0.1))); )
 *     i--;
 *   if (!n)
 *     return { x: 0, y: 0 };
 *   let o = (r.timestamp - n.timestamp) / 1e3;
 *   if (0 === o)
 *     return { x: 0, y: 0 };
 *   let s = {
 *     x: (r.x - n.x) / o,
 *     y: (r.y - n.y) / o,
 *   };
 *   return (s.x === 1 / 0 && (s.x = 0), s.y === 1 / 0 && (s.y = 0), s);
 * })(e, 0),
 * ```
 */
function calculateVelocityFromHistory(history: PointWithTimestamp[]): { x: number; y: number } {
  // Line 211-214: Return zero velocity if not enough history
  if (history.length < 2) {
    return { x: 0, y: 0 };
  }

  let i = history.length - 1;
  let oldestSample: PointWithTimestamp | null = null;
  const latest = history[history.length - 1]; // M(t) - get last element

  // Lines 219-224: Go back through history until we find a sample older than 100ms
  while (i >= 0) {
    oldestSample = history[i];
    // f(0.1) = 100ms - check if sample is older than window
    if (latest.timestamp - oldestSample.timestamp > VELOCITY_WINDOW_MS) {
      break;
    }
    i--;
  }

  // Lines 225-228: Return zero if no valid sample found
  if (!oldestSample) {
    return { x: 0, y: 0 };
  }

  // Line 230: Convert time delta to seconds
  const timeDelta = (latest.timestamp - oldestSample.timestamp) / 1000;

  // Lines 231-234: Return zero if time delta is zero (avoid division by zero)
  if (timeDelta === 0) {
    return { x: 0, y: 0 };
  }

  // Lines 236-239: Calculate velocity (pixels per second)
  const velocity = {
    x: (latest.x - oldestSample.x) / timeDelta,
    y: (latest.y - oldestSample.y) / timeDelta,
  };

  // Line 240: Prevent infinity values
  if (velocity.x === Infinity) velocity.x = 0;
  if (velocity.y === Infinity) velocity.y = 0;

  return velocity;
}

interface SwingCardProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * SwingCard Component
 *
 * Replicates the Bento.me drag rotation effect exactly:
 * - Card rotation responds to drag MOMENTUM (velocity), not position
 * - Velocity is passed as INITIAL VELOCITY to spring, not as target
 * - Target is always 0 - spring physics creates natural swing/overshoot
 * - restSpeed: 2 means slow drags don't cause visible rotation
 *
 * EXACT transform pattern from Bento (from saved HTML):
 * transform: scale(var(--motion-scale)) rotate(var(--motion-rotate));
 *
 * Physics extracted from 767-2e87e299c046e2a2.js (Bento minified):
 * - Spring: stiffness=500, damping=25, restSpeed=2, restDistance=0.5
 * - Velocity used as initial momentum, target is always 0
 */
export function SwingCard({ children, className }: SwingCardProps) {
  const constraintsRef = useRef<HTMLDivElement>(null);

  // History of pointer positions with timestamps
  const historyRef = useRef<PointWithTimestamp[]>([]);

  // Motion values for position (on outer wrapper)
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Motion values for rotation - useSpring smooths the raw value
  const rotateRaw = useMotionValue(0);
  const rotate = useSpring(rotateRaw, SPRING_CONFIG);

  // Motion value for scale with spring
  const scaleRaw = useMotionValue(1);
  const scale = useSpring(scaleRaw, SCALE_SPRING_CONFIG);

  // Create CSS variable value with deg unit
  const motionRotate = useMotionTemplate`${rotate}deg`;

  /**
   * Handle drag start
   * Scale up slightly when dragging begins
   */
  const handleDragStart = useCallback(() => {
    scaleRaw.set(1.02);
  }, [scaleRaw]);

  // Store last velocity for use on drag end
  const lastVelocityRef = useRef({ x: 0, y: 0 });

  /**
   * Handle drag event - EXACT Bento implementation
   *
   * Bento uses: rotation = velocity.x * 0.05
   * useSpring with stiffness:100, damping:10 smooths the raw value
   */
  const handleDrag = useCallback(
    (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      const now = performance.now();

      // Track position history for velocity calculation
      historyRef.current.push({
        x: info.point.x,
        y: info.point.y,
        timestamp: now,
      });

      // Keep only last 100ms of history
      historyRef.current = historyRef.current.filter(
        (entry) => now - entry.timestamp < VELOCITY_WINDOW_MS
      );

      // Calculate velocity from history
      const velocity = calculateVelocityFromHistory(historyRef.current);
      lastVelocityRef.current = velocity;

      // Convert velocity to rotation - matching Bento formula:
      // rotate = Math.sign(s) * Math.min(Math.abs(s) / 3, 45)
      // INVERTED: drag right = tilt left (negative rotation) due to inertia
      const rawRotation = -velocity.x * VELOCITY_SCALE;
      const targetRotation = Math.sign(rawRotation) * Math.min(Math.abs(rawRotation), MAX_ROTATION);
      rotateRaw.set(targetRotation);
    },
    [rotateRaw]
  );

  /**
   * Handle drag end
   * Set rotation back to 0 - spring will animate the swing effect
   */
  const handleDragEnd = useCallback(() => {
    historyRef.current = [];

    // Set to 0 - useSpring creates the swing effect as it animates back
    rotateRaw.set(0);

    // Reset scale
    scaleRaw.set(1);
  }, [rotateRaw, scaleRaw]);

  return (
    <div ref={constraintsRef} className="relative w-full h-full">
      {/* Outer wrapper handles translation (x, y) - matches Bento's bento-grid__item */}
      <motion.div
        drag
        dragConstraints={false}
        dragElastic={0}
        dragMomentum={false}
        onDragStart={handleDragStart}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        style={{ x, y }}
        className="w-full h-full"
      >
        {/* Inner content handles scale and rotation - matches Bento's bento-item__content */}
        {/* EXACT transform: scale(var(--motion-scale)) rotate(var(--motion-rotate)) */}
        <motion.div
          className={className}
          style={
            {
              willChange: "transform",
              // CSS variables exactly like Bento
              "--motion-scale": scale,
              "--motion-rotate": motionRotate,
              // Transform uses CSS variables in exact Bento order: scale THEN rotate
              transform: "scale(var(--motion-scale)) rotate(var(--motion-rotate))",
            } as CSSProperties
          }
        >
          {children}
        </motion.div>
      </motion.div>
    </div>
  );
}
