import type { SimAction, SimEvent, SimulationEngine } from "@/types";

/**
 * Interrupt Lab engine — an educational model of the interrupt lifecycle on
 * a simple CPU (RISC-flavoured abstraction; not any specific architecture).
 *
 * Documented simplifications:
 *  - One fixed handler per source; real CPUs vector through tables and can
 *    nest handlers at different privilege levels.
 *  - Each pipeline stage takes exactly one tick; the handler body takes
 *    `handlerDuration` ticks.
 *  - Masking applies to hardware interrupts only: exceptions (traps) are
 *    synchronous and can never be masked.
 *  - Polling mode: the CPU burns one tick per poll-check while a device is
 *    busy, and cannot execute the program meanwhile — that waste is exactly
 *    what interrupt-driven designs avoid.
 */

export type InterruptSource = "timer" | "io" | "exception";

export const HANDLER_STAGES = [
  "detect",
  "save-context",
  "vector-lookup",
  "run-handler",
  "restore-context",
  "resume",
] as const;

export const HANDLER_RUN_STAGE = 3; // index of "run-handler"

export interface Instruction {
  name: string;
  duration: number;
}

export interface PendingInterrupt {
  source: InterruptSource;
  label: string;
  priority: number; // lower = handled first
  raisedAt: number;
  handlerDuration: number;
}

export interface SavedContext {
  pc: number;
  progressInInstruction: number;
  mode: "user" | "kernel";
}

export interface InterruptState {
  program: Instruction[];
  pc: number;
  progressInInstruction: number;
  mode: "user" | "kernel";
  savedContexts: SavedContext[];
  activeInterrupt: PendingInterrupt | null;
  handlerStageIndex: number;
  handlerTicksRemaining: number;
  pendingQueue: PendingInterrupt[];
  enabled: { timer: boolean; io: boolean; exception: boolean };
  pollingMode: boolean;
  /** Polling model: ticks until the device answers a poll (3 = busy). */
  deviceWaitTicks: number;
  deviceReady: boolean;
  clock: number;
  programFinished: boolean;
  stats: { interruptsHandled: number; totalLatency: number; wastedPollTicks: number };
  eventLog: SimEvent[];
  error: string | null;
}

export type InterruptAction =
  | "tick"
  | "raise-timer"
  | "raise-io"
  | "raise-exception"
  | "toggle-source"
  | "set-polling"
  | "load-program"
  | "reset-pc"
  | "reset";

const TIMER_HANDLER_TICKS = 2;
const IO_HANDLER_TICKS = 2;
const EXCEPTION_HANDLER_TICKS = 3;
/** How many ticks a polled device stays busy before answering. */
export const POLL_WAIT_TICKS = 3;

function makeInterrupt(source: InterruptSource, clock: number): PendingInterrupt {
  switch (source) {
    case "timer":
      return { source, label: "timer tick", priority: 1, raisedAt: clock, handlerDuration: TIMER_HANDLER_TICKS };
    case "io":
      return { source, label: "I/O device ready", priority: 2, raisedAt: clock, handlerDuration: IO_HANDLER_TICKS };
    case "exception":
      return { source, label: "exception: divide by zero (trap)", priority: 0, raisedAt: clock, handlerDuration: EXCEPTION_HANDLER_TICKS };
  }
}

function log(state: InterruptState, event: SimEvent): SimEvent[] {
  return [...state.eventLog.slice(-98), event];
}

