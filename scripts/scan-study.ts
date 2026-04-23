import { scanStudyHierarchy } from "../src/lib/scan";

async function main() {
  const startedAt = Date.now();
  const result = await scanStudyHierarchy();
  const durationSeconds = ((Date.now() - startedAt) / 1000).toFixed(1);

  console.log(
    JSON.stringify(
      {
        generatedAt: result.summary.generatedAt,
        projectCount: result.summary.projectCount,
        featuredCount: result.summary.featuredCount,
        exclusionCount: result.summary.exclusionCount,
        scannedDirectoryCount: result.summary.scannedDirectoryCount,
        prunedDirectoryCount: result.summary.prunedDirectoryCount,
        errorCount: result.summary.errorCount,
        durationSeconds,
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
