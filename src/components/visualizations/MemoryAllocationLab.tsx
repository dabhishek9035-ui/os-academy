"use client";

import { SimShell } from "./SimShell";
import {
  memoryEngine,
  type MemoryAction,
  type FitStrategy,
  type MemoryState,
} from "@/modules/memory-management/engine";
import { processColor, type SimAction } from "@/types";
import { useState } from "react";

const UNIT = 11; // px per memory unit

export function MemoryAllocationLab() {
  return (
    <SimShell
      engine={memoryEngine}
      title="Memory Allocation Lab"
      description="Allocate and free blocks; compare first, best and worst fit and watch holes form."
      toolbar={(sim) => (
        <label className="flex items-center gap-1.5 text-xs text-ink-muted">
          Strategy
          <select
            className="rounded-md border border-line bg-panel px-2 py-1 text-xs"
            value={sim.state.strategy}
            onChange={(e) =>
              sim.dispatch({ type: "set-strategy", payload: e.target.value as FitStrategy })
            }
            aria-label="Placement strategy"
          >
            <option value="first">First fit</option>
            <option value="best">Best fit</option>
            <option value="worst">Worst fit</option>
          </select>
        </label>
      )}
      note="Single owner per block; compaction is instantaneous (real compaction costs CPU time and may need relocation support). External fragmentation = free space outside the largest hole, as a share of all free space."
      inspector={(sim) => <FreeList state={sim.state} />}
    >
      {(sim) => <Strip state={sim.state} dispatch={sim.dispatch} />}
    </SimShell>
  );
}

type Dispatch = (a: SimAction<MemoryAction>) => void;

function Strip({ state, dispatch }: { state: MemoryState; dispatch: Dispatch }) {
  const [pid, setPid] = useState("");
  const [size, setSize] = useState(8);
  const colors: Record<string, string> = {};
  let colorIdx = 0;
  for (const b of state.blocks) {
    if (b.owner && b.owner !== "kernel" && !colors[b.owner]) {
      colors[b.owner] = processColor(colorIdx++);
    }
  }

  return (
    <div className="space-y-3">
      {state.error ? (
        <p role="alert" className="rounded-lg border border-bad/40 bg-bad/10 px-3 py-2 text-xs text-ink">
          {state.error}
        </p>
      ) : null}
      <div className="thin-scroll overflow-x-auto rounded-lg border border-line bg-bg-soft p-3">
        <div
          className="relative flex h-24 min-w-[600px] items-stretch"
          role="img"
          aria-label="Memory strip showing allocated blocks and free holes"
        >
          {state.blocks.map((b, i) => {
            const isFree = b.owner === null;
            const owner = b.owner;
            return (
              <div
                key={i}
                className={`relative flex flex-col items-center justify-center border-r border-line/60 text-[10px] ${
                  isFree ? "bg-bad/10 text-ink-faint" : "text-ink"
                }`}
                style={{
                  width: b.size * UNIT,
                  background: isFree
                    ? undefined
                    : owner === "kernel"
                      ? "var(--panel-soft)"
                      : colors[owner as string],
                }}
                title={isFree ? `Free hole: ${b.size} units @ ${b.start}` : `${owner}: ${b.size} units @ ${b.start}`}
              >
                <span className="font-mono">{isFree ? `hole` : b.owner}</span>
                <span className="font-mono opacity-70">{b.size}u</span>
              </div>
            );
          })}
        </div>
        <div className="mt-1 flex justify-between font-mono text-[10px] text-ink-faint">
          <span>0</span>
          <span>{state.memorySize / 2}</span>
          <span>{state.memorySize}</span>
        </div>
      </div>

      <form
        className="flex flex-wrap items-center gap-2"
        action="#"
        onSubmit={(e) => {
          e.preventDefault();
          if (pid.trim()) dispatch({ type: "alloc", payload: { pid: pid.trim(), size } });
          setPid("");
        }}
      >
        <input
          className="w-24 rounded-md border border-line bg-panel px-2 py-1 text-xs"
          placeholder="process"
          value={pid}
          onChange={(e) => setPid(e.target.value)}
          aria-label="Process name for allocation"
        />
        <input
          type="number"
          min={1}
          max={64}
          className="w-20 rounded-md border border-line bg-panel px-2 py-1 text-xs"
          value={size}
          onChange={(e) => setSize(Number(e.target.value))}
          aria-label="Allocation size"
        />
        <button type="submit" className="btn text-xs">
          Allocate
        </button>
        {state.blocks
          .filter((b) => b.owner && b.owner !== "kernel")
          .map((b) => b.owner!)
          .filter((v, i, a) => a.indexOf(v) === i)
          .map((owner) => (
            <button
              key={owner}
              type="button"
              className="chip hover:border-accent/50"
              onClick={() => dispatch({ type: "free", payload: owner })}
            >
              free {owner}
            </button>
          ))}
        <button type="button" className="btn text-xs" onClick={() => dispatch({ type: "compact" })}>
          Compact
        </button>
      </form>
    </div>
  );
}

function FreeList({ state }: { state: MemoryState }) {
  const holes = state.blocks.filter((b) => b.owner === null);
  return (
    <div className="rounded-lg border border-line bg-bg-soft p-3">
      <span className="section-label">Free list</span>
      {holes.length === 0 ? (
        <p className="mt-1.5 text-xs text-ink-faint">No free memory.</p>
      ) : (
        <ul className="mt-1.5 space-y-1 font-mono text-xs text-ink-muted">
          {holes.map((h, i) => (
            <li key={i}>
              hole @{h.start}: {h.size} units
            </li>
          ))}
        </ul>
      )}
      <dl className="mt-2 space-y-1 text-xs text-ink-muted">
        <div className="flex justify-between">
          <dt>External fragmentation</dt>
          <dd className="font-mono">{state.stats.externalFragPercent}%</dd>
        </div>
        <div className="flex justify-between">
          <dt>Largest hole</dt>
          <dd className="font-mono">{state.stats.largestFree}u</dd>
        </div>
        <div className="flex justify-between">
          <dt>Failed allocations</dt>
          <dd className="font-mono">{state.stats.failedAllocs}</dd>
        </div>
      </dl>
    </div>
  );
}
