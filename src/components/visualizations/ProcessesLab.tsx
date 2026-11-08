"use client";

import { useState } from "react";
import { SimShell } from "./SimShell";
import { StateDiagram } from "./kit";
import {
  processesEngine,
  type ProcessAction,
  type ProcessState,
  type SimProcess,
} from "@/modules/processes/engine";
import type { SimAction } from "@/types";

const STATE_STYLES: Record<string, string> = {
  new: "border-line text-ink-faint",
  ready: "border-p-blue/60 text-p-blue",
  running: "border-ok/70 bg-ok/10 text-ok",
  blocked: "border-warn/60 text-warn",
  zombie: "border-p-violet/60 text-p-violet",
  terminated: "border-line text-ink-faint line-through",
};

/** The classic five-state (plus zombie) lifecycle, drawn with the kit. */
function ProcessStateDiagram({
  current,
  caption,
}: {
  current: string | null;
  caption: string;
}) {
  return (
    <StateDiagram
      caption={caption}
      current={current}
      width={620}
      height={230}
      states={[
        { id: "new", label: "new", x: 70, y: 60 },
        { id: "ready", label: "ready", x: 220, y: 60 },
        { id: "running", label: "running", x: 380, y: 60 },
        { id: "zombie", label: "zombie", x: 380, y: 175 },
        { id: "terminated", label: "terminated", x: 550, y: 175 },
        { id: "blocked", label: "blocked", x: 220, y: 175 },
      ]}
      edges={[
        { from: "new", to: "ready", label: "admit" },
        { from: "ready", to: "running", label: "dispatch" },
        { from: "running", to: "ready", label: "quantum / preempt" },
        { from: "running", to: "blocked", label: "block (I/O)" },
        { from: "blocked", to: "ready", label: "unblock" },
        { from: "running", to: "zombie", label: "exit" },
        { from: "zombie", to: "terminated", label: "wait() reaps" },
      ]}
    />
  );
}

export function ProcessLab() {
  return (
    <SimShell
      engine={processesEngine}
      title="Process Table Lab"
      description="Create, run, block and terminate processes; watch the states and the ready queue."
      toolbar={(sim) => (
        <>
          <button
            type="button"
            className="btn text-xs"
            onClick={() => sim.dispatch({ type: "create", payload: { name: `app-${sim.state.nextPid}` } })}
          >
            + Create process
          </button>
          <label className="flex items-center gap-1.5 text-xs text-ink-muted">
            Quantum
            <input
              type="number"
              min={1}
              max={10}
              className="w-14 rounded-md border border-line bg-panel px-2 py-1 text-xs"
              value={sim.state.quantum}
              onChange={(e) => sim.dispatch({ type: "set-quantum", payload: Number(e.target.value) })}
              aria-label="Scheduling quantum"
            />
          </label>
        </>
      )}
      note="Single CPU with round-robin quantum. Termination makes a process a zombie until its parent waits on it — that is deliberate and visible below. No real syscalls are executed; this is an educational model."
    >
      {(sim) => <ProcessTable state={sim.state} dispatch={sim.dispatch} />}
    </SimShell>
  );
}

export function ForkWaitLab() {
  return (
    <SimShell
      engine={processesEngine}
      title="fork / wait Laboratory"
      description="Fork children, wait for them, and watch zombies appear — then disappear when reaped."
      toolbar={(sim) => (
        <>
          <button
            type="button"
            className="btn text-xs"
            onClick={() => sim.dispatch({ type: "create", payload: { name: "parent-app", burst: 6 } })}
          >
            + Create parent
          </button>
          <span className="text-xs text-ink-faint">
            select a process in the table, then fork / wait / kill it
          </span>
        </>
      )}
      note="fork copies the parent's remaining burst; exec renames the image (educational simplification). A terminated child whose parent has not waited becomes a zombie; when a parent dies its children are re-parented to PID 1 (init)."
    >
      {(sim) => <ProcessTable state={sim.state} dispatch={sim.dispatch} />}
    </SimShell>
  );
}

