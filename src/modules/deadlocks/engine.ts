import type { SimAction, SimEvent, SimulationEngine } from "@/types";

/**
 * Deadlock engines: resource-allocation-graph lab + Banker's algorithm lab.
 *
 * Model notes (documented simplifications):
 *  - RAG: resources have unit counts; the wait-for graph used for cycle
 *    detection links a process to every process holding something it waits
 *    for. With single-unit resources a cycle IS a deadlock (sufficient);
 *    with multi-unit resources detection uses the standard reduction
 *    algorithm instead (a cycle is only necessary, not sufficient).
 *  - Banker's: Matrices as in Silberschatz's classic 5-process example;
 *    requests are granted only when the resulting state is SAFE.
 */

// ---------------------------------------------------------------------------
// RAG / detection engine
// ---------------------------------------------------------------------------

export interface RagResource {
  id: string;
  units: number;
}

export interface RagState {
  processes: string[];
  resources: RagResource[];
  /** held[pid][rid] = units held */
  held: Record<string, Record<string, number>>;
  requests: { pid: string; rid: string; units: number }[];
  analysis: { deadlocked: string[]; reason: string } | null;
  eventLog: SimEvent[];
  error: string | null;
}

export type RagAction =
  | "add-process"
  | "add-resource"
  | "request"
  | "grant"
  | "deny"
  | "detect"
  | "reset";

/**
 * Deadlock detection with multi-unit resources (standard reduction):
 * available = total − held; repeatedly finish any process whose outstanding
 * request ≤ available; whoever can never finish is deadlocked.
 */
export function detectDeadlock(state: {
  processes: string[];
  resources: RagResource[];
  held: Record<string, Record<string, number>>;
  requests: { pid: string; rid: string; units: number }[];
}): string[] {
  const total: Record<string, number> = {};
  for (const r of state.resources) total[r.id] = r.units;
  const heldOf = (pid: string) => state.held[pid] ?? {};
  const available: Record<string, number> = { ...total };
  for (const pid of state.processes) {
    for (const [rid, units] of Object.entries(heldOf(pid))) {
      available[rid] = (available[rid] ?? 0) - units;
    }
  }
  const outstanding = new Map<string, Record<string, number>>();
  for (const req of state.requests) {
    const cur = outstanding.get(req.pid) ?? {};
    cur[req.rid] = (cur[req.rid] ?? 0) + req.units;
    outstanding.set(req.pid, cur);
  }
  const finished = new Set<string>();
  let progress = true;
  while (progress) {
    progress = false;
    for (const pid of state.processes) {
      if (finished.has(pid)) continue;
      const need = outstanding.get(pid) ?? {};
      const satisfiable = Object.entries(need).every(
        ([rid, units]) => (available[rid] ?? 0) >= units,
      );
      if (satisfiable) {
        for (const [rid, units] of Object.entries(heldOf(pid))) {
          available[rid] = (available[rid] ?? 0) + units;
        }
        finished.add(pid);
        progress = true;
      }
    }
  }
  return state.processes.filter((p) => !finished.has(p));
}

export const initialRagState = (): RagState => ({
  processes: ["P1", "P2"],
  resources: [
    { id: "R1", units: 1 },
    { id: "R2", units: 1 },
  ],
  held: { P1: { R1: 1 }, P2: { R2: 1 } },
  requests: [
    { pid: "P1", rid: "R2", units: 1 },
    { pid: "P2", rid: "R1", units: 1 },
  ],
  analysis: null,
  eventLog: [
    {
      time: 0,
      kind: "info",
      label: "Classic scenario loaded: P1 holds R1 and wants R2; P2 holds R2 and wants R1.",
      severity: "info",
    },
  ],
  error: null,
});

