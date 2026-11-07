"use client";

import { SimShell } from "./SimShell";
import {
  readersWritersEngine,
  diningEngine,
  type RwState,
  type DiningState,
} from "@/modules/synchronization/engine";

export function ReadersWritersLab() {
  return (
    <SimShell
      engine={readersWritersEngine}
      title="Readers–Writers Lab"
      description="Readers share the database; writers need it exclusively. Compare the two priority strategies."
      toolbar={(sim) => (
        <>
          <button type="button" className="btn text-xs" onClick={() => sim.dispatch({ type: "add-reader" })}>
            + reader
          </button>
          <button type="button" className="btn text-xs" onClick={() => sim.dispatch({ type: "add-writer" })}>
            + writer
          </button>
          <select
            className="rounded-md border border-line bg-panel px-2 py-1 text-xs"
            value={sim.state.strategy}
            onChange={(e) => sim.dispatch({ type: "set-strategy", payload: e.target.value })}
            aria-label="Priority strategy"
          >
            <option value="reader-priority">Reader priority</option>
            <option value="writer-priority">Writer priority</option>
          </select>
        </>
      )}
      note="Reader priority admits any reader while no writer holds the lock — writers can starve. Writer priority blocks NEW readers once a writer waits — readers can starve. Both are honest, flawed choices; the lesson discusses the third classic fix."
    >
      {(sim) => <RwViz state={sim.state} />}
    </SimShell>
  );
}

function RwViz({ state }: { state: RwState }) {
  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-line bg-bg-soft p-3">
        <div
          className={`flex min-h-16 items-center gap-2 rounded-lg border-2 px-3 py-2 transition-colors ${
            state.writersActive > 0
              ? "border-bad/60 bg-bad/10"
              : state.readersActive > 0
                ? "border-ok/60 bg-ok/10"
                : "border-line"
          }`}
          role="img"
          aria-label={`Database: ${state.readersActive} reading, ${state.writersActive} writing`}
        >
          {state.writersActive > 0 ? (
            <span className="text-sm font-semibold text-bad">✍ writing — exclusive</span>
          ) : state.readersActive > 0 ? (
            <span className="text-sm font-semibold text-ok">
              📖 {state.readersActive} reader{state.readersActive === 1 ? "" : "s"} — shared access
            </span>
          ) : (
            <span className="text-sm text-ink-faint">database idle</span>
          )}
        </div>
      </div>
      <ul className="grid gap-1.5 sm:grid-cols-2">
        {state.agents.map((a) => (
          <li
            key={a.id}
            className="flex items-center justify-between rounded-lg border border-line bg-panel-soft px-3 py-1.5 text-xs"
          >
            <span className="font-mono text-ink-muted">
              {a.id} <span className="text-ink-faint">({a.kind})</span>
            </span>
            <span
              className={
                a.state === "writing"
                  ? "text-bad"
                  : a.state === "reading"
                    ? "text-ok"
                    : a.state === "done"
                      ? "text-ink-faint"
                      : "text-warn"
              }
            >
              {a.state}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function DiningPhilosophersLab() {
  return (
    <SimShell
      engine={diningEngine}
      title="Dining Philosophers Lab"
      description="Five philosophers, five forks, two strategies — one of them deadlocks on cue."
      toolbar={(sim) => (
        <select
          className="rounded-md border border-line bg-panel px-2 py-1 text-xs"
          value={sim.state.strategy}
          onChange={(e) => sim.dispatch({ type: "set-strategy", payload: e.target.value })}
          aria-label="Strategy"
        >
          <option value="naive">Naive (left then right)</option>
          <option value="hierarchy">Resource hierarchy (low fork first)</option>
        </select>
      )}
      note="Naive: each philosopher grabs the left fork then waits for the right — all five can hold-and-wait simultaneously (circular wait → deadlock, detected live). Hierarchy: everyone picks the lower-numbered fork first, which makes the circular wait impossible."
    >
      {(sim) => <DiningViz state={sim.state} />}
    </SimShell>
  );
}

function DiningViz({ state }: { state: DiningState }) {
  const R = 110;
  const cx = 160;
  const cy = 150;
  const deadlocked =
    state.strategy === "naive" &&
    state.philosophers.every((p) => p.state === "blocked" || p.state === "has-left");
  return (
    <div className="grid gap-3 sm:grid-cols-[340px_1fr]">
      <div className="rounded-lg border border-line bg-bg-soft p-2">
        <svg viewBox="0 0 320 300" role="img" aria-label="Dining philosophers around a circular table">
          {state.philosophers.map((p, i) => {
            const angle = (i / state.philosophers.length) * Math.PI * 2 - Math.PI / 2;
            const x = cx + R * Math.cos(angle);
            const y = cy + R * Math.sin(angle);
            const fx = cx + (R - 52) * Math.cos(angle + Math.PI / 5);
            const fy = cy + (R - 52) * Math.sin(angle + Math.PI / 5);
            const held =
              p.state === "has-left" ||
              p.state === "has-right" ||
              p.state === "eating";
            const color =
              p.state === "eating"
                ? "var(--ok)"
                : p.state === "blocked" || p.state === "has-left"
                  ? deadlocked
                    ? "var(--bad)"
                    : "var(--warn)"
                  : "var(--line)";
            return (
              <g key={p.id}>
                <circle cx={x} cy={y} r={26} fill="var(--panel)" stroke={color} strokeWidth={deadlocked ? 2.4 : 1.6} />
                <text x={x} y={y - 4} textAnchor="middle" fontSize={12} fill="var(--ink)" fontFamily="monospace">
                  P{p.id}
                </text>
                <text x={x} y={y + 10} textAnchor="middle" fontSize={9} fill="var(--ink-faint)">
                  {p.state}
                </text>
                <circle
                  cx={fx}
                  cy={fy}
                  r={7}
                  fill={held ? color : "var(--panel-soft)"}
                  stroke="var(--line)"
                />
                <text x={fx} y={fy + 3} textAnchor="middle" fontSize={7} fill="var(--ink-muted)" fontFamily="monospace">
                  f{(i + 1) % 5}
                </text>
              </g>
            );
          })}
          <circle cx={cx} cy={cy} r={30} fill="var(--accent-soft)" />
          <text x={cx} y={cy + 4} textAnchor="middle" fontSize={12} fill="var(--ink)" fontFamily="monospace">
            🍜
          </text>
        </svg>
        <p className="mt-1 text-center text-[11px] text-ink-faint">
          {deadlocked
            ? "DEADLOCKED — every philosopher holds one fork and waits."
            : `meals so far: ${state.meals}`}
        </p>
      </div>
      <div className="space-y-1.5">
        <p className="section-label">What to notice</p>
        <ul className="space-y-1.5 text-xs leading-relaxed text-ink-muted">
          <li>
            <strong className="text-ink">Naive:</strong> within a few ticks all five philosophers
            hold their left fork and block — the four Coffman conditions in action (watch the red
            event log).
          </li>
          <li>
            <strong className="text-ink">Hierarchy:</strong> philosophers 1–4 still grab their left
            (lower) fork, but philosopher 0 must take fork 4 FIRST — the cycle is broken and every
            dinner ends.
          </li>
          <li>
            Meals only count when eating finishes; a deadlocked table serves nobody.
          </li>
        </ul>
      </div>
    </div>
  );
}
