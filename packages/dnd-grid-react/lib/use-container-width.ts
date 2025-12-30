import {
  type RefObject,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

export interface UseContainerWidthOptions {
  /**
   * Delay initial render until width is measured.
   */
  measureBeforeMount?: boolean;
  /**
   * Initial width before measurement.
   */
  initialWidth?: number;
}

export interface UseContainerWidthResult {
  width: number;
  mounted: boolean;
  containerRef: RefObject<HTMLDivElement | null>;
  measureWidth: () => void;
}

const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

export const useContainerWidth = (
  options: UseContainerWidthOptions = {}
): UseContainerWidthResult => {
  const { measureBeforeMount = false, initialWidth = 1280 } = options;
  const [width, setWidth] = useState(initialWidth);
  const [mounted, setMounted] = useState(!measureBeforeMount);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<ResizeObserver | null>(null);

  const measureWidth = useCallback(() => {
    const node = containerRef.current;
    if (!node) {
      return;
    }

    const nextWidth = node.offsetWidth;
    setWidth(nextWidth);
    if (!mounted) {
      setMounted(true);
    }
  }, [mounted]);

  useIsomorphicLayoutEffect(() => {
    const node = containerRef.current;
    if (!node) {
      return;
    }

    measureWidth();

    if (typeof ResizeObserver !== "undefined") {
      observerRef.current = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (!entry) {
          return;
        }
        setWidth(entry.contentRect.width);
      });
      observerRef.current.observe(node);
    }

    return () => {
      observerRef.current?.disconnect();
      observerRef.current = null;
    };
  }, [measureWidth]);

  return {
    width,
    mounted,
    containerRef,
    measureWidth,
  };
};
