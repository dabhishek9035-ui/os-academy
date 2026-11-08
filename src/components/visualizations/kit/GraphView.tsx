"use client";

/**
 * Directed graph for resource-allocation graphs and similar small graphs.
 * Processes render as circles, resources as rectangles — shape AND colour
 * distinguish kinds. Highlighted nodes/edges draw the cycle (or any focus
 * set) with the accent colour plus thicker strokes.
 */
export interface GraphNode {
  id: string;
  label: string;
  x: number;
  y: number;
  kind?: "process" | "resource" | "plain";
}

export interface GraphEdge {
  from: string;
  to: string;
  label?: string;
}

export function GraphView({
  nodes,
  edges,
  highlightNodes = [],
  highlightEdges = [],
  caption,
  width = 620,
  height = 300,
}: {
  nodes: GraphNode[];
  edges: GraphEdge[];
  highlightNodes?: string[];
  highlightEdges?: GraphEdge[];
  caption?: string;
  width?: number;
  height?: number;
}) {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const highlightSet = new Set(highlightNodes);
  const isHighlightedEdge = (e: GraphEdge) =>
    highlightEdges.some((h) => h.from === e.from && h.to === e.to);

  const nodeRadius = (kind: GraphNode["kind"]) => (kind === "resource" ? 18 : 22);

  return (
    <figure className="rounded-lg border border-line bg-bg-soft p-3">
      {caption ? (
        <figcaption className="mb-2 text-xs text-ink-muted">{caption}</figcaption>
      ) : null}
      <div className="thin-scroll overflow-x-auto">
        <svg
          role="img"
          aria-label={`Graph with ${nodes.length} nodes and ${edges.length} edges${
            highlightNodes.length > 0
              ? `; highlighted: ${highlightNodes.join(", ")}`
              : ""
          }`}
          viewBox={`0 0 ${width} ${height}`}
          width={width}
          height={height}
        >
          <defs>
            <marker
              id="kit-graph-arrow"
              viewBox="0 0 10 10"
              refX={9}
              refY={5}
              markerWidth={7}
              markerHeight={7}
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--ink-faint)" />
            </marker>
            <marker
              id="kit-graph-arrow-hot"
              viewBox="0 0 10 10"
              refX={9}
              refY={5}
              markerWidth={7}
              markerHeight={7}
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="rgb(var(--accent))" />
            </marker>
          </defs>
          {edges.map((e, i) => {
            const a = byId.get(e.from);
            const b = byId.get(e.to);
            if (!a || !b) return null;
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const len = Math.hypot(dx, dy) || 1;
            const ra = nodeRadius(a.kind);
            const rb = nodeRadius(b.kind);
            const x1 = a.x + (dx / len) * (ra + 2);
            const y1 = a.y + (dy / len) * (ra + 2);
            const x2 = b.x - (dx / len) * (rb + 9);
            const y2 = b.y - (dy / len) * (rb + 9);
            const hot = isHighlightedEdge(e);
            return (
              <g key={i}>
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={hot ? "rgb(var(--accent))" : "var(--ink-faint)"}
                  strokeWidth={hot ? 2.5 : 1.25}
                  markerEnd={hot ? "url(#kit-graph-arrow-hot)" : "url(#kit-graph-arrow)"}
                />
                {e.label ? (
                  <text
                    x={(x1 + x2) / 2}
                    y={(y1 + y2) / 2 - 5}
                    fontSize={12}
                    textAnchor="middle"
                    fill={hot ? "rgb(var(--accent))" : "var(--ink-muted)"}
                  >
                    {e.label}
                  </text>
                ) : null}
              </g>
            );
          })}
          {nodes.map((n) => {
            const hot = highlightSet.has(n.id);
            const isResource = n.kind === "resource";
            const r = nodeRadius(n.kind);
            return (
              <g key={n.id}>
                {isResource ? (
                  <rect
                    x={n.x - r}
                    y={n.y - r}
                    width={r * 2}
                    height={r * 2}
                    rx={4}
                    fill={hot ? "rgb(var(--accent))" : "var(--panel)"}
                    stroke={hot ? "rgb(var(--accent))" : "var(--line)"}
                    strokeWidth={hot ? 2.5 : 1.5}
                  />
                ) : (
                  <circle
                    cx={n.x}
                    cy={n.y}
                    r={r}
                    fill={hot ? "rgb(var(--accent))" : "var(--panel)"}
                    stroke={hot ? "rgb(var(--accent))" : "var(--line)"}
                    strokeWidth={hot ? 2.5 : 1.5}
                  />
                )}
                <text
                  x={n.x}
                  y={n.y + 4}
                  fontSize={12}
                  textAnchor="middle"
                  fill={hot ? "var(--accent-ink)" : "var(--ink)"}
                  fontFamily="monospace"
                >
                  {n.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <p className="mt-1 text-xs text-ink-faint">
        Circles are processes; rectangles are resources. An arrow from a
        process to a resource is a request; resource → process is held.
      </p>
    </figure>
  );
}
