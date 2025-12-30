import type {
  DistanceMeasurement,
  PointerActivationConstraint,
  PointerEventHandlers,
  SensorInstance,
  SensorOptions,
  SensorProps,
} from "@dnd-kit/core";
import { defaultCoordinates, KeyboardCode } from "@dnd-kit/core";
import {
  getEventCoordinates,
  getOwnerDocument,
  getWindow,
  subtract,
} from "@dnd-kit/utilities";
import type {
  MouseEvent as ReactMouseEvent,
  TouchEvent as ReactTouchEvent,
} from "react";
import {
  clearPointerPosition,
  setPointerEvent,
  setPointerPosition,
  setPointerPositionFromEvent,
} from "./pointer-tracker";

export interface TrackedPointerSensorOptions extends SensorOptions {
  activationConstraint?: PointerActivationConstraint;
  bypassActivationConstraint?(
    props: Pick<TrackedPointerSensorProps, "activeNode" | "event" | "options">
  ): boolean;
  onActivation?({ event }: { event: Event }): void;
}

export type TrackedPointerSensorProps =
  SensorProps<TrackedPointerSensorOptions>;

class Listeners {
  private readonly target: EventTarget | null;
  private readonly listeners: [
    string,
    EventListener,
    AddEventListenerOptions?,
  ][];

  constructor(target: EventTarget | null) {
    this.target = target;
    this.listeners = [];
  }

  add(
    eventName: string,
    handler: EventListener,
    options?: AddEventListenerOptions
  ) {
    this.target?.addEventListener(eventName, handler, options);
    this.listeners.push([eventName, handler, options]);
  }

  removeAll = () => {
    this.listeners.forEach((listener) => {
      this.target?.removeEventListener(...listener);
    });
  };
}

const getEventListenerTarget = (target: Event["target"]): EventTarget => {
  const { EventTarget } = getWindow(target);
  return target instanceof EventTarget ? target : getOwnerDocument(target);
};

const hasExceededDistance = (
  delta: { x: number; y: number },
  measurement: DistanceMeasurement
) => {
  const dx = Math.abs(delta.x);
  const dy = Math.abs(delta.y);

  if (typeof measurement === "number") {
    return Math.sqrt(dx ** 2 + dy ** 2) > measurement;
  }

  if ("x" in measurement && "y" in measurement) {
    return dx > measurement.x && dy > measurement.y;
  }

  if ("x" in measurement) {
    return dx > measurement.x;
  }

  if ("y" in measurement) {
    return dy > measurement.y;
  }

  return false;
};

enum EventName {
  Click = "click",
  DragStart = "dragstart",
  Keydown = "keydown",
  ContextMenu = "contextmenu",
  Resize = "resize",
  SelectionChange = "selectionchange",
  VisibilityChange = "visibilitychange",
}

const preventDefault = (event: Event) => {
  event.preventDefault();
};

const stopPropagation = (event: Event) => {
  event.stopPropagation();
};

class TrackedPointerSensor implements SensorInstance {
  autoScrollEnabled = true;
  private readonly props: TrackedPointerSensorProps;
  private readonly document: Document;
  private activated = false;
  private readonly initialCoordinates: { x: number; y: number } | null = null;
  private timeoutId: ReturnType<typeof setTimeout> | null = null;
  private readonly listeners: Listeners;
  private readonly documentListeners: Listeners;
  private readonly windowListeners: Listeners;

  constructor(
    props: TrackedPointerSensorProps,
    events: PointerEventHandlers,
    listenerTarget: Document | EventTarget = getEventListenerTarget(
      props.event.target
    )
  ) {
    this.props = props;
    this.document = getOwnerDocument(props.event.target);
    this.documentListeners = new Listeners(this.document);
    this.listeners = new Listeners(listenerTarget);
    this.windowListeners = new Listeners(getWindow(props.event.target));
    this.initialCoordinates =
      getEventCoordinates(props.event) ?? defaultCoordinates;

    this.attach(events);
  }

  private attach(events: PointerEventHandlers) {
    const {
      props: { options },
    } = this;

    this.listeners.add(events.move.name, this.handleMove, { passive: false });
    this.listeners.add(events.end.name, this.handleEnd);
    if (events.cancel) {
      this.listeners.add(events.cancel.name, this.handleCancel);
    }

    this.windowListeners.add(EventName.Resize, this.handleCancel);
    this.windowListeners.add(EventName.DragStart, preventDefault);
    this.windowListeners.add(EventName.VisibilityChange, this.handleCancel);
    this.windowListeners.add(EventName.ContextMenu, preventDefault);
    this.documentListeners.add(
      EventName.Keydown,
      this.handleKeydown as EventListener
    );

    if (options.activationConstraint) {
      if (
        options.bypassActivationConstraint?.({
          event: this.props.event,
          activeNode: this.props.activeNode,
          options: this.props.options,
        })
      ) {
        return this.handleStart();
      }

      if ("delay" in options.activationConstraint) {
        this.timeoutId = setTimeout(
          this.handleStart,
          options.activationConstraint.delay
        );
        this.handlePending(options.activationConstraint);
        return;
      }

      if ("distance" in options.activationConstraint) {
        this.handlePending(options.activationConstraint);
        return;
      }
    }

    this.handleStart();
  }

