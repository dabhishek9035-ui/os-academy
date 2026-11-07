import type { SystemState } from "./system-store";

/**
 * Educational command interpreter. Every command is implemented against the
 * shared simulation state — nothing here touches the host machine, and
 * unknown commands fail honestly.
 */

export interface OutputLine {
  text: string;
  tone?: "default" | "muted" | "ok" | "warn" | "bad" | "accent";
}

export interface CommandContext {
  /** Fresh system state — always call this, never cache the snapshot. */
  system: () => SystemState;
  dispatch: (
    engine:
      | "interrupts"
      | "processes"
      | "scheduling"
      | "memory"
      | "vm"
      | "rag"
      | "bankers"
      | "files",
    action: { type: string; payload?: unknown },
  ) => void;
  resetAll: () => void;
}

export interface CommandDef {
  name: string;
  usage: string;
  description: string;
  /** Lesson/topic tag shown by `concepts`. */
  topic: string;
  run: (args: string[], ctx: CommandContext) => OutputLine[];
}

const err = (text: string): OutputLine[] => [{ text, tone: "bad" }];
const ok = (text: string): OutputLine[] => [{ text, tone: "ok" }];

// ---------------------------------------------------------------------------
// help / meta
// ---------------------------------------------------------------------------

const help: CommandDef = {
  name: "help",
  usage: "help [command]",
  description: "List commands or show usage for one command.",
  topic: "meta",
  run: (args, _ctx) => {
    if (args[0]) {
      const c = COMMANDS[args[0]] ?? Object.values(COMMANDS).find((x) => x.name === args[0]);
      if (!c) return err(`No command “${args[0]}”. Try "help".`);
      return [
        { text: `${c.usage}`, tone: "accent" },
        { text: c.description, tone: "muted" },
      ];
    }
    const lines: OutputLine[] = [{ text: "Available commands:", tone: "accent" }];
    for (const c of Object.values(COMMANDS)) {
      lines.push({ text: `  ${c.usage.padEnd(28)} ${c.description}`, tone: "default" });
    }
    lines.push({ text: "Tip: ↑/↓ recalls history; Tab completes. Type `concepts` to see what each command teaches.", tone: "muted" });
    return lines;
  },
};

const clear: CommandDef = {
  name: "clear",
  usage: "clear",
  description: "Clear the terminal screen.",
  topic: "meta",
  run: () => [{ text: "\u0000CLEAR" }],
};

const concepts: CommandDef = {
  name: "concepts",
  usage: "concepts",
  description: "Explain which OS lesson each command group connects to.",
  topic: "meta",
  run: () => [
    { text: "interrupt …  → Module 1: Interrupts, Exceptions & Traps", tone: "muted" },
    { text: "process … / fork / wait → Module 2: Processes & Process Control", tone: "muted" },
    { text: "schedule …   → Module 3: CPU Scheduling", tone: "muted" },
    { text: "memory …     → Module 5: Memory Management", tone: "muted" },
    { text: "paging …     → Module 6: Virtual Memory & Paging", tone: "muted" },
    { text: "deadlock …   → Module 7: Deadlocks (RAG + Banker's)", tone: "muted" },
    { text: "files …      → Module 9: Filesystems & Storage", tone: "muted" },
  ],
};

const status: CommandDef = {
  name: "status",
  usage: "status",
  description: "Show the state of every simulated subsystem.",
  topic: "meta",
  run: (_args, ctx) => {
    const system = ctx.system();
    const live = system.processes.processes.filter((p) => !["terminated"].includes(p.state)).length;
    return [
      { text: `clock=${system.processes.clock} · processes live=${live} · running=${system.processes.runningPid ?? "none"}`, tone: "default" },
      { text: `interrupts: handled=${system.interrupts.stats.interruptsHandled} pending=${system.interrupts.pendingQueue.length} polling=${system.interrupts.pollingMode}`, tone: "default" },
      { text: `scheduler: ${system.scheduling.algorithm} · timeline decisions=${system.scheduling.result.timeline.length}`, tone: "default" },
      { text: `memory: ${system.memory.strategy}-fit · fragmentation=${system.memory.stats.externalFragPercent}% · largest hole=${system.memory.stats.largestFree}u`, tone: "default" },
      { text: `paging: ${system.vm.cursor}/${system.vm.referenceString.length} refs walked · faults=${system.vm.faultCount} · frames=${system.vm.frames.length}`, tone: "default" },
    ];
  },
};

