"use client";

/**
 * State machine diagram: labelled states, arrowed transitions, and a filled
 * token marking the current state. States are told apart by position and
 * label (shape stays the same so the token reads as "where are we").
 */
export interface DiagramState {
  id: string;
  label: string;
  x: number;
  y: number;
}

export interface DiagramEdge {
  from: string;
  to: string;
  label?: string;
}

export function StateDiagram({
  states,
  edges,
  current,
  caption,
  width = 620,
  height = 240,
}: {
  states: DiagramState[];
  edges: DiagramEdge[];
  current: string | null;
  caption?: string;
  width?: number;
  height?: number;
}) {
  const byId = new Map(states.map((s) => [s.id, s]));
  const r = 26;

  return (
    <figure className="rounded-lg border border-line bg-bg-soft p-3">
      {caption ? (
        <figcaption className="mb-2 text-xs text-ink-muted">{caption}</figcaption>
      ) : null}
      <div className="thin-scroll overflow-x-auto">
        <svg
          role="img"
          aria-label={`State diagram; current state: ${current ?? "none"}`}
          viewBox={`0 0 ${width} ${height}`}
          width={width}
          height={height}
        >
          <defs>
            <marker
              id="kit-arrow"
              viewBox="0 0 10 10"
              refX={9}
              refY={5}
              markerWidth={7}
              markerHeight={7}
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--ink-faint)" />
            </marker>
          </defs>
          {edges.map((e, i) => {
            const a = byId.get(e.from);
            const b = byId.get(e.to);
            if (!a || !b) return null;
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const len = Math.hypot(dx, dy) || 1;
            // Stop the line at the circle borders.
            const x1 = a.x + (dx / len) * r;
            const y1 = a.y + (dy / len) * r;
            const x2 = b.x - (dx / len) * (r + 8);
            const y2 = b.y - (dy / len) * (r + 8);
            const active = current === e.from;
            return (
              <g key={i}>
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={active ? "rgb(var(--accent))" : "var(--ink-faint)"}
                  strokeWidth={active ? 2 : 1.25}
                  markerEnd="url(#kit-arrow)"
                />
                {e.label ? (
                  <text
                    x={(x1 + x2) / 2}
                    y={(y1 + y2) / 2 - 5}
                    fontSize={12}
                    textAnchor="middle"
                    fill="var(--ink-muted)"
                  >
                    {e.label}
                  </text>
                ) : null}
              </g>
            );
          })}
          {states.map((s) => {
            const isCurrent = s.id === current;
            return (
              <g key={s.id}>
                <circle
                  cx={s.x}
                  cy={s.y}
                  r={r}
                  fill={isCurrent ? "rgb(var(--accent))" : "var(--panel)"}
                  stroke={isCurrent ? "rgb(var(--accent))" : "var(--line)"}
                  strokeWidth={1.5}
                />
                <text
                  x={s.x}
                  y={s.y + 4}
                  fontSize={12}
                  textAnchor="middle"
                  fill={isCurrent ? "var(--accent-ink)" : "var(--ink)"}
                  fontFamily="monospace"
                >
                  {s.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </figure>
  );
}
