import { z } from "zod";

import { CATEGORIES, VISIBLE_ENTITY_TYPES, type ProjectQuery } from "./inventory";

const categoryValues = ["all", ...CATEGORIES] as const;
const entityValues = ["all", ...VISIBLE_ENTITY_TYPES] as const;

export const projectQuerySchema = z
  .object({
    search: z.string().trim().max(80).optional().default(""),
    category: z.enum(categoryValues).optional().default("all"),
    entityType: z.enum(entityValues).optional().default("all"),
    featured: z.enum(["true", "false"]).optional().default("false"),
    limit: z.coerce.number().int().min(1).max(48).optional().default(24),
    offset: z.coerce.number().int().min(0).max(5000).optional().default(0),
  })
  .transform<ProjectQuery>((value) => ({
    search: value.search || undefined,
    category: value.category,
    entityType: value.entityType,
    featured: value.featured === "true",
    limit: value.limit,
    offset: value.offset,
  }));
