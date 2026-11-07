import type { ModuleDef } from "@/types";

/**
 * The curriculum registry — the single source of truth for module metadata,
 * prerequisites, lesson ids and simulation ids. Lesson bodies live in
 * `src/data/curriculum/lessons/<moduleId>.ts`; quiz banks in
 * `src/data/questions/<moduleId>.ts`; glossary entries in
 * `src/data/glossary/<moduleId>.ts`. All of them must use the ids below.
 */
export const MODULES: ModuleDef[] = [
  {
    id: "intro-computers-os",
    num: 0,
    title: "Computers & Operating Systems",
    tagline: "What a computer is and why it needs a manager",
    description:
      "Start from zero: what hardware does, what software is, and why applications cannot simply control the machine. Meet the kernel, user space, and the boot process.",
    prereqIds: [],
    simIds: ["computer-diagram", "boot-sequence"],
  },
  {
    id: "interrupts",
    num: 1,
    title: "Interrupts, Exceptions & Traps",
    tagline: "How the CPU notices the world",
    description:
      "A CPU can only do one thing at a time — so how does it react to a keyboard press or a timer? Explore the interrupt lifecycle step by step, and compare interrupt-driven designs with polling.",
    prereqIds: ["intro-computers-os"],
    simIds: ["interrupt-lab", "polling-vs-interrupt"],
  },
  {
    id: "processes",
    num: 2,
    title: "Processes & Process Control",
    tagline: "Programs in motion",
    description:
      "What happens when a program starts running? Process states, the process control block, context switches, fork/exec/wait, zombies and orphans — all in a live process table.",
    prereqIds: ["interrupts"],
    simIds: ["process-lab", "fork-wait-lab"],
  },
  {
    id: "cpu-scheduling",
    num: 3,
    title: "CPU Scheduling",
    tagline: "One CPU, many jobs — who runs next?",
    description:
      "Watch jobs compete for a single CPU. Discover FCFS, SJF, SRTF, priority and Round Robin as solutions to real problems, and compute waiting time, turnaround time and response time from the timeline.",
    prereqIds: ["processes"],
    simIds: ["scheduling-lab"],
  },
  {
    id: "threads-concurrency",
    num: 4,
    title: "Threads & Concurrency",
    tagline: "When two things run at once",
    description:
      "Threads share a process's memory — which is both a superpower and a hazard. Step through race conditions one instruction at a time and meet locks, mutexes and atomicity.",
    prereqIds: ["cpu-scheduling"],
    simIds: ["race-condition-lab", "bounded-buffer-lab"],
  },
  {
    id: "memory-management",
    num: 5,
    title: "Memory Management",
    tagline: "Dividing RAM without chaos",
    description:
      "Many programs, one physical memory. Learn allocation strategies, fragmentation, compaction, and how base/limit registers protect processes from each other.",
    prereqIds: ["threads-concurrency"],
    simIds: ["memory-allocation-lab", "address-translation-lab"],
  },
  {
    id: "virtual-memory",
    num: 6,
    title: "Virtual Memory & Paging",
    tagline: "Every process gets its own (fake) memory",
    description:
      "Pages, frames, page tables, TLBs, page faults and replacement algorithms — the machinery that lets each program believe it has all the memory to itself.",
    prereqIds: ["memory-management"],
    simIds: ["paging-lab", "page-replacement-lab"],
  },
  {
    id: "deadlocks",
    num: 7,
    title: "Deadlocks",
    tagline: "When everyone waits forever",
    description:
      "Two processes each hold what the other needs. Resource allocation graphs, the four deadlock conditions, Banker's algorithm, safe states, detection and recovery.",
    prereqIds: ["virtual-memory"],
    simIds: ["rag-lab", "bankers-lab"],
  },
  {
    id: "synchronization",
    num: 8,
    title: "Synchronization Deep Dive",
    tagline: "Taking turns, properly",
    description:
      "Classical synchronization problems solved for real: producer-consumer, readers-writers and dining philosophers, with semaphores, condition variables and honest trade-offs.",
    prereqIds: ["deadlocks"],
    simIds: ["producer-consumer-lab", "readers-writers-lab", "dining-philosophers-lab"],
  },
  {
    id: "filesystems",
    num: 9,
    title: "Filesystems & Storage",
    tagline: "Where bytes live between runs",
    description:
      "Files, directories, inodes and block allocation. Watch a filesystem lay out files, free space and metadata — then race a disk head through FCFS, SSTF, SCAN and friends.",
    prereqIds: ["synchronization"],
    simIds: ["filesystem-lab", "disk-scheduling-lab"],
  },
  {
    id: "io-systems",
    num: 10,
    title: "I/O Systems & Device Drivers",
    tagline: "Talking to the outside world",
    description:
      "Device controllers and drivers, programmed I/O versus interrupts versus DMA, buffering, caching, spooling, and the difference between blocking and asynchronous I/O.",
    prereqIds: ["filesystems"],
    simIds: ["io-transfer-lab"],
  },
  {
    id: "syscalls-security",
    num: 11,
    title: "System Calls, Protection & Security",
    tagline: "The guarded doorway into the kernel",
    description:
      "How user code asks the kernel for services, how privilege levels work, and how protection — permissions, isolation, least privilege — keeps one process from wrecking the rest.",
    prereqIds: ["io-systems"],
    simIds: ["syscall-lab", "protection-lab"],
  },
  {
    id: "virtualization",
    num: 12,
    title: "Virtualization & Modern OS Concepts",
    tagline: "Operating systems on operating systems",
    description:
      "Hypervisors, guest OSes, containers and namespaces, multicore scheduling, NUMA, real-time and embedded systems — how OS ideas scale up and scale down.",
    prereqIds: ["syscalls-security"],
    simIds: ["virtualization-lab", "multiproc-lab"],
  },
  {
    id: "capstone",
    num: 13,
    title: "Putting It All Together",
    tagline: "Follow one program through the whole machine",
    description:
      "A guided end-to-end simulator: from program load to process creation, memory allocation, scheduling, system calls, I/O, interrupts, files and clean termination.",
    prereqIds: ["virtualization"],
    simIds: ["capstone-sim"],
  },
];

