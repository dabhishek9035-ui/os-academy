"use client";

import { useId, type ReactNode } from "react";
import type { SimulationEngine } from "@/types";
import {
  useSimulation,
  PLAYBACK_SPEEDS,
  type UseSimulationReturn,
} from "@/lib/simulation/useSimulation";
import { LogPanel } from "./LogPanel";
import {
  PauseIcon,
  PlayIcon,
  ResetIcon,
  StepBackIcon,
  StepForwardIcon,
} from "@/components/ui/icons";

type SimControls<S, A extends string> = UseSimulationReturn<S, A>;

/**
 * Shared frame for every interactive simulation: playback controls, live
 * explanation, event log, and slots for the lab's own UI. `children` and
 * `toolbar` are render props receiving the simulation controls, so labs can
 * both read state and dispatch actions from anywhere in the frame.
 */
export function SimShell<S, A extends string>({
  engine,
  title,
  description,
  children,
  inspector,
  toolbar,
  note,
  autoPlay = false,
  compact = false,
}: {
  engine: SimulationEngine<S, A>;
  title: string;
  description?: string;
  children: ReactNode | ((sim: SimControls<S, A>) => ReactNode);
  /** Detailed current-state panel(s) shown beside the event log. */
  inspector?: (sim: SimControls<S, A>) => ReactNode;
  /** Extra controls rendered in the header (algorithm pickers etc.). */
  toolbar?: (sim: SimControls<S, A>) => ReactNode;
  /** Honest note about simplifications in this model. */
  note?: string;
  autoPlay?: boolean;
  compact?: boolean;
}) {
  const sim = useSimulation(engine, { autoPlay });
  const explainedId = useId();
  const explanation = engine.explain(sim.state);
  const stateEvents = extractEvents(sim.state);

  return (
    <div className="card overflow-hidden" data-sim={engine.id}>
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-panel-soft px-4 py-2.5">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-ink">{title}</h3>
          {description ? (
            <p className="mt-0.5 text-xs text-ink-muted">{description}</p>
          ) : null}
        </div>
        {toolbar ? (
          <div className="flex flex-wrap items-center gap-2">{toolbar(sim)}</div>
        ) : null}
      </header>

      <div
        id={explainedId}
        aria-live="polite"
        className="flex items-start gap-2 border-b border-line px-4 py-2 text-[13px] text-ink"
      >
        <span className="section-label mt-0.5 shrink-0">Now</span>
        <span>{explanation}</span>
      </div>

      {sim.done ? (
        <p
          role="status"
          className="flex items-start gap-2 border-b border-line bg-panel-soft px-4 py-2 text-[13px] text-ink"
        >
          <span className="section-label mt-0.5 shrink-0 text-ok">Done</span>
          <span>
            Scenario finished — press <strong>Reset</strong> to run it again, or
            keep clicking the lab to experiment from here.
          </span>
        </p>
      ) : null}

      <div className={compact ? "p-3" : "p-4"}>
        {typeof children === "function"
          ? (children as (s: SimControls<S, A>) => ReactNode)(sim)
          : children}
      </div>

      {(inspector || stateEvents) && (
        <div className="grid gap-3 border-t border-line px-4 py-3 lg:grid-cols-2">
          {inspector ? <div className="min-w-0">{inspector(sim)}</div> : <div />}
          {stateEvents ? <LogPanel events={stateEvents} /> : null}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 border-t border-line bg-panel-soft px-4 py-2.5">
        <button
          type="button"
          className="btn btn-primary"
          onClick={sim.toggle}
          aria-label={sim.playing ? "Pause simulation" : "Play simulation"}
        >
          {sim.playing ? <PauseIcon /> : <PlayIcon />}
          {sim.playing ? "Pause" : "Play"}
        </button>
        <button
          type="button"
          className="btn"
          onClick={sim.stepBack}
          disabled={!sim.canStepBack}
          aria-label="Step backward"
          title="Step backward"
        >
          <StepBackIcon />
        </button>
        <button
          type="button"
          className="btn"
          onClick={sim.stepForward}
          aria-label="Step forward"
          title="Step forward"
        >
          <StepForwardIcon />
        </button>
        <button
          type="button"
          className="btn"
          onClick={sim.reset}
          aria-label="Reset simulation"
          title="Reset to the default scenario"
        >
          <ResetIcon />
          Reset
        </button>
        <label className="ml-auto flex items-center gap-1.5 text-xs text-ink-muted">
          Speed
          <select
            className="rounded-md border border-line bg-panel px-1.5 py-1 text-xs text-ink"
            value={sim.speed}
            onChange={(e) => sim.setSpeed(Number(e.target.value))}
            aria-label="Simulation speed"
          >
            {PLAYBACK_SPEEDS.map((s) => (
              <option key={s} value={s}>
                {s}×
              </option>
            ))}
          </select>
        </label>
      </div>

      {note ? (
        <p className="border-t border-line px-4 py-2 text-xs text-ink-faint">
          <strong className="font-semibold text-ink-muted">Model notes:</strong> {note}
        </p>
      ) : null}
      {sim.historyTrimmed ? (
        <p className="border-t border-line px-4 py-2 text-xs text-ink-faint">
          History trimmed — the deepest step-back states were dropped to bound
          memory. Reset replays the full scenario from the start.
        </p>
      ) : null}
    </div>
  );
}

function extractEvents(state: unknown) {
  if (
    typeof state === "object" &&
    state !== null &&
    Array.isArray((state as { eventLog?: unknown }).eventLog)
  ) {
    return (state as { eventLog: never[] }).eventLog;
  }
  return null;
}
