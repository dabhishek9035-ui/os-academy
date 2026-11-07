import type { SimAction, SimEvent, SimulationEngine } from "@/types";

/**
 * System-call walk + protection engines (module 11).
 *
 * Simplifications: the syscall walk is a fixed 7-stage pipeline (real
 * implementations differ per architecture — RISC-V ecall/MTVEC vs x86
 * sysenter/syscall); permission checks model the classic Unix owner/group/
 * other rwx bits; kernel mode is treated as "superuser" for the demo.
 */

// ---------------------------------------------------------------------------
// syscall walk
// ---------------------------------------------------------------------------

export const SYSCALL_STAGES = [
  "user-code",
  "trap",
  "mode-switch",
  "dispatch",
  "kernel-exec",
  "return",
  "resume",
] as const;

export const SYSCALL_TABLE: Record<string, { num: number; result: (args: string) => string }> = {
  read: { num: 0, result: (a) => `read ${a || "fd 3"}: 128 bytes into the user buffer (simulated)` },
  write: { num: 1, result: (a) => `write ${a || "fd 3"}: 128 bytes handed to the page cache (simulated)` },
  open: { num: 2, result: (a) => `open ${a || '"/docs/notes.txt"'}: new file descriptor 3 (simulated)` },
  close: { num: 3, result: (a) => `close ${a || "fd 3"}: descriptor released (simulated)` },
};

export interface SyscallState {
  stageIndex: number;
  mode: "user" | "kernel";
  syscallName: string | null;
  syscallNumber: number | null;
  argumentDescription: string;
  returnValue: string | null;
  eventLog: SimEvent[];
  error: string | null;
}

export type SyscallAction = "tick" | "call" | "reset";

export const syscallEngine: SimulationEngine<SyscallState, SyscallAction> = {
  id: "syscall",
  initialState() {
    return {
      stageIndex: 0,
      mode: "user",
      syscallName: null,
      syscallNumber: null,
      argumentDescription: "—",
      returnValue: null,
      eventLog: [
        { time: 0, kind: "info", label: "User program running. Issue a system call to walk the transition.", severity: "info" },
      ],
      error: null,
    };
  },

  step(state, action: SimAction<SyscallAction>) {
    switch (action.type) {
      case "call": {
        const { name, args } = action.payload as { name: string; args?: string };
        const entry = SYSCALL_TABLE[name];
        if (!entry) {
          return {
            ...state,
            error: `Unknown system call “${name}”. Implemented: ${Object.keys(SYSCALL_TABLE).join(", ")}.`,
          };
        }
        return {
          ...state,
          error: null,
          stageIndex: 0,
          mode: "user",
          syscallName: name,
          syscallNumber: entry.num,
          argumentDescription: args || "—",
          returnValue: null,
          eventLog: [
            ...state.eventLog.slice(-98),
            { time: 0, kind: "call", label: `App calls ${name}(${args || "…"}) → syscall #${entry.num}.`, severity: "info" },
          ],
        };
      }
      case "tick": {
        if (state.syscallName === null) return state;
        if (state.stageIndex >= SYSCALL_STAGES.length - 1) return state;
        const stageIndex = state.stageIndex + 1;
        const stage = SYSCALL_STAGES[stageIndex];
        const events: SimEvent[] = [];
        let mode = state.mode;
        let returnValue = state.returnValue;
        if (stage === "trap") {
          events.push({ time: stageIndex, kind: "trap", label: "TRAP: the special instruction hands control to the kernel's entry point; caller state is saved.", severity: "info" });
        } else if (stage === "mode-switch") {
          mode = "kernel";
          events.push({ time: stageIndex, kind: "mode", label: "MODE SWITCH: CPU is now in kernel mode — privileged instructions become legal.", severity: "ok" });
        } else if (stage === "dispatch") {
          events.push({ time: stageIndex, kind: "dispatch", label: `DISPATCH: syscall #${state.syscallNumber} → ${state.syscallName}; the kernel validates the arguments (pointers are checked against the caller's address space!).`, severity: "info" });
        } else if (stage === "kernel-exec") {
          returnValue = SYSCALL_TABLE[state.syscallName!].result(state.argumentDescription);
          events.push({ time: stageIndex, kind: "exec", label: `KERNEL EXEC: ${returnValue}`, severity: "ok" });
        } else if (stage === "return") {
          mode = "user";
          events.push({ time: stageIndex, kind: "return", label: "RETURN: result placed in a register, caller state restored, CPU back to user mode.", severity: "ok" });
        } else if (stage === "resume") {
          events.push({ time: stageIndex, kind: "resume", label: "RESUME: the application continues from right after the call — it never saw the kernel's internals.", severity: "info" });
        }
        return {
          ...state,
          stageIndex,
          mode,
          returnValue,
          error: null,
          eventLog: [...state.eventLog.slice(-98), ...events],
        };
      }
      case "reset":
        return syscallEngine.initialState();
      default:
        return state;
    }
  },

  explain(state) {
    if (state.syscallName === null) return "No syscall in flight — call read/write/open/close to start the walk.";
    return `Stage ${state.stageIndex + 1}/${SYSCALL_STAGES.length}: ${SYSCALL_STAGES[state.stageIndex]} (${state.mode} mode).`;
  },
};

