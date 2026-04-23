import type { ProjectLink, ProjectRecord } from "./inventory";

export interface PortfolioProject extends ProjectRecord {
  discipline: string;
  spotlight: string;
  proofPoints: string[];
  repoUrl: string;
  liveUrl: string | null;
  liveLabel: string | null;
}

interface ShowcaseEntry {
  relativePath: string;
  displayName: string;
  summary: string;
  description: string;
  discipline: string;
  spotlight: string;
  proofPoints: string[];
  repoUrl: string;
  liveUrl?: string;
  liveLabel?: string;
  technologies?: string[];
}

const SHOWCASE_ENTRIES: ShowcaseEntry[] = [
  {
    relativePath: "projects/Web_Development/Fullstack/todoist-enhanced",
    displayName: "Todoist Enhanced Fidelity",
    summary:
      "Parity-focused task platform with dense productivity workflows, authenticated workspace flows, and a production-minded full-stack architecture.",
    description:
      "Todoist Enhanced Fidelity rebuilds a modern task manager around tight interaction design, typed backend contracts, and a seeded demo environment. It is the strongest product-style web build in the scanned body of work, and it has both a public deployment and a dedicated repository.",
    discipline: "Full-stack product engineering",
    spotlight: "Built to reproduce the feel of a serious productivity product, not just its route names.",
    proofPoints: [
      "Next.js 16, React 19, Tailwind 4, Prisma, PostgreSQL, and Auth.js.",
      "Protected application shell, sync-style routes, seeded workspace flows, and parity-driven UI work.",
      "Unit, integration, and Playwright coverage baked into the repo contract.",
    ],
    repoUrl: "https://github.com/Michaelunkai/todoist-enhanced-fidelity",
    liveUrl: "https://todoist-enhanced-fidelity.netlify.app",
    liveLabel: "Live app",
  },
  {
    relativePath: "repos/ai-ml/AI_and_Machine_Learning/Artificial_Intelligence/agent-orchestration/agentflow",
    displayName: "AgentFlow",
    summary:
      "Operator-facing multi-agent orchestration dashboard for dispatching work, tracking live progress, and analyzing outcomes across an OpenClaw fleet.",
    description:
      "AgentFlow is a control plane for autonomous agents rather than a one-off demo. The project is shaped around queues, telemetry, agent assignment, and outcome tracking so the operator can see what is happening across multiple workers in real time.",
    discipline: "AI orchestration platform",
    spotlight: "Turns a distributed agent runtime into something you can actually operate with confidence.",
    proofPoints: [
      "Real-time monitoring, queueing, bot-status visibility, and analytics in one surface.",
      "Embedded Node and SQLite architecture designed to live inside an existing gateway.",
      "Explicit workflow documentation for multi-agent task dispatch and review.",
    ],
    repoUrl: "https://github.com/Michaelunkai/agentflow",
  },
  {
    relativePath: "repos/game-library-manager-web",
    displayName: "Game Library Manager Web",
    summary:
      "Automation-heavy web application for browsing, filtering, and extracting a large Docker-backed game library with generated install scripts.",
    description:
      "This project takes a logistics-heavy workflow and makes it usable from the browser. It combines large-catalog browsing, script generation, recovery behavior, and multiple deployment targets into a product that feels operationally useful instead of experimental.",
    discipline: "Automation-heavy web product",
    spotlight: "A browser UI built around a real extraction pipeline, not just screenshots or concept copy.",
    proofPoints: [
      "Large searchable game catalog, bulk actions, filters, and path-aware script generation.",
      "Supports Windows, PowerShell, and POSIX command outputs for actual use.",
      "Public demo deployed and documented alongside the repository.",
    ],
    repoUrl: "https://github.com/Michaelunkai/game-library-manager-web",
    liveUrl: "https://game-library-manager-web.vercel.app",
    liveLabel: "Live demo",
  },
  {
    relativePath: "projects/games/QuadDown",
    displayName: "QuadDown",
    summary:
      "Consumer-facing desktop game downloader and manager with release distribution, multilingual UX, and product-style community surfaces.",
    description:
      "QuadDown is positioned like a shippable desktop product, not an internal utility. The repository and release trail show public packaging, community touchpoints, localization effort, and a product narrative that goes beyond raw technical implementation.",
    discipline: "Desktop product experience",
    spotlight: "Packaged and presented like software meant for real users, not only for a resume bullet.",
    proofPoints: [
      "Public GitHub release flow for downloadable builds.",
      "Desktop UX shaped around discovery, downloads, and library management.",
      "README includes community, feedback, changelog, and localization surfaces.",
    ],
    repoUrl: "https://github.com/Michaelunkai/QuadDown",
    liveUrl: "https://github.com/Michaelunkai/QuadDown/releases/latest",
    liveLabel: "Latest release",
  },
  {
    relativePath: "projects/clawdoctor",
    displayName: "ClawDoctor",
    summary:
      "Guided diagnostics and repair surface for OpenClaw runtime issues, pairing actionable checks with a user-facing recovery workflow.",
    description:
      "ClawDoctor focuses on turning opaque runtime problems into understandable repair paths. The project is strong because it combines diagnosis, automatic fixes, and a cleaner interface for a failure-heavy operational domain.",
    discipline: "Diagnostics and repair UX",
    spotlight: "Takes ugly infrastructure failure states and makes them navigable for an operator.",
    proofPoints: [
      "Nineteen diagnostic checks and multiple automatic repair actions.",
      "Filtered output and repair summaries instead of dumping raw logs on the user.",
      "UI-led experience for a multi-process local runtime that normally fails noisily.",
    ],
    repoUrl: "https://github.com/Michaelunkai/clawdoctor",
  },
  {
    relativePath: "AI_ML/LocalAI/ollama/16vram/A",
    displayName: "Ollama Local Daily Driver",
    summary:
      "Evidence-backed local-model evaluation and launcher workflow for selecting the best daily-driver stack on constrained Windows hardware.",
    description:
      "This project is less about one shiny screen and more about disciplined decision-making for local AI runtime work. It captures benchmarks, launcher flows, and operator documentation so model choice is backed by repeatable evidence instead of guesswork.",
    discipline: "Local AI evaluation tooling",
    spotlight: "Optimizes for measurable local performance on real hardware rather than cloud assumptions.",
    proofPoints: [
      "Benchmarking, launcher scripts, and operating instructions live in one place.",
      "Focused on a 16 GB VRAM Windows setup with practical local constraints.",
      "Repository is structured around evidence, repeatability, and operator commands.",
    ],
    repoUrl: "https://github.com/Michaelunkai/ollama-local-daily-driver",
    technologies: ["Ollama", "PowerShell", "Python", "Benchmarking"],
  },
];

