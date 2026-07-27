export const VELOCITY_WINDOW_MS = 100;
export const VELOCITY_SCALE = 0.005;
export const MAX_ROTATION = 45;

export const SPRING_DEFAULTS = {
  stiffness: 100,
  damping: 10,
  mass: 1,
};

export const SCALE_SPRING_CONFIG = {
  stiffness: 550,
  damping: 30,
  restSpeed: 10,
};

export const POSITION_SPRING_CONFIG = {
  stiffness: 200,
  damping: 20,
  restSpeed: 1,
  restDistance: 0.5,
};

export interface SpringConfig {
  stiffness?: number;
  damping?: number;
  mass?: number;
  from?: number;
  to?: number;
  velocity?: number;
  restSpeed?: number;
  restDistance?: number;
}

export interface SpringState {
  done: boolean;
  hasReachedTarget: boolean;
  current: number;
  target: number;
}

export interface PointWithTimestamp {
  x: number;
  y: number;
  timestamp: number;
}

export const createLiveSpring = (
  config: {
    stiffness?: number;
    damping?: number;
    mass?: number;
    restSpeed?: number;
    restDistance?: number;
  } = {}
) => {
  // Held in a mutable record rather than destructured consts so `setConfig`
  // can retune a running spring without discarding its current motion.
  const settings = {
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
      lastTime = null;
    },

    step(now: number): { value: number; velocity: number; done: boolean } {
      if (lastTime === null) {
        lastTime = now;
        return { value: currentValue, velocity: currentVelocity, done: false };
      }

      const deltaTime = Math.min(now - lastTime, 64);
      lastTime = now;

      const displacement = currentValue - targetValue;
      const springForce = -settings.stiffness * displacement;
      const dampingForce = -settings.damping * currentVelocity;
      const acceleration = (springForce + dampingForce) / settings.mass;

      const dt = deltaTime / 1000;
      currentVelocity += acceleration * dt;
      currentValue += currentVelocity * dt;

      const isAtRest =
        Math.abs(currentVelocity) < settings.restSpeed &&
        Math.abs(currentValue - targetValue) < settings.restDistance;

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

    /** Retune a running spring. Omitted fields keep their current value. */
    setConfig(nextConfig: SpringConfig) {
      if (typeof nextConfig.stiffness === "number") {
        settings.stiffness = nextConfig.stiffness;
      }
      if (typeof nextConfig.damping === "number") {
        settings.damping = nextConfig.damping;
      }
      if (typeof nextConfig.mass === "number") {
        settings.mass = nextConfig.mass;
      }
      if (typeof nextConfig.restSpeed === "number") {
        settings.restSpeed = nextConfig.restSpeed;
      }
      if (typeof nextConfig.restDistance === "number") {
        settings.restDistance = nextConfig.restDistance;
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

export const calculateVelocityFromHistory = (
  history: PointWithTimestamp[],
  windowMs: number = VELOCITY_WINDOW_MS
): { x: number; y: number } => {
  if (history.length < 2) {
    return { x: 0, y: 0 };
  }

  let i = history.length - 1;
  let oldestSample: PointWithTimestamp | null = null;
  const latest = history.at(-1);
  if (!latest) {
    return { x: 0, y: 0 };
  }

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

  const timeDelta = (latest.timestamp - oldestSample.timestamp) / 1000;

  if (timeDelta === 0) {
    return { x: 0, y: 0 };
  }

  const velocity = {
    x: (latest.x - oldestSample.x) / timeDelta,
    y: (latest.y - oldestSample.y) / timeDelta,
  };

  if (velocity.x === Number.POSITIVE_INFINITY) {
    velocity.x = 0;
  }
  if (velocity.y === Number.POSITIVE_INFINITY) {
    velocity.y = 0;
  }

  return velocity;
};

export const velocityToRotation = (
  velocityX: number,
  velocityScale: number = VELOCITY_SCALE,
  maxRotation: number = MAX_ROTATION
): number => {
  const rawRotation = -velocityX * velocityScale;
  return Math.sign(rawRotation) * Math.min(Math.abs(rawRotation), maxRotation);
};

export const calculateRotationWeight = (
  width: number,
  height: number,
  baselineWidth: number,
  baselineHeight: number
): number => {
  if (
    !(
      Number.isFinite(width) &&
      Number.isFinite(height) &&
      Number.isFinite(baselineWidth) &&
      Number.isFinite(baselineHeight)
    ) ||
    width <= 0 ||
    height <= 0 ||
    baselineWidth <= 0 ||
    baselineHeight <= 0
  ) {
    return 1;
  }

  const widthRatio = width / baselineWidth;
  const heightRatio = height / baselineHeight;
  const sizeFactor =
    ((widthRatio ** 2 + heightRatio ** 2) * (widthRatio * heightRatio)) / 2;

  return sizeFactor ** 0.4;
};