  private detach() {
    this.listeners.removeAll();
    this.windowListeners.removeAll();
    setTimeout(this.documentListeners.removeAll, 50);
    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }

  private handlePending(
    constraint: PointerActivationConstraint,
    offset?: { x: number; y: number }
  ) {
    const { active, onPending } = this.props;
    onPending(
      active,
      constraint,
      this.initialCoordinates ?? defaultCoordinates,
      offset
    );
  }

  private readonly handleStart = () => {
    const { onStart } = this.props;
    if (this.initialCoordinates) {
      this.activated = true;
      this.documentListeners.add(EventName.Click, stopPropagation, {
        capture: true,
      });
      this.removeTextSelection();
      this.documentListeners.add(
        EventName.SelectionChange,
        this.removeTextSelection
      );
      setPointerPositionFromEvent(this.props.event);
      onStart(this.initialCoordinates);
    }
  };

  private readonly handleMove = (event: Event) => {
    const { activated, initialCoordinates } = this;
    const {
      onMove,
      options: { activationConstraint },
    } = this.props;

    if (!initialCoordinates) {
      return;
    }

    const coordinates = getEventCoordinates(event);
    setPointerPosition(coordinates);
    setPointerEvent(event);

    const resolvedCoordinates = coordinates ?? defaultCoordinates;
    const delta = subtract(initialCoordinates, resolvedCoordinates);

    if (!activated && activationConstraint) {
      if ("distance" in activationConstraint) {
        if (
          activationConstraint.tolerance != null &&
          hasExceededDistance(delta, activationConstraint.tolerance)
        ) {
          return this.handleCancel();
        }

        if (hasExceededDistance(delta, activationConstraint.distance)) {
          return this.handleStart();
        }
      }

      if (
        "delay" in activationConstraint &&
        hasExceededDistance(delta, activationConstraint.tolerance)
      ) {
        return this.handleCancel();
      }

      this.handlePending(activationConstraint, delta);
      return;
    }

    if (event.cancelable) {
      event.preventDefault();
    }

    onMove(resolvedCoordinates);
  };

  private readonly handleEnd = () => {
    const { onAbort, onEnd } = this.props;
    this.detach();

    if (!this.activated) {
      onAbort(this.props.active);
    }

    clearPointerPosition();
    onEnd();
  };

  private readonly handleCancel = () => {
    const { onAbort, onCancel } = this.props;
    this.detach();

    if (!this.activated) {
      onAbort(this.props.active);
    }

    clearPointerPosition();
    onCancel();
  };

  private readonly handleKeydown = (event: KeyboardEvent) => {
    if (event.code === KeyboardCode.Esc) {
      this.handleCancel();
    }
  };

  private readonly removeTextSelection = () => {
    this.document.getSelection()?.removeAllRanges();
  };
}

const mouseEvents: PointerEventHandlers = {
  move: { name: "mousemove" },
  end: { name: "mouseup" },
};

const touchEvents: PointerEventHandlers = {
  cancel: { name: "touchcancel" },
  move: { name: "touchmove" },
  end: { name: "touchend" },
};

export class TrackedMouseSensor extends TrackedPointerSensor {
  constructor(props: TrackedPointerSensorProps) {
    super(props, mouseEvents, getOwnerDocument(props.event.target));
  }

  static activators = [
    {
      eventName: "onMouseDown" as const,
      handler: (
        { nativeEvent: event }: ReactMouseEvent,
        { onActivation }: TrackedPointerSensorOptions
      ) => {
        if (event.button === 2) {
          return false;
        }
        onActivation?.({ event });
        return true;
      },
    },
  ];
}

export class TrackedTouchSensor extends TrackedPointerSensor {
  constructor(props: TrackedPointerSensorProps) {
    super(props, touchEvents);
  }

  static setup() {
    window.addEventListener(touchEvents.move.name, noop, {
      capture: false,
      passive: false,
    });
    return () => {
      window.removeEventListener(touchEvents.move.name, noop);
    };

    function noop() {}
  }

  static activators = [
    {
      eventName: "onTouchStart" as const,
      handler: (
        { nativeEvent: event }: ReactTouchEvent,
        { onActivation }: TrackedPointerSensorOptions
      ) => {
        const { touches } = event;
        if (touches.length > 1) {
          return false;
        }
        onActivation?.({ event });
        return true;
      },
    },
  ];
}
