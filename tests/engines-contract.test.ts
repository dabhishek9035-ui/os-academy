/**
 * Engine contract tests — the Phase 0 safety net.
 *
 * Every simulation engine must satisfy, for every action it declares:
 *   1. initialState() returns a fresh object each call (no shared references).
 *   2. step() never mutates its input (proven by deep-freezing the state).
 *   3. step() is deterministic: same state + same action → deep-equal output.
 *   4. explain(state) is a non-empty string for every reachable state.
 *   5. Replaying the same scripted action sequence reproduces the same
 *      trajectory of states.
 *
 * These tests intentionally run engines outside React so that regressions in
 * the algorithms are caught independent of any lab UI.
 */
import { describe, expect, it } from "vitest";
import type { SimulationEngine, SimAction } from "@/types";

import { capstoneEngine } from "@/modules/capstone/engine";
import { schedulingEngine } from "@/modules/scheduling/engine";
import { ragEngine, bankersEngine } from "@/modules/deadlocks/engine";
import { filesystemEngine } from "@/modules/filesystems/engine";
import { interruptsEngine } from "@/modules/interrupts/engine";
import {
  syscallEngine,
  protectionEngine,
} from "@/modules/syscalls-security/engine";
import {
  raceEngine,
  boundedBufferEngine,
} from "@/modules/threads-concurrency/engine";
import { vmEngine } from "@/modules/virtual-memory/engine";
import {
  readersWritersEngine,
  diningEngine,
} from "@/modules/synchronization/engine";
import { bootEngine } from "@/modules/intro-computers-os/boot-engine";
import { computerEngine } from "@/modules/intro-computers-os/computer-engine";
import { diskEngine } from "@/modules/io/disk-engine";
import { ioEngine } from "@/modules/io/io-engine";
import { processesEngine } from "@/modules/processes/engine";
import { memoryEngine } from "@/modules/memory-management/engine";
import {
  virtualizationEngine,
  multiprocEngine,
  rtEngine,
} from "@/modules/virtualization/engine";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const key of Object.getOwnPropertyNames(value)) {
      deepFreeze((value as Record<string, unknown>)[key]);
    }
  }
  return value;
}

type AnyEngine = SimulationEngine<unknown, string>;

interface EngineSpec {
  engine: AnyEngine;
  /** One valid sample per declared action type. */
  actions: SimAction[];
  /** Extra scripted actions for the replay test (defaults to actions). */
  script?: SimAction[];
  /** Ticks appended to the script to exercise time-driven behaviour. */
  scriptTicks?: number;
}

const a = (type: string, payload?: unknown): SimAction =>
  ({ type, payload } as SimAction);

// ---------------------------------------------------------------------------
// Per-engine action manifests (payloads mirror what the labs dispatch)
// ---------------------------------------------------------------------------

