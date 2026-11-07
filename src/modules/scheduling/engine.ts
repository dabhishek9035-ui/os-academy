import type { SimAction, SimEvent, SimulationEngine } from "@/types";

/**
 * CPU Scheduling engine.
 *
 * Model (documented simplifications):
 *  - Single CPU, no I/O bursts: each process runs exactly `burst` time units
 *    of pure CPU work. Waiting time = turnaround − burst (valid in this model).
 *  - Time is integer time units.
 *  - Lower numeric priority = higher priority (documented convention).
 *  - Round Robin: a process arriving exactly when another's quantum expires
 *    enters the ready queue first; the preempted process is re-enqueued after.
 *  - Ties (same arrival/burst/priority) are broken by process id, compared
 *    numerically when ids are of the form P<number>.
 *  - Context switches are instantaneous (no switch overhead added).
 */

export type SchedulingAlgorithm = "fcfs" | "sjf" | "srtf" | "priority" | "rr";
export type PriorityMode = "preemptive" | "non-preemptive";

export interface ProcessInput {
  pid: string;
  arrival: number;
  burst: number;
  priority: number;
}

export interface TimelineSegment {
  /** null = CPU idle */
  pid: string | null;
  start: number;
  end: number;
  /** Human reason for this scheduling decision. */
  reason: string;
}

export interface ProcessMetrics {
  pid: string;
  arrival: number;
  burst: number;
  priority: number;
  /** −1 if not completed (cannot happen in this batch model). */
  completion: number;
  turnaround: number;
  waiting: number;
  /** −1 if the process never ran (empty burst guard prevents this). */
  response: number;
  firstStart: number;
}

export interface Averages {
  turnaround: number;
  waiting: number;
  response: number;
  throughput: number;
  cpuUtilization: number;
  makespan: number;
  contextSwitches: number;
}

export interface SchedulingResult {
  timeline: TimelineSegment[];
  metrics: ProcessMetrics[];
  averages: Averages;
}

export interface SchedulingState {
  inputs: ProcessInput[];
  algorithm: SchedulingAlgorithm;
  quantum: number;
  priorityMode: PriorityMode;
  result: SchedulingResult;
  /** How many timeline decisions are currently revealed (step-through cursor). */
  cursor: number;
  error: string | null;
  eventLog: SimEvent[];
  clock: number;
}

export const ALGORITHM_LABELS: Record<SchedulingAlgorithm, string> = {
  fcfs: "First-Come, First-Served (FCFS)",
  sjf: "Shortest Job First (SJF, non-preemptive)",
  srtf: "Shortest Remaining Time First (SRTF, preemptive)",
  priority: "Priority",
  rr: "Round Robin",
};

const MAX_PROCESSES = 8;

// ---------------------------------------------------------------------------
// Pure scheduling algorithms
// ---------------------------------------------------------------------------

/** Numeric-aware id comparison: P2 < P10. */
export function pidCompare(a: string, b: string): number {
  const na = /^P?(\d+)$/i.exec(a);
  const nb = /^P?(\d+)$/i.exec(b);
  if (na && nb) {
    const d = parseInt(na[1], 10) - parseInt(nb[1], 10);
    if (d !== 0) return d;
  }
  return a.localeCompare(b);
}

interface Running {
  pid: string;
  arrival: number;
  remaining: number;
  priority: number;
  firstStart: number | null;
}

/** Picks the best ready process under the given policy, or null. */
function pickNext(ready: Running[], algorithm: SchedulingAlgorithm): Running | null {
  if (ready.length === 0) return null;
  const sorted = [...ready].sort((a, b) => {
    switch (algorithm) {
      case "sjf":
      case "srtf":
        // For non-preemptive SJF the caller sets remaining = total burst;
        // for SRTF remaining is the true remaining time.
        if (a.remaining !== b.remaining) return a.remaining - b.remaining;
        break;
      case "priority":
        if (a.priority !== b.priority) return a.priority - b.priority;
        break;
      default:
        break;
    }
    if (a.arrival !== b.arrival) return a.arrival - b.arrival;
    return pidCompare(a.pid, b.pid);
  });
  return sorted[0];
}

/**
 * Computes the full schedule for the batch model.
 * All algorithms are implemented as event-driven simulations over the inputs.
 */
