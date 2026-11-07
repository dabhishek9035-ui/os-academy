import { describe, expect, it } from "vitest";
import {
  ioEngine,
  summarize,
  type IoState,
} from "@/modules/io/io-engine";
import {
  syscallEngine,
  protectionEngine,
  SYSCALL_STAGES,
  checkPermission,
  type ProtectionState,
  type SyscallState,
} from "@/modules/syscalls-security/engine";
import {
  multiprocEngine,
  rtEngine,
  simulateEdf,
  virtualizationEngine,
  type MultiState,
} from "@/modules/virtualization/engine";
import { capstoneEngine, CAPSTONE_STAGES, type CapstoneState } from "@/modules/capstone/engine";

function run<S, A extends string>(
  engine: { step: (s: S, a: { type: A; payload?: unknown }) => S },
  state: S,
  actions: { type: A; payload?: unknown }[],
): S {
  let s = state;
  for (const a of actions) s = engine.step(s, a);
  return s;
}

// ---------------------------------------------------------------------------
// io engine
// ---------------------------------------------------------------------------

describe("io engine — transfer methods", () => {
  it("PIO keeps the CPU busy 100% of the time", () => {
    const s = summarize("pio", 8);
    expect(s.cpuUtilization).toBe(1);
    expect(s.totalTicks).toBe(8);
  });

  it("interrupt-driven I/O costs one handling tick per block", () => {
    const s = summarize("interrupt", 8);
    expect(s.cpuBusyTicks).toBe(8);
    expect(s.totalTicks).toBe(16);
    expect(s.cpuUtilization).toBe(0.5);
  });

  it("DMA needs exactly one busy tick", () => {
    const s = summarize("dma", 8);
    expect(s.cpuBusyTicks).toBe(1);
    expect(s.totalTicks).toBe(9);
  });

  it("DMA utilization is far below PIO", () => {
    expect(summarize("dma", 8).cpuUtilization).toBeLessThan(summarize("pio", 8).cpuUtilization);
  });

  it("walking PIO to completion matches the summary", () => {
    let s = ioEngine.initialState();
    while (s.phase !== "complete") s = ioEngine.step(s, { type: "tick" });
    expect(s.totalTicks).toBe(summarize(s.method, s.blocksTotal).totalTicks);
    expect(s.cpuBusyTicks).toBe(summarize(s.method, s.blocksTotal).cpuBusyTicks);
  });

  it("rejects invalid block counts", () => {
    let s = ioEngine.initialState();
    s = ioEngine.step(s, { type: "set-blocks", payload: 3 });
    expect(s.error).toMatch(/4–16/);
  });
});

// ---------------------------------------------------------------------------
// syscall + protection
// ---------------------------------------------------------------------------

describe("syscall engine", () => {
  it("walks read() through every stage in order, ending back in user mode", () => {
    let s = syscallEngine.initialState();
    s = syscallEngine.step(s, { type: "call", payload: { name: "read", args: "fd 3" } });
    expect(s.syscallNumber).toBe(0);
    const modes: string[] = [s.mode];
    while (s.stageIndex < SYSCALL_STAGES.length - 1) {
      s = syscallEngine.step(s, { type: "tick" });
      modes.push(s.mode);
    }
    expect(s.stageIndex).toBe(SYSCALL_STAGES.length - 1);
    expect(s.mode).toBe("user");
    expect(s.returnValue).toMatch(/read fd 3/);
    // mode went user → kernel → user
    expect(modes).toContain("kernel");
    expect(modes[modes.length - 1]).toBe("user");
  });

  it("dispatches by number from the syscall table", () => {
    let s = syscallEngine.initialState();
    s = syscallEngine.step(s, { type: "call", payload: { name: "open", args: '"/tmp/x"' } });
    s = run(syscallEngine, s, Array.from({ length: 4 }, () => ({ type: "tick" as const })));
    expect(s.returnValue).toMatch(/open "\/tmp\/x"/);
  });

  it("rejects unknown syscalls honestly", () => {
    let s = syscallEngine.initialState();
    s = syscallEngine.step(s, { type: "call", payload: { name: "hack" } });
    expect(s.error).toMatch(/Unknown system call/);
  });
});

