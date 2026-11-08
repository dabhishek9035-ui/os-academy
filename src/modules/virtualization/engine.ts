import type { SimAction, SimEvent, SimulationEngine } from "@/types";

/**
 * Virtualization layers engine + multiprocessor/real-time engines (module 12).
 *
 * Simplifications: layer stacks are static teaching models; vCPU load
 * "drift" is a toy damped model, not real scheduling; multiprocessor uses
 * list scheduling (LPT); the RT engine simulates EDF over one hyperperiod
 * with deadline == period.
 */

// ---------------------------------------------------------------------------
// virtualization layers
// ---------------------------------------------------------------------------

export type VirtMode = "vm" | "container";

export const VIRT_LAYERS: Record<VirtMode, string[]> = {
  vm: [
    "Guest App",
    "Guest OS (kernel)",
    "Virtual Hardware (vCPU, vRAM, vDisk)",
    "Hypervisor (VMM)",
    "Host OS (kernel)",
    "Physical Hardware",
  ],
  container: [
    "App processes",
    "Isolated namespaces (pid, net, mnt)",
    "Container Runtime",
    "Host OS (kernel, shared)",
    "Physical Hardware",
  ],
};

export interface VirtState {
  mode: VirtMode;
  vcpus: { id: string; load: number; target: number }[];
  hostCpuCapacity: number;
  overcommitEvents: number;
  eventLog: SimEvent[];
  error: string | null;
}

export type VirtAction = "tick" | "set-mode" | "set-vcpu-load" | "reset";

export const virtualizationEngine: SimulationEngine<VirtState, VirtAction> = {
  id: "virtualization",
  initialState() {
    return {
      mode: "vm",
      vcpus: [
        { id: "vCPU0", load: 20, target: 20 },
        { id: "vCPU1", load: 20, target: 20 },
      ],
      hostCpuCapacity: 100,
      overcommitEvents: 0,
      eventLog: [
        { time: 0, kind: "info", label: "VM stack shown. Raise vCPU loads to see the hypervisor time-slice under overcommit.", severity: "info" },
      ],
      error: null,
    };
  },

  step(state, action: SimAction<VirtAction>) {
    switch (action.type) {
      case "tick": {
        const events: SimEvent[] = [];
        const vcpus = state.vcpus.map((v) => ({
          ...v,
          load: Math.round(v.load + (v.target - v.load) * 0.5),
        }));
        const total = vcpus.reduce((a, v) => a + v.load, 0);
        if (total > state.hostCpuCapacity) {
          events.push({
            time: state.overcommitEvents + 1,
            kind: "overcommit",
            label: `vCPU demand ${total}% exceeds host capacity ${state.hostCpuCapacity}% — the hypervisor TIME-SLICES the physical cores; each guest slows down.`,
            severity: "warn",
          });
        }
        return {
          ...state,
          vcpus,
          overcommitEvents: state.overcommitEvents + (total > state.hostCpuCapacity ? 1 : 0),
          eventLog: [...state.eventLog.slice(-98), ...events],
        };
      }
      case "set-mode": {
        const mode = action.payload as VirtMode;
        return {
          ...state,
          error: null,
          mode,
          eventLog: [
            ...state.eventLog.slice(-98),
            {
              time: 0,
              kind: "config",
              label:
                mode === "vm"
                  ? "VM stack: every guest runs a FULL kernel on virtual hardware — strongest isolation, heaviest weight."
                  : "Container stack: processes share the HOST kernel, isolated by namespaces/cgroups — light, but a kernel bug is shared infrastructure.",
              severity: "info",
            },
          ],
        };
      }
      case "set-vcpu-load": {
        const { id, target } = action.payload as { id: string; target: number };
        if (!Number.isInteger(target) || target < 0 || target > 100) {
          return { ...state, error: "Load target must be 0–100." };
        }
        return {
          ...state,
          error: null,
          vcpus: state.vcpus.map((v) => (v.id === id ? { ...v, target } : v)),
        };
      }
      case "reset":
        return virtualizationEngine.initialState();
      default:
        return state;
    }
  },

  explain(state) {
    const total = state.vcpus.reduce((a, v) => a + v.load, 0);
    return `${state.mode === "vm" ? "VM" : "Container"} stack · vCPU demand ${total}/${state.hostCpuCapacity}%${total > state.hostCpuCapacity ? " — OVERCOMMIT, hypervisor time-slicing" : ""}.`;
  },
};

// ---------------------------------------------------------------------------
// multiprocessor list scheduling (LPT)
// ---------------------------------------------------------------------------

export interface MpTask {
  id: string;
  duration: number;
  start: number | null;
  end: number | null;
}

