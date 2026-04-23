import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { createClient } from "@libsql/client";

import {
  CATEGORIES,
  DATABASE_FILENAME,
  GENERATED_DIR,
  INVENTORY_DIR,
  SCANNER_VERSION,
  SELF_RELATIVE_PATH,
  STUDY_ROOT,
  type Category,
  type Confidence,
  type CoverageRecord,
  type EvidenceMarker,
  type ExclusionRecord,
  type InventorySummary,
  type ProjectLink,
  type ProjectMetrics,
  type ProjectRecord,
  type VisibleEntityType,
  normalizeRelativePath,
  normalizeWhitespace,
  slugify,
} from "./inventory";

const ALWAYS_PRUNE = new Set([
  ".git",
  ".hg",
  ".svn",
  ".next",
  ".turbo",
  ".vercel",
  ".yarn",
  "node_modules",
  "__pycache__",
  ".venv",
  "venv",
  ".pytest_cache",
  ".mypy_cache",
  ".idea",
  ".vscode",
  ".pnpm-store",
]);

const CONDITIONAL_PRUNE = new Set(["coverage", "dist", "build", "out", "target", "obj", "tmp", "temp"]);
const README_NAMES = ["readme.md", "readme.mdx", "readme.txt", "readme"];

const SOURCE_DIR_HINTS = new Set([
  "src",
  "app",
  "lib",
  "server",
  "client",
  "scripts",
  "script",
  "tests",
  "test",
  "packages",
  "apps",
  "services",
  "cmd",
  "notebooks",
  "notebook",
]);

const MANIFEST_MARKERS = [
  "package.json",
  "pyproject.toml",
  "requirements.txt",
  "cargo.toml",
  "go.mod",
  "pom.xml",
  "build.gradle",
  "build.gradle.kts",
  "settings.gradle",
  "settings.gradle.kts",
  "composer.json",
  "gemfile",
  "pubspec.yaml",
  "dockerfile",
  "docker-compose.yml",
  "docker-compose.yaml",
  "makefile",
];

const LANGUAGE_EXTENSIONS: Record<string, string> = {
  ".ts": "TypeScript",
  ".tsx": "TypeScript",
  ".js": "JavaScript",
  ".jsx": "JavaScript",
  ".mjs": "JavaScript",
  ".cjs": "JavaScript",
  ".py": "Python",
  ".ps1": "PowerShell",
  ".sh": "Shell",
  ".go": "Go",
  ".rs": "Rust",
  ".java": "Java",
  ".kt": "Kotlin",
  ".swift": "Swift",
  ".cs": "C#",
  ".cpp": "C++",
  ".c": "C",
  ".ahk": "AutoHotkey",
  ".ipynb": "Jupyter Notebook",
  ".sql": "SQL",
  ".php": "PHP",
  ".rb": "Ruby",
  ".dart": "Dart",
};

const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg"]);

interface CandidateRecord {
  fullPath: string;
  relativePath: string;
  parentRelativePath: string | null;
  displayName: string;
  nameSource: string;
  summary: string;
  summarySource: string;
  description: string;
  descriptionSource: string;
  statusLabel: string;
  statusSource: string;
  score: number;
  confidence: Confidence;
  category: Category;
  technologies: string[];
  languages: string[];
  markers: EvidenceMarker[];
  notes: string[];
  links: ProjectLink[];
  gitRemote: string | null;
  metrics: ProjectMetrics;
  entityType: VisibleEntityType;
  searchText: string;
}

interface DirectorySnapshot {
  fullPath: string;
  relativePath: string;
  depth: number;
  fileNames: string[];
  dirNames: string[];
  packageInfo: {
    name?: string;
    description?: string;
    homepage?: string;
    dependencies?: string[];
    devDependencies?: string[];
  } | null;
  readmeText: string | null;
  stats: Awaited<ReturnType<typeof stat>>;
}

function shallowLanguages(snapshot: DirectorySnapshot) {
  return [
    ...new Set(
      snapshot.fileNames
        .map((fileName) => LANGUAGE_EXTENSIONS[path.extname(fileName).toLowerCase()])
        .filter(Boolean) as string[],
    ),
  ];
}

function hashId(relativePath: string): string {
  return createHash("sha1").update(relativePath).digest("hex").slice(0, 20);
}

function basename(relativePath: string): string {
  const segments = normalizeRelativePath(relativePath).split("/");
  return segments[segments.length - 1] || "study";
}

