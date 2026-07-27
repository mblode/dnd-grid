# Architecture brief

Adoption pass over the existing monorepo: guardrails, boundary enforcement, and dead-path removal. Not a rewrite. Written 2026-07-28.

## Context and constraints

- Two published packages (`@dnd-grid/core`, `@dnd-grid/react`) plus three private apps. Solo maintainer, so every convention has to be enforced by an exit code rather than by review.
- `@dnd-grid/react` supports React 17+, which constrains component style (`forwardRef` stays).
- Quality bar: the published type surface must resolve for consumers, and the layout engine's 169 tests must gate merges.

## Repo shape

Unchanged and appropriate for the size: `packages/` for the two published libraries, `apps/` for the site, MDX docs, and docs worker. No new packages; the 3-consumer rule is not met by anything here.

## Module contracts

| Contract | Rule | Enforcement |
|---|---|---|
| Framework-agnostic logic lives in `@dnd-grid/core` | The react package holds components and hooks only | Review + AGENTS.md; no lint rule yet (see deferred) |
| No local re-export shims | Import `@dnd-grid/core` at the use site, never through a forwarding module | `knip` flags the orphan; `no-duplicate-imports` merges the resulting `import` clauses (it does not fire on `export … from`, so entry-point clauses need merging by hand) |
| No `paths` mapping for `@dnd-grid/core` | TypeScript bakes resolved paths into emitted `.d.ts` | Documented gotcha with a grep that re-proves it |
| Published output excludes tests | `vite-plugin-dts` mirrors `tsconfig.build.json` excludes | Build output check |

Ten modules in `packages/dnd-grid-react/lib/` (`compactors`, `constraints`, `spring`, `layout-engine`, …) existed only to re-export `@dnd-grid/core`. They were pass-throughs by the deletion test: removing them moved no complexity, it only removed a hop. Collapsed into direct imports; all 110 public exports verified byte-identical before and after.

## Fixes with user impact

- **Published types were broken.** `paths` in the react package's tsconfig made TypeScript emit `from '../../dnd-grid-core/dist/index.d.ts'` into `dist/`. That path resolves to `node_modules/@dnd-grid/dnd-grid-core/…`, which does not exist, so every consumer of a core-derived export (compactors, constraints, spring helpers, `createLayoutEngine`, `validateLayout`, `findEmptyPosition`) got an unresolvable type. Pre-existing on `main`, not introduced here. Fixed by deleting the mapping so the bare specifier survives.
- **Test declarations shipped to npm.** `dist/__tests__` was in the tarball. Excluded.

## Guardrails

| Check | Command | Wired into |
|---|---|---|
| Lint + format | `npm run lint` | pre-commit (lefthook), CI |
| Types | `npm run check-types` | CI |
| Tests (core + react) | `npm run test` | CI |
| Dead code, exports, deps | `npm run knip` | CI |

Verification tiers are published in AGENTS.md so an agent runs the narrowest check that covers its change: `check` (lint + types), `verify` (lint, types, tests, dead code). CI additionally runs `changeset status`, `build`, and the docs-worker smoke test, so a green `verify` is not a green CI.

Two gaps closed: CI ran only the react package's tests, so core's 169 tests never gated a merge; and `knip.config.js` existed but knip was never installed or invoked.

## Conventions corrected

- **The linter is oxlint, not Biome.** 89 `biome-ignore` directives across 34 files suppressed nothing (verified: a `biome-ignore`d `debugger` still errors under oxlint). Removed, keeping the rationale as a plain comment only where it said something the code did not. `.vscode` and `.zed` still pointed format-on-save at the Biome extension; repointed at oxc.
- **AGENTS.md described a different repo.** It documented Biome commands, a `lint:fix` script that does not exist, husky + lint-staged instead of lefthook, Node >= 18 instead of 24, and claimed tests are *not* in `__tests__/` when every test is. Rewritten against what the repo does, with the two non-obvious gotchas each paired with the command that re-proves it.

## Dead paths removed

- `apps/docs/snippets/` (18 `.jsx` files): superseded by live iframe embeds. Nothing referenced them. This was the unmarked old/new dual path that teaches an agent the wrong way to add a docs example. Removing them also emptied `apps/docs`'s six runtime dependencies.
- `apps/web/components/ui/tabs.tsx` and `@radix-ui/react-tabs`, `plans/kitchen-sink-blocks-grid-plan.md`, `StoreContext`/`StoreProvider` (a context that was never mounted, so `useStore()` always returned the singleton default), and the unused half of `apps/web/lib/spring.ts`'s public surface.

`@typescript/typescript6` reads as unused to knip, but its transitive `@typescript/old` (typescript@6) supplies `node_modules/.bin/tsc`; removing it leaves no `tsc` at all. Pinned in `ignoreDependencies` with the reason, and recorded as a gotcha.

## Open risks and follow-ups

Ranked by leverage. Each was scoped and deliberately not done in this pass.

1. **`use-dnd-grid.ts` (2288 lines) and `grid-item.tsx` (2009 lines).** One hook and one component hold ~1700 lines of body each. Highest remaining leverage and the main traversal cost in the repo. Needs its own slice with a named seam (drag lifecycle, resize lifecycle, a11y announcements) rather than a mechanical split; deferred because the risk is concentrated in the least-covered interaction code.
2. **No file-size cap.** The natural guardrail for item 1, but it fails on those two files today, so it needs the baseline-and-ratchet shape (cap at ~400, commit the two exceptions, shrink only) rather than a flat rule.
3. **`apps/web/lib/spring.ts` duplicates core's spring physics.** Same integrator and constants, but the web copy adds runtime parameterisation (`setConfig`, per-call `windowMs`/`velocityScale`/`maxRotation`) that the MobX settings panel drives and core does not expose. Collapsing it means widening core's public API, so it is a library decision, not a cleanup. The shared constants are now imported from `@dnd-grid/react` rather than copied, so only the parameterised function bodies are forked.
4. **Two block models in `apps/web`.** `types/block.ts` has `BlockData.type: "link" | "header" | "text"`; `components/blocks-grid/types.ts` has `BlockKind: "text" | "media" | "quote"`. One concept, two vocabularies, overlapping only on `text`. Naming divergence to resolve before either grows.
5. **42 oxlint rules disabled** with one blanket rationale. Some (`no-unused-vars`, `prefer-const`) are cheap to re-enable now that the tree is clean; each should earn its `off` individually.
6. **The pinned TypeScript version is not the one that runs.** Every package pins `typescript: 7.0.2` (`apps/web` pins 6.0.3), but `@typescript/typescript6` drags in `@typescript/old`, whose `tsc` wins the bin link, so every `build` and `check-types` compiles with 6.0.3. Either drop `@typescript/typescript6` and take TS 7 (expect new diagnostics), or pin 6.0.3 honestly. Left alone here because switching compilers is not a cleanup.
7. **No duplication check** (`jscpd`) wired.

## Validation

Run on the final tree: `npm run lint` clean, `npm run check-types` 6/6, `npm run test` 371 passing (169 core + 202 react), `npm run knip` zero findings, `npm run build` clean, docs-worker smoke test exit 0. Public export surface diffed before and after: 110 names, identical. Net change excluding the lockfile: +364 / -833.
