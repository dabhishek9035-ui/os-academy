import type { SimAction, SimEvent, SimulationEngine } from "@/types";

/**
 * Computer anatomy explorer — shows the machine's parts and how data moves
 * between them, with an optional OS layer that arbitrates the traffic.
 *
 * Simplifications (documented in the lesson): fixed part list, abstract
 * "data units" rather than real protocols, and a binary OS broker toggle.
 */

export type PartId = "cpu" | "ram" | "disk" | "keyboard" | "screen" | "network";

export interface PartInfo {
  id: PartId;
  label: string;
  role: string;
  /** Relative access speed, 1 = CPU-register fast. */
  speed: number;
  speedLabel: string;
}

export const PARTS: PartInfo[] = [
  { id: "cpu", label: "CPU", role: "Executes instructions — one stream at a time per core.", speed: 1, speedLabel: "< 1 ns per access" },
  { id: "ram", label: "RAM", role: "Fast working memory; forgets at power-off.", speed: 200, speedLabel: "~100 ns per access" },
  { id: "disk", label: "Disk / SSD", role: "Large persistent storage.", speed: 100_000, speedLabel: "~10 µs – 10 ms per access" },
  { id: "keyboard", label: "Keyboard", role: "Input device — interrupts the CPU on keypress.", speed: 1_000_000, speedLabel: "human-scale timing" },
  { id: "screen", label: "Screen", role: "Output device — draws frames the CPU/GPU prepare.", speed: 16_666, speedLabel: "~16 ms per frame" },
  { id: "network", label: "Network", role: "The outside world — the slowest 'device' of all.", speed: 10_000_000, speedLabel: "~1–100 ms per round trip" },
];

export interface Transfer {
  id: number;
  from: PartId;
  to: PartId;
  /** 0..1 */
  progress: number;
  /** Ticks the transfer will take in total. */
  duration: number;
  viaOs: boolean;
  /** Set when two direct transfers collide in chaos mode. */
  collided: boolean;
}

export interface ComputerState {
  viaOs: boolean;
  transfers: Transfer[];
  completed: number;
  collisions: number;
  nextId: number;
  clock: number;
  selected: PartId | null;
  eventLog: SimEvent[];
}

export type ComputerAction =
  | "send"
  | "tick"
  | "toggle-os"
  | "select"
  | "reset";

/** Transfer durations in ticks (log-ish scale of the speed ladder). */
function durationFor(from: PartId, to: PartId): number {
  const pair = [from, to];
  if (pair.includes("cpu") && pair.includes("ram")) return 2;
  if (pair.includes("ram") && pair.includes("disk")) return 6;
  if (pair.includes("network")) return 8;
  if (pair.includes("disk")) return 7;
  return 4;
}

function label(from: PartId, to: PartId): string {
  const n = (p: PartId) => PARTS.find((x) => x.id === p)!.label;
  return `${n(from)} → ${n(to)}`;
}

export const computerEngine: SimulationEngine<ComputerState, ComputerAction> = {
  id: "computer-diagram",
  initialState() {
    return {
      viaOs: true,
      transfers: [],
      completed: 0,
      collisions: 0,
      nextId: 1,
      clock: 0,
      selected: "cpu",
      eventLog: [
        {
          time: 0,
          kind: "info",
          label: "Explorer ready — send data between parts to watch it move.",
          severity: "info",
        },
      ],
    };
  },

  // Demo: a keypress travels keyboard→CPU→RAM, the CPU draws to the screen,
  // then chaos mode shows two direct transfers colliding.
  script: [
    { type: "send", payload: { from: "keyboard", to: "cpu" } },
    { type: "tick" },
    { type: "tick" },
    { type: "tick" },
    { type: "tick" },
    { type: "send", payload: { from: "cpu", to: "ram" } },
    { type: "tick" },
    { type: "tick" },
    { type: "send", payload: { from: "cpu", to: "screen" } },
    { type: "tick" },
    { type: "tick" },
    { type: "tick" },
    { type: "tick" },
    { type: "toggle-os" },
    { type: "send", payload: { from: "ram", to: "disk" } },
    { type: "send", payload: { from: "network", to: "ram" } },
    { type: "tick" },
    { type: "tick" },
    { type: "tick" },
    { type: "tick" },
    { type: "tick" },
    { type: "tick" },
    { type: "tick" },
    { type: "tick" },
  ],

  done(state) {
    // The scripted story has run its course once the collided transfers
    // drained and at least five transfers completed.
    return state.completed >= 5 && state.transfers.length === 0 && state.collisions > 0;
  },

  step(state, action: SimAction<ComputerAction>) {
    switch (action.type) {
      case "select":
        return { ...state, selected: action.payload as PartId };
      case "toggle-os": {
        const viaOs = !state.viaOs;
        return {
          ...state,
          viaOs,
          eventLog: [
            ...state.eventLog.slice(-98),
            {
              time: state.clock,
              kind: "config",
              label: viaOs
                ? "OS broker ON — every device request is queued and arbitrated by the kernel."
                : "OS broker OFF (chaos) — parts talk directly. Try sending two things at once.",
              severity: viaOs ? "ok" : "warn",
            },
          ],
        };
      }
      case "send": {
        const { from, to } = action.payload as { from: PartId; to: PartId };
        if (from === to) return state;
        const collides =
          !state.viaOs && state.transfers.length > 0 ? true : false;
        const t: Transfer = {
          id: state.nextId,
          from,
          to,
          progress: 0,
          duration: durationFor(from, to),
          viaOs: state.viaOs,
          collided: collides,
        };
        return {
          ...state,
          nextId: state.nextId + 1,
          transfers: [...state.transfers, t],
          collisions: collides ? state.collisions + 1 : state.collisions,
          eventLog: [
            ...state.eventLog.slice(-98),
            {
              time: state.clock,
              kind: "transfer-start",
              label: collides
                ? `COLLISION: ${label(from, to)} started while the bus was busy — direct hardware access has no arbiter.`
                : `${label(from, to)} started${state.viaOs ? " (queued through the OS)" : ""} — ${t.duration} ticks.`,
              severity: collides ? "bad" : "info",
            },
          ],
        };
      }
      case "tick": {
        if (state.transfers.length === 0) return state;
        let completed = state.completed;
        const events: SimEvent[] = [];
        const transfers = state.transfers
          .map((t) => {
            const progress = Math.min(1, t.progress + 1 / t.duration);
            if (progress >= 1 && t.progress < 1) {
              completed += 1;
              events.push({
                time: state.clock + 1,
                kind: "transfer-done",
                label: `${label(t.from, t.to)} arrived.${t.collided ? " But the transfer was corrupted by the concurrent one." : ""}`,
                severity: t.collided ? "bad" : "ok",
              });
            }
            return { ...t, progress };
          })
          .filter((t) => t.progress < 1);
        return {
          ...state,
          transfers,
          completed,
          clock: state.clock + 1,
          eventLog: [...state.eventLog.slice(-98), ...events],
        };
      }
      case "reset":
        return computerEngine.initialState();
      default:
        return state;
    }
  },

  explain(state) {
    if (state.transfers.length > 0) {
      const t = state.transfers[0];
      return `${label(t.from, t.to)} in flight (${Math.round(t.progress * 100)}%)${t.collided ? " — colliding with another direct transfer" : ""}.`;
    }
    if (!state.viaOs) {
      return "Chaos mode: no OS arbiter. Send two transfers to see them collide.";
    }
    return "Idle. Pick a part, then send data to another part and press play.";
  },
};
