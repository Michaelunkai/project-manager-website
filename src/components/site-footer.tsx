export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="shell footer-shell">
        <div className="space-y-3">
          <p className="eyebrow">Project Manager</p>
          <p className="footer-copy">
            The public UI is manually curated for legitimacy. The raw scan artifacts remain public so the portfolio can
            still prove what was scanned, what was excluded, and where each showcased project comes from.
          </p>
        </div>

        <div className="footer-links">
          <a href="/inventory/projects.json" target="_blank" rel="noreferrer">
            Project inventory JSON
          </a>
          <a href="/inventory/scan-summary.json" target="_blank" rel="noreferrer">
            Scan summary
          </a>
          <a href="/inventory/exclusions.json" target="_blank" rel="noreferrer">
            Exclusions ledger
          </a>
          <a href="/inventory/coverage.jsonl" target="_blank" rel="noreferrer">
            Coverage ledger
          </a>
        </div>
      </div>
    </footer>
  );
}
