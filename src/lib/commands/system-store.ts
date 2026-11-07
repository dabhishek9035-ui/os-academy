"use client";

import { create } from "zustand";
import type { SimAction } from "@/types";
import {
  interruptsEngine,
  type InterruptState,
} from "@/modules/interrupts/engine";
import {
  processesEngine,
  type ProcessState,
} from "@/modules/processes/engine";
import {
  schedulingEngine,
  type SchedulingState,
} from "@/modules/scheduling/engine";
import {
  memoryEngine,
  type MemoryState,
} from "@/modules/memory-management/engine";
import { vmEngine, type VmState } from "@/modules/virtual-memory/engine";
import {
  ragEngine,
  bankersEngine,
  type RagState,
  type BankersState,
} from "@/modules/deadlocks/engine";
import {
  filesystemEngine,
  type FsState,
} from "@/modules/filesystems/engine";

/**
 * The terminal's shared "toy machine": one integrated state composed of the
 * same engines the visual labs use. Terminal commands dispatch real engine
 * actions against this state, so anything the terminal changes is exactly
 * what the visual panels show. No real host processes are touched.
 */
export interface SystemState {
  interrupts: InterruptState;
  processes: ProcessState;
  scheduling: SchedulingState;
  memory: MemoryState;
  vm: VmState;
  rag: RagState;
  bankers: BankersState;
  files: FsState;
}

export type SystemEngineId =
  | "interrupts"
  | "processes"
  | "scheduling"
  | "memory"
  | "vm"
  | "rag"
  | "bankers"
  | "files";

interface SystemStore extends SystemState {
  dispatch: (engine: SystemEngineId, action: SimAction) => void;
  resetAll: () => void;
}

export const initialSystemState = (): SystemState => ({
  interrupts: interruptsEngine.initialState(),
  processes: processesEngine.initialState(),
  scheduling: schedulingEngine.initialState(),
  memory: memoryEngine.initialState(),
  vm: vmEngine.initialState(),
  rag: ragEngine.initialState(),
  bankers: bankersEngine.initialState(),
  files: filesystemEngine.initialState(),
});

export const useSystemStore = create<SystemStore>()((set) => ({
  ...initialSystemState(),

  dispatch: (engine, action) =>
    set((s) => {
      switch (engine) {
        case "interrupts": {
          const next = interruptsEngine.step(s.interrupts, action as SimAction<never>);
          return next === s.interrupts ? s : { ...s, interrupts: next };
        }
        case "processes": {
          const next = processesEngine.step(s.processes, action as SimAction<never>);
          return next === s.processes ? s : { ...s, processes: next };
        }
        case "scheduling": {
          const next = schedulingEngine.step(s.scheduling, action as SimAction<never>);
          return next === s.scheduling ? s : { ...s, scheduling: next };
        }
        case "memory": {
          const next = memoryEngine.step(s.memory, action as SimAction<never>);
          return next === s.memory ? s : { ...s, memory: next };
        }
        case "vm": {
          const next = vmEngine.step(s.vm, action as SimAction<never>);
          return next === s.vm ? s : { ...s, vm: next };
        }
        case "rag": {
          const next = ragEngine.step(s.rag, action as SimAction<never>);
          return next === s.rag ? s : { ...s, rag: next };
        }
        case "bankers": {
          const next = bankersEngine.step(s.bankers, action as SimAction<never>);
          return next === s.bankers ? s : { ...s, bankers: next };
        }
        case "files": {
          const next = filesystemEngine.step(s.files, action as SimAction<never>);
          return next === s.files ? s : { ...s, files: next };
        }
        default:
          return s;
      }
    }),

  resetAll: () => set(() => ({ ...initialSystemState() })),
}));
