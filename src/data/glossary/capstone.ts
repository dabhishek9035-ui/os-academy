import type { GlossaryEntry } from "@/types";

/**
 * Glossary — module 13 (Putting It All Together).
 * The capstone's vocabulary: the journey, its stage map, the reactive triggers,
 * the exit path, and the ledger — cross-linked into every module it summarizes.
 */
export const entries: GlossaryEntry[] = [
  {
    id: "system-journey",
    term: "System journey",
    simple: "One program's complete path through the machine — from file on disk to reaped exit — naming the subsystem responsible at each step.",
    technical:
      "The capstone's ten-stage narrative: program loading → process creation → memory allocation → scheduling → syscall entry → I/O request → interrupt handling → resumption → file access → termination & cleanup. Each stage is a handoff between subsystems (filesystem, process management, virtual memory, scheduler, syscall interface, I/O system, drivers, interrupt machinery), caused by one of three triggers: syscall, fault, or interrupt.",
    example:
      "sumfile reads /docs/numbers.txt: the loader finds its inode, fork/exec creates it, demand paging fills its pages lazily, the scheduler picks it, open/read cross the syscall glass, DMA fetches the block, the interrupt wakes it, exit leaves a zombie the shell reaps.",
    related: ["process", "system-call", "interrupt", "dma", "context-switch", "page-fault"],
    moduleId: "capstone",
    lessonRef: "capstone/follow-a-program",
    simId: "capstone-sim",
  },
  {
    id: "boot-to-exit",
    term: "Boot to exit",
    simple: "The full span the course covers: the machine waking up at power-on, and one process ending — cleanly reaped — at the far end.",
    technical:
      "Bracketing the journey: booting (firmware → bootloader → kernel initialized, owning devices and the filesystem) is stage 0 that makes program loading possible; termination & cleanup (descriptors closed, address space destroyed, exit status recorded, zombie reaped by the parent's wait) is the stage that makes the machine reusable.",
    example:
      "The capstone sim starts at 'program loading' — but that stage presumes a booted kernel; and every run ends with exit status flowing to wait(), closing the loop the shell opened.",
    related: ["system-journey", "booting", "zombie", "teardown"],
    moduleId: "capstone",
    lessonRef: "capstone/follow-a-program",
    simId: "capstone-sim",
  },
  {
    id: "subsystem-inventory",
    term: "Subsystem inventory",
    simple: "The cast list each journey stage names — which parts of the kernel and hardware are on stage at that moment.",
    technical:
      "The simulator attaches per-stage subsystem chips (e.g. Filesystem + Memory management at load; I/O system + Device drivers at the request; Interrupts + Scheduler at the completion) and links each stage to the lesson that teaches it — a cross-reference index of the whole curriculum, ordered by causality.",
    example:
      "Before advancing a stage, predict its chips: stage 6 shows 'I/O system, Device drivers' — and the scheduler's absence is itself informative, since nothing needs scheduling until the interrupt changes a state.",
    related: ["system-journey", "kernel", "device-driver", "filesystem"],
    moduleId: "capstone",
    lessonRef: "capstone/follow-a-program",
    simId: "capstone-sim",
  },
  {
    id: "trap-crossing",
    term: "Trap crossing",
    simple: "One trip through the guarded doorway: user code trapping into the kernel for a service, and returning.",
    technical:
      "The syscall round trip — number and arguments into registers, trap instruction, hardware mode switch, dispatch through the syscall table, argument validation, execution, return — costed at hundreds of nanoseconds. The journey's most repeated crossing: batching reads multiplies its savings directly.",
    example:
      "1000 × 4 KB reads = 1000 trap crossings; 8 × 512 KB reads = 8. The 992 saved crossings are the batching lesson, priced in nanoseconds.",
    related: ["trap", "system-call", "user-mode", "system-call-table"],
    moduleId: "capstone",
    lessonRef: "capstone/big-picture",
    refUrl: "https://pages.cs.wisc.edu/~remzi/OSTEP/cpu-mechanisms.pdf",
    refLabel: "OSTEP ch. 6: Limited Direct Execution",
  },
  {
    id: "teardown",
    term: "Teardown",
    simple: "The exit-time cleanup: the kernel undoes everything the process held, then leaves a record for its parent.",
    technical:
      "At exit(2): all file descriptors closed (releasing inodes' in-memory state), the address space destroyed (page tables freed, frames reclaimed), kernel resources released, and an exit-status record kept in the process table as a zombie until wait() reaps it. Reclaiming is per-process and total — the machine carries on untouched.",
    example:
      "Stage 10's checklist: descriptors closed, memory torn down, status recorded, zombie awaiting wait() — skip the reap and the table slowly fills with undead entries.",
    related: ["zombie", "wait", "file-descriptor", "system-journey"],
    moduleId: "capstone",
    lessonRef: "capstone/follow-a-program",
    simId: "capstone-sim",
  },
  {
    id: "end-to-end-cost",
    term: "End-to-end cost",
    simple: "The journey priced in primitive latencies — cache hits in nanoseconds, syscalls in hundreds of them, page faults in microseconds-plus, cold reads in milliseconds.",
    technical:
      "t_journey ≈ Σ (count of event i) × (cost of event i) over syscalls (~100s ns), context switches (~1–5 μs), SSD/spinning-disk page faults (10s–100s of μs / ~ms) and DMA transfers (device-paced, CPU free). The sum is dominated by its most expensive term — which is why caches, batching and DMA attack the big terms rather than the small ones.",
    example:
      "sumfile's run: one exec, a handful of faults, a few syscalls, ONE cold 10 ms read — the read dominates; re-run with the file cached and that term collapses ~1000× (10 ms → 10 μs).",
    related: ["system-call", "context-switch", "page-fault", "dma", "trap-crossing"],
    moduleId: "capstone",
    lessonRef: "capstone/big-picture",
    simId: "capstone-sim",
  },
  {
    id: "big-picture-map",
    term: "The big picture",
    simple: "The machine as a stack of contracts — process, virtual memory, syscall, file, interrupt, virtualization — each enforced below and consumed above.",
    technical:
      "The capstone's map view: hardware promises instructions and interrupts; the kernel turns them into private CPU-in-time-share (processes), private over-capacity memory (page tables), checked kernel access (the syscall door), bytes that outlive processes (files); virtualization re-sells the same contracts one level down. Tested by demolition: remove any wall and name the catastrophe class it was insuring against.",
    example:
      "Ride the simulator as a map-reader: each stage is a contract invocation — loading is the file contract, creation the process contract, syscall entry the doorway contract — one kernel keeping every promise at once.",
    related: ["system-journey", "operating-system", "kernel", "trap-crossing"],
    moduleId: "capstone",
    lessonRef: "capstone/big-picture",
    refUrl: "https://pages.cs.wisc.edu/~remzi/OSTEP/intro.pdf",
    refLabel: "OSTEP ch. 2: Introduction to the Operating System",
  },
];
