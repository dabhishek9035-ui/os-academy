import type { GlossaryEntry } from "@/types";

/** Glossary — module 4 (Threads & Concurrency). */
export const entries: GlossaryEntry[] = [
  {
    id: "thread",
    term: "Thread",
    simple: "One stream of execution inside a process — the thing the scheduler actually runs.",
    technical:
      "An independent execution context within a process: its own program counter, register set and stack, sharing the process's code, globals, heap and open files with all sibling threads. The process is the unit of resources; the thread is the unit of scheduling.",
    example:
      "A browser runs one thread for the UI, others for networking and page rendering — all inside one process, all touching one shared cache of data.",
    related: ["process", "pcb", "context-switch", "shared-memory", "race-condition"],
    moduleId: "threads-concurrency",
    lessonRef: "threads-concurrency/processes-vs-threads",
    simId: "race-condition-lab",
    refUrl: "https://pages.cs.wisc.edu/~remzi/OSTEP/threads-intro.pdf",
    refLabel: "OSTEP ch. 26: Concurrency and Threads",
  },
  {
    id: "race-condition",
    term: "Race condition",
    simple: "When the result depends on *when* threads run — same code, different answers.",
    technical:
      "A situation in which the correctness of a concurrent program depends on the timing or interleaving of its threads; classically two unsynchronized read-modify-write sequences whose loads both precede either store, losing updates nondeterministically.",
    example:
      "Two threads run `counter++` from 5; if both load before either stores, the counter ends at 6, not 7 — sometimes.",
    related: ["interleaving", "lost-update", "critical-section", "mutex", "atomic"],
    moduleId: "threads-concurrency",
    lessonRef: "threads-concurrency/race-conditions",
    simId: "race-condition-lab",
    refUrl: "https://pages.cs.wisc.edu/~remzi/OSTEP/threads-intro.pdf",
    refLabel: "OSTEP ch. 26: the counter race",
  },
  {
    id: "interleaving",
    term: "Interleaving",
    simple: "One possible inter-weaving of two threads' instructions in time.",
    technical:
      "An ordering of the instruction streams of concurrent threads consistent with each thread's program order; on a single CPU the scheduler picks among interleavings at instruction boundaries, and correctness must hold for ALL of them, not the ones observed in testing.",
    example:
      "`T1 load, T2 load, T1 store, T2 store` and `T1 load, T1 store, T2 load, T2 store` are two interleavings of the same code — one races, one doesn't.",
    related: ["race-condition", "thread", "atomic", "lost-update"],
    moduleId: "threads-concurrency",
    lessonRef: "threads-concurrency/race-conditions",
    simId: "race-condition-lab",
  },
  {
    id: "lost-update",
    term: "Lost update",
    simple: "An increment that ran but left no trace, because it computed from a stale value.",
    technical:
      "The effect of a racing read-modify-write: one thread's update is overwritten by another thread's store of a value computed from the same pre-update state; counted as expected − actual final value.",
    example:
      "Both threads load 5, both store 6: two increments produced +1. One lost update.",
    related: ["race-condition", "interleaving", "atomic", "mutex"],
    moduleId: "threads-concurrency",
    lessonRef: "threads-concurrency/race-conditions",
    simId: "race-condition-lab",
  },
  {
    id: "critical-section",
    term: "Critical section",
    simple: "A stretch of code touching shared data where only one thread may be at a time.",
    technical:
      "A region of code that accesses a shared resource and must execute with mutual exclusion; a correct solution must provide mutual exclusion, progress, and bounded waiting.",
    example:
      "The three instructions implementing `counter++` — load, add, store — are the critical section the mutex wraps.",
    related: ["mutual-exclusion", "mutex", "race-condition", "progress", "bounded-waiting"],
    moduleId: "threads-concurrency",
    lessonRef: "threads-concurrency/critical-sections-locks",
    simId: "race-condition-lab",
    refUrl: "https://pages.cs.wisc.edu/~remzi/OSTEP/threads-locks.pdf",
    refLabel: "OSTEP ch. 28: Locks",
  },
  {
    id: "mutual-exclusion",
    term: "Mutual exclusion",
    simple: "At most one thread inside the critical section — ever, under any timing.",
    technical:
      "The first required property of a critical-section protocol: no two threads execute in the section simultaneously; achieved by locks, atomic instructions or OS-mediated blocking rather than by goodwill.",
    example:
      "With the ledger's single pencil (the lock), two roommates can want to write at once — but only one ever is writing.",
    related: ["critical-section", "mutex", "progress", "bounded-waiting", "atomic"],
    moduleId: "threads-concurrency",
    lessonRef: "threads-concurrency/critical-sections-locks",
    simId: "race-condition-lab",
  },
  {
    id: "mutex",
    term: "Mutex",
    fullForm: "Mutual exclusion lock",
    simple: "The one-pencil rule: take the lock before touching shared data, return it after.",
    technical:
      "A lock object with lock()/unlock() operations: acquisition returns immediately when free, otherwise blocks the caller; release wakes a waiter if any. Held by at most one thread, it makes the code between acquire and release appear atomic to every other thread honoring the same lock.",
    example:
      "`pthread_mutex_lock(&m); counter++; pthread_mutex_unlock(&m);` — the counter's update can no longer interleave with anyone else's.",
    related: ["mutual-exclusion", "critical-section", "atomic", "race-condition", "context-switch"],
    moduleId: "threads-concurrency",
    lessonRef: "threads-concurrency/critical-sections-locks",
    simId: "race-condition-lab",
    refUrl: "https://man7.org/linux/man-pages/man7/pthreads.7.html",
    refLabel: "man7 pthreads(7): POSIX mutexes",
  },
  {
    id: "atomic",
    term: "Atomic",
    simple: "Indivisible: from every other thread's viewpoint, it happened all at once or not at all.",
    technical:
      "The property of an operation that executes with respect to concurrent observers as a single indivisible step — no interleaving is observable inside it; provided by hardware atomic instructions, by holding a lock over the sequence, or by OS primitives.",
    example:
      "Under the mutex, `counter++`'s three instructions act atomic: no other thread can load between its load and store.",
    related: ["mutex", "critical-section", "interleaving", "lost-update"],
    moduleId: "threads-concurrency",
    lessonRef: "threads-concurrency/critical-sections-locks",
    simId: "race-condition-lab",
  },
  {
    id: "progress",
    term: "Progress",
    simple: "If the critical section is free and someone wants in, someone gets in — no eternal vetoes.",
    technical:
      "The second required critical-section property: if the section is empty and threads wish to enter, the selection of the next entrant cannot be postponed indefinitely by threads executing outside the section; outlaws protocols where outsiders can starve an entrant.",
    example:
      "A protocol where T3 (not interested in entering) must be consulted before T1 may enter fails progress if T3 stalls.",
    related: ["critical-section", "bounded-waiting", "mutual-exclusion", "mutex"],
    moduleId: "threads-concurrency",
    lessonRef: "threads-concurrency/critical-sections-locks",
    simId: "race-condition-lab",
  },
  {
    id: "bounded-waiting",
    term: "Bounded waiting",
    simple: "A waiting thread gets in within a finite number of other threads' turns — never forever.",
    technical:
      "The third required critical-section property: there is a bound on how many times other threads may enter between one thread's request and its granted entry; rules out starvation among the waiting threads.",
    example:
      "A blocking mutex wakes a waiter on release: a waiter waits at most one holder's remaining section, not an unbounded queue-jumping stream.",
    related: ["critical-section", "progress", "mutual-exclusion", "starvation"],
    moduleId: "threads-concurrency",
    lessonRef: "threads-concurrency/critical-sections-locks",
    simId: "race-condition-lab",
  },
  {
    id: "bounded-buffer",
    term: "Bounded buffer",
    simple: "A fixed-size shared queue between producers and consumers — sleep when full or empty.",
    technical:
      "The classical producer-consumer structure: a finite slot array guarded by a mutex, with counting semaphores `empty` (free slots) and `full` (items) that block producers at capacity and consumers at zero; empty + full = capacity invariant between operations.",
    example:
      "A video decoder (producer) fills a 5-frame queue; the renderer (consumer) drains it — either side sleeps via the semaphores rather than dropping or polling.",
    related: ["thread", "atomic", "critical-section", "race-condition"],
    moduleId: "threads-concurrency",
    lessonRef: "threads-concurrency/classical-problems-tour",
    simId: "bounded-buffer-lab",
  },
  {
    id: "thread-safety",
    term: "Thread safety",
    simple: "Code that stays correct no matter how its threads interleave.",
    technical:
      "The property of a function or data structure that behaves correctly when invoked concurrently from multiple threads, typically by confining state to the stack, using atomic operations, or protecting every shared access with the same lock discipline.",
    example:
      "A function using only its locals is thread-safe for free; one that mutates a shared counter needs the mutex every time — one unmuted access spoils it.",
    related: ["race-condition", "mutex", "critical-section", "thread", "atomic"],
    moduleId: "threads-concurrency",
    lessonRef: "threads-concurrency/critical-sections-locks",
    refUrl: "https://man7.org/linux/man-pages/man7/pthreads.7.html",
    refLabel: "man7 pthreads(7): thread-safety notes",
  },
];
