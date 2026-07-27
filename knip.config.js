const cssImportMatcher = /@import\s+["']([^"']+)["']/g;

// knip has built-in compilers for mdx/scss/less/stylus but not plain css, and
// `".css": true` throws. This only exists so `css` can stay in the project globs
// (which is what catches an orphaned stylesheet) without knip warning that the
// extension has no compiler.
const cssCompiler = (text) =>
  [...text.matchAll(cssImportMatcher)]
    .map((match) => `import "${match[1]}";`)
    .join("\n");

export default {
  // Compilers are global in knip, not per-workspace, so every `project` glob
  // below has to list the compiled extensions or knip warns about them.
  compilers: {
    ".mdx": true,
    ".css": cssCompiler,
  },
  tags: ["-knipignore"],
  // Its own bin is `tsc6`, but it depends on `@typescript/old` (typescript@6),
  // which is what actually supplies `node_modules/.bin/tsc`. Nothing imports
  // either, so knip reads it as unused; removing it leaves no `tsc` at all.
  ignoreDependencies: ["@typescript/typescript6"],
  workspaces: {
    "apps/docs": {
      // Wider than `entry` on purpose, so a non-MDX file here is reported as
      // unused rather than going unseen.
      entry: ["**/*.mdx"],
      project: ["**/*.{mdx,tsx,ts,jsx,js,css}"],
    },
    "packages/dnd-grid-react": {
      entry: ["lib/main.ts"],
      project: ["lib/**/*.{ts,tsx,css,mdx}"],
    },
  },
};