export const ragEngine: SimulationEngine<RagState, RagAction> = {
  id: "rag",
  initialState: initialRagState,

  step(state, action: SimAction<RagAction>) {
    switch (action.type) {
      case "add-process": {
        const id = String(action.payload ?? "").trim() || `P${state.processes.length + 1}`;
        if (state.processes.includes(id)) return { ...state, error: `Process ${id} exists.` };
        return { ...state, error: null, processes: [...state.processes, id], held: { ...state.held, [id]: {} } };
      }
      case "add-resource": {
        const { id, units } = action.payload as { id?: string; units?: number };
        const rid = (id ?? "").trim() || `R${state.resources.length + 1}`;
        const u = units ?? 1;
        if (!Number.isInteger(u) || u < 1) return { ...state, error: "Resource units must be ≥ 1." };
        if (state.resources.some((r) => r.id === rid)) return { ...state, error: `Resource ${rid} exists.` };
        return { ...state, error: null, resources: [...state.resources, { id: rid, units: u }] };
      }
      case "request": {
        const { pid, rid, units } = action.payload as { pid: string; rid: string; units: number };
        if (!state.processes.includes(pid)) return { ...state, error: `Unknown process ${pid}.` };
        const res = state.resources.find((r) => r.id === rid);
        if (!res) return { ...state, error: `Unknown resource ${rid}.` };
        if (!Number.isInteger(units) || units < 1 || units > res.units) {
          return { ...state, error: `Units must be 1–${res.units}.` };
        }
        return {
          ...state,
          error: null,
          analysis: null,
          requests: [...state.requests, { pid, rid, units }],
          eventLog: [
            ...state.eventLog.slice(-98),
            { time: 0, kind: "request", label: `${pid} requests ${units} × ${rid} (pending).`, severity: "info" },
          ],
        };
      }
      case "grant": {
        const { pid, rid, units } = action.payload as { pid: string; rid: string; units: number };
        const available =
          (state.resources.find((r) => r.id === rid)?.units ?? 0) -
          state.processes.reduce((a, p) => a + (state.held[p]?.[rid] ?? 0), 0);
        if (units > available) {
          return { ...state, error: `Cannot grant ${units} × ${rid}: only ${available} free.` };
        }
        return {
          ...state,
          error: null,
          analysis: null,
          held: { ...state.held, [pid]: { ...(state.held[pid] ?? {}), [rid]: (state.held[pid]?.[rid] ?? 0) + units } },
          requests: state.requests.filter(
            (r) => !(r.pid === pid && r.rid === rid && r.units === units),
          ),
          eventLog: [
            ...state.eventLog.slice(-98),
            { time: 0, kind: "grant", label: `Granted ${units} × ${rid} to ${pid}.`, severity: "ok" },
          ],
        };
      }
      case "deny": {
        const pid = String(action.payload ?? "");
        return {
          ...state,
          error: null,
          requests: state.requests.filter((r) => r.pid !== pid),
          eventLog: [
            ...state.eventLog.slice(-98),
            { time: 0, kind: "deny", label: `${pid}'s pending requests were denied/withdrawn.`, severity: "warn" },
          ],
        };
      }
      case "detect": {
        const deadlocked = detectDeadlock(state);
        const reason =
          deadlocked.length === 0
            ? "No deadlock: every process's outstanding request can eventually be satisfied (reduction succeeds)."
            : `Deadlock: ${deadlocked.join(", ")} can never finish — their requests form a cycle of waiting that no amount of reduction breaks.`;
        return {
          ...state,
          error: null,
          analysis: { deadlocked, reason },
          eventLog: [
            ...state.eventLog.slice(-98),
            { time: 0, kind: "detect", label: reason, severity: deadlocked.length === 0 ? "ok" : "bad" },
          ],
        };
      }
      case "reset":
        return ragEngine.initialState();
      default:
        return state;
    }
  },

  explain(state) {
    if (state.analysis) return state.analysis.reason;
    const pending = state.requests.length;
    return `${state.processes.length} processes, ${state.resources.length} resources, ${pending} pending request(s) — press DETECT to analyze.`;
  },
};

// ---------------------------------------------------------------------------
// Banker's algorithm engine
// ---------------------------------------------------------------------------

