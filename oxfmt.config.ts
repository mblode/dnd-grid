import { defineConfig } from "oxfmt";
import ultracite from "ultracite/oxfmt";

export default defineConfig({
  ...ultracite,
  // oxfmt reflows prose (proseWrap) into single lines; leave docs untouched.
  ignorePatterns: [
    ...(ultracite.ignorePatterns ?? []),
    "**/*.md",
    "**/*.mdx",
    "**/dist/**",
    "**/.next/**",
    "**/registry/**",
  ],
});