function inferDisplayName(relativePath: string): string {
  const leaf = basename(relativePath)
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return leaf
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function inferPruneReason(name: string, depth: number): string | null {
  const lowered = name.toLowerCase();

  if (ALWAYS_PRUNE.has(lowered)) {
    return "dependency, cache, or VCS directory";
  }

  if (depth > 0 && CONDITIONAL_PRUNE.has(lowered)) {
    return "generated build or coverage directory";
  }

  return null;
}

function inferGeneratedCandidateReason(relativePath: string): string | null {
  const normalized = normalizeRelativePath(relativePath).toLowerCase();

  if (normalized.includes("/benchmarks/runs/")) {
    return "benchmark run workspace";
  }

  if (normalized.startsWith("codex-unem-smoke-")) {
    return "generated smoke workspace";
  }

  return null;
}

function sanitizeRemoteUrl(remote: string): string | null {
  const trimmed = remote.trim();

  if (!trimmed) {
    return null;
  }

  if (trimmed.startsWith("git@github.com:")) {
    return `https://github.com/${trimmed.replace("git@github.com:", "").replace(/\.git$/, "")}`;
  }

  try {
    const url = new URL(trimmed);
    url.username = "";
    url.password = "";
    return url.toString().replace(/\.git$/, "");
  } catch {
    return null;
  }
}

function firstParagraph(markdown: string | null): string | null {
  if (!markdown) {
    return null;
  }

  const cleaned = markdown
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#") && !line.startsWith("![") && !line.startsWith(">"));

  const paragraph = cleaned.slice(0, 4).join(" ");
  return paragraph ? normalizeWhitespace(paragraph) : null;
}

function techsFromPackage(pkg: DirectorySnapshot["packageInfo"]): string[] {
  if (!pkg) {
    return [];
  }

  const depNames = [...(pkg.dependencies ?? []), ...(pkg.devDependencies ?? [])].map((value) =>
    value.toLowerCase(),
  );

  const labels = new Set<string>();

  if (depNames.some((value) => value === "next")) labels.add("Next.js");
  if (depNames.some((value) => value === "react")) labels.add("React");
  if (depNames.some((value) => value === "vue")) labels.add("Vue");
  if (depNames.some((value) => value === "svelte")) labels.add("Svelte");
  if (depNames.some((value) => value === "tailwindcss")) labels.add("Tailwind CSS");
  if (depNames.some((value) => value.includes("framer-motion"))) labels.add("Framer Motion");
  if (depNames.some((value) => value === "prisma")) labels.add("Prisma");
  if (depNames.some((value) => value === "express")) labels.add("Express");
  if (depNames.some((value) => value.includes("fastify"))) labels.add("Fastify");
  if (depNames.some((value) => value.includes("typescript"))) labels.add("TypeScript");
  if (depNames.some((value) => value.includes("vitest"))) labels.add("Vitest");
  if (depNames.some((value) => value.includes("playwright"))) labels.add("Playwright");
  if (depNames.some((value) => value.includes("firebase"))) labels.add("Firebase");
  if (depNames.some((value) => value.includes("supabase"))) labels.add("Supabase");
  if (depNames.some((value) => value.includes("openai"))) labels.add("OpenAI");
  if (depNames.some((value) => value.includes("socket.io"))) labels.add("Socket.IO");
  if (depNames.some((value) => value.includes("electron"))) labels.add("Electron");

  return [...labels];
}

function inferCategory(
  relativePath: string,
  technologies: string[],
  languages: string[],
  markers: EvidenceMarker[],
): Category {
  const loweredPath = relativePath.toLowerCase();
  const markerTypes = markers.map((marker) => marker.type.toLowerCase());

  const hasFrontend = technologies.some((value) => ["Next.js", "React", "Vue", "Svelte"].includes(value));
  const hasBackend = technologies.some((value) => ["Express", "Fastify", "Prisma", "Supabase"].includes(value));
  const hasMl = loweredPath.includes("ai") || loweredPath.includes("ml") || markerTypes.includes("notebook");
  const hasDesktop = languages.includes("AutoHotkey") || technologies.includes("Electron");
  const hasMobile = loweredPath.includes("android") || loweredPath.includes("mobile") || loweredPath.includes("ios");
  const hasOps =
    loweredPath.includes("docker") ||
    loweredPath.includes("k8s") ||
    loweredPath.includes("devops") ||
    markerTypes.includes("dockerfile");
  const hasGame = loweredPath.includes("game") || loweredPath.includes("unity") || loweredPath.includes("godot");
  const hasAutomation =
    languages.includes("PowerShell") || languages.includes("AutoHotkey") || loweredPath.includes("automation");
  const hasData = markerTypes.includes("notebook") || loweredPath.includes("data") || loweredPath.includes("analytics");

  if (hasFrontend && hasBackend) return "full-stack";
  if (hasMl) return "ai-ml";
  if (hasMobile) return "mobile";
  if (hasDesktop) return "desktop";
  if (hasOps) return "ops";
  if (hasAutomation) return "automation";
  if (hasData) return "data";
  if (hasGame) return "game";
  if (hasFrontend) return "frontend";
  if (hasBackend) return "backend";
  if (languages.length <= 2 && markers.some((marker) => marker.type === "package")) return "library";
  return CATEGORIES.includes("other") ? "other" : "other";
}

async function readPackageJson(filePath: string): Promise<DirectorySnapshot["packageInfo"]> {
  try {
    const raw = await readFile(filePath, "utf8");
    const data = JSON.parse(raw) as {
      name?: string;
      description?: string;
      homepage?: string;
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };

    return {
      name: data.name,
      description: data.description,
      homepage: data.homepage,
      dependencies: Object.keys(data.dependencies ?? {}),
      devDependencies: Object.keys(data.devDependencies ?? {}),
    };
  } catch {
    return null;
  }
}

async function loadDirectorySnapshot(fullPath: string, relativePath: string, depth: number): Promise<DirectorySnapshot> {
  const entries = await readdir(fullPath, { withFileTypes: true });
  const fileNames = entries.filter((entry) => entry.isFile()).map((entry) => entry.name);
  const dirNames = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
  const stats = await stat(fullPath);

  const readmeName = fileNames.find((fileName) => README_NAMES.includes(fileName.toLowerCase()));
  const packageInfo = fileNames.includes("package.json")
    ? await readPackageJson(path.join(fullPath, "package.json"))
    : null;

  const readmeText = readmeName ? await readFile(path.join(fullPath, readmeName), "utf8").catch(() => null) : null;

  return {
    fullPath,
    relativePath,
    depth,
    fileNames,
    dirNames,
    packageInfo,
    readmeText,
    stats,
  };
}

function manifestMarkers(snapshot: DirectorySnapshot): EvidenceMarker[] {
  const markers: EvidenceMarker[] = [];
  const fileSet = new Set(snapshot.fileNames.map((name) => name.toLowerCase()));
  const dirSet = new Set(snapshot.dirNames.map((name) => name.toLowerCase()));

  if (dirSet.has(".git")) {
    markers.push({ type: "git", file: `${snapshot.relativePath}/.git`, source: "direct" });
  }

  if (fileSet.has("package.json")) {
    markers.push({
      type: "package",
      file: `${snapshot.relativePath}/package.json`,
      detail: snapshot.packageInfo?.name,
      source: "direct",
    });
  }

  if (fileSet.has("pyproject.toml")) {
    markers.push({ type: "python", file: `${snapshot.relativePath}/pyproject.toml`, source: "direct" });
  }

  if (fileSet.has("requirements.txt")) {
    markers.push({ type: "python", file: `${snapshot.relativePath}/requirements.txt`, source: "direct" });
  }

  if (fileSet.has("cargo.toml")) {
    markers.push({ type: "rust", file: `${snapshot.relativePath}/Cargo.toml`, source: "direct" });
  }

  if (fileSet.has("go.mod")) {
    markers.push({ type: "go", file: `${snapshot.relativePath}/go.mod`, source: "direct" });
  }

  if (fileSet.has("dockerfile")) {
    markers.push({ type: "dockerfile", file: `${snapshot.relativePath}/Dockerfile`, source: "direct" });
  }

  if (fileSet.has("docker-compose.yml") || fileSet.has("docker-compose.yaml")) {
    markers.push({ type: "docker-compose", file: `${snapshot.relativePath}/docker-compose.yml`, source: "direct" });
  }

  if (snapshot.fileNames.some((name) => name.endsWith(".sln"))) {
    markers.push({ type: ".net-solution", file: snapshot.fileNames.find((name) => name.endsWith(".sln")) ?? "", source: "direct" });
  }

  if (snapshot.fileNames.some((name) => name.endsWith(".csproj"))) {
    markers.push({ type: ".net-project", file: snapshot.fileNames.find((name) => name.endsWith(".csproj")) ?? "", source: "direct" });
  }

  if (snapshot.fileNames.some((name) => name.endsWith(".ipynb"))) {
    markers.push({ type: "notebook", file: snapshot.fileNames.find((name) => name.endsWith(".ipynb")) ?? "", source: "direct" });
  }

  if (snapshot.fileNames.some((name) => name.toLowerCase() === "makefile")) {
    markers.push({ type: "build-script", file: `${snapshot.relativePath}/Makefile`, source: "direct" });
  }

  if (snapshot.readmeText) {
    markers.push({ type: "readme", file: `${snapshot.relativePath}/README`, source: "direct" });
  }

  const sourceDir = snapshot.dirNames.find((dirName) => SOURCE_DIR_HINTS.has(dirName.toLowerCase()));
  if (sourceDir) {
    markers.push({ type: "source-tree", file: `${snapshot.relativePath}/${sourceDir}`, source: "direct" });
  }

  return markers;
}

function confidenceFromScore(score: number): Confidence {
  if (score >= 11) return "high";
  if (score >= 6) return "medium";
  return "low";
}

function inferStatus(relativePath: string, readmeText: string | null, lastModifiedAt: string | null): [string, string] {
  const loweredPath = relativePath.toLowerCase();
  const loweredReadme = (readmeText ?? "").toLowerCase();

  if (loweredReadme.includes("archived") || loweredPath.includes("archive") || loweredPath.includes("deprecated")) {
    return ["Archived or legacy", "readme"];
  }

  if (loweredReadme.includes("wip") || loweredReadme.includes("work in progress")) {
    return ["Work in progress", "readme"];
  }

  if (lastModifiedAt) {
    const ageDays = Math.floor((Date.now() - new Date(lastModifiedAt).getTime()) / (1000 * 60 * 60 * 24));
    if (ageDays <= 180) {
      return ["Recently updated", "inferred"];
    }
  }

  return ["Active snapshot", "inferred"];
}

async function extractGitRemote(fullPath: string): Promise<string | null> {
  try {
    const remote = execFileSync("git", ["-C", fullPath, "remote", "get-url", "origin"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return sanitizeRemoteUrl(remote);
  } catch {
    return null;
  }
}

async function inspectProjectMetrics(
  projectPath: string,
  projectRelativePath: string,
  candidateRoots: Set<string>,
): Promise<ProjectMetrics & { languages: string[] }> {
  const queue = [{ fullPath: projectPath, relativePath: projectRelativePath, depth: 0 }];
  const extensionCounts = new Map<string, number>();
  const manifestHits = new Set<string>();
  let sourceFileCount = 0;
  let directoryCount = 0;
  let notebookCount = 0;
  let imageAssetCount = 0;
  let lastModifiedAt: string | null = null;

  while (queue.length > 0) {
    const current = queue.shift();

    if (!current) {
      continue;
    }

    let entries;
    try {
      entries = await readdir(current.fullPath, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      const childFullPath = path.join(current.fullPath, entry.name);
      const childRelativePath = normalizeRelativePath(path.join(current.relativePath, entry.name));

      if (entry.isDirectory()) {
        const pruneReason = inferPruneReason(entry.name, current.depth + 1);
        if (pruneReason) {
          continue;
        }

        if (candidateRoots.has(childRelativePath) && childRelativePath !== projectRelativePath) {
          continue;
        }

        directoryCount += 1;
        queue.push({ fullPath: childFullPath, relativePath: childRelativePath, depth: current.depth + 1 });
        continue;
      }

      const extension = path.extname(entry.name).toLowerCase();
      const language = LANGUAGE_EXTENSIONS[extension];
      if (language) {
        sourceFileCount += 1;
        extensionCounts.set(language, (extensionCounts.get(language) ?? 0) + 1);
      }

      if (extension === ".ipynb") {
        notebookCount += 1;
      }

      if (IMAGE_EXTENSIONS.has(extension)) {
        imageAssetCount += 1;
      }

      const loweredFile = entry.name.toLowerCase();
      if (MANIFEST_MARKERS.includes(loweredFile)) {
        manifestHits.add(entry.name);
      }

      try {
        const entryStats = await stat(childFullPath);
        if (!lastModifiedAt || entryStats.mtime.toISOString() > lastModifiedAt) {
          lastModifiedAt = entryStats.mtime.toISOString();
        }
      } catch {
        continue;
      }
    }
  }

  const languages = [...extensionCounts.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 6)
    .map(([language]) => language);

  return {
    evidenceScore: 0,
    sourceFileCount,
    directoryCount,
    notebookCount,
    imageAssetCount,
    lastModifiedAt,
    manifests: [...manifestHits].sort(),
    languages,
  };
}

function buildInferenceSummary(
  displayName: string,
  category: Category,
  markers: EvidenceMarker[],
  technologies: string[],
  relativePath: string,
): string {
  const markerText = markers
    .map((marker) => marker.type)
    .slice(0, 3)
    .join(", ");
  const techText = technologies.slice(0, 3).join(", ");

  if (techText) {
    return normalizeWhitespace(
      `${displayName} appears to be a ${category.replace(/-/g, " ")} project inferred from ${techText} and evidence in ${relativePath}.`,
    );
  }

  return normalizeWhitespace(
    `${displayName} appears to be a ${category.replace(/-/g, " ")} project inferred from ${markerText || "local project markers"} in ${relativePath}.`,
  );
}

function deduceEntityType(candidate: CandidateRecord, parentRelativePath: string | null): VisibleEntityType {
  if (!parentRelativePath) {
    return "standalone";
  }

  const hasOwnGit = candidate.markers.some((marker) => marker.type === "git");
  const hasOwnPackage = candidate.markers.some((marker) => marker.type === "package");
  if (hasOwnGit || hasOwnPackage || candidate.score >= 11) {
    return "nested-project";
  }

  if (candidate.score >= 5) {
    return "component";
  }

  return "ambiguous";
}

async function createCandidate(snapshot: DirectorySnapshot): Promise<CandidateRecord | null> {
  const markers = manifestMarkers(snapshot);
  const strongLocalMarker = markers.some((marker) =>
    ["git", "package", "python", "rust", "go", "dockerfile", ".net-solution", ".net-project", "notebook"].includes(marker.type),
  );
  const strongLocalTypes = new Set(markers.map((marker) => marker.type));
  const directLanguages = shallowLanguages(snapshot);
  const directSourceFileCount = snapshot.fileNames.filter((fileName) => {
    const extension = path.extname(fileName).toLowerCase();
    return Boolean(LANGUAGE_EXTENSIONS[extension]);
  }).length;

  if (!strongLocalMarker && markers.length < 3) {
    return null;
  }

  if (
    !strongLocalTypes.has("git") &&
    !strongLocalTypes.has("package") &&
    !strongLocalTypes.has("python") &&
    !strongLocalTypes.has("rust") &&
    !strongLocalTypes.has("go") &&
    !strongLocalTypes.has(".net-solution") &&
    !strongLocalTypes.has(".net-project") &&
    !strongLocalTypes.has("notebook") &&
    directSourceFileCount < 3
  ) {
    return null;
  }

  const displayName = snapshot.packageInfo?.name
    ? snapshot.packageInfo.name
    : inferDisplayName(snapshot.relativePath);
  const nameSource = snapshot.packageInfo?.name ? "package" : "folder";
  const readmeParagraph = firstParagraph(snapshot.readmeText);
  const baseTechnologies = techsFromPackage(snapshot.packageInfo);
  const baseLanguages = directLanguages.slice(0, 4);
  const category = inferCategory(snapshot.relativePath, baseTechnologies, baseLanguages, markers);
  const metrics: ProjectMetrics & { languages: string[] } = {
    evidenceScore: 0,
    sourceFileCount: directSourceFileCount,
    directoryCount: snapshot.dirNames.length,
    notebookCount: snapshot.fileNames.filter((fileName) => fileName.endsWith(".ipynb")).length,
    imageAssetCount: snapshot.fileNames.filter((fileName) => IMAGE_EXTENSIONS.has(path.extname(fileName).toLowerCase())).length,
    lastModifiedAt: snapshot.stats.mtime.toISOString(),
    manifests: snapshot.fileNames.filter((fileName) => MANIFEST_MARKERS.includes(fileName.toLowerCase())),
    languages: baseLanguages,
  };
  const technologies = [...new Set([...baseTechnologies, ...metrics.languages.filter((value) => value !== "Jupyter Notebook")])];
  const summary = snapshot.packageInfo?.description
    ? normalizeWhitespace(snapshot.packageInfo.description)
    : readmeParagraph ?? buildInferenceSummary(displayName, category, markers, technologies, snapshot.relativePath);
  const summarySource = snapshot.packageInfo?.description ? "package" : readmeParagraph ? "readme" : "inferred";
  const description = readmeParagraph ?? summary;
  const descriptionSource = readmeParagraph ? "readme" : summarySource;

  let score = markers.length * 2;
  if (snapshot.packageInfo?.description) score += 2;
  if (readmeParagraph) score += 2;
  if (directSourceFileCount >= 2) score += 1;
  if (directSourceFileCount >= 8) score += 2;
  if (metrics.languages.length >= 2) score += 1;
  if (markers.some((marker) => marker.type === "git")) score += 3;
  if (markers.some((marker) => marker.type === "source-tree")) score += 2;

  if (score < 5 && !readmeParagraph && !snapshot.packageInfo?.description) {
    return null;
  }

  const [statusLabel, statusSource] = inferStatus(snapshot.relativePath, snapshot.readmeText, metrics.lastModifiedAt);
  const confidence = confidenceFromScore(score);
  const gitRemote = markers.some((marker) => marker.type === "git") ? await extractGitRemote(snapshot.fullPath) : null;
  const links: ProjectLink[] = [];

  if (gitRemote) {
    links.push({ label: "Repository", href: gitRemote, kind: "git-remote" });
  }

  if (snapshot.packageInfo?.homepage) {
    links.push({ label: "Homepage", href: snapshot.packageInfo.homepage, kind: "package-homepage" });
  }

  const notes = [
    summarySource === "inferred" ? "Summary is inferred from local project markers." : "Summary comes from repository metadata.",
    descriptionSource === "readme" ? "Description is derived from the README lead paragraph." : "Description is inferred cautiously.",
  ];

  return {
    fullPath: snapshot.fullPath,
    relativePath: snapshot.relativePath,
    parentRelativePath: null,
    displayName,
    nameSource,
    summary,
    summarySource,
    description,
    descriptionSource,
    statusLabel,
    statusSource,
    score,
    confidence,
    category,
    technologies,
    languages: metrics.languages,
    markers,
    notes,
    links,
    gitRemote,
    metrics: { ...metrics, evidenceScore: score },
    entityType: "standalone",
    searchText: normalizeWhitespace(
      [displayName, snapshot.relativePath, summary, description, technologies.join(" "), metrics.languages.join(" ")]
        .filter(Boolean)
        .join(" "),
    ),
  };
}

function ensureUniqueSlugs(candidates: CandidateRecord[]): ProjectRecord[] {
  const usedSlugs = new Map<string, number>();

  return candidates.map((candidate) => {
    const baseSlug = slugify(candidate.displayName || basename(candidate.relativePath) || candidate.relativePath);
    const existingCount = usedSlugs.get(baseSlug) ?? 0;
    usedSlugs.set(baseSlug, existingCount + 1);
    const slug = existingCount === 0 ? baseSlug : `${baseSlug}-${existingCount + 1}`;

    return {
      id: hashId(candidate.relativePath),
      slug,
      relativePath: normalizeRelativePath(candidate.relativePath),
      parentRelativePath: candidate.parentRelativePath,
      displayName: candidate.displayName,
      nameSource: candidate.nameSource,
      entityType: candidate.entityType,
      category: candidate.category,
      summary: candidate.summary,
      summarySource: candidate.summarySource,
      description: candidate.description,
      descriptionSource: candidate.descriptionSource,
      statusLabel: candidate.statusLabel,
      statusSource: candidate.statusSource,
      confidence: candidate.confidence,
      featured: false,
      featuredReason: null,
      technologies: candidate.technologies,
      languages: candidate.languages,
      markers: candidate.markers,
      links: candidate.links,
      notes: candidate.notes,
      metrics: candidate.metrics,
      searchText: candidate.searchText,
    };
  });
}

function pickFeaturedProjects(projects: ProjectRecord[]): Set<string> {
  const presentationScore = (project: ProjectRecord) => {
    const normalizedPath = project.relativePath.toLowerCase();
    let score = project.metrics.evidenceScore;

    if (project.summarySource !== "inferred") score += 4;
    if (project.descriptionSource === "readme") score += 3;
    if (project.links.some((link) => link.kind === "git-remote")) score += 4;
    if (project.technologies.length >= 3) score += 2;
    if (normalizedPath.startsWith("projects/")) score += 4;
    if (normalizedPath.startsWith("repos/")) score += 1;

    if (project.category === "full-stack") score += 3;
    if (project.category === "frontend" || project.category === "backend" || project.category === "automation") {
      score += 2;
    }

    if (project.displayName.length <= 2) score -= 12;
    if (["client", "server", "app", "study", "repos", "projects"].includes(project.displayName.toLowerCase())) {
      score -= 10;
    }

    if (
      normalizedPath.includes("/a/") ||
      normalizedPath.includes("/b/") ||
      normalizedPath.includes("_source_") ||
      normalizedPath.includes("/backup/") ||
      normalizedPath.includes("learning/01/01") ||
      normalizedPath.includes("pr ojects/")
    ) {
      score -= 10;
    }

    return score;
  };

  const scored = [...projects]
    .filter((project) => project.entityType === "standalone" || project.entityType === "nested-project")
    .sort((left, right) => {
      const scoreDiff = presentationScore(right) - presentationScore(left);
      if (scoreDiff !== 0) {
        return scoreDiff;
      }

      const lastModifiedDiff =
        new Date(right.metrics.lastModifiedAt ?? 0).getTime() - new Date(left.metrics.lastModifiedAt ?? 0).getTime();
      if (lastModifiedDiff !== 0) {
        return lastModifiedDiff;
      }

      return left.displayName.localeCompare(right.displayName);
    })
  const featured = new Set<string>();
  const seenKeys = new Set<string>();

  for (const project of scored) {
    const groupingKey = project.displayName.toLowerCase();

    if (seenKeys.has(groupingKey)) {
      continue;
    }

    featured.add(project.id);
    seenKeys.add(groupingKey);

    if (featured.size === 6) {
      break;
    }
  }

  return featured;
}

async function buildDatabase(outputRoot: string, projects: ProjectRecord[], summary: InventorySummary) {
  const dbPath = path.join(outputRoot, GENERATED_DIR, DATABASE_FILENAME);
  await rm(dbPath, { force: true });
  const client = createClient({ url: pathToFileURL(dbPath).href });

  await client.execute(`
    CREATE TABLE projects (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      relative_path TEXT NOT NULL,
      parent_relative_path TEXT,
      display_name TEXT NOT NULL,
      name_source TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      category TEXT NOT NULL,
      summary TEXT NOT NULL,
      summary_source TEXT NOT NULL,
      description TEXT NOT NULL,
      description_source TEXT NOT NULL,
      status_label TEXT NOT NULL,
      status_source TEXT NOT NULL,
      confidence TEXT NOT NULL,
      featured INTEGER NOT NULL DEFAULT 0,
      featured_reason TEXT,
      technologies_json TEXT NOT NULL,
      languages_json TEXT NOT NULL,
      markers_json TEXT NOT NULL,
      links_json TEXT NOT NULL,
      notes_json TEXT NOT NULL,
      metrics_json TEXT NOT NULL,
      search_text TEXT NOT NULL
    )
  `);

  await client.execute(`
    CREATE TABLE inventory_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);

  for (const project of projects) {
    await client.execute({
      sql: `
        INSERT INTO projects (
          id, slug, relative_path, parent_relative_path, display_name, name_source,
          entity_type, category, summary, summary_source, description, description_source,
          status_label, status_source, confidence, featured, featured_reason,
          technologies_json, languages_json, markers_json, links_json, notes_json,
          metrics_json, search_text
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        project.id,
        project.slug,
        project.relativePath,
        project.parentRelativePath,
        project.displayName,
        project.nameSource,
        project.entityType,
        project.category,
        project.summary,
        project.summarySource,
        project.description,
        project.descriptionSource,
        project.statusLabel,
        project.statusSource,
        project.confidence,
        project.featured ? 1 : 0,
        project.featuredReason,
        JSON.stringify(project.technologies),
        JSON.stringify(project.languages),
        JSON.stringify(project.markers),
        JSON.stringify(project.links),
        JSON.stringify(project.notes),
        JSON.stringify(project.metrics),
        project.searchText,
      ],
    });
  }

  const summaryEntries = Object.entries(summary).map(([key, value]) => [key, JSON.stringify(value)] as const);
  for (const [key, value] of summaryEntries) {
    await client.execute({
      sql: "INSERT INTO inventory_meta (key, value) VALUES (?, ?)",
      args: [key, value],
    });
  }
}

async function writeArtifacts(
  outputRoot: string,
  projects: ProjectRecord[],
  exclusions: ExclusionRecord[],
  coverage: CoverageRecord[],
  summary: InventorySummary,
) {
  const generatedPath = path.join(outputRoot, GENERATED_DIR);
  const inventoryPath = path.join(outputRoot, INVENTORY_DIR);

  await mkdir(generatedPath, { recursive: true });
  await mkdir(inventoryPath, { recursive: true });

  const projectJson = JSON.stringify(projects, null, 2);
  const exclusionJson = JSON.stringify(exclusions, null, 2);
  const summaryJson = JSON.stringify(summary, null, 2);
  const coverageJsonl = coverage.map((record) => JSON.stringify(record)).join("\n");

  await Promise.all([
    writeFile(path.join(generatedPath, "projects.json"), projectJson, "utf8"),
    writeFile(path.join(generatedPath, "exclusions.json"), exclusionJson, "utf8"),
    writeFile(path.join(generatedPath, "scan-summary.json"), summaryJson, "utf8"),
    writeFile(path.join(generatedPath, "coverage.jsonl"), coverageJsonl, "utf8"),
    writeFile(path.join(inventoryPath, "projects.json"), projectJson, "utf8"),
    writeFile(path.join(inventoryPath, "exclusions.json"), exclusionJson, "utf8"),
    writeFile(path.join(inventoryPath, "scan-summary.json"), summaryJson, "utf8"),
    writeFile(path.join(inventoryPath, "coverage.jsonl"), coverageJsonl, "utf8"),
  ]);

  await buildDatabase(outputRoot, projects, summary);
}

export async function scanStudyHierarchy(
  rootPath = STUDY_ROOT,
  outputRoot = process.cwd(),
): Promise<{
  projects: ProjectRecord[];
  exclusions: ExclusionRecord[];
  coverage: CoverageRecord[];
  summary: InventorySummary;
}> {
  const absoluteRoot = path.resolve(rootPath);
  const exclusions: ExclusionRecord[] = [
    {
      relativePath: SELF_RELATIVE_PATH,
      kind: "self",
      reason: "Excluded from inventory counts so the portfolio application does not count itself as source work.",
      details: [],
    },
  ];
  const coverage: CoverageRecord[] = [];
  const candidates: CandidateRecord[] = [];
  const queue = [{ fullPath: absoluteRoot, relativePath: "", depth: 0 }];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) {
      continue;
    }

    const normalizedRelativePath = normalizeRelativePath(current.relativePath);
    if (normalizedRelativePath === SELF_RELATIVE_PATH) {
      coverage.push({
        relativePath: normalizedRelativePath,
        depth: current.depth,
        status: "pruned",
        reason: "scanner target app",
      });
      continue;
    }

    let snapshot: DirectorySnapshot;
    try {
      snapshot = await loadDirectorySnapshot(current.fullPath, normalizedRelativePath, current.depth);
    } catch (error) {
      coverage.push({
        relativePath: normalizedRelativePath,
        depth: current.depth,
        status: "error",
        reason: "failed to read directory",
        error: error instanceof Error ? error.message : String(error),
      });
      continue;
    }

    coverage.push({
      relativePath: normalizedRelativePath || ".",
      depth: current.depth,
      status: "scanned",
      reason: "directory visited",
    });

    const generatedCandidateReason = inferGeneratedCandidateReason(normalizedRelativePath);
    if (generatedCandidateReason) {
      exclusions.push({
        relativePath: normalizedRelativePath,
        kind: "generated",
        reason: generatedCandidateReason,
        details: [],
      });
      continue;
    }

    const candidate = await createCandidate(snapshot);
    if (candidate) {
      candidates.push(candidate);
    }

    for (const dirName of snapshot.dirNames) {
      const childRelativePath = normalizeRelativePath(path.join(normalizedRelativePath, dirName));
      if (childRelativePath === SELF_RELATIVE_PATH) {
        coverage.push({
          relativePath: childRelativePath,
          depth: current.depth + 1,
          status: "pruned",
          reason: "scanner target app",
        });
        continue;
      }

      const pruneReason = inferPruneReason(dirName, current.depth + 1);
      if (pruneReason) {
        coverage.push({
          relativePath: childRelativePath,
          depth: current.depth + 1,
          status: "pruned",
          reason: pruneReason,
        });
        exclusions.push({
          relativePath: childRelativePath,
          kind: "pruned",
          reason: pruneReason,
          details: [],
        });
        continue;
      }

      queue.push({
        fullPath: path.join(current.fullPath, dirName),
        relativePath: childRelativePath,
        depth: current.depth + 1,
      });
    }
  }

  candidates.sort((left, right) => left.relativePath.length - right.relativePath.length);
  const candidatePaths = new Set(candidates.map((candidate) => candidate.relativePath));

  for (const candidate of candidates) {
    const parent = [...candidates]
      .filter(
        (possibleParent) =>
          possibleParent.relativePath !== candidate.relativePath &&
          candidate.relativePath.startsWith(`${possibleParent.relativePath}/`),
      )
      .sort((left, right) => right.relativePath.length - left.relativePath.length)[0];
    candidate.parentRelativePath = parent ? parent.relativePath : null;
    candidate.entityType = deduceEntityType(candidate, candidate.parentRelativePath);

    const refreshedMetrics = await inspectProjectMetrics(candidate.fullPath, candidate.relativePath, candidatePaths);
    candidate.languages = refreshedMetrics.languages;
    candidate.metrics = { ...refreshedMetrics, evidenceScore: candidate.score };
    candidate.category = inferCategory(candidate.relativePath, candidate.technologies, candidate.languages, candidate.markers);
    candidate.searchText = normalizeWhitespace(
      [
        candidate.displayName,
        candidate.relativePath,
        candidate.summary,
        candidate.description,
        candidate.technologies.join(" "),
        candidate.languages.join(" "),
      ].join(" "),
    );
  }

  const projects = ensureUniqueSlugs(candidates);
  const featuredIds = pickFeaturedProjects(projects);

  for (const project of projects) {
    if (featuredIds.has(project.id)) {
      project.featured = true;
      project.featuredReason = "Selected automatically from the strongest evidence score, documentation, and recent activity signals.";
    }
  }

  const countsByCategory = Object.fromEntries(CATEGORIES.map((category) => [category, 0]));
  const countsByEntityType: Record<string, number> = {
    standalone: 0,
    "nested-project": 0,
    component: 0,
    ambiguous: 0,
  };

  for (const project of projects) {
    countsByCategory[project.category] += 1;
    countsByEntityType[project.entityType] += 1;
  }

  const summary: InventorySummary = {
    generatedAt: new Date().toISOString(),
    scanRoot: ".",
    scannerVersion: SCANNER_VERSION,
    selfPath: SELF_RELATIVE_PATH,
    countsByCategory,
    countsByEntityType,
    projectCount: projects.length,
    featuredCount: projects.filter((project) => project.featured).length,
    exclusionCount: exclusions.length,
    coverageCount: coverage.length,
    scannedDirectoryCount: coverage.filter((record) => record.status === "scanned").length,
    prunedDirectoryCount: coverage.filter((record) => record.status === "pruned").length,
    errorCount: coverage.filter((record) => record.status === "error").length,
    ambiguousCount: projects.filter((project) => project.entityType === "ambiguous").length,
  };

  await writeArtifacts(outputRoot, projects, exclusions, coverage, summary);

  return { projects, exclusions, coverage, summary };
}