const ENGINES: EngineSpec[] = [
  {
    engine: capstoneEngine as unknown as AnyEngine,
    actions: [a("tick"), a("jump", 2), a("reset")],
  },
  {
    engine: schedulingEngine as unknown as AnyEngine,
    actions: [
      a("set-algorithm", "rr"),
      a("set-quantum", 4),
      a("set-priority-mode", "preemptive"),
      a("add-process"),
      a("update-process", { pid: "P1", field: "burst", value: 6 }),
      a("remove-process", "P4"),
      a("load-preset", "convoy"),
      a("tick"),
      a("rewind"),
      a("reset-cursor"),
      a("reset"),
    ],
    scriptTicks: 12,
  },
  {
    engine: ragEngine as unknown as AnyEngine,
    actions: [
      a("add-process", "P9"),
      a("add-resource", { id: "R9", units: 1 }),
      a("request", { pid: "P1", rid: "R1", units: 1 }),
      a("grant", { pid: "P1", rid: "R1", units: 1 }),
      a("deny", "P1"),
      a("detect"),
      a("reset"),
    ],
  },
  {
    engine: bankersEngine as unknown as AnyEngine,
    actions: [
      a("set-cell", { matrix: "allocation", i: 0, j: 0, value: 1 }),
      a("set-available", { j: 0, value: 3 }),
      a("request", { pid: "P1", vector: [0, 1, 0] }),
      a("safety-check"),
      a("reset"),
    ],
  },
  {
    engine: filesystemEngine as unknown as AnyEngine,
    actions: [
      a("create", { path: "/contract", sizeBlocks: 1 }),
      a("read", "/contract"),
      a("append", { path: "/contract", sizeBlocks: 1 }),
      a("chmod", { path: "/contract", perms: "rw-r--r--" }),
      a("delete", "/contract"),
      a("set-allocation", "linked"),
      a("reset"),
    ],
  },
  {
    engine: interruptsEngine as unknown as AnyEngine,
    actions: [
      a("tick"),
      a("raise-timer"),
      a("raise-io"),
      a("raise-exception"),
      a("toggle-source", { source: "io", enabled: false }),
      a("set-polling", true),
      a("load-program", []),
      a("reset-pc"),
      a("reset"),
    ],
    scriptTicks: 10,
  },
  {
    engine: syscallEngine as unknown as AnyEngine,
    actions: [
      a("tick"),
      a("call", { name: "open", args: '"/tmp/contract"' }),
      a("reset"),
    ],
    scriptTicks: 6,
  },
  {
    engine: protectionEngine as unknown as AnyEngine,
    actions: [
      a("chmod", { name: "/etc/config", perms: "rw-r--rw-" }),
      a("su", "bob"),
      a("attempt", { target: "/etc/config", operation: "read" }),
      a("memory-access", { pid: 7, addr: 50 }),
      a("set-mode", "kernel"),
      a("reset"),
    ],
  },
  {
    engine: raceEngine as unknown as AnyEngine,
    actions: [
      a("tick"),
      a("run-to-end"),
      a("set-schedule", "round-robin"),
      a("set-iterations", 3),
      a("toggle-sync"),
      a("reset"),
    ],
    scriptTicks: 8,
  },
  {
    engine: boundedBufferEngine as unknown as AnyEngine,
    actions: [
      a("tick"),
      a("run-to-end"),
      a("add-producer"),
      a("add-consumer"),
      a("set-capacity", 2),
      a("reset"),
    ],
    scriptTicks: 10,
  },
  {
    engine: vmEngine as unknown as AnyEngine,
    actions: [
      a("tick"),
      a("rewind"),
      a("set-frames", 4),
      a("set-string", "1,2,1,3"),
      a("set-algorithm", "lru"),
      a("access", 42),
      a("fork-cow"),
      a("write-page", 0),
      a("reset"),
    ],
    scriptTicks: 10,
  },
  {
    engine: readersWritersEngine as unknown as AnyEngine,
    actions: [
      a("tick"),
      a("add-reader"),
      a("add-writer"),
      a("set-strategy", "writer-priority"),
      a("reset"),
    ],
    scriptTicks: 12,
  },
  {
    engine: diningEngine as unknown as AnyEngine,
    actions: [
      a("tick"),
      a("set-strategy", "hierarchy"),
      a("reset"),
    ],
    scriptTicks: 12,
  },
  {
    engine: bootEngine as unknown as AnyEngine,
    actions: [a("tick"), a("reset")],
    scriptTicks: 20,
  },
  {
    engine: computerEngine as unknown as AnyEngine,
    actions: [
      a("tick"),
      a("select", "disk"),
      a("send", { from: "keyboard", to: "cpu" }),
      a("toggle-os"),
      a("reset"),
    ],
    scriptTicks: 8,
  },
  {
    engine: diskEngine as unknown as AnyEngine,
    actions: [
      a("set-algorithm", "sstf"),
      a("add-request", 150),
      a("remove-request", 0),
      a("set-head", 40),
      a("set-direction", "down"),
      a("tick"),
      a("rewind"),
      a("reset"),
    ],
    scriptTicks: 10,
  },
  {
    engine: processesEngine as unknown as AnyEngine,
    actions: [
      a("tick"),
      a("create", { name: "contract", burst: 3 }),
      a("fork", 1),
      a("exec", { pid: 1, name: "sh" }),
      a("wait", { pid: 1 }),
      a("kill", { pid: 2 }),
      a("block", { pid: 1, reason: "io" }),
      a("resume", { pid: 1 }),
      a("set-quantum", 2),
      a("reset"),
    ],
    scriptTicks: 12,
  },
  {
    engine: ioEngine as unknown as AnyEngine,
    actions: [
      a("tick"),
      a("set-method", "dma"),
      a("set-blocks", 3),
      a("reset"),
    ],
    scriptTicks: 10,
  },
  {
    engine: memoryEngine as unknown as AnyEngine,
    actions: [
      a("alloc", { pid: "CT", size: 4 }),
      a("free", "CT"),
      a("compact"),
      a("set-strategy", "best"),
      a("reset"),
    ],
  },
  {
    engine: virtualizationEngine as unknown as AnyEngine,
    actions: [
      a("tick"),
      a("set-mode", "container"),
      a("set-vcpu-load", { id: "vCPU0", target: 80 }),
      a("reset"),
    ],
    scriptTicks: 10,
  },
  {
    engine: multiprocEngine as unknown as AnyEngine,
    actions: [
      a("add-task", { name: "contract", period: 4, wcet: 2 }),
      a("tick"),
      a("run-to-end"),
      a("reset"),
    ],
    scriptTicks: 8,
  },
  {
    engine: rtEngine as unknown as AnyEngine,
    actions: [
      a("add-task", { name: "contract", period: 4, wcet: 2 }),
      a("remove-task"),
      a("reset"),
    ],
  },
];

