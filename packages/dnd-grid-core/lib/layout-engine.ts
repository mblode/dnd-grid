import { z } from "zod";
import { resolveCompactor } from "./compactors";
import {
  applyPositionConstraints,
  applySizeConstraints,
  resolveConstraints,
} from "./constraints";
import type {
  Compactor,
  ConstraintContext,
  Layout,
  LayoutConstraint,
  LayoutItem,
  ResizeHandleAxis,
  SpacingArray,
} from "./types";
import {
  cloneLayout,
  correctBounds,
  getAllCollisions,
  getLayoutItem,
  moveElement,
  withLayoutItem,
} from "./utils";

export interface LayoutState<TData = unknown> {
  layout: Layout<TData>;
}

export type LayoutStateUpdater<TData = unknown> =
  | LayoutState<TData>
  | ((prev: LayoutState<TData>) => LayoutState<TData>);

export interface LayoutEngineOptions<TData = unknown> {
  cols: number;
  maxRows: number;
  rowHeight: number;
  gap: SpacingArray;
  containerPadding: SpacingArray;
  containerWidth: number;
  containerHeight: number;
  compactor?: Compactor<TData>;
  constraints?: LayoutConstraint<TData>[];
  state?: LayoutState<TData>;
  onStateChange?: (updater: LayoutStateUpdater<TData>) => void;
  plugins?: LayoutEnginePlugin<TData>[];
  validation?: boolean;
}

export type LayoutCommand<TData = unknown> =
  | { type: "move"; id: string; x: number; y: number; isUserAction?: boolean }
  | {
      type: "resize";
      id: string;
      w: number;
      h: number;
      handle?: ResizeHandleAxis;
    }
  | { type: "compact"; cols?: number; compactor?: Compactor<TData> }
  | {
      type: "resolveCollisions";
      id: string;
      x: number;
      y: number;
      isUserAction?: boolean;
    }
  | { type: "reflow"; layout?: Layout<TData> };

export interface LayoutEngine<TData = unknown> {
  getState: () => LayoutState<TData>;
  setState: (updater: LayoutStateUpdater<TData>) => LayoutState<TData>;
  setOptions: (
    updater:
      | LayoutEngineOptions<TData>
      | ((prev: LayoutEngineOptions<TData>) => LayoutEngineOptions<TData>)
  ) => LayoutEngineOptions<TData>;
  subscribe: (listener: (state: LayoutState<TData>) => void) => () => void;
  commands: {
    move: (
      cmd: Extract<LayoutCommand<TData>, { type: "move" }>
    ) => LayoutState<TData>;
    resize: (
      cmd: Extract<LayoutCommand<TData>, { type: "resize" }>
    ) => LayoutState<TData>;
    compact: (
      cmd?: Extract<LayoutCommand<TData>, { type: "compact" }>
    ) => LayoutState<TData>;
    resolveCollisions: (
      cmd: Extract<LayoutCommand<TData>, { type: "resolveCollisions" }>
    ) => LayoutState<TData>;
    reflow: (
      cmd?: Extract<LayoutCommand<TData>, { type: "reflow" }>
    ) => LayoutState<TData>;
  };
  selectors: {
    getLayout: () => Layout<TData>;
    getItem: (id: string) => LayoutItem<TData> | undefined;
  };
}

export interface LayoutEnginePluginContext<TData = unknown> {
  state: Readonly<LayoutState<TData>>;
  options: Readonly<LayoutEngineOptions<TData>>;
}

export interface LayoutEnginePlugin<TData = unknown> {
  name: string;
  onInit?: (engine: LayoutEngine<TData>) => void;
  onCommand?: (
    command: LayoutCommand<TData>,
    context: LayoutEnginePluginContext<TData>
  ) => void;
  onStateChange?: (
    nextState: LayoutState<TData>,
    prevState: LayoutState<TData>,
    context: LayoutEnginePluginContext<TData>
  ) => void;
  onOptionsChange?: (
    nextOptions: LayoutEngineOptions<TData>,
    prevOptions: LayoutEngineOptions<TData>,
    context: LayoutEnginePluginContext<TData>
  ) => void;
}