export const interruptsEngine: SimulationEngine<InterruptState, InterruptAction> = {
  id: "interrupts",
  initialState() {
    return {
      program: [
        { name: "LOAD  A, 42", duration: 2 },
        { name: "ADD   A, 1", duration: 3 },
        { name: "STORE A, B", duration: 2 },
        { name: "JMP   start", duration: 2 },
      ],
      pc: 0,
      progressInInstruction: 0,
      mode: "user",
      savedContexts: [],
      activeInterrupt: null,
      handlerStageIndex: 0,
      handlerTicksRemaining: 0,
      pendingQueue: [],
      enabled: { timer: true, io: true, exception: true },
      pollingMode: false,
      deviceWaitTicks: 0,
      deviceReady: false,
      clock: 0,
      programFinished: false,
      stats: { interruptsHandled: 0, totalLatency: 0, wastedPollTicks: 0 },
      eventLog: [
        { time: 0, kind: "info", label: "CPU running the demo program in user mode.", severity: "info" },
      ],
      error: null,
    };
  },

  step(state, action: SimAction<InterruptAction>) {
    switch (action.type) {
      case "tick":
        return tickOnce(state);
      case "raise-timer":
        return raise(state, "timer");
      case "raise-io":
        return raise(state, "io", action.payload);
      case "raise-exception":
        return raise(state, "exception");
      case "toggle-source": {
        const { source, enabled: on } = action.payload as { source: InterruptSource; enabled: boolean };
        if (source === "exception") {
          return {
            ...state,
            error: "Exceptions are synchronous traps and cannot be masked.",
            eventLog: log(state, {
              time: state.clock,
              kind: "mask-rejected",
              label: "Attempt to mask exceptions rejected — traps are always delivered.",
              severity: "warn",
            }),
          };
        }
        return {
          ...state,
          error: null,
          enabled: { ...state.enabled, [source]: on },
          eventLog: log(state, {
            time: state.clock,
            kind: "mask-changed",
            label: `${source} interrupts ${on ? "enabled" : "masked (disabled)"}.`,
            severity: on ? "ok" : "warn",
          }),
        };
      }
      case "set-polling": {
        const on = Boolean(action.payload);
        return {
          ...state,
          pollingMode: on,
          deviceReady: false,
          deviceWaitTicks: 0,
          eventLog: log(state, {
            time: state.clock,
            kind: "config",
            label: on
              ? "Switched to POLLING: the CPU will burn a tick per check while the device is busy."
              : "Switched to INTERRUPT-driven I/O: the CPU runs freely until interrupted.",
            severity: on ? "warn" : "ok",
          }),
        };
      }
      case "load-program": {
        const program = action.payload as Instruction[];
        if (!Array.isArray(program) || program.length === 0 || program.some((i) => !i.name || i.duration < 1)) {
          return { ...state, error: "Program needs instructions with duration ≥ 1." };
        }
        return {
          ...state,
          program,
          pc: 0,
          progressInInstruction: 0,
          programFinished: false,
          error: null,
          eventLog: log(state, { time: state.clock, kind: "program", label: "New program loaded.", severity: "info" }),
        };
      }
      case "reset-pc":
        return {
          ...state,
          pc: 0,
          progressInInstruction: 0,
          programFinished: false,
          eventLog: log(state, { time: state.clock, kind: "program", label: "Program counter reset to 0.", severity: "info" }),
        };
      case "reset":
        return interruptsEngine.initialState();
      default:
        return state;
    }
  },

  explain(state) {
    if (state.activeInterrupt) {
      const stage = HANDLER_STAGES[state.handlerStageIndex];
      return `Handling ${state.activeInterrupt.source} interrupt — stage: ${stage}${stage === "run-handler" ? ` (${state.handlerTicksRemaining} tick(s) left)` : ""}; program state saved.`;
    }
    if (state.pendingQueue.length > 0) {
      return `${state.pendingQueue.length} interrupt(s) pending — will be delivered before the next instruction.`;
    }
    if (state.pollingMode && state.deviceWaitTicks > 0) {
      return `Polling a busy I/O device — the CPU cannot run the program while it waits (this is the waste).`;
    }
    if (state.programFinished) return "Program finished — CPU idle.";
    const instr = state.program[state.pc];
    return `Executing “${instr?.name ?? "?"}” (${state.progressInInstruction}/${instr?.duration ?? 0}) in ${state.mode} mode.`;
  },
};

