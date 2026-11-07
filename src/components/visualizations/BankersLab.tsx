"use client";

import { useState } from "react";
import { SimShell } from "./SimShell";
import {
  bankersEngine,
  type BankersAction,
  type BankersState,
} from "@/modules/deadlocks/engine";
import type { SimAction } from "@/types";

export function BankersLab() {
  return (
    <SimShell
      engine={bankersEngine}
      missionSimId="bankers-lab"
      title="Banker's Algorithm Lab"
      description="Edit allocation, max claim and available; try requests and see the safe sequence."
      toolbar={(sim) => (
        <button type="button" className="btn btn-primary text-xs" onClick={() => sim.dispatch({ type: "safety-check" })}>
          Safety check
        </button>
      )}
      note="Need = max claim − allocation. A request is granted only if it fits the remaining claim AND the pretend-allocated state is still SAFE (a full completion sequence exists). Denied requests never change state."
      inspector={(sim) => <ResultPanel state={sim.state} />}
      compact
    >
      {(sim) => <BankersViz state={sim.state} dispatch={sim.dispatch} />}
    </SimShell>
  );
}

type Dispatch = (a: SimAction<BankersAction>) => void;

function MatrixTable({
  title,
  values,
  onEdit,
  editable,
}: {
  title: string;
  values: number[][];
  onEdit?: (i: number, j: number, v: number) => void;
  editable?: boolean;
}) {
  return (
    <div className="rounded-lg border border-line bg-bg-soft p-2.5">
      <span className="section-label">{title}</span>
      <table className="mt-1.5 w-full text-center font-mono text-xs">
        <tbody>
          {values.map((row, i) => (
            <tr key={i}>
              <td className="pr-1.5 text-left text-ink-faint">P{i + 1}</td>
              {row.map((v, j) => (
                <td key={j} className="px-0.5 py-0.5">
                  {editable ? (
                    <input
                      type="number"
                      min={0}
                      className="w-11 rounded border border-line bg-panel px-1 py-0.5 text-center text-xs"
                      value={v}
                      aria-label={`${title} P${i + 1} col ${j + 1}`}
                      onChange={(e) => onEdit?.(i, j, Number(e.target.value))}
                    />
                  ) : (
                    <span className="inline-block w-9 rounded bg-panel px-1 py-0.5">{v}</span>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BankersViz({ state, dispatch }: { state: BankersState; dispatch: Dispatch }) {
  const [reqPid, setReqPid] = useState(state.processNames[0]);
  const [vector, setVector] = useState<number[]>(state.resourceNames.map(() => 0));

  return (
    <div className="space-y-3">
      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        <MatrixTable
          title="Allocation"
          values={state.allocation}
          editable
          onEdit={(i, j, v) => dispatch({ type: "set-cell", payload: { matrix: "allocation", i, j, value: v } })}
        />
        <MatrixTable
          title="Max claim"
          values={state.maxClaim}
          editable
          onEdit={(i, j, v) => dispatch({ type: "set-cell", payload: { matrix: "maxClaim", i, j, value: v } })}
        />
        <MatrixTable
          title="Need (max − alloc)"
          values={state.allocation.map((row, i) => row.map((v, j) => state.maxClaim[i][j] - v))}
        />
        <div className="rounded-lg border border-line bg-bg-soft p-2.5">
          <span className="section-label">Available</span>
          <div className="mt-1.5 flex gap-1.5">
            {state.available.map((v, j) => (
              <label key={j} className="flex flex-col items-center gap-0.5 text-[10px] text-ink-faint">
                {state.resourceNames[j]}
                <input
                  type="number"
                  min={0}
                  className="w-12 rounded border border-line bg-panel px-1 py-0.5 text-center font-mono text-xs"
                  value={v}
                  aria-label={`Available ${state.resourceNames[j]}`}
                  onChange={(e) => dispatch({ type: "set-available", payload: { j, value: Number(e.target.value) } })}
                />
              </label>
            ))}
          </div>
        </div>
      </div>

      <form
        className="flex flex-wrap items-center gap-2 rounded-lg border border-line bg-bg-soft p-2.5"
        action="#"
        onSubmit={(e) => {
          e.preventDefault();
          dispatch({ type: "request", payload: { pid: reqPid, vector } });
        }}
      >
        <span className="section-label">Try a request</span>
        <select
          className="rounded border border-line bg-panel px-1.5 py-1 text-xs"
          value={reqPid}
          onChange={(e) => setReqPid(e.target.value)}
          aria-label="Requesting process"
        >
          {state.processNames.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        {state.resourceNames.map((name, j) => (
          <label key={name} className="flex items-center gap-1 text-[10px] text-ink-faint">
            {name}
            <input
              type="number"
              min={0}
              className="w-12 rounded border border-line bg-panel px-1 py-0.5 text-center font-mono text-xs"
              value={vector[j]}
              aria-label={`Request ${name}`}
              onChange={(e) => {
                const next = [...vector];
                next[j] = Number(e.target.value);
                setVector(next);
              }}
            />
          </label>
        ))}
        <button type="submit" className="btn btn-primary text-xs">
          Request
        </button>
      </form>
    </div>
  );
}

function ResultPanel({ state }: { state: BankersState }) {
  const r = state.lastRequest;
  return (
    <div className="rounded-lg border border-line bg-bg-soft p-3">
      <span className="section-label">Analysis</span>
      {r ? (
        <>
          <p
            className={`mt-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold ${
              r.granted ? "bg-ok/10 text-ok" : "bg-bad/10 text-bad"
            }`}
            role="status"
          >
            {r.granted ? "GRANTED" : "DENIED"}
          </p>
          <p className="mt-1.5 text-xs leading-relaxed text-ink-muted">{r.reason}</p>
          {r.granted && r.safeSequence.length > 0 ? (
            <p className="mt-1.5 font-mono text-xs text-accent">
              safe sequence: {r.safeSequence.join(" → ")}
            </p>
          ) : null}
        </>
      ) : (
        <p className="mt-1.5 text-xs text-ink-faint">
          Run a safety check or submit a request — the reasoning appears here and in the event log.
        </p>
      )}
    </div>
  );
}