type ResolvedLayoutEngineOptions<TData = unknown> = Omit<
  LayoutEngineOptions<TData>,
  "compactor" | "constraints" | "plugins"
> & {
  compactor: Compactor<TData>;
  constraints: LayoutConstraint<TData>[];
  plugins: LayoutEnginePlugin<TData>[];
};

const spacingArraySchema = z.tuple([
  z.number(),
  z.number(),
  z.number(),
  z.number(),
]);

const layoutItemSchema = z
  .object({
    id: z.string(),
    x: z.number(),
    y: z.number(),
    w: z.number(),
    h: z.number(),
  })
  .passthrough();

const layoutSchema = z.array(layoutItemSchema);

const layoutStateSchema = z
  .object({
    layout: layoutSchema,
  })
  .passthrough();

const layoutEngineOptionsSchema = z
  .object({
    cols: z.number().int().nonnegative(),
    maxRows: z.number().int().nonnegative(),
    rowHeight: z.number().nonnegative(),
    gap: spacingArraySchema,
    containerPadding: spacingArraySchema,
    containerWidth: z.number().nonnegative(),
    containerHeight: z.number().nonnegative(),
    compactor: z.custom<Compactor>().optional(),
    constraints: z.array(z.custom<LayoutConstraint>()).optional(),
    state: layoutStateSchema.optional(),
    onStateChange: z.custom<LayoutEngineOptions["onStateChange"]>().optional(),
    plugins: z.array(z.custom<LayoutEnginePlugin>()).optional(),
    validation: z.boolean().optional(),
  })
  .passthrough();

const moveCommandSchema = z.object({
  type: z.literal("move"),
  id: z.string(),
  x: z.number(),
  y: z.number(),
  isUserAction: z.boolean().optional(),
});

const resizeCommandSchema = z.object({
  type: z.literal("resize"),
  id: z.string(),
  w: z.number(),
  h: z.number(),
  handle: z.custom<ResizeHandleAxis>().optional(),
});

const compactCommandSchema = z.object({
  type: z.literal("compact"),
  cols: z.number().int().nonnegative().optional(),
  compactor: z.custom<Compactor>().optional(),
});

const resolveCollisionsCommandSchema = z.object({
  type: z.literal("resolveCollisions"),
  id: z.string(),
  x: z.number(),
  y: z.number(),
  isUserAction: z.boolean().optional(),
});

const reflowCommandSchema = z.object({
  type: z.literal("reflow"),
  layout: layoutSchema.optional(),
});

const formatZodError = (error: z.ZodError): string => {
  return error.issues
    .map((issue) => {
      const path = issue.path.join(".") || "root";
      return `${path}: ${issue.message}`;
    })
    .join("; ");
};

const getNodeEnv = (): string | undefined => {
  if (typeof globalThis === "undefined") {
    return undefined;
  }
  const globalProcess = (
    globalThis as { process?: { env?: { NODE_ENV?: string } } }
  ).process;
  return globalProcess?.env?.NODE_ENV;
};

const isValidationEnabled = <TData>(
  options: LayoutEngineOptions<TData>
): boolean => {
  if (typeof options.validation === "boolean") {
    return options.validation;
  }
  return getNodeEnv() !== "production";
};

const maybeValidate = (
  enabled: boolean,
  schema: z.ZodTypeAny,
  value: unknown,
  label: string
) => {
  if (!enabled) {
    return;
  }
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new Error(
      `${label} validation failed: ${formatZodError(result.error)}`
    );
  }
};

