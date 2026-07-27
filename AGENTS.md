# dnd-grid

Turborepo monorepo for the `@dnd-grid/react` drag-and-drop grid layout library, its docs, and web site.

## Project Structure

- `packages/dnd-grid-core` — Headless layout engine (pure TS, no React dependency). Owns layout maths, compactors, constraints, spring physics, validation.
- `packages/dnd-grid-react` — React bindings (`lib/` source, `dist/` output). Owns components and hooks only; anything framework-agnostic belongs in core.
- `apps/web` — Next.js site and examples (port 3000)
- `apps/docs` — MDX content only, no build and no dependencies. Examples are embedded as live iframes pointing at `apps/web`.
- `apps/docs-worker` — Cloudflare Worker serving docs

## Commands

```bash
npm install                          # bootstrap (npm workspaces, Node >= 24)
npm run dev                          # turbo dev across all workspaces
npm run build                        # turbo build (core builds before react)

# Verification tiers — run the narrowest that covers your change
npm run check                        # lint + typecheck
npm run verify                       # check + all tests + dead-code scan
npm run verify:full                  # verify + published-type check (slow: packs and installs)

npm run lint                         # ultracite check (oxlint + oxfmt, read-only)
npm run format                       # ultracite fix (writes)
npm run check-types                  # turbo run check-types
npm run test                         # turbo run test (core + react)
npm run knip                         # dead files, exports, and dependencies
npm run check-package-types          # build, pack, and typecheck a consumer

npm run test --workspace=@dnd-grid/core    # single package
npm run test --workspace=@dnd-grid/react

npm run examples:sync                # regenerate docs MDX + shadcn registry from apps/web/examples
npm run workers:dev                  # local wrangler dev
npm run workers:deploy               # deploy to Cloudflare
```

## Gotchas

- **Never add a `paths` mapping for `@dnd-grid/core`** in `packages/dnd-grid-react/tsconfig*.json`. TypeScript bakes the resolved path into the emitted `.d.ts`, so the published package ships `from '../../dnd-grid-core/dist/index.d.ts'`, which does not exist in the tarball and breaks consumers' types. `npm run check-package-types` gates this in CI; `npm run check-types` cannot, because in-repo builds resolve core through the workspace symlink.
- **The linter is oxlint, not Biome.** `biome-ignore` comments are silently inert; they suppress nothing. Use `oxlint-disable-next-line`, and check `oxlint.config.ts` first: many rules (`complexity`, `no-barrel-file`, `no-unused-vars`) are deliberately off, so the suppression is usually unnecessary.
- **Layout, compaction, constraint, and spring logic belongs in `@dnd-grid/core`**, not in the React package or `apps/web`. If an app needs a variation, add a parameter to core rather than copying the function; that is how the site's drag-swing tuning is wired.
- **Pre-commit hook is lefthook** (`lefthook.yml`), running `oxfmt` on JSON/CSS and `ultracite fix` on source. JSON and CSS are formatted in a separate job because oxlint exits non-zero when handed only files it cannot lint. If the hook fails, fix the issue; do not bypass with `--no-verify`.
- **Build order matters** — `@dnd-grid/core` must build before `@dnd-grid/react` (turbo handles this via `dependsOn: ["^build"]`). If react types break after core changes, rebuild core first.
- **`node_modules/.bin/tsc` is TypeScript 6.0.3, not the pinned 7.0.2.** Every package pins `typescript: 7.0.2`, but `@typescript/typescript6` (root devDependency) depends on `@typescript/old`, which is `typescript@6` and wins the `tsc` bin link. So `build` and `check-types` actually compile with 6.0.3; check with `./node_modules/.bin/tsc --version`. Removing `@typescript/typescript6` leaves no `tsc` on PATH at all, so it is pinned in `knip.config.js` under `ignoreDependencies` rather than deleted. Reconciling the two versions is an open task, not a settled decision.
- **CSS exports** — `@dnd-grid/react` exports `styles.css`, `base.css`, and `theme.css` via package.json `exports`. When adding new styles, update the export map.
- **Changesets for releases** — `npm run changeset` before publishing. CI fails without one on a PR that touches a published package.

## Conventions

- File names: kebab-case (`resize-handle.tsx`). Tests live in `__tests__/` directories next to the code they cover.
- React components: PascalCase. Hooks: `useX` pattern.
- TypeScript + ESM throughout. Oxfmt owns formatting (2-space indent, organized imports); never hand-format.
- Framework-agnostic logic goes in `@dnd-grid/core` and is imported directly by the react package. Do not add a module whose entire body forwards core; import `@dnd-grid/core` at the use site. (`lib/utils.ts` and `lib/types.ts` do mix their own declarations with core re-exports; that is tolerated, not a pattern to copy.)
- Use `const` by default, `let` only when reassignment is needed, never `var`.
- Use `unknown` over `any`. Prefer type narrowing over assertions.
- `packages/dnd-grid-react` supports React 17+, so `forwardRef` is required there. `apps/web` is React 19 and should use ref-as-a-prop.
- Next.js (`apps/web`): use `<Image>`, App Router metadata API, Server Components for data fetching.
