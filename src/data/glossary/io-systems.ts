import type { GlossaryEntry } from "@/types";

/**
 * Glossary — module 10 (I/O Systems & Device Drivers).
 * The I/O Transfer Lab moves one file of B blocks under PIO, interrupt-driven
 * I/O and DMA with the verified tick model: PIO B/B, interrupt 2B/B,
 * DMA (B+1)/1 (total ticks / CPU-busy ticks).
 */
export const entries: GlossaryEntry[] = [
  {
    id: "device-controller",
    term: "Device controller",
    simple: "The hardware — often a small computer of its own — that operates a device and exposes registers the CPU can write.",
    technical:
      "The electronics between the bus and the device: status, command and data registers reachable via port-mapped or memory-mapped I/O, plus the ability to raise interrupts on completion. The driver programs it; it does the work.",
    example:
      "A disk controller: the driver writes READ, sector 57, count 8 into its registers; the controller moves the head, transfers the bytes, and raises one interrupt.",
    related: ["device-driver", "interrupt", "memory-mapped-io", "dma"],
    moduleId: "io-systems",
    lessonRef: "io-systems/controllers-drivers",
    refUrl: "https://pages.cs.wisc.edu/~remzi/OSTEP/file-devices.pdf",
    refLabel: "OSTEP ch. 36: I/O Devices",
  },
  {
    id: "device-driver",
    term: "Device driver",
    simple: "The kernel software that knows one device family's register protocol and offers the OS's standard interface upward.",
    technical:
      "Per-device-family kernel code implementing a standard class interface (block or character devices); runs privileged, handles completion interrupts, and concentrates all device-specific quirks — historically the largest single source of kernel crashes.",
    example:
      "N device families and M operating systems need N drivers plus M interface implementations — not N×M bespoke pairings. That standard interface is why one read() works on every disk.",
    related: ["device-controller", "system-call", "kernel"],
    moduleId: "io-systems",
    lessonRef: "io-systems/controllers-drivers",
    refUrl: "https://docs.kernel.org/driver-api/index.html",
    refLabel: "Linux kernel docs: Driver API",
  },
  {
    id: "pio",
    term: "PIO",
    fullForm: "Programmed I/O",
    simple: "The CPU itself moves every byte between the device and memory — simple, and completely monopolizing the CPU.",
    technical:
      "The CPU executes the transfer loop (reading/writing the controller's data register) for the whole transfer: total ticks = B, CPU-busy = B. Acceptable only for tiny or fast transfers where interrupt overhead would dominate.",
    example:
      "The lab's 8-block PIO transfer: 8 ticks, CPU busy for all 8 — the machine does nothing else while the file moves.",
    related: ["interrupt-driven-io", "dma", "device-controller", "polling"],
    moduleId: "io-systems",
    lessonRef: "io-systems/pio-interrupt-dma",
    simId: "io-transfer-lab",
    refUrl: "https://pages.cs.wisc.edu/~remzi/OSTEP/file-devices.pdf",
    refLabel: "OSTEP ch. 36: I/O Devices",
  },
  {
    id: "interrupt-driven-io",
    term: "Interrupt-driven I/O",
    simple: "The CPU starts the transfer and walks away; the device interrupts it once per block, and each interrupt costs one handling tick.",
    technical:
      "Per unit (block in the lab's model): one device tick with the CPU free plus one handling tick with the CPU busy — total 2B, CPU-busy B, utilization ½. Frees the CPU between units, but the per-interrupt cost scales with the transfer and saturates fast devices.",
    example:
      "The lab's 8-block interrupt transfer: 16 total ticks, 8 CPU-busy — exactly 50%, verified by the engine's summarize() tests.",
    related: ["pio", "dma", "interrupt", "irq"],
    moduleId: "io-systems",
    lessonRef: "io-systems/pio-interrupt-dma",
    simId: "io-transfer-lab",
    refUrl: "https://pages.cs.wisc.edu/~remzi/OSTEP/file-devices.pdf",
    refLabel: "OSTEP ch. 36: I/O Devices",
  },
  {
    id: "dma",
    term: "DMA",
    fullForm: "Direct Memory Access",
    simple: "A dedicated engine moves whole blocks directly to memory while the CPU does other work — one single interrupt when it all finishes.",
    technical:
      "The driver programs the DMA engine once (source, destination, count); the engine masters the bus and transfers B blocks with zero CPU involvement, then raises exactly one completion interrupt: total B+1 ticks, CPU-busy 1 — O(1) CPU cost regardless of transfer size.",
    example:
      "The lab's 16-block DMA transfer: 17 ticks, CPU busy for 1 of them (~6%) — versus interrupt-driven's 32 ticks and 16 busy.",
    related: ["interrupt-driven-io", "pio", "interrupt", "device-controller"],
    moduleId: "io-systems",
    lessonRef: "io-systems/pio-interrupt-dma",
    simId: "io-transfer-lab",
    refUrl: "https://pages.cs.wisc.edu/~remzi/OSTEP/file-devices.pdf",
    refLabel: "OSTEP ch. 36: I/O Devices",
  },
  {
    id: "buffering",
    term: "Buffering",
    simple: "Staging memory between a producer and a consumer so neither waits on the other's speed or size.",
    technical:
      "A buffer absorbs timing and size mismatches between device and CPU (or two software stages), enables copy semantics (the app's copy cannot be changed by the next device operation), and — doubled — overlaps production with consumption.",
    example:
      "The device fills a buffer in 10 ms while the CPU drains one in 6 ms: with one buffer the phases alternate (16 ms/block); with two they overlap (10 ms/block).",
    related: ["double-buffering", "buffer-cache", "device-queue"],
    moduleId: "io-systems",
    lessonRef: "io-systems/buffering-caching-spooling",
    refUrl: "https://pages.cs.wisc.edu/~remzi/OSTEP/file-devices.pdf",
    refLabel: "OSTEP ch. 36: I/O Devices",
  },
  {
    id: "double-buffering",
    term: "Double buffering",
    simple: "Two buffers, swapped roles: the device fills one while the CPU drains the other.",
    technical:
      "Converts sequential phases (produce, then consume) into overlapped ones: per-block time approaches max(t_produce, t_consume) instead of their sum. The standard arrangement for streaming I/O everywhere.",
    example:
      "10 ms fills and 6 ms drains: single buffer = 16 ms per block; double buffering = 10 ms per block — the overlap dividend.",
    related: ["buffering", "dma"],
    moduleId: "io-systems",
    lessonRef: "io-systems/buffering-caching-spooling",
  },
  {
    id: "device-queue",
    term: "Device queue",
    simple: "The line of pending requests a device serves — where scheduling decisions get made.",
    technical:
      "Each device has a request queue the kernel enqueues work onto; a scheduler may reorder it by cost (module 9's disk scheduling) or fairness, and for exclusive devices the queue may be materialized as spool files on disk.",
    example:
      "The disk scheduling lab's queue — 98, 183, 37, … — is a device queue; choosing SSTF instead of FCFS is purely a decision about the order of serving it.",
    related: ["spooling", "pio", "interrupt-driven-io"],
    moduleId: "io-systems",
    lessonRef: "io-systems/controllers-drivers",
    simId: "disk-scheduling-lab",
  },
  {
    id: "blocking-io",
    term: "Blocking I/O",
    simple: "The call does not return until the operation completes — the caller sleeps in the meantime.",
    technical:
      "The default syscall semantics: the kernel deschedules the thread onto a wait queue; the completion path (usually an interrupt handler) wakes it. Simple, but every outstanding operation parks one thread — the scaling wall for concurrent servers.",
    example:
      "200 connections with blocking reads: 200 parked threads, each with a stack, each a context switch when it wakes.",
    related: ["non-blocking-io", "asynchronous-io", "process"],
    moduleId: "io-systems",
    lessonRef: "io-systems/blocking-async-io",
    refUrl: "https://man7.org/linux/man-pages/man2/open.2.html",
    refLabel: "man7: open(2) — default blocking semantics",
  },
  {
    id: "non-blocking-io",
    term: "Non-blocking I/O",
    simple: "The call returns immediately with 'not ready' if it would have to wait — the caller must ask again later.",
    technical:
      "Opened with O_NONBLOCK: operations that cannot proceed return -1 with EWOULDBLOCK/EAGAIN instead of sleeping. Nothing is delivered; scalable code pairs it with readiness notification (poll/select/epoll) rather than busy re-asking.",
    example:
      "read() on a non-blocking socket with no data: EAGAIN at once. When epoll later reports the socket readable, the same call returns bytes immediately.",
    related: ["blocking-io", "asynchronous-io", "polling"],
    moduleId: "io-systems",
    lessonRef: "io-systems/blocking-async-io",
    refUrl: "https://man7.org/linux/man-pages/man2/open.2.html",
    refLabel: "man7: open(2) — O_NONBLOCK",
  },
  {
    id: "asynchronous-io",
    term: "Asynchronous I/O",
    simple: "Submit the operation now, keep working, and let the kernel notify you when it completes.",
    technical:
      "Issue-and-notify semantics: the call returns immediately with the operation pending; completion arrives via signal, callback or completion queue (POSIX aio, Linux io_uring). Per-transfer latency is unchanged; concurrency and CPU efficiency transform.",
    example:
      "Submit 100 reads, reap completions from a queue on one thread — versus 100 parked threads under blocking I/O. Same device speed, different machine.",
    related: ["non-blocking-io", "blocking-io", "dma", "interrupt"],
    moduleId: "io-systems",
    lessonRef: "io-systems/blocking-async-io",
    refUrl: "https://man7.org/linux/man-pages/man7/aio.7.html",
    refLabel: "man7: aio(7) — POSIX asynchronous I/O",
  },
  {
    id: "memory-mapped-io",
    term: "Memory-mapped I/O",
    simple: "Device registers appear as memory addresses, so ordinary load/store instructions talk to hardware.",
    technical:
      "MMIO: the bus decodes certain physical addresses as device registers rather than RAM; plain memory instructions become device accesses (the alternative is port-mapped I/O with special in/out instructions). The mappings live in kernel page tables, unreachable from user mode.",
    example:
      "A driver rings a device's doorbell by storing to a register address — no special instruction, just a store that the hardware routes to the controller.",
    related: ["device-controller", "device-driver", "user-mode"],
    moduleId: "io-systems",
    lessonRef: "io-systems/controllers-drivers",
  },
];
