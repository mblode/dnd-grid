export type CallbackThrottle<T> = {
  run: (callback: (event: T) => void, event: T, intervalMs: number) => void;
  flush: (callback: (event: T) => void) => void;
  cancel: () => void;
};

export const createCallbackThrottle = <T>(): CallbackThrottle<T> => {
  let lastCall = Number.NEGATIVE_INFINITY;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let pending: T | null = null;

  const clearTimer = () => {
    if (timeoutId === null) return;
    clearTimeout(timeoutId);
    timeoutId = null;
  };

  const run = (callback: (event: T) => void, event: T, intervalMs: number) => {
    if (!intervalMs || intervalMs <= 0) {
      callback(event);
      return;
    }

    const now = Date.now();
    const elapsed = now - lastCall;
    if (elapsed >= intervalMs && timeoutId === null) {
      lastCall = now;
      callback(event);
      return;
    }

    pending = event;
    if (timeoutId !== null) return;

    const delay = Math.max(intervalMs - elapsed, 0);
    timeoutId = setTimeout(() => {
      timeoutId = null;
      if (!pending) return;
      const next = pending;
      pending = null;
      lastCall = Date.now();
      callback(next);
    }, delay);
  };

  const flush = (callback: (event: T) => void) => {
    clearTimer();
    if (!pending) return;
    const next = pending;
    pending = null;
    lastCall = Date.now();
    callback(next);
  };

  const cancel = () => {
    clearTimer();
    pending = null;
  };

  return { run, flush, cancel };
};
