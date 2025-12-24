import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useReducedMotion } from "../use-reduced-motion";

const TestComponent = () => {
  const reduced = useReducedMotion();
  return <div data-testid="value" data-reduced={String(reduced)} />;
};

const setupMatchMedia = (initial: boolean) => {
  let matches = initial;
  const listeners = new Set<(event: MediaQueryListEvent) => void>();
  const mediaQueryList = {
    get matches() {
      return matches;
    },
    media: "",
    onchange: null,
    addEventListener: (
      _event: string,
      listener: (event: MediaQueryListEvent) => void,
    ) => {
      listeners.add(listener);
    },
    removeEventListener: (
      _event: string,
      listener: (event: MediaQueryListEvent) => void,
    ) => {
      listeners.delete(listener);
    },
    addListener: (listener: (event: MediaQueryListEvent) => void) => {
      listeners.add(listener);
    },
    removeListener: (listener: (event: MediaQueryListEvent) => void) => {
      listeners.delete(listener);
    },
  } as MediaQueryList;
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: () => mediaQueryList,
  });

  return {
    emit(nextMatches: boolean) {
      matches = nextMatches;
      listeners.forEach((listener) => {
        listener({ matches: nextMatches } as MediaQueryListEvent);
      });
    },
  };
};

describe("useReducedMotion", () => {
  const originalMatchMedia = window.matchMedia;

  afterEach(() => {
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: originalMatchMedia,
    });
  });

  it("returns false when matchMedia is unavailable", () => {
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: undefined,
    });
    render(<TestComponent />);
    expect(screen.getByTestId("value")).toHaveAttribute(
      "data-reduced",
      "false",
    );
  });

  it("updates when the media query value changes", () => {
    const { emit } = setupMatchMedia(false);
    render(<TestComponent />);
    expect(screen.getByTestId("value")).toHaveAttribute(
      "data-reduced",
      "false",
    );

    act(() => {
      emit(true);
    });

    expect(screen.getByTestId("value")).toHaveAttribute("data-reduced", "true");
  });
});
