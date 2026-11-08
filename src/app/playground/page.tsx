"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { MODULES, SIM_TITLES } from "@/data/curriculum/config";
import { TerminalIcon } from "@/components/ui/icons";

/**
 * Playground index — one job: find and open a lab. Grouped by theme, with a
 * search box and locally-remembered recent labs (Plan Phase 4).
 */

const GROUPS: { id: string; title: string; blurb: string; sims: string[] }[] = [
  {
    id: "computer-boot",
    title: "Computer & boot",
    blurb: "The machine itself, and how it wakes up.",
    sims: ["computer-diagram", "boot-sequence"],
  },
  {
    id: "interrupts-io",
    title: "Interrupts & I/O",
    blurb: "How the CPU notices and serves devices.",
    sims: ["interrupt-lab", "polling-vs-interrupt", "io-transfer-lab"],
  },
  {
    id: "processes-scheduling",
    title: "Processes & scheduling",
    blurb: "Programs becoming processes, and taking turns.",
    sims: ["process-lab", "fork-wait-lab", "scheduling-lab"],
  },
  {
    id: "memory",
    title: "Memory",
    blurb: "Address spaces, translation and replacement.",
    sims: [
      "memory-allocation-lab",
      "address-translation-lab",
      "paging-lab",
      "page-replacement-lab",
    ],
  },
  {
    id: "concurrency-deadlock",
    title: "Concurrency & deadlock",
    blurb: "Threads racing, synchronizing, and waiting on each other.",
    sims: [
      "race-condition-lab",
      "bounded-buffer-lab",
      "producer-consumer-lab",
      "readers-writers-lab",
      "dining-philosophers-lab",
      "rag-lab",
      "bankers-lab",
    ],
  },
  {
    id: "storage",
    title: "Storage & I/O scheduling",
    blurb: "Files on disk and the head that fetches them.",
    sims: ["filesystem-lab", "disk-scheduling-lab"],
  },
  {
    id: "systems",
    title: "Systems & capstone",
    blurb: "Syscalls, protection, virtualization — and the whole story.",
    sims: [
      "syscall-lab",
      "protection-lab",
      "virtualization-lab",
      "multiproc-lab",
      "capstone-sim",
    ],
  },
];

/** simId → the course module that teaches it (for the "from" line). */
const MODULE_BY_SIM: Record<string, { id: string; title: string }> = {};
for (const m of MODULES) {
  for (const sim of m.simIds) {
    if (!MODULE_BY_SIM[sim]) MODULE_BY_SIM[sim] = { id: m.id, title: m.title };
  }
}

const RECENTS_KEY = "visual-os-academy-playground-recents";

