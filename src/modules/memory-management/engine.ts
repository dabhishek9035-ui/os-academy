import type { SimAction, SimEvent, SimulationEngine } from "@/types";

/**
 * Memory allocation engine — contiguous allocation on a 64-unit strip.
 *
 * Documented simplifications: single process per block, no paging (that is
 * the virtual-memory engine), compaction is instantaneous and free (real
 * compaction costs CPU time and often requires relocation support).
 */

export type FitStrategy = "first" | "best" | "worst";

export interface MemBlock {
  start: number;
  size: number;
  /** null = free hole */
  owner: string | null;
}

export interface MemoryState {
  memorySize: number;
  blocks: MemBlock[];
  strategy: FitStrategy;
  stats: { externalFragPercent: number; largestFree: number; failedAllocs: number };
  eventLog: SimEvent[];
  error: string | null;
}

export type MemoryAction =
  | "alloc"
  | "free"
  | "compact"
  | "set-strategy"
  | "reset";

export const MEMORY_SIZE = 64;

/** Pure helper: where would each strategy place `size` in `holes`? */
export function chooseHole(
  holes: { start: number; size: number }[],
  size: number,
  strategy: FitStrategy,
): { start: number; size: number } | null {
  const fits = holes.filter((h) => h.size >= size);
  if (fits.length === 0) return null;
  switch (strategy) {
    case "first":
      return fits[0];
    case "best":
      return fits.reduce((a, b) => (b.size < a.size ? b : a));
    case "worst":
      return fits.reduce((a, b) => (b.size > a.size ? b : a));
  }
}

/** Pure helper: logical→physical translation with base/limit protection. */
export function translate(
  base: number,
  limit: number,
  addr: number,
): { phys: number } | { fault: "segmentation" } {
  if (addr < 0 || addr >= limit) return { fault: "segmentation" };
  return { phys: base + addr };
}

function holesOf(blocks: MemBlock[]): { start: number; size: number }[] {
  return blocks.filter((b) => b.owner === null).map((b) => ({ start: b.start, size: b.size }));
}

function recomputeStats(state: MemoryState): MemoryState {
  const holes = holesOf(state.blocks);
  const totalFree = holes.reduce((a, h) => a + h.size, 0);
  const largestFree = holes.reduce((a, h) => Math.max(a, h.size), 0);
  const externalFragPercent =
    totalFree === 0 ? 0 : Math.round(((totalFree - largestFree) / totalFree) * 100);
  return {
    ...state,
    stats: { ...state.stats, externalFragPercent, largestFree },
  };
}

export function defaultMemoryBlocks(): MemBlock[] {
  // kernel, P1, hole, P2, hole — the classic fragmented picture
  return [
    { start: 0, size: 8, owner: "kernel" },
    { start: 8, size: 12, owner: "P1" },
    { start: 20, size: 8, owner: null }, // hole (was P2 before it left)
    { start: 28, size: 16, owner: "P2" },
    { start: 44, size: 12, owner: "P3" },
    { start: 56, size: 8, owner: null },
  ];
}

