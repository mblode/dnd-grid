import { describe, expect, it } from "vitest";
import { layoutItemSchema, layoutSchema, validateLayout } from "../validation";
import { createLayoutItem } from "./test-utils";

describe("validation", () => {
  it("accepts a valid layout item", () => {
    const item = createLayoutItem({ resizeHandles: ["se"] });
    expect(layoutItemSchema.safeParse(item).success).toBe(true);
  });

  it("rejects duplicate layout item ids", () => {
    const layout = [
      createLayoutItem({ id: "dup" }),
      createLayoutItem({ id: "dup", x: 1 }),
    ];
    const result = layoutSchema.safeParse(layout);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("Duplicate layout item id");
    }
  });

  it("throws on invalid layouts via validateLayout", () => {
    const badLayout = [{ id: 1, x: 0, y: 0, w: 1, h: 1 }];
    expect(() => validateLayout(badLayout)).toThrow();
  });
});
