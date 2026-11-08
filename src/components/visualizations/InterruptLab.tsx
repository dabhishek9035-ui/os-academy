"use client";

import { SimShell } from "./SimShell";
import {
  HANDLER_STAGES,
  INTERRUPT_PROGRAMS,
  interruptsEngine,
  type InterruptAction,
  type InterruptState,
} from "@/modules/interrupts/engine";
import type { SimAction } from "@/types";

export function InterruptLab() {
  return (
    <SimShell
      engine={interruptsEngine}
      title="Interrupt Lab"
      description="Raise interrupts while a program runs; watch the CPU save state, handle, and resume."
      toolbar={(sim) => (
        <>
          <button
            type="button"
            className="btn text-xs"
            onClick={() => sim.dispatch({ type: "raise-timer" })}
            disabled={sim.state.pollingMode}
          >
            Raise timer interrupt
          </button>
          <button
            type="button"
            className="btn text-xs"
            onClick={() => sim.dispatch({ type: "raise-io" })}
          >
            Raise I/O interrupt
          </button>
          <button
            type="button"
            className="btn text-xs"
            onClick={() => sim.dispatch({ type: "raise-exception" })}
          >
            Cause exception (÷0)
          </button>
          <button
            type="button"
            className={`btn text-xs ${sim.state.pollingMode ? "border-warn/60" : ""}`}
            onClick={() => sim.dispatch({ type: "set-polling", payload: !sim.state.pollingMode })}
            aria-pressed={sim.state.pollingMode}
          >
            {sim.state.pollingMode ? "Polling mode (ON)" : "Polling mode (off)"}
          </button>
        </>
      )}
      note="One handler per source; every pipeline stage costs one tick (the handler body takes 2–3). Exceptions are synchronous traps and can never be masked. Polling mode burns one tick per check while a device is busy — exactly the waste interrupts avoid."
    >
      {(sim) => <InterruptViz state={sim.state} dispatch={sim.dispatch} />}
    </SimShell>
  );
}

type Dispatch = (a: SimAction<InterruptAction>) => void;

