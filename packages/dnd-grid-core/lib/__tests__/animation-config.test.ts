import { describe, expect, it } from "vitest";
import { resolveAnimationConfig } from "../animation-config";
import {
  POSITION_SPRING_CONFIG,
  SCALE_SPRING_CONFIG,
  SPRING_DEFAULTS,
} from "../spring";

describe("resolveAnimationConfig", () => {
  it("uses defaults when config is undefined", () => {
    const config = resolveAnimationConfig();

    expect(config.springs.enabled).toBe(true);
    expect(config.springs.rotation.stiffness).toBe(SPRING_DEFAULTS.stiffness);
    expect(config.springs.rotation.damping).toBe(SPRING_DEFAULTS.damping);
    expect(config.springs.scale.stiffness).toBe(SCALE_SPRING_CONFIG.stiffness);
    expect(config.springs.position.stiffness).toBe(
      POSITION_SPRING_CONFIG.stiffness
    );
    expect(config.springs.scale.restDistance).toBe(0.001);
    expect(config.shadow.dragStartDuration).toBe(200);
    expect(config.shadow.dragStopEasing).toBe("ease-out");
  });

  it("applies overrides for springs and shadows", () => {
    const config = resolveAnimationConfig({
      springs: {
        enabled: false,
        rotation: { stiffness: 140, damping: 12 },
        position: { restSpeed: 4 },
      },
      shadow: {
        enabled: false,
        dragStartDuration: 120,
        dragStopDuration: 80,
        dragStartEasing: "linear",
      },
    });

    expect(config.springs.enabled).toBe(false);
    expect(config.springs.rotation.stiffness).toBe(140);
    expect(config.springs.rotation.damping).toBe(12);
    expect(config.springs.position.restSpeed).toBe(4);
    expect(config.shadow.enabled).toBe(false);
    expect(config.shadow.dragStartDuration).toBe(120);
    expect(config.shadow.dragStopDuration).toBe(80);
    expect(config.shadow.dragStartEasing).toBe("linear");
  });
});
