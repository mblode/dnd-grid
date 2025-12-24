import type { ComponentType } from "react";
import { AllowOverlapExample } from "./dnd-grid-allow-overlap-example";
import { AspectRatioConstraintsExample } from "./dnd-grid-aspect-ratio-constraints-example";
import { BasicExample } from "./dnd-grid-basic-example";
import { BoundedExample } from "./dnd-grid-bounded-example";
import { CompactorShowcaseExample } from "./dnd-grid-compactor-showcase-example";
import { ConstraintsExample } from "./dnd-grid-constraints-example";
import { DragFromOutsideExample } from "./dnd-grid-drag-from-outside-example";
import { DynamicAddRemoveExample } from "./dnd-grid-dynamic-add-remove-example";
import { HeadlessExample } from "./dnd-grid-headless-example";
import { KitchenSinkExample } from "./dnd-grid-kitchen-sink-example";
import { LocalStorageExample } from "./dnd-grid-localstorage-example";
import { ResizableHandlesExample } from "./dnd-grid-resizable-handles-example";
import { ResponsiveExample } from "./dnd-grid-responsive-example";
import { ScaleExample } from "./dnd-grid-scale-example";
import { StaticElementsExample } from "./dnd-grid-static-elements-example";
import { ToolboxExample } from "./dnd-grid-toolbox-example";

export type ExampleEntry = {
  slug: string;
  title: string;
  description: string;
  Component: ComponentType;
};

export const examples: ExampleEntry[] = [
  {
    slug: "allow-overlap-example",
    title: "Allow overlap",
    description: "Let items stack without collision.",
    Component: AllowOverlapExample,
  },
  {
    slug: "aspect-ratio-constraints-example",
    title: "Aspect ratio constraints",
    description: "Lock item resizing to a ratio.",
    Component: AspectRatioConstraintsExample,
  },
  {
    slug: "basic-example",
    title: "Basic example",
    description: "Simple draggable and resizable grid.",
    Component: BasicExample,
  },
  {
    slug: "bounded-example",
    title: "Bounded",
    description: "Keep items within grid bounds.",
    Component: BoundedExample,
  },
  {
    slug: "compactor-showcase-example",
    title: "Compactor showcase",
    description: "Switch between vertical, horizontal, wrap, and none.",
    Component: CompactorShowcaseExample,
  },
  {
    slug: "constraints-example",
    title: "Constraints",
    description: "Plug in constraints and custom rules.",
    Component: ConstraintsExample,
  },
  {
    slug: "drag-from-outside-example",
    title: "Drag from outside",
    description: "Drop external items into the grid.",
    Component: DragFromOutsideExample,
  },
  {
    slug: "dynamic-add-remove-example",
    title: "Dynamic add/remove",
    description: "Add and remove items at runtime.",
    Component: DynamicAddRemoveExample,
  },
  {
    slug: "headless-example",
    title: "Headless wrapper",
    description: "Build a custom wrapper with useDndGrid.",
    Component: HeadlessExample,
  },
  {
    slug: "kitchen-sink-example",
    title: "Kitchen sink",
    description:
      "A full-featured builder with external drag, selection, action bar, and edit panel.",
    Component: KitchenSinkExample,
  },
  {
    slug: "localstorage-example",
    title: "Local storage",
    description: "Persist layout to local storage and restore on load.",
    Component: LocalStorageExample,
  },
  {
    slug: "resizable-handles-example",
    title: "Resizable handles",
    description: "Items can be resized from all eight directions.",
    Component: ResizableHandlesExample,
  },
  {
    slug: "responsive-example",
    title: "Responsive layout",
    description: "Breakpoint layouts based on container width.",
    Component: ResponsiveExample,
  },
  {
    slug: "scale-example",
    title: "Scale",
    description: "Keep drag math correct when scaling the grid.",
    Component: ScaleExample,
  },
  {
    slug: "static-elements-example",
    title: "Static items",
    description: "Static items cannot be moved or resized.",
    Component: StaticElementsExample,
  },
  {
    slug: "toolbox-example",
    title: "Toolbox",
    description: "Move items between the grid and toolbox.",
    Component: ToolboxExample,
  },
];

export const examplesBySlug = Object.fromEntries(
  examples.map((example) => [example.slug, example]),
) as Record<string, ExampleEntry>;