export function computeSchedule(
  inputs: ProcessInput[],
  algorithm: SchedulingAlgorithm,
  quantum: number,
  priorityMode: PriorityMode,
): SchedulingResult {
  const procs = inputs
    .map((p) => ({ ...p }))
    .sort((a, b) => a.arrival - b.arrival || pidCompare(a.pid, b.pid));
  const timeline: TimelineSegment[] = [];
  const firstStart = new Map<string, number>();

  let t = 0;
  let completed = 0;
  const remaining = new Map<string, number>(
    procs.map((p) => [p.pid, p.burst]),
  );
  const n = procs.length;
  let arrivedIdx = 0;
  let readyQueue: string[] = []; // rr only
  let lastPid: string | null = null;
  let switches = 0;

  const rrEnqueueArrivals = (upto: number) => {
    while (arrivedIdx < n && procs[arrivedIdx].arrival <= upto) {
      readyQueue.push(procs[arrivedIdx].pid);
      arrivedIdx += 1;
    }
  };

  const push = (pid: string | null, start: number, end: number, reason: string) => {
    if (end <= start) return;
    if (pid !== null && pid !== lastPid && lastPid !== null) switches += 1;
    timeline.push({ pid, start, end, reason });
    lastPid = pid;
  };

  const reasonFor = (p: ProcessInput, readyCount: number, at: number): string => {
    switch (algorithm) {
      case "fcfs":
        return `${p.pid} runs to completion (arrived at ${p.arrival}; FCFS order)`;
      case "sjf":
        return `${p.pid} selected — shortest burst (${p.burst}) among ${readyCount} ready process${readyCount === 1 ? "" : "es"} at t=${at}`;
      case "srtf":
        return `${p.pid} has the least remaining time at t=${at}`;
      case "priority":
        return `${p.pid} selected — highest priority (lowest number: ${p.priority}) among ${readyCount} ready at t=${at}`;
      case "rr":
        return `${p.pid} runs for one quantum (q=${quantum})`;
    }
  };

  if (algorithm === "rr") {
    // ---- Round Robin ----
    rrEnqueueArrivals(0);
    if (readyQueue.length === 0 && n > 0) {
      t = procs[0].arrival;
      rrEnqueueArrivals(t);
    }
    while (completed < n) {
      rrEnqueueArrivals(t);
      const pid = readyQueue.shift();
      if (pid === undefined) {
        // idle until next arrival
        const nextArrival = procs.find((p) => (remaining.get(p.pid) ?? 0) > 0 && p.arrival > t);
        if (!nextArrival) break;
        push(null, t, nextArrival.arrival, `CPU idle — waiting for ${nextArrival.pid} (arrives t=${nextArrival.arrival})`);
        t = nextArrival.arrival;
        rrEnqueueArrivals(t);
        continue;
      }
      const slice = Math.min(quantum, remaining.get(pid) ?? 0);
      const start = t;
      t += slice;
      remaining.set(pid, (remaining.get(pid) ?? 0) - slice);
      if (!firstStart.has(pid)) firstStart.set(pid, start);
      rrEnqueueArrivals(t);
      const done = (remaining.get(pid) ?? 0) === 0;
      if (!done) readyQueue.push(pid);
      const p = procs.find((x) => x.pid === pid)!;
      push(
        pid,
        start,
        t,
        done
          ? `${p.pid} finishes (ran ${slice} of its quantum, remaining was ${slice})`
          : `${p.pid} runs ${slice} time units then re-joins the ready queue`,
      );
      if (done) completed += 1;
    }
  } else if (algorithm === "srtf" || (algorithm === "priority" && priorityMode === "preemptive")) {
    // ---- Preemptive: re-decide at every arrival and completion ----
    const ready: Running[] = [];
    while (completed < n) {
      // admit arrivals up to now
      while (arrivedIdx < n && procs[arrivedIdx].arrival <= t) {
        const p = procs[arrivedIdx];
        ready.push({ pid: p.pid, arrival: p.arrival, remaining: p.burst, priority: p.priority, firstStart: null });
        arrivedIdx += 1;
      }
      const best = pickNext(ready, algorithm);
      if (!best) {
        const nextArrival = procs[arrivedIdx];
        if (!nextArrival) break;
        push(null, t, nextArrival.arrival, `CPU idle — waiting for ${nextArrival.pid} (arrives t=${nextArrival.arrival})`);
        t = nextArrival.arrival;
        continue;
      }
      // next event time: next arrival or this process finishing
      const finishTime = t + best.remaining;
      const nextArrivalTime = arrivedIdx < n ? procs[arrivedIdx].arrival : Infinity;
      const stopAt = Math.min(finishTime, nextArrivalTime);
      if (best.firstStart === null) best.firstStart = t;
      if (!firstStart.has(best.pid)) firstStart.set(best.pid, t);
      best.remaining -= stopAt - t;
      const p = procs.find((x) => x.pid === best.pid)!;
      if (best.remaining === 0) {
        push(best.pid, t, stopAt, reasonFor(p, ready.length, t));
        completed += 1;
      } else if (nextArrivalTime !== Infinity && stopAt === nextArrivalTime) {
        // Decide whether the arrival preempts: re-pick after admitting it.
        push(best.pid, t, stopAt, `${best.pid} runs ${stopAt - t} time units…`);
      }
      t = stopAt;
      // admit the arrival now, then re-pick (preemption happens naturally)
      while (arrivedIdx < n && procs[arrivedIdx].arrival <= t) {
        const p2 = procs[arrivedIdx];
        ready.push({ pid: p2.pid, arrival: p2.arrival, remaining: p2.burst, priority: p2.priority, firstStart: null });
        arrivedIdx += 1;
      }
      // remove finished
      for (let i = ready.length - 1; i >= 0; i -= 1) {
        if (ready[i].remaining <= 0) ready.splice(i, 1);
      }
    }
  } else {
    // ---- Non-preemptive: FCFS / SJF / priority(non-preemptive) ----
    const alg: SchedulingAlgorithm =
      algorithm === "priority" ? "priority" : algorithm === "sjf" ? "sjf" : "fcfs";
    while (completed < n) {
      const readyProcs = procs.filter(
        (p) => p.arrival <= t && (remaining.get(p.pid) ?? 0) > 0,
      );
      let chosen: ProcessInput | undefined;
      if (readyProcs.length > 0) {
        // For non-preemptive SJF the "remaining" is the total burst.
        const best = pickNext(
          readyProcs.map((p) => ({
            pid: p.pid,
            arrival: p.arrival,
            remaining: p.burst,
            priority: p.priority,
            firstStart: null,
          })),
          alg,
        )!;
        chosen = procs.find((p) => p.pid === best.pid);
      }
      if (!chosen) {
        const nextArrival = procs.find((p) => (remaining.get(p.pid) ?? 0) > 0 && p.arrival > t);
        if (!nextArrival) break;
        push(null, t, nextArrival.arrival, `CPU idle — waiting for ${nextArrival.pid} (arrives t=${nextArrival.arrival})`);
        t = nextArrival.arrival;
        continue;
      }
      if (!firstStart.has(chosen.pid)) firstStart.set(chosen.pid, t);
      const run = remaining.get(chosen.pid) ?? 0;
      push(chosen.pid, t, t + run, reasonFor(chosen, readyProcs.length, t));
      t += run;
      remaining.set(chosen.pid, 0);
      completed += 1;
    }
  }

  // ---- metrics ----
  const completion = new Map<string, number>();
  for (const seg of timeline) {
    if (seg.pid) completion.set(seg.pid, seg.end);
  }
  const metrics: ProcessMetrics[] = procs.map((p) => {
    const comp = completion.get(p.pid) ?? t;
    const fs = firstStart.get(p.pid) ?? t;
    const turnaround = comp - p.arrival;
    return {
      pid: p.pid,
      arrival: p.arrival,
      burst: p.burst,
      priority: p.priority,
      completion: comp,
      turnaround,
      waiting: turnaround - p.burst,
      response: fs - p.arrival,
      firstStart: fs,
    };
  });

  const makespan = t;
  const busy = timeline.reduce((acc, s) => acc + (s.pid ? s.end - s.start : 0), 0);
  const avg = (f: (m: ProcessMetrics) => number) =>
    n === 0 ? 0 : metrics.reduce((a, m) => a + f(m), 0) / n;

  return {
    timeline,
    metrics,
    averages: {
      turnaround: avg((m) => m.turnaround),
      waiting: avg((m) => m.waiting),
      response: avg((m) => m.response),
      throughput: makespan > 0 ? n / makespan : 0,
      cpuUtilization: makespan > 0 ? busy / makespan : 0,
      makespan,
      contextSwitches: switches,
    },
  };
}

