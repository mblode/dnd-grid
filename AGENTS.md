# dnd-grid

Turborepo monorepo for the `@dnd-grid/react` drag-and-drop grid layout library, its docs, and web site.

## Project Structure

- `packages/dnd-grid-core` — Headless layout engine (pure TS, no React dependency)
- `packages/dnd-grid-react` — React bindings (`lib/` source, `dist/` output)
- `apps/web` — Next.js site and examples (port 3000)
- `apps/docs` — MDX content and example source for documentation
- `apps/docs-worker` — Cloudflare Worker serving docs

## Commands

```bash
npm install                          # bootstrap (npm workspaces, Node >= 18)
npm run dev                          # turbo dev across all workspaces
npm run build                        # turbo build (core must build before react)
npm run check-types                  # typecheck all packages/apps

# Lint & format (Biome via Ultracite)
npm run lint                         # biome check .
npm run lint:fix                     # biome check --write .
npm run format                       # biome format --write .
npm exec -- ultracite fix            # auto-fix all Biome issues

# Tests (Vitest)
npm run test --workspace=@dnd-grid/core    # run core tests
npm run test --workspace=@dnd-grid/react   # run react tests

# Docs worker
npm run workers:dev                  # local wrangler dev
npm run workers:deploy               # deploy to Cloudflare
```

## Gotchas

- **IMPORTANT: Pre-commit hook** — husky + lint-staged runs `npx ultracite fix` on staged files. If the hook fails, fix the lint issues and re-commit — do not bypass with `--no-verify`.
- **Build order matters** — `@dnd-grid/core` must build before `@dnd-grid/react` (turbo handles this via `dependsOn: ["^build"]`). If react types break after core changes, rebuild core first.
- **Tests live alongside source** — test files (`*.test.ts`, `*.test.tsx`) are colocated in `packages/dnd-grid-react/lib/` and `packages/dnd-grid-core/`, not in a separate `__tests__/` directory.
- **CSS exports** — `@dnd-grid/react` exports `styles.css`, `base.css`, and `theme.css` via package.json `exports`. When adding new styles, update the export map.
- **Changesets for releases** — use `npm run changeset` to create a changeset before publishing. `npm run changeset:version` bumps versions, `npm run release` publishes.

## Conventions

- File names: kebab-case (`resize-handle.tsx`). Tests: `*.test.ts` / `*.test.tsx`.
- React components: PascalCase. Hooks: `useX` pattern.
- TypeScript + ESM throughout. Biome enforces formatting (2-space indent, organized imports).
- Use `const` by default, `let` only when reassignment is needed, never `var`.
- Use `unknown` over `any`. Prefer type narrowing over assertions.
- React 19+: use ref as a prop, not `React.forwardRef`.
- Next.js: use `<Image>` component, App Router metadata API, Server Components for data fetching.