function InterruptViz({
  state,
  dispatch,
}: {
  state: InterruptState;
  dispatch: Dispatch;
}) {
  const currentInstr = state.program[state.pc];
  return (
    <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
      <div className="space-y-3">
        {/* CPU state */}
        <div className="rounded-lg border border-line bg-bg-soft p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="section-label">CPU</span>
            <span
              className={`chip ${state.mode === "kernel" ? "border-accent text-accent" : ""}`}
              aria-label={`CPU is in ${state.mode} mode`}
            >
              {state.mode === "kernel" ? "kernel mode" : "user mode"}
            </span>
          </div>
          <p className="mt-2 font-mono text-sm text-ink">
            {state.activeInterrupt
              ? "⟳ handling interrupt — program paused"
              : state.programFinished
                ? "idle — program finished"
                : `▶ ${currentInstr?.name ?? "—"}`}
          </p>
          <p className="mt-1 font-mono text-xs text-ink-faint">
            pc={state.pc} · progress={state.progressInInstruction}/{currentInstr?.duration ?? 0} · clock={state.clock}
          </p>
          {/* instruction strip */}
          <ol className="mt-2 flex flex-wrap gap-1.5" aria-label="Program instructions">
            {state.program.map((instr, i) => (
              <li
                key={i}
                className={`rounded-md border px-2 py-1 font-mono text-xs ${
                  i === state.pc && !state.programFinished
                    ? "border-accent bg-accent-soft text-ink"
                    : i < state.pc
                      ? "border-line text-ink-faint"
                      : "border-line text-ink-muted"
                }`}
              >
                {instr.name}
              </li>
            ))}
          </ol>
        </div>

        {/* handler pipeline */}
        <div className="rounded-lg border border-line bg-bg-soft p-3">
          <span className="section-label">Handler pipeline</span>
          <ol className="mt-2 flex flex-wrap gap-1.5" aria-label="Interrupt handler stages">
            {HANDLER_STAGES.map((stage, i) => {
              const active = state.activeInterrupt && state.handlerStageIndex === i;
              const done = state.activeInterrupt ? i < state.handlerStageIndex : false;
              return (
                <li
                  key={stage}
                  className={`rounded-md border px-2 py-1 text-xs font-mono ${
                    active
                      ? "border-accent bg-accent-soft text-ink"
                      : done
                        ? "border-line bg-panel text-ink-faint"
                        : "border-line text-ink-faint"
                  }`}
                  aria-current={active ? "step" : undefined}
                >
                  {i + 1}. {stage}
                  {stage === "run-handler" && active ? ` (${state.handlerTicksRemaining})` : ""}
                </li>
              );
            })}
          </ol>
          {!state.activeInterrupt ? (
            <p className="mt-2 text-xs text-ink-faint">
              No interrupt being handled — raise one to see the pipeline light up.
            </p>
          ) : null}
        </div>

        {/* pending queue */}
        <div className="rounded-lg border border-line bg-bg-soft p-3">
          <span className="section-label">Pending interrupt queue</span>
          {state.pendingQueue.length === 0 ? (
            <p className="mt-1.5 text-xs text-ink-faint">Empty.</p>
          ) : (
            <ul className="mt-1.5 space-y-1">
              {state.pendingQueue.map((intr, i) => (
                <li key={i} className="font-mono text-xs text-ink-muted">
                  [{intr.priority}] {intr.label} <span className="text-ink-faint">(raised t={intr.raisedAt})</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {/* masks */}
        <fieldset className="rounded-lg border border-line bg-bg-soft p-3">
          <legend className="section-label px-1">Interrupt mask</legend>
          <div className="mt-1 flex flex-wrap gap-2">
            {(["timer", "io"] as const).map((src) => (
              <button
                key={src}
                type="button"
                className={`btn text-xs ${state.enabled[src] ? "" : "border-warn/60 text-warn"}`}
                aria-pressed={state.enabled[src]}
                onClick={() =>
                  dispatch({ type: "toggle-source", payload: { source: src, enabled: !state.enabled[src] } })
                }
              >
                {src}: {state.enabled[src] ? "enabled" : "masked"}
              </button>
            ))}
            <span className="chip text-xs" title="Exceptions are synchronous and cannot be masked">
              exception: always on
            </span>
          </div>
          {state.error ? (
            <p role="alert" className="mt-2 text-xs text-bad">
              {state.error}
            </p>
          ) : null}
        </fieldset>

        {/* saved context stack */}
        <div className="rounded-lg border border-line bg-bg-soft p-3">
          <span className="section-label">Saved context stack</span>
          {state.savedContexts.length === 0 ? (
            <p className="mt-1.5 text-xs text-ink-faint">
              Empty — nothing interrupted right now.
            </p>
          ) : (
            <ul className="mt-1.5 space-y-1">
              {state.savedContexts.map((ctx, i) => (
                <li key={i} className="rounded-md border border-accent/40 bg-accent-soft px-2 py-1 font-mono text-xs text-ink">
                  saved: pc={ctx.pc} · progress={ctx.progressInInstruction} · {ctx.mode} mode
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* stats */}
        <div className="rounded-lg border border-line bg-bg-soft p-3">
          <span className="section-label">Statistics</span>
          <dl className="mt-1.5 grid grid-cols-3 gap-2 text-center">
            <div>
              <dt className="text-xs uppercase text-ink-faint">Handled</dt>
              <dd className="font-mono text-sm text-ink">{state.stats.interruptsHandled}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-ink-faint">Total latency</dt>
              <dd className="font-mono text-sm text-ink">{state.stats.totalLatency}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-ink-faint">Poll ticks wasted</dt>
              <dd className={`font-mono text-sm ${state.stats.wastedPollTicks > 0 ? "text-warn" : "text-ink"}`}>
                {state.stats.wastedPollTicks}
              </dd>
            </div>
          </dl>
        </div>

        {/* programs */}
        <div className="rounded-lg border border-line bg-bg-soft p-3">
          <span className="section-label">Load a program</span>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {Object.entries(INTERRUPT_PROGRAMS).map(([key, p]) => (
              <button
                key={key}
                type="button"
                className="chip hover:border-accent/50"
                title={p.note}
                onClick={() => dispatch({ type: "load-program", payload: p.program })}
              >
                {p.label}
              </button>
            ))}
            <button type="button" className="chip hover:border-accent/50" onClick={() => dispatch({ type: "reset-pc" })}>
              ↺ restart program
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
