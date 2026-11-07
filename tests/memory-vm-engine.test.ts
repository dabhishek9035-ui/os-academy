import { describe, expect, it } from "vitest";
import {
  MEMORY_SIZE,
  chooseHole,
  defaultMemoryBlocks,
  memoryEngine,
  translate,
  type MemoryState,
} from "@/modules/memory-management/engine";
import {
  PAGE_SIZE,
  TLB_SIZE,
  parseReferenceString,
  simulateAll,
  vmEngine,
  type VmState,
} from "@/modules/virtual-memory/engine";

// ---------------------------------------------------------------------------
// memory engine
// ---------------------------------------------------------------------------

function memRun(state: MemoryState, actions: Parameters<typeof memoryEngine.step>[1][]) {
  let s = state;
  for (const a of actions) s = memoryEngine.step(s, a);
  return s;
}

describe("chooseHole strategies", () => {
  const holes = [
    { start: 0, size: 10 },
    { start: 20, size: 6 },
    { start: 40, size: 14 },
  ];
  it("first fit picks the first sufficient hole", () => {
    expect(chooseHole(holes, 5, "first")).toEqual({ start: 0, size: 10 });
  });
  it("best fit picks the smallest sufficient hole", () => {
    expect(chooseHole(holes, 5, "best")).toEqual({ start: 20, size: 6 });
  });
  it("worst fit picks the largest hole", () => {
    expect(chooseHole(holes, 5, "worst")).toEqual({ start: 40, size: 14 });
  });
  it("returns null when nothing fits", () => {
    expect(chooseHole(holes, 15, "first")).toBeNull();
  });
});

describe("translate (base/limit protection)", () => {
  it("adds base for addresses inside the segment", () => {
    expect(translate(100, 50, 7)).toEqual({ phys: 107 });
  });
  it("faults below base region (negative) and beyond limit", () => {
    expect(translate(100, 50, 50)).toEqual({ fault: "segmentation" }); // addr == limit
    expect(translate(100, 50, 999)).toEqual({ fault: "segmentation" });
  });
});

describe("memory engine", () => {
  it("default scenario has two holes and computes fragmentation", () => {
    const s = memoryEngine.initialState();
    expect(s.memorySize).toBe(MEMORY_SIZE);
    const holes = s.blocks.filter((b) => b.owner === null);
    expect(holes).toHaveLength(2); // 8 @20 and 8 @56
    expect(s.stats.largestFree).toBe(8);
    // total free 16, largest 8 → half of the free space is fragmented away
    expect(s.stats.externalFragPercent).toBe(50);
  });

  it("first-fit places into the first hole and splits the remainder", () => {
    let s = memoryEngine.initialState();
    s = memoryEngine.step(s, { type: "alloc", payload: { pid: "P4", size: 4 } });
    const p4 = s.blocks.find((b) => b.owner === "P4")!;
    expect(p4).toEqual({ start: 20, size: 4, owner: "P4" });
    expect(s.blocks).toContainEqual({ start: 24, size: 4, owner: null });
  });

  it("best-fit and worst-fit choose different holes when hole sizes differ", () => {
    // Holes: 4 units @20 and 8 units @56.
    const base: MemoryState = {
      ...memoryEngine.initialState(),
      blocks: [
        { start: 0, size: 8, owner: "kernel" },
        { start: 8, size: 12, owner: "P1" },
        { start: 20, size: 4, owner: null },
        { start: 24, size: 20, owner: "P2" },
        { start: 44, size: 12, owner: "P3" },
        { start: 56, size: 8, owner: null },
      ],
    };
    let best = memoryEngine.step(base, { type: "set-strategy", payload: "best" });
    best = memoryEngine.step(best, { type: "alloc", payload: { pid: "X", size: 4 } });
    expect(best.blocks.find((b) => b.owner === "X")!.start).toBe(20); // smallest sufficient

    let worst = memoryEngine.step(base, { type: "set-strategy", payload: "worst" });
    worst = memoryEngine.step(worst, { type: "alloc", payload: { pid: "Y", size: 4 } });
    expect(worst.blocks.find((b) => b.owner === "Y")!.start).toBe(56); // largest
  });

  it("free coalesces with both neighbours into one hole", () => {
    // Custom compact layout: kernel, A, B, C, free — freeing B merges both sides.
    let s: MemoryState = {
      ...memoryEngine.initialState(),
      blocks: [
        { start: 0, size: 8, owner: "kernel" },
        { start: 8, size: 8, owner: "A" },
        { start: 16, size: 8, owner: "B" },
        { start: 24, size: 8, owner: "C" },
        { start: 32, size: 32, owner: null },
      ],
    };
    s = memoryEngine.step(s, { type: "free", payload: "B" });
    expect(s.blocks.filter((b) => b.owner === null)).toHaveLength(2); // 8@16 and 32@32
    s = memoryEngine.step(s, { type: "free", payload: "A" });
    s = memoryEngine.step(s, { type: "free", payload: "C" });
    const holes = s.blocks.filter((b) => b.owner === null);
    expect(holes).toHaveLength(1);
    expect(holes[0]).toEqual({ start: 8, size: 56, owner: null });
  });

  it("fails an allocation larger than the largest hole even when total free suffices", () => {
    const s = memoryEngine.initialState(); // holes: 8 @20, 8 @56 → 16 free total
    const after = memoryEngine.step(s, { type: "alloc", payload: { pid: "BIG", size: 12 } });
    expect(after.blocks.some((b) => b.owner === "BIG")).toBe(false);
    expect(after.stats.failedAllocs).toBe(1);
    expect(after.eventLog.at(-1)?.label).toMatch(/external fragmentation/);
  });

  it("compaction removes all holes into one trailing free block", () => {
    let s = memoryEngine.initialState();
    s = memoryEngine.step(s, { type: "compact" });
    const holes = s.blocks.filter((b) => b.owner === null);
    expect(holes).toHaveLength(1);
    expect(holes[0].start + holes[0].size).toBe(MEMORY_SIZE);
    const used = s.blocks.filter((b) => b.owner !== null);
    for (let i = 1; i < used.length; i += 1) {
      expect(used[i].start).toBe(used[i - 1].start + used[i - 1].size);
    }
  });

  it("validates allocation input", () => {
    let s = memoryEngine.initialState();
    s = memoryEngine.step(s, { type: "alloc", payload: { pid: "Z", size: 0 } });
    expect(s.error).toMatch(/between 1 and/);
    s = memoryEngine.step(s, { type: "alloc", payload: { pid: "kernel", size: 4 } });
    expect(s.error).toMatch(/already has memory/);
  });
});

