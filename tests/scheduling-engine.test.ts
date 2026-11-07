import { describe, expect, it } from "vitest";
import {
  computeSchedule,
  defaultInputs,
  pidCompare,
  schedulingEngine,
  type ProcessInput,
} from "@/modules/scheduling/engine";

const classic = defaultInputs(); // P1(0,7,3) P2(2,4,1) P3(4,1,4) P4(5,4,2)

function segs(result: { timeline: { pid: string | null; start: number; end: number }[] }) {
  return result.timeline.map((s) => `${s.pid ?? "idle"}:${s.start}-${s.end}`).join(" ");
}

describe("pidCompare", () => {
  it("orders P2 before P10 (numeric, not lexicographic)", () => {
    expect(pidCompare("P10", "P2")).toBeGreaterThan(0);
    expect(pidCompare("P2", "P10")).toBeLessThan(0);
    expect(pidCompare("P1", "P1")).toBe(0);
  });
});

describe("FCFS", () => {
  it("runs processes strictly in arrival order", () => {
    const r = computeSchedule(classic, "fcfs", 2, "non-preemptive");
    expect(segs(r)).toBe("P1:0-7 P2:7-11 P3:11-12 P4:12-16");
  });

  it("produces hand-computed metrics", () => {
    const r = computeSchedule(classic, "fcfs", 2, "non-preemptive");
    const p2 = r.metrics.find((m) => m.pid === "P2")!;
    expect(p2.completion).toBe(11);
    expect(p2.turnaround).toBe(9); // 11 - 2
    expect(p2.waiting).toBe(5); // 9 - 4
    expect(p2.response).toBe(5); // first start 7 - arrival 2
    expect(r.averages.waiting).toBeCloseTo(4.75, 5);
    expect(r.averages.turnaround).toBeCloseTo(8.75, 5);
    expect(r.averages.cpuUtilization).toBeCloseTo(1, 5);
    expect(r.averages.contextSwitches).toBe(3);
  });

  it("is deterministic", () => {
    const a = computeSchedule(classic, "fcfs", 2, "non-preemptive");
    const b = computeSchedule([...classic].reverse(), "fcfs", 2, "non-preemptive");
    expect(segs(a)).toBe(segs(b));
    expect(a.averages).toEqual(b.averages);
  });
});

describe("SJF (non-preemptive)", () => {
  it("picks the shortest burst among arrived processes; ties by arrival then id", () => {
    const r = computeSchedule(classic, "sjf", 2, "non-preemptive");
    // P1 forced at t=0; at t=7 P3 (1) < P2/P4 (4); at t=8 P2 vs P4 tie → P2 arrived first.
    expect(segs(r)).toBe("P1:0-7 P3:7-8 P2:8-12 P4:12-16");
    expect(r.averages.waiting).toBeCloseTo(4.0, 5);
    expect(r.averages.turnaround).toBeCloseTo(8.0, 5);
  });

  it("beats FCFS on average waiting time for the classic scenario", () => {
    const fcfs = computeSchedule(classic, "fcfs", 2, "non-preemptive");
    const sjf = computeSchedule(classic, "sjf", 2, "non-preemptive");
    expect(sjf.averages.waiting).toBeLessThan(fcfs.averages.waiting);
  });
});

describe("SRTF (preemptive SJF)", () => {
  it("preempts the running process when a shorter job arrives", () => {
    const r = computeSchedule(classic, "srtf", 2, "non-preemptive");
    expect(segs(r)).toBe("P1:0-2 P2:2-4 P3:4-5 P2:5-7 P4:7-11 P1:11-16");
    const p1 = r.metrics.find((m) => m.pid === "P1")!;
    expect(p1.response).toBe(0); // started immediately
    expect(p1.waiting).toBe(9); // 16 TAT - 7 burst
    expect(r.averages.waiting).toBeCloseTo(3.0, 5);
  });

  it("never produces overlapping segments", () => {
    const r = computeSchedule(classic, "srtf", 2, "non-preemptive");
    for (let i = 1; i < r.timeline.length; i += 1) {
      expect(r.timeline[i].start).toBeGreaterThanOrEqual(r.timeline[i - 1].end);
    }
  });
});

describe("Round Robin", () => {
  it("cycles with the quantum and re-enqueues preempted processes last", () => {
    const r = computeSchedule(classic, "rr", 2, "non-preemptive");
    expect(segs(r)).toBe(
      "P1:0-2 P2:2-4 P1:4-6 P3:6-7 P2:7-9 P4:9-11 P1:11-13 P4:13-15 P1:15-16",
    );
    expect(r.averages.turnaround).toBeCloseTo(9.0, 5);
    expect(r.averages.waiting).toBeCloseTo(5.0, 5);
    expect(r.averages.contextSwitches).toBe(8);
  });

  it("handles an idle CPU when the next process arrives later", () => {
    const inputs: ProcessInput[] = [
      { pid: "P1", arrival: 0, burst: 3, priority: 1 },
      { pid: "P2", arrival: 9, burst: 4, priority: 1 },
    ];
    const r = computeSchedule(inputs, "rr", 2, "non-preemptive");
    expect(segs(r)).toBe("P1:0-2 P1:2-3 idle:3-9 P2:9-11 P2:11-13");
    expect(r.averages.cpuUtilization).toBeCloseTo(7 / 13, 5);
  });
});