export const MODULE_MAP: Record<string, ModuleDef> = Object.fromEntries(
  MODULES.map((m) => [m.id, m]),
);

/** Lessons defined per module (ids must match the definitions here). */
export const CURRICULUM_LESSON_IDS: Record<string, string[]> = {
  "intro-computers-os": [
    "intro-computers-os/what-is-a-computer",
    "intro-computers-os/why-an-os",
    "intro-computers-os/kernel-user-space",
    "intro-computers-os/booting",
  ],
  interrupts: [
    "interrupts/why-interrupts",
    "interrupts/interrupt-lifecycle",
    "interrupts/polling-vs-interrupts",
    "interrupts/priorities-masking",
  ],
  processes: [
    "processes/program-vs-process",
    "processes/process-states",
    "processes/fork-exec-wait",
    "processes/zombies-orphans-ipc",
  ],
  "cpu-scheduling": [
    "cpu-scheduling/one-cpu-many-jobs",
    "cpu-scheduling/fcfs-sjf-srtf",
    "cpu-scheduling/round-robin",
    "cpu-scheduling/priority-and-metrics",
  ],
  "threads-concurrency": [
    "threads-concurrency/processes-vs-threads",
    "threads-concurrency/race-conditions",
    "threads-concurrency/critical-sections-locks",
    "threads-concurrency/classical-problems-tour",
  ],
  "memory-management": [
    "memory-management/why-manage-memory",
    "memory-management/contiguous-allocation",
    "memory-management/fragmentation-compaction",
    "memory-management/base-limit-protection",
  ],
  "virtual-memory": [
    "virtual-memory/why-virtual-memory",
    "virtual-memory/pages-frames-tlb",
    "virtual-memory/page-faults-demand-paging",
    "virtual-memory/replacement-algorithms",
    "virtual-memory/swapping-cow-mmap",
  ],
  deadlocks: [
    "deadlocks/what-is-deadlock",
    "deadlocks/resource-allocation-graphs",
    "deadlocks/bankers-algorithm",
    "deadlocks/detection-recovery",
  ],
  synchronization: [
    "synchronization/semaphores-mutexes",
    "synchronization/producer-consumer",
    "synchronization/readers-writers",
    "synchronization/dining-philosophers",
  ],
  filesystems: [
    "filesystems/files-directories",
    "filesystems/inodes-metadata",
    "filesystems/allocation-methods",
    "filesystems/permissions-journaling",
    "filesystems/disk-scheduling",
  ],
  "io-systems": [
    "io-systems/controllers-drivers",
    "io-systems/pio-interrupt-dma",
    "io-systems/buffering-caching-spooling",
    "io-systems/blocking-async-io",
  ],
  "syscalls-security": [
    "syscalls-security/system-calls",
    "syscalls-security/protection-isolation",
    "syscalls-security/access-control",
    "syscalls-security/attacks-defenses",
  ],
  virtualization: [
    "virtualization/virtual-machines",
    "virtualization/containers",
    "virtualization/multicore-numa",
    "virtualization/rt-embedded-mobile",
  ],
  capstone: [
    "capstone/follow-a-program",
    "capstone/big-picture",
  ],
};

