"use client";

import { useState } from "react";
import { SimShell } from "./SimShell";
import { ragEngine, type RagAction, type RagState } from "@/modules/deadlocks/engine";
import type { SimAction } from "@/types";

export function RagLab() {
  return (
    <SimShell
      engine={ragEngine}
      title="Resource Allocation Graph Lab"
      description="Add processes and resources, make requests, grant them, and run deadlock detection."
      toolbar={(sim) => (
        <button type="button" className="btn btn-primary text-xs" onClick={() => sim.dispatch({ type: "detect" })}>
          Detect deadlock
        </button>
      )}
      note="With single-unit resources a cycle in the wait-for graph IS a deadlock. With multi-unit resources the engine uses the standard reduction algorithm (a cycle is only necessary, not sufficient) — the detection result reflects that."
      compact
    >
      {(sim) => <RagViz state={sim.state} dispatch={sim.dispatch} />}
    </SimShell>
  );
}

type Dispatch = (a: SimAction<RagAction>) => void;

/** Deterministic circle layout for the graph. */
function layout(state: RagState): Record<string, { x: number; y: number }> {
  const pos: Record<string, { x: number; y: number }> = {};
  state.processes.forEach((p, i) => {
    pos[p] = { x: 110, y: 46 + i * 62 };
  });
  state.resources.forEach((r, i) => {
    pos[r.id] = { x: 330, y: 46 + i * 62 };
  });
  return pos;
}

