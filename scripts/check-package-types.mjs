#!/usr/bin/env node
/**
 * Packs @dnd-grid/core and @dnd-grid/react exactly as npm would publish them,
 * installs both into a throwaway consumer project, and type-checks a file that
 * imports the public API with `skipLibCheck` off.
 *
 * Why this exists: the workspace type-checks fine even when the *published*
 * declarations are broken, because in-repo builds resolve @dnd-grid/core
 * through the workspace symlink. v1.1.9 shipped dist/*.d.ts that re-exported
 * from '../../dnd-grid-core/dist/index.d.ts', a path that exists in this repo
 * but not in a consumer's node_modules, so every dependent saw
 * "TS2307: Cannot find module". Nothing in lint, check-types, or the unit
 * tests caught it. This check does.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dirname, "..");
const workdir = fs.mkdtempSync(path.join(os.tmpdir(), "dnd-grid-pkgcheck-"));

const run = (cmd, args, cwd) =>
  execFileSync(cmd, args, {
    cwd,
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "pipe"],
  });

const CONSUMER = `import {
  createLayoutEngine,
  DndGrid,
  type Layout,
  type LayoutItem,
  ResponsiveDndGrid,
  useDndGrid,
  verticalCompactor,
} from "@dnd-grid/react";

const layout: Layout = [{ id: "a", x: 0, y: 0, w: 2, h: 2 }];
const first: LayoutItem = layout[0];

export const compactor = verticalCompactor;
export const engine = typeof createLayoutEngine;
export const hook = typeof useDndGrid;
export const responsive = typeof ResponsiveDndGrid;
export const App = () => (
  <DndGrid cols={12} layout={layout} rowHeight={30}>
    <div key={first.id} />
  </DndGrid>
);
`;

try {
  process.stdout.write("Packing workspace packages...\n");
  const tarballs = ["packages/dnd-grid-core", "packages/dnd-grid-react"].map(
    (pkg) =>
      path.join(
        workdir,
        run(
          "npm",
          ["pack", "--pack-destination", workdir, "--silent"],
          path.join(repoRoot, pkg)
        ).trim()
      )
  );

  fs.writeFileSync(
    path.join(workdir, "package.json"),
    JSON.stringify(
      { name: "dnd-grid-consumer-check", private: true, type: "module" },
      null,
      2
    )
  );
  fs.writeFileSync(
    path.join(workdir, "tsconfig.json"),
    JSON.stringify(
      {
        compilerOptions: {
          target: "ES2022",
          lib: ["ES2022", "DOM"],
          module: "ESNext",
          moduleResolution: "bundler",
          jsx: "react-jsx",
          strict: true,
          noEmit: true,
          // Deliberately off: this check exists to type-check the shipped .d.ts.
          skipLibCheck: false,
        },
        include: ["app.tsx"],
      },
      null,
      2
    )
  );
  fs.writeFileSync(path.join(workdir, "app.tsx"), CONSUMER);

  process.stdout.write("Installing tarballs into a throwaway consumer...\n");
  run(
    "npm",
    [
      "install",
      "--no-audit",
      "--no-fund",
      "--silent",
      ...tarballs,
      "react@^19",
      "react-dom@^19",
      "react-draggable@4.5.0",
      "react-resizable@3.0.5",
      "@types/react@^19",
      "@types/react-dom@^19",
      "typescript@~5.9",
    ],
    workdir
  );

  process.stdout.write(
    "Type-checking the consumer against the packed types...\n"
  );
  run("npx", ["tsc", "--noEmit"], workdir);
  process.stdout.write(
    "\nOK: the published type declarations resolve for consumers.\n"
  );
} catch (error) {
  const output = `${error.stdout ?? ""}${error.stderr ?? ""}`.trim();
  process.stderr.write(
    [
      "",
      "FAIL: the packed packages do not type-check from a consumer's perspective.",
      "",
      output,
      "",
      "If this reports TS2307 for a relative path into dnd-grid-core, a `paths`",
      "mapping has been reintroduced in packages/dnd-grid-react/tsconfig*.json.",
      "Mapping @dnd-grid/core to a relative .d.ts makes tsc bake that path into",
      "dist/*.d.ts; it must resolve through the workspace symlink so the emitted",
      "declarations keep the bare '@dnd-grid/core' specifier.",
      "",
    ].join("\n")
  );
  process.exitCode = 1;
} finally {
  fs.rmSync(workdir, { recursive: true, force: true });
}