function raise(state: InterruptState, source: InterruptSource, payload?: unknown): InterruptState {
  if (source === "io" && state.pollingMode) {
    const wait = typeof (payload as { waitTicks?: number })?.waitTicks === "number"
      ? Math.max(1, Math.floor((payload as { waitTicks: number }).waitTicks))
      : POLL_WAIT_TICKS;
    return {
      ...state,
      deviceWaitTicks: wait,
      deviceReady: false,
      error: null,
      eventLog: log(state, {
        time: state.clock,
        kind: "io-raised",
        label: `I/O device starts working (${wait} ticks). In polling mode the CPU must keep checking instead of running the program.`,
        severity: "warn",
      }),
    };
  }
  if (source !== "exception" && !state.enabled[source]) {
    return {
      ...state,
      error: null,
      eventLog: log(state, {
        time: state.clock,
        kind: "interrupt-masked",
        label: `${source} interrupt raised but MASKED — the device keeps signaling, the CPU ignores it.`,
        severity: "warn",
      }),
    };
  }
  const interrupt = makeInterrupt(source, state.clock);
  return {
    ...state,
    error: null,
    pendingQueue: [...state.pendingQueue, interrupt],
    eventLog: log(state, {
      time: state.clock,
      kind: "interrupt-raised",
      label: `${interrupt.label} raised (priority ${interrupt.priority}) — queued for delivery.`,
      severity: "info",
    }),
  };
}

