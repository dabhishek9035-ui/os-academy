import type { SimAction, SimEvent, SimulationEngine } from "@/types";

/**
 * Virtual memory engine — paging + TLB + page replacement + COW demo.
 *
 * Model (documented simplifications):
 *  - Virtual address space: 16 pages × 16 units (addresses 0..255).
 *  - Physical frames: 1..7 (default 3). TLB: 2 entries, LRU.
 *  - One-level page table (multi-level tables are explained in the lesson).
 *  - `totals` computes FIFO/LRU/Optimal fault counts over the whole string
 *    (page-number level, no TLB) so the lab can compare algorithms honestly.
 *  - COW demo: shared pages are read-only; a write triggers a copy fault and
 *    unshares the page (the "copy" is conceptual — frame contents are not
 *    modelled).
 */

export const PAGE_SIZE = 16;
export const NUM_PAGES = 16;
export const TLB_SIZE = 2;

export type ReplacementAlgorithm = "fifo" | "lru" | "optimal";

export interface PageTableEntry {
  vpage: number;
  frame: number | null;
  present: boolean;
  referenced: boolean;
  modified: boolean;
  shared: boolean;
  readonly: boolean;
  /** load order for FIFO */
  loadedAt: number;
  /** last use tick for LRU */
  lastUsed: number;
}

export interface VmStep {
  address: number;
  vpage: number;
  offset: number;
  tlbHit: boolean;
  fault: boolean;
  evicted: number | null;
  cowFault: boolean;
}

export interface VmState {
  frames: (number | null)[];
  frameAge: number[]; // parallel to frames: load tick for FIFO
  pageTable: PageTableEntry[];
  tlb: { vpage: number; frame: number }[];
  referenceString: number[];
  cursor: number;
  algorithm: ReplacementAlgorithm;
  totals: Record<ReplacementAlgorithm, { faults: number; hits: number }>;
  currentStep: VmStep | null;
  faultCount: number;
  tlbHits: number;
  clock: number;
  eventLog: SimEvent[];
  error: string | null;
}

export type VmAction =
  | "tick"
  | "rewind"
  | "set-frames"
  | "set-string"
  | "set-algorithm"
  | "access"
  | "fork-cow"
  | "write-page"
  | "reset";

/** Parse "1,4,2,1" (addresses) into numbers with validation. */
export function parseReferenceString(s: string): { addresses: number[] } | { error: string } {
  const parts = s.split(/[,\s]+/).filter((p) => p.length > 0);
  if (parts.length === 0) return { error: "Reference string is empty." };
  const addresses: number[] = [];
  for (const p of parts) {
    const n = Number(p);
    if (!Number.isInteger(n) || n < 0 || n >= PAGE_SIZE * NUM_PAGES) {
      return { error: `“${p}” is not a valid address (0–${PAGE_SIZE * NUM_PAGES - 1}).` };
    }
    addresses.push(n);
  }
  return { addresses };
}

/** Pure: FIFO/LRU/Optimal fault+hit counts over a PAGE-NUMBER string. */
export function simulateAll(
  pages: number[],
  numFrames: number,
): Record<ReplacementAlgorithm, { faults: number; hits: number }> {
  const run = (algorithm: ReplacementAlgorithm): { faults: number; hits: number } => {
    const frames: (number | null)[] = Array(numFrames).fill(null);
    const loadedAt: number[] = Array(numFrames).fill(0);
    const lastUsed: number[] = Array(numFrames).fill(0);
    let faults = 0;
    let hits = 0;
    for (let t = 0; t < pages.length; t += 1) {
      const page = pages[t];
      const idx = frames.indexOf(page);
      if (idx >= 0) {
        hits += 1;
        lastUsed[idx] = t;
        continue;
      }
      faults += 1;
      const free = frames.indexOf(null);
      if (free >= 0) {
        frames[free] = page;
        loadedAt[free] = t;
        lastUsed[free] = t;
        continue;
      }
      let victim = 0;
      if (algorithm === "fifo") {
        victim = loadedAt.indexOf(Math.min(...loadedAt));
      } else if (algorithm === "lru") {
        victim = lastUsed.indexOf(Math.min(...lastUsed));
      } else {
        // optimal: furthest next use; never used again → evict first
        let furthest = -1;
        for (let f = 0; f < numFrames; f += 1) {
          const nextUse = pages.indexOf(frames[f] as number, t + 1);
          const dist = nextUse === -1 ? Infinity : nextUse;
          if (dist > furthest) {
            furthest = dist;
            victim = f;
          }
        }
      }
      frames[victim] = page;
      loadedAt[victim] = t;
      lastUsed[victim] = t;
    }
    return { faults, hits };
  };
  return {
    fifo: run("fifo"),
    lru: run("lru"),
    optimal: run("optimal"),
  };
}