describe("Priority scheduling", () => {
  it("preemptive mode preempts on higher priority arrival", () => {
    const r = computeSchedule(classic, "priority", 2, "preemptive");
    expect(segs(r)).toBe("P1:0-2 P2:2-4 P2:4-5 P2:5-6 P4:6-10 P1:10-15 P3:15-16");
  });

  it("non-preemptive mode lets the running process finish", () => {
    const r = computeSchedule(classic, "priority", 2, "non-preemptive");
    // P1 starts at t=0 and runs to completion even though P2 (priority 1) arrives at t=2.
    expect(r.timeline[0]).toMatchObject({ pid: "P1", start: 0, end: 7 });
  });

  it("starves low-priority processes but completes them", () => {
    const inputs: ProcessInput[] = [
      { pid: "P1", arrival: 0, burst: 3, priority: 10 },
      { pid: "P2", arrival: 1, burst: 1, priority: 1 },
      { pid: "P3", arrival: 2, burst: 1, priority: 1 },
    ];
    const r = computeSchedule(inputs, "priority", 2, "preemptive");
    const p1 = r.metrics.find((m) => m.pid === "P1")!;
    expect(segs(r)).toBe("P1:0-1 P2:1-2 P3:2-3 P1:3-5");
    expect(p1.waiting).toBe(2); // ran last despite arriving first
  });
});

describe("Edge cases", () => {
  it("breaks simultaneous-arrival ties by id", () => {
    const inputs: ProcessInput[] = [
      { pid: "P1", arrival: 0, burst: 5, priority: 1 },
      { pid: "P2", arrival: 0, burst: 5, priority: 1 },
      { pid: "P3", arrival: 0, burst: 5, priority: 1 },
    ];
    const r = computeSchedule(inputs, "fcfs", 2, "non-preemptive");
    expect(segs(r)).toBe("P1:0-5 P2:5-10 P3:10-15");
  });

  it("handles a process arriving after the CPU goes idle (non-preemptive)", () => {
    const inputs: ProcessInput[] = [
      { pid: "P1", arrival: 0, burst: 2, priority: 1 },
      { pid: "P2", arrival: 6, burst: 3, priority: 1 },
    ];
    const r = computeSchedule(inputs, "sjf", 2, "non-preemptive");
    expect(segs(r)).toBe("P1:0-2 idle:2-6 P2:6-9");
    expect(r.averages.cpuUtilization).toBeCloseTo(5 / 9, 5);
    expect(r.metrics.find((m) => m.pid === "P2")!.waiting).toBe(0);
  });

  it("keeps every segment contiguous and covers the makespan", () => {
    const r = computeSchedule(classic, "srtf", 2, "non-preemptive");
    expect(r.timeline[0].start).toBe(0);
    expect(r.timeline[r.timeline.length - 1].end).toBe(r.averages.makespan);
    for (let i = 1; i < r.timeline.length; i += 1) {
      expect(r.timeline[i].start).toBe(r.timeline[i - 1].end);
    }
  });
});

describe("Engine wrapper", () => {
  it("validates inputs and reports errors", () => {
    let s = schedulingEngine.initialState();
    s = schedulingEngine.step(s, { type: "update-process", payload: { pid: "P1", field: "burst", value: 0 } });
    expect(s.error).toMatch(/burst/);
    s = schedulingEngine.step(s, { type: "update-process", payload: { pid: "P1", field: "burst", value: 7 } });
    expect(s.error).toBeNull();
  });

  it("rejects an invalid quantum", () => {
    let s = schedulingEngine.initialState();
    s = schedulingEngine.step(s, { type: "set-quantum", payload: 0 });
    expect(s.error).toMatch(/quantum/);
  });

  it("steps the cursor through decisions and rewinds", () => {
    let s = schedulingEngine.initialState();
    s = schedulingEngine.step(s, { type: "set-algorithm", payload: "fcfs" });
    const total = s.result.timeline.length;
    s = schedulingEngine.step(s, { type: "tick" });
    s = schedulingEngine.step(s, { type: "tick" });
    expect(s.cursor).toBe(2);
    expect(s.eventLog.length).toBe(3); // algorithm-switch event + 2 tick events
    s = schedulingEngine.step(s, { type: "rewind" });
    expect(s.cursor).toBe(1);
    s = schedulingEngine.step(s, { type: "reset-cursor" });
    expect(s.cursor).toBe(0);
    void total;
  });

  it("loading a preset restores the default scenario inputs", () => {
    let s = schedulingEngine.initialState();
    s = schedulingEngine.step(s, { type: "load-preset", payload: "convoy" });
    expect(s.inputs.map((p) => p.pid)).toEqual(["P1", "P2", "P3", "P4"]);
    expect(s.inputs[0].burst).toBe(20);
    expect(s.cursor).toBe(0);
  });
});
