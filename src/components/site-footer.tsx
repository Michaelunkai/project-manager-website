export function SiteFooter() {
  return (
    <footer className="border-t border-white/10 bg-[rgba(7,8,10,0.92)]">
      <div className="shell flex flex-col gap-5 py-10 text-sm text-ink-soft md:flex-row md:items-end md:justify-between">
        <div className="max-w-2xl space-y-2">
          <p className="eyebrow">Project Manager</p>
          <p>
            Built as a hiring-facing explorer over the full `F:/study` hierarchy. Search, filter, and detail views all
            read from a generated SQLite catalog seeded from the local scan artifacts committed in this repository.
          </p>
        </div>
        <div className="space-y-2 text-right">
          <a href="/inventory/coverage.jsonl" target="_blank" rel="noreferrer" className="block">
            Coverage ledger
          </a>
          <a href="/inventory/exclusions.json" target="_blank" rel="noreferrer" className="block">
            Exclusions ledger
          </a>
        </div>
      </div>
    </footer>
  );
}
