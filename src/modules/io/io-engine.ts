import type { SimAction, SimEvent, SimulationEngine } from "@/types";

/**
 * I/O transfer engine — compares PIO, interrupt-driven I/O and DMA for
 * moving one file of B blocks. Educational per-block timing model:
 *  - PIO: 1 tick/block, CPU busy the whole time (it drives the device).
 *  - Interrupt-driven: 2 ticks/block — device transfer (CPU free) + one
 *    completion-interrupt handling tick (CPU busy).
 *  - DMA: 1 tick/block while the CPU is free, then ONE handling tick total.
 */

export type IoMethod = "pio" | "interrupt" | "dma";

export interface IoState {
  method: IoMethod;
  blocksTotal: number;
  blocksDone: number;
  cpuBusyTicks: number;
  totalTicks: number;
  /** interrupt method: device transfer vs handling sub-phase */
  inHandling: boolean;
  phase: "idle" | "transferring" | "complete";
  eventLog: SimEvent[];
  error: string | null;
}

export type IoAction = "tick" | "set-method" | "set-blocks" | "reset";

/** Pure summary used by tests and the metrics panel. */
export function summarize(
  method: IoMethod,
  blocks: number,
): { totalTicks: number; cpuBusyTicks: number; cpuUtilization: number } {
  if (method === "pio") {
    return { totalTicks: blocks, cpuBusyTicks: blocks, cpuUtilization: 1 };
  }
  if (method === "interrupt") {
    return {
      totalTicks: blocks * 2,
      cpuBusyTicks: blocks,
      cpuUtilization: blocks === 0 ? 0 : 0.5,
    };
  }
  const total = blocks + 1;
  return { totalTicks: total, cpuBusyTicks: 1, cpuUtilization: total === 0 ? 0 : 1 / total };
}

export const ioEngine: SimulationEngine<IoState, IoAction> = {
  id: "io",
  initialState() {
    return {
      method: "pio",
      blocksTotal: 8,
      blocksDone: 0,
      cpuBusyTicks: 0,
      totalTicks: 0,
      inHandling: false,
      phase: "idle",
      eventLog: [
        {
          time: 0,
          kind: "info",
          label: "Ready to transfer an 8-block file. Watch how busy the CPU stays under each method.",
          severity: "info",
        },
      ],
      error: null,
    };
  },

  step(state, action: SimAction<IoAction>) {
    switch (action.type) {
      case "tick": {
        if (state.phase === "complete") return state;
        const events: SimEvent[] = [];
        let { blocksDone, cpuBusyTicks, inHandling } = state;
        const totalTicks = state.totalTicks + 1;
        let complete = false;

        if (state.method === "pio") {
          cpuBusyTicks += 1;
          blocksDone += 1;
          if (totalTicks % 2 === 0) {
            events.push({
              time: totalTicks,
              kind: "pio",
              label: "CPU is driving the device — it cannot do anything else while the transfer runs.",
              severity: "warn",
            });
          }
          complete = blocksDone >= state.blocksTotal;
        } else if (state.method === "interrupt") {
          if (inHandling) {
            cpuBusyTicks += 1;
            blocksDone += 1;
            inHandling = false;
            events.push({
              time: totalTicks,
              kind: "irq",
              label: `Interrupt for block ${blocksDone} handled — CPU returns to other work.`,
              severity: "info",
            });
          } else {
            inHandling = true;
            events.push({
              time: totalTicks,
              kind: "device",
              label: `Device finished block ${blocksDone + 1} — raising an interrupt. The CPU worked on other things meanwhile.`,
              severity: "info",
            });
          }
          complete = blocksDone >= state.blocksTotal;
        } else {
          // DMA
          if (blocksDone < state.blocksTotal) {
            blocksDone += 1;
            events.push({
              time: totalTicks,
              kind: "dma",
              label: `DMA engine moved block ${blocksDone} directly to memory — CPU completely free.`,
              severity: "info",
            });
          } else {
            cpuBusyTicks += 1;
            complete = true;
            events.push({
              time: totalTicks,
              kind: "irq",
              label: "DMA complete: ONE interrupt — the whole transfer needed just this single CPU tick.",
              severity: "ok",
            });
          }
        }

        return {
          ...state,
          blocksDone,
          cpuBusyTicks,
          inHandling,
          totalTicks,
          phase: complete ? "complete" : "transferring",
          eventLog: [...state.eventLog.slice(-98), ...events],
        };
      }
      case "set-method": {
        const method = action.payload as IoMethod;
        return {
          ...ioEngine.initialState(),
          method,
          eventLog: [
            { time: 0, kind: "config", label: `Method set to ${method.toUpperCase()} — counters reset for a fair comparison.`, severity: "info" },
          ],
        };
      }
      case "set-blocks": {
        const n = action.payload as number;
        if (!Number.isInteger(n) || n < 4 || n > 16) {
          return { ...state, error: "Blocks must be 4–16." };
        }
        return { ...ioEngine.initialState(), blocksTotal: n, error: null };
      }
      case "reset":
        return ioEngine.initialState();
      default:
        return state;
    }
  },

  explain(state) {
    if (state.phase === "complete") {
      return `Transfer complete: ${state.totalTicks} ticks, CPU busy for ${state.cpuBusyTicks} of them (${Math.round((state.cpuBusyTicks / Math.max(1, state.totalTicks)) * 100)}% utilization).`;
    }
    return `${state.method.toUpperCase()}: ${state.blocksDone}/${state.blocksTotal} blocks done · CPU busy ${state.cpuBusyTicks} tick(s) so far.`;
  },
};
