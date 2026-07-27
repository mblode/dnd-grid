import {
  MAX_ROTATION,
  SCALE_SPRING_CONFIG,
  SPRING_DEFAULTS,
  type SpringConfig,
  VELOCITY_SCALE,
  VELOCITY_WINDOW_MS,
} from "@dnd-grid/core";

/**
 * Settings for the palette drag swing on the marketing site.
 *
 * The spring physics themselves live in `@dnd-grid/core`; only the tuning this
 * site layers on top belongs here. This file used to be a verbatim copy of
 * core's spring module, so the two sets of constants could silently drift.
 */

type RotationSpringSettings = Required<
  Pick<
    SpringConfig,
    "stiffness" | "damping" | "mass" | "restSpeed" | "restDistance"
  >
>;

type ScaleSpringSettings = Required<
  Pick<SpringConfig, "stiffness" | "damping" | "restSpeed" | "restDistance">
>;

export interface DragSwingSettings {
  velocityWindowMs: number;
  velocityScale: number;
  maxRotation: number;
  dragScale: number;
  rotationSpring: RotationSpringSettings;
  scaleSpring: ScaleSpringSettings;
}

const DRAG_SWING_DEFAULTS: DragSwingSettings = {
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