// ---------------------------------------------------------------------------
// interrupts
// ---------------------------------------------------------------------------

const interruptCmd: CommandDef = {
  name: "interrupt",
  usage: "interrupt timer | interrupt io | interrupt exception",
  description: "Raise a simulated interrupt and tick the CPU until it is handled.",
  topic: "interrupts",
  run: (args, ctx) => {
    const source = args[0];
    if (source !== "timer" && source !== "io" && source !== "exception") {
      return err(`Usage: ${interruptCmd.usage}`);
    }
    ctx.dispatch("interrupts", { type: source === "exception" ? "raise-exception" : `raise-${source}` });
    const before = ctx.system().interrupts.stats.interruptsHandled;
    // Tick up to 30 times to let the handler complete.
    for (let i = 0; i < 30; i += 1) {
      ctx.dispatch("interrupts", { type: "tick" });
    }
    const s = ctx.system().interrupts;
    const lines: OutputLine[] = [
      { text: `${source} interrupt raised and processed.`, tone: "ok" },
      { text: `handled total=${s.stats.interruptsHandled} (this command: ${s.stats.interruptsHandled - before}), total latency=${s.stats.totalLatency} ticks`, tone: "muted" },
    ];
    const last = s.eventLog.slice(-3);
    for (const e of last) lines.push({ text: `  · ${e.label}`, tone: "muted" });
    return lines;
  },
};

const interruptsList: CommandDef = {
  name: "interrupts",
  usage: "interrupts list",
  description: "Show pending interrupts and the interrupt mask.",
  topic: "interrupts",
  run: (args, ctx) => {
    if (args[0] !== "list") return err(`Usage: ${interruptsList.usage}`);
    const s = ctx.system().interrupts;
    const lines: OutputLine[] = [
      { text: `mask: timer=${s.enabled.timer ? "on" : "off"} io=${s.enabled.io ? "on" : "off"} exception=always-on`, tone: "muted" },
      { text: `pending: ${s.pendingQueue.length === 0 ? "(none)" : ""}`, tone: "default" },
      ...s.pendingQueue.map((i) => ({
        text: `  [prio ${i.priority}] ${i.label} (raised t=${i.raisedAt})`,
        tone: "warn" as const,
      })),
    ];
    if (s.activeInterrupt) {
      lines.push({ text: `handling now: ${s.activeInterrupt.label}`, tone: "accent" });
    }
    return lines;
  },
};

// ---------------------------------------------------------------------------
// processes
// ---------------------------------------------------------------------------

const processCmd: CommandDef = {
  name: "process",
  usage: "process list | process create [name] | process kill <pid> | process block <pid> | process resume <pid>",
  description: "Inspect and control processes in the simulated process table.",
  topic: "processes",
  run: (args, ctx) => {
    const sub = args[0];
    const rest = args.slice(1);
    const s = () => ctx.system().processes;
    switch (sub) {
      case "list": {
        const lines: OutputLine[] = [
          { text: "PID  PPID  STATE      NAME        PROG", tone: "accent" },
        ];
        for (const p of s().processes) {
          lines.push({
            text: `${String(p.pid).padEnd(4)} ${String(p.ppid ?? "—").padEnd(5)} ${p.state.padEnd(10)} ${p.name.padEnd(11)} ${p.progress}/${p.burst}`,
            tone: p.state === "running" ? "ok" : p.state === "zombie" ? "warn" : "default",
          });
        }
        lines.push({ text: `ready queue: [${s().readyQueue.join(", ")}] · running: ${s().runningPid ?? "none"} · context switches: ${s().contextSwitches}`, tone: "muted" });
        return lines;
      }
      case "create": {
        const name = rest[0] ?? `app-${s().nextPid}`;
        const before = s().nextPid;
        ctx.dispatch("processes", { type: "create", payload: { name } });
        return ok(`Created process PID ${before} (“${name}”) and queued it as ready.`);
      }
      case "kill": {
        const pid = Number(rest[0]);
        if (!Number.isInteger(pid)) return err(`Usage: process kill <pid> — e.g. process kill 2`);
        if (!s().processes.some((p) => p.pid === pid)) return err(`No process with PID ${pid}. Try "process list".`);
        ctx.dispatch("processes", { type: "kill", payload: pid });
        return ok(`Sent termination to PID ${pid}. If its parent never waits, it becomes a zombie — check "process list".`);
      }
      case "block": {
        const pid = Number(rest[0]);
        if (!Number.isInteger(pid)) return err(`Usage: process block <pid>`);
        if (!s().processes.some((p) => p.pid === pid)) return err(`No process with PID ${pid}.`);
        ctx.dispatch("processes", { type: "block", payload: { pid, reason: "device" } });
        return ok(`PID ${pid} blocked on a simulated device.`);
      }
      case "resume": {
        const pid = Number(rest[0]);
        if (!Number.isInteger(pid)) return err(`Usage: process resume <pid>`);
        if (!s().processes.some((p) => p.pid === pid)) return err(`No process with PID ${pid}.`);
        ctx.dispatch("processes", { type: "resume", payload: pid });
        return ok(`PID ${pid} moved back to the ready queue.`);
      }
      default:
        return err(`Usage: ${processCmd.usage}`);
    }
  },
};

