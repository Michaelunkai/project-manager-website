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

  const related = await getRelatedProjects(project, 4);

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <section className="section-frame pt-14">
          <div className="shell grid gap-14 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-7">
              <p className="eyebrow">
                {project.category.replace(/-/g, " ")} · {project.entityType.replace(/-/g, " ")}
              </p>
              <div className="space-y-4">
                <h1 className="hero-title text-left text-5xl md:text-6xl">{project.displayName}</h1>
                <p className="hero-copy max-w-3xl">{project.summary}</p>
              </div>

              <div className="feature-meta">
                <span>{project.relativePath}</span>
                <span>{project.metrics.sourceFileCount} source files</span>
                <span>Updated {formatTimestamp(project.metrics.lastModifiedAt)}</span>
              </div>

              <div className="flex flex-wrap gap-4">
                <Link href="/projects" className="subtle-link">
                  Back to explorer
                </Link>
                {project.links[0] ? (
                  <a href={project.links[0].href} target="_blank" rel="noreferrer" className="action-link">
                    Visit repository
                  </a>
                ) : null}
              </div>
            </div>

            <div className="detail-sidecar">
              <ProjectFingerprint project={project} />
              <div className="proof-grid">
                <div className="proof-link">
                  <span>Summary source</span>
                  <strong>{project.summarySource}</strong>
                </div>
                <div className="proof-link">
                  <span>Description source</span>
                  <strong>{project.descriptionSource}</strong>
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
            </div>
          </div>
        </section>

        <section className="section-frame border-t border-white/10">
          <div className="shell grid gap-14 lg:grid-cols-[0.8fr_1.2fr]">
            <div className="section-heading-block">
              <p className="eyebrow">Project Story</p>
              <h2 className="section-title">What the scan can honestly say about this project.</h2>
            </div>
            <div className="space-y-8">
              <p className="text-lg leading-8 text-ink-soft">{project.description}</p>
              <div className="proof-grid">
                <div className="proof-link">
                  <span>Status</span>
                  <strong>{project.statusLabel}</strong>
                </div>
                <div className="proof-link">
                  <span>Languages</span>
                  <strong>{project.languages.join(", ") || "Mixed stack"}</strong>
                </div>
                <div className="proof-link">
                  <span>Technologies</span>
                  <strong>{project.technologies.join(", ") || "No framework inference"}</strong>
                </div>
                <div className="proof-link">
                  <span>Manifests</span>
                  <strong>{project.metrics.manifests.join(", ") || "No manifest list"}</strong>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="section-frame border-t border-white/10">
          <div className="shell grid gap-14 lg:grid-cols-[0.8fr_1.2fr]">
            <div className="section-heading-block">
              <p className="eyebrow">Evidence</p>
              <h2 className="section-title">Markers and notes tied directly to the local scan.</h2>
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
              {project.notes.map((note) => (
                <p key={note} className="text-base leading-7 text-ink-soft">
                  {note}
                </p>
              ))}
            </div>
          </div>
        </section>

        <section className="section-frame border-t border-white/10">
          <div className="shell space-y-8">
            <div className="section-heading-block">
              <p className="eyebrow">Related Work</p>
              <h2 className="section-title">Neighboring projects surfaced from the same scan.</h2>
            </div>
            <div className="space-y-4">
              {related.map((item) => (
                <Link key={item.id} href={`/projects/${item.slug}`} className="catalog-row">
                  <div className="space-y-2">
                    <p className="eyebrow text-[0.7rem]">{item.category.replace(/-/g, " ")}</p>
                    <h3 className="text-2xl font-semibold text-ink-bright">{item.displayName}</h3>
                    <p className="text-base leading-7 text-ink-soft">{item.summary}</p>
                  </div>
                  <span className="subtle-link">Open</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