export default function PlaygroundPage() {
  const [query, setQuery] = useState("");
  const [recents, setRecents] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(RECENTS_KEY);
      if (raw) setRecents(JSON.parse(raw).filter((s: unknown) => typeof s === "string"));
    } catch {
      /* private mode / corrupt value — ignore */
    }
  }, []);

  const rememberVisit = (simId: string) => {
    try {
      const next = [simId, ...recents.filter((s) => s !== simId)].slice(0, 4);
      setRecents(next);
      window.localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  const q = query.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      GROUPS.map((g) => ({
        ...g,
        sims: g.sims.filter(
          (s) =>
            q === "" ||
            SIM_TITLES[s]?.toLowerCase().includes(q) ||
            (SIM_DESCRIPTIONS[s] ?? "").toLowerCase().includes(q) ||
            g.title.toLowerCase().includes(q),
        ),
      })).filter((g) => g.sims.length > 0),
    [q],
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink sm:text-3xl">Playground</h1>
          <p className="mt-2 max-w-2xl text-sm text-ink-muted">
            Every simulation from the course, free to experiment with. Nothing
            here affects your course progress. Prefer typing? The educational
            terminal drives the same engines.
          </p>
        </div>
        <Link href="/playground/terminal" className="btn btn-primary">
          <TerminalIcon /> Open the terminal
        </Link>
      </header>

      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1">
          <span className="section-label">Find a lab</span>
          <input
            type="search"
            className="w-full max-w-md rounded-md border border-line bg-panel px-3 py-2.5 text-sm text-ink"
            placeholder="Search by name, topic or module…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search labs"
          />
        </label>
        {recents.length > 0 && q === "" ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="section-label">Recently opened</span>
            {recents.map((simId) =>
              SIM_TITLES[simId] ? (
                <Link
                  key={simId}
                  href={`/playground/${simId}`}
                  className="chip hover:border-accent/50"
                >
                  {SIM_TITLES[simId]}
                </Link>
              ) : null,
            )}
          </div>
        ) : null}
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-lg border border-line bg-bg-soft px-4 py-6 text-center text-sm text-ink-muted">
          No lab matches “{query}”. Try “scheduling”, “deadlock”, “paging”…
        </p>
      ) : (
        filtered.map((group) => (
          <section key={group.id} aria-labelledby={`group-${group.id}`} className="space-y-3">
            <div>
              <h2 id={`group-${group.id}`} className="text-lg font-semibold text-ink">
                {group.title}
              </h2>
              <p className="text-xs text-ink-muted">{group.blurb}</p>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {group.sims.map((simId) => (
                <li key={simId}>
                  <Link
                    href={`/playground/${simId}`}
                    className="card panel-pad block h-full transition-colors hover:border-accent/50"
                    onClick={() => rememberVisit(simId)}
                  >
                    <div className="flex items-start gap-3">
                      <GroupGlyph group={group.id} />
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-ink">{SIM_TITLES[simId]}</h3>
                        <p className="mt-1.5 text-xs leading-relaxed text-ink-muted">
                          {SIM_DESCRIPTIONS[simId] ??
                            "An interactive lab backed by a real simulation engine."}
                        </p>
                        {MODULE_BY_SIM[simId] ? (
                          <p className="mt-2 text-xs text-ink-faint">
                            Taught in{" "}
                            <span className="font-medium text-ink-muted">
                              {MODULE_BY_SIM[simId].title}
                            </span>
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <span className="link mt-3 inline-block text-xs">Open lab →</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}

/**
 * Small static diagram per group — a hint at the lab's mechanism, drawn in
 * the theme's tokens. Not illustration: each glyph is the lab's actual shape
 * (timeline bars, address strip, graph, head path, frame grid…).
 */
function GroupGlyph({ group }: { group: string }) {
  const common = {
    width: 44,
    height: 44,
    viewBox: "0 0 44 44",
    "aria-hidden": true as const,
    className: "shrink-0 rounded-md border border-line bg-bg-soft p-1",
  };
  switch (group) {
    case "computer-boot":
      return (
        <svg {...common}>
          <rect x="6" y="6" width="14" height="14" rx="2" fill="rgb(var(--p-blue))" />
          <rect x="24" y="6" width="14" height="14" rx="2" fill="rgb(var(--p-green))" />
          <rect x="6" y="24" width="14" height="14" rx="2" fill="rgb(var(--p-amber))" />
          <rect x="24" y="24" width="14" height="14" rx="2" fill="rgb(var(--p-violet))" />
        </svg>
      );
    case "interrupts-io":
      return (
        <svg {...common}>
          <polyline
            points="4,30 14,30 18,12 24,34 30,18 34,30 40,30"
            fill="none"
            stroke="rgb(var(--accent))"
            strokeWidth="2"
          />
        </svg>
      );
    case "processes-scheduling":
      return (
        <svg {...common}>
          <rect x="6" y="8" width="24" height="6" rx="2" fill="rgb(var(--p-blue))" />
          <rect x="6" y="18" width="14" height="6" rx="2" fill="rgb(var(--p-green))" />
          <rect x="6" y="28" width="32" height="6" rx="2" fill="rgb(var(--p-amber))" />
        </svg>
      );
    case "memory":
      return (
        <svg {...common}>
          <rect x="6" y="8" width="32" height="8" fill="rgb(var(--p-blue))" />
          <rect x="6" y="18" width="12" height="8" fill="rgb(var(--bad))" opacity="0.35" />
          <rect x="20" y="18" width="18" height="8" fill="rgb(var(--p-green))" />
          <rect x="6" y="28" width="20" height="8" fill="rgb(var(--p-amber))" />
          <rect x="28" y="28" width="10" height="8" fill="rgb(var(--bad))" opacity="0.35" />
        </svg>
      );
    case "concurrency-deadlock":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="6" fill="none" stroke="rgb(var(--accent))" strokeWidth="2" />
          <rect x="26" y="26" width="12" height="12" rx="2" fill="none" stroke="rgb(var(--accent))" strokeWidth="2" />
          <line x1="17" y1="15" x2="26" y2="26" stroke="rgb(var(--ink-faint))" strokeWidth="1.5" />
          <line x1="30" y1="24" x2="17" y2="17" stroke="rgb(var(--bad))" strokeWidth="1.5" />
        </svg>
      );
    case "storage":
      return (
        <svg {...common}>
          <path d="M6 36 C 14 36, 14 8, 24 8 S 36 36, 38 36" fill="none" stroke="rgb(var(--accent))" strokeWidth="2" />
          <circle cx="6" cy="36" r="2.5" fill="rgb(var(--ink-faint))" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <path d="M8 10 v18 a4 4 0 0 0 4 4 h8" fill="none" stroke="rgb(var(--p-violet))" strokeWidth="2" />
          <path d="M36 10 v18 a4 4 0 0 1 -4 4 h-8" fill="none" stroke="rgb(var(--p-cyan))" strokeWidth="2" />
          <rect x="18" y="18" width="8" height="8" rx="1" fill="rgb(var(--p-amber))" />
        </svg>
      );
  }
}

const SIM_DESCRIPTIONS: Record<string, string> = {
  "computer-diagram": "Explore how data moves between CPU, RAM, storage and devices.",
  "boot-sequence": "Step through firmware, bootloader and kernel startup.",
  "interrupt-lab": "Raise interrupts, watch the CPU save state and run handlers.",
  "polling-vs-interrupt": "Race polling against interrupt-driven I/O, tick by tick.",
  "process-lab": "Create, block, resume and terminate processes in a live table.",
  "fork-wait-lab": "Fork children, wait for them, and meet zombies and orphans.",
  "scheduling-lab": "Compare FCFS, SJF, SRTF, priority and Round Robin on the same jobs.",
  "race-condition-lab": "Interleave two threads instruction by instruction.",
  "bounded-buffer-lab": "Producers and consumers sharing a bounded buffer.",
  "memory-allocation-lab": "First fit, best fit, worst fit — and the holes they leave.",
  "address-translation-lab": "Translate logical addresses with base and limit checks.",
  "paging-lab": "Walk an address through page table and TLB.",
  "page-replacement-lab": "FIFO vs LRU vs Optimal on your own reference string.",
  "rag-lab": "Build resource allocation graphs and detect deadlock cycles.",
  "bankers-lab": "Grant or deny requests with the Banker's algorithm.",
  "producer-consumer-lab": "Semaphores in action on the classic bounded buffer.",
  "readers-writers-lab": "Readers and writers negotiating database access.",
  "dining-philosophers-lab": "Five philosophers, five forks, no starvation please.",
  "filesystem-lab": "Create files and watch blocks, inodes and free space change.",
  "disk-scheduling-lab": "Race disk-head algorithms over a request queue.",
  "io-transfer-lab": "PIO vs interrupt-driven vs DMA — who talks to the CPU?",
  "syscall-lab": "Step through a system call from user code into the kernel.",
  "protection-lab": "Permission bits, memory bounds, and what the kernel allows.",
  "virtualization-lab": "Peel the layers of VMs and containers.",
  "multiproc-lab": "Spread tasks across CPUs; meet real-time deadlines.",
  "capstone-sim": "One program's full journey through the machine.",
};