export const LESSON_TITLES: Record<string, string> = {
  "intro-computers-os/what-is-a-computer": "What Is a Computer?",
  "intro-computers-os/why-an-os": "Why Do We Need an OS?",
  "intro-computers-os/kernel-user-space": "The Kernel and User Space",
  "intro-computers-os/booting": "Booting: How a Computer Wakes Up",
  "interrupts/why-interrupts": "Why Interrupts Exist",
  "interrupts/interrupt-lifecycle": "The Interrupt Lifecycle",
  "interrupts/polling-vs-interrupts": "Polling vs. Interrupts",
  "interrupts/priorities-masking": "Priorities, Masking & Latency",
  "processes/program-vs-process": "A Program Is Not a Process",
  "processes/process-states": "Process States & the PCB",
  "processes/fork-exec-wait": "fork, exec & wait",
  "processes/zombies-orphans-ipc": "Zombies, Orphans & IPC",
  "cpu-scheduling/one-cpu-many-jobs": "One CPU, Many Jobs",
  "cpu-scheduling/fcfs-sjf-srtf": "FCFS, SJF & SRTF",
  "cpu-scheduling/round-robin": "Round Robin & the Time Quantum",
  "cpu-scheduling/priority-and-metrics": "Priority, Aging & the Metrics",
  "threads-concurrency/processes-vs-threads": "Processes vs. Threads",
  "threads-concurrency/race-conditions": "Race Conditions",
  "threads-concurrency/critical-sections-locks": "Critical Sections & Locks",
  "threads-concurrency/classical-problems-tour": "A Tour of Classic Concurrency Bugs",
  "memory-management/why-manage-memory": "Why Memory Needs Managing",
  "memory-management/contiguous-allocation": "Contiguous Allocation Strategies",
  "memory-management/fragmentation-compaction": "Fragmentation & Compaction",
  "memory-management/base-limit-protection": "Base & Limit: Memory Protection",
  "virtual-memory/why-virtual-memory": "Why Virtual Memory Exists",
  "virtual-memory/pages-frames-tlb": "Pages, Frames & the TLB",
  "virtual-memory/page-faults-demand-paging": "Page Faults & Demand Paging",
  "virtual-memory/replacement-algorithms": "Page Replacement: FIFO, LRU & Optimal",
  "virtual-memory/swapping-cow-mmap": "Swapping, Copy-on-Write & mmap",
  "deadlocks/what-is-deadlock": "What Exactly Is a Deadlock?",
  "deadlocks/resource-allocation-graphs": "Resource Allocation Graphs",
  "deadlocks/bankers-algorithm": "Banker's Algorithm & Safe States",
  "deadlocks/detection-recovery": "Detection & Recovery",
  "synchronization/semaphores-mutexes": "Semaphores, Mutexes & Condition Variables",
  "synchronization/producer-consumer": "The Producer–Consumer Problem",
  "synchronization/readers-writers": "The Readers–Writers Problem",
  "synchronization/dining-philosophers": "The Dining Philosophers",
  "filesystems/files-directories": "Files, Directories & Paths",
  "filesystems/inodes-metadata": "Inodes & File Metadata",
  "filesystems/allocation-methods": "File Allocation Methods",
  "filesystems/permissions-journaling": "Permissions, Buffering & Journaling",
  "filesystems/disk-scheduling": "Disk Scheduling Algorithms",
  "io-systems/controllers-drivers": "Controllers & Drivers",
  "io-systems/pio-interrupt-dma": "PIO, Interrupt-Driven I/O & DMA",
  "io-systems/buffering-caching-spooling": "Buffering, Caching & Spooling",
  "io-systems/blocking-async-io": "Blocking, Non-blocking & Async I/O",
  "syscalls-security/system-calls": "The System Call Interface",
  "syscalls-security/protection-isolation": "Protection Rings & Isolation",
  "syscalls-security/access-control": "Access Control & Least Privilege",
  "syscalls-security/attacks-defenses": "Attack Surfaces & Defenses",
  "virtualization/virtual-machines": "Virtual Machines & Hypervisors",
  "virtualization/containers": "Containers & Namespaces",
  "virtualization/multicore-numa": "Multicore Scheduling & NUMA",
  "virtualization/rt-embedded-mobile": "Real-Time, Embedded & Mobile",
  "capstone/follow-a-program": "Follow a Program Through the Machine",
  "capstone/big-picture": "The Big Picture: One Connected System",
};

