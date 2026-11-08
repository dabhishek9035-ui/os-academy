"use client";

import { useMemo } from "react";
import { SimShell } from "./SimShell";
import {
  vmEngine,
  simulateAll,
  simulateSteps,
  type ReplacementAlgorithm,
  type VmState,
} from "@/modules/virtual-memory/engine";
import { FrameGrid, Meter } from "./kit";

const BELADY_STRING = "1,2,3,4,1,2,5,1,2,3,4,5";

/**
 * Three replacement policies race over the same reference string. The frame
 * grid, fault marks and victim highlights all come from the engine's
 * simulateSteps — the lab never re-implements a policy.
 */
export function PageReplacementLab() {
  return (
    <SimShell
      engine={vmEngine}
      title="Page Replacement Lab"
      description="FIFO vs LRU vs Optimal on your own reference string — frame by frame, with Belady's anomaly one click away."
      toolbar={(sim) => (
        <>
          <button
            type="button"
            className="chip hover:border-accent/50"
            title={`Load the classic Belady string: FIFO with 3 frames causes 9 faults, with 4 frames 10 — more frames, more faults.`}
            onClick={() =>
              sim.dispatch({
                type: "set-string",
                payload: BELADY_STRING.split(",")
                  .map((p) => Number(p) * 16)
                  .join(","),
              })
            }
          >
            Belady preset
          </button>
          <label className="flex items-center gap-1.5 text-xs text-ink-muted">
            Algorithm
            <select
              className="rounded-md border border-line bg-panel px-1.5 py-1 text-xs text-ink"
              value={sim.state.algorithm}
              onChange={(e) =>
                sim.dispatch({ type: "set-algorithm", payload: e.target.value as ReplacementAlgorithm })
              }
              aria-label="Replacement algorithm"
            >
              <option value="fifo">FIFO</option>
              <option value="lru">LRU</option>
              <option value="optimal">Optimal</option>
            </select>
          </label>
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
  const pages = useMemo(
    () => state.referenceString.map((a) => Math.floor(a / 16)),
    [state.referenceString],
  );
  const steps = useMemo(
    () => simulateSteps(pages, state.frames.length, state.algorithm),
    [pages, state.frames.length, state.algorithm],
  );
  const revealedSteps = steps.slice(0, state.cursor);
  const revealedFaults = revealedSteps.filter((s) => s.fault).length;
  const hitRate =
    revealedSteps.length === 0
      ? null
      : (revealedSteps.length - revealedFaults) / revealedSteps.length;

  return (
    <div className="space-y-3">
      <FrameGrid
        columns={revealedSteps.map((s) => ({
          page: s.page,
          frames: s.frames,
          fault: s.fault,
          victimFrame: s.victimFrame ?? undefined,
        }))}
        caption={`Frame contents after every reference — ${state.algorithm.toUpperCase()} on ${pages.length} references. The column header is the requested page; the reference walk reveals columns as it goes.`}
      />
      {hitRate !== null ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Meter
            label="Hit rate so far"
            value={(hitRate * 100)}
            display={`${Math.round(hitRate * 100)}%`}
            tone={hitRate >= 0.5 ? "ok" : "warn"}
            caption={`${revealedSteps.length - revealedFaults} hits / ${revealedSteps.length} revealed references`}
          />
          <Meter
            label="Fault rate so far"
            value={(revealedFaults / revealedSteps.length) * 100}
            display={`${Math.round((revealedFaults / revealedSteps.length) * 100)}%`}
            tone={revealedFaults / revealedSteps.length <= 0.5 ? "neutral" : "bad"}
            caption={`${revealedFaults} faults so far — each fault means a disk read`}
          />
        </div>
      ) : (
        <p className="text-xs text-ink-faint">
          Press play or step forward — the grid fills column by column.
        </p>
      )}
    </div>
  );
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
      <p className="mt-2 text-xs text-ink-faint">
        {totals.optimal.faults <= totals.lru.faults && totals.optimal.faults <= totals.fifo.faults
          ? "Optimal is a lower bound — no algorithm can do better on this string."
          : "Check your string — Optimal should never lose."}
      </p>
      <p className="mt-2 text-xs text-ink-faint">
        Try the Belady preset with 3 frames, then 4: FIFO gets <em>worse</em>{" "}
        (9 → 10 faults) — the one famous anomaly of stack-free algorithms.
      </p>
    </div>
  );
}
