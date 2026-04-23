import { ExplorerShell } from "@/components/explorer-shell";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { listProjects } from "@/lib/catalog";

export default async function ProjectsPage() {
  const catalog = await listProjects({ limit: 24, offset: 0 });

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <section className="section-frame pt-14">
          <div className="shell page-intro">
            <p className="eyebrow">Curated Projects</p>
            <h1 className="section-title max-w-5xl">Browse the curated showcase, not the folder noise.</h1>
            <p className="section-copy max-w-3xl">
              This explorer is intentionally selective. The full raw inventory still exists as proof, but the public
              browsing surface now shows only the projects worth putting in front of a hiring manager.
            </p>
          </div>

          <div className="shell">
            <ExplorerShell
              initialItems={catalog.items}
              initialTotal={catalog.total}
              categories={catalog.categories}
              entityTypes={catalog.entityTypes}
            />
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
