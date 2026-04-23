import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="shell flex flex-wrap items-center justify-between gap-4 py-5">
        <Link href="/" className="brand-lockup">
          <span className="brand-mark" />
          <span className="brand-copy">
            <span className="brand-title">Project Manager</span>
            <span className="brand-subtitle">A live atlas of work from the full study tree</span>
          </span>
        </Link>

        <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm uppercase tracking-[0.2em] text-ink-soft">
          <Link href="/#featured">Featured</Link>
          <Link href="/projects">All Projects</Link>
          <Link href="/#proof">Scan Proof</Link>
          <a href="/inventory/scan-summary.json" target="_blank" rel="noreferrer">
            Inventory JSON
          </a>
        </nav>
      </div>
    </header>
  );
}