type Dispatch = (a: SimAction<ProcessAction>) => void;

function ProcessTable({
  state,
  dispatch,
}: {
  state: ProcessState;
  dispatch: Dispatch;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const sel = state.processes.find((p) => p.pid === selected) ?? null;
  const currentState = sel ? sel.state : state.runningPid !== null
    ? (state.processes.find((p) => p.pid === state.runningPid)?.state ?? null)
    : null;

  return (
    <div className="space-y-3">
      {state.error ? (
        <p role="alert" className="rounded-lg border border-bad/40 bg-bad/10 px-3 py-2 text-xs text-ink">
          {state.error}
        </p>
      ) : null}

      <ProcessStateDiagram
        current={currentState}
        caption={
          sel
            ? `Five-state model — token on ${sel.name}'s current state (${sel.state}).`
            : "Five-state model — token on the running process (select a row to track it instead)."
        }
      />

      <div className="overflow-x-auto rounded-lg border border-line">
        <table className="w-full min-w-[560px] text-sm">
          <caption className="sr-only">Process table</caption>
          <thead>
            <tr className="bg-panel-soft text-left text-xs text-ink-faint">
              <th scope="col" className="px-2.5 py-1.5 font-medium">PID</th>
              <th scope="col" className="px-2.5 py-1.5 font-medium">PPID</th>
              <th scope="col" className="px-2.5 py-1.5 font-medium">Name</th>
              <th scope="col" className="px-2.5 py-1.5 font-medium">State</th>
              <th scope="col" className="px-2.5 py-1.5 font-medium">Progress</th>
              <th scope="col" className="px-2.5 py-1.5 font-medium">Children</th>
            </tr>
          </thead>
          <tbody>
            {state.processes.map((p) => (
              <tr
                key={p.pid}
                className={`cursor-pointer border-t border-line transition-colors ${
                  selected === p.pid ? "bg-accent-soft" : "hover:bg-panel-soft"
                }`}
                onClick={() => setSelected(p.pid)}
              >
                <td className="px-2.5 py-1.5 font-mono text-xs">{p.pid}</td>
                <td className="px-2.5 py-1.5 font-mono text-xs text-ink-faint">{p.ppid ?? "—"}</td>
                <td className="px-2.5 py-1.5">{p.name}</td>
                <td className="px-2.5 py-1.5">
                  <span className={`inline-block rounded-md border px-2 py-0.5 text-xs ${STATE_STYLES[p.state]}`}>
                    {p.state}
                    {p.state === "blocked" && p.blockedReason ? ` (${p.blockedReason})` : ""}
                  </span>
                </td>
                <td className="px-2.5 py-1.5">
                  {p.state === "terminated" ? (
                    <span className="text-xs text-ink-faint">exit {p.exitCode ?? 0}</span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <span className="h-1.5 w-20 overflow-hidden rounded-full bg-panel-soft">
                        <span
                          className="block h-full rounded-full bg-accent"
                          style={{ width: `${Math.min(100, (p.progress / Math.max(1, p.burst)) * 100)}%` }}
                        />
                      </span>
                      <span className="font-mono text-xs text-ink-faint">
                        {p.progress}/{p.burst}
                      </span>
                    </span>
                  )}
                </td>
                <td className="px-2.5 py-1.5 font-mono text-xs text-ink-faint">
                  {p.children.length > 0 ? p.children.join(", ") : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-line bg-bg-soft p-3">
          <span className="section-label">Actions on {sel ? `PID ${sel.pid}` : "…select a process"}</span>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <button
              type="button"
              className="btn text-xs"
              disabled={!sel}
              onClick={() => sel && dispatch({ type: "fork", payload: sel.pid })}
            >
              fork
            </button>
            <button
              type="button"
              className="btn text-xs"
              disabled={!sel}
              onClick={() => sel && dispatch({ type: "wait", payload: sel.pid })}
            >
              wait
            </button>
            <button
              type="button"
              className="btn text-xs"
              disabled={!sel}
              onClick={() =>
                sel && dispatch({ type: "exec", payload: { pid: sel.pid, name: "new-image" } })
              }
            >
              exec
            </button>
            <button
              type="button"
              className="btn text-xs"
              disabled={!sel}
              onClick={() => sel && dispatch({ type: "block", payload: { pid: sel.pid, reason: "device" } })}
            >
              block
            </button>
            <button
              type="button"
              className="btn text-xs"
              disabled={!sel}
              onClick={() => sel && dispatch({ type: "resume", payload: sel.pid })}
            >
              resume
            </button>
            <button
              type="button"
              className="btn border-bad/40 text-xs"
              disabled={!sel}
              onClick={() => sel && dispatch({ type: "kill", payload: sel.pid })}
            >
              kill
            </button>
          </div>
        </div>

        <div className="rounded-lg border border-line bg-bg-soft p-3">
          <span className="section-label">Selected PCB (Process Control Block)</span>
          {sel ? (
            <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 font-mono text-xs text-ink-muted">
              <dt>pid</dt><dd>{sel.pid}</dd>
              <dt>ppid</dt><dd>{sel.ppid ?? "null (root)"}</dd>
              <dt>state</dt><dd>{sel.state}</dd>
              <dt>burst</dt><dd>{sel.burst}</dd>
              <dt>progress</dt><dd>{sel.progress}</dd>
              <dt>created at</dt><dd>t={sel.creationTime}</dd>
              {sel.exitCode !== undefined ? (<><dt>exit code</dt><dd>{sel.exitCode}</dd></>) : null}
              {sel.terminationTime !== undefined ? (<><dt>terminated at</dt><dd>t={sel.terminationTime}</dd></>) : null}
              <dt>children</dt><dd>[{sel.children.join(", ")}]</dd>
            </dl>
          ) : (
            <p className="mt-1.5 text-xs text-ink-faint">
              Click a row to inspect its PCB — the kernel&apos;s per-process record.
            </p>
          )}
        </div>
      </div>

      <ProcessTree processes={state.processes} selected={selected} onSelect={setSelected} />

      <div className="flex flex-wrap gap-4 text-xs text-ink-faint">
        <span>clock: <span className="font-mono text-ink-muted">{state.clock}</span></span>
        <span>context switches: <span className="font-mono text-ink-muted">{state.contextSwitches}</span></span>
        <span>ready queue: <span className="font-mono text-ink-muted">[{state.readyQueue.join(", ")}]</span></span>
        <span>running: <span className="font-mono text-ink-muted">{state.runningPid ?? "none"}</span></span>
      </div>
    </div>
  );
}

function ProcessTree({
  processes,
  selected,
  onSelect,
}: {
  processes: SimProcess[];
  selected: number | null;
  onSelect: (pid: number) => void;
}) {
  const roots = processes.filter((p) => p.ppid === null);
  const renderNode = (p: SimProcess, depth: number): React.ReactNode => (
    <li key={p.pid} style={{ marginLeft: depth * 16 }}>
      <button
        type="button"
        className={`rounded px-1.5 py-0.5 font-mono text-xs ${
          selected === p.pid ? "bg-accent-soft text-ink" : "text-ink-muted hover:text-ink"
        }`}
        onClick={() => onSelect(p.pid)}
      >
        {p.pid}:{p.name} ({p.state})
      </button>
      {p.children.length > 0 ? (
        <ul>
          {p.children
            .map((cid) => processes.find((c) => c.pid === cid))
            .filter((c): c is SimProcess => Boolean(c))
            .map((c) => renderNode(c, depth + 1))}
        </ul>
      ) : null}
    </li>
  );
  return (
    <div className="rounded-lg border border-line bg-bg-soft p-3">
      <span className="section-label">Process tree</span>
      <ul className="mt-1.5">{roots.map((r) => renderNode(r, 0))}</ul>
    </div>
  );
}
