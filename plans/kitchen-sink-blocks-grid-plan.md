# Blocks Grid Shared Inner Plan

## Goals
- Use the same block inner for the palette list, grid items, and drag overlay.
- Render block-specific previews via a block switch per kind/type.
- Match drag overlay dimensions to the grid item size at the current scale.

## Brainstorm (best practices)
- Extract a single preview component (frame + inner) and reuse it in the palette list, grid items, and overlay.
- Keep the per-kind rendering in a small `BlockSwitch` function so future blocks add a single case.
- Compute preview height/width from the same row height, gap, and column math used by the grid.
- Pass the grid scale CSS variable to the drag overlay so spacing and radius match when scaled.
- Keep the Add button outside the draggable preview to avoid nested button/pointer conflicts.

## Implementation Steps
1. Add `kind` and descriptions to palette data and flow `kind` into grid items on add/duplicate.
2. Create `BlockSwitch` + `BlockCard` in `apps/web/components/blocks-grid.tsx` for shared inner rendering.
3. Refactor the palette list and grid items to render the shared `BlockCard` and header actions.
4. Compute preview sizes from grid measurements and use them for drag overlay sizing.
5. Manually verify add/drag/resize/selection behaviors and visual parity between list and grid.

## Acceptance Checks
- Palette list previews and grid items share the same inner layout per block kind.
- Drag overlay size matches the grid item size for each block dimension.
- Selection, action bar, and edit panel still work as before.
