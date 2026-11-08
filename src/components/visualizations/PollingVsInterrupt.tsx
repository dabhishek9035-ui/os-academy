"use client";

import { useState } from "react";
import { useSimulation } from "@/lib/simulation/useSimulation";
import {
  interruptsEngine,
  type InterruptState,
} from "@/modules/interrupts/engine";
import { LogPanel } from "./LogPanel";
import { Legend, Timeline, type TimelineSegment } from "./kit";

/**
 * Side-by-side race: the same I/O request handled by a polling CPU and an
 * interrupt-driven CPU. Both engines are identical; only the mode differs.
 * The timelines below make the wasted poll ticks visible as amber bands.
 */
const SLOW_DEVICE_TICKS = 20;

type Activity = "program" | "polling" | "handler";

const ACTIVITY_COLORS: Record<Activity, string> = {
  program: "rgb(var(--ok))",
  polling: "rgb(var(--warn))",
  handler: "rgb(var(--p-violet))",
};

function classify(state: InterruptState): Activity {
  if (state.activeInterrupt) return "handler";
  if (state.pollingMode && state.deviceWaitTicks > 0) return "polling";
  return "program";
}

export function PollingVsInterrupt() {
  const polling = useSimulation(interruptsEngine);
  const interrupt = useSimulation(interruptsEngine);
  const [raced, setRaced] = useState(false);

  const startRace = () => {
    polling.reset();
    interrupt.reset();
    polling.dispatch({ type: "set-polling", payload: true });
    interrupt.dispatch({ type: "set-polling", payload: false });
    polling.dispatch({ type: "raise-io", payload: { waitTicks: SLOW_DEVICE_TICKS } });
    interrupt.dispatch({ type: "raise-io" });
    // Step both in lockstep so the stats cards and logs advance too — the
    // timelines replay the same deterministic trace for the visuals.
    for (let i = 0; i < SLOW_DEVICE_TICKS + 8; i += 1) {
      polling.dispatch({ type: "tick" });
      interrupt.dispatch({ type: "tick" });
    }
    setRaced(true);
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
                setRaced(false);
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

        {raced ? (
          <div className="space-y-3 border-t border-line p-4">
            <RaceTimeline
              title="CPU A — polling: every check of the busy device is a wasted tick"
              states={raceTrace({ polling: true, waitTicks: SLOW_DEVICE_TICKS })}
              ariaLabel="Polling CPU activity timeline"
            />
            <RaceTimeline
              title="CPU B — interrupts: the program keeps running while the device works"
              states={raceTrace({ polling: false, waitTicks: SLOW_DEVICE_TICKS })}
              ariaLabel="Interrupt-driven CPU activity timeline"
            />
            <Legend
              caption="What each band means"
              items={[
                { label: "running the program (useful)", color: ACTIVITY_COLORS.program },
                { label: "busy-polling a busy device (wasted)", color: ACTIVITY_COLORS.polling },
                { label: "interrupt handler", color: ACTIVITY_COLORS.handler },
              ]}
            />
          </div>
        ) : null}

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

/** Replay the race deterministically and record each tick's activity. */
function raceTrace(options: { polling: boolean; waitTicks: number }): Activity[] {
  let state = interruptsEngine.initialState();
  state = interruptsEngine.step(state, { type: "set-polling", payload: options.polling });
  state = interruptsEngine.step(state, {
    type: "raise-io",
    payload: options.polling ? { waitTicks: options.waitTicks } : undefined,
  });
  const trace: Activity[] = [];
  for (let i = 0; i < options.waitTicks + 8; i += 1) {
    trace.push(classify(state));
    const next = interruptsEngine.step(state, { type: "tick" });
    if (next === state) break;
    state = next;
  }
  return trace;
}

function RaceTimeline({
  title,
  states,
  ariaLabel,
}: {
  title: string;
  states: Activity[];
  ariaLabel: string;
}) {
  // Compress the per-tick activity list into run-length segments.
  const segments: TimelineSegment[] = [];
  for (let t = 0; t < states.length; t += 1) {
    const last = segments[segments.length - 1];
    if (last && last.label === states[t]) {
      last.end = t + 1;
    } else {
      segments.push({ pid: "CPU", start: t, end: t + 1, label: states[t] });
    }
  }

  return (
    <figure>
      <figcaption className="mb-1 text-xs text-ink-muted">{title}</figcaption>
      <Timeline
        segments={segments}
        lanes={["CPU"]}
        unitWidth={30}
        caption={ariaLabel}
        idleNote={null}
        segmentColor={(seg) => ACTIVITY_COLORS[(seg.label as Activity) ?? "program"]}
      />
    </figure>
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
          <dt className="text-xs uppercase text-ink-faint">Wasted poll ticks</dt>
          <dd className={`font-mono text-sm ${state.stats.wastedPollTicks > 0 ? "text-warn" : "text-ink"}`}>
            {state.stats.wastedPollTicks}
          </dd>
        </div>
        <div className="rounded-md bg-panel px-2 py-1.5">
          <dt className="text-xs uppercase text-ink-faint">Handled</dt>
          <dd className="font-mono text-sm text-ink">{state.stats.interruptsHandled}</dd>
        </div>
        <div className="rounded-md bg-panel px-2 py-1.5">
          <dt className="text-xs uppercase text-ink-faint">Instr. ticks done</dt>
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
