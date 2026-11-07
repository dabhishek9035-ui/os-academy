import { describe, expect, it } from "vitest";
import {
  processesEngine,
  type ProcessAction,
  type ProcessState,
} from "@/modules/processes/engine";

/**
 * Hand-computed, deterministic tests for the process-table engine.
 *
 * Timing convention (documented in the engine): a tick advances the clock
 * first, then wakes waiters, then dispatches if the CPU is free, then runs one
 * unit of CPU work, then checks quantum preemption. A process dispatched at
 * tick N therefore makes progress during tick N itself.
 */

function run(state: ProcessState, type: ProcessAction, payload?: unknown): ProcessState {
  return processesEngine.step(state, { type, payload });
}

function proc(state: ProcessState, pid: number) {
  const p = state.processes.find((x) => x.pid === pid);
  expect(p).toBeDefined();
  return p as NonNullable<ReturnType<typeof state.processes.find>>;
}

describe("create + tick (natural exit becomes a zombie)", () => {
  it("progresses a created process and zombifies it at burst end", () => {
    let s = processesEngine.initialState();
    // Block init so it stays alive but never runs: the created process's
    // "parent init" remains alive and has not waited (test precondition).
    s = run(s, "block", { pid: 1, reason: "paused" });
    expect(proc(s, 1).state).toBe("blocked");

    s = run(s, "create", { name: "worker", burst: 3 });
    expect(proc(s, 2).ppid).toBeNull(); // created roots are parentless
    expect(proc(s, 2).state).toBe("ready");
    expect(s.readyQueue).toEqual([2]);

    s = run(s, "tick");
    expect(proc(s, 2).progress).toBe(1); // progresses one unit per tick
    s = run(s, "tick");
    s = run(s, "tick"); // progress reaches burst 3 during tick 3 (clock 3)

    const p2 = proc(s, 2);
    expect(p2.state).toBe("zombie"); // parent init alive and hasn't waited
    expect(p2.exitCode).toBe(0);
    expect(p2.terminationTime).toBe(3);
    expect(s.clock).toBe(3);
    expect(s.runningPid).toBeNull();
    // P2 was dispatched from an idle CPU and exited to an idle CPU: no
    // live→live handoff ever happened, so no context switch is counted.
    expect(s.contextSwitches).toBe(0);
    expect(s.eventLog.some((e) => e.kind === "process-exit")).toBe(true);
    expect(proc(s, 1).state).toBe("blocked"); // init still alive
  });
});

describe("fork", () => {
  it("records ppid, updates the parent's children and keeps FIFO order", () => {
    let s = processesEngine.initialState();
    s = run(s, "fork", 1);
    const child = proc(s, 2);
    expect(child.ppid).toBe(1);
    expect(child.burst).toBe(4); // fresh parent: remaining burst == full burst
    expect(child.state).toBe("ready");
    expect(proc(s, 1).children).toEqual([2]);
    expect(s.readyQueue).toEqual([1, 2]); // init first, child second (FIFO)
    expect(s.nextPid).toBe(3);
    expect(s.eventLog.some((e) => e.kind === "fork")).toBe(true);

    // After init has run one unit, fork copies the REMAINING burst (4 − 1 = 3).
    s = run(s, "tick");
    expect(proc(s, 1).progress).toBe(1);
    s = run(s, "fork", 1);
    expect(proc(s, 3).burst).toBe(3);
    expect(proc(s, 1).children).toEqual([2, 3]);
    expect(s.readyQueue).toEqual([2, 3]);
  });
});

