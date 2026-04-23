import type { ProjectRecord } from "@/lib/inventory";

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function polygonPoint(index: number, total: number, radius: number, scale: number) {
  const angle = (Math.PI * 2 * index) / total - Math.PI / 2;
  const x = 80 + Math.cos(angle) * radius * scale;
  const y = 80 + Math.sin(angle) * radius * scale;
  return `${x.toFixed(2)},${y.toFixed(2)}`;
}

export function ProjectFingerprint({ project, compact = false }: { project: ProjectRecord; compact?: boolean }) {
  const values = [
    clamp(project.metrics.evidenceScore / 30, 0.22, 1),
    clamp(project.metrics.sourceFileCount / 160, 0.18, 1),
    clamp(project.metrics.directoryCount / 120, 0.18, 1),
    clamp(project.metrics.imageAssetCount / 30, 0.12, 1),
    clamp(project.technologies.length / 8, 0.2, 1),
    clamp(project.languages.length / 6, 0.2, 1),
  ];

  const polygon = values.map((value, index) => polygonPoint(index, values.length, 58, value)).join(" ");
  const sizeClass = compact ? "h-28 w-28" : "h-40 w-40";
  const gradientId = `fingerprint-gradient-${project.id}`;

  return (
    <div className={`fingerprint ${sizeClass}`}>
      <svg viewBox="0 0 160 160" role="img" aria-label={`Fingerprint visualization for ${project.displayName}`}>
        <defs>
          <linearGradient id={gradientId} x1="0%" x2="100%" y1="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(245, 214, 176, 0.92)" />
            <stop offset="100%" stopColor="rgba(172, 112, 54, 0.95)" />
          </linearGradient>
        </defs>
        {[0.35, 0.55, 0.75, 1].map((scale) => (
          <polygon
            key={scale}
            points={[0, 1, 2, 3, 4, 5].map((index) => polygonPoint(index, 6, 58, scale)).join(" ")}
            fill="none"
            stroke="rgba(247, 240, 224, 0.08)"
            strokeWidth="1"
          />
        ))}
        <polygon points={polygon} fill="rgba(184, 139, 90, 0.14)" stroke={`url(#${gradientId})`} strokeWidth="2" />
        <circle cx="80" cy="80" r="3.5" fill="rgba(245, 214, 176, 0.95)" />
      </svg>
      <p className="fingerprint-label">Derived from file counts, evidence markers, and tech breadth.</p>
    </div>
  );
}
