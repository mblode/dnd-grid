import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const BASE_CSS = readFileSync(
  resolve(process.cwd(), "lib/styles/base.css"),
  "utf8"
);

const escapeForRegex = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const zIndexFor = (selector: string) => {
  const pattern = new RegExp(
    `${escapeForRegex(selector)}\\s*\\{[\\s\\S]*?z-index:\\s*(\\d+)\\s*;`,
    "m"
  );
  const match = BASE_CSS.match(pattern);
  if (!match?.[1]) {
    throw new Error(`Missing z-index rule for selector: ${selector}`);
  }
  return Number(match[1]);
};

describe("grid item stacking order", () => {
  it("keeps dragging above settling and placeholder", () => {
    const dragging = zIndexFor(".dnd-grid-item.dnd-draggable-dragging");
    const settling = zIndexFor(".dnd-grid-item.dnd-grid-animating");
    const placeholder = zIndexFor(".dnd-grid-item.dnd-grid-placeholder");

    expect(dragging).toBeGreaterThan(settling);
    expect(settling).toBeGreaterThan(placeholder);
  });

  it("keeps resizing highest priority", () => {
    const resizing = zIndexFor(".dnd-grid-item.resizing");
    const dragging = zIndexFor(".dnd-grid-item.dnd-draggable-dragging");

    expect(resizing).toBeGreaterThan(dragging);
  });
});
