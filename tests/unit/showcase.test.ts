import { describe, expect, it } from "vitest";

import generatedProjects from "../../data/generated/projects.json";
import { buildShowcaseProjects } from "@/lib/showcase";
import type { ProjectRecord } from "@/lib/inventory";

describe("buildShowcaseProjects", () => {
  it("creates a curated portfolio set with explicit repository links", () => {
    const showcase = buildShowcaseProjects(generatedProjects as ProjectRecord[]);

    expect(showcase).toHaveLength(6);
    expect(showcase.every((project) => project.repoUrl.startsWith("https://github.com/"))).toBe(true);
    expect(showcase.every((project) => project.featured)).toBe(true);
  });

  it("keeps the public showcase focused on unique slugs", () => {
    const showcase = buildShowcaseProjects(generatedProjects as ProjectRecord[]);
    const slugs = showcase.map((project) => project.slug);

    expect(new Set(slugs).size).toBe(slugs.length);
  });
});
