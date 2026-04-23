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
  await page.getByRole("heading", { name: /Project Manager turns/i }).waitFor();
  await page.screenshot({ path: path.join(outputDir, `home-${mode}.png`), fullPage: true });

  await page.goto(`${baseUrl}/projects`, { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: /Search the full visible catalog/i }).waitFor();
  await page.screenshot({ path: path.join(outputDir, `projects-${mode}.png`), fullPage: true });

  const firstProjectLink = page.locator('a[href^="/projects/"]').filter({ hasText: /./ }).first();
  const href = await firstProjectLink.getAttribute("href");

  if (!href) {
    throw new Error(`No project detail link found in ${mode} mode.`);
  }

  await page.goto(`${baseUrl}${href}`, { waitUntil: "networkidle" });
  await page.getByText(/What the scan can honestly say about this project/i).waitFor();
  await page.screenshot({ path: path.join(outputDir, `detail-${mode}.png`), fullPage: true });

  await context.close();
  await browser.close();

  return { href, engine };
}

async function main() {
  const baseUrl = process.argv[2] ?? process.env.UI_VERIFY_BASE_URL ?? "http://localhost:3105";
  const desktopDetail = await verifyViewport(baseUrl, "desktop");
  const mobileDetail = await verifyViewport(baseUrl, "mobile");

  console.log(
    JSON.stringify(
      {
        baseUrl,
        desktopDetail: desktopDetail.href,
        mobileDetail: mobileDetail.href,
        browserEngine: desktopDetail.engine,
        artifactDir: "artifacts/ui-verification",
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
