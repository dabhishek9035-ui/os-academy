import type { SimAction, SimEvent, SimulationEngine } from "@/types";

/**
 * Classical synchronization problems (module 8): readers–writers and the
 * dining philosophers. Deterministic tick-based models; each variant's
 * trade-offs are documented in the lessons.
 *
 * Readers-writers (reader-priority): readers enter freely while no writer
 * holds/in waits ahead of them; writers wait for exclusive access. Starvation
 * of writers is the documented weakness.
 *
 * Dining philosophers: five philosophers, five forks. Two strategies are
 * modelled — naive (pick left then right; can deadlock) and resource
 * hierarchy (all pick the lower-numbered fork first; provably deadlock-free).
 */

// ---------------------------------------------------------------------------
// readers–writers
// ---------------------------------------------------------------------------

export interface RwAgent {
  id: string;
  kind: "reader" | "writer";
  /** idle | reading | writing | waiting */
  state: string;
  workLeft: number;
}

export interface RwState {
  readersActive: number;
  writersActive: number;
  agents: RwAgent[];
  strategy: "reader-priority" | "writer-priority";
  tick: number;
  eventLog: SimEvent[];
  error: string | null;
}

export type RwAction = "tick" | "add-reader" | "add-writer" | "set-strategy" | "reset";

function rwAgent(id: string, kind: "reader" | "writer"): RwAgent {
  return { id, kind, state: "idle", workLeft: 3 };
}

export const readersWritersEngine: SimulationEngine<RwState, RwAction> = {
  id: "readers-writers",
  initialState() {
    return {
      readersActive: 0,
      writersActive: 0,
      agents: [
        rwAgent("R1", "reader"),
        rwAgent("R2", "reader"),
        rwAgent("W1", "writer"),
      ],
      strategy: "reader-priority",
      tick: 0,
      eventLog: [
        { time: 0, kind: "info", label: "2 readers + 1 writer queued. Readers share access; writers need exclusivity.", severity: "info" },
      ],
      error: null,
    };
  },

  step(state, action: SimAction<RwAction>) {
    switch (action.type) {
      case "tick": {
        const tick = state.tick + 1;
        const events: SimEvent[] = [];
        const agents = state.agents.map((a) => ({ ...a }));
        let readersActive = state.readersActive;
        let writersActive = state.writersActive;

        // progress current workers
        for (const a of agents) {
          if (a.state === "reading" || a.state === "writing") {
            a.workLeft -= 1;
            if (a.workLeft <= 0) {
              events.push({
                time: tick,
                kind: "release",
                label: `${a.id} ${a.state === "reading" ? "finished reading" : "finished writing"} and released access.`,
                severity: "info",
              });
              if (a.state === "reading") readersActive -= 1;
              else writersActive -= 1;
              a.state = "done";
            }
          }
        }

        const anyWriting = writersActive > 0;
        // admission per strategy
        const waitingWriters = agents.filter((a) => a.kind === "writer" && a.state === "idle");
        const waitingReaders = agents.filter((a) => a.kind === "reader" && a.state === "idle");
        if (state.strategy === "reader-priority") {
          if (!anyWriting && writersActive === 0) {
            for (const r of waitingReaders) {
              r.state = "reading";
              readersActive += 1;
              events.push({ time: tick, kind: "enter", label: `${r.id} starts READING (shared access; readers now: ${readersActive}).`, severity: "info" });
            }
          }
          if (writersActive === 0 && readersActive === 0 && waitingWriters.length > 0) {
            const w = waitingWriters[0];
            w.state = "writing";
            writersActive += 1;
            events.push({ time: tick, kind: "enter", label: `${w.id} starts WRITING (exclusive access).`, severity: "warn" });
          }
        } else {
          // writer-priority: once a writer waits, no new readers enter
          if (waitingWriters.length > 0) {
            if (writersActive === 0 && readersActive === 0) {
              const w = waitingWriters[0];
              w.state = "writing";
              writersActive += 1;
              events.push({ time: tick, kind: "enter", label: `${w.id} starts WRITING (writer-priority: waiting writers block new readers).`, severity: "warn" });
            }
          } else if (!anyWriting && writersActive === 0) {
            for (const r of waitingReaders) {
              r.state = "reading";
              readersActive += 1;
              events.push({ time: tick, kind: "enter", label: `${r.id} starts READING (no writers waiting; readers now: ${readersActive}).`, severity: "info" });
            }
          }
        }

        return {
          ...state,
          agents,
          readersActive,
          writersActive,
          tick,
          eventLog: [...state.eventLog.slice(-98), ...events],
        };
      }
      case "add-reader": {
        if (state.agents.filter((a) => a.kind === "reader").length >= 4) {
          return { ...state, error: "At most 4 readers." };
        }
        return {
          ...state,
          error: null,
          agents: [...state.agents, rwAgent(`R${state.agents.filter((a) => a.kind === "reader").length + 1}`, "reader")],
        };
      }
      case "add-writer": {
        if (state.agents.filter((a) => a.kind === "writer").length >= 3) {
          return { ...state, error: "At most 3 writers." };
        }
        return {
          ...state,
          error: null,
          agents: [...state.agents, rwAgent(`W${state.agents.filter((a) => a.kind === "writer").length + 1}`, "writer")],
        };
      }
      case "set-strategy": {
        const strategy = action.payload as "reader-priority" | "writer-priority";
        return {
          ...state,
          error: null,
          strategy,
          eventLog: [
            ...state.eventLog.slice(-98),
            {
              time: state.tick,
              kind: "config",
              label:
                strategy === "reader-priority"
                  ? "Reader priority: readers stream in freely; writers can STARVE."
                  : "Writer priority: once a writer waits, new readers queue behind it — writers can't starve, readers might.",
              severity: "info",
            },
          ],
        };
      }
      case "reset":
        return readersWritersEngine.initialState();
      default:
        return state;
    }
  },

  explain(state) {
    const reading = state.agents.filter((a) => a.state === "reading").length;
    const writing = state.agents.filter((a) => a.state === "writing").length;
    const waiting = state.agents.filter((a) => a.state === "idle").length;
    return `${state.strategy} · reading: ${reading} · writing: ${writing} · waiting: ${waiting}.`;
  },
};

