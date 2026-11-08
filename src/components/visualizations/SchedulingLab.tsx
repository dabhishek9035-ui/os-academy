"use client";

import { useMemo } from "react";
import { SimShell } from "./SimShell";
import { QueueLane } from "./kit";
import {
  ALGORITHM_LABELS,
  PRESETS,
  computeSchedule,
  schedulingEngine,
  type SchedulingAction,
  type SchedulingAlgorithm,
  type SchedulingState,
} from "@/modules/scheduling/engine";
import { processColor, type SimAction } from "@/types";

const TIME_UNIT = 34; // px per time unit

export function SchedulingLab() {
  return (
    <SimShell
      engine={schedulingEngine}
      title="CPU Scheduling Lab"
      description="Edit the jobs, pick an algorithm, and step through every scheduling decision."
      toolbar={(sim) => (
        <>
          <label className="flex items-center gap-1.5 text-xs text-ink-muted">
            Algorithm
            <select
              className="max-w-[13rem] rounded-md border border-line bg-panel px-2 py-1 text-xs text-ink"
              value={sim.state.algorithm}
              onChange={(e) =>
                sim.dispatch({
                  type: "set-algorithm",
                  payload: e.target.value as SchedulingAlgorithm,
                })
              }
              aria-label="Scheduling algorithm"
            >
              {(Object.keys(ALGORITHM_LABELS) as SchedulingAlgorithm[]).map((a) => (
                <option key={a} value={a}>
                  {ALGORITHM_LABELS[a]}
                </option>
              ))}
            </select>
          </label>
          {sim.state.algorithm === "rr" ? (
            <label className="flex items-center gap-1.5 text-xs text-ink-muted">
              Quantum
              <input
                type="number"
                min={1}
                max={10}
                className="w-14 rounded-md border border-line bg-panel px-2 py-1 text-xs text-ink"
                value={sim.state.quantum}
                onChange={(e) =>
                  sim.dispatch({ type: "set-quantum", payload: Number(e.target.value) })
                }
                aria-label="Time quantum"
              />
            </label>
          ) : null}
          {sim.state.algorithm === "priority" ? (
            <label className="flex items-center gap-1.5 text-xs text-ink-muted">
              <select
                className="rounded-md border border-line bg-panel px-2 py-1 text-xs text-ink"
                value={sim.state.priorityMode}
                onChange={(e) =>
                  sim.dispatch({
                    type: "set-priority-mode",
                    payload: e.target.value,
                  })
                }
                aria-label="Priority preemption"
              >
                <option value="non-preemptive">Non-preemptive</option>
                <option value="preemptive">Preemptive</option>
              </select>
            </label>
          ) : null}
        </>
      )}
      note="Single CPU, no I/O bursts; each job is pure CPU work. Waiting time = turnaround − burst (valid in this model). Ties are broken by arrival time, then process id. Context switches are instantaneous. Lower priority number = higher priority."
    >
      {(sim) => <SchedulingViz state={sim.state} dispatch={sim.dispatch} />}
    </SimShell>
  );
}

type Dispatch = (a: SimAction<SchedulingAction>) => void;