// ---------------------------------------------------------------------------
// protection
// ---------------------------------------------------------------------------

export interface ProtectedFile {
  name: string;
  owner: string;
  group: string;
  perms: string; // 9 chars: owner/group/other × rwx
}

export interface MemoryRegion {
  name: string;
  base: number;
  limit: number;
  ownerPid: number;
}

export interface ProtectionState {
  files: ProtectedFile[];
  currentUser: string;
  groups: Record<string, string[]>;
  memoryRegions: MemoryRegion[];
  activePid: number;
  mode: "user" | "kernel";
  lastCheck: { target: string; operation: string; allowed: boolean; reason: string } | null;
  eventLog: SimEvent[];
  error: string | null;
}

export type ProtectionAction =
  | "chmod"
  | "su"
  | "attempt"
  | "memory-access"
  | "set-mode"
  | "reset";

/** Pure permission check — owner bits, then group bits, then other bits. */
export function checkPermission(
  file: { owner: string; group: string; perms: string },
  user: string,
  groups: Record<string, string[]>,
  operation: "read" | "write" | "execute",
): { allowed: boolean; reason: string } {
  const bitIndex = operation === "read" ? 0 : operation === "write" ? 1 : 2;
  const bitChar = operation === "read" ? "r" : operation === "write" ? "w" : "x";
  const triad = user === file.owner ? 0 : (groups[file.group] ?? []).includes(user) ? 1 : 2;
  const bits = file.perms.slice(triad * 3, triad * 3 + 3);
  const allowed = bits[bitIndex] === bitChar;
  const who = triad === 0 ? "owner" : triad === 1 ? "group" : "other";
  return {
    allowed,
    reason: `${user} matches the ${who} triad (${bits}) — ${operation} is ${allowed ? "permitted" : "denied"}.`,
  };
}

