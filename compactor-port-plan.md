# Compactor Port Plan

## Context
- Issue reported in `apps/web/components/blocks-grid.tsx`: dragging a grid item cannot reach the top.
- Desired change: make `packages/dnd-grid-react/lib/compactors.ts` match
  `react-grid-layout-og/src/core/compactors.ts` line by line, adapting only
  import paths and type locations.

## Brainstorm (best-practice options)
1) Direct port of the OG compactor file.
   - Replace the current compactor implementation with the OG version, keeping
     logic order identical.
   - Export helper functions (`resolveCompactionCollision`,
     `compactItemVertical`, `compactItemHorizontal`) and factory `getCompactor`
     for parity if needed.
2) Minimal diff with algorithm-only alignment.
   - Keep current public exports, but align internal logic and variable ordering
     to the OG file.
   - Skip new exports to avoid API surface changes.
3) Compatibility improvement in app usage.
   - Update `BlocksGrid` to pass `verticalCompactor` (object), or
   - Support string-based `compactor` values by mapping to `getCompactor`.

## Proposed Implementation Steps
1) Compare `packages/dnd-grid-react/lib/compactors.ts` against
   `react-grid-layout-og/src/core/compactors.ts` and port line by line.
   - Adjust imports to local utils/types.
   - Add `CompactType` and `Mutable` types to
     `packages/dnd-grid-react/lib/types.ts` if required for parity.
   - Decide whether to export `getCompactor` and helper functions to match OG.
2) Align app usage.
   - Update `apps/web/components/blocks-grid.tsx` to pass
     `verticalCompactor` (object), or
   - Extend `resolveCompactor` to accept string compactor values using
     `getCompactor`.
3) Tests.
   - Add a regression test ensuring vertical compaction can move an item to
     y=0.
   - Optionally port a small subset of OG compactor tests for deterministic
     layouts.
4) Validation.
   - Run `npm run test --workspace=@dnd-grid/react`.
   - Manually verify BlocksGrid drag-to-top behavior in the web app.

## Open Questions
- Should `DndGrid` accept string compactor values, or should we fix
  `BlocksGrid` to pass a compactor object?
- Should `getCompactor` be exported from `@dnd-grid/react` for parity?
