import Link from "next/link";

import type { ProjectRecord } from "@/lib/inventory";

import { ProjectFingerprint } from "./project-fingerprint";

export function FeaturedProjects({ projects }: { projects: ProjectRecord[] }) {
  return (
    <section id="featured" className="section-frame">
      <div className="shell">
        <div className="section-heading-block">
          <p className="eyebrow">Featured Work</p>
          <h2 className="section-title">The first pass through the catalog favors projects with real depth, docs, and signal.</h2>
          <p className="section-copy">
            Featured entries are chosen automatically from scan evidence, repository metadata, documentation quality, and
            path quality. The full catalog stays broader than this section.
          </p>
        </div>

        <div className="mt-12 space-y-10">
          {projects.map((project, index) => (
            <article
              key={project.id}
              className="featured-rail"
              data-flip={index % 2 === 1 ? "true" : "false"}
            >
              <div className="space-y-5">
                <p className="feature-index">{String(index + 1).padStart(2, "0")}</p>
                <div className="space-y-4">
                  <p className="eyebrow">{project.category.replace(/-/g, " ")} · {project.entityType.replace(/-/g, " ")}</p>
                  <h3 className="feature-title">{project.displayName}</h3>
                  <p className="feature-copy">{project.summary}</p>
                </div>

                <div className="feature-meta">
                  <span>{project.relativePath}</span>
                  <span>{project.languages.slice(0, 3).join(" · ") || "Mixed stack"}</span>
                  <span>{project.metrics.sourceFileCount} source files tracked</span>
                </div>

                <div className="flex flex-wrap gap-3 text-sm text-ink-soft">
                  {project.technologies.slice(0, 5).map((technology) => (
                    <span key={technology} className="tech-badge">
                      {technology}
                    </span>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-4 pt-2">
                  <Link href={`/projects/${project.slug}`} className="action-link">
                    Open project
                  </Link>
                  {project.links[0] ? (
                    <a href={project.links[0].href} target="_blank" rel="noreferrer" className="subtle-link">
                      Visit source
                    </a>
                  ) : null}
                </div>
              </div>

              <ProjectFingerprint project={project} />
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