// ---------------------------------------------------------------------------
// dining philosophers
// ---------------------------------------------------------------------------

export type PhilosopherState = "thinking" | "hungry" | "eating" | "has-left" | "has-right" | "blocked";

export interface Philosopher {
  id: number;
  state: PhilosopherState;
  hunger: number;
}

export interface DiningState {
  philosophers: Philosopher[];
  /** naive = pick left then right (deadlock-prone); hierarchy = lowest fork first */
  strategy: "naive" | "hierarchy";
  ticks: number;
  meals: number;
  eventLog: SimEvent[];
  error: string | null;
}

export type DiningAction = "tick" | "set-strategy" | "reset";

/** Fork f sits between philosopher f (left side) and f+1 (right side). */
function forkHeld(philosophers: Philosopher[], fork: number): boolean {
  const n = philosophers.length;
  const left = philosophers[fork];
  const right = philosophers[(fork + 1) % n];
  // an eating philosopher is still holding both of their forks
  return (
    left.state === "has-left" ||
    left.state === "blocked" || // blocked = holding the left fork, waiting for the right
    left.state === "eating" ||
    right.state === "has-right" ||
    right.state === "eating"
  );
}

export const diningEngine: SimulationEngine<DiningState, DiningAction> = {
  id: "dining",
  initialState() {
    return {
      philosophers: Array.from({ length: 5 }, (_, i) => ({
        id: i,
        state: "thinking" as PhilosopherState,
        hunger: (i % 2) + 1,
      })),
      strategy: "naive",
      ticks: 0,
      meals: 0,
      eventLog: [
        { time: 0, kind: "info", label: "Five philosophers, five forks. Naive strategy: everyone grabs left then right — deadlock looms.", severity: "info" },
      ],
      error: null,
    };
  },

  step(state, action: SimAction<DiningAction>) {
    switch (action.type) {
      case "tick": {
        const ticks = state.ticks + 1;
        const events: SimEvent[] = [];
        const philosophers = state.philosophers.map((p) => ({ ...p }));
        const n = philosophers.length;
        let meals = state.meals;

        // release forks when finished eating
        for (const p of philosophers) {
          if (p.state === "eating") {
            p.hunger -= 1;
            if (p.hunger <= 0) {
              p.state = "thinking";
              p.hunger = 2 + (p.id % 2);
              meals += 1;
              events.push({ time: ticks, kind: "release", label: `Philosopher ${p.id} finished eating, releasing both forks.`, severity: "info" });
            }
          }
        }

        // acquisition: thinking → hungry → grab first fork → (later tick) grab second
        for (const p of philosophers) {
          const leftFork = p.id;
          const rightFork = (p.id + 1) % n;
          const st: PhilosopherState = p.state;
          if (st === "thinking") {
            p.state = "hungry";
            events.push({ time: ticks, kind: "hungry", label: `Philosopher ${p.id} gets hungry.`, severity: "info" });
          }
          if (state.strategy === "naive") {
            // Two-phase discipline: grab the left fork on one tick, only try
            // the right fork on a LATER tick. This is what makes the classic
            // all-hold-left deadlock reachable and visible.
            const wasHoldingLeft = p.state === "has-left" || p.state === "blocked";
            if (!wasHoldingLeft && p.state === "hungry" && !forkHeld(philosophers, leftFork)) {
              p.state = "has-left";
              events.push({ time: ticks, kind: "grab", label: `Philosopher ${p.id} grabbed LEFT fork ${leftFork}.`, severity: "info" });
            } else if (wasHoldingLeft && !forkHeld(philosophers, rightFork)) {
              p.state = "eating";
              events.push({ time: ticks, kind: "eat", label: `Philosopher ${p.id} grabbed RIGHT fork ${rightFork} and starts EATING.`, severity: "ok" });
            } else if (wasHoldingLeft) {
              p.state = "blocked";
              events.push({ time: ticks, kind: "blocked", label: `Philosopher ${p.id} holds the left fork but RIGHT fork ${rightFork} is taken — waits (holding and waiting!).`, severity: "warn" });
            }
          } else {
            // resource hierarchy: always acquire the LOWER-numbered fork first
            const first = Math.min(leftFork, rightFork);
            const second = Math.max(leftFork, rightFork);
            if ((p.state === "has-left" || p.state === "has-right") && !forkHeld(philosophers, second)) {
              p.state = "eating";
              events.push({ time: ticks, kind: "eat", label: `Philosopher ${p.id} grabbed fork ${second} and starts EATING (no circular wait possible).`, severity: "ok" });
            } else if (p.state === "hungry" && !forkHeld(philosophers, first)) {
              p.state = p.id === first ? "has-left" : "has-right";
              events.push({ time: ticks, kind: "grab", label: `Philosopher ${p.id} grabbed fork ${first} (lower-numbered first — hierarchy).`, severity: "info" });
            }
          }
        }

        // deadlock detection (naive): every philosopher holds one fork and waits
        const allBlocked =
          state.strategy === "naive" &&
          philosophers.every((p) => p.state === "blocked" || p.state === "has-left");
        if (allBlocked && !state.eventLog.some((e) => e.kind === "deadlock")) {
          events.push({
            time: ticks,
            kind: "deadlock",
            label: "DEADLOCK: every philosopher holds one fork and waits for the other — circular wait. Switch to the hierarchy strategy to break it.",
            severity: "bad",
          });
        }

        return {
          ...state,
          philosophers,
          ticks,
          meals,
          eventLog: [...state.eventLog.slice(-98), ...events],
        };
      }
      case "set-strategy": {
        const strategy = action.payload as "naive" | "hierarchy";
        return {
          ...diningEngine.initialState(),
          strategy,
          eventLog: [
            {
              time: 0,
              kind: "config",
              label:
                strategy === "naive"
                  ? "Naive strategy: grab left then right — the classic deadlock setup."
                  : "Resource hierarchy: everyone grabs the LOWER-numbered fork first — circular wait becomes impossible.",
              severity: "info",
            },
          ],
        };
      }
      case "reset":
        return diningEngine.initialState();
      default:
        return state;
    }
  },

  explain(state) {
    const eating = state.philosophers.filter((p) => p.state === "eating").length;
    const blocked = state.philosophers.filter((p) => p.state === "blocked" || p.state === "has-left").length;
    if (state.strategy === "naive" && blocked === state.philosophers.length) {
      return "DEADLOCKED — all five hold one fork and wait. Switch strategies to recover.";
    }
    return `${state.strategy} · eating: ${eating} · holding/waiting: ${blocked} · meals so far: ${state.meals}.`;
  },
};
