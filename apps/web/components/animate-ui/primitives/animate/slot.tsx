"use client";

import { type HTMLMotionProps, isMotionComponent, motion } from "motion/react";
import {
  type CSSProperties,
  type ElementType,
  isValidElement,
  type ReactElement,
  type Ref,
  type RefCallback,
  type RefObject,
  useMemo,
} from "react";
import { cn } from "@/lib/utils";

type AnyProps = Record<string, unknown>;

type DOMMotionProps<T extends HTMLElement = HTMLElement> = Omit<
  HTMLMotionProps<keyof HTMLElementTagNameMap>,
  "ref"
> & { ref?: Ref<T> };

type WithAsChild<Base extends object> =
  | (Base & { asChild: true; children: ReactElement })
  | (Base & { asChild?: false | undefined });

type SlotProps<T extends HTMLElement = HTMLElement> = DOMMotionProps<T>;

function mergeRefs<T>(...refs: (Ref<T> | undefined)[]): RefCallback<T> {
  return (node) => {
    for (const ref of refs) {
      if (!ref) {
        continue;
      }
      if (typeof ref === "function") {
        ref(node);
      } else {
        (ref as RefObject<T | null>).current = node;
      }
    }
  };
}

function mergeProps<T extends HTMLElement>(
  childProps: AnyProps,
  slotProps: DOMMotionProps<T>
): AnyProps {
  const merged: AnyProps = { ...childProps, ...slotProps };

  if (childProps.className || slotProps.className) {
    merged.className = cn(
      childProps.className as string,
      slotProps.className as string
    );
  }

  if (childProps.style || slotProps.style) {
    merged.style = {
      ...(childProps.style as CSSProperties),
      ...(slotProps.style as CSSProperties),
    };
  }

  return merged;
}

function Slot<T extends HTMLElement = HTMLElement>({
  children,
  ref,
  ...props
}: SlotProps<T>) {
  const childElement = isValidElement(children) ? children : null;
  const elementType = childElement ? childElement.type : "div";
  const isAlreadyMotion =
    typeof elementType === "object" &&
    elementType !== null &&
    isMotionComponent(elementType);

  const Base = useMemo(
    () =>
      isAlreadyMotion
        ? (elementType as ElementType)
        : motion.create(elementType as ElementType),
    [isAlreadyMotion, elementType]
  );

  if (!childElement) {
    return null;
  }

  const { ref: childRef, ...childProps } = childElement.props as AnyProps;

  const mergedProps = mergeProps(childProps, props);

  return <Base {...mergedProps} ref={mergeRefs(childRef as Ref<T>, ref)} />;
}

export { Slot, type WithAsChild };