describe("wait blocks until children finish, then wakes and reaps", () => {
  it("blocks the caller on a live child and reaps the zombie on a later tick", () => {
    let s = processesEngine.initialState();
    s = run(s, "fork", 1); // P2, burst 4
    s = run(s, "wait", 1); // init waits on its live child
    expect(proc(s, 1).state).toBe("blocked");
    expect(proc(s, 1).blockedReason).toBe("wait-for-child:2");
    expect(s.eventLog.some((e) => e.kind === "wait")).toBe(true);
    expect(s.readyQueue).toEqual([2]); // init removed from the queue

    // Ticks 1–4: P2 runs to completion (init is blocked, so P2 is dispatched).
    for (let i = 0; i < 4; i += 1) s = run(s, "tick");
    const p2 = proc(s, 2);
    expect(p2.state).toBe("zombie"); // parent alive (even though waiting)
    expect(p2.exitCode).toBe(0);
    expect(p2.terminationTime).toBe(4);
    expect(proc(s, 1).state).toBe("blocked"); // not yet woken this tick
    expect(s.clock).toBe(4);

    // One further tick: the parent returns to ready and the zombie is reaped
    // (documented behaviour: reaped processes are REMOVED from the table).
    s = run(s, "tick");
    expect(s.processes.some((p) => p.pid === 2)).toBe(false);
    const init = proc(s, 1);
    expect(["ready", "running"]).toContain(init.state); // dispatched again same tick
    expect(init.blockedReason).toBeUndefined();
    expect(s.eventLog.some((e) => e.kind === "reaped")).toBe(true);
    expect(s.eventLog.some((e) => e.kind === "waiter-woken")).toBe(true);
    // P2 dispatched from idle, init dispatched after P2 died: no live→live handoff.
    expect(s.contextSwitches).toBe(0);
  });
});

describe("wait with a zombie child reaps immediately", () => {
  it("reaps without any tick and leaves the caller runnable", () => {
    let s = processesEngine.initialState();
    s = run(s, "block", { pid: 1, reason: "paused" }); // keep init alive, off-CPU
    s = run(s, "fork", 1); // P2, burst 4
    for (let i = 0; i < 4; i += 1) s = run(s, "tick");
    const p2 = proc(s, 2);
    expect(p2.state).toBe("zombie"); // init alive but not waiting
    expect(p2.exitCode).toBe(0);
    expect(p2.terminationTime).toBe(4);

    s = run(s, "resume", 1); // init back to ready (no tick → never dispatched)
    expect(proc(s, 1).state).toBe("ready");

    s = run(s, "wait", 1); // zombie child present → immediate reap
    expect(s.processes.some((p) => p.pid === 2)).toBe(false);
    expect(proc(s, 1).state).toBe("ready"); // unchanged, no tick needed
    expect(s.eventLog.some((e) => e.kind === "reaped")).toBe(true);
  });
});

describe("kill re-parents orphans to init", () => {
  it("re-attaches descendants of a killed process to pid 1", () => {
    let s = processesEngine.initialState();
    s = run(s, "fork", 1); // P2 (child of init)
    s = run(s, "fork", 2); // P3 (grandchild, child of P2)
    expect(proc(s, 3).ppid).toBe(2);
    expect(proc(s, 2).children).toEqual([3]);

    s = run(s, "kill", 2);
    expect(proc(s, 2).state).toBe("zombie"); // parent init alive, not waiting
    expect(proc(s, 2).exitCode).toBe(-1); // killed: abnormal termination
    expect(s.clock).toBe(0); // kill does not advance time
    expect(s.readyQueue).toEqual([1, 3]); // P2 removed from the queue

    const p3 = proc(s, 3);
    expect(p3.ppid).toBe(1); // orphan re-parented to init
    expect(proc(s, 1).children).toEqual([2, 3]);
    expect(proc(s, 2).children).toEqual([]); // moved out of the dead parent
    expect(s.eventLog.some((e) => e.kind === "orphan-reparented")).toBe(true);
  });
});

describe("kill a running process", () => {
  it("schedules the next ready process", () => {
    let s = processesEngine.initialState();
    s = run(s, "block", { pid: 1, reason: "paused" });
    s = run(s, "create", { name: "A", burst: 5 }); // P2
    s = run(s, "create", { name: "B", burst: 5 }); // P3
    s = run(s, "tick");
    expect(s.runningPid).toBe(2);
    expect(proc(s, 2).progress).toBe(1);

    s = run(s, "kill", 2);
    const p2 = proc(s, 2);
    expect(p2.state).toBe("zombie"); // init alive (blocked "paused"), not waiting
    expect(p2.terminationTime).toBe(1);
    expect(s.runningPid).toBe(3); // next ready process scheduled immediately
    expect(proc(s, 3).state).toBe("running");
    expect(s.eventLog.some((e) => e.kind === "kill")).toBe(true);
    // Outgoing process was already dead at dispatch: no switch counted.
    expect(s.contextSwitches).toBe(0);
  });
});

