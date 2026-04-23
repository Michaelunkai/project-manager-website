import { mkdir } from "node:fs/promises";
import path from "node:path";

import { chromium, devices } from "@playwright/test";

async function launchVerificationBrowser() {
  try {
    const browser = await chromium.launch({
      channel: "chrome",
      headless: true,
    });

    return { browser, engine: "chrome" as const };
  } catch (error) {
    console.warn(
      `[verify:ui] Chrome channel unavailable, falling back to managed Chromium: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );

    const browser = await chromium.launch({
      headless: true,
    });

    return { browser, engine: "chromium" as const };
  }
}

async function verifyViewport(baseUrl: string, mode: "desktop" | "mobile") {
  const { browser, engine } = await launchVerificationBrowser();

  const context =
    mode === "mobile"
      ? await browser.newContext({
          ...devices["iPhone 13"],
        })
      : await browser.newContext({
          viewport: { width: 1440, height: 1100 },
        });

  const page = await context.newPage();
  const outputDir = path.join(process.cwd(), "artifacts", "ui-verification");
  await mkdir(outputDir, { recursive: true });

  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.getByRole("heading", {
    name: /Selected work backed by real repositories, real demos, and real scan proof/i,
  }).waitFor();
  await page.getByLabel("GitHub repository").waitFor();
  await page.screenshot({ path: path.join(outputDir, `home-${mode}.png`), fullPage: true });

  await page.goto(`${baseUrl}/projects`, { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: /Browse the curated showcase, not the folder noise/i }).waitFor();
  await page.screenshot({ path: path.join(outputDir, `projects-${mode}.png`), fullPage: true });

  const firstProjectLink = page.locator('a[href^="/projects/"]').filter({ hasText: /case study|open/i }).first();
  const href = await firstProjectLink.getAttribute("href");

  if (!href) {
    throw new Error(`No project detail link found in ${mode} mode.`);
  }

  await page.goto(`${baseUrl}${href}`, { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: /Why this project earns a public slot/i }).waitFor();
  await page.locator("main").getByRole("link", { name: /GitHub repository/i }).waitFor();
  await page.screenshot({ path: path.join(outputDir, `detail-${mode}.png`), fullPage: true });

  await context.close();
  await browser.close();

  return { href, engine };
}

async function main() {
  const baseUrl = process.argv[2] ?? process.env.UI_VERIFY_BASE_URL ?? "http://localhost:3105";
  const desktopDetail = await verifyViewport(baseUrl, "desktop");
  const mobileDetail = await verifyViewport(baseUrl, "mobile");

  process.stdout.write(
    `${JSON.stringify(
      {
        baseUrl,
        desktopDetail: desktopDetail.href,
        mobileDetail: mobileDetail.href,
        browserEngine: desktopDetail.engine,
        artifactDir: "artifacts/ui-verification",
      },
      null,
      2,
    )}\n`,
  );
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
