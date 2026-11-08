import type { SimAction, SimEvent, SimulationEngine } from "@/types";

/**
 * Disk scheduling engine — head movement over a cylinder request queue.
 * Textbook model: 200 cylinders (0–199), one request queue, service order
 * computed purely per algorithm (exported for tests and the terminal).
 *
 * Simplifications: no rotational latency, no seek-time curve (movement is
 * measured in cylinders), the whole request list is known up front.
 */

export const MAX_CYLINDER = 199;

export type DiskAlgorithm = "fcfs" | "sstf" | "scan" | "c-scan" | "look" | "c-look";

export interface DiskSchedule {
  /** service order (cylinder numbers) */
  order: number[];
  /** total head movement in cylinders */
  movement: number;
  /** full head path including the start position */
  path: number[];
}

export function scheduleDisk(
  head: number,
  requests: number[],
  algorithm: DiskAlgorithm,
  direction: "up" | "down",
): DiskSchedule {
  const path: number[] = [head];
  let movement = 0;
  const walk = (to: number) => {
    movement += Math.abs(to - path[path.length - 1]);
    path.push(to);
  };

  switch (algorithm) {
    case "fcfs": {
      for (const r of requests) walk(r);
      break;
    }
    case "sstf": {
      const pending = [...requests];
      let pos = head;
      while (pending.length > 0) {
        // nearest first; ties → lower cylinder
        let best = 0;
        for (let i = 1; i < pending.length; i += 1) {
          if (Math.abs(pending[i] - pos) < Math.abs(pending[best] - pos) ||
              (Math.abs(pending[i] - pos) === Math.abs(pending[best] - pos) && pending[i] < pending[best])) {
            best = i;
          }
        }
        pos = pending[best];
        pending.splice(best, 1);
        walk(pos);
      }
      break;
    }
    case "scan": {
      const up = requests.filter((r) => r >= head).sort((a, b) => a - b);
      const down = requests.filter((r) => r < head).sort((a, b) => b - a);
      if (direction === "up") {
        for (const r of up) walk(r);
        if (down.length > 0) {
          walk(MAX_CYLINDER); // reach the end before reversing (SCAN discipline)
          for (const r of down) walk(r);
        }
      } else {
        const downDesc = requests.filter((r) => r <= head).sort((a, b) => b - a);
        const upAsc = requests.filter((r) => r > head).sort((a, b) => a - b);
        for (const r of downDesc) walk(r);
        if (upAsc.length > 0) {
          walk(0); // reach the end before reversing (SCAN discipline)
          for (const r of upAsc) walk(r);
        }
      }
      break;
    }
    case "c-scan": {
      const up = requests.filter((r) => r >= head).sort((a, b) => a - b);
      const down = requests.filter((r) => r < head).sort((a, b) => a - b);
      if (direction === "up") {
        for (const r of up) walk(r);
        if (down.length > 0) {
          walk(MAX_CYLINDER);
          walk(0); // fast return wrap (counted as a full sweep, teaching model)
          for (const r of down) walk(r);
        }
      } else {
        const downDesc = requests.filter((r) => r <= head).sort((a, b) => b - a);
        const upAsc = requests.filter((r) => r > head).sort((a, b) => a - b);
        for (const r of downDesc) walk(r);
        if (upAsc.length > 0) {
          walk(0);
          walk(MAX_CYLINDER);
          for (const r of [...upAsc].reverse()) walk(r);
        }
      }
      break;
    }
    case "look": {
      const up = requests.filter((r) => r >= head).sort((a, b) => a - b);
      const down = requests.filter((r) => r < head).sort((a, b) => b - a);
      if (direction === "up") {
        for (const r of up) walk(r);
        for (const r of down) walk(r);
      } else {
        // Sweep downward to the lowest request, then reverse upward and
        // service the rest in ASCENDING order (LOOK never zig-zags).
        for (const r of down) walk(r);
        for (const r of up) walk(r);
      }
      break;
    }
    case "c-look": {
      const up = requests.filter((r) => r >= head).sort((a, b) => a - b);
      const down = requests.filter((r) => r < head).sort((a, b) => a - b);
      if (direction === "up") {
        for (const r of up) walk(r);
        if (down.length > 0) {
          walk(down[0]); // jump (counted) to the lowest request
          for (const r of down.slice(1)) walk(r);
        }
      } else {
        const downDesc = requests.filter((r) => r <= head).sort((a, b) => b - a);
        const upDesc = requests.filter((r) => r > head).sort((a, b) => b - a);
        for (const r of downDesc) walk(r);
        if (upDesc.length > 0) {
          walk(upDesc[0]);
          for (const r of upDesc.slice(1)) walk(r);
        }
      }
      break;
    }
  }
  return { order: path.slice(1), movement, path };
}