export interface BankersState {
  processNames: string[];
  resourceNames: string[];
  allocation: number[][];
  maxClaim: number[][];
  available: number[];
  lastRequest: {
    pid: string;
    vector: number[];
    granted: boolean;
    safeSequence: string[];
    reason: string;
  } | null;
  eventLog: SimEvent[];
  error: string | null;
}

export type BankersAction =
  | "set-cell"
  | "set-available"
  | "request"
  | "safety-check"
  | "reset";

export const TEXTBOOK_STATE = {
  processNames: ["P1", "P2", "P3", "P4", "P5"],
  resourceNames: ["A", "B", "C"],
  allocation: [
    [0, 1, 0],
    [2, 0, 0],
    [3, 0, 2],
    [2, 1, 1],
    [0, 0, 2],
  ],
  maxClaim: [
    [7, 5, 3],
    [3, 2, 2],
    [9, 0, 2],
    [2, 2, 2],
    [4, 3, 3],
  ],
  available: [3, 3, 2],
};

/**
 * Banker's safety algorithm (pure): returns a safe sequence or null.
 * need = max − allocation; repeatedly find an unfinished process whose
 * need ≤ work; finish it and release its allocation.
 */
export function safetySequence(
  allocation: number[][],
  maxClaim: number[][],
  available: number[],
): string[] | null {
  const n = allocation.length;
  const need = allocation.map((row, i) => row.map((v, j) => maxClaim[i][j] - v));
  const work = [...available];
  const finished: boolean[] = Array(n).fill(false);
  const sequence: string[] = [];
  let progress = true;
  while (progress) {
    progress = false;
    for (let i = 0; i < n; i += 1) {
      if (finished[i]) continue;
      if (need[i].every((v, j) => v <= work[j])) {
        for (let j = 0; j < work.length; j += 1) work[j] += allocation[i][j];
        finished[i] = true;
        sequence.push(`P${i + 1}`);
        progress = true;
      }
    }
  }
  return finished.every(Boolean) ? sequence : null;
}

