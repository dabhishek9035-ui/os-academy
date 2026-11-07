"use client";

import { SimShell } from "./SimShell";
import {
  vmEngine,
  simulateAll,
  type VmState,
} from "@/modules/virtual-memory/engine";

/**
 * Focused variant of the paging lab: three algorithms race over the same
 * reference string, frame contents shown after every reference.
 */
export function PageReplacementLab() {
  return (
    <SimShell
      engine={vmEngine}
      title="Page Replacement Lab"
      description="FIFO vs LRU vs Optimal on your own reference string — frame by frame."
      toolbar={(sim) => (
        <>
          <label className="flex items-center gap-1.5 text-xs text-ink-muted">
            Frames
            <input
              type="number"
              min={1}
              max={7}
              className="w-12 rounded-md border border-line bg-panel px-1.5 py-1 text-xs"
              value={sim.state.frames.length}
              onChange={(e) => sim.dispatch({ type: "set-frames", payload: Number(e.target.value) })}
              aria-label="Number of frames"
            />
          </label>
          <label className="flex items-center gap-1.5 text-xs text-ink-muted">
            String (pages)
            <input
              className="w-44 rounded-md border border-line bg-panel px-2 py-1 font-mono text-xs"
              value={sim.state.referenceString.map((a) => Math.floor(a / 16)).join(",")}
              onChange={(e) => {
                const pages = e.target.value
                  .split(/[,\s]+/)
                  .filter((p) => p.length > 0)
                  .map((p) => Number(p) * 16);
                sim.dispatch({ type: "set-string", payload: pages.join(",") });
              }}
              aria-label="Reference string as page numbers"
            />
          </label>
        </>
      )}
      note="FIFO evicts the oldest resident page (subject to Belady's anomaly); LRU evicts the least recently used; Optimal looks ahead. The totals panel counts faults over the WHOLE string for all three — no TLB in this comparison."
      inspector={(sim) => <Totals state={sim.state} />}
      compact
    >
      {(sim) => <FramesViz state={sim.state} />}
    </SimShell>
  );
}

function FramesViz({ state }: { state: VmState }) {
  const pages = state.referenceString.map((a) => Math.floor(a / 16));
  return (
    <div className="space-y-3">
      <div className="thin-scroll overflow-x-auto">
        <table className="min-w-[560px] border-collapse text-center font-mono text-xs">
          <caption className="sr-only">Frame contents after every reference</caption>
          <thead>
            <tr>
              <th scope="col" className="p-1 text-left text-ink-faint">ref</th>
              {pages.map((p, i) => (
                <th
                  key={i}
                  scope="col"
                  className={`p-1 ${i < state.cursor ? "text-ink" : "text-ink-faint"} ${i === state.cursor - 1 ? "underline decoration-accent" : ""}`}
                >
                  {p}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {state.frames.map((_, f) => (
              <tr key={f}>
                <td className="p-1 text-left text-ink-faint">F{f}</td>
                {pages.map((_, i) => {
                  // replay to get frame contents after reference i
                  const replay = simulateUpTo(pages, state.frames.length, state.algorithm, i);
                  const filled = replay.frames[f] ?? null;
                  const isFaultAt = i > 0 ? replay.fault : true;
                  const revealed = i < state.cursor;
                  return (
                    <td
                      key={i}
                      className={`p-0.5 ${revealed ? "" : "opacity-25"}`}
                      title={revealed ? (isFaultAt ? "fault" : "hit") : undefined}
                    >
                      <span
                        className={`inline-block w-8 rounded border px-1 py-0.5 ${
                          revealed && filled !== null
                            ? isFaultAt
                              ? "border-warn/60 bg-warn/10 text-ink"
                              : "border-ok/50 bg-ok/10 text-ink"
                          : "border-line text-ink-faint"
                        }`}
                      >
                        {filled !== null && revealed ? filled : "·"}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-ink-faint">
        Amber = fault (page brought in), green = hit. Revealed as the walk progresses.
      </p>
    </div>
  );
}

/** Replay the active algorithm up to (and including) reference index `upto`. */
function simulateUpTo(
  pages: number[],
  numFrames: number,
  algorithm: "fifo" | "lru" | "optimal",
  upto: number,
): { frames: (number | null)[]; fault: boolean } {
  const frames: (number | null)[] = Array(numFrames).fill(null);
  const loadedAt: number[] = Array(numFrames).fill(0);
  const lastUsed: number[] = Array(numFrames).fill(0);
  let fault = false;
  for (let t = 0; t <= upto && t < pages.length; t += 1) {
    const page = pages[t];
    const idx = frames.indexOf(page);
    if (idx >= 0) {
      lastUsed[idx] = t;
      fault = false;
      continue;
    }
    fault = true;
    const free = frames.indexOf(null);
    if (free >= 0) {
      frames[free] = page;
      loadedAt[free] = t;
      lastUsed[free] = t;
      continue;
    }
    let victim = 0;
    if (algorithm === "fifo") {
      victim = loadedAt.indexOf(Math.min(...loadedAt));
    } else if (algorithm === "lru") {
      victim = lastUsed.indexOf(Math.min(...lastUsed));
    } else {
      let furthest = -1;
      for (let f = 0; f < numFrames; f += 1) {
        const nextUse = pages.indexOf(frames[f] as number, t + 1);
        const dist = nextUse === -1 ? Infinity : nextUse;
        if (dist > furthest) {
          furthest = dist;
          victim = f;
        }
      }
    }
    frames[victim] = page;
    loadedAt[victim] = t;
    lastUsed[victim] = t;
  }
  return { frames: [...frames], fault };
}

function Totals({ state }: { state: VmState }) {
  const pages = state.referenceString.map((a) => Math.floor(a / 16));
  const totals = simulateAll(pages, state.frames.length);
  return (
    <div className="rounded-lg border border-line bg-bg-soft p-3">
      <span className="section-label">Full-string faults ({state.frames.length} frames)</span>
      <ul className="mt-2 space-y-1 font-mono text-xs">
        <li className="flex justify-between text-ink-muted">
          <span>FIFO</span>
          <span>{totals.fifo.faults}</span>
        </li>
        <li className="flex justify-between text-ink-muted">
          <span>LRU</span>
          <span>{totals.lru.faults}</span>
        </li>
        <li className="flex justify-between text-accent">
          <span>Optimal</span>
          <span>{totals.optimal.faults}</span>
        </li>
      </ul>
      <p className="mt-2 text-[11px] text-ink-faint">
        {totals.optimal.faults <= totals.lru.faults && totals.optimal.faults <= totals.fifo.faults
          ? "Optimal is a lower bound — no algorithm can do better on this string."
          : "Check your string — Optimal should never lose."}
      </p>
    </div>
  );
}