export const protectionEngine: SimulationEngine<ProtectionState, ProtectionAction> = {
  id: "protection",
  initialState() {
    return {
      files: [
        { name: "/home/alice/report.txt", owner: "alice", group: "staff", perms: "rw-r-----" },
        { name: "/usr/bin/tool", owner: "root", group: "staff", perms: "rwxr-xr-x" },
        { name: "/etc/config", owner: "root", group: "wheel", perms: "rw-r-----" },
      ],
      currentUser: "alice",
      groups: { staff: ["alice", "bob"], wheel: ["root"] },
      memoryRegions: [
        { name: "code", base: 0, limit: 100, ownerPid: 7 },
        { name: "data", base: 100, limit: 60, ownerPid: 7 },
        { name: "other-process", base: 200, limit: 50, ownerPid: 8 },
      ],
      activePid: 7,
      mode: "user",
      lastCheck: null,
      eventLog: [
        { time: 0, kind: "info", label: "User alice (pid 7) in user mode. Try file and memory operations.", severity: "info" },
      ],
      error: null,
    };
  },

  step(state, action: SimAction<ProtectionAction>) {
    switch (action.type) {
      case "chmod": {
        const { name, perms } = action.payload as { name: string; perms: string };
        if (!state.files.some((f) => f.name === name)) return { ...state, error: `No file ${name}.` };
        if (!/^[rwx-]{9}$/.test(perms)) return { ...state, error: "Permissions are 9 characters of r, w, x or -." };
        return {
          ...state,
          error: null,
          files: state.files.map((f) => (f.name === name ? { ...f, perms } : f)),
          eventLog: [...state.eventLog.slice(-98), { time: 0, kind: "chmod", label: `chmod ${name} → ${perms}.`, severity: "ok" }],
        };
      }
      case "su": {
        const user = String(action.payload ?? "");
        return {
          ...state,
          error: null,
          currentUser: user,
          eventLog: [...state.eventLog.slice(-98), { time: 0, kind: "su", label: `Now operating as ${user}.`, severity: "info" }],
        };
      }
      case "attempt": {
        const { target, operation } = action.payload as {
          target: string;
          operation: "read" | "write" | "execute";
        };
        const file = state.files.find((f) => f.name === target);
        if (!file) return { ...state, error: `No file ${target}.` };
        if (state.mode === "kernel") {
          const lastCheck = {
            target,
            operation,
            allowed: true,
            reason: "Kernel mode — protection checks are bypassed for this operation (the superuser analog).",
          };
          return {
            ...state,
            error: null,
            lastCheck,
            eventLog: [...state.eventLog.slice(-98), { time: 0, kind: "allow", label: `${operation} ${target}: ALLOWED (kernel mode).`, severity: "warn" }],
          };
        }
        const check = checkPermission(file, state.currentUser, state.groups, operation);
        return {
          ...state,
          error: null,
          lastCheck: { target, operation, ...check },
          eventLog: [
            ...state.eventLog.slice(-98),
            {
              time: 0,
              kind: check.allowed ? "allow" : "deny",
              label: `${operation} ${target}: ${check.allowed ? "ALLOWED" : "DENIED"} — ${check.reason}`,
              severity: check.allowed ? "ok" : "bad",
            },
          ],
        };
      }
      case "memory-access": {
        const { pid, addr } = action.payload as { pid: number; addr: number };
        if (state.mode === "kernel") {
          return {
            ...state,
            error: null,
            lastCheck: { target: `addr ${addr}`, operation: "memory", allowed: true, reason: "Kernel mode — hardware bounds checks are bypassed in this model." },
            eventLog: [...state.eventLog.slice(-98), { time: 0, kind: "allow", label: `memory access addr=${addr}: ALLOWED (kernel mode).`, severity: "warn" }],
          };
        }
        const region = state.memoryRegions.find((r) => r.ownerPid === pid && addr >= r.base && addr < r.base + r.limit);
        const lastCheck = region
          ? { target: `addr ${addr}`, operation: "memory", allowed: true, reason: `addr ${addr} is inside “${region.name}” ([${region.base}, ${region.base + region.limit}) of pid ${pid}) — within base/limit.` }
          : { target: `addr ${addr}`, operation: "memory", allowed: false, reason: `addr ${addr} is outside every region of pid ${pid} — SEGMENTATION FAULT (simulated): the CPU faults the access and the kernel will terminate the process.` };
        return {
          ...state,
          error: null,
          lastCheck,
          eventLog: [
            ...state.eventLog.slice(-98),
            { time: 0, kind: lastCheck.allowed ? "allow" : "fault", label: `memory access addr=${addr} by pid ${pid}: ${lastCheck.allowed ? "ALLOWED" : "FAULT"} — ${lastCheck.reason}`, severity: lastCheck.allowed ? "ok" : "bad" },
          ],
        };
      }
      case "set-mode": {
        const mode = action.payload as "user" | "kernel";
        return {
          ...state,
          error: null,
          mode,
          eventLog: [...state.eventLog.slice(-98), { time: 0, kind: "mode", label: `CPU switched to ${mode} mode.`, severity: mode === "kernel" ? "warn" : "info" }],
        };
      }
      case "reset":
        return protectionEngine.initialState();
      default:
        return state;
    }
  },

  explain(state) {
    if (state.lastCheck) return state.lastCheck.reason;
    return `${state.currentUser} (pid ${state.activePid}) in ${state.mode} mode — attempt file or memory operations.`;
  },
};
