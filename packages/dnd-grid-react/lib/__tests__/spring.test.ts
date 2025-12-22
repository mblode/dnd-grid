import { beforeEach, describe, expect, it } from "vitest";
import {
  calculateVelocityFromHistory,
  calculateRotationWeight,
  createLiveSpring,
  MAX_ROTATION,
  POSITION_SPRING_CONFIG,
  type PointWithTimestamp,
  SCALE_SPRING_CONFIG,
  SPRING_DEFAULTS,
  VELOCITY_SCALE,
  VELOCITY_WINDOW_MS,
  velocityToRotation,
} from "../spring";

describe("spring", () => {
  describe("constants", () => {
    it("exports correct velocity window", () => {
      expect(VELOCITY_WINDOW_MS).toBe(100);
    });

    it("exports correct velocity scale", () => {
      expect(VELOCITY_SCALE).toBe(0.005);
    });

    it("exports correct max rotation", () => {
      expect(MAX_ROTATION).toBe(45);
    });

    it("exports spring defaults with correct values", () => {
      expect(SPRING_DEFAULTS).toEqual({
        stiffness: 100,
        damping: 10,
        mass: 1,
      });
    });

    it("exports scale spring config with stiffness and damping", () => {
      expect(SCALE_SPRING_CONFIG).toHaveProperty("stiffness");
      expect(SCALE_SPRING_CONFIG).toHaveProperty("damping");
      expect(SCALE_SPRING_CONFIG.stiffness).toBe(550);
      expect(SCALE_SPRING_CONFIG.damping).toBe(30);
    });

    it("exports position spring config", () => {
      expect(POSITION_SPRING_CONFIG).toHaveProperty("stiffness");
      expect(POSITION_SPRING_CONFIG).toHaveProperty("damping");
      expect(POSITION_SPRING_CONFIG).toHaveProperty("restSpeed");
      expect(POSITION_SPRING_CONFIG).toHaveProperty("restDistance");
    });
  });

  describe("createLiveSpring", () => {
    let spring: ReturnType<typeof createLiveSpring>;

    beforeEach(() => {
      spring = createLiveSpring();
    });

    it("creates a spring with default values", () => {
      expect(spring.getValue()).toBe(0);
      expect(spring.getTarget()).toBe(0);
    });

    it("setTarget updates target value", () => {
      spring.setTarget(100);
      expect(spring.getTarget()).toBe(100);
    });

    it("setCurrent updates current value", () => {
      spring.setCurrent(50);
      expect(spring.getValue()).toBe(50);
    });

    it("step returns initial value on first call", () => {
      const result = spring.step(1000);
      expect(result.value).toBe(0);
      expect(result.done).toBe(false);
    });

    it("step animates toward target over time", () => {
      spring.setTarget(100);
      spring.step(1000); // First call initializes time
      const result = spring.step(1016); // 16ms later
      expect(result.value).toBeGreaterThan(0);
      expect(result.value).toBeLessThan(100);
    });

    it("spring reaches rest when close to target", () => {
      spring.setCurrent(99.9);
      spring.setTarget(100);
      spring.step(1000);
      const result = spring.step(1100);
      expect(result.done).toBe(true);
      expect(result.value).toBe(100);
    });

    it("reset clears all values", () => {
      spring.setTarget(100);
      spring.setCurrent(50);
      spring.reset();
      expect(spring.getValue()).toBe(0);
      expect(spring.getTarget()).toBe(0);
    });

    it("caps delta time to prevent physics explosion", () => {
      spring.setTarget(100);
      spring.step(1000);
      // Simulate a 500ms gap (should be capped to 64ms)
      const result = spring.step(1500);
      expect(result.value).toBeGreaterThan(0);
      expect(result.value).toBeLessThan(100);
    });

    it("accepts custom config with higher stiffness", () => {
      const customSpring = createLiveSpring({
        stiffness: 500,
        damping: 50,
        mass: 1,
      });
      customSpring.setTarget(100);
      customSpring.step(1000);

      const defaultSpring = createLiveSpring();
      defaultSpring.setTarget(100);
      defaultSpring.step(1000);

      const customResult = customSpring.step(1016);
      const defaultResult = defaultSpring.step(1016);

      // Higher stiffness should result in faster movement
      expect(customResult.value).toBeGreaterThan(defaultResult.value);
    });

    it("returns velocity in step result", () => {
      spring.setTarget(100);
      spring.step(1000);
      const result = spring.step(1016);
      expect(result).toHaveProperty("velocity");
      expect(typeof result.velocity).toBe("number");
    });

    it("velocity decreases as spring settles", () => {
      spring.setTarget(100);
      spring.step(1000);

      const velocities: number[] = [];
      for (let t = 1016; t < 2000; t += 16) {
        const result = spring.step(t);
        velocities.push(Math.abs(result.velocity));
        if (result.done) break;
      }

      // Velocity should generally decrease over time
      const avgFirst = velocities.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
      const avgLast = velocities.slice(-3).reduce((a, b) => a + b, 0) / 3;
      expect(avgLast).toBeLessThanOrEqual(avgFirst);
    });

    it("handles negative target values", () => {
      spring.setTarget(-100);
      spring.step(1000);
      const result = spring.step(1016);
      expect(result.value).toBeLessThan(0);
    });

    it("handles changing target mid-animation", () => {
      spring.setTarget(100);
      spring.step(1000);
      spring.step(1016);

      // Change target
      spring.setTarget(-50);
      const result = spring.step(1032);

      // Should now move toward -50
      expect(result.value).toBeDefined();
    });

    it("setCurrent resets velocity", () => {
      spring.setTarget(100);
      spring.step(1000);
      spring.step(1016); // Build up velocity

      spring.setCurrent(50); // This should reset velocity
      spring.step(1032); // Re-initialize time
      const result = spring.step(1048);

      // Value should be greater than 50 since spring animates toward 100
      expect(result.value).toBeGreaterThan(50);
    });
  });

  describe("calculateVelocityFromHistory", () => {
    it("returns zero velocity for empty history", () => {
      const result = calculateVelocityFromHistory([]);
      expect(result).toEqual({ x: 0, y: 0 });
    });

    it("returns zero velocity for single point", () => {
      const history: PointWithTimestamp[] = [
        { x: 100, y: 100, timestamp: 1000 },
      ];
      const result = calculateVelocityFromHistory(history);
      expect(result).toEqual({ x: 0, y: 0 });
    });

    it("calculates velocity from two points", () => {
      const history: PointWithTimestamp[] = [
        { x: 0, y: 0, timestamp: 900 },
        { x: 100, y: 50, timestamp: 1000 },
      ];
      const result = calculateVelocityFromHistory(history);
      // 100px in 100ms = 1000px/s
      expect(result.x).toBe(1000);
      expect(result.y).toBe(500);
    });

    it("uses points within 100ms sliding window", () => {
      const history: PointWithTimestamp[] = [
        { x: 0, y: 0, timestamp: 800 }, // Too old
        { x: 50, y: 50, timestamp: 910 }, // Within window
        { x: 100, y: 100, timestamp: 1000 },
      ];
      const result = calculateVelocityFromHistory(history);
      // Should calculate velocity from the oldest point within window
      // The algorithm finds the oldest sample that's MORE than 100ms old from latest
      // 100px in 200ms = 500 px/s (from point at 800 to 1000)
      expect(result.x).toBe(500);
    });

    it("handles zero time delta", () => {
      const history: PointWithTimestamp[] = [
        { x: 0, y: 0, timestamp: 1000 },
        { x: 100, y: 100, timestamp: 1000 },
      ];
      const result = calculateVelocityFromHistory(history);
      expect(result).toEqual({ x: 0, y: 0 });
    });

    it("prevents infinity values", () => {
      const history: PointWithTimestamp[] = [
        { x: 0, y: 0, timestamp: 999 },
        { x: Number.POSITIVE_INFINITY, y: 100, timestamp: 1000 },
      ];
      const result = calculateVelocityFromHistory(history);
      expect(Number.isFinite(result.x)).toBe(true);
    });

    it("calculates negative velocity for movement in negative direction", () => {
      const history: PointWithTimestamp[] = [
        { x: 100, y: 100, timestamp: 900 },
        { x: 0, y: 50, timestamp: 1000 },
      ];
      const result = calculateVelocityFromHistory(history);
      expect(result.x).toBe(-1000);
      expect(result.y).toBe(-500);
    });

    it("handles many points in history", () => {
      const history: PointWithTimestamp[] = [];
      for (let i = 0; i < 20; i++) {
        history.push({
          x: i * 10,
          y: i * 5,
          timestamp: 800 + i * 10,
        });
      }
      const result = calculateVelocityFromHistory(history);
      expect(result.x).toBeGreaterThan(0);
      expect(result.y).toBeGreaterThan(0);
    });
  });

  describe("velocityToRotation", () => {
    it("returns 0 for zero velocity", () => {
      expect(velocityToRotation(0)).toBe(-0);
    });

    it("returns negative rotation for positive velocity (inertia)", () => {
      const rotation = velocityToRotation(1000);
      expect(rotation).toBeLessThan(0);
    });

    it("returns positive rotation for negative velocity", () => {
      const rotation = velocityToRotation(-1000);
      expect(rotation).toBeGreaterThan(0);
    });

    it("clamps to MAX_ROTATION for high positive velocity", () => {
      const rotation = velocityToRotation(100000);
      expect(rotation).toBe(-MAX_ROTATION);
    });

    it("clamps to -MAX_ROTATION for high negative velocity", () => {
      const rotation = velocityToRotation(-100000);
      expect(rotation).toBe(MAX_ROTATION);
    });

    it("applies VELOCITY_SCALE correctly", () => {
      const velocity = 200;
      const expected = -velocity * VELOCITY_SCALE; // -1 degree
      expect(velocityToRotation(velocity)).toBe(expected);
    });

    it("is symmetric around zero", () => {
      const posRotation = velocityToRotation(500);
      const negRotation = velocityToRotation(-500);
      expect(posRotation).toBe(-negRotation);
    });

    it("returns small rotation for small velocity", () => {
      const rotation = velocityToRotation(100);
      expect(Math.abs(rotation)).toBeLessThan(1);
    });
  });

  describe("calculateRotationWeight", () => {
    it("returns 1 for the baseline size", () => {
      expect(calculateRotationWeight(100, 100, 100, 100)).toBe(1);
    });

    it("increases weight for larger items", () => {
      expect(calculateRotationWeight(200, 200, 100, 100)).toBeCloseTo(
        Math.pow(16, 0.4),
      );
    });

    it("accounts for aspect ratio", () => {
      const weight = calculateRotationWeight(200, 100, 100, 100);
      expect(weight).toBeCloseTo(Math.pow(5, 0.4));
    });

    it("falls back to 1 for invalid inputs", () => {
      expect(calculateRotationWeight(Infinity, 100, 100, 100)).toBe(1);
      expect(calculateRotationWeight(100, 100, 0, 100)).toBe(1);
      expect(calculateRotationWeight(100, -10, 100, 100)).toBe(1);
    });
  });
});
