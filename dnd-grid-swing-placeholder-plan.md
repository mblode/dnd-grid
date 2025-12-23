# DndGrid Swing + Placeholder Investigation Plan

## Brainstorm (Best-Practice Approaches)
- Keep drag physics isolated from layout state; only feed layout with derived x/y.
- Derive placeholder position from post-move layout state (single source of truth).
- Guard spring loop with explicit drag lifecycle flags; avoid hidden early exits.
- Normalize pointer coordinates once (scale + scroll) and use the same basis for drag + placeholder math.
- Prefer tests that assert pixel/grid alignment and that springs keep updating while dragging.

## Phase 0: Repro + Observability
- [ ] Capture exact repro steps (input type, scale, scroll, constraints, compactor).
- [ ] Add temporary debug hooks/logs for drag lifecycle and spring state.
- [ ] Identify the minimal example (apps/web or a focused test harness).

## Phase 1: Diagnose Swing Stoppage
- [x] Trace drag lifecycle flags (`isDraggingRef`, `dragPositionRef`) across start/drag/stop.
- [ ] Validate velocity sampling (history size, pointer coordinates, time deltas).
- [x] Confirm animation loop continuity while dragging (RAF scheduling + stop conditions).

## Phase 2: Diagnose Placeholder Drift
- [x] Compare placeholder coordinates before/after `moveElement`.
- [x] Verify droppable placeholder math (scale + scroll offsets).
- [x] Reconcile placeholder state while settling (drag stop path).

## Phase 3: Implement Fixes + Tests
- [x] Fix placeholder position source of truth (post-move layout item).
- [x] Normalize drop coordinates for scale/scroll where needed.
- [x] Add regression tests for placeholder alignment and swing continuity.

## Phase 4: Validate + Document
- [x] Run `npm run test --workspace=@dnd-grid/react`.
- [ ] Smoke test examples in `apps/web`.
- [ ] Update docs or release notes if behavior changes.
