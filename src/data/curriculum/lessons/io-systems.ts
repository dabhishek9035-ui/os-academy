import type { Lesson } from "@/types";

/**
 * Module 10 — I/O Systems & Device Drivers.
 * Device controllers and drivers, PIO vs interrupt-driven I/O vs DMA,
 * buffering, caching, spooling, and blocking vs non-blocking vs async I/O.
 * Lab conventions in this course: the I/O Transfer Lab moves one file of
 * B blocks (4–16, default 8) under three methods with an educational
 * per-block tick model — PIO: 1 tick/block, CPU busy throughout;
 * interrupt-driven: 2 ticks/block with the CPU busy only for handling;
 * DMA: 1 tick/block with the CPU free, then ONE interrupt — all confirmed
 * by the lab's engine unit tests via its summarize() function.
 */
export const lessons: Lesson[] = [
  {
    id: "io-systems/controllers-drivers",
    moduleId: "io-systems",
    title: "Controllers & Drivers",
    minutes: 9,
    objectives: [
      "distinguish the device controller (hardware) from the device driver (kernel software)",
      "describe how drivers talk to controllers through registers, port-mapped or memory-mapped",
      "explain how standard device interfaces turn an N×M driver problem into N+M",
    ],
    sections: [
      {
        kind: "problem",
        body: [
          "The OS promises applications a tidy world: `read()` some bytes, `write()` some bytes, on files, sockets, keyboards — one interface. Behind that promise stands hardware chaos: thousands of devices from thousands of vendors, each with its own registers, command sequences, error codes and timing quirks. An OS that wired every application to every device directly would face a nightmare of scale — and every new device would require rewriting every program.",
          "The I/O subsystem solves this with two layers of specialization, and the whole module is about where they meet. One piece runs *inside the device* (the controller), one runs *inside the kernel* (the driver), and the contract between them — registers and interrupts — is one of the great interfaces in computing. Get this split right and `read()` works identically on a spinning disk and an NVMe drive; get it wrong and every device is a special case forever.",
        ],
      },
      {
        kind: "intuition",
        body: [
          "Think of an **embassy**. You (the application) speak one language: 'please process my visa application' — the syscall interface. Behind the counter, the embassy's *staff* (the driver) knows the local bureaucracy: which forms, which windows, which fees. The *building itself* — its mail slots, buzzers and file rooms — is the **controller**: hardware with fixed slots you post requests into and lights that say 'done'. The staff changes per country (per device family); the building's slots and buzzers are what staff and visitors share.",
          "Now the economics that made the embassy model spread: if every travel agency had to learn every country's bureaucracy from scratch, that's *agencies × countries* training manuals. Instead, embassies agree on a **standard application form**, and countries train staff in their own language: *agencies + countries* effort. The form is the OS's standard device interface; the per-country staff are the drivers; N devices and M operating systems need N+M pieces of work, not N×M.",
        ],
      },
      {
        kind: "visual",
        simId: "io-transfer-lab",
        body: [
          "The **I/O Transfer Lab** hides the registers but keeps the division of labor visible: for each block moved, the log says *who* did the work — the CPU driving the device (PIO), the device working while the CPU waits elsewhere (interrupt-driven), or a DMA engine moving blocks untouched. That 'who is busy' question is exactly what the controller/driver split organizes: the *driver* starts the transfer, the *controller* performs it, and the difference between the three methods is how much of the work lands back on the CPU.",
          "Run an 8-block transfer under each method before the next lesson formalizes it. Watch the event log's wording shift from 'CPU is driving the device' to 'device finished block k — raising an interrupt' to 'DMA engine moved block k directly to memory'. You are watching the same driver → controller conversation with three different answers to 'who carries the boxes'.",
        ],
      },
      {
        kind: "technical",
        body: [
          "A **device controller** (or adapter) is the electronics — often a small processor of its own — that operates one device type on the device's behalf: a disk controller spins platters and moves heads, a UART shifts out serial bits. It exposes a small machine-level interface: **registers** — *status* (is it busy? did it fail?), *command* (start read/write), *data in / data out* — plus the ability to raise an **interrupt** when something completes. Registers are reachable two ways: **port-mapped I/O** (special `in`/`out` instructions addressing a separate I/O port space) or **memory-mapped I/O** (the registers appear at physical memory addresses; ordinary loads and stores talk to the device — how modern buses like PCIe mostly work).",
          "A **device driver** is kernel software, written per device *family*, that knows those register-level protocols and exposes the OS's standard interface upward. The OS classifies devices — **block devices** (random-access chunks: disks), **character devices** (byte streams: keyboards, serial ports) — and every driver for a class implements the same operations (open, read, write, …). Above the drivers sits a generic layer (Unix's VFS for block/char files), so the syscall path is: application → syscall → generic layer → driver → controller registers → device. When a driver's work is done, the controller raises the interrupt that module 1 taught you to dispatch — and the driver's interrupt handler finishes the job.",
          "The layering is why `dd` can copy between a SATA disk and a USB stick without caring about either: two drivers, one standard interface. It is also why kernels are *mostly drivers*: of the tens of millions of lines in Linux, the overwhelming majority live under `drivers/` — the price of the N+M bargain is that the M side (drivers) is where all the device-specific code concentrates.",
        ],
        equations: [
          {
            expr: "Driver work: N devices × M OSes  →  N drivers + M interfaces",
            symbols: [
              { sym: "N", meaning: "distinct device families" },
              { sym: "M", meaning: "distinct operating systems" },
            ],
            note: "Each side implements the standard interface once: N drivers for one OS, M standard interfaces for the devices to aim at — the embassy's standard form.",
          },
          {
            expr: "One transfer = driver writes command register → controller works → controller raises interrupt → driver's handler completes it",
            symbols: [
              { sym: "command register", meaning: "the controller register the driver writes to start work" },
              { sym: "interrupt", meaning: "the controller's 'done' signal — module 1's machinery, now with a purpose" },
            ],
            note: "Every method in the next lesson is a variation on exactly this loop — the variation being *how often* the CPU is pulled back in.",
          },
        ],
      },
      {
        kind: "worked-example",
        steps: [
          {
            title: "Following one read() down to the metal",
            body: [
              "An app calls `read(fd, buf, 4096)` on a file. The syscall enters the kernel (module 11 shows that walk), the filesystem layer translates file offset → block number, and hands the request to the **block driver** for this disk.",
              "The driver fills the controller's registers: command = READ, sector address = 57, count = 8 sectors, memory destination = a kernel buffer. It returns; the caller sleeps. The **controller** — hardware, no OS code involved — moves the head, transfers the bytes into the buffer by DMA, then raises an interrupt. Module 1's machinery dispatches to *this driver's* interrupt handler, which checks the status register for errors, marks the buffer complete, and wakes the sleeping process. Six handoffs, two of them in silicon — and the app just saw `read` return.",
            ],
          },
          {
            title: "Why one bad driver can sink the ship",
            body: [
              "Drivers run in kernel mode with full machine authority (module 11 will formalize why) and are written against hardware that misbehaves in the wild. A driver that mishandles one error code can corrupt kernel memory or hang the machine — historically the single largest source of OS crashes. This is not a footnote: it is why OSes sandbox drivers (user-space driver frameworks), why drivers are version-locked to kernels, and why a printer update can genuinely crash a whole computer.",
              "Hold that thought through the module: every design here — interrupts instead of spinning, DMA instead of byte-shuffling, buffering instead of direct handoffs — is partly an engineering choice and partly *damage control* around the fact that the driver layer is where the kernel touches the chaotic world.",
            ],
          },
        ],
      },
      {
        kind: "misconceptions",
        items: [
          {
            wrong: "The driver is a chip inside the device.",
            right: "That chip is the *controller*. The driver is software — code in the kernel (or a user-space driver process) that knows how to program that chip through its registers. Controller = hardware; driver = the kernel-side translator.",
          },
          {
            wrong: "Every application must be written per device, or every device per OS.",
            right: "Standard class interfaces break both couplings: an app issues the same `read()` regardless of hardware, and a device needs one driver per OS family — N+M work, not N×M. That standardization is the entire economic foundation of the device ecosystem.",
          },
        ],
      },
      {
        kind: "knowledge-check",
        questions: [
          {
            id: "kc-m10-cd-1",
            q: "Which statement about controllers and drivers is correct?",
            options: [
              "The controller is hardware with registers; the driver is kernel software that programs it",
              "The controller is kernel software; the driver is hardware inside the device",
              "Both are hardware — one on the motherboard, one in the device",
              "Both are software — the driver loads the controller as a library",
            ],
            answerIndex: 0,
            explanation:
              "The split is hardware/software: controllers expose registers and interrupts; drivers are the kernel code that knows the register protocol and offers the standard interface upward.",
          },
          {
            id: "kc-m10-cd-2",
            q: "What does memory-mapped I/O change about how a driver reaches device registers?",
            options: [
              "Registers appear at ordinary memory addresses, so plain load/store instructions address them",
              "Registers must be read with special in/out port instructions",
              "Registers are copied into RAM by the controller on change",
              "Registers become part of the process's virtual address space directly",
            ],
            answerIndex: 0,
            explanation:
              "With MMIO the registers are mapped into the physical address space; normal memory instructions touch them. (Port-mapped I/O is the alternative — separate port space, special instructions.) User processes still can't reach them: the mapping is guarded by module 5's protection.",
          },
        ],
      },
      {
        kind: "references",
        items: [
          {
            label: "OSTEP, Chapter 36: I/O Devices",
            url: "https://pages.cs.wisc.edu/~remzi/OSTEP/file-devices.pdf",
            note: "the canonical treatment — controller registers, the driver model, and the N+M argument",
          },
          {
            label: "Linux kernel docs: Driver API",
            url: "https://docs.kernel.org/driver-api/index.html",
            note: "what a real driver framework looks like — the M side of the N+M bargain, in production",
          },
        ],
      },
      {
        kind: "note",
        body: [
          "Lab simplifications: the I/O Transfer Lab abstracts the controller to 'the device finished block k' — no registers, no bus, no port versus memory-mapped distinction — and no actual driver code. Its three methods are the *policies* layered over this lesson's hardware conversation; the next lesson makes the tick accounting exact.",
        ],
      },
    ],
  },
  {
    id: "io-systems/pio-interrupt-dma",
    moduleId: "io-systems",
    title: "PIO, Interrupt-Driven I/O & DMA",
    minutes: 11,
    objectives: [
      "contrast programmed I/O, interrupt-driven I/O and DMA by who is busy during each tick",
      "compute total ticks and CPU-busy ticks for a B-block transfer under each method",
      "explain why DMA's win is CPU freedom, not necessarily wall-clock speed",
    ],
    sections: [
      {
        kind: "problem",
        body: [
          "The driver can start the transfer (lesson 1) — but *who moves the bytes?* Suppose a program must read an 8-block file. In the most primitive design, the CPU itself loops: read a device register, store the byte, repeat — for every byte of every block. During that entire time the CPU does nothing else: a 1 GHz machine babysitting a device that works at its own leisurely pace. Multiply by every process doing I/O and the machine is a very expensive courier.",
          "Two upgrades puncture the waste, and they are *the* story of this lesson: let the CPU hand off and get interrupted only when needed (interrupt-driven I/O), and then let a dedicated engine move whole blocks without the CPU touching a single byte (DMA). The lab's comparison table — same file, three methods, two counters (total ticks, CPU-busy ticks) — is the whole argument in numbers.",
        ],
      },
      {
        kind: "intuition",
        body: [
          "**Moving house**, three staffing plans. **PIO**: you carry every box yourself, to the truck, back, again — your whole day is the move; nothing else in your life happens. **Interrupt-driven**: movers carry box by box, and after *each box* they come get your signature (an interrupt you handle) — you're free between boxes but the paperwork is per-box. **DMA**: you hand the crew a manifest and a door code; they load the entire truck while you work in the study, and they call you **once** — when the truck is full.",
          "Notice what stayed constant: the truck's loading speed (the device). What changed is *your* availability — the CPU's — and the shape of your attention: continuous, per-box, or once. That is exactly the lab's two counters: total ticks track the truck; CPU-busy ticks track you.",
        ],
      },
      {
        kind: "visual",
        simId: "io-transfer-lab",
        body: [
          "The **I/O Transfer Lab** moves an 8-block file under each method, ticking block by block with both counters live. Run PIO first: every tick lights up 'CPU busy' — eight ticks, eight busy. Switch to interrupt-driven: sixteen ticks total, but only eight find the CPU busy (the per-block handling) — the log tells you what the CPU did in between.",
          "Then DMA: nine ticks, and the CPU-busy counter moves exactly once — the single completion interrupt. The lab's comparison table summarizes all three; the worked example below does the same arithmetic for a 12-block file, and the experiment has you derive it for 16.",
        ],
      },
      {
        kind: "experiment",
        simId: "io-transfer-lab",
        prompts: [
          "Run an 8-block transfer under each method and fill in the table yourself before reading the lab's: total ticks and CPU-busy ticks for PIO, interrupt, DMA. Check: PIO 8/8, interrupt 16/8, DMA 9/1.",
          "Raise the file to 16 blocks and re-run all three. Which counters double, and which barely move? (Interrupt: 32 total. DMA: 17 total, still 1 busy.) Explain in one sentence why DMA's CPU-busy count does not grow with block count.",
          "PIO's total (B) is actually *smaller* than DMA's (B+1) in this model — the completion interrupt costs a tick. If the CPU has nothing else to do, which method wins on wall clock? If it has plenty of work queued, which wins? What does that tell you about when DMA pays?",
          "Compute CPU utilization (busy ÷ total) for each method at 16 blocks: 100%, 50%, ≈6%. Now imagine 8 transfers running concurrently on one CPU — which method lets them overlap, and which serializes the whole machine?",
        ],
        body: [
          "Lab conventions (verified by the engine's unit tests): PIO = 1 tick/block, CPU busy for all B ticks; interrupt-driven = 2 ticks/block (device transfer tick with the CPU free, then a handling tick with the CPU busy), so 2B total, B busy; DMA = 1 tick/block with the CPU free, then ONE handling tick — B+1 total, 1 busy.",
        ],
      },
      {
        kind: "technical",
        body: [
          "**Programmed I/O (PIO)**: the CPU executes the transfer itself — an instruction loop reading/writing the controller's data register word by word (or block by block in the lab's generous model). Total time = transfer time, all of it CPU time. It is the right choice only for tiny, fast transfers where an interrupt would cost more than the data moves (a status register here, a byte there); for bulk data it makes the CPU a courier.",
          "**Interrupt-driven I/O**: the driver programs the controller and *returns*; the CPU runs other work. The controller interrupts per unit (per block in the lab; historically per word or line) and the handler — the only CPU-busy part — copies the unit or advances the transfer. The CPU is free between units; the price is one interrupt's fixed cost per unit. For high-speed devices that per-unit cost itself saturates the CPU — the problem DMA was invented for.",
          "**DMA (direct memory access)**: a **DMA engine** — either the controller's own or a separate unit on the bus — is programmed once (source, destination, count) and then transfers entire blocks between device and memory *without the CPU touching the bytes*; it masters the bus while the CPU's cores work or idle. Exactly one interrupt fires — at completion. The CPU-busy cost of the whole transfer becomes one handler run, independent of block count. The classic costs of DMA — cache coherency care and bus contention with the CPU — exist but are managed in hardware today; the model here teaches the CPU-cost structure, which is the part that never changed.",
        ],
        equations: [
          {
            expr: "PIO:   total = B,        CPU-busy = B",
            symbols: [
              { sym: "B", meaning: "blocks in the file" },
            ],
            note: "The CPU *is* the transfer engine: every tick of device time is a tick of CPU time.",
          },
          {
            expr: "Interrupt: total = 2B,   CPU-busy = B   (utilization = ½)",
            symbols: [
              { sym: "2B", meaning: "per block: one device tick (CPU free) + one handling tick (CPU busy)" },
            ],
            note: "The CPU is half busy no matter how fast the device is — the per-interrupt cost, B times over, is what saturates fast devices.",
          },
          {
            expr: "DMA:   total = B + 1,    CPU-busy = 1   (utilization = 1/(B+1))",
            symbols: [
              { sym: "1", meaning: "the single completion-interrupt handler, independent of B" },
            ],
            note: "DMA's CPU cost is O(1) in the transfer size — the property every other design lacks.",
          },
        ],
      },
      {
        kind: "worked-example",
        steps: [
          {
            title: "A 12-block file, all three methods",
            body: [
              "**PIO**: 12 ticks, CPU busy 12 — utilization 100%; the machine does nothing but move this file. **Interrupt-driven**: 24 ticks (12 device + 12 handling), CPU busy 12 — 50%, and the handler ran 12 times; each run costs context state save/restore that the model counts as one tick.",
              "**DMA**: 13 ticks (12 block-ticks + 1 completion interrupt), CPU busy 1 — ≈7.7%. Wall clock is one tick *worse* than PIO (the completion interrupt) — and nobody cares, because 11 of those 12 ticks were available for every other process on the machine. Read that sentence again: DMA sold one tick of latency for eleven ticks of CPU freedom, and that is the best trade in this module.",
            ],
          },
          {
            title: "Where each method belongs",
            body: [
              "Scale the thinking: a keyboard (1 byte, minutes apart) — PIO by polling would even be acceptable; interrupts certainly. A 1 Gb/s network card moving thousands of packets per second — per-packet interrupts alone could eat the CPU; real NICs use DMA *plus* interrupt coalescing (one interrupt per batch, not per packet), stacking this lesson's ideas.",
              "Modern NVMe storage pushes the same direction to its end: submission and completion *queues in shared memory*, DMA for all data, interrupts batched — the driver of lesson 1 barely executes at all during a transfer. The three-step ladder (PIO → interrupt → DMA) is the conceptual history of the whole I/O subsystem.",
            ],
          },
        ],
      },
      {
        kind: "misconceptions",
        items: [
          {
            wrong: "DMA makes the transfer itself faster.",
            right: "The device and the bus set the transfer speed; DMA changes *who is busy during it*. In the lab's own model DMA's total (B+1) is a tick more than PIO's (B) — its win is CPU-busy = 1 regardless of B, i.e. the machine keeps working while data moves.",
          },
          {
            wrong: "DMA raises an interrupt for every block, like interrupt-driven I/O.",
            right: "Interrupt-driven I/O interrupts per unit; DMA interrupts exactly once, at completion of the whole transfer. That per-transfer O(1) interrupt cost is the entire point of the design.",
          },
        ],
      },
      {
        kind: "knowledge-check",
        questions: [
          {
            id: "kc-m10-pid-1",
            q: "An 8-block file moves under interrupt-driven I/O in the lab's model. Total ticks, and how many of them is the CPU busy?",
            options: [
              "16 total, 8 busy — one device tick plus one handling tick per block",
              "8 total, 8 busy — interrupts cost nothing",
              "9 total, 1 busy — that's DMA's profile",
              "16 total, 16 busy — handling costs as much as transferring",
            ],
            answerIndex: 0,
            explanation:
              "2 ticks per block (device + handling) = 16 total; the handling tick is the only CPU-busy one per block = 8 busy. Utilization 50%, exactly the lab's verified numbers.",
          },
          {
            id: "kc-m10-pid-2",
            q: "A 16-block DMA transfer completes. How many ticks was the CPU busy, and why doesn't the count grow with block count?",
            options: [
              "1 — the DMA engine moves all blocks; only the single completion interrupt uses the CPU",
              "16 — each block needs one handling tick",
              "0 — DMA needs no CPU involvement at all",
              "17 — the CPU paces every block-tick",
            ],
            answerIndex: 0,
            explanation:
              "DMA's handler runs once per *transfer*, not per block: 1 busy tick out of 17 total. 'Direct memory access' means the engine accesses memory directly — the CPU programs it and hears about it at the end.",
          },
        ],
      },
      {
        kind: "references",
        items: [
          {
            label: "OSTEP, Chapter 36: I/O Devices",
            url: "https://pages.cs.wisc.edu/~remzi/OSTEP/file-devices.pdf",
            note: "the PIO → interrupt → DMA progression, straight from the course text",
          },
          {
            label: "OSTEP, Chapter 37: Hard Disk Drives",
            url: "https://pages.cs.wisc.edu/~remzi/OSTEP/file-disks.pdf",
            note: "the device-side timing (seek, rotate, transfer) that determines how long each tick really is",
          },
        ],
      },
      {
        kind: "note",
        body: [
          "Lab simplifications: the tick model counts one tick per block (real PIO is per *word*, making it far worse than modeled), ignores interrupt overhead beyond the single handling tick, and omits bus contention, cache effects and DMA setup cost. Interrupt coalescing and scatter-gather are not modeled. The counters the lab verifies — PIO B/B, interrupt 2B/B, DMA (B+1)/1 — are the load-bearing facts.",
        ],
      },
    ],
  },
  {
    id: "io-systems/buffering-caching-spooling",
    moduleId: "io-systems",
    title: "Buffering, Caching & Spooling",
    minutes: 10,
    objectives: [
      "distinguish buffering, caching and spooling by the problem each solves",
      "explain double buffering and what overlap it buys",
      "state honestly what a returning write() has and has not guaranteed",
    ],
    sections: [
      {
        kind: "problem",
        body: [
          "Even with the perfect transfer method, three mismatches remain between the way devices work and the way software works. *Speed*: a producer and a consumer rarely run at the same rate, and a byte-by-byte rendezvous would waste both. *Reuse*: the same data gets requested again and again, and re-fetching from a slow device every time is pure loss. *Exclusivity*: some devices (a printer, classically) can serve exactly one job at a time, while users submit many.",
          "The I/O subsystem's answers are three classic structures, so old they predate most of this course's hardware: a **buffer** (a staging area that absorbs timing and size mismatches), a **cache** (a holder for copies of reusable data), and a **spool** (a queue on disk that turns 'one exclusive device' into 'a fair line'). They are easy to confuse because they are all 'memory in the middle' — so this lesson is largely about telling them apart by the *problem* each exists to solve.",
        ],
      },
      {
        kind: "intuition",
        body: [
          "A **restaurant pass** (the shelf between kitchen and servers): plates land there whenever the kitchen finishes; servers take them whenever they're ready. Neither side waits for the other — the pass absorbs the speed mismatch. Make it two passes (**double buffering**) and the kitchen can plate the next order while the server clears the first: production and consumption *overlap*.",
          "A **fridge of leftovers** is a cache: you cook chili once and re-heat it three times; the third request doesn't touch the stove (the disk) at all. And **spooling** is the printer tray at an office: ten people drop documents into it all morning; the one printer consumes them one at a time, in order, while everyone goes back to work. The tray is itself a file area — jobs wait *as files*, which is the 'S' in every print queue.",
        ],
      },
      {
        kind: "visual",
        simId: "io-transfer-lab",
        body: [
          "The lab does not draw buffers explicitly — and that is itself instructive: its 'device tick' is really 'the device filled the kernel buffer with one block, and the consumer consumed it'. Under **interrupt-driven** mode, read the log with buffer-shaped eyes: the device tick is the producer filling; the handling tick is the kernel draining. Two phases, alternating — a single buffer being handed back and forth.",
          "Now notice what **DMA** changes at the buffer level: the engine fills buffers *without* the CPU, so the CPU's only buffer interaction is the final handling. The buffer never went away — it just stopped requiring the CPU as its mover. With that lens, re-read the next lesson's blocking/async discussion: 'who is free while the buffer fills' is the entire design space.",
        ],
      },
      {
        kind: "technical",
        body: [
          "**Buffering** places storage between a producer and a consumer so neither blocks on the other's rhythm. Kernel I/O almost always double-buffers: while the device fills buffer A, the consumer drains buffer B, then they swap — **double buffering** turns 'produce, then consume' (sequential) into 'produce *while* consuming' (overlapped), hiding the device behind the compute or vice versa. Buffers also absorb *size* mismatches (a network card's 1500-byte packets feeding a 4-KiB block layer) and enable **copy semantics**: `read()` copies from the kernel buffer so the data the app holds cannot be changed underneath it by the next device operation.",
          "**Caching** keeps copies of data likely to be requested again. The kernel's **page cache** caches file blocks (and is the same memory the lesson-2 buffer story lives in — buffering moves bytes, caching *keeps* them). Reads check the cache first: a hit serves from RAM at ~100 ns; a miss fetches from disk and fills the cache. Writes go to the cache and return — **write-back** — with the kernel flushing dirty pages later (module 9's crash window, closed by fsync/journaling); **write-through** (write to device immediately) is the safe-but-slow alternative. Eviction under memory pressure reuses everything you learned in module 6 — the page cache *is* paging applied to file data.",
          "**Spooling** (simultaneous peripheral operations on-line) queues jobs *as files on disk* for a device that cannot interleave them. The classic printer: each document lands as a spool file; a daemon feeds them one at a time; submitters never wait for the device. The pattern generalizes — batch systems queued *jobs* on tape; a mailbox queues *messages* — anywhere one exclusive server meets many independent clients. The spool is buffering's cousin with a queueing policy and a *serialization* guarantee: exactly one job at a time, order preserved.",
        ],
        equations: [
          {
            expr: "Overlapped time = max(t_produce, t_consume)   vs sequential t_produce + t_consume",
            symbols: [
              { sym: "t_produce", meaning: "time for the device to fill one buffer" },
              { sym: "t_consume", meaning: "time for the CPU to drain one buffer" },
            ],
            note: "Double buffering converts the sum into the max — the overlap dividend that makes streams keep up with devices.",
          },
          {
            expr: "Keep-up condition: rate_produce ≥ rate_consume   (steady state, finite buffer)",
            symbols: [
              { sym: "rate", meaning: "units per second into and out of the buffer" },
            ],
            note: "If the producer is slower than the consumer, no buffer helps — the consumer starves. Buffers smooth mismatches; they do not create bandwidth.",
          },
        ],
      },
      {
        kind: "worked-example",
        steps: [
          {
            title: "Two reads of the same block",
            body: [
              "First `read()` of block 57: page-cache miss → the driver (lesson 1) programs the controller → DMA fills a kernel buffer (lesson 2) → the block lands in the page cache → the kernel copies it to the app → `read` returns. Cost: one device round trip.",
              "Second `read()` of block 57: cache **hit** — the kernel copies from the page cache and returns; no driver, no controller, no device. Five orders of magnitude faster. That asymmetry is why caches, not bandwidth, carry most file workloads — and why the lab's tidy per-block ticks are the *slow* path, taken only on misses.",
            ],
          },
          {
            title: "What write() actually promised",
            body: [
              "The app writes 1 MB and `write()` returns in microseconds. What exists at that moment: the bytes in the page cache, marked dirty; a scheduling promise that the kernel will flush them; *nothing on disk yet*. If the machine loses power now, the data is gone — even though the app believes it wrote.",
              "When the difference matters (databases, journals, the package manager mid-install), the app calls `fsync(fd)`: block until the file's dirty pages reach the device. Module 9's journaling then sits *under* fsync to keep the metadata consistent around it. The lesson's one-line summary: `write()` means 'the kernel has it'; `fsync()` means 'the disk has it'; buffering is why the two are different words.",
            ],
          },
        ],
      },
      {
        kind: "misconceptions",
        items: [
          {
            wrong: "A buffer and a cache are the same thing — memory in the middle.",
            right: "A *buffer* absorbs a timing/size mismatch and is typically consumed once and reused for the next unit; a *cache* holds copies of specific data hoping for reuse. Every page-cache page buffers I/O as it arrives — but it is being *cached* only because the system expects you to ask again.",
          },
          {
            wrong: "When write() returns, the data is on disk.",
            right: "write() guarantees the data reached the kernel's page cache. Reaching the device requires a flush — eventually by the kernel, immediately by fsync(). The gap is the crash window module 9's journaling was invented to survive.",
          },
        ],
      },
      {
        kind: "knowledge-check",
        questions: [
          {
            id: "kc-m10-bcs-1",
            q: "What does double buffering buy over a single buffer between device and CPU?",
            options: [
              "The device can fill one buffer while the CPU drains the other — production and consumption overlap",
              "Twice the bandwidth — the device moves two blocks per tick",
              "It caches data so repeated reads avoid the device",
              "It serializes access so only one process uses the device at a time",
            ],
            answerIndex: 0,
            explanation:
              "With one buffer the phases alternate (fill, then drain); with two they overlap, and total time approaches max(produce, consume) instead of their sum. That is the lab's device-tick/handling-tick alternation, hidden.",
          },
          {
            id: "kc-m10-bcs-2",
            q: "Which mechanism exists specifically to give a single-serving device a fair, ordered queue of waiting jobs?",
            options: [
              "Spooling — jobs wait as files on disk, served one at a time",
              "Double buffering — two staging areas per transfer",
              "Write-back caching — dirty pages flush in order",
              "DMA — the engine serializes bus access",
            ],
            answerIndex: 0,
            explanation:
              "Spooling is the print-queue pattern: many independent submitters, one exclusive device, jobs materialized as files and served serially. Buffers and caches solve timing and reuse, not queueing discipline.",
          },
        ],
      },
      {
        kind: "references",
        items: [
          {
            label: "OSTEP, Chapter 36: I/O Devices",
            url: "https://pages.cs.wisc.edu/~remzi/OSTEP/file-devices.pdf",
            note: "buffering, caching and device queues in the I/O stack — this lesson's source text",
          },
          {
            label: "OSTEP, Chapter 39: Interlude — Files and Directories (fsync)",
            url: "https://pages.cs.wisc.edu/~remzi/OSTEP/file-intro.pdf",
            note: "the fsync() discipline that makes the write-back cache honest",
          },
          {
            label: "man7: read(2) — read from a file descriptor",
            url: "https://man7.org/linux/man-pages/man2/read.2.html",
            note: "the real read() and its byte-count semantics, served by buffers and the page cache",
          },
        ],
      },
      {
        kind: "note",
        body: [
          "Lab simplifications: the I/O Transfer Lab has no explicit buffer objects, no page cache, and no spool — its per-block ticks elide all three structures. The 'device tick = buffer filled' reading offered above is a lens, not a modeled mechanism; caching in particular would change the counters entirely (repeat reads never reach the device), which is exactly why it is taught here and simulated nowhere.",
        ],
      },
    ],
  },
  {
    id: "io-systems/blocking-async-io",
    moduleId: "io-systems",
    title: "Blocking, Non-blocking & Async I/O",
    minutes: 10,
    objectives: [
      "distinguish blocking, non-blocking, asynchronous and readiness-based I/O",
      "compute the thread cost of blocking designs versus event-driven ones",
      "place the lab's 'CPU free between ticks' into the synchronous/asynchronous vocabulary",
    ],
    sections: [
      {
        kind: "problem",
        body: [
          "A server holds 500 open network connections, each occasionally needing a read that will take milliseconds. If every read **blocks** — parks its caller until data arrives — the server needs 500 parked threads, each with a stack, each costing a context switch whenever it wakes. Threads are not free, and 'one per outstanding I/O' scales linearly with load. The alternative sounds impossible: *one* thread juggling *all* the I/O, never waiting for any of it.",
          "Getting there requires being precise about four words the industry uses loosely: **blocking** (the call doesn't return until done), **non-blocking** (the call returns immediately, with 'not ready' if it must), **asynchronous** (the call returns immediately, and the *kernel tells you* when it's done), and **readiness** (you ask which of many operations are ready *now*). The differences look subtle and are enormous: they decide whether your server needs 500 threads or 1.",
        ],
      },
      {
        kind: "intuition",
        body: [
          "Ordering food, four styles. **Blocking**: you stand at the kitchen pass until your dish is up — simple, and you can do nothing else (a parked thread). **Non-blocking**: you lean over and ask 'ready?' — 'no' — so you wander off and ask again later (polling; cheap per ask, wasteful if you ask often). **Asynchronous**: you give the kitchen your number — 'call me when it's ready' — and sit down; the completion finds *you* (a callback). **Readiness** (poll/select/epoll): the kitchen installs a buzzer light — one panel tells you which of your many orders is ready, and you handle the lit ones (an event loop).",
          "All four serve the same food. What differs is *where the waiter's time goes*: standing, re-asking, waiting for a call, or watching one panel. Threads are the standing: each blocked read costs a whole waiter.",
        ],
      },
      {
        kind: "visual",
        simId: "io-transfer-lab",
        body: [
          "Run the lab in **interrupt-driven** mode again, but this time read it as a scheduling story: between the device tick and the handling tick, the log says the CPU 'worked on other things' — that gap *is* asynchrony. The issuing process in a real OS would have been parked on a wait queue (blocking view) — but the CPU itself was free, which is what let other processes run.",
          "The lab models one requester and one transfer, so it cannot show the payoff directly; the payoff is *concurrency*: with DMA or interrupt-driven I/O, many transfers can be in flight while one CPU serves them all. Watch the two counters and ask the question this lesson answers: at 50% CPU utilization, what was the CPU doing during the other half? Whatever your answer is — that's the event loop's head start.",
        ],
      },
      {
        kind: "technical",
        body: [
          "**Blocking I/O** is the default: `read()` parks the calling thread on a wait queue until the data is ready, then returns with it. Simple to program, and fine when the thread has nothing else to do — but concurrency then requires *threads*, one per outstanding operation. **Non-blocking I/O** (open with `O_NONBLOCK`) makes the same call return immediately: 'would block' (the `EWOULDBLOCK`/`EAGAIN` error) if not ready. Nothing is delivered — you must re-ask; by itself it's polling, and the cost depends on how often you ask.",
          "**Readiness notification** makes the re-asking cheap and scalable: `poll()`/`select()`/`epoll` take *many* descriptors and block until *some* are ready, returning which. One thread, one wait, many I/Os — the **event loop**: wait-for-ready, handle each ready operation with non-blocking calls, repeat. This is how nginx, Redis and Node.js serve tens of thousands of connections on a handful of threads.",
          "**Asynchronous I/O** goes further: issue the operation and return immediately; the kernel (or device, in modern interfaces) performs it and *delivers completion* — a signal, a completion queue entry, a callback. POSIX's `aio_*` interface and Linux's `io_uring` are the real forms; the caller never blocks *and* never re-asks. The vocabulary discipline that matters: *non-blocking* means 'the answer is no, ask again'; *asynchronous* means 'the answer is coming — we'll tell you'. The lab's interrupt method shows the kernel-side reality both rely on: issue, free the CPU, get told on completion.",
        ],
        equations: [
          {
            expr: "Threads needed (blocking) = concurrent outstanding operations      Threads needed (event loop / async) = 1",
            symbols: [
              { sym: "concurrent outstanding", meaning: "I/O operations in flight at once (500 connections, 500 reads…)" },
            ],
            note: "The thread count, not the I/O speed, is the scaling wall: each blocked thread costs memory (a stack) and scheduler attention.",
          },
          {
            expr: "Non-blocking ask cost = n asks × t_ask      Readiness cost = 1 wait + k × t_handle (k = ready count)",
            symbols: [
              { sym: "n", meaning: "polling attempts until something is ready" },
              { sym: "k", meaning: "operations ready per wait" },
            ],
            note: "Polling's cost scales with impatience; readiness scales with work actually available. Same API family, opposite scaling.",
          },
        ],
      },
      {
        kind: "worked-example",
        steps: [
          {
            title: "500 connections, two architectures",
            body: [
              "**Thread-per-connection, blocking reads**: 500 threads, nearly all parked in `read()` at any instant. Memory: 500 stacks (MBs even with small stacks). Wakes: every packet that arrives costs a context switch onto a cold thread. CPU is honestly used, but the *bookkeeping* of idleness dominates at scale.",
              "**Event loop, readiness + non-blocking**: 1 thread (or a few). `epoll_wait` returns 'these 30 sockets are readable'; the thread handles each with a non-blocking read that succeeds immediately; back to waiting. Same 500 connections, one stack, one scheduler entity — and the kernel's interrupt/DMA machinery (lessons 1–2) is what made every one of those completions cheap to notice.",
            ],
          },
          {
            title: "Choosing honestly",
            body: [
              "Blocking I/O remains the right answer for sequential programs — a CLI tool, a build step — where threads are few and clarity wins. The event loop wins for *many mostly-idle* connections; it loses for CPU-heavy handlers (one slow computation blocks every connection behind it).",
              "Asynchronous I/O (io_uring) is the endgame for storage: submit batches of operations, reap completions, never park a thread on a disk wait — the DMA lesson's 'one interrupt at the end', generalized to a whole program's I/O. Every step of this module was building the vocabulary for that sentence.",
            ],
          },
        ],
      },
      {
        kind: "misconceptions",
        items: [
          {
            wrong: "Non-blocking and asynchronous are synonyms — both mean 'it returns immediately'.",
            right: "Non-blocking returns immediately with 'not ready' (you must poll back); asynchronous returns immediately with a *promise* and the kernel notifies you on completion. One moves the waiting into your loop; the other eliminates the waiting.",
          },
          {
            wrong: "Async I/O makes each individual transfer finish faster.",
            right: "Latency per transfer is unchanged — the device is the device. Async changes *throughput and structure*: the CPU isn't parked per operation, so many transfers overlap on few threads. Faster machine, same-speed transfer.",
          },
        ],
      },
      {
        kind: "knowledge-check",
        questions: [
          {
            id: "kc-m10-bai-1",
            q: "A process calls read() on a descriptor opened with O_NONBLOCK when no data is ready. What happens?",
            options: [
              "It returns immediately with an EWOULDBLOCK/EAGAIN indication — the caller must try again later",
              "It sleeps until data arrives, like a blocking read",
              "It returns the previously buffered data",
              "It signals the process when data arrives",
            ],
            answerIndex: 0,
            explanation:
              "Non-blocking means never sleeping: 'would block' comes back at once. Delivery still requires the caller to re-ask — which is why scalable code pairs O_NONBLOCK with readiness notification (poll/epoll), not with busy polling.",
          },
          {
            id: "kc-m10-bai-2",
            q: "A server maintains 200 concurrent operations. Under blocking I/O versus an async event loop, the minimum thread counts are…",
            options: [
              "200 (one parked thread per outstanding op) versus 1 (one loop reaping completions)",
              "1 versus 200 — async needs a thread per completion",
              "200 versus 200 — concurrency always needs one thread per operation",
              "0 versus 0 — the kernel threads handle it either way",
            ],
            answerIndex: 0,
            explanation:
              "Blocking parks a thread per in-flight operation; the event loop parks none — one thread waits for readiness/completions and handles them in turn. That ratio (200:1) is the entire business case for event-driven servers.",
          },
        ],
      },
      {
        kind: "references",
        items: [
          {
            label: "man7: open(2) — O_NONBLOCK and blocking semantics",
            url: "https://man7.org/linux/man-pages/man2/open.2.html",
            note: "where the non-blocking flag is set, with the exact EAGAIN contract",
          },
          {
            label: "man7: poll(2) — wait for events on file descriptors",
            url: "https://man7.org/linux/man-pages/man2/poll.2.html",
            note: "readiness notification — the event loop's primitive, one man page long",
          },
          {
            label: "man7: aio(7) — POSIX asynchronous I/O overview",
            url: "https://man7.org/linux/man-pages/man7/aio.7.html",
            note: "asynchronous I/O as POSIX defines it: submit now, be notified later",
          },
        ],
      },
      {
        kind: "note",
        body: [
          "Lab simplifications: the lab shows one requester, so 'CPU free between ticks' stands in for asynchrony without modeling callbacks, signals, completion queues or wait queues. No threads exist in the lab at all — the thread-count arithmetic above is the part you must carry in your head from this lesson into any real system you design.",
        ],
      },
    ],
  },
];
