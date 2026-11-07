import type { SimAction, SimEvent, SimulationEngine } from "@/types";

/**
 * Threads & concurrency engines: the race-condition stepper and a bounded
 * buffer with visible semaphore bookkeeping (module 4).
 *
 * Race model: one shared counter; each increment is three micro-steps
 * (load → add → store). Unsynchronized round-robin interleaving loses
 * updates — deterministic and hand-testable. Synchronized mode executes a
 * thread's whole critical section atomically.
 */

// ---------------------------------------------------------------------------
// race condition stepper
// ---------------------------------------------------------------------------

export interface RaceThread {
  id: string;
  pc: 0 | 1 | 2; // index into MICRO_STEPS
  iterations: number;
  done: boolean;
  reg: number | null;
}

export const MICRO_STEPS = ["load counter", "add 1", "store counter"] as const;

export interface RaceState {
  counter: number;
  threads: RaceThread[];
  schedule: "round-robin" | "chaos";
  chaosSeed: number;
  chaosState: number;
  unsynchronized: boolean;
  completedIncrements: number;
  expectedIncrements: number;
  eventLog: SimEvent[];
  error: string | null;
}

export type RaceAction =
  | "tick"
  | "run-to-end"
  | "set-schedule"
  | "set-iterations"
  | "toggle-sync"
  | "reset";

function mulberry(state: number): { value: number; next: number } {
  const a = state | 0;
  const t = (a + 0x6d2b79f5) | 0;
  const mixed = Math.imul(t ^ (t >>> 15), 1 | t);
  const out = (mixed ^ (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed))) ^ mixed;
  return { value: ((out ^ (out >>> 14)) >>> 0) / 4294967296, next: out };
}

export const raceEngine: SimulationEngine<RaceState, RaceAction> = {
  id: "race",
  initialState() {
    return {
      counter: 0,
      threads: [
        { id: "T1", pc: 0, iterations: 1, done: false, reg: null },
        { id: "T2", pc: 0, iterations: 1, done: false, reg: null },
      ],
      schedule: "round-robin",
      chaosSeed: 7,
      chaosState: 7,
      unsynchronized: true,
      completedIncrements: 0,
      expectedIncrements: 2,
      eventLog: [
        {
          time: 0,
          kind: "info",
          label: "Two threads will each increment the shared counter once. Step through and find the lost update.",
          severity: "info",
        },
      ],
      error: null,
    };
  },

  step(state, action: SimAction<RaceAction>) {
    switch (action.type) {
      case "tick": {
        const ready = state.threads.filter((t) => !t.done);
        if (ready.length === 0) return state;
        let pick: RaceThread;
        let chaosState: number | undefined;
        if (state.schedule === "round-robin") {
          pick = ready[0];
        } else {
          const r = mulberry(state.chaosState);
          pick = ready[Math.floor(r.value * ready.length) % ready.length];
          chaosState = r.next;
        }
        const events: SimEvent[] = [];
        let counter = state.counter;
        let completed = state.completedIncrements;
        const threads = state.threads.map((t) => ({ ...t }));

        const target = threads.find((t) => t.id === pick.id)!;
        if (state.unsynchronized) {
          const step = MICRO_STEPS[target.pc];
          if (step === "load counter") {
            target.reg = counter;
            events.push({ time: counter, kind: "micro", label: `${target.id} LOAD: register ← counter (= ${counter})`, severity: "info" });
          } else if (step === "add 1") {
            target.reg = (target.reg ?? 0) + 1;
            events.push({ time: counter, kind: "micro", label: `${target.id} ADD: register = ${target.reg}`, severity: "info" });
          } else {
            counter = target.reg ?? counter;
            events.push({
              time: counter,
              kind: "store",
              label: `${target.id} STORE: counter ← ${counter}${state.threads.some((t) => t.id !== target.id && t.reg === counter) ? " — possibly overwriting the other thread's increment!" : ""}`,
              severity: "warn",
            });
            target.reg = null;
            target.iterations -= 1;
            completed += 1;
            if (target.iterations <= 0) target.done = true;
            else target.pc = 0;
          }
          target.pc = ((target.pc + 1) % 3) as 0 | 1 | 2;
          if (target.done) target.pc = 0;
        } else {
          // atomic critical section: whole increment in one tick
          counter += 1;
          events.push({ time: counter, kind: "critical", label: `${target.id} enters critical section (mutex held): counter ← ${counter}. Atomic — no interleaving possible.`, severity: "ok" });
          target.iterations -= 1;
          completed += 1;
          if (target.iterations <= 0) target.done = true;
        }

        // rotate round-robin order: move picked thread to the back of the ready list
        if (state.schedule === "round-robin") {
          const idx = threads.findIndex((t) => t.id === pick.id);
          const [t] = threads.splice(idx, 1);
          threads.push(t);
        }

        return {
          ...state,
          counter,
          threads,
          completedIncrements: completed,
          chaosState: chaosState ?? state.chaosState,
          eventLog: [...state.eventLog.slice(-98), ...events],
        };
      }
      case "run-to-end": {
        let s = state;
        for (let i = 0; i < 200; i += 1) {
          if (s.threads.every((t) => t.done)) break;
          s = raceEngine.step(s, { type: "tick" });
        }
        return s;
      }
      case "set-schedule": {
        const schedule = action.payload as "round-robin" | "chaos";
        return { ...state, schedule, chaosState: state.chaosSeed };
      }
      case "set-iterations": {
        const n = action.payload as number;
        if (!Number.isInteger(n) || n < 1 || n > 5) return { ...state, error: "Iterations must be 1–5." };
        return {
          ...raceEngine.initialState(),
          unsynchronized: state.unsynchronized,
          schedule: state.schedule,
          threads: state.threads.map((t, i) => ({ ...t, iterations: n, id: t.id || `T${i + 1}` })),
          expectedIncrements: state.threads.length * n,
          error: null,
        };
      }
      case "toggle-sync": {
        const unsynchronized = !state.unsynchronized;
        return {
          ...raceEngine.initialState(),
          unsynchronized,
          schedule: state.schedule,
          threads: state.threads.map((t) => ({ ...t, iterations: state.threads[0].iterations })),
          expectedIncrements: state.expectedIncrements,
          eventLog: [
            {
              time: 0,
              kind: "config",
              label: unsynchronized
                ? "Synchronization OFF — increments can interleave and lose updates."
                : "Synchronization ON — a mutex makes each increment atomic.",
              severity: unsynchronized ? "warn" : "ok",
            },
          ],
        };
      }
      case "reset":
        return raceEngine.initialState();
      default:
        return state;
    }
  },

  explain(state) {
    if (state.threads.every((t) => t.done)) {
      const lost = state.expectedIncrements - state.counter;
      return `Done: counter = ${state.counter} (expected ${state.expectedIncrements})${lost > 0 ? ` — ${lost} update(s) LOST to the race condition.` : " — correct, the mutex prevented interleaving."}`;
    }
    const next = state.threads.find((t) => !t.done);
    return `counter = ${state.counter} · next: ${next?.id} ${state.unsynchronized ? MICRO_STEPS[next?.pc ?? 0] : "critical section (atomic)"}.`;
  },
};

