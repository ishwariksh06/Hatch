export type MapStop = { x: number; y: number; label: string; done: boolean };

export function RouteMap({ hub, stops }: { hub: { x: number; y: number }; stops: MapStop[] }) {
  const pts = [hub, ...stops];
  const path = pts.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <svg viewBox="0 0 100 100" className="w-full rounded-[var(--radius-card)] border border-line bg-surface">
      <defs>
        <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
          <path d="M10 0H0V10" fill="none" stroke="var(--color-line)" strokeWidth="0.3" />
        </pattern>
      </defs>
      <rect width="100" height="100" fill="url(#grid)" />

      <polyline
        points={path}
        fill="none"
        stroke="var(--color-accent)"
        strokeWidth="1.2"
        strokeDasharray="2 1.5"
        strokeLinecap="round"
      />

      {/* hub */}
      <g>
        <circle cx={hub.x} cy={hub.y} r="3" fill="var(--color-board)" />
        <text x={hub.x} y={hub.y + 7} fontSize="3.4" textAnchor="middle" fill="var(--color-muted)">
          Kitchen
        </text>
      </g>

      {stops.map((s, i) => (
        <g key={i}>
          <circle
            cx={s.x}
            cy={s.y}
            r="3.4"
            fill={s.done ? "var(--color-success)" : "var(--color-accent)"}
            stroke="var(--color-bg)"
            strokeWidth="0.8"
          />
          <text x={s.x} y={s.y + 1.2} fontSize="3.2" textAnchor="middle" fill="var(--color-accent-ink)">
            {i + 1}
          </text>
          <text x={s.x} y={s.y + 8} fontSize="3.2" textAnchor="middle" fill="var(--color-ink)">
            {s.label}
          </text>
        </g>
      ))}
    </svg>
  );
}
