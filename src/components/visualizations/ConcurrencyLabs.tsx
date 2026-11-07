"use client";

import { SimShell } from "./SimShell";
import {
  MICRO_STEPS,
  raceEngine,
  boundedBufferEngine,
  type RaceState,
  type BufferState,
} from "@/modules/threads-concurrency/engine";

export function RaceConditionLab() {
  return (
    <SimShell
      engine={raceEngine}
      missionSimId="race-condition-lab"
      title="Race Condition Stepper"
      description="Two threads, one counter — step micro-instruction by micro-instruction and watch the update get lost."
      toolbar={(sim) => (
        <>
          <button type="button" className="btn text-xs" onClick={() => sim.dispatch({ type: "toggle-sync" })}>
            {sim.state.unsynchronized ? "Mutex: OFF (racy)" : "Mutex: ON (atomic)"}
          </button>
          <select
            className="rounded-md border border-line bg-panel px-2 py-1 text-xs"
            value={sim.state.schedule}
            onChange={(e) => sim.dispatch({ type: "set-schedule", payload: e.target.value })}
            aria-label="Interleaving schedule"
          >
            <option value="round-robin">Round-robin interleave</option>
            <option value="chaos">Chaotic (seeded)</option>
          </select>
        </>
      )}
      note="counter++ compiles to load → add → store. Unsynchronized interleaving loses updates deterministically; the mutex makes the whole increment one atomic step. 'Chaotic' uses a seeded PRNG — same seed, same trace."
    >
      {(sim) => <RaceViz state={sim.state} />}
    </SimShell>
  );
}

function RaceViz({ state }: { state: RaceState }) {
  return (
    <div className="grid gap-3 sm:grid-cols-[1fr_220px]">
      <div className="space-y-2.5">
        {state.threads.map((t, i) => (
          <div
            key={t.id}
            className={`rounded-lg border p-3 transition-colors ${
              t.done ? "border-line opacity-60" : i === 0 ? "border-accent/60 bg-accent-soft/40" : "border-line"
            }`}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-ink">{t.id}</h3>
              <span className="chip text-[10px]">{t.done ? "done" : `${t.iterations} to go`}</span>
            </div>
            <ol className="mt-2 space-y-1">
              {MICRO_STEPS.map((step, j) => (
                <li
                  key={step}
                  className={`rounded px-2 py-1 font-mono text-[11px] ${
                    !t.done && t.pc === j
                      ? "bg-panel text-ink ring-1 ring-accent/50"
                      : "text-ink-faint"
                  }`}
                >
                  {t.reg !== null && j === 1 ? `add 1 → reg = ${t.reg}` : step}
                </li>
              ))}
            </ol>
            {t.reg !== null ? (
              <p className="mt-1.5 font-mono text-[11px] text-warn">register: {t.reg}</p>
            ) : null}
          </div>
        ))}
      </div>
      <div className="space-y-2.5">
        <div className="rounded-lg border border-line bg-bg-soft p-3 text-center">
          <span className="section-label">Shared counter</span>
          <p className="mt-1 font-mono text-4xl font-bold text-ink">{state.counter}</p>
          <p className="mt-1 text-xs text-ink-faint">
            expected {state.expectedIncrements}
            {state.expectedIncrements - state.counter > 0 ? (
              <span className="text-bad"> · {state.expectedIncrements - state.counter} LOST</span>
            ) : null}
          </p>
        </div>
        <div className="rounded-lg border border-line bg-bg-soft p-3 text-xs text-ink-muted">
          <p>
            {state.unsynchronized
              ? "Racy mode: each micro-step is a separate tick, so stores can overwrite each other."
              : "Mutex mode: each increment happens inside one atomic critical section."}
          </p>
        </div>
      </div>
    </div>
  );
}