export interface DiskState {
  head: number;
  direction: "up" | "down";
  requests: number[];
  algorithm: DiskAlgorithm;
  schedule: DiskSchedule;
  cursor: number;
  eventLog: SimEvent[];
  error: string | null;
}

export type DiskAction =
  | "set-algorithm"
  | "add-request"
  | "remove-request"
  | "set-head"
  | "set-direction"
  | "tick"
  | "rewind"
  | "reset";

export const DEFAULT_DISK_REQUESTS = [98, 183, 37, 122, 14, 124, 65, 67];

function rebuild(state: DiskState): DiskState {
  return {
    ...state,
    schedule: scheduleDisk(state.head, state.requests, state.algorithm, state.direction),
    cursor: 0,
  };
}

export const diskEngine: SimulationEngine<DiskState, DiskAction> = {
  id: "disk",
  initialState() {
    const base: DiskState = {
      head: 53,
      direction: "up",
      requests: [...DEFAULT_DISK_REQUESTS],
      algorithm: "fcfs",
      schedule: { order: [], movement: 0, path: [] },
      cursor: 0,
      eventLog: [
        {
          time: 0,
          kind: "info",
          label: "Textbook scenario: head at 53, queue 98,183,37,122,14,124,65,67 (cylinders 0–199).",
          severity: "info",
        },
      ],
      error: null,
    };
    return rebuild(base);
  },

  step(state, action: SimAction<DiskAction>) {
    switch (action.type) {
      case "set-algorithm":
        return {
          ...rebuild({ ...state, algorithm: action.payload as DiskAlgorithm }),
          eventLog: [
            ...state.eventLog.slice(-98),
            { time: 0, kind: "config", label: `Algorithm set to ${(action.payload as string).toUpperCase()}.`, severity: "info" },
          ],
        };
      case "add-request": {
        const cyl = action.payload as number;
        if (!Number.isInteger(cyl) || cyl < 0 || cyl > MAX_CYLINDER) {
          return { ...state, error: `Cylinder must be 0–${MAX_CYLINDER}.` };
        }
        return rebuild({ ...state, error: null, requests: [...state.requests, cyl] });
      }
      case "remove-request":
        return rebuild({
          ...state,
          requests: state.requests.filter((r, i) => i !== (action.payload as number)),
        });
      case "set-head": {
        const cyl = action.payload as number;
        if (!Number.isInteger(cyl) || cyl < 0 || cyl > MAX_CYLINDER) {
          return { ...state, error: `Cylinder must be 0–${MAX_CYLINDER}.` };
        }
        return rebuild({ ...state, error: null, head: cyl });
      }
      case "set-direction":
        return rebuild({ ...state, direction: action.payload as "up" | "down" });
      case "tick": {
        if (state.cursor >= state.schedule.order.length) return state;
        const next = state.schedule.order[state.cursor];
        const from = state.schedule.path[state.cursor];
        return {
          ...state,
          cursor: state.cursor + 1,
          head: next,
          eventLog: [
            ...state.eventLog.slice(-98),
            {
              time: state.cursor + 1,
              kind: "disk-step",
              label: `Serviced cylinder ${next} (moved ${Math.abs(next - from)} cylinders; total ${state.schedule.path.slice(0, state.cursor + 2).length - 1} steps).`,
              severity: "info",
            },
          ],
        };
      }
      case "rewind": {
        if (state.cursor === 0) return state;
        const target = state.cursor - 1;
        const fresh = rebuild({ ...state, cursor: 0 });
        return { ...fresh, cursor: target, head: fresh.schedule.path[target], eventLog: state.eventLog };
      }
      case "reset":
        return diskEngine.initialState();
      default:
        return state;
    }
  },

  explain(state) {
    if (state.schedule.order.length === 0) return "No pending requests.";
    if (state.cursor >= state.schedule.order.length) {
      return `Done: total head movement ${state.schedule.movement} cylinders via ${state.algorithm.toUpperCase()}.`;
    }
    return `${state.algorithm.toUpperCase()}: ${state.cursor}/${state.schedule.order.length} serviced — full-run movement will be ${state.schedule.movement} cylinders.`;
  },
};
