import Link from "next/link";

import type { PortfolioProject } from "@/lib/showcase";

export function FeaturedProjects({ projects }: { projects: PortfolioProject[] }) {
  return (
    <section id="featured" className="section-frame">
      <div className="shell space-y-10">
        <div className="section-heading-block max-w-3xl">
          <p className="eyebrow">Selected Work</p>
          <h2 className="section-title">Only the projects that hold up under scrutiny make the public front page.</h2>
          <p className="section-copy">
            Every entry below has an internal case-study page, an explicit GitHub destination, and manual curation over
            the raw scan output so the public surface feels intentional instead of accidental.
          </p>
        </div>

        <div className="showcase-grid">
          {projects.map((project, index) => (
            <article key={project.id} className="showcase-card">
              <div className="showcase-card-head">
                <p className="eyebrow">
                  {String(index + 1).padStart(2, "0")} · {project.discipline}
                </p>
                <span className="status-pill">{project.liveUrl ? "Live-backed" : "Repo-backed"}</span>
              </div>

              <div className="space-y-4">
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

              <div className="proof-list">
                {project.proofPoints.map((proofPoint) => (
                  <p key={proofPoint}>{proofPoint}</p>
                ))}
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
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
