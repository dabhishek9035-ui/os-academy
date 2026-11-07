"use client";

import { SimShell } from "./SimShell";
import {
  ioEngine,
  summarize,
  type IoAction,
  type IoState,
} from "@/modules/io/io-engine";
import {
  syscallEngine,
  protectionEngine,
  SYSCALL_STAGES,
  SYSCALL_TABLE,
  type SyscallAction,
  type SyscallState,
  type ProtectionAction,
  type ProtectionState,
} from "@/modules/syscalls-security/engine";
import type { SimAction } from "@/types";

// ---------------------------------------------------------------------------
// I/O transfer lab
// ---------------------------------------------------------------------------

export function IoTransferLab() {
  return (
    <SimShell
      engine={ioEngine}
      title="I/O Transfer Lab"
      description="Move the same file three ways — PIO, interrupt-driven, DMA — and compare CPU load."
      toolbar={(sim) => (
        <>
          <select
            className="rounded-md border border-line bg-panel px-2 py-1 text-xs"
            value={sim.state.method}
            onChange={(e) => sim.dispatch({ type: "set-method", payload: e.target.value })}
            aria-label="I/O method"
          >
            <option value="pio">PIO</option>
            <option value="interrupt">Interrupt-driven</option>
            <option value="dma">DMA</option>
          </select>
          <label className="flex items-center gap-1.5 text-xs text-ink-muted">
            blocks
            <input
              type="number"
              min={4}
              max={16}
              className="w-12 rounded-md border border-line bg-panel px-1.5 py-1 text-xs"
              value={sim.state.blocksTotal}
              onChange={(e) => sim.dispatch({ type: "set-blocks", payload: Number(e.target.value) })}
              aria-label="File blocks"
            />
          </label>
        </>
      )}
      note="Per-block timing: PIO = 1 tick, CPU busy; interrupt = 2 ticks (device + handling), CPU busy only for handling; DMA = 1 tick/block with the CPU free plus ONE completion interrupt. Real devices differ; the ratio is the lesson."
      inspector={(sim) => <IoMetrics state={sim.state} />}
    >
      {(sim) => <IoViz state={sim.state} />}
    </SimShell>
  );
}

