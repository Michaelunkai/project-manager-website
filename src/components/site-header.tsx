import Link from "next/link";

const REPO_URL = "https://github.com/Michaelunkai/project-manager-website";

function GitHubMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 2C6.48 2 2 6.58 2 12.22c0 4.51 2.87 8.34 6.84 9.69.5.1.68-.22.68-.49 0-.24-.01-1.03-.01-1.87-2.78.62-3.37-1.21-3.37-1.21-.46-1.19-1.12-1.51-1.12-1.51-.91-.64.07-.63.07-.63 1 .07 1.53 1.05 1.53 1.05.9 1.56 2.35 1.11 2.92.85.09-.67.35-1.11.63-1.37-2.22-.26-4.56-1.14-4.56-5.05 0-1.12.39-2.03 1.03-2.74-.1-.26-.45-1.31.1-2.74 0 0 .84-.28 2.75 1.04A9.3 9.3 0 0 1 12 6.84c.85 0 1.71.12 2.51.35 1.91-1.32 2.75-1.04 2.75-1.04.55 1.43.2 2.48.1 2.74.64.71 1.03 1.62 1.03 2.74 0 3.92-2.35 4.79-4.59 5.05.36.32.68.94.68 1.9 0 1.37-.01 2.47-.01 2.8 0 .27.18.59.69.49A10.25 10.25 0 0 0 22 12.22C22 6.58 17.52 2 12 2Z"
      />
    </svg>
  );
}

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="shell header-shell">
        <Link href="/" className="brand-lockup">
          <span className="brand-mark" />
          <span className="brand-copy">
            <span className="brand-title">Project Manager</span>
            <span className="brand-subtitle">Curated engineering work, backed by raw scan proof</span>
          </span>
        </Link>

        <div className="header-actions">
          <nav className="site-nav" aria-label="Primary">
            <Link href="/#featured">Showcase</Link>
            <Link href="/projects">Projects</Link>
            <Link href="/#proof">Proof</Link>
            <a href="/inventory/projects.json" target="_blank" rel="noreferrer">
              Inventory
            </a>
          </nav>

          <a
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
            aria-label="GitHub repository"
            className="repo-icon-link"
          >
            <GitHubMark />
            <span>GitHub</span>
          </a>
        </div>
      </div>
    </header>
  );
}