// ---------------------------------------------------------------------------
// Default scenario + engine
// ---------------------------------------------------------------------------

export function defaultInputs(): ProcessInput[] {
  return [
    { pid: "P1", arrival: 0, burst: 7, priority: 3 },
    { pid: "P2", arrival: 2, burst: 4, priority: 1 },
    { pid: "P3", arrival: 4, burst: 1, priority: 4 },
    { pid: "P4", arrival: 5, burst: 4, priority: 2 },
  ];
}

export const PRESETS: Record<string, { label: string; inputs: ProcessInput[]; note: string }> = {
  classic: {
    label: "Classic mix",
    inputs: defaultInputs(),
    note: "Varied bursts and arrivals — good first scenario.",
  },
  convoy: {
    label: "Convoy effect",
    inputs: [
      { pid: "P1", arrival: 0, burst: 20, priority: 2 },
      { pid: "P2", arrival: 1, burst: 2, priority: 2 },
      { pid: "P3", arrival: 2, burst: 2, priority: 2 },
      { pid: "P4", arrival: 3, burst: 2, priority: 2 },
    ],
    note: "One long job makes everyone wait under FCFS.",
  },
  simultaneous: {
    label: "Simultaneous arrivals",
    inputs: [
      { pid: "P1", arrival: 0, burst: 5, priority: 2 },
      { pid: "P2", arrival: 0, burst: 3, priority: 2 },
      { pid: "P3", arrival: 0, burst: 8, priority: 2 },
    ],
    note: "All arrive at t=0 — watch the tie-breaking.",
  },
  lateArrival: {
    label: "Idle CPU, late arrival",
    inputs: [
      { pid: "P1", arrival: 0, burst: 3, priority: 1 },
      { pid: "P2", arrival: 9, burst: 4, priority: 1 },
    ],
    note: "The CPU sits idle between t=3 and t=9.",
  },
};