describe("set-quantum validation", () => {
  it("rejects 0 with an error string and leaves the state untouched", () => {
    let s = processesEngine.initialState();
    const before = s;
    s = run(s, "set-quantum", 0);
    expect(typeof s.error).toBe("string");
    expect(s.error).toMatch(/quantum/i);
    expect(s.quantum).toBe(before.quantum); // unchanged
    expect(s.processes).toEqual(before.processes);
    expect(s.eventLog).toEqual(before.eventLog); // no events appended

    s = run(s, "set-quantum", 3); // a valid value recovers
    expect(s.error).toBeNull();
    expect(s.quantum).toBe(3);
  });
});

describe("round-robin with quantum 2", () => {
  it("runs one process for a quantum, then switches to the other", () => {
    let s = processesEngine.initialState();
    s = run(s, "block", { pid: 1, reason: "paused" });
    s = run(s, "create", { name: "A", burst: 5 }); // P2
    s = run(s, "create", { name: "B", burst: 5 }); // P3
    s = run(s, "set-quantum", 2);

    s = run(s, "tick"); // P2 dispatched, runs 1 unit (slice 1/2)
    expect(s.runningPid).toBe(2);
    expect(proc(s, 2).progress).toBe(1);

    s = run(s, "tick"); // P2 reaches slice 2 → preempted to the queue tail
    expect(s.runningPid).toBeNull();
    expect(proc(s, 2).state).toBe("ready");
    expect(s.readyQueue).toEqual([3, 2]);
    expect(proc(s, 2).progress).toBe(2);
    expect(s.contextSwitches).toBe(0); // switch is counted at the next dispatch

    s = run(s, "tick"); // P3 dispatched: live→live handoff counted
    expect(s.runningPid).toBe(3);
    expect(proc(s, 3).state).toBe("running");
    expect(proc(s, 3).progress).toBe(1);
    expect(s.contextSwitches).toBe(1);
  });
});

describe("exec", () => {
  it("replaces the name, keeps burst and logs the event", () => {
    let s = processesEngine.initialState();
    s = run(s, "fork", 1); // P2, burst 4
    s = run(s, "exec", { pid: 2, name: "sh" });
    expect(proc(s, 2).name).toBe("sh");
    expect(proc(s, 2).burst).toBe(4);
    expect(s.eventLog.some((e) => e.kind === "exec")).toBe(true);
    s = run(s, "exec", { pid: 2 }); // default image name
    expect(proc(s, 2).name).toBe("<new-image>");
  });
});

describe("wait / resume error paths", () => {
  it("reports 'no children to wait for' as an error event and resumes cleanly", () => {
    let s = processesEngine.initialState();
    s = run(s, "wait", 1); // init has no children yet
    expect(s.error).toMatch(/no children/i);
    expect(s.eventLog.some((e) => e.kind === "error" && /no children/.test(e.label))).toBe(true);

    s = run(s, "create", { burst: 2 }); // P2 is a ROOT (ppid null), not init's child
    s = run(s, "wait", 1);
    expect(s.error).toMatch(/no children/i);

    s = run(s, "block", { pid: 1, reason: "stall" });
    expect(proc(s, 1).blockedReason).toBe("stall");
    s = run(s, "resume", 1);
    expect(proc(s, 1).state).toBe("ready");
    expect(proc(s, 1).blockedReason).toBeUndefined();
    expect(s.readyQueue).toContain(1);
  });
});

describe("purity and explain", () => {
  it("never mutates the input state", () => {
    const s0 = processesEngine.initialState();
    const snapshot = JSON.parse(JSON.stringify(s0)) as ProcessState;
    processesEngine.step(s0, { type: "tick" });
    processesEngine.step(s0, { type: "fork", payload: 1 });
    processesEngine.step(s0, { type: "kill", payload: { pid: 2 } });
    expect(JSON.parse(JSON.stringify(s0))).toEqual(snapshot);
  });

  it("explain mentions running pid, ready count and zombie count", () => {
    expect(processesEngine.explain(processesEngine.initialState())).toBe(
      "CPU idle; 1 ready, 0 zombies.",
    );
    let s = processesEngine.initialState();
    s = run(s, "block", { pid: 1, reason: "paused" });
    s = run(s, "create", { burst: 1 });
    s = run(s, "tick"); // P2 runs 1/1 and exits → unreapable root zombie
    expect(processesEngine.explain(s)).toBe("CPU idle; 0 ready, 1 zombie awaiting wait().");
  });
});
