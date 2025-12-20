import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";
import { libInjectCss } from "vite-plugin-lib-inject-css";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), libInjectCss(), dts({ include: ["lib"] })],
  build: {
    copyPublicDir: false,
    lib: {
      entry: resolve(__dirname, "lib/main.ts"),
      name: "DndGrid",
      fileName: "main",
    },
    rollupOptions: {
      external: [
        "react",
        "react/jsx-runtime",
        "react-dom",
        "react-draggable",
        "react-resizable",
      ],
      output: {
        assetFileNames: "styles.css",
        globals: {
          react: "React",
          "react/jsx-runtime": "jsxRuntime",
          "react-dom": "ReactDOM",
          "react-draggable": "ReactDraggable",
          "react-resizable": "ReactResizable",
        },
      },
    },
  },
});
