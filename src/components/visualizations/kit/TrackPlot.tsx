"use client";

/**
 * Disk head path: x = cylinder, y = service order, drawn as a polyline of
 * the head's journey. 1:1 scale with horizontal scroll; every point labelled
 * with its cylinder so tooltips aren't the only source.
 */
export function TrackPlot({
  path,
  maxCylinder,
  revealed = path.length,
  caption,
}: {
  /** Head positions including the start, in visit order. */
  path: number[];
  maxCylinder: number;
  /** How many positions are revealed (cursor). */
  revealed?: number;
  caption?: string;
}) {
  const visible = path.slice(0, Math.max(1, revealed));
  const padL = 26;
  const padY = 22;
  const width = Math.max(560, maxCylinder * 3 + padL + 16);
  const rowH = 26;
  const height = path.length * rowH + padY * 2;
  const x = (cyl: number) => padL + (cyl / maxCylinder) * (width - padL - 12);
  const y = (i: number) => padY + i * rowH;

  return (
    <figure className="rounded-lg border border-line bg-bg-soft p-3">
      {caption ? (
        <figcaption className="mb-2 text-xs text-ink-muted">{caption}</figcaption>
      ) : null}
      <div className="thin-scroll overflow-x-auto">
        <svg
          role="img"
          aria-label={`Disk head path over cylinders 0–${maxCylinder}: ${visible.join(", ")}`}
          viewBox={`0 0 ${width} ${height}`}
          width={width}
          height={height}
        >
          {Array.from({ length: 5 }, (_, i) => {
            const cyl = Math.round((maxCylinder / 4) * i);
            return (
              <g key={cyl}>
                <line
                  x1={x(cyl)}
                  y1={padY - 12}
                  x2={x(cyl)}
                  y2={height - padY + 4}
                  stroke="var(--line)"
                  strokeWidth={1}
                />
                <text x={x(cyl) + 3} y={padY - 15} fontSize={12} fill="var(--ink-faint)">
                  {cyl}
                </text>
              </g>
            );
          })}
          <polyline
            points={visible.map((c, i) => `${x(c)},${y(i)}`).join(" ")}
            fill="none"
            stroke="rgb(var(--accent))"
            strokeWidth={2}
          />
          {visible.map((c, i) => (
            <g key={i}>
              <circle
                cx={x(c)}
                cy={y(i)}
                r={4}
                fill={i === 0 ? "var(--ink-faint)" : "rgb(var(--accent))"}
              />
              <text x={x(c) + 7} y={y(i) + 4} fontSize={12} fill="var(--ink-muted)" fontFamily="monospace">
                {c}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </figure>
  );
}
