import {
  POSITION_SPRING_CONFIG,
  SCALE_SPRING_CONFIG,
  SPRING_DEFAULTS,
} from "./spring";
import type { AnimationConfig, AnimationSpringConfig } from "./types";

interface ResolvedAnimationConfig {
  springs: {
    enabled: boolean;
    rotation: AnimationSpringConfig;
    scale: AnimationSpringConfig;
    position: AnimationSpringConfig;
  };
  shadow: {
    enabled: boolean;
    dragStartDuration: number;
    dragStopDuration: number;
    dragStartEasing: string;
    dragStopEasing: string;
  };
}

const defaultRotationSpring: AnimationSpringConfig = {
  stiffness: SPRING_DEFAULTS.stiffness,
  damping: SPRING_DEFAULTS.damping,
  mass: SPRING_DEFAULTS.mass,
  restSpeed: 2,
  restDistance: 0.5,
};

const defaultScaleSpring: AnimationSpringConfig = {
  ...SCALE_SPRING_CONFIG,
  restDistance: 0.001,
};

const defaultPositionSpring: AnimationSpringConfig = {
  ...POSITION_SPRING_CONFIG,
};

const resolveSpringConfig = (
  base: AnimationSpringConfig,
  overrides?: AnimationSpringConfig
): AnimationSpringConfig => ({
  ...base,
  ...overrides,
});

export const resolveAnimationConfig = (
  config?: AnimationConfig
): ResolvedAnimationConfig => {
  const springs = config?.springs;
  const shadow = config?.shadow;

  return {
    springs: {
      enabled: springs?.enabled ?? true,
      rotation: resolveSpringConfig(defaultRotationSpring, springs?.rotation),
      scale: resolveSpringConfig(defaultScaleSpring, springs?.scale),
      position: resolveSpringConfig(defaultPositionSpring, springs?.position),
    },
    shadow: {
      enabled: shadow?.enabled ?? true,
      dragStartDuration: shadow?.dragStartDuration ?? 200,
      dragStopDuration: shadow?.dragStopDuration ?? 200,
      dragStartEasing: shadow?.dragStartEasing ?? "cubic-bezier(.2, 0, 0, 1)",
      dragStopEasing: shadow?.dragStopEasing ?? "ease-out",
    },
  };
};
