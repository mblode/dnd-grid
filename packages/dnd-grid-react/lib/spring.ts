/**
 * Bento-style Spring Physics Implementation
 * Exact physics from bento-example.min.js for swing/tilt animations
 */

// ============================================================================
// Constants (Exact Bento Values)
// ============================================================================

/** Velocity calculation window in milliseconds */
export const VELOCITY_WINDOW_MS = 100;

/** Converts velocity (px/s) to rotation (degrees) */
export const VELOCITY_SCALE = 0.005;

/** Maximum rotation in degrees */
export const MAX_ROTATION = 45;

/** Default spring configuration for rotation - creates underdamped oscillation */
export const SPRING_DEFAULTS = {
  stiffness: 100,
  damping: 10,
  mass: 1,
};

/** Scale spring configuration - snappier response (from swing-card.tsx lines 29-33) */
export const SCALE_SPRING_CONFIG = {
  stiffness: 550,
  damping: 30,
  restSpeed: 10,
};

/** Position spring config - subtle underdamped bounce (ζ=0.7, ~5% overshoot) */
export const POSITION_SPRING_CONFIG = {
  stiffness: 200,
  damping: 20,
  restSpeed: 1,
  restDistance: 0.5,
};

// ============================================================================
// Types
// ============================================================================

export type SpringConfig = {
  stiffness?: number;
  damping?: number;
  mass?: number;
  from?: number;
  to?: number;
  velocity?: number;
  restSpeed?: number;
  restDistance?: number;
};

export type SpringState = {
  done: boolean;
  hasReachedTarget: boolean;
  current: number;
  target: number;
};

export type PointWithTimestamp = {
  x: number;
  y: number;
  timestamp: number;
};

// ============================================================================
// Spring Physics
// ============================================================================

/**
 * Create a live spring simulation that can track a changing target
 * This mimics Framer Motion's useSpring behavior where the target can change
 * and the spring smoothly adjusts to the new target.
 */
export const createLiveSpring = (
  config: {
    stiffness?: number;
    damping?: number;
    mass?: number;
    restSpeed?: number;
    restDistance?: number;
  } = {},
) => {
  const {
    stiffness = SPRING_DEFAULTS.stiffness,
    damping = SPRING_DEFAULTS.damping,
    mass = SPRING_DEFAULTS.mass,
    restSpeed = 2,
    restDistance = 0.5,
  } = config;

  let currentValue = 0;
  let currentVelocity = 0;
  let targetValue = 0;
  let lastTime: number | null = null;

  return {
    setTarget(target: number) {
      targetValue = target;
    },

    setCurrent(value: number) {
      currentValue = value;
      currentVelocity = 0;
      lastTime = null; // Reset time so next step starts fresh
    },

    /**
     * Step the simulation forward by the given time delta (in ms)
     * Returns the current value and whether the spring is at rest
     */
    step(now: number): { value: number; velocity: number; done: boolean } {
      if (lastTime === null) {
        lastTime = now;
        return { value: currentValue, velocity: currentVelocity, done: false };
      }

      const deltaTime = Math.min(now - lastTime, 64); // Cap at ~15fps minimum
      lastTime = now;

      // Spring physics simulation (Euler integration)
      // F = -k * x - c * v (spring force + damping force)
      // a = F / m
      const displacement = currentValue - targetValue;
      const springForce = -stiffness * displacement;
      const dampingForce = -damping * currentVelocity;
      const acceleration = (springForce + dampingForce) / mass;

      // Update velocity and position using Euler integration
      // dt is in seconds, velocity is in units/second, so position change = velocity * dt
      const dt = deltaTime / 1000; // Convert to seconds for physics
      currentVelocity += acceleration * dt;
      currentValue += currentVelocity * dt;

      // Check if at rest
      const isAtRest =
        Math.abs(currentVelocity) < restSpeed &&
        Math.abs(currentValue - targetValue) < restDistance;

      if (isAtRest) {
        currentValue = targetValue;
        currentVelocity = 0;
      }

      return {
        value: currentValue,
        velocity: currentVelocity,
        done: isAtRest,
      };
    },

    reset() {
      currentValue = 0;
      currentVelocity = 0;
      targetValue = 0;
      lastTime = null;
    },

    getValue() {
      return currentValue;
    },

    getTarget() {
      return targetValue;
    },
  };
};

// ============================================================================
// Velocity Calculation
// ============================================================================

/**
 * Calculate velocity from position history using a 100ms sliding window
 *
 * This matches the exact algorithm from Bento/Framer Motion's PanSession class.
 * The velocity is calculated from the difference between the latest position
 * and a sample older than 100ms.
 */
export const calculateVelocityFromHistory = (
  history: PointWithTimestamp[],
): { x: number; y: number } => {
  if (history.length < 2) {
    return { x: 0, y: 0 };
  }

  let i = history.length - 1;
  let oldestSample: PointWithTimestamp | null = null;
  const latest = history[history.length - 1];

  // Find sample older than 100ms window
  while (i >= 0) {
    oldestSample = history[i];
    if (latest.timestamp - oldestSample.timestamp > VELOCITY_WINDOW_MS) {
      break;
    }
    i--;
  }

  if (!oldestSample) {
    return { x: 0, y: 0 };
  }

  // Convert time delta to seconds
  const timeDelta = (latest.timestamp - oldestSample.timestamp) / 1000;

  if (timeDelta === 0) {
    return { x: 0, y: 0 };
  }

  // Calculate velocity (pixels per second)
  const velocity = {
    x: (latest.x - oldestSample.x) / timeDelta,
    y: (latest.y - oldestSample.y) / timeDelta,
  };

  // Prevent infinity values
  if (velocity.x === Infinity) velocity.x = 0;
  if (velocity.y === Infinity) velocity.y = 0;

  return velocity;
};

/**
 * Calculate a rotation weight based on item size.
 *
 * Uses a rectangle inertia proxy: I ∝ (w*h)*(w^2 + h^2).
 * The exponent softens the size effect so large items still swing naturally.
 */
const ROTATION_WEIGHT_EXPONENT = 0.4;
export const calculateRotationWeight = (
  width: number,
  height: number,
  baseWidth: number,
  baseHeight: number,
): number => {
  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    !Number.isFinite(baseWidth) ||
    !Number.isFinite(baseHeight) ||
    width <= 0 ||
    height <= 0 ||
    baseWidth <= 0 ||
    baseHeight <= 0
  ) {
    return 1;
  }

  const inertia = width * height * (width * width + height * height);
  const baseInertia =
    baseWidth * baseHeight * (baseWidth * baseWidth + baseHeight * baseHeight);

  if (!Number.isFinite(inertia) || !Number.isFinite(baseInertia)) {
    return 1;
  }

  if (baseInertia <= 0) {
    return 1;
  }

  const ratio = inertia / baseInertia;
  if (!Number.isFinite(ratio) || ratio <= 0) {
    return 1;
  }

  return ratio ** ROTATION_WEIGHT_EXPONENT;
};

/**
 * Convert velocity to rotation using Bento formula
 *
 * INVERTED: drag right = tilt left (negative rotation) due to inertia
 */
export const velocityToRotation = (velocityX: number): number => {
  const rawRotation = -velocityX * VELOCITY_SCALE;
  return Math.sign(rawRotation) * Math.min(Math.abs(rawRotation), MAX_ROTATION);
};
