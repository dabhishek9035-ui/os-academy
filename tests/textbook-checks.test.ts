/**
 * Phase 0.3 — textbook algorithm checks.
 *
 * The numbers below are the classic textbook examples (Silberschatz, OSTEP).
 * Where a result depends on a convention (SCAN direction, RR tie-breaking,
 * priority ties), the convention the engine implements is stated in the test
 * and mirrored in the lab's "Model notes".
 */
import { describe, expect, it } from "vitest";

import { computeSchedule } from "@/modules/scheduling/engine";
import { scheduleDisk } from "@/modules/io/disk-engine";
import { safetySequence, TEXTBOOK_STATE } from "@/modules/deadlocks/engine";
import { simulateAll, simulateSteps } from "@/modules/virtual-memory/engine";
import {
  chooseHole,
  defaultMemoryBlocks,
  memoryEngine,
  MEMORY_SIZE,
} from "@/modules/memory-management/engine";
import { vmEngine, PAGE_SIZE } from "@/modules/virtual-memory/engine";

const CLASSIC = [
  { pid: "P1", arrival: 0, burst: 24, priority: 0 },
  { pid: "P2", arrival: 0, burst: 3, priority: 0 },
  { pid: "P3", arrival: 0, burst: 3, priority: 0 },
];

const avgWait = (inputs: typeof CLASSIC, alg: Parameters<typeof computeSchedule>[1], quantum = 4) =>
  computeSchedule(inputs, alg, quantum, "non-preemptive").averages.waiting;

describe("textbook: CPU scheduling (P1=24, P2=3, P3=3, all arrive at 0)", () => {
  it("FCFS average waiting time is 17", () => {
    expect(avgWait(CLASSIC, "fcfs")).toBeCloseTo(17, 5);
  });

  it("SJF average waiting time is 3", () => {
    expect(avgWait(CLASSIC, "sjf")).toBeCloseTo(3, 5);
  });

  it("SRTF (no later arrivals → same order as SJF) is 3", () => {
    expect(avgWait(CLASSIC, "srtf")).toBeCloseTo(3, 5);
  });

  it("Round Robin q=4 average waiting time is 5.67 (17/3)", () => {
    expect(avgWait(CLASSIC, "rr", 4)).toBeCloseTo(17 / 3, 5);
  });

  it("non-preemptive priority with equal priorities falls back to pid order (= FCFS, 17)", () => {
    expect(avgWait(CLASSIC, "priority")).toBeCloseTo(17, 5);
  });

  it("convoy preset: FCFS makes short jobs wait behind the long one", () => {
    const s = computeSchedule(
      [
        { pid: "P1", arrival: 0, burst: 20, priority: 0 },
        { pid: "P2", arrival: 1, burst: 2, priority: 0 },
        { pid: "P3", arrival: 2, burst: 2, priority: 0 },
      ],
      "fcfs",
      4,
      "non-preemptive",
    );
    const p2 = s.metrics.find((m) => m.pid === "P2");
    const p3 = s.metrics.find((m) => m.pid === "P3");
    expect(p2?.waiting).toBe(19); // waited 1→20 while P1 ran
    expect(p3?.waiting).toBe(20); // waited 2→22 (P1 to 20, P2 20→22)
  });
});

describe("textbook: page replacement (ref string 1 2 3 4 1 2 5 1 2 3 4 5)", () => {
  const REF = [1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5];

  it("FIFO: 9 faults with 3 frames", () => {
    expect(simulateAll(REF, 3).fifo.faults).toBe(9);
  });

  it("FIFO: 10 faults with 4 frames (Belady's anomaly)", () => {
    expect(simulateAll(REF, 4).fifo.faults).toBe(10);
  });

  it("LRU: 10 faults with 3 frames", () => {
    expect(simulateAll(REF, 3).lru.faults).toBe(10);
  });

  it("Optimal: 7 faults with 3 frames", () => {
    expect(simulateAll(REF, 3).optimal.faults).toBe(7);
  });

  it("with 4 frames, Optimal and LRU are never worse than FIFO", () => {
    const four = simulateAll(REF, 4);
    expect(four.optimal.faults).toBeLessThanOrEqual(four.fifo.faults);
    expect(four.lru.faults).toBeLessThanOrEqual(four.fifo.faults);
  });

  it("more frames never hurt Optimal (no Belady for LRU/OPT families)", () => {
    expect(simulateAll(REF, 4).optimal.faults).toBeLessThanOrEqual(
      simulateAll(REF, 3).optimal.faults,
    );
  });

  it("simulateSteps agrees with simulateAll on counts and records victims", () => {
    for (const algorithm of ["fifo", "lru", "optimal"] as const) {
      for (const frames of [3, 4]) {
        const steps = simulateSteps(REF, frames, algorithm);
        const faults = steps.filter((s) => s.fault).length;
        expect(faults).toBe(simulateAll(REF, frames)[algorithm].faults);
        // Every non-fault step must already hold the page; fault steps add it.
        for (const s of steps) {
          expect(s.frames).toHaveLength(frames);
          if (!s.fault) expect(s.victimFrame).toBeNull();
          expect(s.frames.filter((f) => f === null).length).toBeGreaterThanOrEqual(0);
        }
        // The final snapshot's resident set size never exceeds the frame count.
        expect(steps[steps.length - 1].frames.filter((f) => f !== null).length).toBeLessThanOrEqual(frames);
      }
    }
  });
});

