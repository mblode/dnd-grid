import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const registryPath = path.join(root, "apps/web/registry.json");
const docsExamplesDir = path.join(root, "apps/docs/examples");

const registry = JSON.parse(fs.readFileSync(registryPath, "utf8"));
const items = registry.items ?? [];
const siteUrl = "https://dnd-grid.com";

const updateMdx = (item) => {
  const slug = item.name;
  const docsSlug = slug.replace(/-example$/, "");
  const file = item.files?.[0];
  if (!file) {
    throw new Error(`No files listed for ${slug}`);
  }

  const examplePath = path.join(root, "apps/web", file.path);
  const exampleContent = fs.readFileSync(examplePath, "utf8").trimEnd();
  const mdxPath = path.join(docsExamplesDir, `${docsSlug}.mdx`);

  if (!fs.existsSync(mdxPath)) {
    throw new Error(`Missing MDX file for ${slug}`);
  }

  const mdx = fs.readFileSync(mdxPath, "utf8");
  const frontmatterMatch = mdx.match(/^---[\s\S]*?---\s*/);
  if (!frontmatterMatch) {
    throw new Error(`Missing frontmatter in ${mdxPath}`);
  }

  const frontmatter = frontmatterMatch[0].trimEnd();
  const rest = mdx.slice(frontmatterMatch[0].length);
  const installationIndex = rest.indexOf("## Installation");
  if (installationIndex === -1) {
    throw new Error(`Missing Installation section in ${mdxPath}`);
  }

  const githubPath = `apps/web/${file.path}`;
  const githubUrl = `https://github.com/mblode/dnd-grid/blob/main/${githubPath}`;
  const iframeBlock = [
    '<div className="not-prose my-6 rounded-lg border border-zinc-200/70 bg-white/70 shadow-sm dark:border-white/10 dark:bg-white/5">',
    "  <iframe",
    `    title="${item.title} preview"`,
    `    src="${siteUrl}/examples/${slug}?embed=1"`,
    '    className="h-[640px] w-full"',
    '    loading="lazy"',
    "  />",
    "</div>",
    "",
    `[View source on GitHub](${githubUrl})`,
    "",
  ].join("\n");

  const updatedIntro = `${frontmatter}\n\n${iframeBlock}\n${rest
    .slice(installationIndex)
    .trimStart()}`;

  const codeBlockRegex =
    /```tsx title="components\/dnd-grid-[^"]+"\n[\s\S]*?\n```/;
  const codeBlock = `\`\`\`tsx title="components/dnd-grid-${slug}.tsx"\n${exampleContent}\n\`\`\``;

  if (!codeBlockRegex.test(updatedIntro)) {
    throw new Error(`Missing component code block in ${mdxPath}`);
  }

  const updated = updatedIntro.replace(codeBlockRegex, codeBlock);
  fs.writeFileSync(mdxPath, `${updated}\n`);
};

for (const item of items) {
  updateMdx(item);
}
