"use client";

import Link from "next/link";
import { SIM_TITLES } from "@/data/curriculum/config";
import { TerminalIcon } from "@/components/ui/icons";

/** Independent labs — experiments here never affect course progress. */
export default function PlaygroundPage() {
  const simIds = Object.keys(SIM_TITLES);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink sm:text-3xl">Playground</h1>
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

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {simIds.map((simId) => (
          <li key={simId}>
            <Link
              href={`/playground/${simId}`}
              className="card panel-pad block h-full transition-colors hover:border-accent/50"
            >
              <h2 className="text-sm font-semibold text-ink">{SIM_TITLES[simId]}</h2>
              <p className="mt-1.5 text-xs leading-relaxed text-ink-muted">
                {SIM_DESCRIPTIONS[simId] ??
                  "An interactive lab backed by a real simulation engine."}
              </p>
              <span className="link mt-3 inline-block text-xs">Open lab →</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

const SIM_DESCRIPTIONS: Record<string, string> = {
  "computer-diagram": "Explore how data moves between CPU, RAM, storage and devices.",
  "boot-sequence": "Step through firmware, bootloader and kernel startup.",
  "interrupt-lab": "Raise interrupts, watch the CPU save state and run handlers.",
  "polling-vs-interrupt": "Race polling against interrupt-driven I/O.",
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