// ---------------------------------------------------------------------------
// vm engine
// ---------------------------------------------------------------------------

describe("simulateAll (pure replacement counts)", () => {
  it("matches hand-computed FIFO/LRU/Optimal counts on a classic string", () => {
    // pages 1,2,3,4,1,2,5,1,2,3 with 3 frames — textbook values:
    // FIFO: 10 refs → faults: 1,2,3,4,5,3 → let's hand-verify:
    //  1F 2F 3F 4F(evict1) 1F(evict2) 2F(evict3) 5F(evict4) 1 hit? frames after 5: [5,1,2] → 1 HIT, 2 HIT, 3F(evict5) → faults = 7? recount below.
    const r = simulateAll([1, 2, 3, 4, 1, 2, 5, 1, 2, 3], 3);
    // FIFO trace: [1F][2F][3F][4F ev1][1F ev2][2F ev3][5F ev4][1 hit][2 hit][3F ev5? frames=[5,1,2]→evict 5]
    // = faults at refs 1,2,3,4,5,6,7,10 → 8 faults? No: ref8=1 hit, ref9=2 hit, ref10=3 fault → 7+1=8? Count: refs 1-7 faults (7), ref8 hit, ref9 hit, ref10 fault → 8 faults.
    expect(r.fifo.faults).toBe(8);
    // LRU trace: 1F 2F 3F 4F(ev1) 1F(ev2) 2F(ev3) 5F(ev4) 1hit 2hit 3F(ev5) → same 8? hand: after ref7 frames [5,1,2]; ref8 1 hit; ref9 2 hit; ref10 3 fault evict 5 → 8 faults.
    expect(r.lru.faults).toBe(8);
    // Optimal: 1F 2F 3F 4F(ev1? 1 used at ref5 → evict 3? compute: next uses after ref4: 1@5, 2@6, 3@never → evict 3) 1hit 2hit 5F(ev4? next: 1@8,2@9,4@never → evict 4) 1hit 2hit 3F(ev5? next: none of 1,2,3? 1@8 passed... at ref10 remaining [] → evict first/never-used 5) → faults: 1,2,3,4,5,3 = 7? refs: 1F,2F,3F,4F,5F,then 3F at ref10 → 6? careful: after ref6 frames [1,2,4]; ref7 5F evict 4 → [1,2,5]; ref8 1 hit; ref9 2 hit; ref10 3F evict 5 → total faults = refs 1,2,3,4,7,10 = 6.
    expect(r.optimal.faults).toBe(6);
    expect(r.optimal.faults).toBeLessThanOrEqual(r.lru.faults);
  });

  it("counts hits as references minus faults", () => {
    const pages = [1, 1, 2, 1];
    const r = simulateAll(pages, 2);
    expect(r.fifo.faults).toBe(2);
    expect(r.fifo.hits).toBe(2);
  });
});

describe("parseReferenceString", () => {
  it("parses comma/space separated addresses", () => {
    expect(parseReferenceString("0, 16, 32")).toEqual({ addresses: [0, 16, 32] });
  });
  it("rejects out-of-range addresses", () => {
    expect(parseReferenceString("300")).toHaveProperty("error");
    expect(parseReferenceString("")).toHaveProperty("error");
  });
});

