import { describe, expect, it } from "vitest";
import {
  bankersEngine,
  detectDeadlock,
  ragEngine,
  safetySequence,
  type BankersState,
} from "@/modules/deadlocks/engine";

describe("ragEngine", () => {
  it("detects the classic ABBA deadlock on the initial scenario", () => {
    let s = ragEngine.initialState();
    s = ragEngine.step(s, { type: "detect" });
    expect(s.analysis?.deadlocked.sort()).toEqual(["P1", "P2"]);
    expect(s.analysis?.reason).toMatch(/Deadlock/);
  });

  it("reports no deadlock when reduction completes (multi-unit scenario)", () => {
    // P1 holds 1×R(2 units), requests 1 more; P2 requests 2 (must wait for P1 to finish).
    const state = {
      processes: ["P1", "P2"],
      resources: [{ id: "R", units: 2 }],
      held: { P1: { R: 1 }, P2: {} },
      requests: [
        { pid: "P1", rid: "R", units: 1 },
        { pid: "P2", rid: "R", units: 2 },
      ],
    };
    expect(detectDeadlock(state)).toEqual([]); // P1's request can be granted (1 free), then releases 2 → P2 finishes
  });

  it("flags deadlock when a cycle of waiting can never be broken", () => {
    // Two units R: P1 holds 1, P2 holds 1; P1 wants 1 more, P2 wants 1 more.
    const state = {
      processes: ["P1", "P2"],
      resources: [{ id: "R", units: 2 }],
      held: { P1: { R: 1 }, P2: { R: 1 } },
      requests: [
        { pid: "P1", rid: "R", units: 1 },
        { pid: "P2", rid: "R", units: 1 },
      ],
    };
    expect(detectDeadlock(state).sort()).toEqual(["P1", "P2"]);
  });

  it("grants a request only when units are free, and denies honestly otherwise", () => {
    let s = ragEngine.initialState();
    // No free R1 (P1 holds the single unit)
    s = ragEngine.step(s, { type: "grant", payload: { pid: "P2", rid: "R1", units: 1 } });
    expect(s.error).toMatch(/only 0 free/);
    s = ragEngine.step(s, { type: "grant", payload: { pid: "P2", rid: "R2", units: 1 } });
    // granting breaks the cycle: P2 now holds R1? no — R2 was P2's own; granting P2's R2 request is impossible too (0 free).
    expect(s.error).toMatch(/only 0 free/);
    void s;
  });

  it("grant with a free unit succeeds and removes the pending request", () => {
    let s = ragEngine.initialState();
    s = ragEngine.step(s, { type: "add-process", payload: "P3" });
    s = ragEngine.step(s, { type: "add-resource", payload: { id: "R3", units: 1 } });
    s = ragEngine.step(s, { type: "request", payload: { pid: "P3", rid: "R3", units: 1 } });
    s = ragEngine.step(s, { type: "grant", payload: { pid: "P3", rid: "R3", units: 1 } });
    expect(s.error).toBeNull();
    expect(s.requests.filter((r) => r.pid === "P3")).toHaveLength(0);
    expect(s.held.P3.R3).toBe(1);
  });
});

describe("bankersEngine", () => {
  function freshBankers(): BankersState {
    return bankersEngine.initialState();
  }

  it("the textbook initial state is SAFE with a valid sequence", () => {
    let s = freshBankers();
    s = bankersEngine.step(s, { type: "safety-check" });
    expect(s.lastRequest?.granted).toBe(true);
    const seq = s.lastRequest!.safeSequence;
    expect(seq).toHaveLength(5);
    expect([...seq].sort()).toEqual(["P1", "P2", "P3", "P4", "P5"]);
  });

  it("grants P2's request (1,0,2) with a safe sequence", () => {
    // This is the textbook's "P1 requests (1,0,2)" example: in our naming the
    // textbook's P1 is our second row (allocation [2,0,0], max [3,2,2]).
    let s = freshBankers();
    s = bankersEngine.step(s, { type: "request", payload: { pid: "P2", vector: [1, 0, 2] } });
    expect(s.lastRequest?.granted).toBe(true);
    expect(s.lastRequest?.safeSequence.length).toBe(5);
    // pretend-allocation applied
    expect(s.allocation[1]).toEqual([3, 0, 2]);
    expect(s.available).toEqual([2, 3, 0]);
  });

  it("denies a request that would make the state unsafe", () => {
    let s = freshBankers();
    // P5 requesting (3,3,0): available has 3,3,2 → pretend-alloc leaves 0,0,2;
    // need for P1..P4 cannot all be met → unsafe → deny.
    s = bankersEngine.step(s, { type: "request", payload: { pid: "P5", vector: [3, 3, 0] } });
    expect(s.lastRequest?.granted).toBe(false);
    expect(s.lastRequest?.reason).toMatch(/UNSAFE/);
    // state unchanged
    expect(s.allocation[4]).toEqual([0, 0, 2]);
    expect(s.available).toEqual([3, 3, 2]);
  });

  it("denies requests exceeding the process's remaining claim", () => {
    let s = freshBankers();
    s = bankersEngine.step(s, { type: "request", payload: { pid: "P1", vector: [8, 0, 0] } });
    expect(s.lastRequest?.granted).toBe(false);
    expect(s.lastRequest?.reason).toMatch(/remaining claim/);
  });

  it("validates matrix edits", () => {
    let s = freshBankers();
    s = bankersEngine.step(s, {
      type: "set-cell",
      payload: { matrix: "maxClaim", i: 0, j: 0, value: 0 }, // below allocation[0][0]=0? equal is fine → use negative
    });
    s = bankersEngine.step(s, {
      type: "set-cell",
      payload: { matrix: "allocation", i: 0, j: 1, value: 9 }, // exceeds maxClaim P1 A? maxClaim[0][1]=5 → 9 > 5 → error
    });
    expect(s.error).toMatch(/cannot exceed maxClaim/);
  });
});

describe("safetySequence (pure)", () => {
  it("finds a sequence for the textbook state", () => {
    const seq = safetySequence(
      [
        [0, 1, 0],
        [2, 0, 0],
        [3, 0, 2],
        [2, 1, 1],
        [0, 0, 2],
      ],
      [
        [7, 5, 3],
        [3, 2, 2],
        [9, 0, 2],
        [2, 2, 2],
        [4, 3, 3],
      ],
      [3, 3, 2],
    );
    expect(seq).not.toBeNull();
    expect(seq!).toHaveLength(5);
  });

  it("returns null for an unsafe state", () => {
    const seq = safetySequence(
      [
        [1, 1],
        [1, 1],
      ],
      [
        [2, 2],
        [2, 2],
      ],
      [0, 1], // not enough for either process's need [1,1] with 0 A available
    );
    expect(seq).toBeNull();
  });
});
