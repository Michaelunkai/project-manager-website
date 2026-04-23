import { describe, expect, it } from "vitest";

import { normalizeRelativePath, safeJsonParse, slugify } from "@/lib/inventory";

describe("inventory helpers", () => {
  it("slugifies mixed casing and separators", () => {
    expect(slugify("Todoist Enhanced Fidelity")).toBe("todoist-enhanced-fidelity");
    expect(slugify("  AI_ML / Project  ")).toBe("ai-ml-project");
  });

  it("normalizes Windows separators to public relative paths", () => {
    expect(normalizeRelativePath("projects\\Web_Development\\Fullstack")).toBe(
      "projects/Web_Development/Fullstack",
    );
  });

  it("falls back safely on invalid JSON", () => {
    expect(safeJsonParse("not-json", ["fallback"])).toEqual(["fallback"]);
  });
});
