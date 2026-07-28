---
"@dnd-grid/react": minor
"@dnd-grid/core": patch
---

Publish both packages on one version line.

`@dnd-grid/react` re-exports `createLiveSpring`, `calculateVelocityFromHistory`
and `velocityToRotation` from core. Core 1.2.0 made those tunable (`setConfig`,
and optional `windowMs`/`velocityScale`/`maxRotation`), but react's dependency
floor was still `^1.1.8`, so a consumer pinning core 1.1.8 got the untunable
versions through an entry point that advertises the new ones. The floor now
tracks the version react is built against.

The two packages had also drifted apart (core 1.2.0, react 1.1.10) because they
were released in separate runs. They are now a `fixed` changesets group, so they
share a version from here on.
