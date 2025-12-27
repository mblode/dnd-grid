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

/** Position spring config - subtle underdamped bounce (zeta=0.7, ~5% overshoot) */
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

export type RotationSpringSettings = Required<
  Pick<
    SpringConfig,
    "stiffness" | "damping" | "mass" | "restSpeed" | "restDistance"
  >
>;

export type ScaleSpringSettings = Required<
  Pick<SpringConfig, "stiffness" | "damping" | "restSpeed" | "restDistance">
>;

export type DragSwingSettings = {
  velocityWindowMs: number;
  velocityScale: number;
  maxRotation: number;
  dragScale: number;
  rotationSpring: RotationSpringSettings;
  scaleSpring: ScaleSpringSettings;
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

export const DRAG_SWING_DEFAULTS: DragSwingSettings = {
  velocityWindowMs: VELOCITY_WINDOW_MS,
  velocityScale: VELOCITY_SCALE,
  maxRotation: MAX_ROTATION,
  dragScale: 1.04,
  rotationSpring: {
    stiffness: SPRING_DEFAULTS.stiffness,
    damping: SPRING_DEFAULTS.damping,
    mass: SPRING_DEFAULTS.mass,
    restSpeed: 2,
    restDistance: 0.5,
  },
  scaleSpring: {
    stiffness: SCALE_SPRING_CONFIG.stiffness,
    damping: SCALE_SPRING_CONFIG.damping,
    restSpeed: SCALE_SPRING_CONFIG.restSpeed,
    restDistance: 0.001,
  },
};

export const getDragSwingDefaults = (): DragSwingSettings => ({
  ...DRAG_SWING_DEFAULTS,
  rotationSpring: { ...DRAG_SWING_DEFAULTS.rotationSpring },
  scaleSpring: { ...DRAG_SWING_DEFAULTS.scaleSpring },
});

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
  const configState = {
    stiffness: config.stiffness ?? SPRING_DEFAULTS.stiffness,
    damping: config.damping ?? SPRING_DEFAULTS.damping,
    mass: config.mass ?? SPRING_DEFAULTS.mass,
    restSpeed: config.restSpeed ?? 2,
    restDistance: config.restDistance ?? 0.5,
  };

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
      const springForce = -configState.stiffness * displacement;
      const dampingForce = -configState.damping * currentVelocity;
      const acceleration = (springForce + dampingForce) / configState.mass;

      // Update velocity and position using Euler integration
      // dt is in seconds, velocity is in units/second, so position change = velocity * dt
      const dt = deltaTime / 1000; // Convert to seconds for physics
      currentVelocity += acceleration * dt;
      currentValue += currentVelocity * dt;

      // Check if at rest
      const isAtRest =
        Math.abs(currentVelocity) < configState.restSpeed &&
        Math.abs(currentValue - targetValue) < configState.restDistance;

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

    setConfig(nextConfig: SpringConfig) {
      if (typeof nextConfig.stiffness === "number") {
        configState.stiffness = nextConfig.stiffness;
      }
      if (typeof nextConfig.damping === "number") {
        configState.damping = nextConfig.damping;
      }
      if (typeof nextConfig.mass === "number") {
        configState.mass = nextConfig.mass;
      }
      if (typeof nextConfig.restSpeed === "number") {
        configState.restSpeed = nextConfig.restSpeed;
      }
      if (typeof nextConfig.restDistance === "number") {
        configState.restDistance = nextConfig.restDistance;
      }
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
 * Calculate velocity from position history using a sliding window
 *
 * This matches the exact algorithm from Bento/Framer Motion's PanSession class.
 * The velocity is calculated from the difference between the latest position
 * and a sample older than the provided window.
 */
export const calculateVelocityFromHistory = (
  history: PointWithTimestamp[],
  windowMs: number = VELOCITY_WINDOW_MS,
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
    if (latest.timestamp - oldestSample.timestamp > windowMs) {
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
 * Convert velocity to rotation using Bento formula
 *
 * INVERTED: drag right = tilt left (negative rotation) due to inertia
 */
export const velocityToRotation = (
  velocityX: number,
  velocityScale: number = VELOCITY_SCALE,
  maxRotation: number = MAX_ROTATION,
): number => {
  const rawRotation = -velocityX * velocityScale;
  return Math.sign(rawRotation) * Math.min(Math.abs(rawRotation), maxRotation);
};
