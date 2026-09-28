#!/usr/bin/env node
/**
 * Fails when a workflow `uses:` an action by tag or branch instead of a full
 * commit SHA with a `# vX.Y.Z` comment.
 *
 * The release workflow holds `id-token: write`, so whoever can move a ref it
 * runs can publish to npm with our provenance. `changesets/action@v1` is a
 * branch, not a tag. The comment is what Dependabot reads to bump the pin.
 */
import fs from "node:fs";
import path from "node:path";

const workflowsDir = path.resolve(import.meta.dirname, "../.github/workflows");
const usesLine = /^\s*(?:-\s*)?uses:\s*["']?([^"'\s#]+)["']?(.*)$/;
const pinnedRef = /^[^@\s]+@[0-9a-f]{40}$/;
const versionComment = /^\s+#\s*v\d/;

const failures = [];

for (const file of fs.readdirSync(workflowsDir)) {
  if (!/\.ya?ml$/.test(file)) {
    continue;
  }
  const lines = fs
    .readFileSync(path.join(workflowsDir, file), "utf-8")
    .split("\n");
  for (const [index, line] of lines.entries()) {
    const match = usesLine.exec(line);
    if (!match || match[1].startsWith("./")) {
      continue;
    }
    const [, ref, rest] = match;
    const ok = ref.startsWith("docker://")
      ? ref.includes("@sha256:")
      : pinnedRef.test(ref) && versionComment.test(rest);
    if (!ok) {
      failures.push(`.github/workflows/${file}:${index + 1}: ${line.trim()}`);
    }
  }
}

if (failures.length > 0) {
  console.error(
    "Pin each action to a full commit SHA with a version comment, e.g.\n" +
      "  uses: actions/checkout@<40-char sha> # v7.0.1\n"
  );
  console.error(failures.join("\n"));
  process.exit(1);
}
