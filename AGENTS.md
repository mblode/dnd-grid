# Repository Guidelines

This repo is a Turborepo monorepo for the `@dnd-grid/react` library, its web site, and docs tooling. Use npm workspaces and Node >= 18 as declared in `package.json`.

## Project Structure & Module Organization

- `apps/web` - Next.js app for the public site and examples (runs on port 3000 in dev).
- `apps/docs` - MDX content and assets for documentation (API reference, guides, examples).
- `apps/docs-worker` - Cloudflare Worker used to serve docs.
- `packages/dnd-grid-react` - Library source under `lib/` with build output in `dist/`.
- Root configs: `biome.json` (format/lint), `turbo.json` (task graph), `tsconfig.json` (shared TS settings).

## Build, Test, and Development Commands

- `npm run dev` - Run `turbo run dev` across workspaces.
- `npm run dev --workspace=web` - Start the Next.js dev server on port 3000.
- `npm run build` - Build all workspaces; outputs `.next/` and `dist/`.
- `npm run check-types` - Typecheck across packages/apps.
- `npm run lint` / `npm run lint:fix` / `npm run format` - Biome linting and formatting.
- `npm run test --workspace=@dnd-grid/react` - Run Vitest for the library (`test:watch`, `test:coverage` also available).
- `npm run workers:dev` / `npm run workers:deploy` - Run or deploy the docs worker via Wrangler.

## Coding Style & Naming Conventions

- Formatting and linting are enforced by Biome with 2-space indentation and organized imports.
- TypeScript + ESM modules are standard across the repo.
- File names use kebab-case (e.g., `resize-handle.tsx`), and tests use `.test.ts` or `.test.tsx`.
- React components are PascalCase; hooks follow the `useX` naming pattern.

## Testing Guidelines

- Frameworks: Vitest + Testing Library with `jsdom`.
- Tests live in `packages/dnd-grid-react/lib/**` alongside sources.
- Add or update tests for layout logic, drag/resize behavior, and utility functions; run `test:coverage` before releases.

## Commit & Pull Request Guidelines

- Commit history favors short, one-line summaries; a `ci:` prefix appears for workflow changes. Keep messages concise and imperative.
- PRs should include a clear summary, testing notes, and linked issues. Add screenshots for UI changes in `apps/web` and note doc updates in `apps/docs`.

## Environment & Configuration

- `.env*` files are recognized by Turbo inputs; document any new variables and defaults.
- Keep secrets out of the repo and use local env files for developer-only configuration.
