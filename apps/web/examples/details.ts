export interface ExampleDetail {
  /** Prose rendered under the demo. Each string is one paragraph. */
  body: string[];
  /** Slugs of examples worth reading next. */
  related: string[];
}

export const exampleDetails: Record<string, ExampleDetail> = {
  "allow-overlap-example": {
    body: [
      "Compaction is what stops two grid items occupying the same cell. Swapping the compactor changes that rule: this example toggles between verticalCompactor, which pulls items upward and pushes colliding neighbours out of the way, and verticalOverlapCompactor, which lets items sit on top of one another.",
      "Overlap is useful for canvas-style surfaces where the user is arranging free-floating cards rather than filling a dense dashboard. Because the compactor is just a function passed to the compactor prop, you can flip it at runtime — as the toggle here does — or supply your own to encode a different packing rule.",
    ],
    related: [
      "compactor-showcase-example",
      "static-elements-example",
      "constraints-example",
      "basic-example",
    ],
  },
  "aspect-ratio-constraints-example": {
    body: [
      "Constraints run on every resize and can rewrite the proposed geometry before it is committed. This example derives the pixel width of one column from useContainerWidth, then forces each item's height to track its width so cards keep a fixed aspect ratio no matter which handle is dragged.",
      "Because the ratio is computed from the live container width, gap, and containerPadding, it stays correct when the grid is resized rather than only at first paint. Reach for this when the content inside a cell has an intrinsic shape — video embeds, image tiles, or map panes.",
    ],
    related: [
      "constraints-example",
      "resizable-handles-example",
      "responsive-example",
      "scale-example",
    ],
  },
  "basic-example": {
    body: [
      "The smallest useful dnd-grid setup: a layout array of items with id, x, y, w, and h, a column count, a row height, and an onLayoutChange handler. The grid is controlled, so the layout you pass in is the layout that renders, and every drag or resize hands you a new array to store.",
      "Each child is matched to a layout entry by its key, which means you render your own markup inside every cell and dnd-grid only positions it. Start here, then add the behaviour you need from the other examples.",
    ],
    related: [
      "responsive-example",
      "dynamic-add-remove-example",
      "localstorage-example",
      "bounded-example",
    ],
  },
  "bounded-example": {
    body: [
      "By default an item can be dragged past the top or left edge of its container while a drag is in flight. Setting the bounded prop clamps movement so items stay fully inside the grid for the whole gesture, not just when the drag is released.",
      "This matters most when the grid is the whole page surface and there is no scroll region to absorb an overshoot. Combine it with constraints when you need a stricter rule than the container edges.",
    ],
    related: [
      "constraints-example",
      "basic-example",
      "static-elements-example",
      "scale-example",
    ],
  },
  "compactor-showcase-example": {
    body: [
      "A compactor decides where items settle once a drag ends. This example switches between vertical compaction, which pulls everything toward the top, horizontal compaction, which pulls toward the left, and no compaction at all, which leaves items exactly where they were dropped.",
      "Vertical is the right default for feeds and dashboards where gaps look like bugs. Horizontal suits toolbars and timelines. No compaction suits freeform boards. Because the compactor is a prop, you can expose the choice to users as this demo does.",
    ],
    related: [
      "allow-overlap-example",
      "constraints-example",
      "basic-example",
      "toolbox-example",
    ],
  },
  "composition-example": {
    body: [
      "Grid items often need to know whether they are currently being dragged or resized so they can dim, show a handle, or swap in a live readout. The useDndGridItemState hook gives a child access to its own item and interaction state without threading props down from the grid.",
      "The cells here render their coordinates while dragging and a label the rest of the time. Because the hook reads from context, the component can sit at any depth inside the cell, which keeps the grid free of render-prop plumbing.",
    ],
    related: [
      "headless-example",
      "kitchen-sink-example",
      "basic-example",
      "portal-example",
    ],
  },
  "constraints-example": {
    body: [
      "Constraints are functions that inspect a proposed layout change and return a corrected one. They run for both drags and resizes, so a single rule can keep an item out of a reserved region, pin it to a column, or cap how large it may grow.",
      "This example reserves a band at the top of the grid that items cannot enter. Constraints compose — pass an array and each is applied in turn — which lets you build a complex policy out of small, individually testable rules.",
    ],
    related: [
      "aspect-ratio-constraints-example",
      "bounded-example",
      "static-elements-example",
      "compactor-showcase-example",
    ],
  },
  "drag-from-outside-example": {
    body: [
      "Items do not have to originate inside the grid. This example makes an external palette draggable with the native HTML drag and drop API, then uses onDropDragOver to preview the incoming item's size and onDrop to commit it at the cell the pointer is over.",
      "onDropDragOver returns the width and height the placeholder should take, so the grid can reflow underneath the cursor before the user commits. That preview is what makes an external drop feel like part of the grid rather than an append.",
    ],
    related: [
      "toolbox-example",
      "kitchen-sink-example",
      "dynamic-add-remove-example",
      "basic-example",
    ],
  },
  "dynamic-add-remove-example": {
    body: [
      "Adding and removing items is a matter of updating the layout array; the grid reconciles children by key and the compactor closes any gap a removal leaves behind. This example appends items at the first free position and removes them from a control inside each cell.",
      "The dragCancel prop is what makes the remove button usable: it marks a selector that should never start a drag, so clicking the button does not also pick the card up. Any interactive control inside a cell needs the same treatment.",
    ],
    related: [
      "toolbox-example",
      "localstorage-example",
      "basic-example",
      "kitchen-sink-example",
    ],
  },
  "headless-example": {
    body: [
      "useDndGrid exposes the layout engine without any of the rendering. You get the computed positions and the drag and resize handlers, and you decide what the container and cells actually are — useful when the grid has to be a list, a table, or a custom element.",
      "This example pairs it with useContainerWidth to measure the available space, then positions plain divs itself. Everything the DndGrid component does is built on this hook, so nothing is lost by dropping down a level.",
    ],
    related: [
      "composition-example",
      "kitchen-sink-example",
      "basic-example",
      "responsive-example",
    ],
  },
  "kitchen-sink-example": {
    body: [
      "A full layout builder that combines most of the library at once: an external palette wired up with dnd-kit sensors, multi-select, an action bar, an edit panel bound to the selected item, custom resize handles, and the full set of drag lifecycle callbacks.",
      "It is deliberately larger than the focused examples and is worth reading after them rather than first. Treat it as a reference for how the pieces interact — particularly how selection state, dragCancel, and the onDrag callbacks coexist without fighting each other.",
    ],
    related: [
      "drag-from-outside-example",
      "toolbox-example",
      "composition-example",
      "resizable-handles-example",
    ],
  },
  "localstorage-example": {
    body: [
      "Because the grid is controlled, persistence is entirely yours to arrange: serialise the layout you receive from onLayoutChange and hydrate from storage on mount. This example reads and writes localStorage so an arrangement survives a reload.",
      "The one thing to watch is hydration. Reading storage during the first render diverges from what the server produced, so the read happens in an effect and the stored layout is applied afterwards. The SSR guide covers the same problem in more detail.",
    ],
    related: [
      "basic-example",
      "dynamic-add-remove-example",
      "responsive-example",
      "multiple-instances-example",
    ],
  },
  "multiple-instances-example": {
    body: [
      "Two grids on one page, each owning its own layout state and its own compaction. Nothing is shared through a global, so instances do not interfere with one another and an item dragged in one grid has no effect on the other.",
      "This is the pattern for dashboards split into sections, or for a settings screen where each panel is independently arrangeable. If you do want items to move between grids, look at the toolbox example instead.",
    ],
    related: [
      "toolbox-example",
      "basic-example",
      "portal-example",
      "responsive-example",
    ],
  },
  "portal-example": {
    body: [
      "The grid measures its own container, so rendering it through createPortal into a different part of the DOM works as long as that container exists before the grid mounts. This example portals the whole grid into a separate bordered region.",
      "Portals are how you keep a grid inside a modal, a drawer, or a resizable split pane without moving it in the React tree. The mounted flag here avoids rendering the portal during the server pass, when the target ref is still null.",
    ],
    related: [
      "multiple-instances-example",
      "composition-example",
      "scale-example",
      "basic-example",
    ],
  },
  "resizable-handles-example": {
    body: [
      "The resizeHandles prop controls which edges and corners an item can be resized from. The default is the bottom-right corner; this example enables all eight, so items can be grown from any side.",
      "More handles means a larger hit area competing with the drag surface, so it suits sparse grids with big cells more than dense ones. Handles are styled through the library stylesheet, which you can override to match your own design system.",
    ],
    related: [
      "aspect-ratio-constraints-example",
      "constraints-example",
      "kitchen-sink-example",
      "basic-example",
    ],
  },
  "responsive-example": {
    body: [
      "ResponsiveDndGrid takes a layouts object keyed by breakpoint instead of a single layout array, and picks the right one from the measured container width. Because it measures the container rather than the viewport, a grid inside a sidebar breaks at the sidebar's width.",
      "Each breakpoint keeps its own arrangement, so rearranging on a narrow screen does not disturb the desktop layout. If you need the breakpoint value in your own code, useDndGridResponsiveLayout exposes the same resolution logic.",
    ],
    related: [
      "basic-example",
      "aspect-ratio-constraints-example",
      "headless-example",
      "localstorage-example",
    ],
  },
  "scale-example": {
    body: [
      "When a grid sits inside a CSS transform, pointer coordinates no longer match layout coordinates and drags drift away from the cursor. The transformScale prop tells the grid what factor to divide by so the maths lines up again.",
      "Set it to the same scale you applied in CSS. This comes up in zoomable canvases, presentation surfaces, and thumbnail previews of a larger board — anywhere the grid is rendered at something other than its natural size.",
    ],
    related: [
      "portal-example",
      "bounded-example",
      "basic-example",
      "responsive-example",
    ],
  },
  "static-elements-example": {
    body: [
      "Marking a layout item static: true makes it immovable and unresizable, and other items compact around it rather than through it. The pinned cards in this example stay put no matter how the rest of the grid is rearranged.",
      "Use it for headers, summary tiles, or anything that should hold its position while the user arranges everything else. Static items still participate in collision, so they act as fixed obstacles rather than disappearing from the layout.",
    ],
    related: [
      "constraints-example",
      "bounded-example",
      "compactor-showcase-example",
      "dynamic-add-remove-example",
    ],
  },
  "toolbox-example": {
    body: [
      "A holding area beside the grid that items can be moved into and back out of. Sending an item to the toolbox removes it from the layout array and records it separately; restoring it puts an entry back and lets the compactor find it a home.",
      "This keeps the grid itself simple — there is no second drag surface to coordinate, just two pieces of state and a pair of buttons. For a version where items are dragged between the two rather than clicked, see the drag from outside example.",
    ],
    related: [
      "drag-from-outside-example",
      "dynamic-add-remove-example",
      "multiple-instances-example",
      "kitchen-sink-example",
    ],
  },
};
