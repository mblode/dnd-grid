import { describe, expect, it, vi } from "vitest";
import { createCallbackThrottle } from "../callback-throttle";

describe("createCallbackThrottle", () => {
  it("invokes immediately when interval is disabled", () => {
    const callback = vi.fn();
    const throttle = createCallbackThrottle<number>();

    throttle.run(callback, 1, 0);

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith(1);
  });

  it("throttles calls and delivers the latest event", () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);

    const callback = vi.fn();
    const throttle = createCallbackThrottle<number>();

    throttle.run(callback, 1, 100);
    throttle.run(callback, 2, 100);

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith(1);

    vi.advanceTimersByTime(100);

    expect(callback).toHaveBeenCalledTimes(2);
    expect(callback).toHaveBeenLastCalledWith(2);

    vi.useRealTimers();
  });

  it("flushes pending events immediately", () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);

    const callback = vi.fn();
    const throttle = createCallbackThrottle<number>();

    throttle.run(callback, 1, 100);
    throttle.run(callback, 2, 100);

    throttle.flush(callback);

    expect(callback).toHaveBeenCalledTimes(2);
    expect(callback).toHaveBeenLastCalledWith(2);

    vi.useRealTimers();
  });
});
