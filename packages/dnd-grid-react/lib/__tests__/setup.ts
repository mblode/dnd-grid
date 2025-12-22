import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock requestAnimationFrame for spring animations
global.requestAnimationFrame = vi.fn((callback) => {
  return setTimeout(callback, 16) as unknown as number;
});

global.cancelAnimationFrame = vi.fn((id) => {
  clearTimeout(id);
});

// Mock performance.now for spring physics
vi.spyOn(performance, "now").mockImplementation(() => Date.now());

// Mock navigator for touch detection
Object.defineProperty(navigator, "maxTouchPoints", {
  value: 0,
  writable: true,
  configurable: true,
});

// Mock navigator.vibrate
Object.defineProperty(navigator, "vibrate", {
  value: vi.fn(),
  writable: true,
});

// Mock getBoundingClientRect
Element.prototype.getBoundingClientRect = vi.fn(() => ({
  width: 1000,
  height: 600,
  top: 0,
  left: 0,
  bottom: 600,
  right: 1000,
  x: 0,
  y: 0,
  toJSON: () => ({}),
}));

if (!Element.prototype.animate) {
  Element.prototype.animate = vi.fn();
}
