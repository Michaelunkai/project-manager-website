import Link from "next/link";

import { FeaturedProjects } from "@/components/featured-projects";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getFeaturedProjects, getInventorySummary, listProjects } from "@/lib/catalog";

export default async function HomePage() {
  const [summary, featuredProjects, catalogPreview] = await Promise.all([
    getInventorySummary(),
    getFeaturedProjects(6),
    listProjects({ limit: 8 }),
  ]);

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <section className="hero-panel">
          <div className="hero-orbit hero-orbit-a" />
          <div className="hero-orbit hero-orbit-b" />
          <div className="shell relative z-10 grid gap-16 py-20 lg:grid-cols-[1.2fr_0.8fr] lg:items-end lg:py-28">
            <div className="space-y-8">
              <p className="eyebrow">Hiring-facing project explorer</p>
              <div className="space-y-5">
                <h1 className="hero-title">
                  Project Manager turns an entire local engineering tree into a public, searchable body of proof.
                </h1>
                <p className="hero-copy">
                  This site is built from a recursive scan of the full `F:/study` hierarchy. Every visible entry comes
                  from local evidence: manifests, git metadata, notebooks, source trees, launch scripts, and docs.
                </p>
              </div>

              <div className="flex flex-wrap gap-4">
                <Link href="/projects" className="hero-action">
                  Browse all projects
                </Link>
                <a href="#proof" className="subtle-link">
                  See scan proof
                </a>
              </div>
            </div>

            <div className="hero-metrics">
              <div>
                <span>Visible records</span>
                <strong>{summary.projectCount}</strong>
              </div>
              <div>
                <span>Directories scanned</span>
                <strong>{summary.scannedDirectoryCount}</strong>
              </div>
              <div>
                <span>Pruned noise paths</span>
                <strong>{summary.prunedDirectoryCount}</strong>
              </div>
              <div>
                <span>Featured set</span>
                <strong>{summary.featuredCount}</strong>
              </div>
            </div>
          </div>
        </section>

        <FeaturedProjects projects={featuredProjects} />

        <section className="section-frame">
          <div className="shell grid gap-14 lg:grid-cols-[0.8fr_1.2fr]">
            <div className="section-heading-block">
              <p className="eyebrow">Catalog Preview</p>
              <h2 className="section-title">The landing page stays selective. The catalog does not.</h2>
              <p className="section-copy">
                Any project record surfaced by the scan remains discoverable in the explorer. Featured work is curated by
                evidence score; the broader catalog is where breadth becomes visible.
              </p>
              <Link href="/projects" className="action-link">
                Open the explorer
              </Link>
            </div>

            <div className="space-y-4">
              {catalogPreview.items.map((project) => (
                <Link key={project.id} href={`/projects/${project.slug}`} className="catalog-row">
                  <div className="space-y-3">
                    <p className="eyebrow text-[0.7rem]">
                      {project.category.replace(/-/g, " ")} · {project.entityType.replace(/-/g, " ")}
                    </p>
                    <div className="space-y-2">
                      <h3 className="text-2xl font-semibold text-ink-bright">{project.displayName}</h3>
                      <p className="text-base leading-7 text-ink-soft">{project.summary}</p>
                    </div>
                  </div>
                  <span className="subtle-link">View</span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section id="proof" className="section-frame border-t border-white/10">
          <div className="shell grid gap-10 lg:grid-cols-[1fr_1fr]">
            <div className="section-heading-block">
              <p className="eyebrow">Scan Proof</p>
              <h2 className="section-title">The inventory stays inspectable, not mystical.</h2>
              <p className="section-copy">
                The repo includes a coverage ledger, exclusion ledger, summary report, JSON catalog export, and the
                generated SQLite database used by the site.
              </p>
            </div>

            <div className="proof-grid">
              <a href="/inventory/scan-summary.json" target="_blank" rel="noreferrer" className="proof-link">
                <span>Scan summary</span>
                <strong>{summary.projectCount} visible records with zero read errors</strong>
              </a>
              <a href="/inventory/projects.json" target="_blank" rel="noreferrer" className="proof-link">
                <span>Project catalog</span>
                <strong>Committed JSON export of the included records</strong>
              </a>
              <a href="/inventory/exclusions.json" target="_blank" rel="noreferrer" className="proof-link">
                <span>Exclusions</span>
                <strong>{summary.exclusionCount} excluded paths with explicit reasons</strong>
              </a>
              <a href="/inventory/coverage.jsonl" target="_blank" rel="noreferrer" className="proof-link">
                <span>Coverage ledger</span>
                <strong>{summary.scannedDirectoryCount} visited directories logged by relative path</strong>
              </a>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
