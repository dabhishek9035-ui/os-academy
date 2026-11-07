import type { Lesson } from "@/types";

/**
 * Module 1 — Interrupts, Exceptions & Traps.
 * Builds on module 0's trap/kernel ideas: plain problems first, the formal
 * lifecycle only once the intuition has landed.
 */
export const lessons: Lesson[] = [
  {
    id: "interrupts/why-interrupts",
    moduleId: "interrupts",
    title: "Why Interrupts Exist",
    minutes: 8,
    objectives: [
      "explain why a CPU cannot simply 'wait' for devices",
      "trace what happens when a key is pressed while the CPU is busy",
      "distinguish interrupts from the traps you met in module 0",
    ],
    sections: [
      {
        kind: "problem",
        body: [
          "Your video is playing smoothly and you type a message at the same time. Inside the machine, one CPU is decoding the next video frame when your finger hits the key. The CPU cannot pause the world — it has no second pair of eyes. So how does it ever *notice* the keypress?",
          "One option: between every two instructions, ask every device 'anything for me?'. With a keyboard, a disk, a network card, a mouse and a timer, that is a lot of asking — and the answer is almost always 'no'. The other option: let a device *tap the CPU on the shoulder* the moment something happens. That tap is the idea this module is about.",
        ],
      },
      {
        kind: "intuition",
        body: [
          "Picture a chef making a delicate sauce that needs two minutes of constant stirring. The oven timer will ring when the bread is done. The chef does not stand staring at the oven — that would ruin the sauce. The chef stirs, the timer **rings**, the chef finishes the current stir, wipes their hands, deals with the bread, and goes back to exactly the right spot in the recipe.",
          "The timer is the **interrupt**: a signal that a device sends when it needs attention. The chef's quick handwritten note of where they were is what the CPU does with its program counter. Stirring was never delayed much, and the bread never waited for the sauce to finish — both jobs made progress.",
        ],
      },
      {
        kind: "visual",
        simId: "interrupt-lab",
        body: [
          "In the Interrupt Lab, run the CPU on its background task and press a device key mid-run. Watch the CPU finish its current instruction, jump away to the handler, and return to exactly where it left off — the counter line in the task never skips a beat.",
        ],
      },
      {
        kind: "technical",
        body: [
          "An **interrupt** is an asynchronous signal from hardware that makes the CPU suspend its current work, run a special routine, and then resume. *Asynchronous* means it arrives whenever the device is ready, not at any moment the running program chose — that is the key difference from the **trap** of module 0, which is synchronous, caused by the very instruction the program executed (a system call or a fault).",
          "The pieces that make this work: each device connects to an **interrupt controller** that forwards its signal to the CPU as an interrupt request. At boot, the operating system registers the address of an **interrupt handler** (also called an ISR, interrupt service routine) for each interrupt type. When an interrupt arrives, the CPU jumps to the registered handler automatically — no program needs to ask for it.",
          "The whole design trades a small fixed cost per event for freedom between events: instead of paying attention continuously (polling — next lessons), the CPU pays only when something actually happens.",
        ],
        equations: [
          {
            expr: "Useful fraction = T_work ÷ (T_work + N × T_overhead)",
            symbols: [
              { sym: "T_work", meaning: "time spent on useful program work" },
              { sym: "N", meaning: "how many interrupts arrive in that period" },
              {
                sym: "T_overhead",
                meaning: "fixed cost of one interrupt (save state, run handler, restore)",
              },
            ],
            note: "Interrupts are cheap when N is small. If devices interrupt constantly, the overhead term grows and alternatives (polling, DMA — Module 10) win.",
          },
        ],
      },
      {
        kind: "worked-example",
        steps: [
          {
            title: "A keypress during video playback",
            body: [
              "The CPU is deep in video-decoding code; the program counter points at instruction 1042. You press a key. The keyboard controller raises an interrupt, which the interrupt controller forwards to the CPU.",
              "The CPU finishes instruction 1042, saves the program counter (1042, the *next* instruction's address) and status flags, switches to kernel mode, and jumps to the keyboard handler registered at boot.",
            ],
          },
          {
            title: "The handler and the return",
            body: [
              "The handler reads the key code from the controller, places it in the OS's keyboard buffer, and signals 'done'. It runs for only a few microseconds — handlers are kept short on purpose.",
              "The CPU restores the saved program counter and status, dropping back to user mode. Instruction 1043 executes as if nothing happened; at most a few frames' worth of work shifted by microseconds. The video never stalls, and the keypress was not missed.",
            ],
          },
        ],
      },
      {
        kind: "misconceptions",
        items: [
          {
            wrong: "The CPU must constantly check devices or it will miss their events.",
            right: "That is polling, one strategy among several. With interrupts the device *notifies* the CPU, so nothing is missed and no attention is wasted between events.",
          },
          {
            wrong: "An interrupt destroys the running program's progress.",
            right: "The CPU saves the program counter and status before the handler runs and restores them after. The program resumes exactly where it stopped — interrupted, not restarted.",
          },
        ],
      },
      {
        kind: "knowledge-check",
        questions: [
          {
            id: "kc-m1-why-1",
            q: "A disk finishes writing data while the CPU runs a spreadsheet. What makes the CPU aware of it?",
            options: [
              "The disk controller raises an interrupt, and the CPU jumps to the disk handler",
              "The spreadsheet must ask the disk about it on every instruction",
              "The disk writes directly into the CPU's registers",
              "The CPU restarts the spreadsheet from the beginning",
            ],
            answerIndex: 0,
            explanation:
              "The device signals; the hardware vectors to the registered handler; the interrupted program resumes afterwards. No per-instruction asking needed.",
          },
          {
            id: "kc-m1-why-2",
            q: "Which pairing is correct?",
            options: [
              "Trap = caused by the running instruction; interrupt = caused by an external device",
              "Trap = caused by devices; interrupt = caused by the running instruction",
              "Both are caused only by devices",
              "Both are caused only by user programs",
            ],
            answerIndex: 0,
            explanation:
              "Traps are synchronous (the program's own system call or fault); interrupts are asynchronous (a device acting on its own schedule). Both use similar save-and-vector machinery.",
          },
        ],
      },
      {
        kind: "references",
        items: [
          {
            label: "OSTEP, Chapter 6: Limited Direct Execution (Arpaci-Dusseau)",
            url: "https://pages.cs.wisc.edu/~remzi/OSTEP/cpu-mechanisms.pdf",
            note: "the 'problem 1: what if a process does something restricted' and 'problem 2' discussions cover traps and interrupt-driven switching",
          },
          {
            label: "xv6: a simple, Unix-like teaching operating system (MIT)",
            url: "https://github.com/mit-pdos/xv6-riscv",
            note: "read kernel/trap.c to see a real kernel's trap and interrupt entry point",
          },
          {
            label: "Intel 64 and IA-32 Software Developer's Manual, Chapter 6: Interrupt and Exception Handling",
            url: "https://www.intel.com/content/www/us/en/developer/articles/technical/intel-sdm.html",
            note: "how a mainstream CPU defines interrupts, exceptions and handlers",
          },
        ],
      },
      {
        kind: "note",
        body: [
          "The Interrupt Lab models each handler as a fixed number of cycles and the controller as a single wire — real handlers vary in length, and real controllers (PIC/APIC) arbitrate many lines, buffer pending requests and support nesting. Real CPUs also interact with pipelines and caches on entry, which the lab does not model.",
        ],
      },
    ],
  },
  {
    id: "interrupts/interrupt-lifecycle",
    moduleId: "interrupts",
    title: "The Interrupt Lifecycle",
    minutes: 9,
    objectives: [
      "list the lifecycle steps from device signal to resumed program in order",
      "compute a small interrupt latency from per-step costs",
      "explain what the interrupt vector table is for",
    ],
    sections: [
      {
        kind: "problem",
        body: [
          "The tap on the shoulder sounds simple, but 'handle an interrupt' hides a bookkeeping question: the interrupted program is mid-flight, with a program counter, status flags and registers that all matter. If the handler changes even one of them and nobody wrote the old value down, the program is silently corrupted when it resumes.",
          "So the real question is: *exactly* what happens, step by step, between the instant a device signals and the instant the old program continues? Get these steps in the wrong order — for example, jumping to the handler before saving the program counter — and the machine breaks. Precision is the point of this lesson.",
        ],
      },
      {
        kind: "intuition",
        body: [
          "Back to the chef mid-recipe. The phone rings (device signals). The chef does not drop the whisk mid-motion: they finish the current movement (**complete the current step**). Then they slide a bookmark into the recipe and scribble the stove setting on it (**save progress and status**). The bookmark's index says which page has the recipe for phone calls (**vector table**). They take the call (**handler**), slide the bookmark back, re-set the stove (**restore**), and continue the recipe one line further than before (**resume**).",
          "Every step exists because of one rule: *returning must be perfect*. Nothing about the interrupted work may change unless the OS intends it to.",
        ],
      },
      {
        kind: "visual",
        simId: "interrupt-lab",
        body: [
          "Step through the lifecycle one phase at a time in the Interrupt Lab. Watch the PC value get saved before the handler address is loaded — that order is the whole ballgame — and watch it come back during the restore.",
        ],
      },
      {
        kind: "technical",
        body: [
          "**Step 1 — the device raises the interrupt.** A device (or its controller) asserts a request line. The **interrupt controller** collects requests, prioritizes them (later lesson), and signals the CPU.",
          "**Step 2 — the CPU completes the current instruction.** Interrupts are honored at *instruction boundaries*, never mid-instruction; this keeps the hardware's view of state clean.",
          "**Step 3 — the CPU saves the essentials.** The program counter (address of the next instruction to execute) and the status flags are saved — typically pushed onto a stack or into special registers — and the CPU switches into kernel mode. On many architectures the handler itself saves the remaining registers it will touch.",
          "**Step 4 — vector to the handler.** The CPU (or the OS's entry code) uses the interrupt number as an index into the **interrupt vector table** — an array of handler addresses the OS filled in at boot. The lookup yields the handler's address, and the CPU jumps there.",
          "**Step 5 — the handler runs.** It services the device: read the data, acknowledge the controller, buffer the result. Handlers are kept brief; long work is deferred (Module 3 shows the scheduler picking that work up).",
          "**Step 6 — restore and resume.** Saved status and program counter are reloaded, the CPU drops back to the mode it came from, and the interrupted program continues as if nothing happened.",
        ],
        equations: [
          {
            expr: "Interrupt latency = T_finish + T_save + T_vector",
            symbols: [
              {
                sym: "T_finish",
                meaning: "cycles left in the instruction the CPU was executing",
              },
              {
                sym: "T_save",
                meaning: "cycles to save PC/status and switch to kernel mode",
              },
              {
                sym: "T_vector",
                meaning: "cycles to look up the handler in the vector table and jump",
              },
            ],
          },
          {
            expr: "Total detour = Interrupt latency + T_handler + T_restore",
            symbols: [
              { sym: "T_handler", meaning: "cycles the handler itself needs" },
              { sym: "T_restore", meaning: "cycles to reload saved state and resume" },
            ],
            note: "Latency is 'signal to first handler instruction'; the detour is 'signal to resumed program'. Both are quoted in the lab.",
          },
        ],
      },
      {
        kind: "worked-example",
        steps: [
          {
            title: "One keypress, in cycles",
            body: [
              "The interrupt arrives while the CPU is 2 cycles into a 4-cycle instruction, so T_finish = 2. Saving PC and status costs 4 cycles; the vector lookup and jump cost 2; the keyboard handler needs 30; restoring costs 4.",
              "Latency to the first handler instruction = 2 + 4 + 2 = **8 cycles**. Total detour from signal to resumed program = 8 + 30 + 4 = **42 cycles**. On a 3 GHz CPU that detour is about 14 nanoseconds — cheap enough to do thousands of times per second without anyone noticing.",
            ],
          },
          {
            title: "What if the order were wrong?",
            body: [
              "Suppose the CPU jumped to the handler *before* saving the program counter. The handler's own instructions would overwrite the PC; the old value would be gone forever. The interrupted program could never resume correctly.",
              "This is why the save happens first in every real architecture, from a RISC-V core to an x86 laptop: the machinery has no idea what the handler will do, so it must make returning possible before handing control over.",
            ],
          },
        ],
      },
      {
        kind: "misconceptions",
        items: [
          {
            wrong: "The interrupt interrupts the CPU in the middle of an instruction.",
            right: "The CPU always finishes the instruction it is executing, then honors the interrupt. Honoring mid-instruction would leave partially-computed state that is hard to resume.",
          },
          {
            wrong: "The hardware saves all of the program's registers automatically.",
            right: "Hardware saves the essential minimum (PC, status); the handler or entry code saves any additional registers it will clobber. The full register file is not automatically duplicated.",
          },
        ],
      },
      {
        kind: "knowledge-check",
        questions: [
          {
            id: "kc-m1-lifecycle-1",
            q: "An interrupt arrives while a 5-cycle instruction is 3 cycles in. Saving takes 4 cycles and vectoring 2. Latency to the first handler instruction?",
            options: [
              "8 cycles — 2 left of the instruction, plus 4 save, plus 2 vector",
              "6 cycles — 4 save plus 2 vector",
              "11 cycles — the whole 5-cycle instruction, save and vector",
              "2 cycles — just the rest of the instruction",
            ],
            answerIndex: 0,
            explanation:
              "Finish the instruction first (5 − 3 = 2 cycles), then save (4), then vector (2): 2 + 4 + 2 = 8.",
          },
          {
            id: "kc-m1-lifecycle-2",
            q: "What is the interrupt vector table?",
            options: [
              "An array of handler addresses, indexed by interrupt number",
              "A queue of pending keyboard characters",
              "The list of running programs the OS keeps",
              "A log of all interrupts that have fired",
            ],
            answerIndex: 0,
            explanation:
              "The OS fills the table at boot; the interrupt number selects which handler address to jump to. It is the 'bookmark index' of the lifecycle.",
          },
        ],
      },
      {
        kind: "references",
        items: [
          {
            label: "OSTEP, Chapter 6: Limited Direct Execution — the interrupt protocol",
            url: "https://pages.cs.wisc.edu/~remzi/OSTEP/cpu-mechanisms.pdf",
          },
          {
            label: "xv6-riscv: kernel/trap.c and kernel/kernelvec.S",
            url: "https://github.com/mit-pdos/xv6-riscv",
            note: "a real save-state-and-vector sequence you can read",
          },
          {
            label: "Intel SDM, Chapter 6: interrupt classification and stack switching",
            url: "https://www.intel.com/content/www/us/en/developer/articles/technical/intel-sdm.html",
          },
        ],
      },
      {
        kind: "note",
        body: [
          "The lab charges fixed cycle counts for save, vector and restore and keeps them identical for every device; real costs vary with the instruction in flight, cache state and whether the CPU changes stacks. The lab also allows nesting only in the priorities lesson — real systems tune interrupt nesting per architecture.",
        ],
      },
    ],
  },
  {
    id: "interrupts/polling-vs-interrupts",
    moduleId: "interrupts",
    title: "Polling vs. Interrupts",
    minutes: 9,
    objectives: [
      "compute the CPU cost of polling a device over a time window",
      "compare that cost against interrupt overhead for the same workload",
      "name situations where polling is actually the better design",
    ],
    sections: [
      {
        kind: "problem",
        body: [
          "A backup program is copying a huge file to a fast SSD. The CPU starts the write and needs to know when the drive is ready for the next chunk — it will be ready in a few hundred cycles. Meanwhile your music player wants the CPU. If the backup program sits in a tight loop asking 'ready yet? ready yet?', the answer arrives fast… but the CPU was doing nothing else the whole time.",
          "Two strategies, one dilemma: **poll** (ask repeatedly, get the answer sooner, burn attention while waiting) or **interrupt** (get notified, use the wait time for other work, pay a fixed overhead each time). Neither wins everywhere — and picking wrong shows up as either a laggy system or a missed deadline.",
        ],
      },
      {
        kind: "intuition",
        body: [
          "You ordered pizza. **Polling** is standing by the front door, opening it every thirty seconds to check. Your homework gets zero done, but you catch the driver the instant they arrive. **Interrupts** are doing homework until the doorbell rings: plenty of homework gets done, but each ring costs you the small cost of putting everything down and getting up.",
          "Now the twist: what if the pizza is *already at the door* when you order? Getting up once is cheaper than opening the door twenty times. That is why fast, immediate devices sometimes prefer polling — the analogy scales all the way down to hardware.",
        ],
      },
      {
        kind: "visual",
        simId: "polling-vs-interrupt",
        body: [
          "Run the race: give the device a long wait time in polling mode and watch the CPU's useful-work bar stall; then switch to interrupt mode and watch the gap fill with other work. Now shrink the device's wait until polling starts to look competitive.",
        ],
      },
      {
        kind: "experiment",
        simId: "polling-vs-interrupt",
        prompts: [
          "With the device set to a 500-cycle wait, run both modes and record how many cycles each wastes. Which wins, and by how much?",
          "Now make the device ready almost instantly (wait near zero). Re-run both modes — does the winner change? Explain why with the two equations below.",
          "Set the device to interrupt constantly (many events per window). What happens to the interrupt mode's overhead term?",
        ],
        body: [
          "Treat the run like a lab: fix the window, change one variable at a time, and read the waste counters at the end.",
        ],
      },
      {
        kind: "technical",
        body: [
          "**Polling** means the CPU repeatedly reads a device status register until it reports ready (a **busy-wait**). The CPU pays on a schedule: every check costs cycles whether or not the device is ready, so total polling cost is proportional to how long (and how often) the CPU asks. **Interrupts** flip the payment model: the CPU pays a fixed overhead *per event*, and nothing between events.",
          "Neither is free. Polling wastes cycles *before* the event; interrupts cost cycles *at* the event (save, vector, handler, restore — the lifecycle detour). The better choice is whichever bill is smaller for the workload at hand.",
          "When polling wins: the device is very fast (ready almost immediately — e.g. some on-chip controllers), events are extremely frequent (interrupt overhead would swamp throughput), or in tiny embedded systems with no other work to do and simplicity is everything. When interrupts win: the device is slow or unpredictable (keyboard, disk, network), and the CPU has other work waiting — the common case for an operating system. Real systems mix both, and DMA (Module 10) removes the CPU from bulk transfers entirely.",
        ],
        equations: [
          {
            expr: "Polling cost over a window = (window ÷ poll interval) × cost per check",
            symbols: [
              { sym: "window", meaning: "length of the time period you are costing, in cycles" },
              { sym: "poll interval", meaning: "how often the CPU checks the device" },
              { sym: "cost per check", meaning: "cycles for one status read and test" },
            ],
            note: "Independent of when the device becomes ready — you pay for every check either way.",
          },
          {
            expr: "Interrupt cost over a window = number of events × overhead per event",
            symbols: [
              { sym: "number of events", meaning: "how many interrupts arrive in the window" },
              {
                sym: "overhead per event",
                meaning: "lifecycle detour: latency + handler + restore",
              },
            ],
            note: "Compare the two totals for the same window and workload; the smaller bill wins.",
          },
        ],
      },
      {
        kind: "misconceptions",
        items: [
          {
            wrong: "Interrupts are always the better design — that is why they were invented.",
            right: "For slow or sporadic devices, yes. For very fast devices or extremely frequent events, per-event interrupt overhead can exceed a few well-placed status checks — real drivers sometimes poll exactly for this reason.",
          },
          {
            wrong: "Polling means the CPU and the device are both busy working.",
            right: "Polling is a *busy-wait*: the device is working, but the CPU is doing nothing useful — just re-reading a status register. That wasted attention is the entire cost being compared.",
          },
        ],
      },
      {
        kind: "knowledge-check",
        questions: [
          {
            id: "kc-m1-poll-1",
            q: "A device is ready after 400 cycles. The CPU polls every 100 cycles; each check costs 10 cycles. How many cycles are burned on checks that find 'not ready yet'?",
            options: [
              "40 cycles — checks at t = 0, 100, 200, 300 each cost 10",
              "400 cycles — the whole wait counts as waste",
              "10 cycles — only the last check counts",
              "0 cycles — polling is free until the device is ready",
            ],
            answerIndex: 0,
            explanation:
              "Checks at t = 0, 100, 200, 300 (the t = 400 check finds it ready): four checks × 10 cycles = 40 cycles wasted.",
          },
          {
            id: "kc-m1-poll-2",
            q: "Which workload most favors polling over interrupts?",
            options: [
              "An on-chip controller that is ready within a few cycles, polled in a tight loop",
              "A keyboard, pressed a few times per second",
              "A disk that takes milliseconds to respond",
              "A network card with packets arriving at random times",
            ],
            answerIndex: 0,
            explanation:
              "When readiness is near-instant, a couple of checks beat the full interrupt detour. Slow or unpredictable devices are where interrupts shine.",
          },
        ],
      },
      {
        kind: "references",
        items: [
          {
            label: "OSTEP, Chapter 6: Limited Direct Execution (overhead of switches)",
            url: "https://pages.cs.wisc.edu/~remzi/OSTEP/cpu-mechanisms.pdf",
          },
          {
            label: "OSTEP, Chapter 36: I/O Devices (polling, interrupts, DMA)",
            url: "https://pages.cs.wisc.edu/~remzi/OSTEP/file-devices.pdf",
            note: "the canonical three-way comparison this lesson simplifies to two",
          },
          {
            label: "xv6-riscv: driver code with interrupt-driven I/O",
            url: "https://github.com/mit-pdos/xv6-riscv",
          },
        ],
      },
      {
        kind: "note",
        body: [
          "The race sim charges each mode its textbook costs only: polling pays per check, interrupts pay the full lifecycle detour per event. It does not model the hidden costs of either side in real hardware — poll loops competing for memory bandwidth, or interrupt coalescing that batches events to amortize overhead.",
        ],
      },
    ],
  },
  {
    id: "interrupts/priorities-masking",
    moduleId: "interrupts",
    title: "Priorities, Masking & Latency",
    minutes: 9,
    objectives: [
      "predict handler ordering when several interrupts arrive with different priorities",
      "explain what masking does and when an OS uses it",
      "compute how a higher-priority handler adds to another interrupt's delay",
    ],
    sections: [
      {
        kind: "problem",
        body: [
          "Three things happen in the same microsecond: the disk finished a block, the mouse moved, and the power supply reports it is about to fail. The CPU can run only one handler at a time. If the trivial mouse handler starts first and runs for two milliseconds, the power warning sits in a queue while the machine's remaining lifetime ticks away.",
          "And there is a second problem: some kernel code must not be interrupted *at all* — say, the few instructions updating the interrupt bookkeeping itself. If the CPU can be tapped on the shoulder anywhere, the OS's own data structures get corrupted. We need a way to say 'not right now' to some or all interrupts — without losing them.",
        ],
      },
      {
        kind: "intuition",
        body: [
          "An emergency room sorts patients by urgency, not arrival order: a paper cut waits; a heart attack jumps every queue, and a doctor stitching the cut puts the needle down *immediately* when the gurney rolls in. Interrupt priorities work the same way, including the part where an urgent case interrupts a less urgent one already being treated (**nesting**).",
          "Masking is the 'do not disturb' sign on a hotel door: housekeeping (ordinary interrupts) politely waits and knocks later, but a fire alarm (**non-maskable**) comes in regardless. The sign delays visits; it does not cancel them.",
        ],
      },
      {
        kind: "visual",
        simId: "interrupt-lab",
        body: [
          "In the Interrupt Lab, raise a low-priority device's interrupt, then trigger a high-priority one while its handler is running. Watch the high-priority handler preempt mid-handler, finish, and hand control back — the low-priority handler completes only after. Then flip the priorities and watch the lower one politely wait instead.",
        ],
      },
      {
        kind: "experiment",
        simId: "interrupt-lab",
        prompts: [
          "Start the disk handler (priority 3), then fire the timer (priority 1) and the mouse (priority 7) before the disk handler finishes. In what order do the three handlers complete? Write your prediction first.",
          "Mask all interrupts, fire the keyboard, and count how long its delivery is delayed. Does the event get lost or just postponed?",
          "Give one scenario from the lesson's problem where you would want the power-fail line to be non-maskable, and explain what goes wrong if it were maskable and masked.",
        ],
        body: [
          "In this course the convention is: **a smaller priority number means a more urgent interrupt**. Priority 1 preempts priority 3; priority 7 waits for everyone.",
        ],
      },
      {
        kind: "technical",
        body: [
          "**Priorities.** Each interrupt source has a priority; when several are pending, the **interrupt controller** delivers the most urgent first, and a higher-urgency arrival may **preempt** a lower-urgency handler that is already running (**nested interrupts**). In this course a *smaller number means higher priority*. A real power-failure line or machine-check is often wired as a **non-maskable interrupt (NMI)** — the emergency room's fire alarm: it preempts essentially everything.",
          "**Masking.** The CPU has an interrupt-disable control; code executing with interrupts **masked** will not be interrupted by maskable sources — their requests stay pending (latched by the controller) and are delivered when unmasked. The OS masks interrupts around **critical sections**: short stretches, like updating the ready queue, where an untimely handler would corrupt kernel data. Because pending work piles up and every event's latency grows, masked periods are kept as short as possible.",
          "**Latency under load.** Masking and preemption both stretch the lifecycle numbers from the previous lesson: an interrupt that arrives while something more urgent (or masked-out) is happening simply waits, and its observed delay is the lifecycle detour *plus* all the higher-priority time in front of it.",
        ],
        equations: [
          {
            expr: "Observed delay = T_pending + T_finish + T_save + T_vector + T_handler + T_restore",
            symbols: [
              {
                sym: "T_pending",
                meaning: "time the request spends waiting: masked-out time plus any higher-priority handlers that run first",
              },
              { sym: "T_finish", meaning: "cycles left in the interrupted instruction" },
              { sym: "T_save", meaning: "cycles to save PC/status and enter kernel mode" },
              { sym: "T_vector", meaning: "cycles to look up and jump to the handler" },
              { sym: "T_handler", meaning: "cycles the handler itself needs" },
              { sym: "T_restore", meaning: "cycles to restore state and resume" },
            ],
            note: "The lifecycle latency from the previous lesson is the special case T_pending = 0.",
          },
        ],
      },
      {
        kind: "misconceptions",
        items: [
          {
            wrong: "Priority 7 must be the most urgent — bigger numbers mean more important.",
            right: "In this course (and in many real controllers, e.g. ARM's) a *smaller* number means more urgent: priority 1 preempts priority 7. Always check the convention before reading a diagram.",
          },
          {
            wrong: "Masking an interrupt discards the event.",
            right: "Masked requests stay pending and are delivered when unmasked — delayed, not lost. (Prolonged masking can overflow device buffers in real hardware, which is why it is only for brief critical sections. And an NMI cannot be masked at all.)",
          },
        ],
      },
      {
        kind: "knowledge-check",
        questions: [
          {
            id: "kc-m1-pri-1",
            q: "The disk handler (priority 3) is running. A priority-1 timer interrupt and a priority-7 mouse interrupt arrive while it runs. In what order do the handlers complete?",
            options: [
              "Timer, disk, mouse — 1 preempts 3; 7 waits for both",
              "Mouse, timer, disk — the newest goes first",
              "Disk, timer, mouse — the running handler always finishes first",
              "Mouse, disk, timer — 7 outranks 3",
            ],
            answerIndex: 0,
            explanation:
              "Smaller number = more urgent: the timer (1) preempts the disk handler (3); the disk handler then resumes and finishes; the mouse (7) was waiting the whole time and runs last.",
          },
          {
            id: "kc-m1-pri-2",
            q: "Why does the OS mask interrupts while updating its ready-queue structures?",
            options: [
              "A handler firing mid-update could see or leave the structure half-changed",
              "To make the update run faster",
              "Because user programs requested it",
              "To stop the keyboard from being used",
            ],
            answerIndex: 0,
            explanation:
              "Critical sections must appear atomic; masking ensures no handler interleaves with the update. The cost is delayed events, so the sections are kept short.",
          },
        ],
      },
      {
        kind: "references",
        items: [
          {
            label: "OSTEP, Chapter 6: Limited Direct Execution",
            url: "https://pages.cs.wisc.edu/~remzi/OSTEP/cpu-mechanisms.pdf",
          },
          {
            label: "xv6-riscv: kernel/trap.c (interrupt enable/disable around kernel code)",
            url: "https://github.com/mit-pdos/xv6-riscv",
          },
          {
            label: "Intel SDM, Chapter 6: interrupt priority and the IF flag (masking)",
            url: "https://www.intel.com/content/www/us/en/developer/articles/technical/intel-sdm.html",
          },
        ],
      },
      {
        kind: "note",
        body: [
          "The lab enforces a strict smaller-number-wins rule with at most one level of nesting and a single controller queue; real controllers differ in tie-breaking, per-source enable bits and priority grouping, and real CPUs batch or coalesce interrupts under load. Masking in the lab is all-or-nothing per device rather than the CPU-wide IF-flag model.",
        ],
      },
    ],
  },
];
