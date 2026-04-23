"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { startTransition, useDeferredValue, useEffect, useRef, useState } from "react";

import type { ProjectRecord } from "@/lib/inventory";

interface ExplorerShellProps {
  initialItems: ProjectRecord[];
  initialTotal: number;
  categories: string[];
  entityTypes: string[];
}

async function requestCatalog(params: URLSearchParams) {
  const response = await fetch(`/api/projects?${params.toString()}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? "Project catalog request failed.");
  }

  return (await response.json()) as {
    items: ProjectRecord[];
    total: number;
  };
}

export function ExplorerShell({
  initialItems,
  initialTotal,
  categories,
  entityTypes,
}: ExplorerShellProps) {
  const [items, setItems] = useState(initialItems);
  const [total, setTotal] = useState(initialTotal);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [entityType, setEntityType] = useState("all");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const requestIdRef = useRef(0);
  const deferredSearch = useDeferredValue(search);

  useEffect(() => {
    void (async () => {
      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          search: deferredSearch,
          category,
          entityType,
          limit: "24",
          offset: "0",
        });

        const payload = await requestCatalog(params);
        if (requestId !== requestIdRef.current) {
          return;
        }

        startTransition(() => {
          setItems(payload.items);
          setTotal(payload.total);
          setLoading(false);
        });
      } catch (fetchError) {
        setLoading(false);
        setError(fetchError instanceof Error ? fetchError.message : "Unable to refresh the catalog.");
      }
    })();
  }, [category, entityType, deferredSearch]);

  return (
    <div className="catalog-shell">
      <aside className="catalog-sidebar">
        <p className="eyebrow">Explorer</p>
        <h2 className="text-3xl font-semibold text-ink-bright">Browse every visible project signal.</h2>
        <p className="text-base leading-7 text-ink-soft">
          Filter the scan output by project type and category, then jump into a detail view with evidence markers,
          metrics, relative path, and related work.
        </p>

        <label className="field-block">
          <span>Search</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search names, paths, stacks, or descriptions"
            className="field-input"
          />
        </label>

        <label className="field-block">
          <span>Category</span>
          <select value={category} onChange={(event) => setCategory(event.target.value)} className="field-input">
            <option value="all">All categories</option>
            {categories.map((value) => (
              <option key={value} value={value}>
                {value.replace(/-/g, " ")}
              </option>
            ))}
          </select>
        </label>

        <label className="field-block">
          <span>Entity type</span>
          <select value={entityType} onChange={(event) => setEntityType(event.target.value)} className="field-input">
            <option value="all">All entity types</option>
            {entityTypes.map((value) => (
              <option key={value} value={value}>
                {value.replace(/-/g, " ")}
              </option>
            ))}
          </select>
        </label>

        <div className="catalog-stat-block">
          <span>Total visible records</span>
          <strong>{total}</strong>
        </div>
      </aside>

      <div className="catalog-results">
        <div className="catalog-toolbar">
          <p>{loading ? "Refreshing catalog..." : `${items.length} loaded of ${total} visible records`}</p>
          {error ? <p className="text-[#f1a36f]">{error}</p> : null}
        </div>

        <div className="space-y-4">
          {items.map((project, index) => (
            <motion.article
              key={project.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(index * 0.02, 0.18), duration: 0.35 }}
              className="catalog-row"
            >
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <p className="eyebrow text-[0.7rem]">
                    {project.category.replace(/-/g, " ")} · {project.entityType.replace(/-/g, " ")}
                  </p>
                  {project.featured ? <span className="tech-badge">Featured</span> : null}
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-semibold text-ink-bright">{project.displayName}</h3>
                  <p className="text-base leading-7 text-ink-soft">{project.summary}</p>
                </div>
                <div className="feature-meta">
                  <span>{project.relativePath}</span>
                  <span>{project.languages.join(" · ") || "Mixed stack"}</span>
                  <span>{project.metrics.sourceFileCount} source files</span>
                </div>
              </div>
              <Link href={`/projects/${project.slug}`} className="action-link">
                Inspect
              </Link>
            </motion.article>
          ))}
        </div>

        {items.length < total ? (
          <button
            type="button"
            className="load-more-button"
            onClick={() => {
              void (async () => {
                const requestId = requestIdRef.current + 1;
                requestIdRef.current = requestId;
                setLoading(true);
                setError(null);

                try {
                  const params = new URLSearchParams({
                    search: deferredSearch,
                    category,
                    entityType,
                    limit: "24",
                    offset: String(items.length),
                  });

                  const payload = await requestCatalog(params);
                  if (requestId !== requestIdRef.current) {
                    return;
                  }

                  startTransition(() => {
                    setItems((current) => [...current, ...payload.items]);
                    setTotal(payload.total);
                    setLoading(false);
                  });
                } catch (fetchError) {
                  setLoading(false);
                  setError(fetchError instanceof Error ? fetchError.message : "Unable to load more projects.");
                }
              })();
            }}
            disabled={loading}
          >
            {loading ? "Loading..." : "Load more"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
