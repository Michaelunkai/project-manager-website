import { describe, expect, it } from "vitest";

import { projectQuerySchema } from "@/lib/query-schema";

describe("projectQuerySchema", () => {
  it("coerces query strings into the typed query object", () => {
    const parsed = projectQuerySchema.parse({
      search: "todoist",
      category: "full-stack",
      entityType: "standalone",
      featured: "true",
      limit: "12",
      offset: "24",
    });

    expect(parsed).toEqual({
      search: "todoist",
      category: "full-stack",
      entityType: "standalone",
      featured: true,
      limit: 12,
      offset: 24,
    });
  });

  it("rejects invalid categories", () => {
    expect(() => projectQuerySchema.parse({ category: "invalid-category" })).toThrow();
  });
});
