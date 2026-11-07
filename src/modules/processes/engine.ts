import type { EventSeverity, SimAction, SimEvent, SimulationEngine } from "@/types";

/**
 * Process table & fork/wait laboratory engine.
 *
 * A deterministic single-CPU toy system: a process table, a FIFO ready queue,
 * and explicit syscall-like actions (fork/exec/wait/kill/block/resume).
 *
 * Model (documented simplifications):
 *  - Single CPU, integer time units. "tick" is one time unit; fork/exec/wait/
 *    kill/block/resume are educational abstractions, not real syscalls, and do
 *    not advance the clock.
 *  - fork copies the parent's REMAINING burst (burst − progress) into the
 *    child instead of a full address space; the child starts at progress 0.
 *  - exec replaces only the process name (the "address space swap" is
 *    implied); pid, burst and progress are kept so the simulation stays
 *    observable.
 *  - Natural exit (progress reaches burst) sets exitCode 0 and produces a
 *    ZOMBIE when the parent is alive — even if that parent is currently
 *    blocked in wait(); the zombie stays visible for one tick so students see
 *    it before it is reaped. Parentless processes (created via "create", which
 *    makes root processes with ppid null) also become zombies — but nobody can
 *    ever reap them, a deliberate teaching moment about why init should own
 *    orphans. A process exits "terminated" directly only when its parent
 *    exists but is already dead.
 *  - kill() uses the same zombie rule, except a child whose parent is blocked
 *    in wait() is "terminated" immediately (the parent's wait will simply find
 *    no zombie left to reap). Killed processes get exitCode −1 (abnormal).
 *  - kill() runs a global orphan sweep: every process whose parent is dead or
 *    missing is re-attached to pid 1 (init) — even if init itself is dead;
 *    pid 1 is used unconditionally, per Unix tradition.
 *  - Reaped processes are REMOVED from the table entirely. The "terminated"
 *    state is only ever observed on processes whose parent was already dead at
 *    exit time or that were killed with nobody able to wait for them.
 *  - Auto-unblock rule (kept deliberately simple): on the tick AFTER a
 *    wait()-blocked parent's children are all gone/zombie/terminated, the
 *    parent moves back to ready and reaps one zombie child if any is left.
 *    wait() therefore blocks until ALL children are done (not just one).
 *  - Blocked processes never auto-resume: only "resume" or the wait-wake rule
 *    above can unblock them.
 *  - Context switches are instantaneous and counted only when the CPU passes
 *    between two LIVE processes (quantum preemption or a voluntary block).
 *    Dispatching after an exit/kill does not count: the outgoing process is
 *    already dead.
 *  - Quantum preemption is checked at the end of each tick; a process left
 *    alone on the CPU (empty ready queue) simply keeps a fresh quantum budget.
 *  - The "new" state exists in the type union for completeness but the engine
 *    admits processes directly as "ready".
 *
 * Extra bookkeeping fields beyond the core table (sliceUsed, lastRunnerPid)
 * support quantum preemption and live→live context-switch counting.
 */

export type ProcessStatus =
  | "new"
  | "ready"
  | "running"
  | "blocked"
  | "zombie"
  | "terminated";

export interface SimProcess {
  pid: number;
  ppid: number | null;
  name: string;
  state: ProcessStatus;
  burst: number;
  progress: number;
  blockedReason?: string;
  exitCode?: number;
  creationTime: number;
  terminationTime?: number;
  children: number[];
}

export interface ProcessState {
  processes: SimProcess[];
  /** Pids in FIFO order. Stale (non-ready) entries are pruned at dispatch. */
  readyQueue: number[];
  runningPid: number | null;
  clock: number;
  contextSwitches: number;
  nextPid: number;
  quantum: number;
  /** Time units the current runner has spent inside its quantum slice. */
  sliceUsed: number;
  /** Last process that held the CPU — used to count live→live switches. */
  lastRunnerPid: number | null;
  eventLog: SimEvent[];
  error: string | null;
}

export type ProcessAction =
  | "tick"
  | "create"
  | "fork"
  | "exec"
  | "wait"
  | "kill"
  | "block"
  | "resume"
  | "set-quantum"
  | "reset";

export interface CreatePayload {
  name?: string;
  burst?: number;
}

export interface ExecPayload {
  pid: number;
  name?: string;
}