// ---------------------------------------------------------------------------
// bounded buffer with semaphores
// ---------------------------------------------------------------------------

export interface BufferAgent {
  id: string;
  kind: "producer" | "consumer";
  /** idle | waiting-empty | waiting-full | waiting-mutex | working | done */
  state: string;
  remainingItems: number;
}

export interface BufferState {
  capacity: number;
  buffer: number[];
  semaphores: { empty: number; full: number; mutex: number };
  producers: BufferAgent[];
  consumers: BufferAgent[];
  produced: number;
  consumed: number;
  nextItemId: number;
  eventLog: SimEvent[];
  error: string | null;
}

export type BufferAction =
  | "tick"
  | "run-to-end"
  | "add-producer"
  | "add-consumer"
  | "set-capacity"
  | "reset";

const ITEMS_PER_AGENT = 3;

function freshAgent(id: string, kind: "producer" | "consumer"): BufferAgent {
  return { id, kind, state: "idle", remainingItems: ITEMS_PER_AGENT };
}

export const boundedBufferEngine: SimulationEngine<BufferState, BufferAction> = {
  id: "bounded-buffer",
  initialState() {
    return {
      capacity: 4,
      buffer: [],
      semaphores: { empty: 4, full: 0, mutex: 1 },
      producers: [freshAgent("P1", "producer")],
      consumers: [freshAgent("C1", "consumer")],
      produced: 0,
      consumed: 0,
      nextItemId: 1,
      eventLog: [
        { time: 0, kind: "info", label: "Buffer capacity 4 · semaphores empty=4, full=0, mutex=1. Press play.", severity: "info" },
      ],
      error: null,
    };
  },

  step(state, action: SimAction<BufferAction>) {
    switch (action.type) {
      case "tick": {
        const events: SimEvent[] = [];
        let { buffer, semaphores, produced, consumed, nextItemId } = state;
        const allDone =
          state.producers.every((p) => p.remainingItems <= 0 && p.state === "done") &&
          state.consumers.every((c) => c.remainingItems <= 0 || c.state === "done");
        void allDone;

        const producers = state.producers.map((p) => ({ ...p }));
        const consumers = state.consumers.map((c) => ({ ...c }));
        const sem = { ...semaphores };

        const tryProduce = (agent: BufferAgent) => {
          if (agent.remainingItems <= 0 || agent.state === "done") return;
          if (sem.empty > 0 && sem.mutex > 0) {
            sem.empty -= 1;
            sem.mutex -= 1;
            buffer.push(nextItemId);
            events.push({
              time: produced + 1,
              kind: "produce",
              label: `${agent.id} P(empty=${sem.empty}) P(mutex=${sem.mutex}) → appended item ${nextItemId} → V(mutex=${sem.mutex + 1}) V(full=${sem.full + 1})`,
              severity: "ok",
            });
            sem.mutex += 1;
            sem.full += 1;
            produced += 1;
            nextItemId += 1;
            agent.remainingItems -= 1;
            agent.state = agent.remainingItems <= 0 ? "done" : "idle";
          } else {
            if (agent.state !== "waiting-empty") {
              agent.state = "waiting-empty";
              events.push({
                time: produced,
                kind: "block",
                label: `${agent.id} P(empty=${sem.empty}) BLOCKED — buffer full (empty=0).`,
                severity: "warn",
              });
            }
          }
        };

        const tryConsume = (agent: BufferAgent) => {
          if (agent.remainingItems <= 0 || agent.state === "done") return;
          if (sem.full > 0 && sem.mutex > 0) {
            sem.mutex -= 1;
            const item = buffer.shift();
            sem.full -= 1;
            sem.mutex += 1;
            sem.empty += 1;
            consumed += 1;
            agent.remainingItems -= 1;
            agent.state = agent.remainingItems <= 0 ? "done" : "idle";
            if (item !== undefined) {
              events.push({
                time: consumed,
                kind: "consume",
                label: `${agent.id} P(full=${sem.full + 1}) P(mutex) → removed item ${item} → V(mutex) V(empty=${sem.empty})`,
                severity: "info",
              });
            }
          } else if (agent.state !== "waiting-full") {
            agent.state = "waiting-full";
            events.push({
              time: consumed,
              kind: "block",
              label: `${agent.id} P(full=${sem.full}) BLOCKED — buffer empty.`,
              severity: "warn",
            });
          }
        };

        // one phase per tick: producers then consumers (deterministic order)
        for (const p of producers) tryProduce(p);
        for (const c of consumers) tryConsume(c);

        return {
          ...state,
          buffer,
          semaphores: sem,
          produced,
          consumed,
          nextItemId,
          producers,
          consumers,
          eventLog: [...state.eventLog.slice(-98), ...events],
        };
      }
      case "run-to-end": {
        let s = state;
        for (let i = 0; i < 60; i += 1) {
          const done =
            s.producers.every((p) => p.state === "done") && s.consumers.every((c) => c.state === "done");
          if (done) break;
          s = boundedBufferEngine.step(s, { type: "tick" });
        }
        return s;
      }
      case "add-producer": {
        if (state.producers.length >= 3) return { ...state, error: "At most 3 producers." };
        return {
          ...state,
          error: null,
          producers: [...state.producers, freshAgent(`P${state.producers.length + 1}`, "producer")],
        };
      }
      case "add-consumer": {
        if (state.consumers.length >= 3) return { ...state, error: "At most 3 consumers." };
        return {
          ...state,
          error: null,
          consumers: [...state.consumers, freshAgent(`C${state.consumers.length + 1}`, "consumer")],
        };
      }
      case "set-capacity": {
        const n = action.payload as number;
        if (!Number.isInteger(n) || n < 2 || n > 8) return { ...state, error: "Capacity must be 2–8." };
        return {
          ...boundedBufferEngine.initialState(),
          capacity: n,
          semaphores: { empty: n, full: 0, mutex: 1 },
          eventLog: [{ time: 0, kind: "config", label: `Capacity set to ${n} — buffer and semaphores reset.`, severity: "info" }],
        };
      }
      case "reset":
        return boundedBufferEngine.initialState();
      default:
        return state;
    }
  },

  explain(state) {
    const done =
      state.producers.every((p) => p.state === "done") && state.consumers.every((c) => c.state === "done");
    if (done) {
      return `All agents done: produced ${state.produced}, consumed ${state.consumed} — the buffer never overflowed or underflowed.`;
    }
    return `buffer ${state.buffer.length}/${state.capacity} · empty=${state.semaphores.empty} full=${state.semaphores.full} mutex=${state.semaphores.mutex} · produced ${state.produced}, consumed ${state.consumed}.`;
  },
};