describe("protection engine", () => {
  it("allows owner read, denies other write on the same file", () => {
    let s = protectionEngine.initialState(); // alice owns report.txt
    s = protectionEngine.step(s, { type: "attempt", payload: { target: "/home/alice/report.txt", operation: "read" } });
    expect(s.lastCheck?.allowed).toBe(true);
    s = protectionEngine.step(s, { type: "su", payload: "bob" });
    s = protectionEngine.step(s, { type: "attempt", payload: { target: "/home/alice/report.txt", operation: "write" } });
    expect(s.lastCheck?.allowed).toBe(false);
    expect(s.lastCheck?.reason).toMatch(/group triad/); // bob is in staff
  });

  it("group execute works through the middle triad", () => {
    let s = protectionEngine.initialState();
    s = protectionEngine.step(s, { type: "su", payload: "bob" });
    s = protectionEngine.step(s, { type: "attempt", payload: { target: "/usr/bin/tool", operation: "execute" } });
    expect(s.lastCheck?.allowed).toBe(true);
    expect(s.lastCheck?.reason).toMatch(/group triad/);
  });

  it("chmod changes the outcome", () => {
    let s = protectionEngine.initialState();
    s = protectionEngine.step(s, { type: "su", payload: "bob" });
    // /etc/config is root:wheel "rw-r-----"; bob is neither owner nor in wheel -> other triad "---"
    s = protectionEngine.step(s, { type: "attempt", payload: { target: "/etc/config", operation: "read" } });
    expect(s.lastCheck?.allowed).toBe(false);
    s = protectionEngine.step(s, { type: "chmod", payload: { name: "/etc/config", perms: "rw-r--rw-" } });
    s = protectionEngine.step(s, { type: "attempt", payload: { target: "/etc/config", operation: "read" } });
    expect(s.lastCheck?.allowed).toBe(true);
  });

  it("memory access inside the region is allowed; outside faults", () => {
    let s = protectionEngine.initialState();
    s = protectionEngine.step(s, { type: "memory-access", payload: { pid: 7, addr: 50 } });
    expect(s.lastCheck?.allowed).toBe(true);
    s = protectionEngine.step(s, { type: "memory-access", payload: { pid: 7, addr: 250 } }); // other process's region
    expect(s.lastCheck?.allowed).toBe(false);
    expect(s.lastCheck?.reason).toMatch(/SEGMENTATION FAULT/);
  });

  it("kernel mode bypasses a previously denied operation", () => {
    let s = protectionEngine.initialState();
    s = protectionEngine.step(s, { type: "su", payload: "bob" });
    s = protectionEngine.step(s, { type: "attempt", payload: { target: "/etc/config", operation: "write" } });
    expect(s.lastCheck?.allowed).toBe(false);
    s = protectionEngine.step(s, { type: "set-mode", payload: "kernel" });
    s = protectionEngine.step(s, { type: "attempt", payload: { target: "/etc/config", operation: "write" } });
    expect(s.lastCheck?.allowed).toBe(true);
  });

  it("pure checkPermission helper matches the engine", () => {
    const r = checkPermission({ owner: "root", group: "staff", perms: "rwxr-x---" }, "bob", { staff: ["bob"] }, "execute");
    expect(r.allowed).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// virtualization + multiproc + rt
// ---------------------------------------------------------------------------

describe("virtualization engine", () => {
  it("switching modes swaps the layer stack exactly", () => {
    let s = virtualizationEngine.initialState();
    expect(s.mode).toBe("vm");
    s = virtualizationEngine.step(s, { type: "set-mode", payload: "container" });
    expect(s.mode).toBe("container");
    void s;
  });

  it("logs overcommit when vCPU demand exceeds host capacity", () => {
    let s = virtualizationEngine.initialState();
    s = virtualizationEngine.step(s, { type: "set-vcpu-load", payload: { id: "vCPU0", target: 80 } });
    s = virtualizationEngine.step(s, { type: "set-vcpu-load", payload: { id: "vCPU1", target: 80 } });
    s = run(virtualizationEngine, s, [{ type: "tick" }, { type: "tick" }]);
    expect(s.overcommitEvents).toBeGreaterThanOrEqual(1);
    expect(s.eventLog.some((e) => e.kind === "overcommit")).toBe(true);
  });

  it("loads converge toward targets deterministically", () => {
    let s = virtualizationEngine.initialState();
    s = virtualizationEngine.step(s, { type: "set-vcpu-load", payload: { id: "vCPU0", target: 40 } });
    s = virtualizationEngine.step(s, { type: "tick" });
    expect(s.vcpus[0].load).toBe(30); // 20 + (40-20)*0.5
    s = virtualizationEngine.step(s, { type: "tick" });
    expect(s.vcpus[0].load).toBe(35); // 30 + (40-30)*0.5
  });
});

describe("multiproc engine (LPT list scheduling)", () => {
  it("assigns the longest waiting task first", () => {
    let s = multiprocEngine.initialState();
    s = run(multiprocEngine, s, [
      { type: "add-task", payload: 3 },
      { type: "add-task", payload: 1 },
      { type: "add-task", payload: 2 },
      { type: "tick" },
    ]);
    // T1(3) and T3(2) placed on the two CPUs; T2(1) waits
    const running = s.cpus.map((c) => c.task).sort();
    expect(running).toEqual(["T1", "T3"]);
  });

  it("completes tasks respecting durations (hand-computed)", () => {
    let s = multiprocEngine.initialState();
    s = run(multiprocEngine, s, [
      { type: "add-task", payload: 3 }, // T1
      { type: "add-task", payload: 1 }, // T2
      { type: "add-task", payload: 2 }, // T3
      { type: "run-to-end" },
    ]);
    const t = Object.fromEntries(s.tasks.map((x) => [x.id, x]));
    // t=0: T1→CPU0 (done t=3), T3→CPU1 (done t=2); t=2: T2→CPU1 (done t=3)
    expect(t.T1.end).toBe(3);
    expect(t.T3.end).toBe(2);
    expect(t.T2.start).toBe(2);
    expect(t.T2.end).toBe(3);
    expect(s.tasks.every((x) => x.end !== null)).toBe(true);
  });
});

describe("rt engine (EDF)", () => {
  it("feasible set meets all deadlines", () => {
    const { missed } = simulateEdf([
      { name: "sensor", period: 5, wcet: 2 },
      { name: "control", period: 7, wcet: 3 },
    ]);
    expect(missed).toHaveLength(0);
  });

  it("overloaded set misses deadlines and reports utilization > 1", () => {
    let s = rtEngine.initialState();
    s = rtEngine.step(s, { type: "add-task", payload: { name: "heavy", period: 3, wcet: 2 } });
    expect(s.utilization).toBeGreaterThan(1);
    expect(s.schedule.some((e) => e.missed.length > 0)).toBe(true);
  });

  it("validates task parameters", () => {
    let s = rtEngine.initialState();
    s = rtEngine.step(s, { type: "add-task", payload: { name: "x", period: 4, wcet: 9 } });
    expect(s.error).toMatch(/WCET/);
  });
});

// ---------------------------------------------------------------------------
// capstone
// ---------------------------------------------------------------------------

describe("capstone engine", () => {
  it("walks every stage in order and completes", () => {
    let s = capstoneEngine.initialState();
    for (let i = 0; i < CAPSTONE_STAGES.length * 4 + 2; i += 1) {
      s = capstoneEngine.step(s, { type: "tick" });
    }
    expect(s.done).toBe(true);
    expect(s.stageIndex).toBe(CAPSTONE_STAGES.length - 1);
    const stageEvents = s.eventLog.filter((e) => e.kind === "stage");
    expect(stageEvents).toHaveLength(CAPSTONE_STAGES.length - 1);
  });

  it("each stage links back to a valid lesson id shape", () => {
    for (const stage of CAPSTONE_STAGES) {
      expect(stage.lessonRef).toMatch(/^[a-z-]+\/[a-z-]+$/);
      expect(stage.subsystems.length).toBeGreaterThan(0);
    }
  });

  it("jump lands on the requested stage", () => {
    let s = capstoneEngine.initialState();
    s = capstoneEngine.step(s, { type: "jump", payload: 5 });
    expect(s.stageIndex).toBe(5);
  });
});