export type SchedulingAction =
  | "set-algorithm"
  | "set-quantum"
  | "set-priority-mode"
  | "add-process"
  | "update-process"
  | "remove-process"
  | "load-preset"
  | "tick"
  | "rewind"
  | "reset-cursor";

function validate(inputs: ProcessInput[], quantum: number): string | null {
  if (inputs.length === 0) return "Add at least one process.";
  if (inputs.length > MAX_PROCESSES) return `At most ${MAX_PROCESSES} processes.`;
  const ids = new Set(inputs.map((p) => p.pid));
  if (ids.size !== inputs.length) return "Process ids must be unique.";
  for (const p of inputs) {
    if (!p.pid.trim()) return "Every process needs an id.";
    if (!Number.isFinite(p.arrival) || p.arrival < 0) return `${p.pid}: arrival time must be ≥ 0.`;
    if (!Number.isInteger(p.arrival)) return `${p.pid}: arrival time must be a whole number.`;
    if (!Number.isFinite(p.burst) || p.burst < 1) return `${p.pid}: CPU burst must be ≥ 1.`;
    if (!Number.isInteger(p.burst)) return `${p.pid}: CPU burst must be a whole number.`;
    if (!Number.isFinite(p.priority)) return `${p.pid}: priority must be a number.`;
  }
  if (!Number.isInteger(quantum) || quantum < 1) return "Time quantum must be a whole number ≥ 1.";
  return null;
}

function rebuild(state: SchedulingState): SchedulingState {
  const error = validate(state.inputs, state.quantum);
  const result = error
    ? { timeline: [], metrics: [], averages: { turnaround: 0, waiting: 0, response: 0, throughput: 0, cpuUtilization: 0, makespan: 0, contextSwitches: 0 } }
    : computeSchedule(state.inputs, state.algorithm, state.quantum, state.priorityMode);
  const cursor = Math.min(state.cursor, result.timeline.length);
  return { ...state, error, result, cursor };
}

