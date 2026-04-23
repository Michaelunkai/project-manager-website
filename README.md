# Project Manager Website

Hiring-facing full-stack portfolio explorer for the entire `F:/study` tree.

Live site: https://project-manager-website-michaelunkai.netlify.app  
Repository: https://github.com/Michaelunkai/project-manager-website

## What It Does

This project turns the user's real `F:/study` workspace into a public, searchable catalog of work for employers, clients, and collaborators.

It does not fabricate projects, screenshots, technologies, or metrics. The site is built from committed scan artifacts and a committed SQLite catalog generated from the local filesystem. Featured work is selective, while the explorer exposes the broader catalog.

Current verified inventory snapshot:

- `projectCount`: `444`
- `featuredCount`: `6`
- `exclusionCount`: `233`
- `scannedDirectoryCount`: `22657`
- `prunedDirectoryCount`: `208`
- `errorCount`: `0`
- `generatedAt`: `2026-04-23T21:07:25.065Z`

## Stack

- `Next.js 16` App Router for the public UI, route handlers, and server rendering
- `React 19` for the client experience
- `TypeScript` for strict typing across scan, catalog, and API code
- `Tailwind CSS 4` and `Framer Motion` for the polished portfolio presentation
- `Zod` for query validation in the API layer
- `@libsql/client` over a committed local SQLite/libSQL database for the real catalog backend

Why this stack:

- Next.js App Router gives one codebase for landing pages, explorer pages, and API endpoints.
- SQLite keeps the catalog queryable as real application data instead of flattening everything into static markdown.
- The committed artifacts make the inventory auditable and reproducible.
- Tailwind and Framer Motion keep the UI intentionally presentational without turning the project into a fake dashboard.

## Architecture

1. `scripts/scan-study.ts` walks the full `F:/study` hierarchy.
2. `src/lib/scan.ts` classifies projects, derives cautious metadata, and writes generated outputs.
3. Generated artifacts are written under `data/generated/`.
4. Public proof artifacts are mirrored under `public/inventory/`.
5. `src/lib/catalog.ts` opens the generated SQLite database and serves the app/backend queries.
6. `src/app/api/projects/*` exposes the catalog through validated route handlers.
7. `src/app/*` renders the landing page, explorer, and project detail views.

## Inventory Artifacts

Generated backend artifacts:

- `data/generated/project-catalog.db`
- `data/generated/projects.json`
- `data/generated/scan-summary.json`
- `data/generated/exclusions.json`
- `data/generated/coverage.jsonl`

Public proof artifacts:

- `public/inventory/projects.json`
- `public/inventory/scan-summary.json`
- `public/inventory/exclusions.json`
- `public/inventory/coverage.jsonl`

The site only exposes relative paths under `F:/study`. It does not expose local absolute machine paths.

## Environment Variables

No environment variables are currently required for local development, scanning, verification, or the live deployment.

## Local Setup

```bash
npm install
npm run scan
npm run typecheck
npm run lint
npm run test
```

Run the app locally:

```bash
npm run dev
```

## Refreshing The Catalog

Whenever the `F:/study` workspace changes materially, rerun:

```bash
npm run scan
```

That refreshes both:

- the generated database and JSON artifacts under `data/generated/`
- the public proof artifacts under `public/inventory/`

## Local Production Verification

The honest local production path on this machine is an NTFS mirror, not the original `F:` drive.

Why:

- `F:` is `exFAT`
- `next build --webpack` on `F:` hit the verified filesystem error `EISDIR: illegal operation on a directory, readlink ... src\\app\\api\\projects\\[slug]\\route.ts`

Use an NTFS mirror such as:

- `C:\Users\micha\AppData\Local\Temp\project-manager-website-ntfs`

Then run:

```bash
npm install
npm run build
npm run start -- --port 41337 --hostname 127.0.0.1
npm run verify:ui -- http://127.0.0.1:41337
```

`scripts/verify-ui.ts` verifies:

- the home heading
- the explorer heading
- the project detail proof heading
- desktop and mobile screenshots under `artifacts/ui-verification`

The UI verifier now prefers the local Chrome channel when available and falls back to Playwright-managed Chromium when Chrome is missing.

## Deployment

Current production host:

- Netlify
- https://project-manager-website-michaelunkai.netlify.app

Why Netlify is the live host:

- Vercel was tested first.
- The linked Vercel project initially used the wrong framework preset.
- After the repo-side fix, the account hit the free-plan deployment limit for the day.
- Netlify successfully serves the Next.js App Router app with route handlers.

### Windows Netlify Deploy Flow

For manual deploys from this Windows machine:

1. Work from an NTFS mirror, not directly from `F:`.
2. Install dependencies.
3. Run the Netlify runtime prep script so the Linux libsql native package is present in `node_modules`.
4. Deploy with Netlify CLI.

Commands:

```bash
npm install
npm run netlify:prep
npx netlify link --name project-manager-website-michaelunkai
npx netlify deploy --prod --skip-functions-cache
```

Why `netlify:prep` exists:

- manual Netlify CLI deploys from Windows bundle a Windows-built function tree
- the API runtime needs the Linux native package `@libsql/linux-x64-gnu`
- `scripts/prepare-netlify-runtime.ps1` vendors that package into `node_modules` before deploy

If you deploy from Linux CI or another Linux build environment, this workaround should not be necessary.

## Security And Delivery Notes

- `next.config.ts` sets security headers including CSP, `X-Frame-Options`, and `X-Content-Type-Options`
- the catalog API applies input validation and simple in-memory rate limiting
- generated inventory and database files are explicitly included in build tracing so they ship with the app

## Verified Checks

These checks were run successfully against the current state:

```bash
npm run scan
npm run typecheck
npm run lint
npm run test
npm run verify:ui -- http://127.0.0.1:41337
npm run verify:ui -- https://project-manager-website-michaelunkai.netlify.app
```

Live production verification also confirmed:

- `GET /` renders the portfolio landing page
- `GET /projects` renders the explorer
- `GET /api/projects?limit=1` returns catalog data
- `GET /api/projects/<slug>` returns project detail data
- desktop and mobile verification both reached the same live detail page successfully

## Honest Caveats

- Local production builds on the source `F:` drive remain unreliable because of the verified `exFAT` filesystem behavior with Next.js build output.
- The live Netlify deployment is healthy, but reproducing a manual Windows deploy requires the `netlify:prep` step because the backend depends on the Linux libsql native runtime package.
