import Link from "next/link";
import { notFound } from "next/navigation";

import { ProjectFingerprint } from "@/components/project-fingerprint";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getProjectBySlug, getRelatedProjects } from "@/lib/catalog";

function formatTimestamp(value: string | null) {
  if (!value) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(value));
}

export default async function ProjectDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);

  if (!project) {
    notFound();
  }

  const related = await getRelatedProjects(project, 3);

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <section className="section-frame pt-14">
          <div className="shell detail-hero">
            <div className="space-y-7">
              <p className="eyebrow">
                {project.discipline} · {project.category.replace(/-/g, " ")}
              </p>

              <div className="space-y-4">
                <h1 className="hero-title text-left text-5xl md:text-6xl">{project.displayName}</h1>
                <p className="showcase-spotlight max-w-4xl">{project.spotlight}</p>
                <p className="hero-copy max-w-4xl">{project.summary}</p>
              </div>

              <div className="feature-meta">
                <span>{project.relativePath}</span>
                <span>{project.metrics.sourceFileCount} source files</span>
                <span>Updated {formatTimestamp(project.metrics.lastModifiedAt)}</span>
              </div>

              <div className="project-actions">
                <Link href="/projects" className="secondary-action">
                  Back to projects
                </Link>
                <a href={project.repoUrl} target="_blank" rel="noreferrer" className="hero-action">
                  GitHub repository
                </a>
                {project.liveUrl ? (
                  <a href={project.liveUrl} target="_blank" rel="noreferrer" className="subtle-link">
                    {project.liveLabel}
                  </a>
                ) : null}
              </div>
            </div>

            <aside className="detail-sidecar">
              <ProjectFingerprint project={project} />
              <div className="proof-grid">
                <div className="proof-link">
                  <span>Category</span>
                  <strong>{project.category.replace(/-/g, " ")}</strong>
                </div>
                <div className="proof-link">
                  <span>Entity type</span>
                  <strong>{project.entityType.replace(/-/g, " ")}</strong>
                </div>
                <div className="proof-link">
                  <span>Confidence</span>
                  <strong>{project.confidence}</strong>
                </div>
                <div className="proof-link">
                  <span>Evidence score</span>
                  <strong>{project.metrics.evidenceScore}</strong>
                </div>
              </div>
            </aside>
          </div>
        </section>

        <section className="section-frame border-t border-white/10">
          <div className="shell detail-columns">
            <div className="section-heading-block">
              <p className="eyebrow">Why It’s Public</p>
              <h2 className="section-title">Why this project earns a public slot.</h2>
              <p className="section-copy">{project.description}</p>
            </div>

            <div className="proof-list detail-proof-list">
              {project.proofPoints.map((proofPoint) => (
                <p key={proofPoint}>{proofPoint}</p>
              ))}
            </div>
          </div>
        </section>

        <section className="section-frame border-t border-white/10">
          <div className="shell detail-columns">
            <div className="section-heading-block">
              <p className="eyebrow">Technical Footprint</p>
              <h2 className="section-title">The scan-backed technical shape of the work.</h2>
            </div>

            <div className="proof-grid">
              <div className="proof-link">
                <span>Technologies</span>
                <strong>{project.technologies.join(", ") || "No framework inference"}</strong>
              </div>
              <div className="proof-link">
                <span>Languages</span>
                <strong>{project.languages.join(", ") || "Mixed stack"}</strong>
              </div>
              <div className="proof-link">
                <span>Manifests</span>
                <strong>{project.metrics.manifests.join(", ") || "No manifest list"}</strong>
              </div>
              <div className="proof-link">
                <span>Markers</span>
                <strong>{project.markers.length} direct evidence markers captured by the scan.</strong>
              </div>
            </div>
          </div>
        </section>

        <section className="section-frame border-t border-white/10">
          <div className="shell detail-columns">
            <div className="section-heading-block">
              <p className="eyebrow">Evidence</p>
              <h2 className="section-title">Markers tied directly to the raw scan.</h2>
            </div>

            <div className="space-y-4">
              {project.markers.map((marker) => (
                <div key={`${marker.type}-${marker.file}`} className="catalog-row">
                  <div className="space-y-2">
                    <p className="eyebrow text-[0.7rem]">{marker.type.replace(/-/g, " ")}</p>
                    <p className="text-base text-ink-bright">{marker.file}</p>
                    {marker.detail ? <p className="text-sm text-ink-soft">{marker.detail}</p> : null}
                  </div>
                  <span className="text-sm uppercase tracking-[0.2em] text-ink-soft">{marker.source}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="section-frame border-t border-white/10">
          <div className="shell space-y-8">
            <div className="section-heading-block">
              <p className="eyebrow">Related Work</p>
              <h2 className="section-title">More curated projects from the same portfolio.</h2>
            </div>

            <div className="showcase-grid">
              {related.map((item) => (
                <article key={item.id} className="showcase-card compact-showcase-card">
                  <div className="space-y-3">
                    <p className="eyebrow">
                      {item.discipline} · {item.category.replace(/-/g, " ")}
                    </p>
                    <h3 className="showcase-title text-3xl">{item.displayName}</h3>
                    <p className="showcase-copy">{item.summary}</p>
                  </div>

                  <div className="project-actions">
                    <Link href={`/projects/${item.slug}`} className="secondary-action">
                      Open case study
                    </Link>
                    <a href={item.repoUrl} target="_blank" rel="noreferrer" className="subtle-link">
                      GitHub
                    </a>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
