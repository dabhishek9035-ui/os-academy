"use client";

import { useState } from "react";
import { SimShell } from "./SimShell";
import {
  vmEngine,
  type VmAction,
  type ReplacementAlgorithm,
  type VmState,
} from "@/modules/virtual-memory/engine";
import type { SimAction } from "@/types";

export function PagingLab() {
  return (
    <SimShell
      engine={vmEngine}
      missionSimId="paging-lab"
      title="Paging & TLB Lab"
      description="Walk a reference string through TLB, page table and frames — faults, evictions and all."
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
            Algorithm
            <select
              className="rounded-md border border-line bg-panel px-2 py-1 text-xs"
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
        </>
      )}
      note="16 pages × 16 units, one-level page table (multi-level is explained in the lesson), TLB of 2 entries (LRU). The totals panel computes FIFO/LRU/Optimal over the WHOLE string so the comparison is honest."
      inspector={(sim) => <Totals state={sim.state} />}
    >
      {(sim) => <PagingViz state={sim.state} dispatch={sim.dispatch} />}
    </SimShell>
  );
}

type Dispatch = (a: SimAction<VmAction>) => void;

function PagingViz({ state, dispatch }: { state: VmState; dispatch: Dispatch }) {
  const [addr, setAddr] = useState("");
  return (
    <div className="space-y-3">
      {state.error ? (
        <p role="alert" className="rounded-lg border border-bad/40 bg-bad/10 px-3 py-2 text-xs text-ink">
          {state.error}
        </p>
      ) : null}

      {/* reference string with cursor */}
      <div className="rounded-lg border border-line bg-bg-soft p-3">
        <span className="section-label">Reference string (page = address ÷ 16)</span>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {state.referenceString.map((a, i) => (
            <span
              key={i}
              className={`rounded-md border px-2 py-1 font-mono text-[11px] ${
                i < state.cursor
                  ? "border-line bg-panel text-ink-faint"
                  : i === state.cursor
                    ? "border-accent bg-accent-soft text-ink"
                    : "border-line text-ink-muted"
              }`}
            >
              0x{a.toString(16).toUpperCase().padStart(2, "0")} <span className="text-ink-faint">p{Math.floor(a / 16)}</span>
            </span>
          ))}
        </div>
        <form
          className="mt-2 flex flex-wrap items-center gap-2"
          action="#"
          onSubmit={(e) => {
            e.preventDefault();
            const n = Number(addr);
            if (addr.trim() !== "") dispatch({ type: "access", payload: n });
            setAddr("");
          }}
        >
          <input
            className="w-24 rounded-md border border-line bg-panel px-2 py-1 text-xs"
            placeholder="address"
            value={addr}
            onChange={(e) => setAddr(e.target.value)}
            aria-label="Address to append and access"
          />
          <button type="submit" className="btn text-xs">
            + Access
          </button>
          <button
            type="button"
            className="btn text-xs"
            onClick={() => dispatch({ type: "fork-cow" })}
            title="Mark all resident pages shared + read-only, like a fork with copy-on-write"
          >
            fork (COW)
          </button>
          {state.pageTable.some((p) => p.shared) ? (
            <button
              type="button"
              className="btn text-xs"
              onClick={() => dispatch({ type: "write-page", payload: state.currentStep?.vpage ?? 0 })}
            >
              write to page {state.currentStep?.vpage ?? 0} (COW test)
            </button>
          ) : null}
        </form>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {/* TLB */}
        <div className="rounded-lg border border-line bg-bg-soft p-3">
          <span className="section-label">TLB (2 entries, LRU)</span>
          {state.tlb.length === 0 ? (
            <p className="mt-1.5 text-xs text-ink-faint">Empty.</p>
          ) : (
            <ul className="mt-1.5 space-y-1 font-mono text-xs text-ink-muted">
              {state.tlb.map((e, i) => (
                <li key={i}>
                  p{e.vpage} → frame {e.frame}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* page table */}
        <div className="rounded-lg border border-line bg-bg-soft p-3 sm:col-span-2">
          <span className="section-label">Page table (present pages)</span>
          <ul className="mt-1.5 flex flex-wrap gap-1.5">
            {state.pageTable.filter((p) => p.present).length === 0 ? (
              <li className="text-xs text-ink-faint">Nothing resident yet.</li>
            ) : (
              state.pageTable
                .filter((p) => p.present)
                .map((p) => (
                  <li
                    key={p.vpage}
                    className={`rounded-md border px-2 py-1 font-mono text-[11px] ${
                      p.shared ? "border-warn/60 text-warn" : "border-line text-ink-muted"
                    }`}
                    title={p.shared ? "shared + read-only (COW)" : undefined}
                  >
                    p{p.vpage} → f{p.frame}
                    {p.modified ? " M" : ""}
                    {p.shared ? " 🔗" : ""}
                  </li>
                ))
            )}
          </ul>
        </div>
      </div>

      {/* frames */}
      <div className="rounded-lg border border-line bg-bg-soft p-3">
        <span className="section-label">Physical frames</span>
        <div className="mt-2 flex gap-2">
          {state.frames.map((f, i) => (
            <div
              key={i}
              className="grid h-14 w-14 place-items-center rounded-lg border border-line bg-panel font-mono text-sm text-ink"
              title={f === null ? "free frame" : `frame ${i}: page ${f}`}
            >
              {f === null ? <span className="text-ink-faint">–</span> : `p${f}`}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Totals({ state }: { state: VmState }) {
  const rows: { alg: ReplacementAlgorithm; faults: number; hits: number }[] = [
    { alg: "fifo", ...state.totals.fifo },
    { alg: "lru", ...state.totals.lru },
    { alg: "optimal", ...state.totals.optimal },
  ];
  return (
    <div className="rounded-lg border border-line bg-bg-soft p-3">
      <span className="section-label">Whole-string totals</span>
      <table className="mt-2 w-full text-xs">
        <thead>
          <tr className="text-left text-ink-faint">
            <th scope="col" className="py-1 font-medium">Algorithm</th>
            <th scope="col" className="py-1 font-medium">Faults</th>
            <th scope="col" className="py-1 font-medium">Hits</th>
          </tr>
        </thead>
        <tbody className="font-mono">
          {rows.map((r) => (
            <tr
              key={r.alg}
              className={`border-t border-line/60 ${state.algorithm === r.alg ? "text-accent" : "text-ink-muted"}`}
            >
              <td className="py-1">{r.alg.toUpperCase()}</td>
              <td className="py-1">{r.faults}</td>
              <td className="py-1">{r.hits}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-[11px] text-ink-faint">
        Live walk ({state.algorithm.toUpperCase()}): {state.faultCount} faults ·{" "}
        {state.tlbHits} TLB hits · {state.cursor}/{state.referenceString.length} refs.
      </p>
    </div>
  );
}
