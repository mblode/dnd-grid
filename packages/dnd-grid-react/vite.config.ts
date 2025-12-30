import { copyFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isTest = mode === "test" || Boolean(process.env.VITEST);
  const coreAlias = isTest
    ? { "@dnd-grid/core": resolve(__dirname, "../dnd-grid-core/lib/index.ts") }
    : {};

  return {
    plugins: [
      react(),
      dts({ include: ["lib"] }),
      {
        name: "copy-styles",
        closeBundle() {
          // Create dist/styles directory
          mkdirSync(resolve(__dirname, "dist/styles"), { recursive: true });

          // Copy CSS files
          copyFileSync(
            resolve(__dirname, "lib/styles/base.css"),
            resolve(__dirname, "dist/styles/base.css")
          );
          copyFileSync(
            resolve(__dirname, "lib/styles/theme.css"),
            resolve(__dirname, "dist/styles/theme.css")
          );
          copyFileSync(
            resolve(__dirname, "lib/styles/index.css"),
            resolve(__dirname, "dist/styles/index.css")
          );
        },
      },
    ],
    resolve: {
      alias: coreAlias,
    },
    build: {
      copyPublicDir: false,
      lib: {
        entry: resolve(__dirname, "lib/main.ts"),
        name: "DndGrid",
        fileName: "main",
      },
      rollupOptions: {
        external: [
          "@dnd-grid/core",
          "react",
          "react/jsx-runtime",
          "react-dom",
          "react-draggable",
          "react-resizable",
        ],
        output: {
          globals: {
            "@dnd-grid/core": "DndGridCore",
            react: "React",
            "react/jsx-runtime": "jsxRuntime",
            "react-dom": "ReactDOM",
            "react-draggable": "ReactDraggable",
            "react-resizable": "ReactResizable",
          },
        },
      },
    },
  };
});