export interface MultiState {
  cpus: { id: string; task: string | null; remaining: number }[];
  tasks: MpTask[];
  clock: number;
  eventLog: SimEvent[];
  error: string | null;
  nextTaskId: number;
}

export type MultiAction = "add-task" | "tick" | "run-to-end" | "reset";

export const multiprocEngine: SimulationEngine<MultiState, MultiAction> = {
  id: "multiproc",
  // The schedule ends when every added task has finished and both CPUs idle.
  done(state) {
    return (
      state.tasks.length > 0 &&
      state.tasks.every((t) => t.end !== null) &&
      state.cpus.every((c) => c.task === null)
    );
  },

  initialState() {
    return {
      cpus: [
        { id: "CPU0", task: null, remaining: 0 },
        { id: "CPU1", task: null, remaining: 0 },
      ],
      tasks: [],
      clock: 0,
      eventLog: [{ time: 0, kind: "info", label: "2 CPUs idle. Add tasks — longest ones are placed first (LPT).", severity: "info" }],
      error: null,
      nextTaskId: 1,
    };
  },

  step(state, action: SimAction<MultiAction>) {
    switch (action.type) {
      case "add-task": {
        const duration = action.payload as number;
        if (!Number.isInteger(duration) || duration < 1 || duration > 8) {
          return { ...state, error: "Duration must be 1–8." };
        }
        const task: MpTask = { id: `T${state.nextTaskId}`, duration, start: null, end: null };
        return {
          ...state,
          error: null,
          tasks: [...state.tasks, task],
          nextTaskId: state.nextTaskId + 1,
          eventLog: [...state.eventLog.slice(-98), { time: state.clock, kind: "add", label: `Task ${task.id} (${duration}) queued.`, severity: "info" }],
        };
      }
      case "tick": {
        let { tasks, cpus, clock } = state;
        const events: SimEvent[] = [];
        // free finished
        cpus = cpus.map((c) => {
          if (c.task && c.remaining <= 0) {
            events.push({ time: clock, kind: "done", label: `${c.task} finished on ${c.id} at t=${clock}.`, severity: "ok" });
            return { ...c, task: null, remaining: 0 };
          }
          return c;
        });
        tasks = tasks.map((t) => (t.end !== null || t.start === null ? t : t));
        // assign waiting tasks to free CPUs — LPT order
        const waiting = tasks
          .filter((t) => t.start === null)
          .sort((a, b) => b.duration - a.duration);
        const taskById = new Map(tasks.map((t) => [t.id, t]));
        for (const c of cpus) {
          if (c.task === null && waiting.length > 0) {
            const next = waiting.shift()!;
            c.task = next.id;
            c.remaining = next.duration;
            const t = taskById.get(next.id)!;
            t.start = clock;
            events.push({ time: clock, kind: "assign", label: `${next.id} assigned to ${c.id} (LPT picks the longest waiting job).`, severity: "info" });
          }
        }
        // run 1 tick
        for (const c of cpus) {
          if (c.task) {
            c.remaining -= 1;
            const t = taskById.get(c.task)!;
            if (t.end === null && c.remaining === 0) t.end = clock + 1;
          }
        }
        clock += 1;
        return {
          ...state,
          cpus,
          tasks: [...taskById.values()],
          clock,
          eventLog: [...state.eventLog.slice(-98), ...events],
        };
      }
      case "run-to-end": {
        let s = state;
        for (let i = 0; i < 100; i += 1) {
          if (s.tasks.every((t) => t.end !== null)) break;
          s = multiprocEngine.step(s, { type: "tick" });
        }
        return s;
      }
      case "reset":
        return multiprocEngine.initialState();
      default:
        return state;
    }
  },

  explain(state) {
    const done = state.tasks.filter((t) => t.end !== null).length;
    return `${state.cpus.length} CPUs · ${done}/${state.tasks.length} tasks complete at t=${state.clock}.`;
  },
};

// ---------------------------------------------------------------------------
// real-time EDF over one hyperperiod
// ---------------------------------------------------------------------------

export interface RtTask {
  name: string;
  period: number;
  wcet: number;
}

export interface RtScheduleEntry {
  tick: number;
  running: string | null;
  released: string[];
  missed: string[];
}

export interface RtState {
  tasks: RtTask[];
  schedule: RtScheduleEntry[];
  utilization: number;
  eventLog: SimEvent[];
  error: string | null;
}

export function lcm(a: number, b: number): number {
  const gcd = (x: number, y: number): number => (y === 0 ? x : gcd(y, x % y));
  return (a * b) / gcd(a, b);
}

