"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { startTransition, useDeferredValue, useEffect, useRef, useState } from "react";

import type { PortfolioProject } from "@/lib/showcase";

interface ExplorerShellProps {
  initialItems: PortfolioProject[];
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
    items: PortfolioProject[];
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
  }, [category, deferredSearch, entityType]);

  return (
    <div className="catalog-shell">
      <aside className="catalog-sidebar">
        <div className="space-y-4">
          <p className="eyebrow">Showcase Filters</p>
          <h2 className="sidebar-title">Search the curated portfolio instead of every folder in the drive.</h2>
          <p className="sidebar-copy">
            The recruiter-facing API only returns the manually selected showcase set. The full raw scan still lives in
            the public inventory files for proof.
          </p>
        </div>

        <label className="field-block">
          <span>Search</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search domains, stacks, or project names"
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
          <span>Visible case studies</span>
          <strong>{total}</strong>
        </div>
      </aside>

      <div className="catalog-results">
        <div className="catalog-toolbar">
          <p>{loading ? "Refreshing showcase..." : `${items.length} loaded of ${total} public case studies`}</p>
          {error ? <p className="text-[#f1a36f]">{error}</p> : null}
        </div>

        <div className="showcase-list">
          {items.map((project, index) => (
            <motion.article
              key={project.id}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(index * 0.03, 0.18), duration: 0.35 }}
              className="showcase-list-card"
            >
              <div className="space-y-4">
                <div className="showcase-card-head">
                  <p className="eyebrow">
                    {project.discipline} · {project.category.replace(/-/g, " ")}
                  </p>
                  <span className="status-pill">{project.liveUrl ? "Live link" : "Repository link"}</span>
                </div>

                <div className="space-y-3">
                  <h3 className="showcase-title">{project.displayName}</h3>
                  <p className="showcase-spotlight">{project.spotlight}</p>
                  <p className="showcase-copy">{project.summary}</p>
                </div>

                <div className="showcase-meta">
                  <span>{project.relativePath}</span>
                  <span>{project.metrics.sourceFileCount} source files</span>
                  <span>{project.languages.slice(0, 3).join(" · ") || "Mixed stack"}</span>
                </div>

                <div className="tech-row">
                  {project.technologies.slice(0, 5).map((technology) => (
                    <span key={technology} className="tech-badge">
                      {technology}
                    </span>
                  ))}
                </div>

                <div className="proof-list compact-proof-list">
                  {project.proofPoints.map((proofPoint) => (
                    <p key={proofPoint}>{proofPoint}</p>
                  ))}
                </div>
              </div>

              <div className="project-actions">
                <Link href={`/projects/${project.slug}`} className="hero-action">
                  Open case study
                </Link>
                <a href={project.repoUrl} target="_blank" rel="noreferrer" className="secondary-action">
                  GitHub
                </a>
                {project.liveUrl ? (
                  <a href={project.liveUrl} target="_blank" rel="noreferrer" className="subtle-link">
                    {project.liveLabel}
                  </a>
                ) : null}
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </div>
  );
}