function uniqueLinks(links: ProjectLink[]) {
  const seen = new Set<string>();
  return links.filter((link) => {
    const key = `${link.kind}:${link.href}`;
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

export function buildShowcaseProjects(projects: ProjectRecord[]): PortfolioProject[] {
  const byPath = new Map(projects.map((project) => [project.relativePath, project]));

  return SHOWCASE_ENTRIES.map((entry) => {
    const source = byPath.get(entry.relativePath);
    if (!source) {
      throw new Error(`Missing showcase source project for ${entry.relativePath}`);
    }

    const links = uniqueLinks([
      {
        label: "GitHub repository",
        href: entry.repoUrl,
        kind: "git-remote",
      },
      ...(entry.liveUrl
        ? [
            {
              label: entry.liveLabel ?? "Live project",
              href: entry.liveUrl,
              kind: "website" as const,
            },
          ]
        : []),
      ...source.links,
    ]);

    return {
      ...source,
      displayName: entry.displayName,
      summary: entry.summary,
      description: entry.description,
      technologies: entry.technologies ?? source.technologies,
      featured: true,
      featuredReason: "Manually curated for the public portfolio showcase.",
      links,
      notes: [
        "Public showcase entry is manually curated for legitimacy and link accuracy.",
        ...source.notes,
      ],
      searchText: [
        entry.displayName,
        source.relativePath,
        entry.summary,
        entry.description,
        entry.discipline,
        entry.spotlight,
        ...entry.proofPoints,
        ...(entry.technologies ?? source.technologies),
        ...source.languages,
      ].join(" "),
      discipline: entry.discipline,
      spotlight: entry.spotlight,
      proofPoints: entry.proofPoints,
      repoUrl: entry.repoUrl,
      liveUrl: entry.liveUrl ?? null,
      liveLabel: entry.liveUrl ? (entry.liveLabel ?? "Live project") : null,
    };
  });
}
