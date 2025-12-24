const fencedCodeBlockMatcher = /```[\s\S]*?```/g;
const importMatcher = /import[^'"]+['"][^'"]+['"]/g;

const mdxCompiler = (text) =>
  Array.from(text.replace(fencedCodeBlockMatcher, "").matchAll(importMatcher))
    .map((match) => match[0])
    .join("\n");

module.exports = {
  compilers: {
    ".mdx": mdxCompiler,
  },
  tags: ["-knipignore"],
  workspaces: {
    "apps/docs": {
      entry: ["**/*.mdx"],
      project: ["**/*.{mdx,tsx,ts,jsx,js}"],
    },
    "apps/web": {
      ignoreFiles: ["registry/**"],
    },
    "packages/dnd-grid-react": {
      entry: ["lib/main.ts"],
      project: ["lib/**/*.{ts,tsx,css}"],
    },
  },
};
