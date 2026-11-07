import type { Lesson } from "@/types";

/**
 * Module 4 — Threads & Concurrency.
 * Sharing a process's memory: the superpower, the race it invites, and the
 * locks that tame it. Stepping one instruction at a time is the method here.
 */
export const lessons: Lesson[] = [
  {
    id: "threads-concurrency/processes-vs-threads",
    moduleId: "threads-concurrency",
    title: "Processes vs. Threads",
    minutes: 8,
    objectives: [
      "state exactly what two threads of one process share and what they keep private",
      "explain why thread creation and switching are cheaper than a process's",
      "predict why shared memory makes coordination both easier and riskier",
    ],
    sections: [
      {
        kind: "problem",
        body: [
          "Module 2's processes are stubbornly independent: separate address spaces, separate everything. That isolation is wonderful for safety — and terrible when you actually *want* two active things to cooperate. A word processor wants one thread accepting keystrokes while another re-paginates the document and a third checks spelling: same document, same memory, three streams of execution.",
          "Fork three full processes and each gets its own *copy* — changes never meet without plumbing (module 2's pipes or shared memory). Keep one process and find a way to run several instruction streams *inside* it, and the document is just… there, shared. The OS answer is the **thread**. But before we celebrate: if two execution streams can touch the same bytes at the same time, what happens when they touch the *same counter*? Hold that thought — it is the next two lessons.",
        ],
      },
      {
        kind: "intuition",
        body: [
          "A process is a whole apartment: its own kitchen, its own bathroom, nobody shares. Threads are **roommates in one apartment**: they share the kitchen (the heap), the living room (global variables), the front door (open files) — but each has a private bedroom (their own **stack** and scratchpad of registers). Two roommates cooking in one kitchen is efficient — one fridge, one stove — until both reach for the last egg at the same moment.",
          "That is the whole trade in one image. Sharing makes cooperation free (no driving groceries across town = no copying between processes) and makes collision possible (the egg = any shared variable). Processes never fight over the egg because they each bought one; threads must take turns.",
        ],
      },
      {
        kind: "visual",
        simId: "race-condition-lab",
        body: [
          "The **Race Condition Stepper** shows the shared apartment in miniature: two threads, `T1` and `T2`, both incrementing one shared counter, each with its own instruction pointer. Step both threads and watch each one's *private* registers while the *shared* counter cell sits between them.",
          "Run it a few times without stepping carefully — the final counter value may come out different between runs. Nothing about the code changed; only the interleaving did. That difference is the subject of this module.",
        ],
      },
      {
        kind: "technical",
        body: [
          "A **thread** is an independent stream of execution *within* a process: the unit the scheduler actually runs (some textbooks call the process the unit of *resources* and the thread the unit of *scheduling*). Every thread has its own program counter, register set and **stack** — the private bedroom. Every thread in the process shares the same address space: code, global/static data, **heap**, and open files — the shared rooms. A **multithreaded process** has one PCB (module 2) and one address space but several stacks and several saved register contexts.",
          "The sharing has practical consequences. Thread creation is cheaper: no new address space to build, just a stack and a context. Thread context switching is cheaper: same page tables, same memory mappings — the address-space switch (and its cache-filling costs) simply does not happen. And communication is free: one thread writes the heap, another reads it, no kernel plumbing needed.",
          "Each thread blocks independently too: one thread can wait on a disk read while its siblings keep the process runnable — which is why real servers are thread-per-connection. The cost of all this convenience is a new failure mode that processes cannot have: two threads interleaving on one shared variable. That failure needs its own vocabulary, built next lesson.",
        ],
        equations: [
          {
            expr: "Thread switch cost < Process switch cost",
            symbols: [
              { sym: "Thread switch", meaning: "save/restore one thread's registers and stack pointer" },
              {
                sym: "Process switch",
                meaning: "all of that, plus swap address space: page tables, TLB flush, cache refill",
              },
            ],
            note: "The difference is the address space. Same apartment (no move) versus different apartment (everything re-fetched) — the TLB and cache effects dominate in real CPUs.",
          },
        ],
      },
      {
        kind: "worked-example",
        steps: [
          {
            title: "What actually moves on a thread switch",
            body: [
              "Thread T1 is executing line 40 of a spell-checker when the timer interrupt fires and the scheduler picks T2. Saved: T1's program counter (line 41), its registers, its stack pointer. Loaded: T2's saved set from last time.",
              "Notice what did *not* happen: no page table changed, no TLB flush, no file descriptors swapped — `document_buffer` at heap address X is heap address X for both threads. T2 reads a word from that buffer and checks it. The switch was cheap *because* the memory is shared.",
            ],
          },
          {
            title: "The same scenario with three processes",
            body: [
              "fork() three copies of the editor instead: each has its own address space, so the document must exist three times, and every keystroke must be shipped to the paginator through a pipe or a shared segment — kernel copies, syscalls, plumbing.",
              "Shared memory (module 2's glossary) can re-create sharing between processes — but then those processes face *exactly* the coordination problem threads have natively. The apartment walls move; the egg problem stays.",
            ],
          },
        ],
      },
      {
        kind: "misconceptions",
        items: [
          {
            wrong: "Threads share everything in the process — two threads even share a call stack.",
            right: "Each thread has its own stack and its own registers/PC; calling a function in T1 does not touch T2's stack frames. What they share is the address space's *common* regions: code, globals, heap and open files.",
          },
          {
            wrong: "Multithreading always makes a program faster.",
            right: "Threads help when work is genuinely parallel or while one thread blocks. Two threads pounding one shared counter need coordination, add contention, and can even *slow* each other — and on a single CPU (like this course's) they only interleave, they never run truly at once.",
          },
        ],
      },
      {
        kind: "knowledge-check",
        questions: [
          {
            id: "kc-m4-pvt-1",
            q: "Two threads of one process each call a function with a local variable `total`. Do they interfere?",
            options: [
              "No — each thread has its own stack, so each has its own `total`",
              "Yes — all variables in a process are shared between threads",
              "Only if the function was declared static",
              "Only when the threads run on different CPU cores",
            ],
            answerIndex: 0,
            explanation:
              "Locals live on the thread's private stack. Shared memory means the *common* regions: globals, heap, code. A local only becomes shared if someone deliberately moves it there (e.g. allocates it on the heap).",
          },
          {
            id: "kc-m4-pvt-2",
            q: "Why is a thread-to-thread switch cheaper than a process-to-process switch?",
            options: [
              "The address space is unchanged — no page-table or TLB work",
              "Threads have no registers to save",
              "The OS skips saving the program counter",
              "Threads never block, so switches are rarer",
            ],
            answerIndex: 0,
            explanation:
              "Same apartment, no move: page tables stay, the TLB stays warm, caches stay useful. Registers and stack pointer are saved either way — that part is identical.",
          },
        ],
      },
      {
        kind: "references",
        items: [
          {
            label: "OSTEP, Chapter 26: Concurrency and Threads",
            url: "https://pages.cs.wisc.edu/~remzi/OSTEP/threads-intro.pdf",
            note: "the shared/private split and the first race example — this lesson's source text",
          },
          {
            label: "man7: pthreads(7) — POSIX threads",
            url: "https://man7.org/linux/man-pages/man7/pthreads.7.html",
            note: "what is per-thread vs per-process in the real POSIX API, in one table",
          },
        ],
      },
      {
        kind: "note",
        body: [
          "The Race Condition Stepper runs both threads on one CPU and switches only between whole instructions — so 'at the same time' always means 'interleaved'. Real multicores run threads truly simultaneously, which creates the same hazards plus memory-model subtleties (store buffers, visibility ordering) the lab does not model. The lab also shows one counter; real races involve whole data structures.",
        ],
      },
    ],
  },
  {
    id: "threads-concurrency/race-conditions",
    moduleId: "threads-concurrency",
    title: "Race Conditions",
    minutes: 9,
    objectives: [
      "expand `counter++` into its load/add/store instruction sequence",
      "trace an interleaving that loses an update and predict the final value",
      "explain why the bug is nondeterministic and therefore hard to test away",
    ],
    sections: [
      {
        kind: "problem",
        body: [
          "Two threads share one counter, starting at 5. Each thread runs exactly one line of code: `counter++`. Two increments, so the answer is obviously 7 — it says so on the whiteboard, it says so in code review. Then the field report comes in: sometimes the counter ends at 6. Not always. Not reproducible in the debugger. The code is one line. What is going on?",
          "The answer is the most important surprise in this module: `counter++` is *not one operation*. It is three, and between them the CPU is free to run the other thread. Whether the answer is 7 or 6 depends on an ordering no one chose — a **race condition**: the result depends on the timing of interleaved executions. Races cannot be fixed by better handwriting of the same code; they need a new tool (lesson 3).",
        ],
      },
      {
        kind: "intuition",
        body: [
          "Two roommates (last lesson's threads) share one bank ledger. The rule for adding a deposit: read the balance, add your amount *in your head*, write the new total back. You read 500, start adding; your roommate reads the same page — 500 — adds theirs; you write 510; they write 510. Two deposits of 10 each, and the ledger says 510. The ledger never lied about any single entry; the problem is that the read-modify-write was **interruptible**, and both did it on the same stale read.",
          "Now notice the truly nasty part: if the roommate had walked in ten seconds later, the ledger would have come out right. The bug appears only when the two read-modify-writes *overlap* — so it hides in every demo and detonates in production. That unpredictability is not a side effect of race conditions; it is their defining feature.",
        ],
      },
      {
        kind: "visual",
        simId: "race-condition-lab",
        body: [
          "The **Race Condition Stepper** breaks each increment into its three machine instructions — `load` (counter → register), `add` (register + 1), `store` (register → counter) — and lets you interleave them freely between T1 and T2. The shared counter and each thread's private register are always visible.",
          "Step the losing interleave: T1 load, T2 load (both got the old value!), T1 add, T1 store, T2 add, T2 store. Watch both stores write the *same* number: one increment walked straight through the other. Then flip to mutex mode and run the same interleaving attempt — the stepper will not let you interleave inside an increment anymore.",
        ],
      },
      {
        kind: "technical",
        body: [
          "A **race condition** (or data race, when it is two unsynchronized accesses to the same variable) occurs when the *correctness* of the result depends on the timing or interleaving of concurrent executions. The instruction-level anatomy is the heart of it: `counter++` compiles to **load** counter into a register, **add** 1 to the register, **store** the register back to counter. The register is per-thread (private bedroom); the counter is shared (kitchen). An interrupt, a scheduler decision, or another core can slip in between any two of those three instructions.",
          "If both threads complete load before either completes store, both compute from the same stale value and both store the same result: **one update is lost**, as if it never ran. Run N interleavings of the same two-increment code and you can get N−1 correct-looking outcomes and 1 broken one — which is why races survive testing: the *probability* of the bad interleave is low, but under a loaded server running millions of increments per second, 'low' happens constantly.",
          "Two properties of races matter for what comes next. First, they are **nondeterministic**: same code, same inputs, different answers depending on scheduling — so print-debugging tends to 'fix' them by slowing the interleaving apart. Second, the granularity is instructions, not source lines: the bug lives between load and store, invisible in the source code. The cure must make the read-modify-write **indivisible** — that is mutual exclusion, next lesson.",
        ],
        equations: [
          {
            expr: "Lost updates = expected − actual = (n₁ + n₂) − final",
            symbols: [
              { sym: "n₁", meaning: "increments performed by thread 1" },
              { sym: "n₂", meaning: "increments performed by thread 2" },
              { sym: "final", meaning: "the observed final counter value" },
            ],
            note: "Each lost update is a pair of loads on the same stale value. With a mutex, lost = 0 for any interleaving — that is the promise being sold next lesson.",
          },
        ],
      },
      {
        kind: "worked-example",
        steps: [
          {
            title: "The losing interleave, instruction by instruction",
            body: [
              "counter = 5. T1: `load` → register₁ = 5. Now the scheduler switches to T2: `load` → register₂ = 5 (the store hasn't happened; memory still says 5).",
              "T1: `add` (register₁ = 6), `store` → counter = 6. T2: `add` (register₂ = 6), `store` → counter = 6. Two increments ran to completion; the counter went up by one. Expected 7, observed 6 — one lost update, caused by T2's load happening *before* T1's store.",
            ],
          },
          {
            title: "The winning interleave (same code!)",
            body: [
              "counter = 5. T1: load 5, add, store → 6. *Then* T2 runs: load 6, add, store → 7. No overlap between one thread's load and the other's store, and the answer is 7.",
              "Same code, same input, both runs 'valid' — only the interleaving differed. A race condition is a property of the *set* of possible interleavings, not of one execution. The next lesson makes the bad interleavings impossible instead of unlikely.",
            ],
          },
        ],
      },
      {
        kind: "misconceptions",
        items: [
          {
            wrong: "`counter++` is one line of C, so it executes atomically.",
            right: "It compiles to load, add, store — three instructions with exploitable gaps between them. One line of source says nothing about atomicity; only hardware atomic instructions or locks (lesson 3) provide that.",
          },
          {
            wrong: "If a race exists, a test suite will find it — we've never seen it fail in testing.",
            right: "Races are timing-dependent: the bad interleave may be rare, and a debugger or logger slows execution enough to hide it. Absence of observed failure is not evidence of absence; the interleaving analysis (and the lab) is how you find them.",
          },
        ],
      },
      {
        kind: "knowledge-check",
        questions: [
          {
            id: "kc-m4-race-1",
            q: "What is the minimum overlap that loses an update when two threads each do `counter++`?",
            options: [
              "Both threads load the old value before either stores",
              "Both threads run their add at the same instant",
              "The two stores happen in the same millisecond",
              "The scheduler switches threads exactly once",
            ],
            answerIndex: 0,
            explanation:
              "The loss is caused by two loads of the same stale value; once both hold the old value in private registers, both stores write the same result. Any interleaving where T2 loads before T1 stores loses T1's update (or vice versa).",
          },
          {
            id: "kc-m4-race-2",
            q: "Two threads each increment a shared counter 1000 times, with no locking. What outcome range is possible?",
            options: [
              "Anywhere from 1000 to 2000 — every update could be lost",
              "Exactly 2000 — increments are atomic in practice",
              "Exactly 1000 — all updates are always lost",
              "More than 2000 — races can double-count",
            ],
            answerIndex: 0,
            explanation:
              "Each increment independently either lands (counter +1) or is lost (+0). All landing → 2000; all lost in pairs → as low as 1000. Races can only *lose* updates here, never invent them — the add itself always happens.",
          },
        ],
      },
      {
        kind: "references",
        items: [
          {
            label: "OSTEP, Chapter 26: Concurrency and Threads — the counter race",
            url: "https://pages.cs.wisc.edu/~remzi/OSTEP/threads-intro.pdf",
            note: "the same load/add/store dissection with the T1/T2 trace tables",
          },
          {
            label: "OSTEP, Chapter 28: Locks",
            url: "https://pages.cs.wisc.edu/~remzi/OSTEP/threads-locks.pdf",
            note: "the cure — read after this lesson to see where the fix is going",
          },
          {
            label: "man7: pthreads(7)",
            url: "https://man7.org/linux/man-pages/man7/pthreads.7.html",
            note: "per-thread state vs shared state in POSIX, plus thread-safety pitfalls",
          },
        ],
      },
      {
        kind: "note",
        body: [
          "The stepper executes one instruction at a time on one CPU, with switches only at instruction boundaries and no compiler optimizations. Real compilers may reorder or fuse instructions within a thread (subject to the memory model), real multicore caches delay visibility of stores, and `counter++` under optimization may not even touch memory — the lab keeps all of that out so the essential interleaving hazard stays visible.",
        ],
      },
    ],
  },
  {
    id: "threads-concurrency/critical-sections-locks",
    moduleId: "threads-concurrency",
    title: "Critical Sections & Locks",
    minutes: 9,
    objectives: [
      "define a critical section and the three properties a correct solution must have",
      "use a mutex to make a read-modify-write sequence atomic",
      "predict what a waiting thread does when a lock is held",
    ],
    sections: [
      {
        kind: "problem",
        body: [
          "Last lesson ended with a precise diagnosis: the counter broke because two threads interleaved *inside* a three-instruction read-modify-write. The fix, then, has a precise shape too: mark that stretch of code as special, and guarantee that **at most one thread is inside it at a time** — ever, under any interleaving, on any number of cores. The stretch is a **critical section**; the guarantee is **mutual exclusion**.",
          "But a guarantee with no fine print is worth nothing. Must a thread ever *wait forever* for the section? If two threads both want in, can they livelock, each politely yielding to the other for eternity? Can the OS actually implement 'at most one' without itself racing? This lesson states the contract properly — mutual exclusion, progress, bounded waiting — and introduces the tool that (in one form or another) every real system uses to honor it: the lock.",
        ],
      },
      {
        kind: "intuition",
        body: [
          "Back to the shared ledger. The fix the bank actually uses: the ledger comes with **one pencil**. The rule: to touch the ledger, take the pencil; write your read-modify-write; put the pencil back. No pencil? Wait. Now the update cannot be interrupted mid-entry — whoever holds the pencil has the whole ledger to themselves for the operation. The pencil is the **lock**; taking it is `lock()`, putting it back is `unlock()`, and the code between is the critical section.",
          "Notice what the pencil does *not* do: it does not make the threads faster, and it does not stop two threads from *wanting* the ledger at once. It serializes the touching, not the wanting. Threads outside the section still run freely in parallel — a point that matters enormously for performance and is easy to forget.",
        ],
      },
      {
        kind: "visual",
        simId: "race-condition-lab",
        body: [
          "In the **Race Condition Stepper**, switch to **mutex mode**: each thread must now grab the lock before its load-add-store and release it after. Try to re-create last lesson's losing interleave — T2's `load` while T1 is mid-increment — and watch the stepper refuse: T2 blocks at `lock()` until T1's `store` and `unlock()` complete.",
          "Run both threads to completion from many different starting interleavings. The final value is now 2 every time, regardless of timing. That 'every time' is the entire point of mutual exclusion.",
        ],
      },
      {
        kind: "technical",
        body: [
          "A **critical section** is a stretch of code that accesses a shared resource (variable, structure, device) and must not be executed by more than one thread at once. A correct mutual-exclusion solution must satisfy three properties, worth memorizing as a checklist. **Mutual exclusion**: at most one thread inside the critical section at any time. **Progress**: if the section is free and threads want in, one of them gets in — the decision cannot be postponed forever by threads outside (this outlaws 'solutions' where two threads politely defer to each other indefinitely). **Bounded waiting**: a thread that wants in gets in within a finite number of other threads' turns — no starvation among the waiting threads.",
          "A **mutex** (mutual exclusion lock) is the standard OS/library tool: a lock object with two operations — `lock()` (acquire: return immediately if free, otherwise block the caller) and `unlock()` (release: if any thread is blocked on it, wake one). The discipline is mechanical: `lock()` before the shared access, `unlock()` after, nothing in between that can be skipped — including `return` statements and error paths, which is why languages grow RAII/defer/`with` constructs to release on every exit path.",
          "What the lock buys is **atomicity from the outside**: the three-instruction read-modify-write becomes, to every other thread, one indivisible step. Two deeper points to carry forward. First, atomicity is a *contract between threads using the same lock*: any thread that touches the shared counter *without* taking that lock re-opens the race — one undisciplined reader spoils it for everyone. Second, locking is deliberately coarse here; real systems trade lock granularity against contention, and holding a lock too long serializes threads that could have run in parallel.",
          "And one preview of a trap: a thread that acquires the lock and then, on some path, never releases it will block every other thread that ever touches the section — a bug next lesson's producer-consumer tour will dress in different clothes.",
        ],
        equations: [
          {
            expr: "With a mutex: lost updates = 0 for every interleaving",
            symbols: [
              { sym: "lost updates", meaning: "expected total increments minus final value (module 4, race lesson)" },
            ],
            note: "Mutual exclusion rules out the load-before-store overlap that loses updates; correctness no longer depends on timing.",
          },
          {
            expr: "Blocked time of a waiting thread = remaining critical-section time",
            symbols: [
              { sym: "Blocked time", meaning: "how long a thread waits at lock()" },
              { sym: "remaining critical-section time", meaning: "how much longer the current holder keeps the lock" },
            ],
            note: "This is why critical sections should be short: every other thread's wait is exactly as long as the holder lingers.",
          },
        ],
      },
      {
        kind: "worked-example",
        steps: [
          {
            title: "The same race, under a mutex",
            body: [
              "counter = 5. T1 runs `lock()` — free, so it acquires — then load 5, add, store → 6, then `unlock()`. Suppose T2 called `lock()` *before* T1 acquired: it found the lock held and blocked; it resumes only when T1 unlocks, then loads 6 (fresh!), adds, stores 7, unlocks.",
              "Suppose instead T2 calls `lock()` after T1 released everything: it acquires immediately and still loads 6. Either way the interleaving that used to lose the update is now impossible: T2's load cannot happen between T1's load and store, because the lock is held for that whole stretch.",
            ],
          },
          {
            title: "Checklist the fix against the three properties",
            body: [
              "Mutual exclusion: the lock is held by at most one thread, so at most one thread is between `lock()` and `unlock()` — yes. Progress: if the section is free, `lock()` grants it immediately to whoever asks — no outside thread can veto it — yes.",
              "Bounded waiting: with a standard blocking mutex, a waiting thread is woken when the holder releases; a waiter waits at most one holder's remaining section, not an unbounded number of barges-in. (Fancier locks — ticket locks, or the fair queuing in some libraries — make the ordering guarantee explicit; that nuance belongs to module 8.)",
            ],
          },
        ],
      },
      {
        kind: "misconceptions",
        items: [
          {
            wrong: "A lock makes the code inside it run atomically on the CPU — the instructions fuse together.",
            right: "The instructions are as interruptible as ever. The lock guarantees no *other thread that honors the same lock* runs that region concurrently — atomicity is a mutual agreement, not a hardware change.",
          },
          {
            wrong: "Once I lock the counter, everything in my program is thread-safe.",
            right: "Every access to that shared data — including reads and writes in other functions — must use the *same* lock. One unmuted writer re-opens the race, and unrelated data structures still need their own protection.",
          },
        ],
      },
      {
        kind: "knowledge-check",
        questions: [
          {
            id: "kc-m4-lock-1",
            q: "'No thread waiting for a critical section waits forever' states which required property?",
            options: [
              "Bounded waiting",
              "Mutual exclusion",
              "Progress",
              "Atomicity",
            ],
            answerIndex: 0,
            explanation:
              "Bounded waiting = a waiter gets in within finitely many turns. Mutual exclusion is 'at most one inside'; progress is 'a free section is not refused when someone wants it'.",
          },
          {
            id: "kc-m4-lock-2",
            q: "T1 holds the lock. T2 calls `lock()` on the same mutex. What does T2 do?",
            options: [
              "Blocks — put to sleep until T1 unlocks and the kernel wakes it",
              "Spins past the lock into the critical section anyway",
              "Unlocks T1's lock and proceeds",
              "Crashes — locking a held mutex is an error",
            ],
            answerIndex: 0,
            explanation:
              "A standard mutex blocks the second comer: it sleeps, costing no CPU, until the holder releases. (A *spinlock* would busy-wait instead — same contract, different waiting style; module 8 compares them.)",
          },
        ],
      },
      {
        kind: "references",
        items: [
          {
            label: "OSTEP, Chapter 28: Locks",
            url: "https://pages.cs.wisc.edu/~remzi/OSTEP/threads-locks.pdf",
            note: "the three properties, mutex semantics, and how locks are actually built from hardware atomics",
          },
          {
            label: "OSTEP, Chapter 26: Concurrency and Threads",
            url: "https://pages.cs.wisc.edu/~remzi/OSTEP/threads-intro.pdf",
          },
          {
            label: "man7: pthreads(7) — pthread_mutex_lock and friends",
            url: "https://man7.org/linux/man-pages/man7/pthreads.7.html",
            note: "the POSIX contract for mutexes you will actually call",
          },
        ],
      },
      {
        kind: "note",
        body: [
          "The lab's mutex mode models a fair blocking mutex with instant wakeups and zero acquisition overhead; real mutexes have futex/kernel costs, may spin briefly before sleeping, and do not always wake waiters in FIFO order. The lab also serializes only the increment — real critical sections can wrap whole data structures, and misplaced `unlock()` calls (which the lab cannot express) are a real-world hazard.",
        ],
      },
    ],
  },
  {
    id: "threads-concurrency/classical-problems-tour",
    moduleId: "threads-concurrency",
    title: "A Tour of Classic Concurrency Bugs",
    minutes: 9,
    objectives: [
      "state the producer-consumer problem and what the empty/full/mutex semaphores each track",
      "predict blocking behavior when the buffer fills or empties",
      "recognize the classics — readers-writers, dining philosophers — as variations on waiting and ordering",
    ],
    sections: [
      {
        kind: "problem",
        body: [
          "A mutex over one counter was the toy. The real classic is one step harder: a **producer** thread generating data (network packets, keystrokes, video frames) and a **consumer** thread processing it, connected by a **bounded buffer** — a fixed-size queue in shared memory. Two new requirements appear that a single mutex cannot express: the producer must **sleep when the buffer is full** (nowhere to put the next item) and the consumer must **sleep when it is empty** (nothing to take).",
          "Solve it naively and you meet the two canonical bugs: forget the fullness check and the producer overwrites items; use the wrong order of 'check' and 'sleep' and a wakeup can get *lost* — both threads asleep forever over a half-empty buffer. The correct solution, due to Dijkstra, coordinates with counting tools called **semaphores** — and it is the doorway to this module's tour of the classical problems.",
        ],
      },
      {
        kind: "intuition",
        body: [
          "A sushi bar with a fixed conveyor belt: the **chef** (producer) places plates on; the **diner** (consumer) takes plates off. The belt holds, say, 5 plates. If the belt is full, the chef must stand aside — placing a plate on a full belt means knocking one off. If the belt is empty, the diner must wait — grabbing at empty space wastes a turn. The two need a shared, *counting* sense of the belt: how many free slots? how many plates?",
          "That counting sense is exactly the two semaphores: **empty** (free slots remaining) and **full** (plates present). A third, **mutex**, is the one-pencil rule for touching the belt itself. Producer: wait for a free slot (empty), take the belt lock, place the plate, release, announce one more plate (full). Consumer: wait for a plate (full), take the belt lock, take the plate, release, announce one more free slot (empty). Everyone sleeps when they should and no plate is ever clobbered.",
        ],
      },
      {
        kind: "visual",
        simId: "bounded-buffer-lab",
        body: [
          "The **Bounded Buffer Lab** renders the sushi bar directly: producers and consumers working on a fixed-size buffer, with the three semaphore values — **empty**, **full**, **mutex** — displayed live. Start with a few producers and one consumer and watch `full` climb while `empty` falls with every deposit.",
          "Fill the buffer completely and step one more produce attempt: the producer blocks *before* touching the buffer and `empty` reads 0. Drain it with the consumer and watch the reverse. The semaphore readouts are the state of the coordination — learn to read them and you can predict every blocking event before it happens.",
        ],
      },
      {
        kind: "experiment",
        simId: "bounded-buffer-lab",
        prompts: [
          "With capacity 5 and 3 items in the buffer, read all three semaphores and write them down (empty, full, mutex). Then run exactly one produce and one consume — what are the values afterwards, and why did they return to the start?",
          "Pause all consumers and let producers fill the buffer. What is `empty` when the next producer blocks? What would break if that producer were allowed through anyway?",
          "Add more consumers than producers and watch `full` hover at 0: consumers block at the 'wait for plate' step. Which semaphore are they waiting on, and what value change wakes them?",
        ],
        body: [
          "Reading the lab: `mutex` should always return to 1 between operations — it is a lock, not a counter of contents. If you ever see `mutex` stuck below 1 with threads waiting, you are watching a lock leak: the preview of deadlock in module 7.",
        ],
      },
      {
        kind: "technical",
        body: [
          "A **semaphore** is an integer-valued coordination object with two atomic operations: **wait/P** (decrement; if the value would go negative, block) and **signal/V** (increment; if anyone is blocked, wake one). A semaphore initialized to 1 acts as a mutex; initialized to N it counts N available units — which is precisely what the bounded buffer needs twice over: `empty` starts at the buffer capacity (free slots) and `full` starts at 0 (items present), while `mutex` guards the buffer's internal pointers during each deposit/withdraw.",
          "The producer's sequence — wait(`empty`), wait(`mutex`), deposit, signal(`mutex`), signal(`full`) — and the consumer's mirror image — wait(`full`), wait(`mutex`), withdraw, signal(`mutex`), signal(`empty`) — solve the problem with all three properties from last lesson intact. The *order* of the waits is load-bearing: wait on the counting semaphore *before* the mutex, or a producer holding `mutex` while blocked on a full buffer will deadlock the consumer trying to free a slot.",
          "The wider tour, at recognition depth: **readers-writers** splits access into many-concurrent-readers versus exclusive-writers, needing reader counts and writer-priority policy decisions (the same mutex-plus-counting shape). **Dining philosophers** seats N philosophers who each need two shared forks — and its tragedy, **circular wait** (everyone holds one fork, waits for the neighbor's), is the canonical preview of *deadlock*, module 7's whole subject. And the **lost wakeup** bug — sleeping on 'buffer not full' when it *just* became not-full — is why the atomicity of wait/signal matters, not just the counting.",
        ],
        equations: [
          {
            expr: "empty + full = capacity (always, between operations)",
            symbols: [
              { sym: "empty", meaning: "semaphore counting free buffer slots" },
              { sym: "full", meaning: "semaphore counting deposited items" },
              { sym: "capacity", meaning: "the buffer's fixed size" },
            ],
            note: "A useful invariant for checking any bounded-buffer trace by hand: every slot is either free (empty) or occupied (full). mutex is not part of the sum — it is the lock, normally 1.",
          },
          {
            expr: "Producer blocks when empty = 0; consumer blocks when full = 0",
            symbols: [
              { sym: "blocks", meaning: "the thread sleeps until the other side signals" },
            ],
            note: "Blocking is the *feature* — it converts 'buffer full/empty' from an error into a natural pacing mechanism between unequal producers and consumers.",
          },
        ],
      },
      {
        kind: "misconceptions",
        items: [
          {
            wrong: "The `full` and `empty` semaphores are just two more mutexes — three locks guarding one buffer.",
            right: "`mutex` is a lock (0 or 1, held briefly); `empty` and `full` are *counters* of resources (slots and items) that threads block on when the count hits zero. Counting semaphores coordinate *availability*; mutexes serialize *access*.",
          },
          {
            wrong: "If the buffer is full, the producer should just overwrite the oldest item — simpler than blocking.",
            right: "Sometimes that is a legitimate design (live video frames), but it is a *policy change*: data is dropped. The classical bounded buffer guarantees no item is lost and no item is read twice — blocking is how it keeps that guarantee under an unequal producer/consumer rates.",
          },
        ],
      },
      {
        kind: "knowledge-check",
        questions: [
          {
            id: "kc-m4-tour-1",
            q: "Buffer capacity 5, currently 3 items. A producer completes one deposit. What are `empty` and `full` afterwards?",
            options: [
              "empty = 1, full = 4",
              "empty = 2, full = 3 — unchanged",
              "empty = 4, full = 1",
              "empty = 0, full = 5",
            ],
            answerIndex: 0,
            explanation:
              "The deposit converts one free slot into one item: empty 2→1, full 3→4. Their sum stays 5 — the capacity invariant.",
          },
          {
            id: "kc-m4-tour-2",
            q: "A producer blocks on wait(empty). The consumer then withdraws one item and signals empty. What happens to the producer?",
            options: [
              "It is woken and completes its deposit",
              "It stays blocked — empty is only 1, not enough",
              "It overwrites the item the consumer just took",
              "It must be restarted by the application",
            ],
            answerIndex: 0,
            explanation:
              "signal(empty) raises the count 0→1, which wakes one waiter — the blocked producer — which then re-checks and deposits. That wake-on-signal is the mechanism that makes unequal rates safe.",
          },
        ],
      },
      {
        kind: "references",
        items: [
          {
            label: "OSTEP, Chapter 31: Semaphores (producer-consumer with empty/full/mutex)",
            url: "https://pages.cs.wisc.edu/~remzi/OSTEP/threads-sema.pdf",
            note: "the full solution and the wake-up-order bug that motivates the wait ordering",
          },
          {
            label: "OSTEP, Chapter 26: Concurrency and Threads",
            url: "https://pages.cs.wisc.edu/~remzi/OSTEP/threads-intro.pdf",
          },
          {
            label: "man7: pthreads(7)",
            url: "https://man7.org/linux/man-pages/man7/pthreads.7.html",
          },
        ],
      },
      {
        kind: "note",
        body: [
          "The lab shows semaphores as simple visible counters with instant, ordered wakeups; real semaphores live in the kernel or library, may wake waiters in unspecified order, and admit subtle variants (binary vs counting, priority policies). The lab's buffer is a single slot-array with two pointers; it does not model the circular-wraparound arithmetic or the lost-wakeup bug (its wait/signal are atomic), so the ordering pitfall above must be learned from the text — not demonstrated in the lab.",
        ],
      },
    ],
  },
];
