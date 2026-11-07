import type { Lesson } from "@/types";

/**
 * Module 2 — Processes & Process Control.
 * From "what is a process" to fork/exec/wait and the zombie/orphan corners,
 * grounded in the process-table and fork/wait labs.
 */
export const lessons: Lesson[] = [
  {
    id: "processes/program-vs-process",
    moduleId: "processes",
    title: "A Program Is Not a Process",
    minutes: 8,
    objectives: [
      "state the difference between a program and a process, with an example of one program running as several processes",
      "identify the parts of a process: address space, registers, and the kernel's bookkeeping",
      "predict what two processes running the same program do and do not share",
    ],
    sections: [
      {
        kind: "problem",
        body: [
          "You double-click your editor's icon — once. Then, wanting two documents side by side, you double-click the same icon again. Nothing is duplicated on disk, yet two independent editors appear, each remembering its own cursor position, undo history and open file. One stored program, two live, separate 'somethings' running it.",
          "What exactly came into existence when you clicked? Not the file — it was there all along, untouched. Whatever it is, the machine can create it, destroy it, run several from one file, and keep them from interfering with each other. Pinning down that 'something' is the job of this module.",
        ],
      },
      {
        kind: "intuition",
        body: [
          "A **program** is a recipe: ink on paper, complete and precise, but perfectly inert. A **process** is one *cooking session* of that recipe: ingredients measured out (memory allocated), the cook's hands mid-step (registers and program counter), a timer running, and a name tag pinned to the chef (the process id).",
          "Two friends can cook from the same recipe card independently — same instructions, separate ingredients, separate progress. Burn one batch and the other batch is unaffected. And the recipe card itself is never changed by any of this cooking. Recipe = program; cooking session = process; the kitchen's logbook entry tracking each session = what the operating system keeps in its process table.",
        ],
      },
      {
        kind: "visual",
        simId: "process-lab",
        body: [
          "Open the Process Table Lab and create two processes running the same program. Notice each row has its own PID, its own state and its own progress — one program, two independent rows in the OS's logbook.",
        ],
      },
      {
        kind: "technical",
        body: [
          "A **program** is a passive file on disk: an executable image containing machine instructions and static data, with no life of its own. A **process** is the operating system's abstraction for a *program in execution*: the program's code loaded into an **address space** (with regions for code, global data, a heap that grows on demand, and a stack for function calls), plus the CPU state currently driving it — the **program counter** and registers — plus the kernel's bookkeeping about it.",
          "That bookkeeping lives in the **process control block (PCB)**: the kernel's record of the process's id (**PID**), its state (running, ready, waiting — next lesson), saved register values, memory information, and open files. The process table is the collection of all PCBs; it is the machine's answer to 'what is running right now?'.",
          "Keep the pairing straight: one program can back many processes (every open browser window tab process from the same binary), and a process can run different programs over its lifetime (the `exec` mechanism, two lessons ahead). Program = static instructions; process = the dynamic instance.",
        ],
      },
      {
        kind: "worked-example",
        steps: [
          {
            title: "One icon, two clicks",
            body: [
              "Click 1: the OS reads the executable from disk, builds an address space, sets the program counter to the entry point, allocates a fresh PID (say 4312), and adds a PCB to the process table. Click 2: the same steps with a different PID (say 4317).",
              "Both processes share the *same instructions* from the same file — but each has its own heap, its own stack, its own registers and its own PID. Editor 4312 can crash without editor 4317 noticing; that separation is protection (Module 0) applied per process.",
            ],
          },
          {
            title: "What they do not share",
            body: [
              "Your undo history lives in one editor's heap; the other's is elsewhere. A variable set in one process is invisible to the other, even though the code text is identical.",
              "If processes *must* exchange data, the kernel has to provide a deliberate channel — pipes or shared memory (last lesson of this module). Nothing leaks across by accident.",
            ],
          },
        ],
      },
      {
        kind: "misconceptions",
        items: [
          {
            wrong: "A process is a program that has been copied to RAM.",
            right: "Copying the image is only part of it. A process also has live CPU state (PC, registers), kernel bookkeeping (PCB, PID, state) and resources (open files). A memory copy of a program with no bookkeeping is not a process.",
          },
          {
            wrong: "The PID identifies the program — the same app always has the same PID.",
            right: "A PID identifies one *process* for its lifetime; each new run gets a new PID, even for the same program. The program's identity is its file path, not a number.",
          },
        ],
      },
      {
        kind: "knowledge-check",
        questions: [
          {
            id: "kc-m2-pvp-1",
            q: "Three terminal windows each run the same `python` command. How many programs and how many processes does that make?",
            options: [
              "One program on disk, three processes",
              "Three programs, three processes",
              "One program, one process",
              "Three programs, one process",
            ],
            answerIndex: 0,
            explanation:
              "The program is the one executable file; each running instance is a separate process with its own PID, memory and state.",
          },
          {
            id: "kc-m2-pvp-2",
            q: "Where does the operating system record a process's PID, state and saved registers?",
            options: [
              "In its process control block (PCB) in kernel memory",
              "Inside the program's executable file on disk",
              "In the CPU's cache",
              "In the graphics card's memory",
            ],
            answerIndex: 0,
            explanation:
              "The PCB is the kernel's per-process record; the collection of PCBs is the process table. The executable file is never modified by running.",
          },
        ],
      },
      {
        kind: "references",
        items: [
          {
            label: "OSTEP, Chapter 4: The Abstraction of the Process (Arpaci-Dusseau)",
            url: "https://pages.cs.wisc.edu/~remzi/OSTEP/cpu-intro.pdf",
          },
          {
            label: "Linux proc(5) man page — what the kernel records per process",
            url: "https://man7.org/linux/man-pages/man5/proc.5.html",
          },
          {
            label: "xv6-riscv: kernel/proc.c and struct proc",
            url: "https://github.com/mit-pdos/xv6-riscv",
            note: "a real PCB, small enough to read in one sitting",
          },
        ],
      },
      {
        kind: "note",
        body: [
          "The Process Table Lab represents a process's memory as a single 'progress' bar rather than a full address space, and context switches cost nothing. Real processes have distinct code/data/heap/stack regions and every switch pays the register-and-restore cost you met in the interrupt module.",
        ],
      },
    ],
  },
  {
    id: "processes/process-states",
    moduleId: "processes",
    title: "Process States & the PCB",
    minutes: 9,
    objectives: [
      "name the process states and the transitions between them, including what causes each transition",
      "explain why a blocked process must return to ready before it can run",
      "list what a PCB stores and connect it to how a context switch is possible",
    ],
    sections: [
      {
        kind: "problem",
        body: [
          "Fifty processes, one CPU core. At any instant, forty-nine of them are *not* executing — yet when you switch back to your editor mid-sentence, the cursor is exactly where you left it, mid-word, mid-thought. Something must remember, for every paused process, precisely where it was and what it was doing.",
          "And there is a subtlety: a process waiting for the disk cannot simply be restarted the moment the disk finishes — the CPU may be busy with something else. So 'waiting' and 'ready to run' must be *different conditions*, tracked separately, or the OS will try to run processes whose I/O has not finished and idle the CPU while ready ones starve. States are how the OS keeps all of this straight.",
        ],
      },
      {
        kind: "intuition",
        body: [
          "A one-blackboard classroom. One student stands at the blackboard (**running**). The rest sit at their desks, pencils ready — they could work instantly if the board freed up (**ready**). A few are out in the hallway waiting for a delivery that has not arrived; no matter how free the board is, they *cannot* work yet (**blocked**).",
          "The teacher's grade book has one page per student: seat number, what they were writing, where they stopped. The teacher swaps students on and off the board so fast it looks like everyone writes at once. Grade book = PCB; swapping students = context switching; the hallway rule = a blocked process can never go straight to the board.",
        ],
      },
      {
        kind: "visual",
        simId: "process-lab",
        body: [
          "In the Process Table Lab, watch the state column: one process running, the rest ready, and any process you send to 'block' leaves the CPU entirely until its wait ends. The lab's ready queue is exactly the desks in the analogy.",
        ],
      },
      {
        kind: "experiment",
        simId: "process-lab",
        prompts: [
          "Block the running process while another is ready. Which process gets the CPU, and which state does the blocked one show?",
          "Let the blocked process's wait finish while the other is still running. Does it go straight back to running? Note the state it passes through first — this order is the point of the lesson.",
          "Count the context switches caused by one block/resume pair. Which transitions consumed them?",
        ],
      },
      {
        kind: "technical",
        body: [
          "The classic state set: **ready** (could run; waiting for the CPU), **running** (currently executing on a core), and **blocked** (waiting for an event — I/O completion, a signal, a lock — and *unable* to run until it happens). Birth and death add **new** and **terminated**; the **zombie** state you will meet in the last lesson of this module is a special kind of terminated.",
          "The transitions are the exam-worthy part. *Ready → running*: the scheduler **dispatches** the process onto the CPU. *Running → ready*: something else takes the CPU — the quantum expires or a higher-priority process becomes runnable. *Running → blocked*: the process itself requests something that is not ready yet (a voluntary act, e.g. `read()`). *Blocked → ready*: the awaited event occurs — and the mechanism that announces it is exactly the **interrupt** from module 1 (the disk handler marks the process ready). Crucially, *blocked → running* is not a transition: an unblocked process must wait in the ready queue like everyone else.",
          "None of this works without the **PCB**: it holds the PID, current state, the saved program counter and registers (written down at every context switch), memory-management information, open files and accounting data. A context switch is: save the outgoing process's CPU state into its PCB, load the incoming process's saved state from its PCB, resume. The PCB is what makes pausing a process lossless.",
        ],
      },
      {
        kind: "misconceptions",
        items: [
          {
            wrong: "When a blocked process's I/O finishes, it resumes running immediately.",
            right: "The interrupt marks it *ready*; it then waits in the ready queue for the scheduler. Going straight from blocked to running would steal the CPU from whoever is on it.",
          },
          {
            wrong: "The CPU itself remembers each process's state between switches.",
            right: "The CPU's registers hold only the *current* process's state. Every other process's state lives in its PCB, written there by the last context switch.",
          },
        ],
      },
      {
        kind: "knowledge-check",
        questions: [
          {
            id: "kc-m2-states-1",
            q: "A running process calls read() on a file that will take milliseconds. What state change happens?",
            options: [
              "Running → blocked, until the disk interrupt makes it ready",
              "Running → ready, and it is re-queued at the front",
              "Blocked → ready immediately",
              "It stays running while waiting",
            ],
            answerIndex: 0,
            explanation:
              "The process cannot use the CPU until the data arrives, so it blocks voluntarily. When the disk raises its interrupt (module 1), the handler marks the process ready.",
          },
          {
            id: "kc-m2-states-2",
            q: "Which set of transitions is *possible* in the standard model?",
            options: [
              "Blocked → ready, then ready → running",
              "Blocked → running directly",
              "Ready → blocked",
              "Running → new",
            ],
            answerIndex: 0,
            explanation:
              "Blocked processes must queue as ready first — 'ready' means 'everything done except owning a CPU'. A ready process cannot block (it is not running to request anything), and no process returns to new.",
          },
        ],
      },
      {
        kind: "references",
        items: [
          {
            label: "OSTEP, Chapter 4: The Abstraction of the Process (state diagram and process list)",
            url: "https://pages.cs.wisc.edu/~remzi/OSTEP/cpu-intro.pdf",
          },
          {
            label: "OSTEP, Chapter 6: Limited Direct Execution (context switch mechanics)",
            url: "https://pages.cs.wisc.edu/~remzi/OSTEP/cpu-mechanisms.pdf",
          },
          {
            label: "Linux proc(5) man page — per-process state and bookkeeping in practice",
            url: "https://man7.org/linux/man-pages/man5/proc.5.html",
          },
        ],
      },
      {
        kind: "note",
        body: [
          "The lab uses one ready queue and integer time units, admits processes directly as 'ready' (skipping 'new'), and makes context switches instantaneous — real switches cost microseconds and schedulers use priority or multi-level queues (Module 3). The lab's state set also folds 'terminated' and 'zombie' into one column; the next lessons separate them.",
        ],
      },
    ],
  },
  {
    id: "processes/fork-exec-wait",
    moduleId: "processes",
    title: "fork, exec & wait",
    minutes: 10,
    objectives: [
      "predict what a program prints across a fork(), given fork's two-return-values rule",
      "count how many processes exist after a sequence of fork() calls",
      "explain the division of labor between fork, exec and wait in running a new program",
    ],
    sections: [
      {
        kind: "problem",
        body: [
          "You type `ls` in a shell and press Enter. A listing appears, and then the *same shell* is back, prompt and all, ready for the next command. Think about what had to happen: the shell was mid-program, minding its own loop; then somehow another program ran and finished; then the shell continued exactly where it had been, and even learned whether `ls` succeeded.",
          "The OS could have one grand 'spawn a program' call that creates a process, loads a new program, and returns a report. Unix instead splits the job into three smaller, oddly-shaped pieces — `fork`, `exec`, `wait` — and their combination turns out to build far more than just 'run a command': pipelines, redirection and background jobs all fall out of the same three calls. Understanding them is understanding how every process on a Unix system was born.",
        ],
      },
      {
        kind: "intuition",
        body: [
          "**fork** is photocopying yourself mid-task: an identical twin appears at the same desk, holding the same notes, at the same line of the to-do list — the only difference is what each of you finds on the instruction slip you now read ('you are the copy, continue as the child' vs 'you are the original').",
          "**exec** is the twin tearing up their copy of your script and starting a completely different job at the same desk, under the same name tag (**same PID, new program**). **wait** is the original pausing at the desk until the twin clocks out, then reading the shift report (**exit status**). Copy, swap the script, collect the report — three verbs, and you can run any program.",
        ],
      },
      {
        kind: "visual",
        simId: "fork-wait-lab",
        body: [
          "In the fork/wait lab, press fork on the running shell process and watch the table split into two rows — child and parent, both mid-program. Then exec the child and see it turn into `ls` (same PID), let it exit, and watch the parent's wait collect the exit code.",
        ],
      },
      {
        kind: "technical",
        body: [
          "`fork()` **duplicates the calling process**: the child gets a copy of the parent's address space and open files, and — the famous part — `fork()` returns **twice**: `0` in the child, the **child's new PID** in the parent (or `-1` on failure, with no child created). Code after the fork runs in both processes; programs tell them apart by testing the return value. Modern kernels make the copy cheap with **copy-on-write**: pages are shared read-only until either side writes, then copied.",
          "`exec` (the family whose core is `execve`) **replaces the current process's program image** with a new executable: same process, same PID, same open files, brand-new code and data — and it *returns only on failure*, because on success there is no old program left to return to. `exec` alone never creates a process; it is fork that creates, exec that transforms.",
          "`wait()` (or `waitpid()`) makes the parent **reap** a terminated child: the parent blocks until a child exits, receives the child's **exit status** (`exit(7)` reaches the parent as status 7), and the kernel can then discard the child's remains. Helper calls: `getpid()` (own PID) and `getppid()` (parent's PID) let processes identify themselves and their parents.",
        ],
        equations: [
          {
            expr: "Processes after n rounds of forking = 2^n  (every existing process forks once per round)",
            symbols: [
              { sym: "n", meaning: "number of fork() calls executed along the program path" },
              { sym: "2^n", meaning: "total processes that exist afterwards, including the original" },
            ],
            note: "One fork doubles the population; forks compose multiplicatively because every copy executes the same next fork.",
          },
        ],
      },
      {
        kind: "worked-example",
        steps: [
          {
            title: "Reading fork's two returns",
            body: [
              "Consider: `pid = fork();` then `if (pid == 0) print(\"child\"); else { print(\"parent\"); wait(); }`. One process reaches the fork; two leave it. In the child, `pid` is 0, so the child prints *child* and skips the else. In the parent, `pid` is the child's PID (say 4318), so the parent prints *parent* and blocks in wait().",
              "Output: one *child* line, one *parent* line — order can vary, since two independent processes now race for the CPU. When the child exits, the parent's wait() returns with the child's status, and the parent moves on. This single pattern is the skeleton of how a shell runs `ls`.",
            ],
          },
          {
            title: "Counting a fork loop",
            body: [
              "Now: `for (i = 0; i < 2; i++) fork();` starting from one process. Round 1: the original forks — 2 processes. Round 2: *both* of them execute the loop's second fork — 4 processes. 2^2 = 4, and the program never told any copy to stop copying.",
              "This is why a fork inside a loop is a classic bug: forget the return-value test and a 10-iteration loop leaves 2^10 = 1024 processes where you expected one.",
            ],
          },
        ],
      },
      {
        kind: "misconceptions",
        items: [
          {
            wrong: "fork() restarts the program from its first line in the child.",
            right: "The child continues from the fork() call itself, with a copy of the parent's memory. Starting over from line 1 would lose the parent's mid-computation state — and defeat the design.",
          },
          {
            wrong: "exec() creates a new process to run the new program.",
            right: "fork() creates processes; exec() *replaces the image of the existing* process — same PID, same open files, new code. A program that calls exec without forking never comes back.",
          },
        ],
      },
      {
        kind: "knowledge-check",
        questions: [
          {
            id: "kc-m2-fork-1",
            q: "After `pid = fork();`, what does the *child* see in `pid`?",
            options: [
              "0",
              "Its own PID",
              "The parent's PID",
              "-1",
            ],
            answerIndex: 0,
            explanation:
              "fork returns 0 in the child and the child's PID in the parent (−1 only on failure). The if/else test on the return value is how the two copies take different roles.",
          },
          {
            id: "kc-m2-fork-2",
            q: "A process calls exec and the new program loads successfully. What stayed the same?",
            options: [
              "The PID — only the program image changed",
              "Nothing; the process was destroyed and recreated",
              "The PID and the old program's variables",
              "The program image, but the PID changed",
            ],
            answerIndex: 0,
            explanation:
              "exec replaces code and data within the same process: PID and open files survive, the old program does not. On success exec does not return at all.",
          },
        ],
      },
      {
        kind: "references",
        items: [
          {
            label: "OSTEP, Chapter 5: Interlude — Process API (fork, exec, wait)",
            url: "https://pages.cs.wisc.edu/~remzi/OSTEP/cpu-api.pdf",
          },
          {
            label: "fork(2) — Linux man page",
            url: "https://man7.org/linux/man-pages/man2/fork.2.html",
            note: "exact return-value semantics and copy-on-write behavior",
          },
          {
            label: "execve(2) and wait(2) — Linux man pages",
            url: "https://man7.org/linux/man-pages/man2/execve.2.html",
            note: "see also https://man7.org/linux/man-pages/man2/wait.2.html for reaping and status macros",
          },
        ],
      },
      {
        kind: "note",
        body: [
          "The fork/wait lab keeps things observable: its fork copies only the *remaining work* rather than a real address space, and its exec just renames the process (the image swap is implied). Its wait() also waits for *all* children before the parent wakes — POSIX wait() returns as soon as *any one* child terminates.",
        ],
      },
    ],
  },
  {
    id: "processes/zombies-orphans-ipc",
    moduleId: "processes",
    title: "Zombies, Orphans & IPC",
    minutes: 10,
    objectives: [
      "define zombie and orphan states and explain why the kernel keeps a zombie briefly",
      "predict what happens to a child when its parent exits first",
      "choose between a pipe and shared memory for two processes that must exchange data",
    ],
    sections: [
      {
        kind: "problem",
        body: [
          "Two loose ends from the fork lesson. First: a child exited while its parent was busy — but a `ps` in another terminal shows the child *still listed*, marked `<defunct>`. It uses no CPU, holds no memory, and yet refuses to leave the process table. Is the system leaking?",
          "Second: a long-running parent crashes while its child is mid-job. The child's parent is gone — who collects the child's exit status when it finishes? And how *do* two processes exchange data in the first place, when everything each owns is deliberately private? These loose ends tie together everything in the module.",
        ],
      },
      {
        kind: "intuition",
        body: [
          "When a patient is discharged, the paperwork cannot vanish: the hospital keeps a short **discharge summary** until a family member collects it. A process that finished but whose status nobody has collected is a **zombie** — dead, but its one-page summary (exit status, PID, usage totals) waits in the table for the parent's wait().",
          "If the family never comes — the parent died first — the state steps in: an **adoption agency** (the init process, PID 1) becomes the guardian of every **orphan**, and collects the paperwork when the orphan finishes. And when two departments must exchange documents, the hospital runs a **pneumatic tube** between them: one-way, sealed — that is a pipe.",
        ],
      },
      {
        kind: "visual",
        simId: "fork-wait-lab",
        body: [
          "In the fork/wait lab, let a child exit while the parent is still running and watch the child's row flip to *zombie*. Then call wait on the parent and watch the row vanish. Next, kill the parent while the child lives — the child's ppid snaps to 1 as init adopts it.",
        ],
      },
      {
        kind: "experiment",
        simId: "fork-wait-lab",
        prompts: [
          "Create a child, let it exit, and leave the parent running without wait(). Read the child's state. Now reap it — what exactly disappears, and when?",
          "Kill a parent that has a live child. What is the child's new ppid, and what happens when the orphan later exits — does a zombie linger?",
          "Run a parent that exits while blocked in wait(), then let the child exit. Using the adoption rule, explain why no zombie remains.",
        ],
      },
      {
        kind: "technical",
        body: [
          "**Zombie:** a process that has terminated but whose parent has not yet waited for it. The kernel must keep *something* — the exit status, resource accounting and PID — because that is the only report the parent can collect; the address space is already gone, so a zombie costs no CPU and (almost) no memory, just one process-table entry. `wait()` reaps it. A parent that never waits leaves zombies until the parent itself dies, at which point they are adopted by init and reaped; only a broken long-lived parent leaking zombies one child at a time is a real bug.",
          "**Orphan:** a process whose parent terminated first. The kernel **re-parents it to init (PID 1)**, the ancestor every system keeps running, and init `wait()`s for its adopted children as they exit — so well-behaved orphans never pile up as zombies. This is also why PID 1 matters: the adoption agency must never itself die.",
          "**IPC** (inter-process communication) is the kernel's answer to 'everything is private by design'. A **pipe** is a unidirectional byte stream with a buffer in the kernel; `fork` lets a child inherit the pipe's ends, which is how a shell connects `prog1 | prog2`. **Shared memory** maps the *same* physical pages into two processes: the fastest IPC there is, with no copying — and, precisely because two processes now touch the same bytes, it needs explicit synchronization (Module 4's problem). Signals are the third lightweight channel: one-number notifications like 'child exited'.",
        ],
      },
      {
        kind: "misconceptions",
        items: [
          {
            wrong: "A zombie process is runaway code eating CPU and must be killed with force.",
            right: "A zombie is already dead — zero CPU, no memory beyond one table entry. You cannot 'kill' it again; the only fix is for the parent to wait() (or for the parent to die, so init reaps it).",
          },
          {
            wrong: "Orphans become zombies because nobody waits for them.",
            right: "Orphans are re-parented to init (PID 1), and init waits for its children — so orphans get reaped normally. Zombies and orphans are different situations: zombie = dead child, living inattentive parent; orphan = live child, dead parent.",
          },
        ],
      },
      {
        kind: "knowledge-check",
        questions: [
          {
            id: "kc-m2-zombie-1",
            q: "A child exited with status 3; the parent is alive but never called wait(). What does the system hold?",
            options: [
              "A zombie table entry holding the exit status, costing no CPU",
              "A fully running child that ignores its exit status",
              "Nothing — the status was discarded at exit",
              "The child is re-parented to init immediately",
            ],
            answerIndex: 0,
            explanation:
              "The kernel keeps the exit report until the parent collects it. Re-parenting happens only when the parent dies — a living parent owns its zombie.",
          },
          {
            id: "kc-m2-zombie-2",
            q: "A shell runs `prog1 | prog2`. What is the pipe doing?",
            options: [
              "Carrying bytes one way from prog1's output into prog2's input via the kernel",
              "Letting both programs write each other's memory directly",
              "Copying prog1's entire output to disk first",
              "Sending signals instead of data",
            ],
            answerIndex: 0,
            explanation:
              "A pipe is a kernel-buffered, unidirectional byte stream; fork shares its ends with the children. Direct memory sharing would defeat protection — that is shared memory's (supervised) job.",
          },
        ],
      },
      {
        kind: "references",
        items: [
          {
            label: "OSTEP, Chapter 5: Process API (wait and the zombie/orphan rules)",
            url: "https://pages.cs.wisc.edu/~remzi/OSTEP/cpu-api.pdf",
          },
          {
            label: "wait(2) — Linux man page (zombies, adoption by init, status macros)",
            url: "https://man7.org/linux/man-pages/man2/wait.2.html",
          },
          {
            label: "POSIX.1-2024 (Open Group Base Specifications, Issue 8)",
            url: "https://pubs.opengroup.org/onlinepubs/9799919799/",
            note: "the standard defining fork, exec, wait and pipe semantics",
          },
        ],
      },
      {
        kind: "note",
        body: [
          "The lab makes two teaching simplifications: a zombie stays visible for one tick before reaping so you can see it, and its wait() blocks until *all* children are done (POSIX wait() returns on the *first* child to exit). Its kill action also re-parents orphans to PID 1 unconditionally, even in scenarios where a real init would have custom reapers.",
        ],
      },
    ],
  },
];
