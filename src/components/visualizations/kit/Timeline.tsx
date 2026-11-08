"use client";

import { processColor } from "@/types";

function rowColor(index: number): string {
  return processColor(index);
}

/** One continuous run of one lane (process/CPU) between two time units. */
export interface TimelineSegment {
  /** Lane id (usually a pid); null = idle. */
  pid: string | null;
  start: number;
  end: number;
  /** Optional per-segment annotation (e.g. "preempted", "I/O wait"). */
  label?: string;
  /** Which lane this belongs to when lanes ≠ pids (multi-CPU). */
  lane?: string;
}

/**
 * Gantt-style timeline: one horizontal lane per process (or CPU), a shared
 * time axis, and red bands for idle periods. Reveals decisions progressively
 * via `revealed` (the simulation cursor).
 */
export function Timeline({
  segments,
  lanes,
  revealed = segments.length,
  unitWidth = 34,
  unitLabel = "time",
  caption,
  idleNote = "Red bands are idle periods — wasted capacity.",
  segmentColor,
}: {
  segments: TimelineSegment[];
  /** Ordered lane ids; a row is drawn for each, even if it never runs. */
  lanes: string[];
  revealed?: number;
  unitWidth?: number;
  unitLabel?: string;
  caption?: string;
  idleNote?: string | null;
  /** Optional override (e.g. colour by activity, not by lane). */
  segmentColor?: (segment: TimelineSegment, laneIndex: number) => string;
}) {
  const visible = segments.slice(0, revealed);
  const makespan = Math.max(1, ...segments.map((s) => s.end));
  const width = Math.max(560, makespan * unitWidth + 30);
  const rowH = 26;
  const height = lanes.length * rowH + 30;

  return (
    <figure className="rounded-lg border border-line bg-bg-soft p-3">
      {caption ? (
        <figcaption className="mb-2 text-xs text-ink-muted">{caption}</figcaption>
      ) : null}
      <div className="thin-scroll overflow-x-auto">
        <svg
          role="img"
          aria-label={`Timeline of ${unitLabel} allocation per lane: ${lanes.join(", ")}`}
          viewBox={`0 0 ${width} ${height}`}
          width={width}
          height={height}
        >
          {Array.from({ length: makespan + 1 }, (_, t) => (
            <g key={t}>
              <line
                x1={t * unitWidth + 26}
                y1={0}
                x2={t * unitWidth + 26}
                y2={height - 18}
                stroke="var(--line)"
                strokeWidth={1}
              />
              {makespan <= 40 || t % 2 === 0 ? (
                <text x={t * unitWidth + 29} y={height - 5} fontSize={12} fill="var(--ink-faint)">
                  {t}
                </text>
              ) : null}
            </g>
          ))}
          {lanes.map((lane, row) => (
            <g key={lane} transform={`translate(0 ${row * rowH})`}>
              <text x={2} y={rowH - 9} fontSize={12} fill="var(--ink-muted)" fontFamily="monospace">
                {lane}
              </text>
              {visible.map((s, i) =>
                (s.lane ?? s.pid) === lane && s.pid ? (
                  <rect
                    key={i}
                    x={s.start * unitWidth + 26}
                    y={3}
                    width={Math.max(1, (s.end - s.start) * unitWidth - 2)}
                    height={rowH - 10}
                    rx={3}
                    fill={segmentColor ? segmentColor(s, row) : rowColor(row)}
                  >
                    <title>{`${lane}: ${s.start} → ${s.end}${s.label ? ` (${s.label})` : ""}`}</title>
                  </rect>
                ) : null,
              )}
            </g>
          ))}
          {/* Idle bands: drawn on the first lane row */}
          {visible.map((s, i) =>
            s.pid === null ? (
              <g key={`idle-${i}`}>
                <rect
                  x={s.start * unitWidth + 26}
                  y={8}
                  width={Math.max(1, (s.end - s.start) * unitWidth - 2)}
                  height={rowH - 16}
                  fill="rgb(var(--bad))"
                  opacity={0.55}
                >
                  <title>{`Idle: ${s.start} → ${s.end}${s.label ? ` (${s.label})` : ""}`}</title>
                </rect>
                <text
                  x={s.start * unitWidth + 28}
                  y={rowH - 12}
                  fontSize={12}
                  fill="var(--ink)"
                >
                  idle
                </text>
              </g>
            ) : null,
          )}
        </svg>
      </div>
      {idleNote ? <p className="mt-1 text-xs text-ink-faint">{idleNote}</p> : null}
    </figure>
  );
}