// ---------------------------------------------------------------------------
// The contract
// ---------------------------------------------------------------------------

describe.each(ENGINES.map((s) => [s.engine.id, s] as const))(
  "engine contract: %s",
  (_id, spec) => {
    const { engine, actions, script, scriptTicks = 0 } = spec;

    it("initialState() returns a fresh object each call", () => {
      const first = engine.initialState();
      const second = engine.initialState();
      expect(second).toEqual(first);
      expect(second).not.toBe(first);

      // Mutating one instance must not affect the other (no shared arrays).
      const probe = structuredClone(second);
      mutateArrays(first);
      expect(second).toEqual(probe);
    });

    it("step() never mutates its input state (frozen-state probe)", () => {
      for (const action of actions) {
        const frozen = deepFreeze(engine.initialState());
        expect(() => engine.step(frozen, action)).not.toThrow();
      }
    });

    it("step() is deterministic for the same state and action", () => {
      for (const action of actions) {
        const s1 = deepFreeze(engine.initialState());
        const s2 = deepFreeze(engine.initialState());
        const out1 = engine.step(s1, action);
        const out2 = engine.step(s2, action);
        expect(out2).toEqual(out1);
      }
    });

    it("explain() is a non-empty string for every reachable state", () => {
      let state = engine.initialState();
      expect(String(engine.explain(state)).length).toBeGreaterThan(0);
      for (const action of actions) {
        state = engine.step(state, action);
        expect(state).toBeDefined();
        const explanation = engine.explain(state);
        expect(typeof explanation).toBe("string");
        expect(explanation.length).toBeGreaterThan(0);
      }
    });

    it("replaying a scripted run reproduces the same trajectory", () => {
      const sequence: SimAction[] = [
        ...(script ?? actions),
        ...Array.from({ length: scriptTicks }, () => a("tick")),
      ];
      // Run the script twice, on frozen states throughout.
      const run = () => {
        const states: unknown[] = [];
        let state = deepFreeze(engine.initialState());
        for (const action of sequence) {
          state = engine.step(state, action);
          states.push(state);
          state = deepFreeze(state);
        }
        return states;
      };
      const first = run();
      const second = run();
      expect(second).toEqual(first);
    });

    it("declares a playable demo script or a tick-driven step (Play always works)", () => {
      const e = engine as SimulationEngine<unknown, string> & {
        script?: SimAction[];
        done?: (s: unknown) => boolean;
      };
      const hasScript = Array.isArray(e.script) && e.script.length > 0;
      // Tick-driven engines must react to tick from the initial state.
      const reactsToTick = (() => {
        const frozen = deepFreeze(engine.initialState());
        return engine.step(frozen, a("tick")) !== frozen;
      })();
      expect(hasScript || reactsToTick).toBe(true);
      if (hasScript) {
        // Every scripted action must be valid on the state it reaches.
        let s = deepFreeze(engine.initialState());
        for (const action of e.script!) {
          const next = engine.step(s, action);
          expect(next).not.toBe(s);
          s = deepFreeze(next);
        }
      }
      if (e.done) {
        expect(typeof e.done(engine.initialState())).toBe("boolean");
      }
    });
  },
);

/** Push/spell mutation probe: touch every array so shared refs surface. */
function mutateArrays(state: unknown): void {
  if (Array.isArray(state)) {
    try {
      state.push(undefined);
      state.pop();
    } catch {
      /* frozen — fine */
    }
    for (const item of state) mutateArrays(item);
    return;
  }
  if (state && typeof state === "object") {
    for (const value of Object.values(state)) mutateArrays(value);
  }
}
