# Project Manager Website

Project Manager Website is a hiring-facing portfolio explorer built from a recursive scan of the `F:/study` hierarchy. It turns the user's real local work into a curated public showcase, project detail pages, public inventory ledgers, and API routes backed by committed generated artifacts.

Live site: `https://project-manager-website-michaelunkai.netlify.app`

GitHub repository: `https://github.com/Michaelunkai/project-manager-website`

## What This Project Does

- Scans the full `F:/study` tree and identifies visible projects without fabricating metadata.
- Stores the resulting catalog in committed JSON artifacts and a committed SQLite database.
- Serves a manually curated recruiter-facing showcase from bundled generated data so deployed detail/API routes stay reliable.
- Publishes public inventory proof files so visitors can inspect what was scanned, included, excluded, and why.

This is not a task manager app. It is a portfolio-quality project atlas for employers, clients, and collaborators.

## Stack And Why

- `Next.js 16` + `React 19` + App Router
  - Good fit for a mixed static/dynamic site with server-rendered detail pages and route handlers.
- `TypeScript`
  - Keeps the scan pipeline, API payloads, and UI models aligned.
- `Tailwind CSS 4` + `Framer Motion`
  - Used for a restrained, premium visual system and motion without heavy UI dependencies.
- `Zod`
  - Validates query input for the public API.
- `@libsql/client` + committed SQLite database
  - Preserves a committed proof database as part of the scan pipeline without requiring a separate hosted database.
- `Playwright` + `Vitest` + `ESLint`
  - Covers UI verification, unit coverage, and code quality checks.

## Architecture

### Scan pipeline

- `scripts/scan-study.ts`
  - Entry point for the recursive study-tree scan.
- `src/lib/scan.ts`
  - Walks the hierarchy, infers metadata from real files, prunes noise, and writes artifacts.
- `src/lib/inventory.ts`
  - Shared types, constants, and path rules for generated inventory data.

### Data outputs

- `data/generated/scan-summary.json`
  - Generated summary used for internal verification.
- `data/generated/projects.json`
  - Generated JSON catalog of included projects.
- `data/generated/exclusions.json`
  - Generated exclusion ledger.
- `data/generated/coverage.jsonl`
  - Generated directory-coverage ledger.
- `data/generated/project-catalog.db`
  - SQLite proof artifact generated alongside the public JSON exports.
- `public/inventory/*`
  - Public copies of the proof artifacts exposed by the deployed site.

### Runtime

- `src/lib/catalog.ts`
  - Reads bundled generated inventory data and returns the curated showcase, detail records, and related projects.
- `src/lib/showcase.ts`
  - Defines the manually curated recruiter-facing project set and its explicit repository/live links.
- `src/app/api/projects/route.ts`
  - Public listing API for the curated showcase with rate limiting and query validation.
- `src/app/api/projects/[slug]/route.ts`
  - Public detail API for a single curated project plus related work.
- `src/app/page.tsx`
  - Landing page with curated work, trust signals, and proof links.
- `src/app/projects/page.tsx`
  - Explorer page for the curated public case-study set.
- `src/app/projects/[slug]/page.tsx`
  - Detail page built from the same curated generated dataset.

## Environment Variables

No environment variables are required for the current app behavior.

The deployed runtime reads committed generated artifacts from the repository. Do not add secrets to the scan output, committed inventory files, or public inventory directory.

## Local Development

Install dependencies:

```bash
npm install
```

Start the dev server:

```bash
npm run dev
```

Quality checks:

```bash
npm run typecheck
npm run lint
npm run test
```

Regenerate the project inventory:

```bash
npm run scan
```

Run the UI verification script against a local or deployed site:

```bash
npm run verify:ui -- http://127.0.0.1:3105
```

## Updating The Catalog

1. Run `npm run scan`.
2. Review the generated files under `data/generated/`.
3. Confirm the public copies under `public/inventory/` were updated consistently.
4. Run `npm run typecheck`, `npm run lint`, and `npm run test`.
5. Verify the UI locally or against the deployed site with `npm run verify:ui -- <url>`.

The scanner intentionally stores relative paths under `F:/study` in public artifacts. It should not expose machine-specific absolute paths, secrets, or env files.
The public UI is intentionally more selective than the raw inventory. The raw proof files remain public even when the recruiter-facing showcase is curated manually.

## Verified Deployment Flow

The reliable deployment path on this machine is Netlify from an NTFS mirror, not from the original `F:` drive.

### Why

`F:` is `exFAT`, and local production builds on that drive are not reliable for this project. The verified workaround is to mirror the repo to an NTFS path first.

### Verified NTFS mirror path

```text
C:\Users\micha\AppData\Local\Temp\project-manager-website-ntfs
```

### Verified local production verification flow

```bash
# from the NTFS mirror
npm ci
npm run build
npm run start -- --port 3105 --hostname 127.0.0.1
npm run verify:ui -- http://127.0.0.1:3105
```

### Verified Netlify deployment flow

```bash
# from the NTFS mirror
npx netlify build --debug
npx netlify deploy --prod --no-build --dir .netlify/static --functions .netlify/functions --json --timeout 1800
```

Current public URL:

```text
https://project-manager-website-michaelunkai.netlify.app
```

## Inventory Proof Locations

Public URLs:

- `/inventory/scan-summary.json`
- `/inventory/projects.json`
- `/inventory/exclusions.json`
- `/inventory/coverage.jsonl`

Repo paths:

- `data/generated/scan-summary.json`
- `data/generated/projects.json`
- `data/generated/exclusions.json`
- `data/generated/coverage.jsonl`
- `data/generated/project-catalog.db`
- `public/inventory/scan-summary.json`
- `public/inventory/projects.json`
- `public/inventory/exclusions.json`
- `public/inventory/coverage.jsonl`

## Caveats

- Local production builds should be done from the NTFS mirror, not directly on `F:`.
- Immediately after a fresh hosted deploy, allow a brief propagation/warmup window before running final live verification.
- `artifacts/ui-verification/` is for verification output only and is intentionally not committed.