export function BoundedBufferLab() {
  return (
    <SimShell
      engine={boundedBufferEngine}
      title="Bounded Buffer Lab"
      description="Producers and consumers sharing a fixed buffer — with the semaphore values on display."
      toolbar={(sim) => (
        <>
          <button type="button" className="btn text-xs" onClick={() => sim.dispatch({ type: "add-producer" })}>
            + producer
          </button>
          <button type="button" className="btn text-xs" onClick={() => sim.dispatch({ type: "add-consumer" })}>
            + consumer
          </button>
          <label className="flex items-center gap-1.5 text-xs text-ink-muted">
            capacity
            <input
              type="number"
              min={2}
              max={8}
              className="w-12 rounded-md border border-line bg-panel px-1.5 py-1 text-xs"
              value={sim.state.capacity}
              onChange={(e) => sim.dispatch({ type: "set-capacity", payload: Number(e.target.value) })}
              aria-label="Buffer capacity"
            />
          </label>
        </>
      )}
      note="Textbook pattern: producers P(empty) P(mutex) … V(mutex) V(full); consumers mirror it. Producers run before consumers inside a tick (deterministic order). Each agent produces/consumes exactly 3 items."
      inspector={(sim) => <SemaphorePanel state={sim.state} />}
    >
      {(sim) => <BufferViz state={sim.state} />}
    </SimShell>
  );
}

function BufferViz({ state }: { state: BufferState }) {
  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-line bg-bg-soft p-3">
        <span className="section-label">Buffer ({state.buffer.length}/{state.capacity})</span>
        <div className="mt-2 flex gap-1.5">
          {Array.from({ length: state.capacity }, (_, i) => {
            const item = state.buffer[i];
            return (
              <div
                key={i}
                className={`grid h-12 w-12 place-items-center rounded-lg border font-mono text-sm ${
                  item !== undefined
                    ? "border-accent/60 bg-accent-soft text-ink"
                    : "border-dashed border-line text-ink-faint"
                }`}
                title={item !== undefined ? `item ${item}` : "empty slot"}
              >
                {item ?? "–"}
              </div>
            );
          })}
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="rounded-lg border border-line bg-bg-soft p-3">
          <span className="section-label">Producers</span>
          <ul className="mt-1.5 space-y-1 text-xs">
            {state.producers.map((p) => (
              <li key={p.id} className="flex justify-between">
                <span className="font-mono text-ink-muted">{p.id}</span>
                <span className={p.state === "waiting-empty" ? "text-warn" : p.state === "done" ? "text-ink-faint" : "text-ok"}>
                  {p.state} ({p.remainingItems} left)
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-lg border border-line bg-bg-soft p-3">
          <span className="section-label">Consumers</span>
          <ul className="mt-1.5 space-y-1 text-xs">
            {state.consumers.map((c) => (
              <li key={c.id} className="flex justify-between">
                <span className="font-mono text-ink-muted">{c.id}</span>
                <span className={c.state === "waiting-full" ? "text-warn" : c.state === "done" ? "text-ink-faint" : "text-ok"}>
                  {c.state} ({c.remainingItems} left)
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function SemaphorePanel({ state }: { state: BufferState }) {
  const s = state.semaphores;
  return (
    <div className="rounded-lg border border-line bg-bg-soft p-3">
      <span className="section-label">Semaphores</span>
      <dl className="mt-2 grid grid-cols-3 gap-2 text-center">
        {(
          [
            ["empty", s.empty, "free slots"],
            ["full", s.full, "filled slots"],
            ["mutex", s.mutex, "lock"],
          ] as const
        ).map(([name, value, hint]) => (
          <div key={name} className="rounded-md bg-panel px-1 py-1.5">
            <dt className="text-[10px] uppercase text-ink-faint">{name}</dt>
            <dd className={`font-mono text-lg ${value === 0 ? "text-warn" : "text-ink"}`}>{value}</dd>
            <dd className="text-[9px] text-ink-faint">{hint}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-2 text-[11px] text-ink-faint">
        produced {state.produced} · consumed {state.consumed}
      </p>
    </div>
  );
}
