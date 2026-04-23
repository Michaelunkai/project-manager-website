import Link from "next/link";

import { SiteHeader } from "@/components/site-header";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="flex flex-1 items-center justify-center px-6 py-20">
        <div className="max-w-2xl space-y-6 text-center">
          <p className="eyebrow">Not found</p>
          <h1 className="section-title">That project slug is not in the generated catalog.</h1>
          <p className="section-copy">
            The detail view only renders records present in the latest scan. Return to the explorer or open the raw
            inventory artifact directly.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/projects" className="hero-action">
              Back to explorer
            </Link>
            <a href="/inventory/projects.json" className="subtle-link" target="_blank" rel="noreferrer">
              Open inventory JSON
            </a>
          </div>
        </div>
      </main>
    </>
  );
}