const forkCmd: CommandDef = {
  name: "fork",
  usage: "fork <pid>",
  description: "Fork a process: creates a child copy (PPID = the given process).",
  topic: "processes",
  run: (args, ctx) => {
    const pid = Number(args[0]);
    const s = ctx.system().processes;
    if (!Number.isInteger(pid)) return err(`Usage: fork <pid> — e.g. fork 1`);
    const parent = s.processes.find((p) => p.pid === pid);
    if (!parent) return err(`No process with PID ${pid}. Try "process list".`);
    const childPid = s.nextPid;
    ctx.dispatch("processes", { type: "fork", payload: pid });
    return ok(`fork(${pid}) → child PID ${childPid} (copy of “${parent.name}”), both now ready.`);
  },
};

const waitCmd: CommandDef = {
  name: "wait",
  usage: "wait <pid>",
  description: "Make a parent wait(): reaps a zombie child or blocks until one exits.",
  topic: "processes",
  run: (args, ctx) => {
    const pid = Number(args[0]);
    const s = ctx.system().processes;
    if (!Number.isInteger(pid)) return err(`Usage: wait <pid> — the CALLER's pid, e.g. wait 1`);
    const caller = s.processes.find((p) => p.pid === pid);
    if (!caller) return err(`No process with PID ${pid}.`);
    const zombieChild = s.processes.find((p) => p.ppid === pid && p.state === "zombie");
    ctx.dispatch("processes", { type: "wait", payload: pid });
    const after = ctx.system().processes;
    if (zombieChild && !after.processes.some((p) => p.pid === zombieChild.pid)) {
      return ok(`wait(${pid}) reaped zombie PID ${zombieChild.pid} — parent got its exit status.`);
    }
    if (after.processes.find((p) => p.pid === pid)?.state === "blocked") {
      return ok(`wait(${pid}): no zombie yet — parent blocks until a child terminates.`);
    }
    return ok(`wait(${pid}) done. Check "process list" for the effect.`);
  },
};

// ---------------------------------------------------------------------------
// scheduling
// ---------------------------------------------------------------------------

const scheduleCmd: CommandDef = {
  name: "schedule",
  usage: "schedule fcfs | sjf | srtf | priority | rr <quantum>",
  description: "Run the scheduler with the current process set and print the timeline.",
  topic: "scheduling",
  run: (args, ctx) => {
    const alg = args[0];
    const valid = ["fcfs", "sjf", "srtf", "priority", "rr"] as const;
    if (!alg || !valid.includes(alg as (typeof valid)[number])) {
      return err(`Usage: ${scheduleCmd.usage}`);
    }
    ctx.dispatch("scheduling", { type: "set-algorithm", payload: alg });
    if (alg === "rr") {
      const q = Number(args[1] ?? 2);
      if (!Number.isInteger(q) || q < 1) return err("Round Robin quantum must be a whole number ≥ 1.");
      ctx.dispatch("scheduling", { type: "set-quantum", payload: q });
    }
    // Reveal the whole timeline.
    for (let i = 0; i < 100; i += 1) ctx.dispatch("scheduling", { type: "tick" });
    const s = ctx.system().scheduling;
    if (s.error) return err(s.error);
    const lines: OutputLine[] = [
      { text: "Timeline (start-end = process):", tone: "accent" },
    ];
    for (const seg of s.result.timeline) {
      lines.push({
        text: `  ${String(seg.start).padStart(3)}-${String(seg.end).padEnd(3)} ${seg.pid ?? "IDLE"}`,
        tone: seg.pid ? "default" : "warn",
      });
    }
    const a = s.result.averages;
    lines.push({ text: `avg waiting=${a.waiting.toFixed(2)} · avg turnaround=${a.turnaround.toFixed(2)} · avg response=${a.response.toFixed(2)} · CPU=${Math.round(a.cpuUtilization * 100)}%`, tone: "ok" });
    lines.push({ text: "The Gantt panel below shows the same result — the terminal and the visualization share one state.", tone: "muted" });
    return lines;
  },
};

