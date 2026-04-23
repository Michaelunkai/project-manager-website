export const STUDY_ROOT = "F:/study";
export const SELF_RELATIVE_PATH = "projects/Web_Development/Fullstack/project-manager-website";
export const INVENTORY_DIR = "public/inventory";
export const GENERATED_DIR = "data/generated";
export const DATABASE_FILENAME = "project-catalog.db";
export const SCANNER_VERSION = "2026.04.23";

export const VISIBLE_ENTITY_TYPES = [
  "standalone",
  "nested-project",
  "component",
  "ambiguous",
] as const;

export const CATEGORIES = [
  "full-stack",
  "frontend",
  "backend",
  "automation",
  "ai-ml",
  "desktop",
  "mobile",
  "data",
  "ops",
  "library",
  "game",
  "other",
] as const;

export type VisibleEntityType = (typeof VISIBLE_ENTITY_TYPES)[number];
export type Category = (typeof CATEGORIES)[number];
export type Confidence = "high" | "medium" | "low";
export type SourceType = "direct" | "inferred";

export interface EvidenceMarker {
  type: string;
  file: string;
  detail?: string;
  source: SourceType;
}

export interface ProjectLink {
  label: string;
  href: string;
  kind: "git-remote" | "package-homepage" | "documentation" | "website";
}

export interface ProjectMetrics {
  evidenceScore: number;
  sourceFileCount: number;
  directoryCount: number;
  notebookCount: number;
  imageAssetCount: number;
  lastModifiedAt: string | null;
  manifests: string[];
}

export interface ProjectRecord {
  id: string;
  slug: string;
  relativePath: string;
  parentRelativePath: string | null;
  displayName: string;
  nameSource: string;
  entityType: VisibleEntityType;
  category: Category;
  summary: string;
  summarySource: string;
  description: string;
  descriptionSource: string;
  statusLabel: string;
  statusSource: string;
  confidence: Confidence;
  featured: boolean;
  featuredReason: string | null;
  technologies: string[];
  languages: string[];
  markers: EvidenceMarker[];
  links: ProjectLink[];
  notes: string[];
  metrics: ProjectMetrics;
  searchText: string;
}

export interface ExclusionRecord {
  relativePath: string;
  kind: "self" | "pruned" | "generated" | "vendor" | "dependency" | "duplicate" | "non-project";
  reason: string;
  details: string[];
}

export interface CoverageRecord {
  relativePath: string;
  depth: number;
  status: "scanned" | "pruned" | "error";
  reason: string;
  error?: string;
}

export interface InventorySummary {
  generatedAt: string;
  scanRoot: string;
  scannerVersion: string;
  selfPath: string;
  countsByCategory: Record<string, number>;
  countsByEntityType: Record<string, number>;
  projectCount: number;
  featuredCount: number;
  exclusionCount: number;
  coverageCount: number;
  scannedDirectoryCount: number;
  prunedDirectoryCount: number;
  errorCount: number;
  ambiguousCount: number;
}

export interface ProjectQuery {
  search?: string;
  category?: string;
  entityType?: string;
  featured?: boolean;
  limit?: number;
  offset?: number;
}

export interface ProjectQueryResult {
  items: ProjectRecord[];
  total: number;
  categories: string[];
  entityTypes: string[];
}

export function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);
}

export function normalizeRelativePath(relativePath: string): string {
  return relativePath.replace(/\\/g, "/").replace(/^\.\/+/, "").replace(/^\/+/, "");
}

export function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export function toSentenceCase(input: string): string {
  if (!input) {
    return input;
  }

  return input.charAt(0).toUpperCase() + input.slice(1);
}

export function safeJsonParse<T>(value: string | null, fallback: T): T {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function summarizeArray(items: string[], emptyLabel: string): string {
  return items.length > 0 ? items.join(", ") : emptyLabel;
}
