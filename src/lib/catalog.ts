import rawProjects from "../../data/generated/projects.json";
import rawSummary from "../../data/generated/scan-summary.json";
import type { InventorySummary, ProjectQuery, ProjectQueryResult, ProjectRecord } from "./inventory";
import { buildShowcaseProjects, type PortfolioProject } from "./showcase";

export type PortfolioQueryResult = Omit<ProjectQueryResult, "items"> & {
  items: PortfolioProject[];
};

const inventoryProjects = rawProjects as ProjectRecord[];
const inventorySummary = rawSummary as InventorySummary;
const showcaseProjects = buildShowcaseProjects(inventoryProjects);

function sortedProjects(items: PortfolioProject[]) {
  return [...items].sort((left, right) => {
    const featuredDelta = Number(right.featured) - Number(left.featured);
    if (featuredDelta !== 0) {
      return featuredDelta;
    }

    const evidenceDelta = (right.metrics.evidenceScore ?? 0) - (left.metrics.evidenceScore ?? 0);
    if (evidenceDelta !== 0) {
      return evidenceDelta;
    }

    return left.displayName.localeCompare(right.displayName);
  });
}

function filteredProjects(query: ProjectQuery = {}) {
  const normalizedSearch = query.search?.trim().toLowerCase() ?? "";

  const items = showcaseProjects.filter((project) => {
    if (normalizedSearch && !project.searchText.toLowerCase().includes(normalizedSearch)) {
      return false;
    }

    if (query.category && query.category !== "all" && project.category !== query.category) {
      return false;
    }

    if (query.entityType && query.entityType !== "all" && project.entityType !== query.entityType) {
      return false;
    }

    if (query.featured && !project.featured) {
      return false;
    }

    return true;
  });

  return sortedProjects(items);
}

function distinctValues<T>(items: T[]) {
  return [...new Set(items)].sort((left, right) => String(left).localeCompare(String(right)));
}

function relatedScore(source: PortfolioProject, candidate: PortfolioProject) {
  let score = 0;

  if (source.category === candidate.category) {
    score += 4;
  }

  if (source.entityType === candidate.entityType) {
    score += 1;
  }

  const sharedTechnologies = candidate.technologies.filter((technology) => source.technologies.includes(technology));
  score += sharedTechnologies.length * 2;

  const sharedLanguages = candidate.languages.filter((language) => source.languages.includes(language));
  score += sharedLanguages.length;

  return score;
}

export async function getInventorySummary(): Promise<InventorySummary> {
  return inventorySummary;
}

export async function getFeaturedProjects(limit = 6): Promise<PortfolioProject[]> {
  return showcaseProjects.slice(0, limit);
}

export async function getProjectBySlug(slug: string): Promise<PortfolioProject | null> {
  return showcaseProjects.find((project) => project.slug === slug) ?? null;
}

export async function getRelatedProjects(project: PortfolioProject, limit = 3): Promise<PortfolioProject[]> {
  return [...showcaseProjects]
    .filter((candidate) => candidate.slug !== project.slug)
    .sort((left, right) => {
      const scoreDelta = relatedScore(project, right) - relatedScore(project, left);
      if (scoreDelta !== 0) {
        return scoreDelta;
      }

      const evidenceDelta = (right.metrics.evidenceScore ?? 0) - (left.metrics.evidenceScore ?? 0);
      if (evidenceDelta !== 0) {
        return evidenceDelta;
      }

      return left.displayName.localeCompare(right.displayName);
    })
    .slice(0, limit);
}

export async function listProjects(query: ProjectQuery = {}): Promise<PortfolioQueryResult> {
  const items = filteredProjects(query);
  const limit = Math.min(query.limit ?? 24, 100);
  const offset = Math.max(query.offset ?? 0, 0);

  return {
    items: items.slice(offset, offset + limit),
    total: items.length,
    categories: distinctValues(showcaseProjects.map((project) => project.category)),
    entityTypes: distinctValues(showcaseProjects.map((project) => project.entityType)),
  };
}