const resolveOptions = <TData>(
  options: LayoutEngineOptions<TData>
): ResolvedLayoutEngineOptions<TData> => ({
  ...options,
  compactor: resolveCompactor(options.compactor),
  constraints: resolveConstraints(options.constraints),
  plugins: (options.plugins ?? []) as LayoutEnginePlugin<TData>[],
});

const createConstraintContext = <TData>(
  options: ResolvedLayoutEngineOptions<TData>,
  layout: Layout<TData>
): ConstraintContext<TData> => ({
  cols: options.cols,
  maxRows: options.maxRows,
  containerWidth: options.containerWidth,
  containerHeight: options.containerHeight,
  rowHeight: options.rowHeight,
  gap: options.gap,
  containerPadding: options.containerPadding,
  layout,
});

const applyUpdater = <T>(updater: T | ((prev: T) => T), prev: T): T =>
  typeof updater === "function" ? (updater as (prev: T) => T)(prev) : updater;

export const createLayoutEngine = <TData = unknown>(
  options: LayoutEngineOptions<TData>
): LayoutEngine<TData> => {
  let currentOptions = resolveOptions(options);
  let validationEnabled = isValidationEnabled(currentOptions);
  maybeValidate(
    validationEnabled,
    layoutEngineOptionsSchema,
    currentOptions,
    "LayoutEngineOptions"
  );

  let currentState: LayoutState<TData> = currentOptions.state ?? {
    layout: [],
  };

  const listeners = new Set<(state: LayoutState<TData>) => void>();
  const registeredPlugins = new Set<LayoutEnginePlugin<TData>>();
  let engine: LayoutEngine<TData>;

  const notify = (state: LayoutState<TData>) => {
    for (const listener of listeners) {
      listener(state);
    }
  };

  const getState = (): LayoutState<TData> =>
    currentOptions.state ?? currentState;

  const getPluginContext = (
    state: LayoutState<TData>
  ): LayoutEnginePluginContext<TData> => ({
    state,
    options: currentOptions,
  });

  const registerPlugins = (plugins: LayoutEnginePlugin<TData>[]) => {
    for (const plugin of registeredPlugins) {
      if (!plugins.includes(plugin)) {
        registeredPlugins.delete(plugin);
      }
    }

    for (const plugin of plugins) {
      if (!registeredPlugins.has(plugin)) {
        registeredPlugins.add(plugin);
        plugin.onInit?.(engine);
      }
    }
  };

  const notifyCommand = (command: LayoutCommand<TData>) => {
    if (currentOptions.plugins.length === 0) {
      return;
    }
    const context = getPluginContext(getState());
    for (const plugin of currentOptions.plugins) {
      plugin.onCommand?.(command, context);
    }
  };

  const notifyStateChange = (
    nextState: LayoutState<TData>,
    prevState: LayoutState<TData>
  ) => {
    if (currentOptions.plugins.length === 0) {
      return;
    }
    const context = getPluginContext(nextState);
    for (const plugin of currentOptions.plugins) {
      plugin.onStateChange?.(nextState, prevState, context);
    }
  };

  const notifyOptionsChange = (
    nextOptions: ResolvedLayoutEngineOptions<TData>,
    prevOptions: ResolvedLayoutEngineOptions<TData>
  ) => {
    if (nextOptions.plugins.length === 0) {
      return;
    }
    const context: LayoutEnginePluginContext<TData> = {
      state: getState(),
      options: nextOptions,
    };
    for (const plugin of nextOptions.plugins) {
      plugin.onOptionsChange?.(nextOptions, prevOptions, context);
    }
  };

  const setState = (updater: LayoutStateUpdater<TData>): LayoutState<TData> => {
    const prevState = getState();
    const nextState = applyUpdater(updater, prevState);
    maybeValidate(
      validationEnabled,
      layoutStateSchema,
      nextState,
      "LayoutState"
    );
    currentOptions.onStateChange?.(updater);

    if (currentOptions.state === undefined) {
      currentState = nextState;
      notify(nextState);
    }

    notifyStateChange(nextState, prevState);
    return nextState;
  };

  const setOptions = (
    updater:
      | LayoutEngineOptions<TData>
      | ((prev: LayoutEngineOptions<TData>) => LayoutEngineOptions<TData>)
  ): LayoutEngineOptions<TData> => {
    const prevOptions = currentOptions;
    const prevState = getState();
    const nextOptions = resolveOptions(applyUpdater(updater, currentOptions));
    const nextValidationEnabled = isValidationEnabled(nextOptions);
    maybeValidate(
      nextValidationEnabled,
      layoutEngineOptionsSchema,
      nextOptions,
      "LayoutEngineOptions"
    );

    currentOptions = nextOptions;
    validationEnabled = nextValidationEnabled;
    registerPlugins(currentOptions.plugins);

    if (currentOptions.state !== undefined) {
      currentState = currentOptions.state;
    }

    const nextState = getState();
    if (nextState !== prevState) {
      notify(nextState);
    }

    notifyOptionsChange(currentOptions, prevOptions);
    return currentOptions;
  };

  const commitLayout = (layout: Layout<TData>): LayoutState<TData> =>
    setState((prev) => ({ ...prev, layout }));

  const compactLayout = (
    layout: Layout<TData>,
    compactor: Compactor<TData>,
    cols: number
  ): Layout<TData> => {
    const nextLayout = cloneLayout(layout);
    return compactor.allowOverlap
      ? nextLayout
      : compactor.compact(nextLayout, cols);
  };

  const reflowLayout = (
    layout: Layout<TData>,
    compactor: Compactor<TData>,
    cols: number
  ): Layout<TData> => {
    const nextLayout = correctBounds(cloneLayout(layout), { cols });
    return compactor.allowOverlap
      ? nextLayout
      : compactor.compact(nextLayout, cols);
  };

  const commands = {
    move(cmd: Extract<LayoutCommand<TData>, { type: "move" }>) {
      maybeValidate(validationEnabled, moveCommandSchema, cmd, "MoveCommand");
      notifyCommand(cmd);
      const { compactor, constraints, cols } = currentOptions;
      const layout = cloneLayout(getState().layout);
      const item = getLayoutItem(layout, cmd.id);
      if (!item) {
        return getState();
      }

      const context = createConstraintContext(currentOptions, layout);
      const constrained = applyPositionConstraints(
        constraints,
        item,
        cmd.x,
        cmd.y,
        context
      );

      const nextLayout = moveElement(
        layout,
        item,
        constrained.x,
        constrained.y,
        cmd.isUserAction ?? true,
        compactor,
        cols
      );

      const updatedLayout = compactor.allowOverlap
        ? nextLayout
        : compactor.compact(nextLayout, cols);

      return commitLayout(updatedLayout);
    },

    resize(cmd: Extract<LayoutCommand<TData>, { type: "resize" }>) {
      maybeValidate(
        validationEnabled,
        resizeCommandSchema,
        cmd,
        "ResizeCommand"
      );
      notifyCommand(cmd);
      const { compactor, constraints, cols } = currentOptions;
      const handle = cmd.handle ?? "se";
      const layout = cloneLayout(getState().layout);
      const context = createConstraintContext(currentOptions, layout);
      let shouldMoveItem = false;
      let nextX: number | undefined;
      let nextY: number | undefined;

      const [nextLayout, item] = withLayoutItem(layout, cmd.id, (l) => {
        let nextW = cmd.w;
        let nextH = cmd.h;

        const constrainedSize = applySizeConstraints(
          constraints,
          l,
          nextW,
          nextH,
          handle,
          context
        );

        nextW = constrainedSize.w;
        nextH = constrainedSize.h;

        if (["sw", "w", "nw", "n", "ne"].includes(handle)) {
          if (["sw", "nw", "w"].includes(handle)) {
            nextX = l.x + (l.w - nextW);
            nextW = l.x !== nextX && (nextX ?? 0) < 0 ? l.w : nextW;
            nextX = (nextX ?? 0) < 0 ? 0 : nextX;
          }

          if (["ne", "n", "nw"].includes(handle)) {
            nextY = l.y + (l.h - nextH);
            nextH = l.y !== nextY && (nextY ?? 0) < 0 ? l.h : nextH;
            nextY = (nextY ?? 0) < 0 ? 0 : nextY;
          }

          shouldMoveItem = true;
        }

        if (compactor.preventCollision && !compactor.allowOverlap) {
          const collisions = getAllCollisions(layout, {
            ...l,
            w: nextW,
            h: nextH,
            x: nextX ?? l.x,
            y: nextY ?? l.y,
          }).filter((layoutItem) => layoutItem.id !== l.id);

          if (collisions.length > 0) {
            nextY = l.y;
            nextH = l.h;
            nextX = l.x;
            nextW = l.w;
            shouldMoveItem = false;
          }
        }

        l.w = nextW;
        l.h = nextH;
        return l;
      });

      if (!item) {
        return getState();
      }
      let finalLayout = nextLayout;

      if (shouldMoveItem && nextX !== undefined && nextY !== undefined) {
        finalLayout = moveElement(
          nextLayout,
          item,
          nextX,
          nextY,
          true,
          compactor,
          cols
        );
      }

      const updatedLayout = compactor.allowOverlap
        ? finalLayout
        : compactor.compact(finalLayout, cols);

      return commitLayout(updatedLayout);
    },

    compact(cmd?: Extract<LayoutCommand<TData>, { type: "compact" }>) {
      if (cmd) {
        maybeValidate(
          validationEnabled,
          compactCommandSchema,
          cmd,
          "CompactCommand"
        );
      }
      const command: LayoutCommand<TData> = cmd ?? { type: "compact" };
      notifyCommand(command);
      const compactor = cmd?.compactor ?? currentOptions.compactor;
      const cols = cmd?.cols ?? currentOptions.cols;
      const updatedLayout = compactLayout(getState().layout, compactor, cols);
      return commitLayout(updatedLayout);
    },

    resolveCollisions(
      cmd: Extract<LayoutCommand<TData>, { type: "resolveCollisions" }>
    ) {
      maybeValidate(
        validationEnabled,
        resolveCollisionsCommandSchema,
        cmd,
        "ResolveCollisionsCommand"
      );
      notifyCommand(cmd);
      const { compactor, constraints, cols } = currentOptions;
      const layout = cloneLayout(getState().layout);
      const item = getLayoutItem(layout, cmd.id);
      if (!item) {
        return getState();
      }

      const context = createConstraintContext(currentOptions, layout);
      const constrained = applyPositionConstraints(
        constraints,
        item,
        cmd.x,
        cmd.y,
        context
      );

      const nextLayout = moveElement(
        layout,
        item,
        constrained.x,
        constrained.y,
        cmd.isUserAction ?? true,
        compactor,
        cols
      );

      return commitLayout(nextLayout);
    },

    reflow(cmd?: Extract<LayoutCommand<TData>, { type: "reflow" }>) {
      if (cmd) {
        maybeValidate(
          validationEnabled,
          reflowCommandSchema,
          cmd,
          "ReflowCommand"
        );
      }
      const command: LayoutCommand<TData> = cmd ?? { type: "reflow" };
      notifyCommand(command);
      const layout = cmd?.layout ?? getState().layout;
      const updatedLayout = reflowLayout(
        layout,
        currentOptions.compactor,
        currentOptions.cols
      );
      return commitLayout(updatedLayout);
    },
  };

  engine = {
    getState,
    setState,
    setOptions,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    commands,
    selectors: {
      getLayout: () => getState().layout,
      getItem: (id: string) =>
        getLayoutItem(getState().layout, id) ?? undefined,
    },
  };

  registerPlugins(currentOptions.plugins);

  return engine;
};