function IoViz({ state }: { state: IoState }) {
  const pct = Math.round((state.blocksDone / state.blocksTotal) * 100);
  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-line bg-bg-soft p-3">
        <div className="flex items-center justify-between text-xs text-ink-muted">
          <span>transfer progress</span>
          <span className="font-mono">
            {state.blocksDone}/{state.blocksTotal}
          </span>
        </div>
        <div
          className="mt-1.5 h-3 overflow-hidden rounded-full bg-panel"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-md bg-panel px-2 py-1.5">
            <p className="text-[10px] uppercase text-ink-faint">ticks</p>
            <p className="font-mono text-sm text-ink">{state.totalTicks}</p>
          </div>
          <div className="rounded-md bg-panel px-2 py-1.5">
            <p className="text-[10px] uppercase text-ink-faint">CPU busy</p>
            <p className="font-mono text-sm text-ink">{state.cpuBusyTicks}</p>
          </div>
          <div className="rounded-md bg-panel px-2 py-1.5">
            <p className="text-[10px] uppercase text-ink-faint">CPU idle</p>
            <p className="font-mono text-sm text-ok">{state.totalTicks - state.cpuBusyTicks}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function IoMetrics({ state }: { state: IoState }) {
  const expected = summarize(state.method, state.blocksTotal);
  const all = (["pio", "interrupt", "dma"] as const).map((m) => ({ m, ...summarize(m, state.blocksTotal) }));
  return (
    <div className="rounded-lg border border-line bg-bg-soft p-3">
      <span className="section-label">Comparison ({state.blocksTotal} blocks)</span>
      <table className="mt-2 w-full text-xs">
        <thead>
          <tr className="text-left text-ink-faint">
            <th scope="col" className="py-1 font-medium">Method</th>
            <th scope="col" className="py-1 font-medium">Ticks</th>
            <th scope="col" className="py-1 font-medium">CPU busy</th>
          </tr>
        </thead>
        <tbody className="font-mono">
          {all.map((r) => (
            <tr key={r.m} className={`border-t border-line/60 ${state.method === r.m ? "text-accent" : "text-ink-muted"}`}>
              <td className="py-1">{r.m.toUpperCase()}</td>
              <td className="py-1">{r.totalTicks}</td>
              <td className="py-1">{r.cpuBusyTicks}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-[11px] text-ink-faint">
        current run: {state.totalTicks}/{expected.totalTicks} ticks.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// syscall lab
// ---------------------------------------------------------------------------

export function SyscallLab() {
  return (
    <SimShell
      engine={syscallEngine}
      title="System Call Lab"
      description="Issue read/write/open/close and walk the user → kernel → user transition."
      toolbar={(sim) => (
        <div className="flex flex-wrap gap-1.5">
          {Object.keys(SYSCALL_TABLE).map((name) => (
            <button
              key={name}
              type="button"
              className="btn text-xs"
              onClick={() => sim.dispatch({ type: "call", payload: { name, args: "fd 3" } })}
            >
              {name}(fd 3)
            </button>
          ))}
        </div>
      )}
      note="A fixed 7-stage teaching pipeline: real architectures differ (RISC-V ecall + stvec vs x86 syscall/MSR), but the shape — trap, save, validate, execute, restore, resume — is universal."
      compact
    >
      {(sim) => <SyscallViz state={sim.state} />}
    </SimShell>
  );
}

function SyscallViz({ state }: { state: SyscallState }) {
  return (
    <div className="space-y-3">
      <ol className="flex flex-wrap gap-1.5">
        {SYSCALL_STAGES.map((stage, i) => {
          const active = state.stageIndex === i && state.syscallName !== null;
          const done = state.stageIndex > i && state.syscallName !== null;
          return (
            <li
              key={stage}
              aria-current={active ? "step" : undefined}
              className={`rounded-md border px-2.5 py-1 font-mono text-[11px] ${
                active
                  ? "border-accent bg-accent-soft text-ink"
                  : done
                    ? "border-line bg-panel text-ink-faint"
                    : "border-line text-ink-faint"
              }`}
            >
              {i + 1}. {stage}
            </li>
          );
        })}
      </ol>
      <div className="flex items-center gap-2 text-xs">
        <span className={`chip ${state.mode === "kernel" ? "border-accent text-accent" : ""}`}>
          CPU: {state.mode} mode
        </span>
        {state.syscallName ? (
          <span className="chip">
            syscall #{state.syscallNumber} {state.syscallName}
          </span>
        ) : null}
        {state.returnValue ? <span className="chip border-ok/60 text-ok">{state.returnValue}</span> : null}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// protection lab
// ---------------------------------------------------------------------------

export function ProtectionLab() {
  return (
    <SimShell
      engine={protectionEngine}
      title="Protection Lab"
      description="Permission bits, memory bounds and kernel-mode bypass — try to break in."
      toolbar={(sim) => (
        <>
          <select
            className="rounded-md border border-line bg-panel px-2 py-1 text-xs"
            value={sim.state.currentUser}
            onChange={(e) => sim.dispatch({ type: "su", payload: e.target.value })}
            aria-label="Acting user"
          >
            {["alice", "bob", "root"].map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
          <button
            type="button"
            className={`btn text-xs ${sim.state.mode === "kernel" ? "border-warn/60" : ""}`}
            onClick={() => sim.dispatch({ type: "set-mode", payload: sim.state.mode === "user" ? "kernel" : "user" })}
          >
            mode: {sim.state.mode}
          </button>
        </>
      )}
      note="Classic Unix triads (owner/group/other × rwx). Kernel mode bypasses checks in this model — that is the power (and the target) of privilege escalation. Memory checks model base/limit segmentation."
      compact
    >
      {(sim) => <ProtectionViz state={sim.state} dispatch={sim.dispatch} />}
    </SimShell>
  );
}

type ProtDispatch = (a: SimAction<ProtectionAction>) => void;

function ProtectionViz({ state, dispatch }: { state: ProtectionState; dispatch: ProtDispatch }) {
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <div className="space-y-2">
        <span className="section-label">Files — try an operation</span>
        {state.files.map((f) => (
          <div key={f.name} className="rounded-lg border border-line bg-bg-soft px-3 py-2">
            <div className="flex flex-wrap items-center justify-between gap-1.5 text-xs">
              <span className="font-mono text-ink">{f.name}</span>
              <span className="font-mono text-[10px] text-ink-faint">
                {f.owner}:{f.group} {f.perms}
              </span>
            </div>
            <div className="mt-1.5 flex gap-1.5">
              {(["read", "write", "execute"] as const).map((op) => (
                <button
                  key={op}
                  type="button"
                  className="chip hover:border-accent/50"
                  onClick={() => dispatch({ type: "attempt", payload: { target: f.name, operation: op } })}
                >
                  {op}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="space-y-2">
        <span className="section-label">Memory of pid {state.activePid}</span>
        {state.memoryRegions.map((r) => (
          <div key={r.name} className="rounded-lg border border-line bg-bg-soft px-3 py-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-mono text-ink-muted">
                {r.name} [{r.base}, {r.base + r.limit}) pid {r.ownerPid}
              </span>
              <span className="flex gap-1">
                <button
                  type="button"
                  className="chip hover:border-ok/60"
                  onClick={() => dispatch({ type: "memory-access", payload: { pid: r.ownerPid, addr: r.base + 5 } })}
                >
                  access inside
                </button>
                <button
                  type="button"
                  className="chip hover:border-bad/60"
                  onClick={() =>
                    dispatch({ type: "memory-access", payload: { pid: r.ownerPid, addr: r.base + r.limit + 10 } })
                  }
                >
                  access beyond
                </button>
              </span>
            </div>
          </div>
        ))}
        {state.lastCheck ? (
          <p
            role="status"
            className={`rounded-lg border px-3 py-2 text-xs ${
              state.lastCheck.allowed ? "border-ok/50 bg-ok/10 text-ink" : "border-bad/50 bg-bad/10 text-ink"
            }`}
          >
            <strong>{state.lastCheck.allowed ? "ALLOWED" : "DENIED"}</strong> — {state.lastCheck.reason}
          </p>
        ) : null}
      </div>
    </div>
  );
}