// ---------------------------------------------------------------------------
// memory
// ---------------------------------------------------------------------------

const memoryCmd: CommandDef = {
  name: "memory",
  usage: "memory map | memory alloc <name> <size> | memory free <name> | memory compact",
  description: "Inspect and manipulate the simulated 64-unit memory strip.",
  topic: "memory",
  run: (args, ctx) => {
    const sub = args[0];
    const s = () => ctx.system().memory;
    switch (sub) {
      case "map": {
        const lines: OutputLine[] = [{ text: "Memory map (start-end: owner):", tone: "accent" }];
        for (const b of s().blocks) {
          lines.push({
            text: `  ${String(b.start).padStart(2)}-${String(b.start + b.size).padEnd(2)} ${b.owner ?? "FREE"}`,
            tone: b.owner ? "default" : "warn",
          });
        }
        lines.push({
          text: `strategy=${s().strategy}-fit · fragmentation=${s().stats.externalFragPercent}% · largest hole=${s().stats.largestFree}u`,
          tone: "muted",
        });
        return lines;
      }
      case "alloc": {
        const name = args[1];
        const size = Number(args[2]);
        if (!name || !Number.isInteger(size)) {
          return err(`Usage: memory alloc <name> <size> — e.g. memory alloc P9 8`);
        }
        const failed = s().stats.failedAllocs;
        ctx.dispatch("memory", { type: "alloc", payload: { pid: name, size } });
        const after = s();
        const placed = after.blocks.find((b) => b.owner === name);
        if (placed) {
          return ok(`Allocated ${size} units to ${name} at ${placed.start} (${after.strategy}-fit).`);
        }
        const reason = after.stats.failedAllocs > failed ? "No hole was large enough (see the fragmentation note)." : after.error ?? "Allocation refused.";
        return err(`Allocation of ${size} for ${name} failed — ${reason}`);
      }
      case "free": {
        const name = args[1];
        if (!name) return err(`Usage: memory free <name>`);
        if (!s().blocks.some((b) => b.owner === name)) return err(`No allocation owned by “${name}”. Try "memory map".`);
        ctx.dispatch("memory", { type: "free", payload: name });
        return ok(`Freed ${name}'s memory; adjacent holes merged.`);
      }
      case "compact": {
        ctx.dispatch("memory", { type: "compact" });
        return ok("Memory compacted — all holes merged into one trailing free block.");
      }
      default:
        return err(`Usage: ${memoryCmd.usage}`);
    }
  },
};

// ---------------------------------------------------------------------------
// paging
// ---------------------------------------------------------------------------

