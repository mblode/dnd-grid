import { z } from "zod";
import type { Layout } from "./types";

const resizeHandleAxisSchema = z.enum([
  "s",
  "w",
  "e",
  "n",
  "sw",
  "nw",
  "se",
  "ne",
]);

const layoutConstraintSchema = z
  .object({
    name: z.string(),
    constrainPosition: z.unknown().optional(),
    constrainSize: z.unknown().optional(),
  })
  .passthrough();

export const layoutItemSchema = z
  .object({
    w: z.number().finite().positive(),
    h: z.number().finite().positive(),
    x: z.number().finite(),
    y: z.number().finite(),
    i: z.string().min(1),
    data: z.unknown().optional(),
    minW: z.number().optional(),
    minH: z.number().optional(),
    maxW: z.number().optional(),
    maxH: z.number().optional(),
    constraints: z.array(layoutConstraintSchema).optional(),
    moved: z.boolean().optional(),
    static: z.boolean().optional(),
    isDraggable: z.boolean().nullable().optional(),
    isResizable: z.boolean().nullable().optional(),
    resizeHandles: z.array(resizeHandleAxisSchema).optional(),
    isBounded: z.boolean().nullable().optional(),
  })
  .passthrough();

export const layoutSchema = z
  .array(layoutItemSchema)
  .superRefine((items, ctx) => {
    const seen = new Set<string>();
    items.forEach((item, index) => {
      if (seen.has(item.i)) {
        ctx.addIssue({
          code: "custom",
          message: "Duplicate layout item id",
          path: [index, "i"],
        });
        return;
      }
      seen.add(item.i);
    });
  });

export const validateLayout = <TData = unknown>(
  layout: unknown,
): Layout<TData> => layoutSchema.parse(layout) as Layout<TData>;
