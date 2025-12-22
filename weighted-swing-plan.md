# Weighted Swing Plan

## Goal
Make swing/rotation feel heavier for larger items by weighting rotation against
item size, while preserving the existing Bento-style spring feel and API.

## Brainstorm (options + tradeoffs)
- Scale rotation amplitude by size-derived inertia (simple, minimal risk).
- Adjust spring mass/damping by size (more physical, but needs config changes).
- Do both (more knobs; harder to tune).

Decision: scale rotation amplitude using a size-derived inertia ratio. This is
the most realistic-feeling option without changing spring configuration or
adding new public props. Use a softened exponent (0.4) of the inertia ratio to
keep the effect natural and not overly damped for large items.

## Approach
- Compute item width/height in pixels using `calcGridItemWHPx`.
- Compute a baseline size from a 1x1 grid cell.
- Calculate a rotation weight with a rectangle inertia proxy:
  `weight = ((w*h*(w^2 + h^2)) / (w0*h0*(w0^2 + h0^2)))^0.4`.
- Use the weight to scale velocity before `velocityToRotation`.
- Guard invalid sizes and fall back to weight `1`.

## Implementation Steps
1) Add `calculateRotationWeight` helper in `packages/dnd-grid-react/lib/spring.ts`.
2) Use the helper in `packages/dnd-grid-react/lib/components/grid-item.tsx` to
   scale horizontal velocity before converting to rotation.
3) Add unit tests in `packages/dnd-grid-react/lib/__tests__/spring.test.ts` for
   baseline and larger sizes, plus invalid input handling.

## Test Plan
- `npm run test --workspace=@dnd-grid/react`

## Notes / Tuning
- If large items feel too stiff, lower the weight exponent (e.g. 1/3) or add a
  clamp range.
