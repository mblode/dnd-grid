---
"@dnd-grid/react": patch
---

Fix unresolvable type references in the published package.

A `paths` mapping in the package's tsconfig made TypeScript emit the resolved
path into the declaration output, so `dist/main.d.ts` shipped
`from '../../dnd-grid-core/dist/index.d.ts'`. That resolves to
`node_modules/@dnd-grid/dnd-grid-core/…`, which is not in the tarball, so every
export re-exported from `@dnd-grid/core` (compactors, constraints, spring
helpers, `createLayoutEngine`, `validateLayout`, `findEmptyPosition`) failed to
resolve for consumers. The emitted declarations now use the bare
`@dnd-grid/core` specifier.

Test declarations are also no longer published: `dist/__tests__` has been
excluded from the build output.
