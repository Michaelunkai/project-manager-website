import Link from "next/link";

import { FeaturedProjects } from "@/components/featured-projects";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getFeaturedProjects, getInventorySummary } from "@/lib/catalog";

export default async function HomePage() {
  const [summary, featuredProjects] = await Promise.all([getInventorySummary(), getFeaturedProjects(6)]);
  const liveProjectCount = featuredProjects.filter((project) => project.liveUrl).length;

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <section className="hero-panel">
          <div className="hero-glow hero-glow-a" />
          <div className="hero-glow hero-glow-b" />
          <div className="shell hero-grid">
            <div className="space-y-8">
              <p className="eyebrow">Hiring-facing engineering portfolio</p>
              <div className="space-y-5">
                <h1 className="hero-title">Selected work backed by real repositories, real demos, and real scan proof.</h1>
                <p className="hero-copy">
                  This portfolio no longer dumps the raw folder tree into the public UI. The front page is manually
                  curated so only strong, legitimate projects remain visible, while the raw scan artifacts stay public
                  for verification.
                </p>
              </div>

              <div className="hero-actions">
                <Link href="/projects" className="hero-action">
                  Browse curated projects
                </Link>
                <a href="#proof" className="secondary-action">
                  Open proof surfaces
                </a>
              </div>
            </div>

            <div className="hero-scorecard">
              <div>
                <span>Public case studies</span>
                <strong>{featuredProjects.length}</strong>
              </div>
              <div>
                <span>Repo-backed entries</span>
                <strong>{featuredProjects.length}</strong>
              </div>
              <div>
                <span>Live or download links</span>
                <strong>{liveProjectCount}</strong>
              </div>
              <div>
                <span>Raw visible records scanned</span>
                <strong>{summary.projectCount}</strong>
              </div>
              <div>
                <span>Directories scanned</span>
                <strong>{summary.scannedDirectoryCount}</strong>
              </div>
              <div>
                <span>Noise paths pruned</span>
                <strong>{summary.prunedDirectoryCount}</strong>
              </div>
            </div>
          </div>
        </section>

        <FeaturedProjects projects={featuredProjects} />

        <section className="section-frame border-t border-white/10">
          <div className="shell trust-grid">
            <div className="section-heading-block">
              <p className="eyebrow">Trust Signals</p>
              <h2 className="section-title">The public UI is selective. The evidence stays inspectable.</h2>
              <p className="section-copy">
                The site now separates hiring-facing presentation from raw machine-generated inventory so legitimacy
                improves without hiding the underlying scan.
              </p>
            </div>

            <div className="proof-grid">
              <div className="proof-link">
                <span>Manual curation</span>
                <strong>Only the strongest case studies stay in the recruiter-facing surface.</strong>
              </div>
              <div className="proof-link">
                <span>Link integrity</span>
                <strong>Every showcased project has a working internal page and an explicit GitHub destination.</strong>
              </div>
              <div className="proof-link">
                <span>Raw evidence</span>
                <strong>The full scan summary, exclusions, coverage, and inventory remain publicly inspectable.</strong>
              </div>
              <div className="proof-link">
                <span>Deployment safety</span>
                <strong>The portfolio now serves from bundled generated data instead of a fragile runtime-only path.</strong>
              </div>
            </div>
          </div>
        </section>

        <section id="proof" className="section-frame border-t border-white/10">
          <div className="shell proof-layout">
            <div className="section-heading-block">
              <p className="eyebrow">Proof Files</p>
              <h2 className="section-title">The raw scan remains open for inspection.</h2>
              <p className="section-copy">
                These files are the machine-generated inventory surfaces behind the portfolio. They remain public so the
                curated UI can be checked against the source evidence.
              </p>
            </div>

            <div className="proof-grid">
              <a href="/inventory/scan-summary.json" target="_blank" rel="noreferrer" className="proof-link">
                <span>Scan summary</span>
                <strong>{summary.projectCount} visible records with zero read errors.</strong>
              </a>
              <a href="/inventory/projects.json" target="_blank" rel="noreferrer" className="proof-link">
                <span>Project inventory</span>
                <strong>The raw JSON export for the full scanned catalog.</strong>
              </a>
              <a href="/inventory/exclusions.json" target="_blank" rel="noreferrer" className="proof-link">
                <span>Exclusions</span>
                <strong>{summary.exclusionCount} excluded paths with explicit reasons.</strong>
              </a>
              <a href="/inventory/coverage.jsonl" target="_blank" rel="noreferrer" className="proof-link">
                <span>Coverage ledger</span>
                <strong>{summary.scannedDirectoryCount} visited directories logged by relative path.</strong>
              </a>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