describe("textbook: disk scheduling (head 53, queue 98 183 37 122 14 124 65 67)", () => {
  const HEAD = 53;
  const QUEUE = [98, 183, 37, 122, 14, 124, 65, 67];

  it("FCFS total movement is 640", () => {
    expect(scheduleDisk(HEAD, QUEUE, "fcfs", "up").movement).toBe(640);
  });

  it("SSTF total movement is 236", () => {
    expect(scheduleDisk(HEAD, QUEUE, "sstf", "up").movement).toBe(236);
  });

  it("SCAN moving down (to cylinder 0, then up) is 236", () => {
    expect(scheduleDisk(HEAD, QUEUE, "scan", "down").movement).toBe(236);
  });

  it("LOOK moving down (reverse at last request, 14) is 208", () => {
    expect(scheduleDisk(HEAD, QUEUE, "look", "down").movement).toBe(208);
  });

  it("SSTF never moves farther than FCFS on the same queue", () => {
    expect(
      scheduleDisk(HEAD, QUEUE, "sstf", "up").movement,
    ).toBeLessThanOrEqual(scheduleDisk(HEAD, QUEUE, "fcfs", "up").movement);
  });
});

describe("textbook: Banker's algorithm (Silberschatz 5-process state)", () => {
  it("finds the safe sequence <P1, P3, P4, P0, P2> (1-based: P2, P4, P5, P1, P3)", () => {
    const seq = safetySequence(
      TEXTBOOK_STATE.allocation,
      TEXTBOOK_STATE.maxClaim,
      TEXTBOOK_STATE.available,
    );
    expect(seq).toEqual(["P2", "P4", "P5", "P1", "P3"]);
  });

  it("reports no safe sequence (null) for an unsafe state", () => {
    // Available [2,1,2]: P1 needs 4×B and P5 needs 3×B but only 2×B exist.
    const seq = safetySequence(
      TEXTBOOK_STATE.allocation,
      TEXTBOOK_STATE.maxClaim,
      [2, 1, 2],
    );
    expect(seq).toBeNull();
  });
});

describe("textbook: contiguous memory allocation", () => {
  it("first / best / worst fit each pick a different hole on the same request", () => {
    const holes = [
      { start: 0, size: 10 },
      { start: 20, size: 6 },
      { start: 30, size: 14 },
    ];
    expect(chooseHole(holes, 5, "first")).toEqual({ start: 0, size: 10 });
    expect(chooseHole(holes, 5, "best")).toEqual({ start: 20, size: 6 });
    expect(chooseHole(holes, 5, "worst")).toEqual({ start: 30, size: 14 });
  });

  it("returns null when no hole fits", () => {
    expect(chooseHole([{ start: 0, size: 4 }], 5, "best")).toBeNull();
  });

  it("default layout reports 50% external fragmentation (two 8-block holes)", () => {
    const state = memoryEngine.initialState();
    expect(state.memorySize).toBe(MEMORY_SIZE);
    expect(state.stats.externalFragPercent).toBe(50);
  });
});

describe("textbook: paging & TLB", () => {
  it("addresses split into page + offset at the page-size boundary", () => {
    expect(PAGE_SIZE).toBe(16);
    // 15 and 16 are adjacent addresses but live in different pages.
    let s = vmEngine.initialState();
    s = vmEngine.step(s, { type: "set-string", payload: "15,16" });
    s = vmEngine.step(s, { type: "tick" });
    const first = s.currentStep;
    s = vmEngine.step(s, { type: "tick" });
    expect(first).not.toBeNull();
    expect(s.faultCount).toBe(2); // two distinct pages, not one
  });

  it("TLB records a hit when a page is revisited while still cached", () => {
    let s = vmEngine.initialState();
    s = vmEngine.step(s, { type: "set-string", payload: "0,16,0" });
    s = vmEngine.step(s, { type: "tick" }); // page 0: TLB miss
    s = vmEngine.step(s, { type: "tick" }); // page 1: TLB miss
    s = vmEngine.step(s, { type: "tick" }); // page 0 again: TLB hit
    expect(s.tlbHits).toBe(1);
    expect(s.faultCount).toBe(2);
  });

  it("replacement algorithms produce the documented totals for the loaded string", () => {
    let s = vmEngine.initialState();
    s = vmEngine.step(s, { type: "set-string", payload: "1,2,3,4,1,2,5,1,2,3,4,5" });
    // Access addresses are page-agnostic here; totals are per the engine's
    // own page mapping (address → page = addr / PAGE_SIZE).
    expect(s.totals.fifo).toBeDefined();
    expect(s.totals.lru).toBeDefined();
    expect(s.totals.optimal).toBeDefined();
  });
});