export const memoryEngine: SimulationEngine<MemoryState, MemoryAction> = {
  id: "memory",
  initialState() {
    const state: MemoryState = {
      memorySize: MEMORY_SIZE,
      blocks: defaultMemoryBlocks(),
      strategy: "first",
      stats: { externalFragPercent: 0, largestFree: 0, failedAllocs: 0 },
      eventLog: [
        {
          time: 0,
          kind: "info",
          label: "64-unit memory strip loaded with a fragmented scenario — allocate and watch the strategies differ.",
          severity: "info",
        },
      ],
      error: null,
    };
    return recomputeStats(state);
  },

  // Demo: free a stranded process, watch first-fit place two new ones into
  // the holes (leaving unusable slivers), free another, then compact.
  script: [
    { type: "free", payload: "P2" },
    { type: "alloc", payload: { pid: "C", size: 6 } },
    { type: "alloc", payload: { pid: "D", size: 10 } },
    { type: "free", payload: "P1" },
    { type: "compact" },
  ],

  step(state, action: SimAction<MemoryAction>) {
    switch (action.type) {
      case "alloc": {
        const { pid, size } = action.payload as { pid: string; size: number };
        if (!pid || !pid.trim()) return { ...state, error: "Allocation needs a process name." };
        if (!Number.isInteger(size) || size < 1 || size > state.memorySize) {
          return { ...state, error: `Size must be a whole number between 1 and ${state.memorySize}.` };
        }
        if (state.blocks.some((b) => b.owner === pid.trim())) {
          return { ...state, error: `${pid} already has memory — free it first.` };
        }
        const hole = chooseHole(holesOf(state.blocks), size, state.strategy);
        if (!hole) {
          const totalFree = holesOf(state.blocks).reduce((a, h) => a + h.size, 0);
          return recomputeStats({
            ...state,
            error: null,
            stats: { ...state.stats, failedAllocs: state.stats.failedAllocs + 1 },
            eventLog: [
              ...state.eventLog.slice(-98),
              {
                time: state.stats.failedAllocs + 1,
                kind: "alloc-failed",
                label:
                  totalFree >= size
                    ? `Allocation of ${size} for ${pid} FAILED: ${totalFree} units are free but scattered in small holes — external fragmentation. Compaction would help.`
                    : `Allocation of ${size} for ${pid} FAILED: not enough total memory.`,
                severity: "bad",
              },
            ],
          });
        }
        const blocks: MemBlock[] = [];
        for (const b of state.blocks) {
          if (b.start === hole.start && b.owner === null) {
            blocks.push({ start: b.start, size, owner: pid.trim() });
            if (b.size > size) blocks.push({ start: b.start + size, size: b.size - size, owner: null });
          } else {
            blocks.push(b);
          }
        }
        return recomputeStats({
          ...state,
          error: null,
          blocks,
          eventLog: [
            ...state.eventLog.slice(-98),
            {
              time: 0,
              kind: "alloc",
              label: `${pid} allocated ${size} units at ${hole.start} (${state.strategy}-fit chose a hole of ${hole.size}; ${hole.size - size} left over).`,
              severity: "ok",
            },
          ],
        });
      }
      case "free": {
        const pid = String(action.payload ?? "").trim();
        const target = state.blocks.find((b) => b.owner === pid);
        if (!target) return { ...state, error: `No allocation owned by “${pid}”.` };
        const blocks = state.blocks.map((b) =>
          b.owner === pid ? { ...b, owner: null } : b,
        );
        // coalesce adjacent free blocks
        const coalesced: MemBlock[] = [];
        for (const b of blocks) {
          const prev = coalesced[coalesced.length - 1];
          if (prev && prev.owner === null && b.owner === null && prev.start + prev.size === b.start) {
            coalesced[coalesced.length - 1] = { ...prev, size: prev.size + b.size };
          } else {
            coalesced.push(b);
          }
        }
        return recomputeStats({
          ...state,
          error: null,
          blocks: coalesced,
          eventLog: [
            ...state.eventLog.slice(-98),
            {
              time: 0,
              kind: "free",
              label: `${pid} freed ${target.size} units at ${target.start}; adjacent holes merged where possible.`,
              severity: "ok",
            },
          ],
        });
      }
      case "compact": {
        let cursor = 0;
        let moved = 0;
        const blocks: MemBlock[] = [];
        for (const b of state.blocks) {
          if (b.owner !== null) {
            if (b.start !== cursor) moved += 1;
            blocks.push({ ...b, start: cursor });
            cursor += b.size;
          }
        }
        const freeSize = state.memorySize - cursor;
        if (freeSize > 0) blocks.push({ start: cursor, size: freeSize, owner: null });
        return recomputeStats({
          ...state,
          error: null,
          blocks,
          eventLog: [
            ...state.eventLog.slice(-98),
            {
              time: 0,
              kind: "compact",
              label: `Compacted: ${moved} allocation(s) slid down; one free hole of ${freeSize} units remains at the end. (Real compaction costs CPU time — the model makes it free.)`,
              severity: "ok",
            },
          ],
        });
      }
      case "set-strategy": {
        const strategy = action.payload as FitStrategy;
        return {
          ...state,
          error: null,
          strategy,
          eventLog: [
            ...state.eventLog.slice(-98),
            { time: 0, kind: "config", label: `Placement strategy set to ${strategy}-fit.`, severity: "info" },
          ],
        };
      }
      case "reset":
        return memoryEngine.initialState();
      default:
        return state;
    }
  },

  explain(state) {
    const holes = holesOf(state.blocks);
    const totalFree = holes.reduce((a, h) => a + h.size, 0);
    if (holes.length === 0) return "Memory fully allocated — no free space left.";
    return `${state.strategy}-fit · ${totalFree} units free in ${holes.length} hole(s); largest hole ${state.stats.largestFree} · external fragmentation ${state.stats.externalFragPercent}%.`;
  },
};
