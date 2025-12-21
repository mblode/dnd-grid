import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
	plugins: [react()],
	test: {
		globals: true,
		environment: "jsdom",
		setupFiles: ["./lib/__tests__/setup.ts"],
		include: ["lib/**/*.test.{ts,tsx}"],
		coverage: {
			provider: "v8",
			reporter: ["text", "json", "html"],
			include: ["lib/**/*.{ts,tsx}"],
			exclude: [
				"lib/**/*.test.{ts,tsx}",
				"lib/__tests__/**",
				"lib/main.ts",
				"lib/types.ts",
			],
			thresholds: {
				statements: 80,
				branches: 75,
				functions: 80,
				lines: 80,
			},
		},
	},
	resolve: {
		alias: {
			"@": resolve(__dirname, "./lib"),
		},
	},
});