function SchedulingViz({
  state,
  dispatch,
}: {
  state: SchedulingState;
  dispatch: Dispatch;
}) {
  // Derived from the REVEALED timeline only, so the queue and metrics stay
  // honest while the walk is still in progress.
  const { waitingItems, liveMetrics, now } = useMemo(() => {
    const revealed = state.result.timeline.slice(0, state.cursor);
    const t = revealed.length > 0 ? revealed[revealed.length - 1].end : 0;
    const served = new Map<string, number>();
    const firstStart = new Map<string, number>();
    const completion = new Map<string, number>();
    for (const s of revealed) {
      if (s.pid === null) continue;
      served.set(s.pid, (served.get(s.pid) ?? 0) + (s.end - s.start));
      if (!firstStart.has(s.pid)) firstStart.set(s.pid, s.start);
      completion.set(s.pid, s.end);
    }
    const waiting = state.inputs
      .filter(
        (p) =>
          p.arrival <= t &&
          (served.get(p.pid) ?? 0) < p.burst &&
          firstStart.get(p.pid) !== t, // the one running "now" isn't waiting
      )
      .sort(
        (a, b) =>
          a.arrival - b.arrival || a.pid.localeCompare(b.pid, undefined, { numeric: true }),
      );
    return {
      now: t,
      waitingItems: waiting.map((p) => ({
        id: p.pid,
        label: p.pid,
        detail: `${p.burst - (served.get(p.pid) ?? 0)}u left`,
      })),
      liveMetrics: state.inputs.map((p) => {
        const done = (served.get(p.pid) ?? 0) >= p.burst;
        const comp = done ? (completion.get(p.pid) ?? 0) : null;
        return {
          pid: p.pid,
          served: served.get(p.pid) ?? 0,
          complete: done,
          completion: comp,
          turnaround: comp !== null ? comp - p.arrival : null,
          waiting: comp !== null ? comp - p.arrival - p.burst : null,
          response: firstStart.has(p.pid) ? (firstStart.get(p.pid) as number) - p.arrival : null,
        };
      }),
    };
  }, [state.result.timeline, state.cursor, state.inputs]);

  return (
    <div className="space-y-4">
      <PresetsRow dispatch={dispatch} />
      <GanttChart
        timeline={state.result.timeline}
        cursor={state.cursor}
        error={state.error}
      />
      <QueueLane
        items={waitingItems}
        headLabel="longest waiting"
        tailLabel="newest arrival"
        emptyLabel="nothing waiting"
        caption={`Waiting at t=${now}: arrived, not finished (ordered by arrival — the queue ORDER under RR/preemption differs; the Gantt shows the real decision).`}
      />
      <AlgorithmComparison state={state} />
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <ProcessEditor state={state} dispatch={dispatch} />
        <MetricsPanel liveMetrics={liveMetrics} now={now} revealed={state.cursor > 0} />
      </div>
    </div>
  );
}