/** Simulations referenced by lessons (implemented in the sim registry). */
export const SIM_TITLES: Record<string, string> = {
  "computer-diagram": "Computer Anatomy Explorer",
  "boot-sequence": "Boot Sequence Stepper",
  "interrupt-lab": "Interrupt Lab",
  "polling-vs-interrupt": "Polling vs. Interrupts Race",
  "process-lab": "Process Table Lab",
  "fork-wait-lab": "fork / wait Laboratory",
  "scheduling-lab": "CPU Scheduling Lab",
  "race-condition-lab": "Race Condition Stepper",
  "bounded-buffer-lab": "Bounded Buffer Lab",
  "memory-allocation-lab": "Memory Allocation Lab",
  "address-translation-lab": "Address Translation Lab",
  "paging-lab": "Paging & TLB Lab",
  "page-replacement-lab": "Page Replacement Lab",
  "rag-lab": "Resource Allocation Graph Lab",
  "bankers-lab": "Banker's Algorithm Lab",
  "producer-consumer-lab": "Producer–Consumer Lab",
  "readers-writers-lab": "Readers–Writers Lab",
  "dining-philosophers-lab": "Dining Philosophers Lab",
  "filesystem-lab": "Filesystem Lab",
  "disk-scheduling-lab": "Disk Scheduling Lab",
  "io-transfer-lab": "I/O Transfer Lab",
  "syscall-lab": "System Call Lab",
  "protection-lab": "Protection Lab",
  "virtualization-lab": "Virtualization Lab",
  "multiproc-lab": "Multiprocessor Lab",
  "capstone-sim": "End-to-End Computer Simulator",
};

export function moduleSlug(id: string): string {
  return id;
}

export function moduleById(id: string): ModuleDef | undefined {
  return MODULE_MAP[id];
}