export const schedulingEngine: SimulationEngine<SchedulingState, SchedulingAction> = {
  id: "scheduling",
  initialState() {
    const base: SchedulingState = {
      inputs: defaultInputs(),
      algorithm: "fcfs",
      quantum: 2,
      priorityMode: "non-preemptive",
      result: { timeline: [], metrics: [], averages: { turnaround: 0, waiting: 0, response: 0, throughput: 0, cpuUtilization: 0, makespan: 0, contextSwitches: 0 } },
      cursor: 0,
      error: null,
      eventLog: [],
      clock: 0,
    };
    return rebuild(base);
  },
  step(state, action: SimAction<SchedulingAction>) {
    switch (action.type) {
      case "tick": {
        if (state.cursor >= state.result.timeline.length) return state;
        const cursor = state.cursor + 1;
        const seg = state.result.timeline[cursor - 1];
        const event: SimEvent = {
          time: seg.end,
          kind: seg.pid ? "cpu-run" : "cpu-idle",
          label: seg.reason,
          severity: seg.pid ? "info" : "warn",
        };
        return {
          ...state,
          cursor,
          clock: seg.end,
          eventLog: [...state.eventLog.slice(-99), event],
        };
      }
      case "rewind": {
        const cursor = Math.max(0, state.cursor - 1);
        return { ...state, cursor, clock: cursor > 0 ? state.result.timeline[cursor - 1].end : 0 };
      }
      case "reset-cursor":
        return { ...state, cursor: 0, clock: 0, eventLog: [] };
      case "set-algorithm": {
        const algorithm = action.payload as SchedulingAlgorithm;
        const next = rebuild({ ...state, algorithm, cursor: 0, eventLog: [], clock: 0 });
        return {
          ...next,
          eventLog: [
            { time: 0, kind: "config", label: `Switched algorithm to ${ALGORITHM_LABELS[algorithm]}`, severity: "ok" },
          ],
        };
      }
      case "set-quantum":
        return rebuild({ ...state, quantum: action.payload as number, cursor: 0, eventLog: [], clock: 0 });
      case "set-priority-mode":
        return rebuild({ ...state, priorityMode: action.payload as PriorityMode, cursor: 0, eventLog: [], clock: 0 });
      case "add-process": {
        if (state.inputs.length >= MAX_PROCESSES) return state;
        let n = state.inputs.length + 1;
        while (state.inputs.some((p) => p.pid === `P${n}`)) n += 1;
        const maxArrival = Math.max(0, ...state.inputs.map((p) => p.arrival));
        return rebuild({
          ...state,
          inputs: [...state.inputs, { pid: `P${n}`, arrival: maxArrival, burst: 5, priority: 2 }],
          cursor: 0,
          eventLog: [],
          clock: 0,
        });
      }
      case "update-process": {
        const { pid, field, value } = action.payload as { pid: string; field: "pid" | "arrival" | "burst" | "priority"; value: number | string };
        return rebuild({
          ...state,
          inputs: state.inputs.map((p) =>
            p.pid === pid
              ? field === "pid"
                ? { ...p, pid: String(value).trim() || p.pid }
                : { ...p, [field]: Number(value) }
              : p,
          ),
          cursor: 0,
          eventLog: [],
          clock: 0,
        });
      }
      case "remove-process":
        return rebuild({
          ...state,
          inputs: state.inputs.filter((p) => p.pid !== (action.payload as string)),
          cursor: 0,
          eventLog: [],
          clock: 0,
        });
      case "load-preset": {
        const preset = PRESETS[action.payload as string];
        if (!preset) return state;
        return rebuild({
          ...state,
          inputs: preset.inputs.map((p) => ({ ...p })),
          cursor: 0,
          eventLog: [{ time: 0, kind: "preset", label: `Loaded preset “${preset.label}” — ${preset.note}`, severity: "ok" }],
          clock: 0,
        });
      }
      default:
        return state;
    }
  },
  explain(state) {
    if (state.error) return state.error;
    const { cursor, result } = state;
    if (result.timeline.length === 0) return "Add a process to begin.";
    if (cursor === 0) return `Press play to watch ${ALGORITHM_LABELS[state.algorithm]} schedule ${state.inputs.length} processes.`;
    if (cursor >= result.timeline.length) {
      return `Done: average waiting ${result.averages.waiting.toFixed(2)}, average turnaround ${result.averages.turnaround.toFixed(2)}, CPU ${Math.round(result.averages.cpuUtilization * 100)}% busy.`;
    }
    return result.timeline[cursor].reason;
  },
};
