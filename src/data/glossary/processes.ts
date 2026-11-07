import type { GlossaryEntry } from "@/types";

/** Glossary — module 2 (Processes & Process Control). */
export const entries: GlossaryEntry[] = [
  {
    id: "process",
    term: "Process",
    simple: "A program in motion — one live run of an executable, with its own memory and identity.",
    technical:
      "The OS abstraction for an executing program: an address space (code, data, heap, stack), CPU state (PC, registers), and kernel bookkeeping (PCB, PID, state, resources).",
    example:
      "The same editor binary opened twice yields two processes with different PIDs and separate undo histories.",
    related: ["program", "pcb", "pid", "process-state", "fork"],
    moduleId: "processes",
    lessonRef: "processes/program-vs-process",
    simId: "process-lab",
    refUrl: "https://pages.cs.wisc.edu/~remzi/OSTEP/cpu-intro.pdf",
    refLabel: "OSTEP ch. 4: The Abstraction of the Process",
  },
  {
    id: "program",
    term: "Program",
    simple: "The inert recipe: an executable file of instructions and data, waiting on disk.",
    technical:
      "A passive executable image (machine code plus static data) stored on a storage device; it becomes a process only when loaded and scheduled for execution.",
    example:
      "`/bin/ls` is a program; every time you run it, a new process is born from it and disappears when done.",
    related: ["process", "pcb", "exec"],
    moduleId: "processes",
    lessonRef: "processes/program-vs-process",
    simId: "process-lab",
  },
  {
    id: "pcb",
    term: "PCB",
    fullForm: "Process Control Block",
    simple: "The kernel's per-process record card: everything needed to pause and resume it losslessly.",
    technical:
      "The kernel data structure holding a process's PID, state, saved program counter and registers, memory-management info, open files and accounting data; the process table is the collection of all PCBs.",
    example:
      "At every context switch, the outgoing process's registers are written into its PCB and the incoming process's are loaded from its own.",
    related: ["process", "context-switch", "process-state", "pid"],
    moduleId: "processes",
    lessonRef: "processes/process-states",
    simId: "process-lab",
    refUrl: "https://github.com/mit-pdos/xv6-riscv",
    refLabel: "xv6 kernel/proc.c — a real PCB",
  },
  {
    id: "pid",
    term: "PID",
    fullForm: "Process Identifier",
    simple: "The unique number the OS gives one process for its lifetime.",
    technical:
      "A kernel-assigned integer identifying a single process; PIDs are recycled over time, so each run of the same program typically gets a different one. PID 1 is reserved for init.",
    example:
      "Your shell might be PID 2741 today and 2802 tomorrow; fork returns the child's PID to the parent.",
    related: ["process", "fork", "init", "orphan"],
    moduleId: "processes",
    lessonRef: "processes/program-vs-process",
    simId: "process-lab",
  },
  {
    id: "process-state",
    term: "Process state",
    simple: "Which situation a process is in: running, ready, blocked — or a special end state.",
    technical:
      "The lifecycle condition recorded in the PCB: ready (awaiting CPU), running (executing on a core), blocked (awaiting an event; cannot run), plus new, zombie and terminated at the edges. Transitions are driven by the scheduler, the process's own calls, and interrupts.",
    example:
      "A process waiting on a disk read is blocked; when the disk's interrupt fires it becomes ready, then running.",
    related: ["process", "pcb", "context-switch", "zombie"],
    moduleId: "processes",
    lessonRef: "processes/process-states",
    simId: "process-lab",
  },
  {
    id: "context-switch",
    term: "Context switch",
    simple: "Swapping the CPU from one process to another by saving one's state and restoring the other's.",
    technical:
      "The kernel procedure of storing the outgoing process's CPU state into its PCB and loading the incoming process's saved state from its PCB; it is pure overhead, entered on preemption, blocking calls or interrupts.",
    example:
      "Your music app and editor each get the CPU in turn; each switch preserves the exact register state so neither loses progress.",
    related: ["pcb", "process-state", "interrupt", "trap", "cpu"],
    moduleId: "processes",
    lessonRef: "processes/process-states",
    simId: "process-lab",
  },
  {
    id: "fork",
    term: "fork",
    simple: "The system call that duplicates the calling process — creating a near-identical child.",
    technical:
      "POSIX call that copies the calling process; it returns 0 in the child, the child's PID in the parent, and −1 on error. Modern kernels defer the copy with copy-on-write pages.",
    example:
      "A shell calls fork; the child then execs your command while the parent waits for it.",
    related: ["exec", "wait", "pid", "process", "zombie"],
    moduleId: "processes",
    lessonRef: "processes/fork-exec-wait",
    simId: "fork-wait-lab",
    refUrl: "https://man7.org/linux/man-pages/man2/fork.2.html",
    refLabel: "man7 fork(2)",
  },
  {
    id: "exec",
    term: "exec",
    simple: "The system call that swaps a process's program for a different one — same process, new code.",
    technical:
      "The exec family (core: execve) replaces the current process image with a new executable; PID, open files and identity persist, the old program does not, and exec returns only on failure.",
    example:
      "After fork, the shell's child calls exec to become `ls` — the shell itself never stopped existing.",
    related: ["fork", "process", "system-call", "wait"],
    moduleId: "processes",
    lessonRef: "processes/fork-exec-wait",
    simId: "fork-wait-lab",
    refUrl: "https://man7.org/linux/man-pages/man2/execve.2.html",
    refLabel: "man7 execve(2)",
  },
  {
    id: "wait",
    term: "wait",
    simple: "The parent's collection step: pause until a child finishes, then take its exit status.",
    technical:
      "POSIX call (wait/waitpid) that blocks until a child of the caller terminates, returns that child's PID and delivers its exit status, allowing the kernel to reap the child's zombie.",
    example:
      "exit(7) in a child reaches the parent as status 7 through wait() — the mechanism behind `$?` in a shell.",
    related: ["fork", "zombie", "pid", "process-state"],
    moduleId: "processes",
    lessonRef: "processes/fork-exec-wait",
    simId: "fork-wait-lab",
    refUrl: "https://man7.org/linux/man-pages/man2/wait.2.html",
    refLabel: "man7 wait(2)",
  },
  {
    id: "zombie",
    term: "Zombie",
    simple: "A process that already died but whose exit status nobody has collected yet.",
    technical:
      "A terminated process whose parent has not called wait(); the kernel retains one table entry with PID, exit status and accounting while the address space is freed. Reaped by the parent's wait, or by init after the parent dies.",
    example:
      "A `<defunct>` row in `ps` output: dead, zero CPU, waiting for its parent's wait().",
    related: ["wait", "orphan", "process-state", "init"],
    moduleId: "processes",
    lessonRef: "processes/zombies-orphans-ipc",
    simId: "fork-wait-lab",
  },
  {
    id: "orphan",
    term: "Orphan",
    simple: "A living process whose parent has died — adopted by init (PID 1).",
    technical:
      "A process whose parent terminated while it still runs; the kernel re-parents it to init, which wait()s for its adopted children so they are reaped normally on exit.",
    example:
      "A background job that outlives the shell that launched it becomes an orphan of init.",
    related: ["zombie", "init", "fork", "pid"],
    moduleId: "processes",
    lessonRef: "processes/zombies-orphans-ipc",
    simId: "fork-wait-lab",
  },
  {
    id: "init",
    term: "Init",
    simple: "The first process (PID 1) — ancestor of all others and adoptive parent of orphans.",
    technical:
      "The first user-space process started at boot (init/systemd); it runs until shutdown, reaps adopted orphaned processes, and is traditionally exempt from being killed.",
    example:
      "Kill a shell with a background job running, and the job's ppid becomes 1: init is its new parent.",
    related: ["pid", "orphan", "process", "booting"],
    moduleId: "processes",
    lessonRef: "processes/zombies-orphans-ipc",
    simId: "fork-wait-lab",
    refUrl: "https://man7.org/linux/man-pages/man2/wait.2.html",
    refLabel: "man7 wait(2) — re-parenting to init",
  },
  {
    id: "pipe",
    term: "Pipe",
    simple: "A one-way conveyor belt for bytes between two related processes, buffered by the kernel.",
    technical:
      "A unidirectional IPC channel with an in-kernel byte buffer; one process writes to the write end while another reads from the read end. Ends are typically shared with a child via fork.",
    example:
      "`prog1 | prog2` connects prog1's output to prog2's input through a pipe.",
    related: ["shared-memory", "fork", "process"],
    moduleId: "processes",
    lessonRef: "processes/zombies-orphans-ipc",
    simId: "fork-wait-lab",
    refUrl: "https://man7.org/linux/man-pages/man7/pipe.7.html",
    refLabel: "man7 pipe(7)",
  },
  {
    id: "shared-memory",
    term: "Shared memory",
    simple: "A region of RAM mapped into two processes at once — the fastest way to share data.",
    technical:
      "IPC in which the same physical pages are mapped into multiple address spaces; access requires no kernel-mediated copying but must be synchronized, since both processes read and write the same bytes.",
    example:
      "A video app and its preview worker share one image buffer instead of copying frames back and forth.",
    related: ["pipe", "process", "context-switch"],
    moduleId: "processes",
    lessonRef: "processes/zombies-orphans-ipc",
  },
];
