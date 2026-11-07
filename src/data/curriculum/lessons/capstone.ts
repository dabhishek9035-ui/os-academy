import type { Lesson } from "@/types";

/**
 * Module 13 — Putting It All Together.
 * One program (`sumfile`: reads /docs/numbers.txt, prints the sum) followed
 * through every subsystem of the machine, then the map and the ledger of the
 * whole course.
 * Lab conventions in this course: the End-to-End Computer Simulator walks 10
 * scripted stages — program loading → process creation → memory allocation →
 * scheduling → system-call entry → I/O request → interrupt handling → process
 * resumption → file access → termination & cleanup — and each stage names its
 * participating subsystems and links back to the lesson that teaches it.
 */
export const lessons: Lesson[] = [
  {
    id: "capstone/follow-a-program",
    moduleId: "capstone",
    title: "Follow a Program Through the Machine",
    minutes: 12,
    objectives: [
      "narrate one program's full lifecycle, naming the subsystem responsible at each step",
      "connect the thirteen modules' mechanisms into one causal chain",
      "predict, at each stage, which module's machinery appears next",
    ],
    sections: [
      {
        kind: "problem",
        body: [
          "Thirteen modules, dozens of mechanisms — but on a real machine they all fire *interleaved, per instruction*, and the seams between them are where understanding actually lives. So here is the exam that matters: follow ONE ordinary program — call it `sumfile`, which reads `/docs/numbers.txt` and prints the sum — from the moment it is launched to the moment it is reaped, and at every step name *which subsystem is acting, why, and what it hands to next*. If you can tell that story without hesitating, the course is one machine, not thirteen chapters.",
          "The walkthrough below is the story in full; the simulator makes every stage clickable, names the subsystems involved, and links each stage back to the lesson that teaches it. Two rules hold across the whole journey and explain every transition: user code leaves user mode only through a **trap**, and the kernel acts only when **asked** (syscall), when something **faults**, or when the world **interrupts**. Keep those three triggers in hand and the ten stages stop being a list — they become consequences.",
        ],
      },
      {
        kind: "intuition",
        body: [
          "A **new employee's first day**, told by the building itself. The badge is printed from the HR archive (program loaded from disk). A desk is assigned in a wing of the building no one else can enter (memory allocated, address space isolated). The scheduler walks you to an available workstation (CPU time). You file a request slip with the mailroom and *sit down* — you do not stand at the mailroom window (syscall, then blocked). The intercom crackles across the whole building for your one package (interrupt — everyone hears it; only your delivery moves). You are walked back to your desk and resume *mid-sentence*, notes exactly where you left them (context restored from the PCB). The paperwork gets filed in the archive with a proper index card (filesystem, inode). At five o'clock you return badge and keys with a signed exit form, and the manager — who hired you and is waiting — marks your file complete (exit, zombie, reaped by the parent's `wait`).",
          "Every department of the building touches this one employee on this one day. That is the machine: not thirteen departments in a row, but one journey through all of them.",
        ],
      },
      {
        kind: "visual",
        simId: "capstone-sim",
        body: [
          "The **End-to-End Computer Simulator** is the ten-stage walk made clickable: **program loading → process creation → memory allocation → scheduling → system-call entry → I/O request → interrupt handling → process resumption → file access → termination & cleanup**. Each stage names its participating subsystems — watch the chips under the narrative: Filesystem and Memory management at load; Process management and Scheduler at creation; I/O system and Device drivers at the request — and links back to the lesson that teaches it in depth.",
          "Ride it twice. First pass: read the narrative and *predict* the subsystem chips before looking. Second pass: for each stage, ask the question the chips answer — 'what would be missing if this subsystem didn't exist?'. That question is the course's table of contents, rediscovered from the top.",
        ],
      },
      {
        kind: "technical",
        body: [
          "**Stage 1 — Program loading.** `sumfile` sits on disk as bytes with metadata: an inode recording its size, permissions and block locations — [lesson:filesystems/inodes-metadata]. The kernel that is about to run it got there long ago, when the bootloader handed control over after power-on — [lesson:intro-computers-os/booting]. Subsystems: filesystem, the kernel's loader. Nothing runs yet; the program is still a file.",
          "**Stage 2 — Process creation.** The shell cannot 'run' a file directly; it `fork()`s itself and the child `exec()`s — overwriting its inherited address space with sumfile's code and data, argument vector included — and the result is a fresh entry in the process table, a PCB, a pid — [lesson:processes/fork-exec-wait]. The program/process distinction becomes load-bearing: the file never changed; a *process* came into existence — [lesson:processes/program-vs-process]. Subsystems: process management, scheduler (the new process lands ready).",
          "**Stage 3 — Memory allocation.** The kernel builds the address space: regions for code, data, heap, stack, laid out with the strategies of [lesson:memory-management/contiguous-allocation] — but lazily: pages are *not* read on setup; each is fetched on first touch via a page fault, as [lesson:virtual-memory/page-faults-demand-paging] explains. The protection walls (own page tables, kernel space unreachable) come from the same machinery, with the base/limit intuitions of [lesson:memory-management/base-limit-protection]. Subsystems: memory management, virtual memory.",
          "**Stage 4 — Scheduling.** Ready but not running: the process waits in the ready queue until the CPU scheduler picks it — the one-CPU-many-jobs contest of [lesson:cpu-scheduling/one-cpu-many-jobs]. From here on, the timeline of sumfile is the scheduler's decision, quantum by quantum — [lesson:cpu-scheduling/round-robin]. Subsystems: CPU scheduler.",
          "**Stage 5 — System-call entry.** sumfile calls `open(\"/docs/numbers.txt\")`. First crossing of the glass: number and arguments into registers, trap, mode switch, dispatch through the syscall table, arguments validated — the seven stages of [lesson:syscalls-security/system-calls], protected the whole way by the user/kernel wall of [lesson:syscalls-security/protection-isolation]. Subsystems: system-call interface, protection.",
          "**Stage 6 — I/O request.** The kernel resolves the path to the file's inode, checks permissions, returns a file descriptor. Then `read()`: the bytes are not in the page cache, so the kernel parks sumfile (waiting state) and turns to the device: the driver programs the disk controller, and **DMA** moves the block while the CPU does other work — the methods of [lesson:io-systems/pio-interrupt-dma], with the drivers and controllers of [lesson:io-systems/controllers-drivers]. Subsystems: I/O system, device drivers, the sleeping process.",
          "**Stage 7 — Interrupt handling.** The disk finishes and raises its completion interrupt — the event module 1 was built on. The CPU finishes the current instruction, saves state, vectors to the handler, which marks the sleeping process ready — the full sequence of [lesson:interrupts/interrupt-lifecycle], justified from first principles in [lesson:interrupts/why-interrupts]. The machine was doing something else entirely a microsecond ago; now the delivery is acknowledged. Subsystems: interrupt machinery, scheduler (a state changed).",
          "**Stage 8 — Process resumption.** The scheduler picks sumfile again; its full context — registers, program counter, opened-file state — is restored from the PCB exactly at the instruction after the `read()` trap. The process never knew it paused — that invisibility is what [lesson:processes/process-states] and the context-switch machinery buy. Subsystems: scheduler, virtual memory (its pages are back in the TLB's future).",
          "**Stage 9 — File access and computation.** The `read()` returns with bytes; sumfile parses numbers and adds. Under the arithmetic, the file abstraction is doing its job: the fd is an index into the kernel's open-file table, the path was a directory walk, the metadata lives in the inode — [lesson:filesystems/files-directories], [lesson:filesystems/inodes-metadata]. If a data page was never touched before, the arithmetic pauses for one page fault — [lesson:virtual-memory/page-faults-demand-paging] — and resumes. Subsystems: filesystem, virtual memory, the CPU.",
          "**Stage 10 — Termination & cleanup.** sumfile `write()`s the sum to stdout — the terminal is itself a file descriptor, module 9's everything-is-a-file — then calls `exit(0)`. The kernel closes all descriptors, tears down the address space, records the exit status, and leaves a **zombie**: the process is gone but its entry remains until the parent's `wait()` reaps it — [lesson:processes/zombies-orphans-ipc]. The shell prints a new prompt; the machine forgets nothing it owes and nothing it held. Subsystems: process management, filesystem (descriptor close), the parent shell.",
          "Read the ten stages again and watch the pattern: **three triggers** — syscall (5, 6, 9, 10), fault (3, 9), interrupt (7) — and **two schedulings** (4, 8) explain every transition. Nothing in the machine is a department working 'in the background'; the kernel is a library of mechanisms that fire on those triggers, and the journey is just the triggers in sequence.",
        ],
        equations: [
          {
            expr: "journey = load → fork/exec → alloc → schedule → syscall → I/O → interrupt → resume → file → exit",
            symbols: [
              { sym: "stage", meaning: "each arrow is a handoff between subsystems, named in the sim's chips" },
            ],
            note: "The order is causal, not ceremonial: you cannot schedule what was not created, cannot interrupt an I/O that was not issued, cannot reap a process that did not exit.",
          },
          {
            expr: "kernel acts ⟺ (syscall requested) ∨ (page/protection fault) ∨ (device interrupt)",
            symbols: [
              { sym: "⟺", meaning: "the kernel has no initiative of its own in this model — it is purely reactive" },
            ],
            note: "Every stage transition in the simulator reduces to one of these three triggers plus the scheduler choosing the next ready process.",
          },
        ],
      },
      {
        kind: "experiment",
        simId: "capstone-sim",
        prompts: [
          "Walk all ten stages, but before advancing each one, say aloud which two or three subsystems will be named in the chips. Score yourself: 8+ of 10 correct means the course's map is in your head; below that, note exactly which stage surprised you — that module is your review list.",
          "At stage 5 (system-call entry), name the seven sub-steps of the crossing before opening module 11's lesson: number+args in registers, trap, mode switch, dispatch, validate, execute, return. The sim compresses them into one stage — the link in its chip expands them.",
          "At stage 6 the sim shows sumfile *sleeping* while DMA runs. Answer in one sentence: why is sleeping not a bug — what exactly would be wasted if the kernel instead spun, checking the disk's status register every microsecond? (Module 1's polling answer, met again at journey scale.)",
          "Jump to stage 10 and trace the cleanup list: descriptors closed, address space torn down, exit status recorded, zombie awaiting `wait()`. Which single step, if skipped by the kernel, would eventually fill the process table with undead entries? (The parent's reap — module 2's zombies lesson.)",
        ],
        body: [
          "Lab conventions: the simulator walks ONE pass of ten stages; a real second of execution interleaves them thousands of times (syscalls, timer interrupts, page faults repeat constantly), and other processes compete for the CPU throughout. The disk is a single device; the shell is the only other process; timing is not modeled. The value of the sim is the *order and the cast* — which subsystem acts, and what it hands to whom.",
        ],
      },
      {
        kind: "worked-example",
        steps: [
          {
            title: "The journey in one breath, subsystem by subsystem",
            body: [
              "**Filesystem** hands the bytes of `sumfile` to the **loader**; **process management** forks and execs a new PCB into the table; **virtual memory** builds an address space it will populate lazily, on faults; the **scheduler** picks the new ready process; user code traps once per service call through the **syscall interface**; the **I/O system** and a **device driver** program the controller and park the process; **DMA** moves the block; the **interrupt** machinery wakes it; the **scheduler** resumes it mid-`read()`; the **filesystem** was the thing it was reading all along; and **process management** reaps it at exit. Ten stages, seven subsystems, three triggers.",
              "Now the reverse test, which is the real one: point at any mechanism from the course — the TLB, the ready queue, the inode, the trap instruction, the DMA engine — and place it in this story. If every mechanism you own from modules 0–12 has a home in the journey, the machine is connected; that was the module's only goal.",
            ],
          },
          {
            title: "What the story explains without effort",
            body: [
              "Three classic facts fall out of the walk for free. Why a crashed program cannot take the machine down: stages 3 and 5 built walls (unreachable kernel memory, validated syscall arguments) that turn the crash into a stage-10 event for *one* process. Why `time` on a busy machine is unstable: stages 4 and 8 happen unpredictably often, so the journey's length is a schedule, not a constant. Why deleting a file mid-read is safe-ish but messy: stage 9's inode survives until the last open descriptor closes — the open-file table, not the directory, decides the lifetime.",
              "None of those needed a new mechanism — only the journey, with the right names attached. That is the difference between having read the course and owning it.",
            ],
          },
        ],
      },
      {
        kind: "misconceptions",
        items: [
          {
            wrong: "The loader copies the program into RAM and jumps to its first instruction.",
            right: "Running a program is fork + exec: a new process is created over a copy-on-write copy of the shell, its address space is *described* rather than filled, and pages arrive lazily on first touch. 'Jumping' is stage 4's scheduling decision — the process must exist, be ready, and be picked before its first instruction executes.",
          },
          {
            wrong: "While waiting for the disk, sumfile keeps running, just slowly.",
            right: "It is not running at all: stage 6 parked it in the waiting state with its context saved in the PCB, and the CPU served other work until stage 7's interrupt marked it ready. Waiting is free; the expensive fake of waiting is polling.",
          },
        ],
      },
      {
        kind: "knowledge-check",
        questions: [
          {
            id: "kc-m13-fp-1",
            q: "Which ordering of the journey's stages is correct?",
            options: [
              "program loading → process creation → memory allocation → scheduling → syscall entry → I/O request → interrupt handling → resumption",
              "process creation → program loading → scheduling → memory allocation → I/O request → syscall entry → resumption → interrupt handling",
              "program loading → memory allocation → process creation → syscall entry → scheduling → interrupt handling → I/O request → resumption",
              "scheduling → program loading → process creation → memory allocation → interrupt handling → syscall entry → I/O request → resumption",
            ],
            answerIndex: 0,
            explanation:
              "The sim's ten stages in order. The logic is causal: the file is loaded, the process created from it, the address space built, the process scheduled — only then can it trap, request I/O, be interrupted, and resume.",
          },
          {
            id: "kc-m13-fp-2",
            q: "At stage 8 (resumption), what allows sumfile to continue *exactly* mid-`read()` as if nothing happened?",
            options: [
              "Its full execution context — registers and program counter — was saved in the PCB at park time and restored now",
              "The disk kept the process's state in its own controller memory during the transfer",
              "The process was never really paused — it ran slowly in the background at low priority",
              "The kernel re-executes the whole program from the start and replays up to the read",
            ],
            answerIndex: 0,
            explanation:
              "The PCB is the process's luggage: saved at every context switch (into waiting, out of running), restored at every resumption. Invisibility of waiting is the design contract, and the saved context is how it is kept.",
          },
        ],
      },
      {
        kind: "references",
        items: [
          {
            label: "OSTEP, Chapter 2: Introduction to the Operating System",
            url: "https://pages.cs.wisc.edu/~remzi/OSTEP/intro.pdf",
            note: "the book's own bird's-eye tour — virtualization, concurrency, persistence — the three acts this journey just merged",
          },
          {
            label: "OSTEP, Chapter 4: The Abstraction: The Process",
            url: "https://pages.cs.wisc.edu/~remzi/OSTEP/cpu-intro.pdf",
            note: "the process abstraction and its API — stages 2, 4 and 10 in their canonical telling",
          },
        ],
      },
      {
        kind: "note",
        body: [
          "Lab simplifications: ten stages, one pass, one disk, one competing process (the shell), no timing. Real machines interleave this journey continuously — the same stages fire thousands of times per second across all processes, the page cache may make stage 6 vanish entirely on a re-run, and timer interrupts barge in regardless of stage. The simulator teaches the *order and the cast*; the modules teach each actor's script.",
        ],
      },
    ],
  },
  {
    id: "capstone/big-picture",
    moduleId: "capstone",
    title: "The Big Picture: One Connected System",
    minutes: 10,
    objectives: [
      "state the contract each major abstraction sells (process, virtual memory, syscall, file, interrupt)",
      "estimate the composed cost of one journey from primitive latencies",
      "argue which guarantee dies if each of the machine's walls were removed",
    ],
    sections: [
      {
        kind: "problem",
        body: [
          "The last lesson followed one program through ten stages. Zoom out and the machine becomes two views at once: a **map of contracts** — hardware promises instructions and interrupts; the kernel turns those into processes, address spaces, files and names; libraries wrap it all until a double-click feels like nothing — and a **ledger** — every contract costs something per crossing, and the art of OS design is paying the smallest total for the guarantees you need. You have met every line on the map and every price in the ledger; what remains is to hold both simultaneously, and to test the design by demolition: *which guarantee dies if we remove this wall?*",
          "This lesson is the course in one page. If any line on the map or any entry in the ledger feels unfamiliar, it names the module to reread — that is what a capstone is for.",
        ],
      },
      {
        kind: "intuition",
        body: [
          "A **transit map**, seen after you have walked every street. Street level was last lesson: one courier, one route. The map is this lesson: lines (processes, address spaces, files, interrupts), interchanges (the syscall interface, the scheduler, the interrupt path), and fares (syscall ~hundreds of nanoseconds, context switch ~microseconds, page fault from disk ~hundreds of microseconds to milliseconds). The map's genius is omission: each line is a *contract* — 'this train serves this station, every few minutes' — and the whole system composes because every line honors the same interchange rules.",
          "Demolition is how you read a transit map honestly: close one interchange and watch which journeys become impossible. The kernel's walls work the same way — each one's value is exactly the catastrophe that would follow without it.",
        ],
      },
      {
        kind: "visual",
        simId: "capstone-sim",
        body: [
          "Ride the **End-to-End Computer Simulator** once more, but as a map-reader instead of a traveler: at each stage, name the *contract* being invoked, not just the subsystem. Loading: the file contract — bytes that outlive any process, named by paths. Creation: the process contract — a private CPU-in-time-share. Allocation: the address-space contract — private memory, larger than physical, protected. Scheduling: the time-share contract itself. Syscall entry: the doorway contract — checked access to kernel services. I/O and interrupt: the device contract — slow work happens off-CPU, and the world taps the CPU on the shoulder when it is done.",
          "Ten stages, five contracts, one kernel keeping every promise at once. When a stage's contract is the *interesting* part, you are reading the design; when only the steps are, you are reading the code. A capstone should leave you reading design.",
        ],
      },
      {
        kind: "technical",
        body: [
          "**The map — six contracts, stacked.** (1) **Hardware** promises instructions, memory and interrupts; everything above is built on trap-and-interrupt plumbing from module 1. (2) **Processes** promise each program a private CPU in time-share — created by fork/exec, kept honest by context switches (modules 2–3). (3) **Virtual memory** promises private, protected, over-capacity memory — page tables, faults, replacement (modules 5–6). (4) **The syscall interface** promises checked access to kernel services — the one door, validated (module 11). (5) **Files** promise bytes that outlive processes, named hierarchically, journaled against crashes (module 9). (6) **Virtualization** promises the same contracts again, one level down — guests as processes of a hypervisor (module 12). Each contract is *enforced below and consumed above*: that sentence is what 'layering' means, and every module of this course is one layer's implementation details.",
          "**The ledger — primitive prices, order of magnitude.** Register and L1-cache access: ~1 ns. A syscall round trip (trap, mode switch, dispatch, return): hundreds of ns. A context switch (two PCB swaps, cache disturbance): ~1–5 μs. A page fault serviced from an SSD: tens to hundreds of μs; from a spinning disk: ~ms. DMA: the bytes move at device speed with the CPU *free* — the device pays, not the ledger's CPU column. Compose the journey of last lesson in these terms and one fact jumps out: the total is *dominated by its most expensive term*, usually the one cold read — which is why caches, batching and DMA exist: they attack the expensive terms, not the cheap ones.",
          "**The demolition test — why each wall stands.** Remove the user/kernel mode bit (module 11): any process can rewrite page tables and touch devices — horizontal isolation dies with vertical; one bug becomes a reinstall. Remove virtual memory (modules 5–6): physical memory must be hand-partitioned, fragmentation is forever, and every buffer overflow is a neighbor's corruption. Remove the syscall choke point (module 11): arbitrary kernel addresses become callable — the wall develops a door in every panel. Remove interrupts (module 1): every device must be polled, and the CPU burns its cycles asking 'done yet?'. Remove virtualization (module 12): every isolated service needs its own physical machine. Each wall is a per-crossing cost buying the elimination of a whole catastrophe class — the entire course, stated as insurance.",
        ],
        equations: [
          {
            expr: "t_journey ≈ Σ (count of event i) × (cost of event i)",
            symbols: [
              { sym: "event i", meaning: "syscall, context switch, page fault, disk transfer, DMA handoff…" },
              { sym: "cost", meaning: "the primitive prices: ~ns (cache), ~100s ns (syscall), ~μs (switch), ~100s μs+ (fault from SSD/disk)" },
            ],
            note: "sumfile's run: 1 exec + a handful of first-touch faults + a few syscalls + ONE cold disk read. The cold read term dominates — predict the re-run with a warm page cache before you measure it (~1000× faster), then measure.",
          },
          {
            expr: "design quality = guarantees kept − Σ (per-crossing cost × crossing rate)",
            symbols: [
              { sym: "crossing rate", meaning: "how often the mechanism fires per second (syscalls: millions; faults: hoped-rare)" },
            ],
            note: "Why the fast paths are fast: a mechanism crossed millions of times per second must cost nanoseconds (module 11's syscall budget); one crossed rarely may afford microseconds. Price times frequency is the only honest way to compare walls.",
          },
        ],
      },
      {
        kind: "worked-example",
        steps: [
          {
            title: "The ledger of one sumfile run",
            body: [
              "Fork+exec: tens of μs. First-touch page faults on code/data: a handful — μs each if the loader's prefaults landed, ~0.1–1 ms each if they come from disk. `open` + three `read`s: syscalls at hundreds of ns each — except the first `read`, which misses the page cache and pays one disk round trip (~ms on spinning rust, ~100 μs on SSD). Parsing the numbers: nanoseconds. `write` to the terminal: one more syscall plus the tty driver. `exit` + reap: μs.",
              "Add it up: the run is one millisecond-scale term wearing a suit of microsecond terms. **Prediction**: re-run with the file cached — the disk term vanishes into the page cache and the run collapses by orders of magnitude. This is module 10's buffering/caching lesson, module 6's demand paging, and module 9's inode all appearing in a single subtraction. One measurement, three modules vindicated.",
            ],
          },
          {
            title: "One level down, the same machine",
            body: [
              "Take the map and shrink it: a **hypervisor** schedules guests the way the kernel schedules processes (module 3 one level down); **trap-and-emulate** is limited direct execution one level down (module 11); a **container** is module 6's unnameability extended from memory to pids, networks and filesystems; **EDF** is priority scheduling with deadlines as the priority (module 3's lesson, re-aimed); the **frame budget** is a soft deadline with a human detector (module 12's RT lesson, felt).",
              "The capstone's real claim: this course is not fourteen subjects but *one design grammar* — direct execution with traps, indirection for protection, caching for cost, contracts for composition — applied at every scale from a timer interrupt to a datacenter. Learn the grammar once and every new system you meet is a dialect.",
            ],
          },
        ],
      },
      {
        kind: "misconceptions",
        items: [
          {
            wrong: "The OS is one big program that constantly runs in the background, managing everything.",
            right: "The kernel is a *reactive library*: it acts on syscalls, faults and interrupts — between those, it is absent and user code runs at full speed (limited direct execution). Daemons and kernel threads exist, but the core mechanisms have no initiative; the machine's 'manager' is a set of reflexes, not a supervisor looping forever.",
          },
          {
            wrong: "Virtualization was a separate final topic — nothing from the earlier modules applies to it.",
            right: "The opposite: a hypervisor is this course's cast list with the OS in the guest seat — vCPU scheduling is module 3, trap-and-emulate is module 11's limited direct execution, container namespaces are module 6's unnameability generalized, overcommit is module 6's oversubscription of CPU. Module 12 was the earlier modules, viewed from one floor down.",
          },
        ],
      },
      {
        kind: "knowledge-check",
        questions: [
          {
            id: "kc-m13-bp-1",
            q: "Order these four events from cheapest to most expensive (typical modern magnitudes): a context switch, an L1 cache hit, a syscall round trip, a page fault serviced from SSD.",
            options: [
              "L1 hit (~1 ns) → syscall (~100s of ns) → context switch (~μs) → SSD page fault (~100s of μs)",
              "syscall → L1 hit → SSD page fault → context switch",
              "L1 hit → context switch → SSD page fault → syscall",
              "context switch → syscall → L1 hit → SSD page fault",
            ],
            answerIndex: 0,
            explanation:
              "Each order of magnitude is a different mechanism: cache hit is electronics, a syscall crosses the privilege wall once, a context switch swaps two processes' state plus cache warmth, and a page fault waits on a device. The ledger is why fast paths avoid crossings, not why they're coded carefully.",
          },
          {
            id: "kc-m13-bp-2",
            q: "Exactly three kinds of events can pull the CPU out of ordinary user-mode execution. Which three?",
            options: [
              "System calls (explicit trap), faults/exceptions (page fault, illegal instruction), and device interrupts",
              "System calls, function calls, and loop iterations",
              "Context switches, page hits, and file reads",
              "Interrupts, interrupts, and interrupts — there is only one kind",
            ],
            answerIndex: 0,
            explanation:
              "The reactive triad: asked (syscall), faulted (exception), notified (interrupt). Every kernel entry in the course — and every stage transition in the capstone sim — is one of these three, plus the scheduler's picks between them.",
          },
        ],
      },
      {
        kind: "references",
        items: [
          {
            label: "OSTEP, Chapter 2: Introduction to the Operating System",
            url: "https://pages.cs.wisc.edu/~remzi/OSTEP/intro.pdf",
            note: "the book's map — virtualization, concurrency, persistence — to compare against this lesson's",
          },
          {
            label: "OSTEP, Chapter 4: The Abstraction: The Process",
            url: "https://pages.cs.wisc.edu/~remzi/OSTEP/cpu-intro.pdf",
            note: "the central contract of the whole map, in its shortest canonical form",
          },
        ],
      },
      {
        kind: "note",
        body: [
          "Simplifications: the ledger's numbers are teaching magnitudes, not measurements — real figures swing by orders of magnitude with hardware (NVMe vs spinning disk: ~100× on the fault term) and configuration (speculative-execution mitigations can multiply syscall cost several-fold). The six-contract map compresses real kernels' dozens of subsystems; daemon activity, kernel threads and second-level caches of every kind are off-map. The demolition test argues one wall at a time — real designs interlock them, which is why the honest conclusion is defense in depth, not demolition.",
        ],
      },
    ],
  },
];
