/**
 * Custom Spring Implementation
 * EXACT from bento-example.min.js:916-967
 *
 * This module provides the exact spring physics used by Bento.me for animations.
 * The spring creates an underdamped oscillation that produces the "swing" effect.
 */

/**
 * Spring configuration options
 * These match the parameters from bento-example.min.js:928-937
 */
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

/**
 * Spring state returned at each time step
 * Matches the state object from bento-example.min.js:939-944
 */
export interface SpringState {
  done: boolean;
  hasReachedTarget: boolean;
  current: number;
  target: number;
}

/**
 * Default spring values - EXACT from bento-example.min.js:916-919
 *
 * const springDefaults = {
 *   stiffness: 100,
 *   damping: 10,
 *   mass: 1,
 * };
 */
export const springDefaults = {
  stiffness: 100,
  damping: 10,
  mass: 1,
};

/**
 * Calculate damping ratio - EXACT from bento-example.min.js:921-922
 *
 * const calcDampingRatio = (stiffness = 100, damping = 10, mass = 1) =>
 *   damping / (2 * Math.sqrt(stiffness * mass));
 *
 * This determines whether the spring is:
 * - Underdamped (ratio < 1): Oscillates before settling
 * - Critically damped (ratio = 1): Fastest settling without oscillation
 * - Overdamped (ratio > 1): Slow settling without oscillation
 *
 * For Bento's position/rotation spring (stiffness: 500, damping: 25):
 * dampingRatio = 25 / (2 * sqrt(500 * 1)) = 25 / 44.72 ≈ 0.559
 * This is UNDERDAMPED, creating the visible swing oscillation.
 */
export function calcDampingRatio(
  stiffness = springDefaults.stiffness,
  damping = springDefaults.damping,
  mass = springDefaults.mass
): number {
  return damping / (2 * Math.sqrt(stiffness * mass));
}

/**
 * Calculate velocity by numerical differentiation - EXACT from bento-example.min.js:923-926
 *
 * function calcGeneratorVelocity(generator, time, current) {
 *   const prevTime = Math.max(time - 5, 0);
 *   const delta = current - generator(prevTime);
 *   const timeDelta = time - prevTime;
 *   return timeDelta ? delta * (1000 / timeDelta) : 0;
 * }
 *
 * This approximates velocity by sampling the generator at t and t-5ms.
 */
function calcGeneratorVelocity(
  generator: (t: number) => number,
  time: number,
  current: number
): number {
  const prevTime = Math.max(time - 5, 0);
  const delta = current - generator(prevTime);
  const timeDelta = time - prevTime;
  return timeDelta ? delta * (1000 / timeDelta) : 0;
}

/**
 * Create a spring generator function - EXACT from bento-example.min.js:928-967
 *
 * This is the core spring physics implementation. It returns a function that,
 * given a time in milliseconds, returns the current state of the spring animation.
 *
 * The physics for underdamped springs (what creates the swing effect):
 *
 * position(t) = to - e^(-ζωₙt) * [
 *   ((-v₀ + ζωₙΔ) / ωd) * sin(ωd * t) + Δ * cos(ωd * t)
 * ]
 *
 * Where:
 * - ζ (zeta) = damping ratio
 * - ωₙ = natural frequency = sqrt(stiffness / mass) / 1000
 * - ωd = damped frequency = ωₙ * sqrt(1 - ζ²)
 * - Δ = delta = to - from
 * - v₀ = initial velocity (converted to per-ms)
 *
 * @param config Spring configuration
 * @returns A function that takes time (ms) and returns spring state
 */
