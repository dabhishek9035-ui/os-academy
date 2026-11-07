import type { SimAction, SimEvent, SimulationEngine } from "@/types";

/**
 * Capstone engine — one program's journey through the whole machine.
 * A scripted pipeline: each stage names the subsystems involved and links
 * back to its module lesson. State per stage is simplified but honest.
 */

export interface CapstoneStage {
  id: string;
  title: string;
  narrative: string;
  subsystems: string[];
  lessonRef: string;
}

export const CAPSTONE_STAGES: CapstoneStage[] = [
  {
    id: "load",
    title: "Program loading",
    narrative:
      "The OS's exec path reads the executable from disk, builds the address space, and prepares the entry context. The program on disk becomes a runnable image in memory.",
    subsystems: ["Filesystem", "Memory management"],
    lessonRef: "intro-computers-os/booting",
  },
  {
    id: "create",
    title: "Process creation",
    narrative:
      "fork() clones the caller; the child gets its own PID, PCB and a copy-on-write view of memory. The scheduler now has one more runnable task.",
    subsystems: ["Process management", "Scheduler"],
    lessonRef: "processes/fork-exec-wait",
  },
  {
    id: "alloc",
    title: "Memory allocation",
    narrative:
      "The runtime requests heap memory; the kernel finds frames, fills the page table, and the process starts with private virtual addresses.",
    subsystems: ["Memory management", "Virtual memory"],
    lessonRef: "memory-management/contiguous-allocation",
  },
  {
    id: "schedule",
    title: "Scheduling",
    narrative:
      "The scheduler picks this process for the CPU by its policy; context switches give every runnable process its share. Waiting time is born here.",
    subsystems: ["CPU scheduler"],
    lessonRef: "cpu-scheduling/one-cpu-many-jobs",
  },
  {
    id: "syscall",
    title: "System-call entry",
    narrative:
      "The program calls read(). The trap switches to kernel mode; the kernel validates arguments and performs the service with elevated privilege.",
    subsystems: ["System-call interface", "Protection"],
    lessonRef: "syscalls-security/system-calls",
  },
  {
    id: "io",
    title: "I/O request",
    narrative:
      "The kernel forwards the request to the device driver; the process blocks. The device (or its DMA engine) moves the data.",
    subsystems: ["I/O system", "Device drivers"],
    lessonRef: "io-systems/pio-interrupt-dma",
  },
  {
    id: "interrupt",
    title: "Interrupt handling",
    narrative:
      "The device signals completion. The CPU saves state, runs the handler, marks the blocked process ready, and resumes exactly where it was.",
    subsystems: ["Interrupts", "Scheduler"],
    lessonRef: "interrupts/interrupt-lifecycle",
  },
  {
    id: "resume",
    title: "Process resumption",
    narrative:
      "The woken process re-enters the ready queue, gets scheduled again, and reads its data — the page fault-free, TLB-warm path.",
    subsystems: ["Scheduler", "Virtual memory"],
    lessonRef: "processes/process-states",
  },
  {
    id: "file",
    title: "File access",
    narrative:
      "The buffer cache may answer immediately; otherwise the path is resolved through directories and inodes to the exact blocks.",
    subsystems: ["Filesystem"],
    lessonRef: "filesystems/inodes-metadata",
  },
  {
    id: "exit",
    title: "Termination & cleanup",
    narrative:
      "exit() releases memory, closes descriptors and flushes buffers. The process becomes a zombie until its parent waits — then the PCB is freed.",
    subsystems: ["Process management", "Filesystem"],
    lessonRef: "processes/zombies-orphans-ipc",
  },
];

export interface CapstoneState {
  stageIndex: number;
  progress: number;
  done: boolean;
  eventLog: SimEvent[];
  error: string | null;
}

export type CapstoneAction = "tick" | "jump" | "reset";

export const capstoneEngine: SimulationEngine<CapstoneState, CapstoneAction> = {
  id: "capstone",
  initialState() {
    return {
      stageIndex: 0,
      progress: 0,
      done: false,
      eventLog: [
        { time: 0, kind: "info", label: "A program is about to run. Step through its whole journey.", severity: "info" },
      ],
      error: null,
    };
  },

  step(state, action: SimAction<CapstoneAction>) {
    switch (action.type) {
      case "tick": {
        if (state.done) return state;
        const progress = state.progress + 0.25;
        if (progress < 1) return { ...state, progress };
        const stageIndex = state.stageIndex + 1;
        if (stageIndex >= CAPSTONE_STAGES.length) {
          return {
            ...state,
            progress: 1,
            done: true,
            eventLog: [
              ...state.eventLog.slice(-98),
              { time: CAPSTONE_STAGES.length, kind: "done", label: "Journey complete — the program ran, was served, and exited cleanly.", severity: "ok" },
            ],
          };
        }
        const stage = CAPSTONE_STAGES[stageIndex];
        return {
          stageIndex,
          progress: 0,
          done: false,
          error: null,
          eventLog: [
            ...state.eventLog.slice(-98),
            {
              time: stageIndex,
              kind: "stage",
              label: `${stage.title}: ${stage.narrative} [subsystems: ${stage.subsystems.join(", ")}]`,
              severity: "ok",
            },
          ],
        };
      }
      case "jump": {
        const i = action.payload as number;
        if (!Number.isInteger(i) || i < 0 || i >= CAPSTONE_STAGES.length) {
          return { ...state, error: "Invalid stage." };
        }
        return {
          stageIndex: i,
          progress: 0,
          done: false,
          error: null,
          eventLog: [
            ...state.eventLog.slice(-98),
            { time: i, kind: "stage", label: `Jumped to: ${CAPSTONE_STAGES[i].title}.`, severity: "info" },
          ],
        };
      }
      case "reset":
        return capstoneEngine.initialState();
      default:
        return state;
    }
  },

  explain(state) {
    if (state.done) return "Journey complete — every subsystem participated in running one program.";
    const stage = CAPSTONE_STAGES[state.stageIndex];
    return `Stage ${state.stageIndex + 1}/${CAPSTONE_STAGES.length}: ${stage.title}.`;
  },
};
