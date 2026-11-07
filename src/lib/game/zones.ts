/**
 * MACHINA — the zone table. One zone per curriculum module (ids are the
 * module ids; nothing in the content contracts changes).
 */
import { MODULES as MODULE_LIST } from "@/data/curriculum/config";

export interface Zone {
  /** == module id */
  id: string;
  num: number;
  name: string;
  story: string;
  motif: "gate" | "spikes" | "forge" | "rails" | "loom" | "plots" | "slabs" | "junction" | "docks" | "archive" | "pipes" | "bastion" | "mirror" | "core";
  /** zone hue pair (dark-theme values; light theme darkens via CSS) */
  hue: [string, string];
  glyph: string;
  boss: { name: string; title: string; taunt: string; defeated: string };
}

export const ZONES: Zone[] = [
  {
    id: "intro-computers-os", num: 0, name: "Boot Docks",
    story: "Every machine wakes here. Learn the docks, earn your first signals.",
    motif: "gate", hue: ["#22d3ee", "#0ea5e9"], glyph: "⏻",
    boss: { name: "Boot Warden", title: "Keeper of the First Gate", taunt: "You dare boot without knowing what boots?", defeated: "The gate hums open. Welcome to Machina." },
  },
  {
    id: "interrupts", num: 1, name: "Signal Heights",
    story: "Towers that shout when the world needs the CPU. Learn to listen without dropping your work.",
    motif: "spikes", hue: ["#34d399", "#059669"], glyph: "⚡",
    boss: { name: "SIGINT", title: "The Tower That Never Sleeps", taunt: "Interrupt! …or was that a trap? Blink and you drop a frame.", defeated: "SIGINT dims. Every signal now finds its handler." },
  },
  {
    id: "processes", num: 2, name: "Fork Foundry",
    story: "Spawn bays and parent cranes. Everything here was forked from something.",
    motif: "forge", hue: ["#fbbf24", "#f59e0b"], glyph: "⑂",
    boss: { name: "The Foreman", title: "Forge of Ten Thousand Children", taunt: "wait() on me? I have orphaned stronger players.", defeated: "The Foreman reaps itself. The foundry is yours." },
  },
  {
    id: "cpu-scheduling", num: 3, name: "Cyan Yards",
    story: "One engine, endless queues. Order the wagons or watch the convoy crawl.",
    motif: "rails", hue: ["#38bdf8", "#0284c7"], glyph: "⛟",
    boss: { name: "Dispatcher", title: "Who Runs Next?", taunt: "First-come, first-served… forever. Enjoy the queue.", defeated: "The Dispatcher yields the timetable." },
  },
  {
    id: "threads-concurrency", num: 4, name: "The Loom",
    story: "Threads weaving one shared memory. Step wrong and the pattern races.",
    motif: "loom", hue: ["#fb7185", "#e11d48"], glyph: "⚔",
    boss: { name: "The Tangled Weaver", title: "Keeper of Lost Updates", taunt: "Two threads, one counter. You will never both win.", defeated: "The weave untangles. Mutual exclusion holds." },
  },
  {
    id: "memory-management", num: 5, name: "Stack Rows",
    story: "A city of plots and holes. Best-fit your way through the rubble.",
    motif: "plots", hue: ["#a3e635", "#65a30d"], glyph: "▦",
    boss: { name: "Heapkeeper", title: "Warden of Fragmented Plots", taunt: "17 free units — none of them big enough. Compacting? That costs.", defeated: "The plots align. The Heapkeeper moves on." },
  },
  {
    id: "virtual-memory", num: 6, name: "Paged Heights",
    story: "Sky-pages mapped to ground frames. Fault here, and the whole city stalls.",
    motif: "slabs", hue: ["#a78bfa", "#7c3aed"], glyph: "▤",
    boss: { name: "Page Phantom", title: "It Lives Between Tables", taunt: "Every lookup misses me. TLB? Never heard of it.", defeated: "The Phantom pages in — and stays." },
  },
  {
    id: "deadlocks", num: 7, name: "Gridlock Junction",
    story: "The intersection that froze itself. Untangle it — carefully.",
    motif: "junction", hue: ["#f87171", "#dc2626"], glyph: "⌖",
    boss: { name: "Gridlock Serpent", title: "Hold And Wait", taunt: "I hold what you need. You hold what I need. We dance forever.", defeated: "The serpent unwinds, cycle broken." },
  },
  {
    id: "synchronization", num: 8, name: "Semaphore Docks",
    story: "Harbour signals decide who docks, who waits, who starves.",
    motif: "docks", hue: ["#2dd4bf", "#0d9488"], glyph: "⚑",
    boss: { name: "The Arbitrator", title: "Five Philosophers, One Table", taunt: "Everyone grabs a fork. Nobody eats. Shall we?", defeated: "The Arbitrator takes turns — and lets you pass." },
  },
  {
    id: "filesystems", num: 9, name: "The Archive",
    story: "Vaults of blocks and inodes. Paper trails that survive crashes.",
    motif: "archive", hue: ["#fb923c", "#ea580c"], glyph: "▦",
    boss: { name: "Archivist Prime", title: "Nothing Leaves Without A Trail", taunt: "Contiguous? In THIS economy?", defeated: "The Archive opens its vaults." },
  },
  {
    id: "io-systems", num: 10, name: "Pulse Refinery",
    story: "Conduits pumping data to the outside world. Programmed, interrupted, or DMA'd.",
    motif: "pipes", hue: ["#e879f9", "#c026d3"], glyph: "≋",
    boss: { name: "Latency Beast", title: "It Eats Busy Cycles", taunt: "Poll for me. Poll forever. Feed me your CPU.", defeated: "DMA starves the Beast. The CPU is free." },
  },
  {
    id: "syscalls-security", num: 11, name: "The Bastion",
    story: "The guarded gate between rings. Privilege is earned here.",
    motif: "bastion", hue: ["#818cf8", "#4f46e5"], glyph: "⛨",
    boss: { name: "Gatekeeper", title: "Ring 0 Is Not For Guests", taunt: "Your syscall is invalid. Your credentials are invalid. You are invalid.", defeated: "The Gatekeeper validates you. Ring 0 opens." },
  },
  {
    id: "virtualization", num: 12, name: "Mirror Spire",
    story: "Worlds inside worlds. Which layer are you standing on?",
    motif: "mirror", hue: ["#c084fc", "#9333ea"], glyph: "⧉",
    boss: { name: "Mirror Lord", title: "The Host Of Hosts", taunt: "I am a VM running a VM running a VM. Which one fights you?", defeated: "The mirrors settle. One world remains." },
  },
  {
    id: "capstone", num: 13, name: "The Core",
    story: "Heart of Machina. Follow one program all the way through — and wake the Kernel.",
    motif: "core", hue: ["#fde68a", "#f59e0b"], glyph: "◉",
    boss: { name: "KERNEL PANIC", title: "The Final Fault", taunt: "FATAL EXCEPTION. Everything you learned — or everything stops.", defeated: "KERNEL PANIC contained. The Kernel wakes. Machina lives." },
  },
];