function AlgorithmComparison({ state }: { state: SchedulingState }) {
  const rows = useMemo(() => {
    const algs = Object.keys(ALGORITHM_LABELS) as SchedulingAlgorithm[];
    return algs.map((a) => ({
      alg: a,
      averages: computeSchedule(
        state.inputs,
        a,
        state.quantum,
        a === "priority" ? state.priorityMode : "non-preemptive",
      ).averages,
    }));
  }, [state.inputs, state.quantum, state.priorityMode]);

  return (
    <div className="overflow-hidden rounded-lg border border-line">
      <h4 className="bg-panel-soft px-3 py-2 text-xs text-ink-muted">
        Same jobs, all algorithms (full run) — where your pick lands
      </h4>
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left text-ink-faint">
            <th scope="col" className="px-3 py-1.5 font-medium">Algorithm</th>
            <th scope="col" className="px-3 py-1.5 font-medium">avg wait</th>
            <th scope="col" className="px-3 py-1.5 font-medium">avg turnaround</th>
            <th scope="col" className="px-3 py-1.5 font-medium">avg response</th>
          </tr>
        </thead>
        <tbody className="font-mono">
          {rows.map((r) => (
            <tr
              key={r.alg}
              className={`border-t border-line/60 ${
                r.alg === state.algorithm ? "bg-accent-soft font-semibold text-ink" : "text-ink-muted"
              }`}
            >
              <td className="px-3 py-1.5">{ALGORITHM_LABELS[r.alg]}</td>
              <td className="px-3 py-1.5">{r.averages.waiting.toFixed(2)}</td>
              <td className="px-3 py-1.5">{r.averages.turnaround.toFixed(2)}</td>
              <td className="px-3 py-1.5">{r.averages.response.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PresetsRow({ dispatch }: { dispatch: Dispatch }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="section-label">Scenarios</span>
      {Object.entries(PRESETS).map(([key, p]) => (
        <button
          key={key}
          type="button"
          className="chip hover:border-accent/50"
          title={p.note}
          onClick={() => dispatch({ type: "load-preset", payload: key })}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}

function GanttChart({
  timeline,
  cursor,
  error,
}: {
  timeline: SchedulingState["result"]["timeline"];
  cursor: number;
  error: string | null;
}) {
  if (error) {
    return (
      <div
        role="alert"
        className="rounded-lg border border-bad/40 bg-bad/10 px-4 py-3 text-sm text-ink"
      >
        {error}
      </div>
    );
  }
  const makespan = Math.max(1, ...timeline.map((s) => s.end));
  const width = Math.max(620, makespan * TIME_UNIT + 30);
  const pids: string[] = [];
  for (const s of timeline) if (s.pid && !pids.includes(s.pid)) pids.push(s.pid);
  const rowH = 26;
  const height = pids.length * rowH + 30;

  return (
    <figure className="rounded-lg border border-line bg-bg-soft p-3">
      <figcaption className="mb-2 text-xs text-ink-muted">
        Gantt chart — revealed decisions shown; the axis marks elapsed time units.
      </figcaption>
      <div className="thin-scroll overflow-x-auto">
        <svg
          role="img"
          aria-label="Gantt chart of CPU allocation over time"
          viewBox={`0 0 ${width} ${height}`}
          width={width}
          height={height}
        >
          {Array.from({ length: makespan + 1 }, (_, t) => (
            <g key={t}>
              <line
                x1={t * TIME_UNIT + 26}
                y1={0}
                x2={t * TIME_UNIT + 26}
                y2={height - 18}
                stroke="var(--line)"
                strokeWidth={1}
              />
              {makespan <= 40 || t % 2 === 0 ? (
                <text x={t * TIME_UNIT + 29} y={height - 5} fontSize={12} fill="var(--ink-faint)">
                  {t}
                </text>
              ) : null}
            </g>
          ))}
          {pids.map((pid, row) => (
            <g key={pid} transform={`translate(0 ${row * rowH})`}>
              <text x={2} y={rowH - 8} fontSize={12} fill="var(--ink-muted)" fontFamily="monospace">
                {pid}
              </text>
              {timeline.slice(0, cursor).map((s, i) =>
                s.pid === pid ? (
                  <rect
                    key={i}
                    x={s.start * TIME_UNIT + 26}
                    y={3}
                    width={Math.max(1, (s.end - s.start) * TIME_UNIT - 2)}
                    height={rowH - 10}
                    rx={3}
                    fill={processColor(pids.indexOf(pid))}
                  >
                    <title>{`${pid}: ${s.start} → ${s.end}`}</title>
                  </rect>
                ) : null,
              )}
            </g>
          ))}
          {timeline.slice(0, cursor).map((s, i) =>
            s.pid === null ? (
              <rect
                key={`idle-${i}`}
                x={s.start * TIME_UNIT + 26}
                y={pids.length * rowH - rowH + 8}
                width={Math.max(1, (s.end - s.start) * TIME_UNIT - 2)}
                height={rowH - 14}
                fill="rgb(var(--bad))"
                opacity={0.55}
              >
                <title>{`CPU idle: ${s.start} → ${s.end}`}</title>
              </rect>
            ) : null,
          )}
        </svg>
      </div>
      <p className="mt-1 text-xs text-ink-faint">
        Red bands are idle CPU periods — wasted time. Each colored bar is one
        uninterrupted run of that process.
      </p>
    </figure>
  );
}

function ProcessEditor({
  state,
  dispatch,
}: {
  state: SchedulingState;
  dispatch: Dispatch;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-line">
      <div className="thin-scroll overflow-x-auto">
        <table className="w-full text-sm">
          <caption className="bg-panel-soft px-3 py-2 text-left text-xs text-ink-muted">
            Processes — edit and watch the schedule rebuild instantly.
          </caption>
        <thead>
          <tr className="text-left text-xs text-ink-faint">
            <th scope="col" className="px-2 py-1.5 font-medium">Process</th>
            <th scope="col" className="px-2 py-1.5 font-medium">Arrival</th>
            <th scope="col" className="px-2 py-1.5 font-medium">CPU burst</th>
            <th scope="col" className="px-2 py-1.5 font-medium">Priority</th>
            <th scope="col" className="px-2 py-1.5">
              <span className="sr-only">Remove</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {state.inputs.map((p, i) => (
            <tr key={p.pid} className="border-t border-line">
              <td className="px-2 py-1.5">
                <span className="flex items-center gap-1.5">
                  <span
                    className="h-2.5 w-2.5 rounded-sm"
                    style={{ background: processColor(i) }}
                    aria-hidden
                  />
                  <input
                    className="w-14 rounded border border-line bg-panel px-1.5 py-0.5 font-mono text-xs"
                    value={p.pid}
                    aria-label={`Process id (row ${i + 1})`}
                    onChange={(e) =>
                      dispatch({
                        type: "update-process",
                        payload: { pid: p.pid, field: "pid", value: e.target.value },
                      })
                    }
                  />
                </span>
              </td>
              {(["arrival", "burst", "priority"] as const).map((field) => (
                <td key={field} className="px-2 py-1.5">
                  <input
                    type="number"
                    className="w-16 rounded border border-line bg-panel px-1.5 py-0.5 font-mono text-xs"
                    min={field === "burst" ? 1 : 0}
                    value={p[field]}
                    aria-label={`${field} of ${p.pid}`}
                    onChange={(e) =>
                      dispatch({
                        type: "update-process",
                        payload: { pid: p.pid, field, value: e.target.value },
                      })
                    }
                  />
                </td>
              ))}
              <td className="px-2 py-1.5">
                <button
                  type="button"
                  className="btn btn-ghost px-1.5 py-0.5 text-xs"
                  onClick={() => dispatch({ type: "remove-process", payload: p.pid })}
                  aria-label={`Remove ${p.pid}`}
                >
                  ✕
                </button>
              </td>
            </tr>
          ))}
        </tbody>
        </table>
      </div>
      <div className="border-t border-line px-3 py-2">
        <button
          type="button"
          className="btn text-xs"
          onClick={() => dispatch({ type: "add-process" })}
          disabled={state.inputs.length >= 8}
        >
          + Add process
        </button>
      </div>
    </div>
  );
}

function MetricsPanel({
  liveMetrics,
  now,
  revealed,
}: {
  liveMetrics: {
    pid: string;
    served: number;
    complete: boolean;
    completion: number | null;
    turnaround: number | null;
    waiting: number | null;
    response: number | null;
  }[];
  now: number;
  revealed: boolean;
}) {
  const finished = liveMetrics.filter((m) => m.complete);
  const avg = (sel: (m: (typeof liveMetrics)[number]) => number | null) =>
    finished.length === 0
      ? null
      : finished.reduce((a, m) => a + (sel(m) ?? 0), 0) / finished.length;

  return (
    <div className="rounded-lg border border-line">
      <h4 className="bg-panel-soft px-3 py-2 text-xs text-ink-muted">
        Metrics — revealed so far (t={now})
      </h4>
      {revealed ? (
        <div className="thin-scroll max-h-72 overflow-auto px-3 py-2">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-ink-faint">
                <th scope="col" className="py-1 font-medium">P</th>
                <th scope="col" className="py-1 font-medium">Comp.</th>
                <th scope="col" className="py-1 font-medium">TAT</th>
                <th scope="col" className="py-1 font-medium">Wait</th>
                <th scope="col" className="py-1 font-medium">Resp.</th>
              </tr>
            </thead>
            <tbody className="font-mono">
              {liveMetrics.map((m) => (
                <tr key={m.pid} className="border-t border-line/60">
                  <td className="py-1">{m.pid}</td>
                  <td className="py-1">
                    {m.complete ? (
                      m.completion
                    ) : (
                      <span className="text-ink-faint">ran {m.served}u</span>
                    )}
                  </td>
                  <td className="py-1">{m.turnaround ?? "–"}</td>
                  <td className="py-1">{m.waiting ?? "–"}</td>
                  <td className="py-1">{m.response ?? "–"}</td>
                </tr>
              ))}
              <tr className="border-t border-line font-semibold">
                <td className="py-1">avg*</td>
                <td />
                <td className="py-1">{avg((m) => m.turnaround)?.toFixed(2) ?? "–"}</td>
                <td className="py-1">{avg((m) => m.waiting)?.toFixed(2) ?? "–"}</td>
                <td className="py-1">{avg((m) => m.response)?.toFixed(2) ?? "–"}</td>
              </tr>
            </tbody>
          </table>
          <p className="mt-2 text-xs text-ink-faint">
            *averages over finished processes only. TAT = completion − arrival ·
            Wait = TAT − burst · Resp = first start − arrival. Full-run numbers
            are in the comparison table.
          </p>
        </div>
      ) : (
        <p className="px-3 py-3 text-xs text-ink-faint">
          Press play — metrics appear as the timeline is revealed.
        </p>
      )}
    </div>
  );
}