const pagingCmd: CommandDef = {
  name: "paging",
  usage: "paging show | paging access <address> | paging set-string <a,b,...>",
  description: "Walk the paging lab: TLB, page table, faults (16 pages × 16 units).",
  topic: "virtual-memory",
  run: (args, ctx) => {
    const sub = args[0];
    const s = () => ctx.system().vm;
    switch (sub) {
      case "show": {
        const vm = s();
        const lines: OutputLine[] = [
          { text: `frames(${vm.frames.length}): ${vm.frames.map((f) => (f === null ? "–" : `p${f}`)).join(" ")}`, tone: "default" },
          { text: `TLB: ${vm.tlb.length === 0 ? "(empty)" : vm.tlb.map((e) => `p${e.vpage}→f${e.frame}`).join(", ")}`, tone: "muted" },
        ];
        const resident = vm.pageTable.filter((p) => p.present);
        lines.push({
          text: `resident: ${resident.length === 0 ? "(none)" : resident.map((p) => `p${p.vpage}→f${p.frame}${p.shared ? "(cow)" : ""}`).join(", ")}`,
          tone: "default",
        });
        lines.push({
          text: `walk: ${vm.cursor}/${vm.referenceString.length} refs · faults=${vm.faultCount} · tlbHits=${vm.tlbHits} · totals FIFO=${vm.totals.fifo.faults} LRU=${vm.totals.lru.faults} OPT=${vm.totals.optimal.faults}`,
          tone: "muted",
        });
        return lines;
      }
      case "access": {
        const addr = Number(args[1]);
        if (!Number.isInteger(addr)) return err(`Usage: paging access <address 0-255> — e.g. paging access 42`);
        ctx.dispatch("vm", { type: "access", payload: addr });
        const vm = s();
        const step = vm.currentStep;
        if (!step) return err("Access failed.");
        return [
          {
            text: `0x${addr.toString(16).toUpperCase()} → page ${step.vpage}, offset ${step.offset}: ${step.tlbHit ? "TLB hit" : "TLB miss"}; ${step.fault ? `PAGE FAULT${step.evicted !== null ? ` (evicted p${step.evicted})` : " (free frame used)"}` : "no fault"}.`,
            tone: step.fault ? "warn" : "ok",
          },
        ];
      }
      case "set-string": {
        const value = args.slice(1).join(" ");
        ctx.dispatch("vm", { type: "set-string", payload: value });
        const vm = s();
        if (vm.error) return err(vm.error);
        return ok(`Reference string set (${vm.referenceString.length} refs). Fault totals recomputed for all algorithms.`);
      }
      default:
        return err(`Usage: ${pagingCmd.usage}`);
    }
  },
};

// ---------------------------------------------------------------------------
// deadlock
// ---------------------------------------------------------------------------

const deadlockCmd: CommandDef = {
  name: "deadlock",
  usage: "deadlock detect | deadlock request <pid> <A> <B> <C> | deadlock check",
  description: "Run RAG detection or a Banker's request against the simulated system.",
  topic: "deadlocks",
  run: (args, ctx) => {
    const sub = args[0];
    if (sub === "detect") {
      ctx.dispatch("rag", { type: "detect" });
      const a = ctx.system().rag.analysis;
      return [
        {
          text: a ? (a.deadlocked.length === 0 ? "RAG: no deadlock — reduction completes for every process." : `RAG: DEADLOCKED processes: ${a.deadlocked.join(", ")}.`) : "Analysis failed.",
          tone: a && a.deadlocked.length === 0 ? "ok" : "bad",
        },
      ];
    }
    if (sub === "request") {
      const pid = args[1];
      const vector = args.slice(2, 5).map(Number);
      if (!pid || vector.length !== 3 || vector.some((v) => !Number.isInteger(v) || v < 0)) {
        return err(`Usage: ${deadlockCmd.usage}`);
      }
      ctx.dispatch("bankers", { type: "request", payload: { pid, vector } });
      const r = ctx.system().bankers.lastRequest;
      if (!r) return err("Request failed.");
      return [
        { text: `${r.granted ? "GRANTED" : "DENIED"} — ${r.reason}`, tone: r.granted ? "ok" : "bad" },
        ...(r.safeSequence.length > 0 ? [{ text: `safe sequence: ${r.safeSequence.join(" → ")}`, tone: "muted" as const }] : []),
      ];
    }
    if (sub === "check") {
      ctx.dispatch("bankers", { type: "safety-check" });
      const r = ctx.system().bankers.lastRequest;
      return [{ text: r ? r.reason : "Check failed.", tone: r?.granted ? "ok" : "bad" }];
    }
    return err(`Usage: ${deadlockCmd.usage}`);
  },
};

// ---------------------------------------------------------------------------
// files
// ---------------------------------------------------------------------------