function freshPageTable(): PageTableEntry[] {
  return Array.from({ length: NUM_PAGES }, (_, vpage) => ({
    vpage,
    frame: null,
    present: false,
    referenced: false,
    modified: false,
    shared: false,
    readonly: false,
    loadedAt: 0,
    lastUsed: 0,
  }));
}

function build(state: VmState): VmState {
  const pageNumbers = state.referenceString.map((a) => Math.floor(a / PAGE_SIZE));
  return { ...state, totals: simulateAll(pageNumbers, state.frames.length) };
}

export const vmEngine: SimulationEngine<VmState, VmAction> = {
  id: "vm",
  initialState() {
    const base: VmState = {
      frames: Array(3).fill(null),
      frameAge: Array(3).fill(0),
      pageTable: freshPageTable(),
      tlb: [],
      referenceString: [0x04, 0x24, 0x44, 0x04, 0x64, 0x04, 0x24, 0x84], // pages 0,2,4,0,6,0,2,8
      cursor: 0,
      algorithm: "fifo",
      totals: {
        fifo: { faults: 0, hits: 0 },
        lru: { faults: 0, hits: 0 },
        optimal: { faults: 0, hits: 0 },
      },
      currentStep: null,
      faultCount: 0,
      tlbHits: 0,
      clock: 0,
      eventLog: [
        {
          time: 0,
          kind: "info",
          label: "Paging lab ready — 3 frames, TLB of 2. Step through the reference string.",
          severity: "info",
        },
      ],
      error: null,
    };
    return build(base);
  },

  step(state, action: SimAction<VmAction>) {
    switch (action.type) {
      case "tick": {
        if (state.cursor >= state.referenceString.length) return state;
        const address = state.referenceString[state.cursor];
        const vpage = Math.floor(address / PAGE_SIZE);
        const offset = address % PAGE_SIZE;
        const events: SimEvent[] = [];
        const tlbEntry = state.tlb.find((e) => e.vpage === vpage);
        const tlbHit = Boolean(tlbEntry);
        const pte = state.pageTable[vpage];
        let frames = [...state.frames];
        let frameAge = [...state.frameAge];
        let pageTable = state.pageTable.map((p) => ({ ...p }));
        let tlb = state.tlb.map((e) => ({ ...e }));
        let fault = false;
        let evicted: number | null = null;
        let cowFault = false;

        if (pte.shared && pte.readonly) {
          // read access to a shared (COW) page: fine, map through.
        }

        if (!pte.present) {
          fault = true;
          const free = frames.indexOf(null);
          if (free >= 0) {
            frames[free] = vpage;
            frameAge[free] = state.clock;
            pageTable[vpage] = {
              ...pte,
              frame: free,
              present: true,
              referenced: true,
              loadedAt: state.clock,
              lastUsed: state.clock,
            };
            events.push({
              time: state.clock,
              kind: "page-fault",
              label: `PAGE FAULT: page ${vpage} not resident — loaded into free frame ${free}.`,
              severity: "warn",
            });
          } else {
            // choose victim per algorithm
            let victim = 0;
            if (state.algorithm === "fifo") {
              victim = frameAge.indexOf(Math.min(...frameAge));
            } else if (state.algorithm === "lru") {
              victim = pageTable.reduce(
                (best, p) =>
                  p.present && (best === -1 || p.lastUsed < pageTable[best].lastUsed) ? p.frame! : best,
                -1,
              );
              victim = victim === -1 ? 0 : victim;
            } else {
              // optimal over the remaining string
              const remaining = state.referenceString
                .slice(state.cursor + 1)
                .map((a) => Math.floor(a / PAGE_SIZE));
              let furthest = -1;
              for (let f = 0; f < frames.length; f += 1) {
                const page = frames[f];
                const nextUse = page === null ? Infinity : remaining.indexOf(page);
                const dist = nextUse === -1 ? Infinity : nextUse;
                if (dist > furthest) {
                  furthest = dist;
                  victim = f;
                }
              }
            }
            evicted = frames[victim] ?? null;
            const victimPte = evicted !== null ? pageTable[evicted] : null;
            if (victimPte && evicted !== null) {
              pageTable[evicted] = { ...victimPte, frame: null, present: false, referenced: false };
              tlb = tlb.filter((e) => e.vpage !== evicted);
            }
            frames[victim] = vpage;
            frameAge[victim] = state.clock;
            pageTable[vpage] = {
              ...pte,
              frame: victim,
              present: true,
              referenced: true,
              loadedAt: state.clock,
              lastUsed: state.clock,
            };
            events.push({
              time: state.clock,
              kind: "page-fault-evict",
              label:
                evicted !== null
                  ? `PAGE FAULT: page ${vpage} loaded into frame ${victim}; page ${evicted} EVICTED (${state.algorithm.toUpperCase()} victim).`
                  : `PAGE FAULT: page ${vpage} loaded.`,
              severity: "warn",
            });
          }
          // TLB update (evict LRU entry if full)
          tlb = tlb.filter((e) => e.vpage !== vpage);
          if (tlb.length >= TLB_SIZE) tlb = tlb.slice(tlb.length - TLB_SIZE + 1);
          tlb.push({ vpage, frame: pageTable[vpage].frame! });
        } else {
          pageTable[vpage] = { ...pte, referenced: true, lastUsed: state.clock };
          if (tlbHit && tlbEntry) {
            // refresh LRU position
            tlb = [...tlb.filter((e) => e.vpage !== vpage), { vpage, frame: tlbEntry.frame }];
          }
        }

        const step: VmStep = {
          address,
          vpage,
          offset,
          tlbHit,
          fault,
          evicted,
          cowFault,
        };
        return {
          ...state,
          cursor: state.cursor + 1,
          clock: state.clock + 1,
          frames,
          frameAge,
          pageTable,
          tlb,
          currentStep: step,
          faultCount: state.faultCount + (fault ? 1 : 0),
          tlbHits: state.tlbHits + (tlbHit ? 1 : 0),
          eventLog: [
            ...state.eventLog.slice(-98),
            {
              time: state.clock + 1,
              kind: "access",
              label: `Address 0x${address.toString(16).padStart(2, "0").toUpperCase()} → page ${vpage}, offset ${offset}: ${tlbHit ? "TLB HIT" : "TLB miss"}, ${fault ? "page fault" : "page-table hit"}.`,
              severity: fault ? "warn" : "info",
            },
            ...events,
          ],
        };
      }
      case "rewind": {
        if (state.cursor === 0) return state;
        // Honest simple rewind: reset the walk and replay cursor-1 steps.
        const target = state.cursor - 1;
        let s: VmState = {
          ...vmEngine.initialState(),
          referenceString: state.referenceString,
          algorithm: state.algorithm,
          frames: Array(state.frames.length).fill(null),
          frameAge: Array(state.frames.length).fill(0),
          eventLog: state.eventLog,
        };
        for (let i = 0; i < target; i += 1) s = vmEngine.step(s, { type: "tick" });
        return s;
      }
      case "set-frames": {
        const n = action.payload as number;
        if (!Number.isInteger(n) || n < 1 || n > 7) {
          return { ...state, error: "Frames must be a whole number between 1 and 7." };
        }
        return build({
          ...state,
          error: null,
          frames: Array(n).fill(null),
          frameAge: Array(n).fill(0),
          pageTable: freshPageTable(),
          tlb: [],
          cursor: 0,
          currentStep: null,
          faultCount: 0,
          tlbHits: 0,
          clock: 0,
          eventLog: [
            ...state.eventLog.slice(-98),
            { time: 0, kind: "config", label: `Frame count set to ${n} — walk reset.`, severity: "info" },
          ],
        });
      }
      case "set-string": {
        const parsed = parseReferenceString(String(action.payload ?? ""));
        if ("error" in parsed) return { ...state, error: parsed.error };
        return build({
          ...state,
          error: null,
          referenceString: parsed.addresses,
          pageTable: freshPageTable(),
          tlb: [],
          frames: state.frames.map(() => null),
          frameAge: state.frameAge.map(() => 0),
          cursor: 0,
          currentStep: null,
          faultCount: 0,
          tlbHits: 0,
          clock: 0,
          eventLog: [
            ...state.eventLog.slice(-98),
            { time: 0, kind: "config", label: `New reference string: ${parsed.addresses.join(", ")}.`, severity: "info" },
          ],
        });
      }
      case "set-algorithm": {
        const algorithm = action.payload as ReplacementAlgorithm;
        return {
          ...state,
          error: null,
          algorithm,
          cursor: 0,
          pageTable: freshPageTable(),
          tlb: [],
          frames: state.frames.map(() => null),
          frameAge: state.frameAge.map(() => 0),
          currentStep: null,
          faultCount: 0,
          tlbHits: 0,
          clock: 0,
          eventLog: [
            ...state.eventLog.slice(-98),
            { time: 0, kind: "config", label: `Replacement algorithm set to ${algorithm.toUpperCase()} — walk reset for a fair run.`, severity: "info" },
          ],
        };
      }
      case "access": {
        const address = action.payload as number;
        if (!Number.isInteger(address) || address < 0 || address >= PAGE_SIZE * NUM_PAGES) {
          return { ...state, error: `Address must be 0–${PAGE_SIZE * NUM_PAGES - 1}.` };
        }
        // Append the address and process it immediately.
        const withAccess: VmState = { ...state, referenceString: [...state.referenceString, address], error: null };
        return vmEngine.step(build(withAccess), { type: "tick" });
      }
      case "fork-cow": {
        const present = state.pageTable.filter((p) => p.present);
        return {
          ...state,
          error: null,
          pageTable: state.pageTable.map((p) =>
            p.present ? { ...p, shared: true, readonly: true } : p,
          ),
          eventLog: [
            ...state.eventLog.slice(-98),
            {
              time: state.clock,
              kind: "cow-fork",
              label: `fork() with copy-on-write: child shares all ${present.length} resident page(s) — marked read-only. No frames copied.`,
              severity: "ok",
            },
          ],
        };
      }
      case "write-page": {
        const vpage = action.payload as number;
        const pte = state.pageTable[vpage];
        if (!pte) return { ...state, error: `No such page ${vpage}.` };
        if (pte.shared && pte.readonly) {
          return {
            ...state,
            error: null,
            pageTable: state.pageTable.map((p) =>
              p.vpage === vpage ? { ...p, shared: false, readonly: false, modified: true } : p,
            ),
            eventLog: [
              ...state.eventLog.slice(-98),
              {
                time: state.clock,
                kind: "cow-fault",
                label: `COW FAULT on page ${vpage}: write to a shared page — private copy made (frame retained), page unshared.`,
                severity: "warn",
              },
            ],
          };
        }
        if (!pte.present) {
          return vmEngine.step(state, { type: "tick" }); // falls through to normal fault on next ref
        }
        return {
          ...state,
          error: null,
          pageTable: state.pageTable.map((p) =>
            p.vpage === vpage ? { ...p, modified: true } : p,
          ),
          eventLog: [
            ...state.eventLog.slice(-98),
            { time: state.clock, kind: "write", label: `Page ${vpage} written (private page — no fault).`, severity: "info" },
          ],
        };
      }
      case "reset":
        return vmEngine.initialState();
      default:
        return state;
    }
  },

  explain(state) {
    if (state.cursor >= state.referenceString.length && state.referenceString.length > 0) {
      return `Walk complete: ${state.faultCount} faults, ${state.tlbHits} TLB hits. Full-string totals — FIFO ${state.totals.fifo.faults}, LRU ${state.totals.lru.faults}, Optimal ${state.totals.optimal.faults} faults.`;
    }
    const step = state.currentStep;
    if (step) {
      return `Last access 0x${step.address.toString(16).toUpperCase()} → page ${step.vpage}: ${step.tlbHit ? "TLB hit" : "TLB miss"}, ${step.fault ? `page fault${step.evicted !== null ? ` (evicted page ${step.evicted})` : ""}` : "no fault"}. Faults: ${state.faultCount}.`;
    }
    return `${state.frames.length} frames · TLB ${state.tlb.length}/${TLB_SIZE} · press play to walk ${state.referenceString.length} references.`;
  },
};