export interface BlockPayload {
  pid: number;
  reason?: string;
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

const EVENT_LOG_CAP = 99;
const DEFAULT_BURST = 4;
const INIT_PID = 1;
const WAIT_REASON_PREFIX = "wait-for-child:";

const LIVE_STATES: ProcessStatus[] = ["new", "ready", "running", "blocked"];

function findProc(state: ProcessState, pid: number): SimProcess | undefined {
  return state.processes.find((p) => p.pid === pid);
}

function isLive(p: SimProcess | undefined): boolean {
  return p !== undefined && LIVE_STATES.includes(p.state);
}

function cloneState(state: ProcessState): ProcessState {
  return {
    ...state,
    processes: state.processes.map((p) => ({ ...p, children: [...p.children] })),
    readyQueue: [...state.readyQueue],
    eventLog: [...state.eventLog],
  };
}

function logEvent(
  state: ProcessState,
  kind: string,
  label: string,
  extra: { detail?: string; severity?: EventSeverity } = {},
): void {
  state.eventLog.push({ time: state.clock, kind, label, ...extra });
}

/** Successful transition: clear any error and cap the log. */
function finalize(state: ProcessState): ProcessState {
  return { ...state, error: null, eventLog: state.eventLog.slice(-EVENT_LOG_CAP) };
}

/** Failed transition: set the error string, optionally log an error event. */
function fail(state: ProcessState, message: string, withEvent: boolean): ProcessState {
  const next: ProcessState = { ...state, error: message };
  if (withEvent) {
    next.eventLog.push({ time: state.clock, kind: "error", label: message, severity: "bad" });
  }
  return { ...next, eventLog: next.eventLog.slice(-EVENT_LOG_CAP) };
}

function readPid(payload: unknown): number | null {
  if (typeof payload === "number" && Number.isInteger(payload)) return payload;
  if (typeof payload === "object" && payload !== null && "pid" in payload) {
    const pid = (payload as { pid: unknown }).pid;
    if (typeof pid === "number" && Number.isInteger(pid)) return pid;
  }
  return null;
}

function readString(payload: unknown, key: string): string | undefined {
  if (typeof payload === "object" && payload !== null && key in payload) {
    const value = (payload as Record<string, unknown>)[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

function isWaitingOn(p: SimProcess, childPid: number): boolean {
  return p.state === "blocked" && p.blockedReason === `${WAIT_REASON_PREFIX}${childPid}`;
}

/** Removes a zombie from the table and logs the reap. */
function reapZombie(state: ProcessState, zombiePid: number, reaper: SimProcess): void {
  const zombie = findProc(state, zombiePid);
  if (!zombie) return;
  state.processes = state.processes.filter((p) => p.pid !== zombiePid);
  logEvent(
    state,
    "reaped",
    `P${reaper.pid} (${reaper.name}) reaped zombie P${zombiePid} (${zombie.name}, exit code ${zombie.exitCode ?? 0})`,
    { severity: "ok" },
  );
}

/**
 * Dispatches the head-of-queue ready process if the CPU is free.
 * Prunes stale (non-ready) queue entries; counts a context switch when the
 * previous CPU holder is still a live process.
 */
function dispatchIfFree(state: ProcessState): void {
  if (state.runningPid !== null) return;
  state.readyQueue = state.readyQueue.filter((pid) => findProc(state, pid)?.state === "ready");
  const pid = state.readyQueue.shift();
  if (pid === undefined) return;
  const proc = findProc(state, pid);
  if (!proc) return;
  if (
    state.lastRunnerPid !== null &&
    state.lastRunnerPid !== pid &&
    isLive(findProc(state, state.lastRunnerPid))
  ) {
    state.contextSwitches += 1;
  }
  proc.state = "running";
  state.runningPid = pid;
  state.sliceUsed = 0;
  state.lastRunnerPid = pid;
  logEvent(state, "dispatch", `P${pid} (${proc.name}) dispatched — quantum budget ${state.quantum}`);
}

/** Natural termination of the running process (progress reached burst). */
function finishNaturally(state: ProcessState, proc: SimProcess): void {
  const parent = proc.ppid !== null ? findProc(state, proc.ppid) : undefined;
  // Parentless roots also zombify: nobody can ever reap them (see header).
  const zombify = proc.ppid === null || isLive(parent);
  proc.exitCode = 0;
  proc.terminationTime = state.clock;
  proc.state = zombify ? "zombie" : "terminated";
  state.runningPid = null;
  logEvent(
    state,
    "process-exit",
    `P${proc.pid} (${proc.name}) finished its burst of ${proc.burst} with exit code 0${zombify ? " — zombie awaiting wait()" : ""}`,
    { severity: "ok" },
  );
}

/**
 * Auto-unblock rule: a wait()-blocked parent whose children are all done
 * (gone/zombie/terminated) returns to ready and reaps one zombie child.
 * Called once per tick, before dispatch — i.e. on the tick AFTER the last
 * child finished.
 */
function wakeWaiters(state: ProcessState): void {
  for (const proc of [...state.processes].sort((a, b) => a.pid - b.pid)) {
    if (proc.state !== "blocked" || !proc.blockedReason?.startsWith(WAIT_REASON_PREFIX)) continue;
    if (proc.children.length === 0) continue;
    const allDone = proc.children.every((cid) => {
      const child = findProc(state, cid);
      return child === undefined || child.state === "zombie" || child.state === "terminated";
    });
    if (!allDone) continue;
    const zombiePid = proc.children.find((cid) => findProc(state, cid)?.state === "zombie");
    if (zombiePid !== undefined) reapZombie(state, zombiePid, proc);
    proc.state = "ready";
    proc.blockedReason = undefined;
    state.readyQueue.push(proc.pid);
    logEvent(
      state,
      "waiter-woken",
      `P${proc.pid} (${proc.name}) finished waiting — woken back to ready`,
      { severity: "ok" },
    );
  }
}

/**
 * Orphan sweep (runs during kill): every process whose parent is dead or
 * missing is re-parented to pid 1 (init), unconditionally. Re-parenting never
 * changes liveness, so a single pass in pid order reaches a fixpoint.
 */
function reparentOrphans(state: ProcessState): void {
  for (const proc of [...state.processes].sort((a, b) => a.pid - b.pid)) {
    if (proc.pid === INIT_PID || proc.ppid === null) continue;
    const parent = findProc(state, proc.ppid);
    if (!parent || isLive(parent)) continue;
    parent.children = parent.children.filter((c) => c !== proc.pid);
    proc.ppid = INIT_PID;
    const init = findProc(state, INIT_PID);
    if (init && !init.children.includes(proc.pid)) init.children.push(proc.pid);
    logEvent(
      state,
      "orphan-reparented",
      `P${proc.pid} (${proc.name}) orphaned — re-parented to init (pid 1)`,
      { severity: "warn" },
    );
  }
}

function freshState(): ProcessState {
  const init: SimProcess = {
    pid: INIT_PID,
    ppid: null,
    name: "init",
    state: "ready",
    burst: DEFAULT_BURST,
    progress: 0,
    creationTime: 0,
    children: [],
  };
  return {
    processes: [init],
    readyQueue: [INIT_PID],
    runningPid: null,
    clock: 0,
    contextSwitches: 0,
    nextPid: INIT_PID + 1,
    quantum: 2,
    sliceUsed: 0,
    lastRunnerPid: null,
    eventLog: [
      { time: 0, kind: "boot", label: "System booted — init (pid 1) is ready", severity: "ok" },
    ],
    error: null,
  };
}

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

function step(state: ProcessState, action: SimAction<ProcessAction>): ProcessState {
  switch (action.type) {
    case "tick": {
      const d = cloneState(state);
      d.clock += 1;
      // 1. Auto-unblock: wake wait()-blocked parents whose children are done.
      wakeWaiters(d);
      // 2. Dispatch if the CPU is free (post-exit / post-kill / idle start).
      dispatchIfFree(d);
      // 3. CPU work: the running process makes one unit of progress.
      const runner = d.runningPid !== null ? findProc(d, d.runningPid) : undefined;
      if (runner && runner.state === "running") {
        runner.progress += 1;
        d.sliceUsed += 1;
        if (runner.progress >= runner.burst) finishNaturally(d, runner);
      } else {
        d.runningPid = null;
        d.sliceUsed = 0;
      }
      // 4. Quantum preemption: only if someone else is ready to run.
      if (d.runningPid !== null && d.sliceUsed >= d.quantum) {
        const othersReady = d.readyQueue.some((pid) => findProc(d, pid)?.state === "ready");
        if (othersReady) {
          const current = findProc(d, d.runningPid);
          if (current) {
            current.state = "ready";
            d.readyQueue.push(current.pid);
            logEvent(
              d,
              "quantum-expired",
              `P${current.pid} (${current.name}) used its quantum of ${d.quantum} — back to the ready queue`,
            );
          }
          d.runningPid = null;
        } else {
          d.sliceUsed = 0; // alone on the CPU: fresh quantum budget
        }
      }
      return finalize(d);
    }

    case "create": {
      const d = cloneState(state);
      const name = readString(action.payload, "name");
      const rawBurst =
        typeof action.payload === "object" && action.payload !== null && "burst" in action.payload
          ? (action.payload as { burst: unknown }).burst
          : undefined;
      const burst = rawBurst === undefined ? DEFAULT_BURST : rawBurst;
      if (typeof burst !== "number" || !Number.isInteger(burst) || burst < 1) {
        return fail(d, "create: burst must be a whole number ≥ 1.", false);
      }
      const pid = d.nextPid;
      d.nextPid += 1;
      d.processes.push({
        pid,
        ppid: null,
        name: name ?? `job${pid}`,
        state: "ready",
        burst,
        progress: 0,
        creationTime: d.clock,
        children: [],
      });
      d.readyQueue.push(pid);
      logEvent(d, "create", `P${pid} (${name ?? `job${pid}`}) created — root process, burst ${burst}`, {
        severity: "ok",
      });
      return finalize(d);
    }

    case "fork": {
      const pid = readPid(action.payload);
      const d = cloneState(state);
      const parent = pid !== null ? findProc(d, pid) : undefined;
      if (!parent || !isLive(parent)) return fail(d, `fork: P${pid ?? "?"} is not an alive process.`, false);
      const parentProc = parent;
      const remaining = parentProc.burst - parentProc.progress;
      const childBurst = remaining >= 1 ? remaining : parentProc.burst;
      const childPid = d.nextPid;
      d.nextPid += 1;
      d.processes.push({
        pid: childPid,
        ppid: parentProc.pid,
        name: `${parentProc.name}-child`,
        state: "ready",
        burst: childBurst,
        progress: 0,
        creationTime: d.clock,
        children: [],
      });
      parentProc.children.push(childPid);
      d.readyQueue.push(childPid);
      logEvent(
        d,
        "fork",
        `P${parentProc.pid} (${parentProc.name}) forked P${childPid} — copy of remaining burst (${childBurst})`,
        {
          detail:
            "Educational fork: the child inherits the parent's remaining CPU work, not a full address space.",
        },
      );
      return finalize(d);
    }

    case "exec": {
      const pid = readPid(action.payload);
      const d = cloneState(state);
      const proc = pid !== null ? findProc(d, pid) : undefined;
      if (!proc || !isLive(proc)) return fail(d, `exec: P${pid ?? "?"} is not an alive process.`, false);
      const target = proc;
      const oldName = target.name;
      target.name = readString(action.payload, "name") ?? "<new-image>";
      logEvent(d, "exec", `P${target.pid} executed "${target.name}" — replaced "${oldName}"`, {
        detail: "Educational exec: the address space is replaced; pid, burst and progress are kept.",
      });
      return finalize(d);
    }

    case "wait": {
      const pid = readPid(action.payload);
      const d = cloneState(state);
      const caller = pid !== null ? findProc(d, pid) : undefined;
      if (!caller || !isLive(caller)) return fail(d, `wait: P${pid ?? "?"} is not an alive process.`, false);
      const waiter = caller;
      const zombieChild = waiter.children.find((cid) => findProc(d, cid)?.state === "zombie");
      if (zombieChild !== undefined) {
        // Zombie child: reap immediately, caller keeps its current state.
        reapZombie(d, zombieChild, waiter);
        return finalize(d);
      }
      const liveChild = waiter.children.find((cid) => isLive(findProc(d, cid)));
      if (liveChild === undefined) {
        return fail(d, `P${waiter.pid} has no children to wait for.`, true);
      }
      waiter.state = "blocked";
      waiter.blockedReason = `${WAIT_REASON_PREFIX}${liveChild}`;
      d.readyQueue = d.readyQueue.filter((x) => x !== waiter.pid);
      logEvent(d, "wait", `P${waiter.pid} (${waiter.name}) waits for child P${liveChild} — blocked`, {
        detail: "wait() blocks until ALL children have exited (documented simplification).",
      });
      if (d.runningPid === waiter.pid) {
        d.runningPid = null;
        dispatchIfFree(d);
      }
      return finalize(d);
    }

    case "kill": {
      const pid = readPid(action.payload);
      const d = cloneState(state);
      const victim = pid !== null ? findProc(d, pid) : undefined;
      if (!victim || !isLive(victim)) return fail(d, `kill: P${pid ?? "?"} is not an alive process.`, false);
      const target = victim;
      const wasRunning = d.runningPid === target.pid;
      const parent = target.ppid !== null ? findProc(d, target.ppid) : undefined;
      const parentWaiting =
        parent !== undefined && parent.state === "blocked" &&
        (parent.blockedReason ?? "").startsWith(WAIT_REASON_PREFIX);
      const zombify = target.ppid === null || (isLive(parent) && !parentWaiting);
      target.exitCode = -1; // abnormal termination (killed)
      target.terminationTime = d.clock;
      target.state = zombify ? "zombie" : "terminated";
      d.readyQueue = d.readyQueue.filter((x) => x !== target.pid);
      logEvent(
        d,
        "kill",
        `P${target.pid} (${target.name}) killed — ${zombify ? "zombie" : "terminated (nobody able to wait for it)"}`,
        { severity: "warn" },
      );
      if (wasRunning) d.runningPid = null;
      reparentOrphans(d);
      if (wasRunning) dispatchIfFree(d);
      return finalize(d);
    }

    case "block": {
      const pid = readPid(action.payload);
      const d = cloneState(state);
      const proc = pid !== null ? findProc(d, pid) : undefined;
      if (!proc || (proc.state !== "ready" && proc.state !== "running")) {
        return fail(d, `block: P${pid ?? "?"} is not ready or running.`, false);
      }
      const wasRunning = d.runningPid === proc.pid;
      proc.state = "blocked";
      proc.blockedReason = readString(action.payload, "reason") ?? "blocked";
      d.readyQueue = d.readyQueue.filter((x) => x !== proc.pid);
      logEvent(d, "block", `P${proc.pid} (${proc.name}) blocked — ${proc.blockedReason}`);
      if (wasRunning) {
        d.runningPid = null;
        dispatchIfFree(d);
      }
      return finalize(d);
    }

    case "resume": {
      const pid = readPid(action.payload);
      const d = cloneState(state);
      const proc = pid !== null ? findProc(d, pid) : undefined;
      if (!proc || proc.state !== "blocked") {
        return fail(d, `resume: P${pid ?? "?"} is not blocked.`, false);
      }
      proc.state = "ready";
      proc.blockedReason = undefined;
      d.readyQueue.push(proc.pid);
      logEvent(d, "resume", `P${proc.pid} (${proc.name}) resumed — back to the ready queue`);
      return finalize(d);
    }

    case "set-quantum": {
      const q = action.payload;
      if (typeof q !== "number" || !Number.isInteger(q) || q < 1) {
        // Invalid input: only the error string changes, nothing else.
        return { ...state, error: `Quantum must be a whole number ≥ 1 (got ${String(q)}).` };
      }
      const d = cloneState(state);
      d.quantum = q;
      logEvent(d, "config", `Quantum set to ${q}`, { severity: "ok" });
      return finalize(d);
    }

    case "reset":
      return freshState();

    default:
      return state;
  }
}

function explain(state: ProcessState): string {
  if (state.error) return state.error;
  const runner =
    state.runningPid !== null
      ? state.processes.find((p) => p.pid === state.runningPid)
      : undefined;
  const left = runner
    ? `P${runner.pid} running (${runner.progress}/${runner.burst})`
    : "CPU idle";
  const ready = state.processes.filter((p) => p.state === "ready").length;
  const zombies = state.processes.filter((p) => p.state === "zombie").length;
  const zombiePart = `${zombies} ${zombies === 1 ? "zombie" : "zombies"}${
    zombies > 0 ? " awaiting wait()" : ""
  }`;
  return `${left}; ${ready} ready, ${zombiePart}.`;
}

export const processesEngine: SimulationEngine<ProcessState, ProcessAction> = {
  id: "processes",
  initialState: freshState,
  step,
  explain,
};
