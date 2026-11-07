import { describe, expect, it } from "vitest";
import {
  MICRO_STEPS,
  raceEngine,
  boundedBufferEngine,
} from "@/modules/threads-concurrency/engine";
import { diningEngine } from "@/modules/synchronization/engine";

function run<S, A extends string>(
  engine: { step: (s: S, a: { type: A; payload?: unknown }) => S },
  state: S,
  actions: { type: A; payload?: unknown }[],
): S {
  let s = state;
  for (const a of actions) s = engine.step(s, a);
  return s;
}

describe("race engine", () => {
  it("unsynchronized round-robin with 1 iteration each loses one update", () => {
    // Strict alternation: T1 load(0), T2 load(0), T1 add, T2 add, T1 store(1), T2 store(1)
    let s = raceEngine.initialState(); // 2 threads × 1 iteration, unsync, round-robin
    s = run(raceEngine, s, Array.from({ length: 6 }, () => ({ type: "tick" as const })));
    expect(s.counter).toBe(1); // one increment LOST
    expect(s.completedIncrements).toBe(2);
    expect(s.expectedIncrements).toBe(2);
  });

  it("synchronized mode always yields the correct total", () => {
    let s = raceEngine.initialState();
    s = raceEngine.step(s, { type: "toggle-sync" });
    s = run(raceEngine, s, Array.from({ length: 2 }, () => ({ type: "tick" as const })));
    expect(s.counter).toBe(2);
    expect(s.completedIncrements).toBe(2);
  });

  it("chaos schedule is deterministic for a fixed seed", () => {
    const a = run(raceEngine, raceEngine.initialState(), [
      { type: "set-schedule", payload: "chaos" },
      ...Array.from({ length: 8 }, () => ({ type: "tick" as const })),
    ]);
    const b = run(raceEngine, raceEngine.initialState(), [
      { type: "set-schedule", payload: "chaos" },
      ...Array.from({ length: 8 }, () => ({ type: "tick" as const })),
    ]);
    expect(a.counter).toBe(b.counter);
    expect(a.eventLog.map((e) => e.label)).toEqual(b.eventLog.map((e) => e.label));
  });

  it("run-to-end with sync reaches the expected total", () => {
    let s = raceEngine.initialState();
    s = raceEngine.step(s, { type: "toggle-sync" });
    s = raceEngine.step(s, { type: "set-iterations", payload: 3 });
    s = raceEngine.step(s, { type: "run-to-end" });
    expect(s.counter).toBe(6);
    expect(s.threads.every((t) => t.done)).toBe(true);
  });

  it("uses the documented micro-step order", () => {
    expect(MICRO_STEPS).toEqual(["load counter", "add 1", "store counter"]);
  });
});

describe("bounded buffer engine", () => {
  it("never exceeds capacity and ends with produced == consumed", () => {
    let s = boundedBufferEngine.initialState();
    s = boundedBufferEngine.step(s, { type: "run-to-end" });
    expect(s.produced).toBe(s.consumed);
    expect(Math.max(...[], s.buffer.length)).toBeLessThanOrEqual(s.capacity);
    expect(s.semaphores.empty).toBe(s.capacity);
    expect(s.semaphores.full).toBe(0);
    expect(s.semaphores.mutex).toBe(1);
    expect(s.producers.every((p) => p.state === "done")).toBe(true);
    expect(s.consumers.every((c) => c.state === "done")).toBe(true);
  });

  it("producers block on a full buffer (capacity 2, three producers)", () => {
    let s = boundedBufferEngine.initialState();
    s = boundedBufferEngine.step(s, { type: "set-capacity", payload: 2 });
    s = boundedBufferEngine.step(s, { type: "add-producer" });
    // tick 1: P1 and P2 fill the buffer; P3 finds empty=0 and blocks.
    s = run(boundedBufferEngine, s, [{ type: "tick" }, { type: "tick" }]);
    const blocked = s.producers.filter((p) => p.state === "waiting-empty");
    // P3 hit empty=0 during tick 1 (the consumer frees a slot later in the
    // tick, which is why `empty` can be 1 again at the end).
    expect(blocked.length).toBeGreaterThanOrEqual(1);
    expect(s.buffer.length).toBeLessThanOrEqual(2);
  });

  it("semaphore values never go negative", () => {
    let s = boundedBufferEngine.initialState();
    s = boundedBufferEngine.step(s, { type: "add-producer" });
    s = boundedBufferEngine.step(s, { type: "add-consumer" });
    for (let i = 0; i < 30; i += 1) {
      s = boundedBufferEngine.step(s, { type: "tick" });
      expect(s.semaphores.empty).toBeGreaterThanOrEqual(0);
      expect(s.semaphores.full).toBeGreaterThanOrEqual(0);
      expect(s.semaphores.mutex).toBeGreaterThanOrEqual(0);
      expect(s.buffer.length).toBeLessThanOrEqual(s.capacity);
    }
  });

  it("validates capacity", () => {
    let s = boundedBufferEngine.initialState();
    s = boundedBufferEngine.step(s, { type: "set-capacity", payload: 1 });
    expect(s.error).toMatch(/2–8/);
  });
});

describe("dining philosophers", () => {
  it("naive strategy reaches a real deadlock within a few ticks", () => {
    let s = diningEngine.initialState();
    s = run(diningEngine, s, Array.from({ length: 6 }, () => ({ type: "tick" as const })));
    expect(s.philosophers.every((p) => p.state === "blocked")).toBe(true);
    expect(s.eventLog.some((e) => e.kind === "deadlock")).toBe(true);
    expect(s.meals).toBe(0);
  });

  it("resource hierarchy keeps serving meals and never deadlocks", () => {
    let s = diningEngine.initialState();
    s = diningEngine.step(s, { type: "set-strategy", payload: "hierarchy" });
    s = run(diningEngine, s, Array.from({ length: 40 }, () => ({ type: "tick" as const })));
    expect(s.meals).toBeGreaterThan(0);
    expect(s.eventLog.some((e) => e.kind === "deadlock")).toBe(false);
  });

  it("never seats more than two philosophers at once", () => {
    let s = diningEngine.initialState();
    s = diningEngine.step(s, { type: "set-strategy", payload: "hierarchy" });
    for (let i = 0; i < 40; i += 1) {
      s = diningEngine.step(s, { type: "tick" });
      const eating = s.philosophers.filter((p) => p.state === "eating").length;
      expect(eating).toBeLessThanOrEqual(2);
    }
  });
});