/** Pure: simulate EDF for the hyperperiod; deadline == period. */
export function simulateEdf(tasks: RtTask[]): { schedule: RtScheduleEntry[]; missed: string[] } {
  if (tasks.length === 0) return { schedule: [], missed: [] };
  const hyper = tasks.map((t) => t.period).reduce((a, b) => lcm(a, b));
  const horizon = Math.min(hyper, 48);
  const jobs: { name: string; deadline: number; remaining: number }[] = [];
  const missed: string[] = [];
  const schedule: RtScheduleEntry[] = [];
  for (let t = 0; t < horizon; t += 1) {
    const released: string[] = [];
    for (const task of tasks) {
      if (t % task.period === 0) {
        released.push(task.name);
        jobs.push({ name: task.name, deadline: t + task.period, remaining: task.wcet });
      }
    }
    // missed deadlines: jobs whose deadline ≤ t and still have remaining work
    for (const j of [...jobs]) {
      if (j.remaining > 0 && j.deadline <= t && !missed.includes(`${j.name}@${j.deadline - (j.name ? 0 : 0)}`)) {
        missed.push(`${j.name}@d${j.deadline}`);
        // avoid duplicate reporting
        j.remaining = -1_000; // mark reported
      }
    }
    const ready = jobs.filter((j) => j.remaining > 0);
    ready.sort((a, b) => a.deadline - b.deadline);
    const running = ready[0]?.name ?? null;
    if (running !== undefined && ready[0]) ready[0].remaining -= 1;
    schedule.push({ tick: t, running, released, missed: [...missed] });
  }
  return { schedule, missed: [...new Set(missed)] };
}

export type RtAction = "add-task" | "remove-task" | "reset";

export const rtEngine: SimulationEngine<RtState, RtAction> = {
  id: "rt",
  // Demo: add a task that pushes utilization over 1.0 and watch EDF start
  // missing deadlines.
  script: [{ type: "add-task", payload: { name: "video", period: 6, wcet: 2 } }],

  done(state) {
    return state.utilization > 1;
  },

  initialState() {
    const tasks: RtTask[] = [
      { name: "sensor", period: 5, wcet: 2 },
      { name: "control", period: 7, wcet: 3 },
    ];
    const { schedule } = simulateEdf(tasks);
    return {
      tasks,
      schedule,
      utilization: tasks.reduce((a, t) => a + t.wcet / t.period, 0),
      eventLog: [
        { time: 0, kind: "info", label: "Feasible set: sensor(5,2) + control(7,3) — utilization ≈ 0.83 < 1, EDF meets all deadlines.", severity: "info" },
      ],
      error: null,
    };
  },

  step(state, action: SimAction<RtAction>) {
    switch (action.type) {
      case "add-task": {
        const { name, period, wcet } = action.payload as { name: string; period: number; wcet: number };
        if (!name?.trim()) return { ...state, error: "Task needs a name." };
        if (!Number.isInteger(period) || period < 2 || period > 24) return { ...state, error: "Period must be 2–24." };
        if (!Number.isInteger(wcet) || wcet < 1 || wcet > period) return { ...state, error: "WCET must be 1..period." };
        const tasks = [...state.tasks, { name: name.trim(), period, wcet }];
        const { schedule, missed } = simulateEdf(tasks);
        const utilization = tasks.reduce((a, t) => a + t.wcet / t.period, 0);
        return {
          ...state,
          error: null,
          tasks,
          schedule,
          utilization,
          eventLog: [
            ...state.eventLog.slice(-98),
            {
              time: 0,
              kind: missed.length > 0 ? "miss" : "ok",
              label:
                missed.length > 0
                  ? `Added ${name}(${period},${wcet}) — utilization ${Math.round(utilization * 100)}%: ${missed.length} deadline MISS(ES) in the hyperperiod. The set is infeasible.`
                  : `Added ${name}(${period},${wcet}) — utilization ${Math.round(utilization * 100)}%, all deadlines still met.`,
              severity: missed.length > 0 ? "bad" : "ok",
            },
          ],
        };
      }
      case "remove-task": {
        const idx = state.tasks.length > 0 ? state.tasks.length - 1 : -1;
        if (idx <= 1) return rtEngine.initialState();
        const tasks = state.tasks.slice(0, idx);
        const { schedule, missed } = simulateEdf(tasks);
        return {
          ...state,
          tasks,
          schedule,
          utilization: tasks.reduce((a, t) => a + t.wcet / t.period, 0),
          eventLog: [...state.eventLog.slice(-98), { time: 0, kind: "config", label: `Removed the last task; ${missed.length} deadline miss(es) remain.`, severity: "info" }],
        };
      }
      case "reset":
        return rtEngine.initialState();
      default:
        return state;
    }
  },

  explain(state) {
    const missed = state.schedule.reduce((acc, s) => acc + s.missed.length, 0);
    return `EDF over the hyperperiod: utilization ${Math.round(state.utilization * 100)}% · ${missed === 0 ? "all deadlines met" : `${missed} deadline miss(es)`}.`;
  },
};
