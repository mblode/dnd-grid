import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const registryPath = path.join(root, "apps/web/registry.json");
const publicRegistryPath = path.join(root, "apps/web/public/registry.json");
const publicItemsDir = path.join(root, "apps/web/public/r");
const examplesDir = path.join(root, "apps/web/examples");
const manifestPath = path.join(examplesDir, "manifest.ts");

const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, "utf8"));
const writeFile = (filePath, content) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
};

const registry = readJson(registryPath);
const items = registry.items ?? [];

const readExampleExport = (filePath) => {
  const content = fs.readFileSync(filePath, "utf8");
  const match = content.match(/export\s+(?:function|const)\s+([A-Za-z0-9_]+)/);
  if (!match) {
    throw new Error(`Could not find export in ${filePath}`);
  }
  return { content, exportName: match[1] };
};

const buildManifest = () => {
  const entries = items.map((item) => {
    const file = item.files?.[0];
    if (!file) {
      throw new Error(`No files listed for ${item.name}`);
    }
    const examplePath = path.join(root, "apps/web", file.path);
    const { exportName } = readExampleExport(examplePath);

    return {
      slug: item.name,
      title: item.title ?? item.name,
      description: item.description ?? "",
      filePath: file.path,
      exportName,
    };
  });

  const importLines = entries.map(
    (entry) =>
      `import { ${entry.exportName} } from "./${path.basename(
        entry.filePath,
        path.extname(entry.filePath),
      )}";`,
  );

  const exampleLines = entries.map((entry) =>
    [
      "  {",
      `    slug: "${entry.slug}",`,
      `    title: ${JSON.stringify(entry.title)},`,
      `    description: ${JSON.stringify(entry.description)},`,
      `    Component: ${entry.exportName},`,
      "  },",
    ].join("\n"),
  );

  const fileContents = `${importLines.join("\n")}
import type { ComponentType } from "react";

export type ExampleEntry = {
  slug: string;
  title: string;
  description: string;
  Component: ComponentType;
};

export const examples: ExampleEntry[] = [
${exampleLines.join("\n")}
];

export const examplesBySlug = Object.fromEntries(
  examples.map((example) => [example.slug, example]),
) as Record<string, ExampleEntry>;
`;

  writeFile(manifestPath, fileContents);
};

const buildRegistry = () => {
  writeFile(publicRegistryPath, `${JSON.stringify(registry, null, 2)}\n`);
  fs.mkdirSync(publicItemsDir, { recursive: true });

  for (const item of items) {
    const files = (item.files ?? []).map((file) => {
      const examplePath = path.join(root, "apps/web", file.path);
      const { content } = readExampleExport(examplePath);
      return {
        ...file,
        content,
      };
    });

    const output = {
      $schema: "https://ui.shadcn.com/schema/registry-item.json",
      name: item.name,
      type: item.type,
      title: item.title,
      description: item.description,
      dependencies: item.dependencies,
      css: item.css,
      files,
    };

    const outputPath = path.join(publicItemsDir, `${item.name}.json`);
    writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`);
  }
};

buildManifest();
buildRegistry();