function RagViz({ state, dispatch }: { state: RagState; dispatch: Dispatch }) {
  const pos = layout(state);
  const [reqPid, setReqPid] = useState(state.processes[0] ?? "P1");
  const [reqRid, setReqRid] = useState(state.resources[0]?.id ?? "R1");
  const [reqUnits, setReqUnits] = useState(1);
  const freeOf = (rid: string) => {
    const total = state.resources.find((r) => r.id === rid)?.units ?? 0;
    const held = state.processes.reduce((a, p) => a + (state.held[p]?.[rid] ?? 0), 0);
    return total - held;
  };

  return (
    <div className="grid gap-3 lg:grid-cols-[1fr_280px]">
      <div>
        {state.error ? (
          <p role="alert" className="mb-2 rounded-lg border border-bad/40 bg-bad/10 px-3 py-2 text-xs text-ink">
            {state.error}
          </p>
        ) : null}
        {state.analysis ? (
          <p
            role="status"
            className={`mb-2 rounded-lg border px-3 py-2 text-xs ${
              state.analysis.deadlocked.length === 0
                ? "border-ok/50 bg-ok/10 text-ink"
                : "border-bad/50 bg-bad/10 text-ink"
            }`}
          >
            {state.analysis.reason}
          </p>
        ) : null}
        <div className="thin-scroll overflow-x-auto rounded-lg border border-line bg-bg-soft p-2">
          <svg viewBox="0 0 440 220" className="min-w-[420px]" role="img" aria-label="Resource allocation graph: processes as circles, resources as rectangles">
            {/* assignment edges: resource → process */}
            {state.processes.flatMap((p) =>
              state.resources
                .filter((r) => (state.held[p]?.[r.id] ?? 0) > 0)
                .map((r) => {
                  const a = pos[r.id];
                  const b = pos[p];
                  if (!a || !b) return null;
                  return (
                    <line key={`h-${p}-${r.id}`} x1={a.x - 26} y1={a.y} x2={b.x + 18} y2={b.y} stroke="var(--ok)" strokeWidth={1.6} markerEnd="url(#arrow-ok)" />
                  );
                }),
            )}
            {/* request edges: process → resource */}
            {state.requests.map((req, i) => {
              const a = pos[req.pid];
              const b = pos[req.rid];
              if (!a || !b) return null;
              const deadlocked = state.analysis?.deadlocked.includes(req.pid);
              return (
                <line
                  key={`rq-${i}`}
                  x1={a.x + 18}
                  y1={a.y + (i % 2 === 0 ? -6 : 6)}
                  x2={b.x - 26}
                  y2={b.y}
                  stroke={deadlocked ? "var(--bad)" : "var(--warn)"}
                  strokeWidth={1.6}
                  strokeDasharray="5 3"
                  markerEnd="url(#arrow-warn)"
                />
              );
            })}
            <defs>
              <marker id="arrow-ok" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
                <path d="M0,0 L8,4 L0,8 z" fill="var(--ok)" />
              </marker>
              <marker id="arrow-warn" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
                <path d="M0,0 L8,4 L0,8 z" fill="var(--warn)" />
              </marker>
            </defs>
            {state.processes.map((p) => {
              const dead = state.analysis?.deadlocked.includes(p);
              return (
                <g key={p}>
                  <circle
                    cx={pos[p].x}
                    cy={pos[p].y}
                    r={18}
                    fill="var(--panel)"
                    stroke={dead ? "var(--bad)" : "var(--accent)"}
                    strokeWidth={dead ? 2.4 : 1.6}
                  />
                  <text x={pos[p].x} y={pos[p].y + 4} textAnchor="middle" fontSize={11} fill="var(--ink)" fontFamily="monospace">
                    {p}
                  </text>
                </g>
              );
            })}
            {state.resources.map((r) => (
              <g key={r.id}>
                <rect x={pos[r.id].x - 24} y={pos[r.id].y - 14} width={48} height={28} rx={4} fill="var(--panel)" stroke="var(--line)" strokeWidth={1.6} />
                <text x={pos[r.id].x} y={pos[r.id].y - 2} textAnchor="middle" fontSize={10} fill="var(--ink)" fontFamily="monospace">
                  {r.id}
                </text>
                <text x={pos[r.id].x} y={pos[r.id].y + 9} textAnchor="middle" fontSize={9} fill="var(--ink-faint)" fontFamily="monospace">
                  {r.units}u · {freeOf(r.id)} free
                </text>
              </g>
            ))}
          </svg>
        </div>
        <p className="mt-1 text-[11px] text-ink-faint">
          Solid green = assignment (held), dashed amber = pending request; requests from deadlocked
          processes turn red after detection.
        </p>
      </div>

      <div className="space-y-2.5">
        <fieldset className="rounded-lg border border-line bg-bg-soft p-2.5">
          <legend className="section-label px-1">New request</legend>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <select className="rounded border border-line bg-panel px-1.5 py-1 text-xs" value={reqPid} onChange={(e) => setReqPid(e.target.value)} aria-label="Requesting process">
              {state.processes.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            <span className="text-xs text-ink-faint">→</span>
            <select className="rounded border border-line bg-panel px-1.5 py-1 text-xs" value={reqRid} onChange={(e) => setReqRid(e.target.value)} aria-label="Requested resource">
              {state.resources.map((r) => (
                <option key={r.id} value={r.id}>{r.id} ({freeOf(r.id)} free)</option>
              ))}
            </select>
            <input
              type="number"
              min={1}
              className="w-14 rounded border border-line bg-panel px-1.5 py-1 text-xs"
              value={reqUnits}
              onChange={(e) => setReqUnits(Number(e.target.value))}
              aria-label="Units requested"
            />
            <button
              type="button"
              className="btn text-xs"
              onClick={() => dispatch({ type: "request", payload: { pid: reqPid, rid: reqRid, units: reqUnits } })}
            >
              request
            </button>
          </div>
        </fieldset>

        <div className="rounded-lg border border-line bg-bg-soft p-2.5">
          <span className="section-label">Pending requests</span>
          {state.requests.length === 0 ? (
            <p className="mt-1 text-xs text-ink-faint">None.</p>
          ) : (
            <ul className="mt-1 space-y-1">
              {state.requests.map((r, i) => (
                <li key={i} className="flex items-center justify-between gap-1.5 text-xs">
                  <span className="font-mono text-ink-muted">
                    {r.pid} → {r.units} × {r.rid}
                  </span>
                  <span className="flex gap-1">
                    <button
                      type="button"
                      className="chip hover:border-ok/60"
                      onClick={() => dispatch({ type: "grant", payload: { pid: r.pid, rid: r.rid, units: r.units } })}
                    >
                      grant
                    </button>
                    <button
                      type="button"
                      className="chip hover:border-bad/60"
                      onClick={() => dispatch({ type: "deny", payload: r.pid })}
                    >
                      deny
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
