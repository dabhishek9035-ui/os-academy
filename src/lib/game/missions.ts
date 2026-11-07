import type { SchedulingState } from "@/modules/scheduling/engine";
import type { VmState } from "@/modules/virtual-memory/engine";
import type { BankersState } from "@/modules/deadlocks/engine";
import type { RaceState } from "@/modules/threads-concurrency/engine";
import type { DiskState } from "@/modules/io/disk-engine";
import type { InterruptState } from "@/modules/interrupts/engine";

/**
 * Sim missions — optional objectives evaluated from engine state snapshots.
 * Engines stay pure and React-free; missions are data + predicates here.
 * Each mission grants XP once (game store keeps the ledger).
 */

export interface SimMission<S = unknown> {
  id: string;
  title: string;
  desc: string;
  /** Optional nudge shown before the objective ("Load the Convoy preset"). */
  setup?: string;
  /** xp reward (default 40) */
  xp?: number;
  evaluate: (state: S) => boolean;
}

interface MissionSet {
  simId: string;
  missions: SimMission[];
}

export const MISSION_SETS: MissionSet[] = [
  {
    simId: "scheduling-lab",
    missions: [
      {
        id: "sched-convoy",
        title: "Bust the Convoy",
        desc: "Load the Convoy preset, then find an algorithm whose average waiting time drops below 5.",
        setup: "Load the “Convoy effect” preset, then switch algorithms.",
        xp: 50,
        evaluate: (s) => {
          const st = s as SchedulingState;
          return st.algorithm !== "fcfs" && st.inputs.length === 4 && st.inputs[0]?.burst === 20 && st.result.averages.waiting < 5;
        },
      },
      {
        id: "sched-zero-idle",
        title: "Zero Idle Ticks",
        desc: "Pick any preset and algorithm that keeps CPU utilization at 100%.",
        evaluate: (s) => {
          const st = s as SchedulingState;
          return st.result.averages.cpuUtilization === 1 && st.cursor >= st.result.timeline.length;
        },
      },
    ],
  },
  {
    simId: "paging-lab",
    missions: [
      {
        id: "vm-fault-economist",
        title: "Fault Economist",
        desc: "Finish a full walk of the default string with 3 or fewer page faults. More frames help…",
        evaluate: (s) => {
          const st = s as VmState;
          return st.cursor >= st.referenceString.length && st.referenceString.length >= 8 && st.faultCount <= 3;
        },
      },
      {
        id: "vm-tlb-ace",
        title: "TLB Ace",
        desc: "Collect 2 TLB hits in a single walk.",
        evaluate: (s) => (s as VmState).tlbHits >= 2,
      },
    ],
  },
  {
    simId: "bankers-lab",
    missions: [
      {
        id: "bankers-safe-passage",
        title: "Safe Passage",
        desc: "Grant P2's request for (1, 0, 2) — the pretend-allocation must stay SAFE.",
        evaluate: (s) => {
          const st = s as BankersState;
          return Boolean(
            st.lastRequest?.granted && st.lastRequest.pid === "P2" && st.lastRequest.vector.join(",") === "1,0,2",
          );
        },
      },
      {
        id: "bankers-gatekeeper",
        title: "Gatekeeper",
        desc: "Deny a request because it would make the state UNSAFE.",
        evaluate: (s) => {
          const st = s as BankersState;
          return Boolean(st.lastRequest && !st.lastRequest.granted && /UNSAFE/i.test(st.lastRequest.reason));
        },
      },
    ],
  },
  {
    simId: "race-condition-lab",
    missions: [
      {
        id: "race-lost-update",
        title: "Break It On Purpose",
        desc: "Unsynchronized, run to the end — and witness the lost update (counter < expected).",
        evaluate: (s) => {
          const st = s as RaceState;
          return st.unsynchronized && st.threads.every((t) => t.done) && st.counter < st.expectedIncrements;
        },
      },
      {
        id: "race-fix",
        title: "Fix It With A Mutex",
        desc: "Synchronized, run to the end — counter must equal the expected total.",
        evaluate: (s) => {
          const st = s as RaceState;
          return !st.unsynchronized && st.threads.every((t) => t.done) && st.counter === st.expectedIncrements;
        },
      },
    ],
  },
  {
    simId: "disk-scheduling-lab",
    missions: [
      {
        id: "disk-under-400",
        title: "Efficient Head",
        desc: "Service the whole classic queue (head 53) with total movement under 400 cylinders.",
        evaluate: (s) => {
          const st = s as DiskState;
          return st.requests.length === 8 && st.schedule.movement < 400;
        },
      },
    ],
  },
  {
    simId: "interrupt-lab",
    missions: [
      {
        id: "irq-fast-hands",
        title: "Fast Hands",
        desc: "Handle a timer interrupt with total recorded latency of exactly 1 tick.",
        evaluate: (s) => {
          const st = s as InterruptState;
          return st.stats.interruptsHandled >= 1 && st.stats.totalLatency === st.stats.interruptsHandled;
        },
      },
    ],
  },
];

export const MISSIONS_BY_SIM: Record<string, SimMission[]> = Object.fromEntries(
  MISSION_SETS.map((m) => [m.simId, m.missions]),
);

export function missionsFor(simId: string | undefined): SimMission[] {
  return (simId && MISSIONS_BY_SIM[simId]) || [];
}