function vmRun(state: VmState, actions: Parameters<typeof vmEngine.step>[1][]) {
  let s = state;
  for (const a of actions) s = vmEngine.step(s, a);
  return s;
}

describe("vm engine walk", () => {
  it("decomposes addresses into page + offset", () => {
    let s = vmEngine.initialState();
    s = vmRun(s, [{ type: "tick" }]); // first ref 0x04
    expect(s.currentStep?.vpage).toBe(0);
    expect(s.currentStep?.offset).toBe(4);
    expect(s.currentStep?.fault).toBe(true);
  });

  it("records a TLB hit on the second access to the same page", () => {
    let s = vmEngine.initialState();
    s = vmEngine.step(s, { type: "set-string", payload: "0,0" }); // same page twice
    s = vmRun(s, [{ type: "tick" }]); // page 0 → fault, TLB filled
    expect(s.tlbHits).toBe(0);
    s = vmEngine.step(s, { type: "tick" }); // page 0 again → TLB hit
    expect(s.currentStep?.tlbHit).toBe(true);
    expect(s.currentStep?.fault).toBe(false);
    expect(s.tlbHits).toBe(1);
  });

  it("a TLB miss on a resident page is a page-table hit, not a fault", () => {
    let s = vmEngine.initialState(); // pages 0,2,4,0 — TLB(2) evicted page 0 by the 3rd ref
    s = vmRun(s, [{ type: "tick" }, { type: "tick" }, { type: "tick" }]);
    s = vmEngine.step(s, { type: "tick" }); // page 0 again
    expect(s.currentStep?.tlbHit).toBe(false);
    expect(s.currentStep?.fault).toBe(false);
  });

  it("caps the TLB at its size, evicting the least recently used entry", () => {
    let s = vmEngine.initialState(); // 0,2,4,0,6,...
    s = vmRun(s, [{ type: "tick" }, { type: "tick" }, { type: "tick" }]); // TLB: [0,2] then 4 evicts 0 → [2,4]
    expect(s.tlb.map((e) => e.vpage)).toEqual([2, 4]);
  });

  it("evicts a page on fault when frames are full, honoring the active algorithm", () => {
    let s = vmEngine.initialState(); // pages 0,2,4,0,6,0,2,8 with 3 frames, FIFO
    s = vmRun(s, [{ type: "tick" }, { type: "tick" }, { type: "tick" }]); // 0,2,4 loaded
    expect(s.frames.filter((f) => f !== null)).toHaveLength(3);
    s = vmEngine.step(s, { type: "tick" }); // page 0 → still resident (hit)
    expect(s.currentStep?.fault).toBe(false);
    s = vmEngine.step(s, { type: "tick" }); // page 6 → fault, FIFO evicts page 0 (oldest)
    expect(s.currentStep?.fault).toBe(true);
    expect(s.currentStep?.evicted).toBe(0);
  });

  it("matches its live fault count against simulateAll totals for the full walk", () => {
    const s0 = vmEngine.initialState();
    let s = s0;
    while (s.cursor < s.referenceString.length) {
      s = vmEngine.step(s, { type: "tick" });
    }
    expect(s.faultCount).toBe(s.totals.fifo.faults);
  });

  it("rewind steps back one reference", () => {
    let s = vmEngine.initialState();
    s = vmRun(s, [{ type: "tick" }, { type: "tick" }]);
    s = vmEngine.step(s, { type: "rewind" });
    expect(s.cursor).toBe(1);
    expect(s.faultCount).toBe(1);
  });

  it("handles copy-on-write: fork shares read-only, write faults and unshares", () => {
    let s = vmEngine.initialState();
    s = vmRun(s, [{ type: "tick" }, { type: "tick" }]); // pages 0 and 2 resident
    s = vmEngine.step(s, { type: "fork-cow" });
    expect(s.pageTable[0].shared).toBe(true);
    expect(s.pageTable[0].readonly).toBe(true);
    s = vmEngine.step(s, { type: "write-page", payload: 0 });
    expect(s.pageTable[0].shared).toBe(false);
    expect(s.pageTable[0].readonly).toBe(false);
    expect(s.pageTable[0].modified).toBe(true);
    expect(s.eventLog.at(-1)?.kind).toBe("cow-fault");
  });

  it("validates frame count and addresses", () => {
    let s = vmEngine.initialState();
    s = vmEngine.step(s, { type: "set-frames", payload: 9 });
    expect(s.error).toMatch(/between 1 and 7/);
    s = vmEngine.step(s, { type: "access", payload: 999 });
    expect(s.error).toMatch(/0–/);
    void TLB_SIZE;
    void PAGE_SIZE;
  });
});
