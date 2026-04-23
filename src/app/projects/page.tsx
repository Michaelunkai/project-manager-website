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
          <div className="shell pb-10">
            <p className="eyebrow">All Projects</p>
            <h1 className="section-title max-w-4xl">Search the full visible catalog across the `F:/study` hierarchy.</h1>
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