const filesCmd: CommandDef = {
  name: "files",
  usage: "files list | files read <path> | files create <path> <blocks> | files delete <path>",
  description: "Operate on the simulated 32-block filesystem.",
  topic: "filesystems",
  run: (args, ctx) => {
    const sub = args[0];
    const s = () => ctx.system().files;
    switch (sub) {
      case "list": {
        const lines: OutputLine[] = [{ text: "NAME                INODE  SIZE  BLOCKS", tone: "accent" }];
        for (const f of s().files) {
          lines.push({
            text: `${f.name.padEnd(19)} ${String(f.inode).padEnd(6)} ${String(f.sizeBlocks).padEnd(5)} [${f.blocks.join(", ")}]`,
            tone: "default",
          });
        }
        const free = s().used.filter((u) => !u).length;
        lines.push({ text: `allocation=${s().allocation} · ${free}/${s().totalBlocks} blocks free`, tone: "muted" });
        return lines;
      }
      case "read": {
        const path = args[1];
        if (!path) return err(`Usage: files read <path>`);
        if (!s().files.some((f) => f.name === path)) return err(`No file ${path}. Try "files list".`);
        ctx.dispatch("files", { type: "read", payload: path });
        const trace = s().operationTrace;
        return ok(`read ${path}: traced blocks ${trace.join(" → ")}.`);
      }
      case "create": {
        const path = args[1];
        const size = Number(args[2]);
        if (!path || !Number.isInteger(size)) return err(`Usage: files create <path> <blocks 1-8>`);
        ctx.dispatch("files", { type: "create", payload: { path, sizeBlocks: size } });
        const after = s();
        const file = after.files.find((f) => f.name === path);
        if (file) return ok(`Created ${path} (inode ${file.inode}) at blocks [${file.blocks.join(", ")}].`);
        return err(after.error ?? after.eventLog.at(-1)?.label ?? "Create failed.");
      }
      case "delete": {
        const path = args[1];
        if (!path) return err(`Usage: files delete <path>`);
        if (!s().files.some((f) => f.name === path)) return err(`No file ${path}.`);
        ctx.dispatch("files", { type: "delete", payload: path });
        return ok(`Deleted ${path}; blocks freed.`);
      }
      default:
        return err(`Usage: ${filesCmd.usage}`);
    }
  },
};

// ---------------------------------------------------------------------------
// reset
// ---------------------------------------------------------------------------

const simulateCmd: CommandDef = {
  name: "simulate",
  usage: "simulate reset",
  description: "Reset every simulated subsystem to its default scenario.",
  topic: "meta",
  run: (args, ctx) => {
    if (args[0] !== "reset") return err(`Usage: ${simulateCmd.usage}`);
    ctx.resetAll();
    return ok("All simulated subsystems reset (interrupts, processes, scheduler).");
  },
};

export const COMMANDS: Record<string, CommandDef> = Object.fromEntries(
  [help, clear, concepts, status, interruptCmd, interruptsList, processCmd, forkCmd, waitCmd, scheduleCmd, memoryCmd, pagingCmd, deadlockCmd, filesCmd, simulateCmd].map(
    (c) => [c.name, c],
  ),
);

export const SUGGESTED = [
  "help",
  "status",
  "interrupt timer",
  "interrupts list",
  "process list",
  "process create worker",
  "fork 2",
  "wait 1",
  "schedule fcfs",
  "schedule srtf",
  "schedule rr 2",
  "memory map",
  "memory alloc P9 8",
  "memory compact",
  "paging show",
  "paging access 42",
  "deadlock detect",
  "deadlock check",
  "deadlock request P1 1 0 2",
  "files list",
  "files read /docs/readme.txt",
  "files create /tmp/x 3",
  "concepts",
];

/** Parse a raw line into argv (simple whitespace split; quotes group words). */
export function parseLine(line: string): string[] {
  const tokens: string[] = [];
  const re = /"([^"]*)"|'([^']*)'|(\S+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line)) !== null) {
    tokens.push(m[1] ?? m[2] ?? m[3]);
  }
  return tokens;
}

/** Execute a command line against the context. Unknown → honest failure. */
export function executeLine(line: string, ctx: CommandContext): OutputLine[] {
  const argv = parseLine(line.trim());
  if (argv.length === 0) return [];
  const name = argv[0];
  const cmd =
    COMMANDS[name] ??
    // allow two-word commands like "interrupt timer" typed as one
    (argv.length > 1 ? COMMANDS[`${name} ${argv[1]}`] : undefined);
  if (!cmd) {
    return [
      err(`Unknown command: “${line.trim()}”`)[0],
      { text: "This is a safe educational interpreter — it only understands its documented commands.", tone: "muted" },
      { text: 'Type "help" to list them, or "concepts" to see what each teaches.', tone: "muted" },
    ];
  }
  // For two-word registered commands (none currently), pass remaining args.
  const args = argv.slice(1);
  return cmd.run(args, ctx);
}
