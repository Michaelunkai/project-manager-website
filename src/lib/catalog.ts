import { stat } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { createClient, type Client } from "@libsql/client";

import {
  DATABASE_FILENAME,
  GENERATED_DIR,
  type InventorySummary,
  type ProjectQuery,
  type ProjectQueryResult,
  type ProjectRecord,
  safeJsonParse,
} from "./inventory";

let cachedClient: Client | null = null;

function databasePath() {
  return path.join(process.cwd(), GENERATED_DIR, DATABASE_FILENAME);
}

async function getClient() {
  if (cachedClient) {
    return cachedClient;
  }

  const dbPath = databasePath();
  await stat(dbPath);
  cachedClient = createClient({ url: pathToFileURL(dbPath).href });
  return cachedClient;
}

function parseProjectRow(row: Record<string, unknown>): ProjectRecord {
  return {
    id: String(row.id),
    slug: String(row.slug),
    relativePath: String(row.relative_path),
    parentRelativePath: row.parent_relative_path ? String(row.parent_relative_path) : null,
    displayName: String(row.display_name),
    nameSource: String(row.name_source),
    entityType: String(row.entity_type) as ProjectRecord["entityType"],
    category: String(row.category) as ProjectRecord["category"],
    summary: String(row.summary),
    summarySource: String(row.summary_source),
    description: String(row.description),
    descriptionSource: String(row.description_source),
    statusLabel: String(row.status_label),
    statusSource: String(row.status_source),
    confidence: String(row.confidence) as ProjectRecord["confidence"],
    featured: Number(row.featured) === 1,
    featuredReason: row.featured_reason ? String(row.featured_reason) : null,
    technologies: safeJsonParse(String(row.technologies_json), []),
    languages: safeJsonParse(String(row.languages_json), []),
    markers: safeJsonParse(String(row.markers_json), []),
    links: safeJsonParse(String(row.links_json), []),
    notes: safeJsonParse(String(row.notes_json), []),
    metrics: safeJsonParse(String(row.metrics_json), {
      evidenceScore: 0,
      sourceFileCount: 0,
      directoryCount: 0,
      notebookCount: 0,
      imageAssetCount: 0,
      lastModifiedAt: null,
      manifests: [],
    }),
    searchText: String(row.search_text),
  };
}

export async function getInventorySummary(): Promise<InventorySummary> {
  const client = await getClient();
  const result = await client.execute("SELECT key, value FROM inventory_meta");

  const summary = Object.fromEntries(
    result.rows.map((row) => [String(row.key), JSON.parse(String(row.value)) as unknown]),
  ) as unknown as InventorySummary;

  return summary;
}

export async function getFeaturedProjects(limit = 6) {
  const client = await getClient();
  const result = await client.execute({
    sql: `
      SELECT *
      FROM projects
      WHERE featured = 1
      ORDER BY json_extract(metrics_json, '$.evidenceScore') DESC, display_name ASC
      LIMIT ?
    `,
    args: [limit],
  });

  return result.rows.map((row) => parseProjectRow(row));
}

export async function getProjectBySlug(slug: string) {
  const client = await getClient();
  const result = await client.execute({
    sql: "SELECT * FROM projects WHERE slug = ? LIMIT 1",
    args: [slug],
  });

  const row = result.rows[0];
  return row ? parseProjectRow(row) : null;
}

export async function getRelatedProjects(project: ProjectRecord, limit = 4) {
  const client = await getClient();
  const searchTerms = [project.category, ...project.technologies.slice(0, 2)].join(" ");
  const result = await client.execute({
    sql: `
      SELECT *
      FROM projects
      WHERE slug != ?
        AND (category = ? OR search_text LIKE ?)
      ORDER BY featured DESC, json_extract(metrics_json, '$.evidenceScore') DESC
      LIMIT ?
    `,
    args: [project.slug, project.category, `%${searchTerms}%`, limit],
  });

  return result.rows.map((row) => parseProjectRow(row));
}

export async function listProjects(query: ProjectQuery = {}): Promise<ProjectQueryResult> {
  const client = await getClient();
  const where: string[] = ["1 = 1"];
  const args: Array<string | number> = [];

  if (query.search) {
    where.push("(search_text LIKE ? OR relative_path LIKE ?)");
    args.push(`%${query.search}%`, `%${query.search}%`);
  }

  if (query.category && query.category !== "all") {
    where.push("category = ?");
    args.push(query.category);
  }

  if (query.entityType && query.entityType !== "all") {
    where.push("entity_type = ?");
    args.push(query.entityType);
  }

  if (query.featured) {
    where.push("featured = 1");
  }

  const limit = Math.min(query.limit ?? 24, 100);
  const offset = Math.max(query.offset ?? 0, 0);
  const whereSql = where.join(" AND ");

  const [itemsResult, totalResult, categoryResult, entityTypeResult] = await Promise.all([
    client.execute({
      sql: `
        SELECT *
        FROM projects
        WHERE ${whereSql}
        ORDER BY featured DESC, json_extract(metrics_json, '$.evidenceScore') DESC, display_name ASC
        LIMIT ? OFFSET ?
      `,
      args: [...args, limit, offset],
    }),
    client.execute({
      sql: `SELECT COUNT(*) AS total FROM projects WHERE ${whereSql}`,
      args,
    }),
    client.execute("SELECT DISTINCT category FROM projects ORDER BY category ASC"),
    client.execute("SELECT DISTINCT entity_type FROM projects ORDER BY entity_type ASC"),
  ]);

  return {
    items: itemsResult.rows.map((row) => parseProjectRow(row)),
    total: Number(totalResult.rows[0]?.total ?? 0),
    categories: categoryResult.rows.map((row) => String(row.category)),
    entityTypes: entityTypeResult.rows.map((row) => String(row.entity_type)),
  };
}
