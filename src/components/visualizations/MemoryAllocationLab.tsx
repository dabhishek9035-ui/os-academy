"use client";

import { SimShell } from "./SimShell";
import { MemoryStrip, Meter } from "./kit";
import {
  memoryEngine,
  translate,
  type MemoryAction,
  type FitStrategy,
  type MemoryState,
} from "@/modules/memory-management/engine";
import { type SimAction } from "@/types";
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

  return (
    <div className="space-y-3">
      {state.error ? (
        <p role="alert" className="rounded-lg border border-bad/40 bg-bad/10 px-3 py-2 text-xs text-ink">
          {state.error}
        </p>
      ) : null}
      <MemoryStrip
        blocks={state.blocks}
        total={state.memorySize}
        unitWidth={UNIT}
        caption="Physical memory: each block labelled with its owner (holes are free). Fragmentation is the free space locked in unusable slivers."
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <Meter
          label="External fragmentation"
          value={state.stats.externalFragPercent}
          display={`${state.stats.externalFragPercent}%`}
          tone={state.stats.externalFragPercent >= 50 ? "bad" : state.stats.externalFragPercent >= 25 ? "warn" : "ok"}
          caption={`free space outside the largest hole, as a share of all free space (largest hole: ${state.stats.largestFree}u)`}
        />
        <Meter
          label="Memory in use"
          value={state.blocks.filter((b) => b.owner !== null).reduce((a, b) => a + b.size, 0)}
          max={state.memorySize}
          display={`${state.blocks.filter((b) => b.owner !== null).reduce((a, b) => a + b.size, 0)}/${state.memorySize}u`}
          tone="neutral"
          caption="allocated units (kernel + processes)"
        />
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

// ---------------------------------------------------------------------------
// Address Translation Lab — dedicated view for the address-translation-lab
// sim id. Shows a process's logical address space and the physical strip
// side by side, with base/limit registers and the MMU's translation rule
// (logical + base) and protection check (logical < limit). Uses the pure
// translate() helper from the memory engine so lab and engine never diverge.
// ---------------------------------------------------------------------------

interface TranslationAccess {
  logical: number;
  physical: number | null;
  fault: boolean;
}

export function AddressTranslationLab() {
  const [base, setBase] = useState(28);
  const [limit, setLimit] = useState(16);
  const [addrInput, setAddrInput] = useState("0, 4, 12, 15, 16, 31");
  const [accesses, setAccesses] = useState<TranslationAccess[]>([]);

  const issueAccesses = () => {
    const addrs = addrInput
      .split(/[,\s]+/)
      .map((s) => Number.parseInt(s, 10))
      .filter((n) => Number.isInteger(n) && n >= 0 && n < 64);
    setAccesses(
      addrs.map((logical) => {
        const result = translate(base, limit, logical);
        return "phys" in result
          ? { logical, physical: result.phys, fault: false }
          : { logical, physical: null, fault: true };
      }),
    );
  };

  const faultCount = accesses.filter((a) => a.fault).length;

  return (
    <section className="card p-4" data-sim="address-translation">
      <header className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-ink">Address Translation Lab</h3>
          <p className="mt-0.5 text-xs text-ink-muted">
            Base-and-limit MMU: every logical address becomes base + offset —
            unless it passes the limit, which is a segmentation fault.
          </p>
        </div>
      </header>

      <div className="space-y-3">
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-xs text-ink-muted">
            Base register
            <input
              type="range"
              min={0}
              max={48}
              value={base}
              onChange={(e) => setBase(Number(e.target.value))}
              className="w-40 accent-[rgb(var(--accent))]"
              aria-label="Base register"
            />
            <span className="font-mono text-ink">base = {base}</span>
          </label>
          <label className="flex flex-col gap-1 text-xs text-ink-muted">
            Limit register
            <input
              type="range"
              min={1}
              max={32}
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="w-40 accent-[rgb(var(--accent))]"
              aria-label="Limit register"
            />
            <span className="font-mono text-ink">limit = {limit}</span>
          </label>
        </div>

        <form
          className="flex flex-wrap items-center gap-2"
          action="#"
          onSubmit={(e) => {
            e.preventDefault();
            issueAccesses();
          }}
        >
          <input
            className="w-56 rounded-md border border-line bg-panel px-2 py-1.5 text-xs"
            placeholder="logical addresses, e.g. 0, 4, 16"
            value={addrInput}
            onChange={(e) => setAddrInput(e.target.value)}
            aria-label="Logical addresses to access"
          />
          <button type="submit" className="btn text-xs">
            Run accesses
          </button>
        </form>

        <div className="grid gap-3 md:grid-cols-2">
          {/* Logical space */}
          <div className="rounded-lg border border-line bg-bg-soft p-3">
            <span className="section-label">Logical address space (the process's view)</span>
            <div className="mt-2 flex h-24" role="img" aria-label={`Logical space: ${limit} accessible units starting at 0`}>
              <div
                className="flex flex-col items-center justify-center border border-line/60 bg-accent-soft text-xs text-ink"
                style={{ width: `${Math.min(100, (limit / 64) * 100)}%` }}
              >
                <span className="font-mono">0…{limit - 1}</span>
                <span className="font-mono opacity-70">legal</span>
              </div>
              <div
                className="flex flex-col items-center justify-center border border-line/60 bg-bad/10 text-xs text-ink-faint"
                style={{ width: `${(64 - limit) / 64 * 100}%` }}
              >
                <span className="font-mono">{limit}…63</span>
                <span className="font-mono opacity-70">unnameable</span>
              </div>
            </div>
          </div>

          {/* Physical space */}
          <div className="rounded-lg border border-line bg-bg-soft p-3">
            <span className="section-label">Physical memory (where it really lives)</span>
            <div className="mt-2 flex h-24 flex-col justify-center" role="img" aria-label={`Physical memory: process occupies ${base} to ${base + limit - 1}`}>
              <div className="relative h-8 w-full border border-line/60 bg-panel">
                <div
                  className="absolute inset-y-0 border-x border-accent/60 bg-accent-soft"
                  style={{ left: `${(base / 64) * 100}%`, width: `${(limit / 64) * 100}%` }}
                />
                <div className="absolute inset-0 flex items-center justify-center font-mono text-xs text-ink">
                  process @{base}…{base + limit - 1}
                </div>
              </div>
              <div className="mt-1 flex justify-between font-mono text-xs text-ink-faint">
                <span>0</span>
                <span>63</span>
              </div>
            </div>
          </div>
        </div>

        {/* Translation results */}
        {accesses.length > 0 ? (
          <div className="rounded-lg border border-line bg-panel-soft p-3" role="status">
            <span className="section-label">MMU translation log</span>
            <ul className="mt-2 space-y-1 font-mono text-xs">
              {accesses.map((a, i) => (
                <li key={i} className={a.fault ? "text-ink" : "text-ink-muted"}>
                  {a.fault ? (
                    <span>
                      logical {a.logical} → <strong className="text-warn">SEGMENTATION FAULT</strong>{" "}
                      ({a.logical} ≥ limit {limit}) — the process cannot even name this address
                    </span>
                  ) : (
                    <span>
                      logical {a.logical} → physical {a.physical}{" "}
                      <span className="text-ink-faint">({a.logical} + base {base})</span>
                    </span>
                  )}
                </li>
              ))}
            </ul>
            {faultCount > 0 ? (
              <p className="mt-2 text-xs text-ink-muted">
                {accesses.length - faultCount} translated, {faultCount} faulted — the fault
                terminates the process; the OS decides what happens next.
              </p>
            ) : null}
          </div>
        ) : (
          <p className="text-xs text-ink-faint">
            Press <strong>Run accesses</strong> to see the MMU translate each logical address.
            Try an address ≥ limit to trigger the protection fault.
          </p>
        )}

        <p className="text-xs text-ink-faint">
          <strong className="font-semibold text-ink-muted">Model notes:</strong> base/limit is the
          simplest translation hardware (real MMUs page — see the Paging &amp; TLB Lab). Sliding the
          base register is what compaction does: the logical view never moves.
        </p>
      </div>
    </section>
  );
}