export const bankersEngine: SimulationEngine<BankersState, BankersAction> = {
  id: "bankers",
  initialState() {
    return {
      ...TEXTBOOK_STATE,
      allocation: TEXTBOOK_STATE.allocation.map((r) => [...r]),
      maxClaim: TEXTBOOK_STATE.maxClaim.map((r) => [...r]),
      available: [...TEXTBOOK_STATE.available],
      lastRequest: null,
      eventLog: [
        {
          time: 0,
          kind: "info",
          label: "Textbook state loaded (Silberschatz's 5-process example). Available A=3 B=3 C=2.",
          severity: "info",
        },
      ],
      error: null,
    };
  },

  step(state, action: SimAction<BankersAction>) {
    switch (action.type) {
      case "set-cell": {
        const { matrix, i, j, value } = action.payload as {
          matrix: "allocation" | "maxClaim";
          i: number;
          j: number;
          value: number;
        };
        if (!Number.isInteger(value) || value < 0) return { ...state, error: "Value must be a whole number ≥ 0." };
        const copy = state[matrix].map((r) => [...r]);
        if (!copy[i]) return { ...state, error: "No such row." };
        copy[i][j] = value;
        if (matrix === "maxClaim" && value < state.allocation[i][j]) {
          return { ...state, error: `maxClaim must be ≥ allocation (currently ${state.allocation[i][j]}).` };
        }
        if (matrix === "allocation" && value > state.maxClaim[i][j]) {
          return { ...state, error: `allocation cannot exceed maxClaim (${state.maxClaim[i][j]}).` };
        }
        return { ...state, error: null, [matrix]: copy, lastRequest: null } as BankersState;
      }
      case "set-available": {
        const { j, value } = action.payload as { j: number; value: number };
        if (!Number.isInteger(value) || value < 0) return { ...state, error: "Value must be ≥ 0." };
        const available = [...state.available];
        available[j] = value;
        return { ...state, error: null, available, lastRequest: null };
      }
      case "request": {
        const { pid, vector } = action.payload as { pid: string; vector: number[] };
        const pi = state.processNames.indexOf(pid);
        if (pi < 0) return { ...state, error: `Unknown process ${pid}.` };
        if (vector.length !== state.resourceNames.length || vector.some((v) => !Number.isInteger(v) || v < 0)) {
          return { ...state, error: `Request needs ${state.resourceNames.length} whole numbers ≥ 0.` };
        }
        const need = state.allocation[pi].map((v, j) => state.maxClaim[pi][j] - v);
        for (let j = 0; j < vector.length; j += 1) {
          if (vector[j] > need[j]) {
            const granted = false;
            return {
              ...state,
              error: null,
              lastRequest: {
                pid,
                vector,
                granted,
                safeSequence: [],
                reason: `DENIED immediately: ${pid} requests ${vector[j]} × ${state.resourceNames[j]} but its remaining claim (need) is only ${need[j]}.`,
              },
              eventLog: [
                ...state.eventLog.slice(-98),
                { time: 0, kind: "deny", label: `Request exceeded max claim — denied without running the safety check.`, severity: "bad" },
              ],
            };
          }
          if (vector[j] > state.available[j]) {
            return {
              ...state,
              error: null,
              lastRequest: {
                pid,
                vector,
                granted: false,
                safeSequence: [],
                reason: `Cannot grant now: ${pid} requests ${vector[j]} × ${state.resourceNames[j]} but only ${state.available[j]} are available. (Pretend-allocation impossible.)`,
              },
              eventLog: [
                ...state.eventLog.slice(-98),
                { time: 0, kind: "deny", label: `Not enough available resources — request deferred.`, severity: "warn" },
              ],
            };
          }
        }
        // pretend-allocate
        const alloc = state.allocation.map((r) => [...r]);
        const avail = [...state.available];
        for (let j = 0; j < vector.length; j += 1) {
          alloc[pi][j] += vector[j];
          avail[j] -= vector[j];
        }
        const seq = safetySequence(alloc, state.maxClaim, avail);
        if (seq) {
          return {
            ...state,
            error: null,
            allocation: alloc,
            available: avail,
            lastRequest: {
              pid,
              vector,
              granted: true,
              safeSequence: seq,
              reason: `GRANTED: pretend-allocated, and the resulting state is SAFE (sequence: ${seq.join(" → ")}).`,
            },
            eventLog: [
              ...state.eventLog.slice(-98),
              { time: 0, kind: "grant", label: `Request ${vector.join(",")} from ${pid} granted — safe sequence ${seq.join(" → ")}.`, severity: "ok" },
            ],
          };
        }
        return {
          ...state,
          error: null,
          lastRequest: {
            pid,
            vector,
            granted: false,
            safeSequence: [],
            reason: `DENIED: pretend-allocating would leave the state UNSAFE (no safe sequence) — P must wait, even though the resources are technically available.`,
          },
          eventLog: [
            ...state.eventLog.slice(-98),
            { time: 0, kind: "deny", label: `Request from ${pid} would create an unsafe state — denied by Banker's algorithm.`, severity: "bad" },
          ],
        };
      }
      case "safety-check": {
        const seq = safetySequence(state.allocation, state.maxClaim, state.available);
        return {
          ...state,
          error: null,
          lastRequest: {
            pid: "(check)",
            vector: [],
            granted: seq !== null,
            safeSequence: seq ?? [],
            reason: seq
              ? `The current state is SAFE — one valid sequence: ${seq.join(" → ")}.`
              : "The current state is UNSAFE — no completion sequence exists.",
          },
          eventLog: [
            ...state.eventLog.slice(-98),
            {
              time: 0,
              kind: "safety",
              label: seq ? `Safety check: SAFE (${seq.join(" → ")}).` : "Safety check: UNSAFE.",
              severity: seq ? "ok" : "bad",
            },
          ],
        };
      }
      case "reset":
        return bankersEngine.initialState();
      default:
        return state;
    }
  },

  explain(state) {
    if (state.lastRequest) return state.lastRequest.reason;
    return `Available: ${state.resourceNames.map((n, j) => `${n}=${state.available[j]}`).join(" ")} — run a safety check or try a request.`;
  },
};
