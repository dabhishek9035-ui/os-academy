"use client";

import { useSimulation } from "@/lib/simulation/useSimulation";
import { interruptsEngine, type InterruptState } from "@/modules/interrupts/engine";
import { LogPanel } from "./LogPanel";

/**
 * Side-by-side race: the same I/O request handled by a polling CPU and an
 * interrupt-driven CPU. Both engines are identical; only the mode differs.
 */
const SLOW_DEVICE_TICKS = 20;

export function PollingVsInterrupt() {
  const polling = useSimulation(interruptsEngine);
  const interrupt = useSimulation(interruptsEngine);

  const startRace = () => {
    polling.reset();
    interrupt.reset();
    polling.dispatch({ type: "set-polling", payload: true });
    interrupt.dispatch({ type: "set-polling", payload: false });
    polling.dispatch({ type: "raise-io", payload: { waitTicks: SLOW_DEVICE_TICKS } });
    interrupt.dispatch({ type: "raise-io" });
    // Step both in lockstep for a fixed window.
    for (let i = 0; i < SLOW_DEVICE_TICKS + 8; i += 1) {
      polling.dispatch({ type: "tick" });
      interrupt.dispatch({ type: "tick" });
    }
  };

  return (
    <div className="space-y-4">
      <div className="card overflow-hidden">
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-panel-soft px-4 py-2.5">
          <div>
            <h3 className="text-sm font-semibold text-ink">Polling vs. Interrupts — the race</h3>
            <p className="mt-0.5 text-xs text-ink-muted">
              The same I/O request (a slow device, {SLOW_DEVICE_TICKS} ticks of work) on two
              identical CPUs that differ only in how they wait.
            </p>
          </div>
          <div className="flex gap-2">
            <button type="button" className="btn btn-primary text-xs" onClick={startRace}>
              Run the race
            </button>
            <button
              type="button"
              className="btn text-xs"
              onClick={() => {
                polling.reset();
                interrupt.reset();
              }}
            >
              Reset
            </button>
          </div>
        </header>

        <div className="grid gap-4 p-4 lg:grid-cols-2">
          <Side title="CPU A — polling" state={polling.state} tone="warn" />
          <Side title="CPU B — interrupt-driven" state={interrupt.state} tone="ok" />
        </div>

        <div className="border-t border-line px-4 py-3 text-[13px]" aria-live="polite">
          {polling.state.stats.wastedPollTicks > 0 || interrupt.state.stats.interruptsHandled > 0 ? (
            <p>
              After the same {SLOW_DEVICE_TICKS + 8} ticks: the <strong>polling CPU</strong> spent{" "}
              {polling.state.stats.wastedPollTicks} tick(s) checking a busy device and executed{" "}
              {instructionsExecuted(polling.state)} instruction tick(s). The{" "}
              <strong>interrupt CPU</strong> handled the device with a short handler
              ({interrupt.state.stats.totalLatency} tick(s) latency) and executed{" "}
              {instructionsExecuted(interrupt.state)} instruction tick(s). The longer the device
              takes, the bigger the gap — and it never costs the interrupt CPU extra waiting.
            </p>
          ) : (
            <p className="text-ink-faint">Press “Run the race” to compare the two strategies.</p>
          )}
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <LogPanel events={polling.state.eventLog} title="Polling CPU log" />
        <LogPanel events={interrupt.state.eventLog} title="Interrupt CPU log" />
      </div>

      <p className="text-xs text-ink-faint">
        Model note: polling here is <em>busy-wait</em> — the dedicated poll loop cannot run the
        program. Real kernels avoid this with interrupts; they still poll in special cases (very
        fast devices, low-latency drivers) where the handler overhead would dominate.
      </p>
    </div>
  );
}

function instructionsExecuted(state: InterruptState): number {
  // Count completed instruction events as a proxy for useful work done.
  return state.eventLog.filter((e) => e.kind === "instruction-complete").length;
}

function Side({
  title,
  state,
  tone,
}: {
  title: string;
  state: InterruptState;
  tone: "warn" | "ok";
}) {
  return (
    <div
      className={`rounded-lg border p-3 ${
        tone === "warn" ? "border-warn/40 bg-warn/5" : "border-ok/40 bg-ok/5"
      }`}
    >
      <h4 className="text-sm font-semibold text-ink">{title}</h4>
      <dl className="mt-2 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-md bg-panel px-2 py-1.5">
          <dt className="text-[10px] uppercase text-ink-faint">Wasted poll ticks</dt>
          <dd className={`font-mono text-sm ${state.stats.wastedPollTicks > 0 ? "text-warn" : "text-ink"}`}>
            {state.stats.wastedPollTicks}
          </dd>
        </div>
        <div className="rounded-md bg-panel px-2 py-1.5">
          <dt className="text-[10px] uppercase text-ink-faint">Handled</dt>
          <dd className="font-mono text-sm text-ink">{state.stats.interruptsHandled}</dd>
        </div>
        <div className="rounded-md bg-panel px-2 py-1.5">
          <dt className="text-[10px] uppercase text-ink-faint">Instr. ticks done</dt>
          <dd className="font-mono text-sm text-ink">{instructionsExecuted(state)}</dd>
        </div>
      </dl>
      <p className="mt-2 text-xs text-ink-muted">
        {state.pollingMode && state.deviceWaitTicks > 0
          ? "Currently busy-polling — the program cannot run."
          : state.activeInterrupt
            ? "Running the interrupt handler."
            : "Running the program."}
      </p>
    </div>
  );
}