function tickOnce(state: InterruptState): InterruptState {
  const clock = state.clock + 1;

  // 1) Deliver the highest-priority pending interrupt (exceptions: priority 0).
  if (!state.activeInterrupt && state.pendingQueue.length > 0) {
    const deliverable = state.pendingQueue
      .filter((i) => i.source === "exception" || state.enabled[i.source])
      .sort((a, b) => a.priority - b.priority || a.raisedAt - b.raisedAt)[0];
    if (deliverable) {
      const latency = clock - deliverable.raisedAt;
      const nextState: InterruptState = {
        ...state,
        clock,
        activeInterrupt: deliverable,
        pendingQueue: state.pendingQueue.filter((i) => i !== deliverable),
        savedContexts: [
          ...state.savedContexts,
          { pc: state.pc, progressInInstruction: state.progressInInstruction, mode: state.mode },
        ],
        handlerStageIndex: 0,
        handlerTicksRemaining: 0,
        mode: "kernel",
        error: null,
        eventLog: [
          ...state.eventLog.slice(-98),
          {
            time: clock,
            kind: "interrupt-delivered",
            label: `${deliverable.label} delivered — CPU finishes nothing else first; current instruction state will be saved. Latency: ${latency} tick(s).`,
            severity: "info",
          },
          {
            time: clock,
            kind: "stage-detect",
            label: "DETECT: interrupt controller signals the CPU; mode switches to kernel.",
            severity: "info",
          },
        ],
      };
      return {
        ...nextState,
        stats: { ...nextState.stats, totalLatency: nextState.stats.totalLatency + latency },
      };
    }
  }

  // 2) Advance the handler pipeline.
  if (state.activeInterrupt) {
    const stageIndex = state.handlerStageIndex;
    const stage = HANDLER_STAGES[stageIndex];
    const intr = state.activeInterrupt;
    const events: SimEvent[] = [];

    if (stage === "run-handler") {
      const remaining = state.handlerTicksRemaining - 1;
      if (remaining > 0) {
        return { ...state, clock, handlerTicksRemaining: remaining };
      }
      events.push({
        time: clock,
        kind: "stage-run-handler-done",
        label: `Handler for “${intr.label}” finished its work.`,
        severity: "info",
      });
    } else if (stage === "save-context") {
      events.push({
        time: clock,
        kind: "stage-save-context",
        label: `SAVE-CONTEXT: pc=${state.pc}, progress=${state.progressInInstruction}, mode=${state.mode} pushed to the stack.`,
        severity: "info",
      });
    } else if (stage === "vector-lookup") {
      events.push({
        time: clock,
        kind: "stage-vector-lookup",
        label: `VECTOR-LOOKUP: handler address for ${intr.source} read from the vector table.`,
        severity: "info",
      });
    } else if (stage === "restore-context") {
      events.push({
        time: clock,
        kind: "stage-restore-context",
        label: "RESTORE-CONTEXT: saved pc/progress/mode popped from the stack.",
        severity: "info",
      });
    } else if (stage === "resume") {
      const saved = state.savedContexts[state.savedContexts.length - 1];
      events.push({
        time: clock,
        kind: "interrupt-resumed",
        label: `RESUME: back in ${saved?.mode ?? "user"} mode at instruction ${saved?.pc ?? 0} — the interrupted program continues as if nothing happened.`,
        severity: "ok",
      });
    }

    if (stage === "resume") {
      const saved = state.savedContexts[state.savedContexts.length - 1];
      const restored: SavedContext = saved ?? { pc: 0, progressInInstruction: 0, mode: "user" };
      return {
        ...state,
        clock,
        mode: restored.mode,
        // pc/progress were saved at delivery; they have not changed since.
        savedContexts: state.savedContexts.slice(0, -1),
        activeInterrupt: null,
        handlerStageIndex: 0,
        handlerTicksRemaining: 0,
        stats: { ...state.stats, interruptsHandled: state.stats.interruptsHandled + 1 },
        eventLog: [...state.eventLog.slice(-98), ...events],
      };
    }

    const nextStageIndex = stageIndex + 1;
    const nextStage = HANDLER_STAGES[nextStageIndex];
    return {
      ...state,
      clock,
      handlerStageIndex: nextStageIndex,
      handlerTicksRemaining: nextStage === "run-handler" ? intr.handlerDuration : 0,
      eventLog: [...state.eventLog.slice(-98), ...events],
    };
  }

  // 3) Polling-mode device handling: the CPU is busy checking the device.
  if (state.pollingMode && (state.deviceWaitTicks > 0 || state.deviceReady)) {
    if (state.deviceWaitTicks > 0) {
      const wait = state.deviceWaitTicks - 1;
      return {
        ...state,
        clock,
        deviceWaitTicks: wait,
        deviceReady: wait === 0,
        stats: { ...state.stats, wastedPollTicks: state.stats.wastedPollTicks + 1 },
        eventLog: log(state, {
          time: clock,
          kind: "poll",
          label: `POLL: device not ready — one full tick wasted checking (${state.stats.wastedPollTicks + 1} so far).`,
          severity: "warn",
        }),
      };
    }
    // deviceReady: answer the poll and service inline.
    return {
      ...state,
      clock,
      deviceReady: false,
      stats: { ...state.stats, interruptsHandled: state.stats.interruptsHandled + 1 },
      eventLog: log(state, {
        time: clock,
        kind: "poll-serviced",
        label: "POLL: device ready — serviced inline. The CPU did all the waiting; no interrupt was needed.",
        severity: "warn",
      }),
    };
  }

  // 4) Execute one tick of the current instruction.
  const instr = state.program[state.pc];
  if (!instr) {
    return {
      ...state,
      clock,
      programFinished: true,
      eventLog: state.programFinished
        ? state.eventLog
        : log(state, { time: clock, kind: "program-complete", label: "Program complete — CPU idle.", severity: "ok" }),
    };
  }
  const progress = state.progressInInstruction + 1;
  const events: SimEvent[] = [];
  let pc = state.pc;
  let newProgress = progress;
  let finished = false;
  if (progress >= instr.duration) {
    events.push({
      time: clock,
      kind: "instruction-complete",
      label: `Instruction “${instr.name}” complete (took ${instr.duration} ticks).`,
      severity: "info",
    });
    pc = pc + 1;
    newProgress = 0;
    if (pc >= state.program.length) {
      finished = true;
      events.push({
        time: clock,
        kind: "program-complete",
        label: "Program complete — CPU idle.",
        severity: "ok",
      });
    }
  }
  return {
    ...state,
    clock,
    pc,
    progressInInstruction: newProgress,
    programFinished: finished,
    eventLog: [...state.eventLog.slice(-98), ...events],
  };
}

export const INTERRUPT_PROGRAMS: Record<string, { label: string; program: Instruction[]; note: string }> = {
  demo: {
    label: "Demo program",
    program: [
      { name: "LOAD  A, 42", duration: 2 },
      { name: "ADD   A, 1", duration: 3 },
      { name: "STORE A, B", duration: 2 },
      { name: "JMP   start", duration: 2 },
    ],
    note: "A short loop — good for watching interrupts land mid-instruction.",
  },
  long: {
    label: "Long computation",
    program: [
      { name: "MUL   A, A", duration: 6 },
      { name: "DIV   A, 2", duration: 5 },
      { name: "STORE A, C", duration: 2 },
    ],
    note: "Longer instructions leave more room to see state saving.",
  },
};