export function createSpring({
  stiffness = springDefaults.stiffness,
  damping = springDefaults.damping,
  mass = springDefaults.mass,
  from = 0,
  to = 1,
  velocity = 0,
  restSpeed = 2,
  restDistance = 0.5,
}: SpringConfig = {}): (time: number) => SpringState {
  let generator: (t: number) => number;

  // Convert velocity from per-second to per-ms (line 938)
  // velocity = velocity ? secondsToMs(velocity) : 0
  // secondsToMs divides by 1000
  velocity = velocity ? velocity / 1000 : 0;

  // Initialize state object (lines 939-944)
  const state: SpringState = {
    done: false,
    hasReachedTarget: false,
    current: from,
    target: to,
  };

  // Calculate physics parameters (lines 946-948)
  const delta = to - from;
  const naturalFrequency = Math.sqrt(stiffness / mass) / 1000;
  const dampingRatio = calcDampingRatio(stiffness, damping, mass);

  // Choose generator based on damping ratio (lines 950-962)
  if (dampingRatio < 1) {
    // UNDERDAMPED - Creates oscillation (the swing effect!)
    // This is the formula from lines 951-957
    const dampedFrequency = naturalFrequency * Math.sqrt(1 - dampingRatio * dampingRatio);

    generator = (t: number) =>
      to -
      Math.exp(-dampingRatio * naturalFrequency * t) *
        (((-velocity + dampingRatio * naturalFrequency * delta) / dampedFrequency) *
          Math.sin(dampedFrequency * t) +
          delta * Math.cos(dampedFrequency * t));
  } else {
    // Critically damped or overdamped (lines 958-961)
    generator = (t: number) =>
      to - Math.exp(-naturalFrequency * t) * (delta + (-velocity + naturalFrequency * delta) * t);
  }

  // Return the animation function (lines 964-972)
  return (time: number): SpringState => {
    state.current = generator(time);

    // Calculate current velocity using numerical differentiation
    const currentVelocity =
      time === 0 ? velocity : calcGeneratorVelocity(generator, time, state.current);

    // Check if animation is at rest
    const isAtTarget = Math.abs(to - state.current) <= restDistance;
    state.done = Math.abs(currentVelocity) <= restSpeed && isAtTarget;

    // Check if we've reached/passed target
    state.hasReachedTarget =
      (from < to && state.current >= to) || (from > to && state.current <= to);

    return state;
  };
}

/**
 * Position/Rotation spring preset - EXACT from bento-example-2.min.js:464-468
 *
 * const positionSpring = () => ({
 *   type: "spring",
 *   stiffness: 500,
 *   damping: 25,
 *   restSpeed: 10,
 * });
 *
 * Used for: x, y, z, rotate, rotateX, rotateY, rotateZ
 */
export const positionSpringConfig: SpringConfig = {
  stiffness: 500,
  damping: 25,
  restSpeed: 10,
};

/**
 * Scale spring preset - EXACT from bento-example-2.min.js:476-481
 *
 * const scaleSpring = (target) => ({
 *   type: "spring",
 *   stiffness: 550,
 *   damping: target === 0 ? 2 * Math.sqrt(550) : 30,
 *   restSpeed: 10,
 * });
 *
 * Used for: scaleX, scaleY, scale
 */
export function scaleSpringConfig(target: number): SpringConfig {
  return {
    stiffness: 550,
    damping: target === 0 ? 2 * Math.sqrt(550) : 30,
    restSpeed: 10,
  };
}

/**
 * Keyframes transition preset - EXACT from bento-example-2.min.js:483-487
 *
 * const keyframesTransition = () => ({
 *   type: "keyframes",
 *   ease: "linear",
 *   duration: 0.3,
 * });
 *
 * Used for: opacity, backgroundColor, color
 */
export const keyframesTransitionConfig = {
  type: "keyframes" as const,
  ease: "linear" as const,
  duration: 0.3,
};

/**
 * Default transitions map - EXACT from bento-example-2.min.js:489-507
 *
 * Maps CSS properties to their default transition configurations.
 */
export const defaultTransitions = {
  x: positionSpringConfig,
  y: positionSpringConfig,
  z: positionSpringConfig,
  rotate: positionSpringConfig,
  rotateX: positionSpringConfig,
  rotateY: positionSpringConfig,
  rotateZ: positionSpringConfig,
  scaleX: scaleSpringConfig,
  scaleY: scaleSpringConfig,
  scale: scaleSpringConfig,
  opacity: keyframesTransitionConfig,
  backgroundColor: keyframesTransitionConfig,
  color: keyframesTransitionConfig,
};
