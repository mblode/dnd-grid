---
"@dnd-grid/core": minor
---

Make the spring helpers tunable instead of hardcoding the default constants:

- `createLiveSpring` gains `setConfig(config)` to retune a running spring without discarding its current motion.
- `calculateVelocityFromHistory` accepts an optional `windowMs`.
- `velocityToRotation` accepts optional `velocityScale` and `maxRotation`.

All three default to the previous constants, so existing behaviour is unchanged.
