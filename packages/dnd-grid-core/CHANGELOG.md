# @dnd-grid/core

## 1.3.1

## 1.3.0

### Patch Changes

- c4ff3d1: Publish both packages on one version line.

  `@dnd-grid/react` re-exports `createLiveSpring`, `calculateVelocityFromHistory`
  and `velocityToRotation` from core. Core 1.2.0 made those tunable (`setConfig`,
  and optional `windowMs`/`velocityScale`/`maxRotation`), but react's dependency
  floor was still `^1.1.8`, so a consumer pinning core 1.1.8 got the untunable
  versions through an entry point that advertises the new ones. The floor now
  tracks the version react is built against.

  The two packages had also drifted apart (core 1.2.0, react 1.1.10) because they
  were released in separate runs. They are now a `fixed` changesets group, so they
  share a version from here on.

## 1.2.0

### Minor Changes

- 695dd35: Make the spring helpers tunable instead of hardcoding the default constants:

  - `createLiveSpring` gains `setConfig(config)` to retune a running spring without discarding its current motion.
  - `calculateVelocityFromHistory` accepts an optional `windowMs`.
  - `velocityToRotation` accepts optional `velocityScale` and `maxRotation`.

  All three default to the previous constants, so existing behaviour is unchanged.

## 1.1.8

### Patch Changes

- 1914eac: This patch release includes minor internal maintenance updates with no functional changes to the dnd-grid package.

## 1.1.7

### Patch Changes

- ea5c3ad: Fix responsive layout prop sync: use shape-preserving snapshot with deepEqual to correctly detect in-place layout mutations

## 1.1.6

### Patch Changes

- 08e09ec: fix swing physics

## 1.1.5

### Patch Changes

- d450b2e: Improve external drag API

## 1.1.4

### Patch Changes

- 72b78fc: update readme

## 1.1.3

### Patch Changes

- 5e0444a: remove fixed width dnd grid

## 1.1.2

### Patch Changes

- 75b54a9: improve the dx

## 1.1.1

### Patch Changes

- 44e41b9: chore: align core/react release workflow