export const ZONE_MAP: Record<string, Zone> = Object.fromEntries(
  ZONES.map((z) => [z.id, z]),
);

/** Zone lookup with fallback to the first zone (for unknown routes). */
export function zoneFor(moduleId: string | undefined): Zone {
  return (moduleId && ZONE_MAP[moduleId]) || ZONES[0];
}

/** Which zone does this pathname belong to? (for scene mood + tints) */
export function zoneFromPathname(pathname: string): Zone {
  const parts = pathname.split("/").filter(Boolean);
  // /lesson/<moduleId>/… /roadmap/<moduleId> /quiz/<moduleId>
  for (const p of parts) {
    if (ZONE_MAP[p]) return ZONE_MAP[p];
  }
  // /playground/<simId> — find the module that owns this lab
  if (parts[0] === "playground" && parts[1]) {
    const simId = parts[1];
    const owner = MODULES_BY_SIM[simId];
    if (owner) return ZONE_MAP[owner];
  }
  return ZONES[0];
}

/** simId → moduleId, derived from the curriculum registry. */
export const MODULES_BY_SIM: Record<string, string> = (() => {
  const out: Record<string, string> = {};
  for (const m of MODULE_LIST) {
    for (const simId of m.simIds) out[simId] = m.id;
  }
  return out;
})();
