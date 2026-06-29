import type { ComponentType } from "react";
import { AllowOverlapExample } from "./dnd-grid-allow-overlap-example";
import { AspectRatioConstraintsExample } from "./dnd-grid-aspect-ratio-constraints-example";
import { BasicExample } from "./dnd-grid-basic-example";
import { BoundedExample } from "./dnd-grid-bounded-example";
import { CompactorShowcaseExample } from "./dnd-grid-compactor-showcase-example";
import { CompositionExample } from "./dnd-grid-composition-example";
import { ConstraintsExample } from "./dnd-grid-constraints-example";
import { DragFromOutsideExample } from "./dnd-grid-drag-from-outside-example";
import { DynamicAddRemoveExample } from "./dnd-grid-dynamic-add-remove-example";
import { HeadlessExample } from "./dnd-grid-headless-example";
import { KitchenSinkExample } from "./dnd-grid-kitchen-sink-example";
import { LocalStorageExample } from "./dnd-grid-localstorage-example";
import { MultipleInstancesExample } from "./dnd-grid-multiple-instances-example";
import { PortalExample } from "./dnd-grid-portal-example";
import { ResizableHandlesExample } from "./dnd-grid-resizable-handles-example";
import { ResponsiveExample } from "./dnd-grid-responsive-example";
import { ScaleExample } from "./dnd-grid-scale-example";
import { StaticElementsExample } from "./dnd-grid-static-elements-example";
import { ToolboxExample } from "./dnd-grid-toolbox-example";

export interface ExampleEntry {
  slug: string;
  title: string;
  description: string;
  Component: ComponentType;
}

export const examples: ExampleEntry[] = [
  {
    slug: "allow-overlap-example",
    title: "Allow overlap",
    description:
      "Let grid items stack on top of each other without collision, so cards can overlap freely while you drag and resize them in this dnd-grid React example.",
    Component: AllowOverlapExample,
  },
  {
    slug: "aspect-ratio-constraints-example",
    title: "Aspect ratio constraints",
    description:
      "Lock item resizing to a fixed aspect ratio so cards keep their proportions while you drag the resize handles in this dnd-grid React layout example.",
    Component: AspectRatioConstraintsExample,
  },
  {
    slug: "basic-example",
    title: "Basic example",
    description:
      "A simple draggable and resizable grid layout for React showing the core dnd-grid setup with movable, resizable items and live layout change handling.",
    Component: BasicExample,
  },
  {
    slug: "bounded-example",
    title: "Bounded",
    description:
      "Keep grid items inside the grid bounds so they cannot be dragged or resized outside the container in this bounded dnd-grid React layout example.",
    Component: BoundedExample,
  },
  {
    slug: "compactor-showcase-example",
    title: "Compactor showcase",
    description:
      "Switch between vertical, horizontal, and no compaction to see how dnd-grid repositions items and fills empty space as you drag them around the grid.",
    Component: CompactorShowcaseExample,
  },
  {
    slug: "composition-example",
    title: "Composition",
    description:
      "Items read their own drag and resize state with useDndGridItemState to render state-aware content inside each cell in this dnd-grid React composition example.",
    Component: CompositionExample,
  },
  {
    slug: "constraints-example",
    title: "Constraints",
    description:
      "Plug in custom constraints and rules to control where items can move and how far they can resize in this constraint-driven dnd-grid React layout example.",
    Component: ConstraintsExample,
  },
  {
    slug: "drag-from-outside-example",
    title: "Drag from outside",
    description:
      "Drag external items from a palette and drop them into the grid to create new blocks on the fly in this drag-from-outside dnd-grid React example.",
    Component: DragFromOutsideExample,
  },
  {
    slug: "dynamic-add-remove-example",
    title: "Dynamic add/remove",
    description:
      "Add and remove grid items at runtime and watch the layout compact and reflow automatically in this dynamic add and remove dnd-grid React grid example.",
    Component: DynamicAddRemoveExample,
  },
  {
    slug: "headless-example",
    title: "Headless wrapper",
    description:
      "Build a fully custom grid wrapper with the headless useDndGrid hook while dnd-grid handles drag, resize, and layout maths under the hood in React.",
    Component: HeadlessExample,
  },
  {
    slug: "kitchen-sink-example",
    title: "Kitchen sink",
    description:
      "A full-featured layout builder with external drag, multi-select, an action bar, and an edit panel, showing everything dnd-grid can do in one React example.",
    Component: KitchenSinkExample,
  },
  {
    slug: "localstorage-example",
    title: "Local storage",
    description:
      "Persist the grid layout to local storage and restore it on reload so user arrangements survive page refreshes in this dnd-grid React persistence example.",
    Component: LocalStorageExample,
  },
  {
    slug: "multiple-instances-example",
    title: "Multiple instances",
    description:
      "Run two independent dnd-grid instances on a single page, each with its own draggable and resizable layout state, in this multiple-instances React example.",
    Component: MultipleInstancesExample,
  },
  {
    slug: "portal-example",
    title: "Portal",
    description:
      "Render the grid through createPortal into a separate DOM container while keeping drag and resize behaviour intact in this dnd-grid React portal example.",
    Component: PortalExample,
  },
  {
    slug: "resizable-handles-example",
    title: "Resizable handles",
    description:
      "Resize grid items from all eight edges and corners using the built-in resize handles in this resizable-handles dnd-grid React layout example.",
    Component: ResizableHandlesExample,
  },
  {
    slug: "responsive-example",
    title: "Responsive layout",
    description:
      "Define breakpoint-specific layouts that adapt to the container width so the grid reflows responsively across screen sizes in this dnd-grid React example.",
    Component: ResponsiveExample,
  },
  {
    slug: "scale-example",
    title: "Scale",
    description:
      "Keep drag and resize maths correct when the grid is visually scaled with CSS transforms in this scale-aware dnd-grid React grid layout example.",
    Component: ScaleExample,
  },
  {
    slug: "static-elements-example",
    title: "Static items",
    description:
      "Mark items as static so they cannot be moved or resized while other items drag and reflow around them in this static-items dnd-grid React example.",
    Component: StaticElementsExample,
  },
  {
    slug: "toolbox-example",
    title: "Toolbox",
    description:
      "Move items between the grid and a separate toolbox panel, dragging blocks in and out of an off-grid tray in this toolbox dnd-grid React example.",
    Component: ToolboxExample,
  },
];

export const examplesBySlug = Object.fromEntries(
  examples.map((example) => [example.slug, example])
) as Record<string, ExampleEntry>;
