import type { GlossaryEntry } from "@/types";

/**
 * Glossary — module 8 (Synchronization Deep Dive).
 * Cross-links: "mutex", "race-condition", "critical-section", "bounded-buffer",
 * "thread", "atomic", "starvation" exist elsewhere in the glossary;
 * "deadlock", "coffman-conditions", "circular-wait" are defined in module 7.
 */
export const entries: GlossaryEntry[] = [
  {
    id: "semaphore",
    term: "Semaphore",
    simple: "A counter with two atomic operations — P to claim (block at zero), V to release (wake one waiter).",
    technical:
      "Dijkstra's synchronization primitive: an integer value with a wait queue and two atomic operations, P (wait/down: decrement unless the value is 0, in which case block) and V (signal/up: increment and wake exactly one waiter); no owner, generalizable from binary (mutual exclusion) to counting (N identical units).",
    example:
      "S = 3 under P,V,P,P ends at 1 with nobody waiting; a P on S = 0 puts the caller to sleep until some thread's V wakes it.",
    related: ["p-operation", "v-operation", "binary-semaphore", "counting-semaphore", "mutex"],
    moduleId: "synchronization",
    lessonRef: "synchronization/semaphores-mutexes",
    simId: "producer-consumer-lab",
    refUrl: "https://pages.cs.wisc.edu/~remzi/OSTEP/threads-sema.pdf",
    refLabel: "OSTEP ch. 30: Semaphores",
  },
  {
    id: "p-operation",
    term: "P operation",
    fullForm: "proberen / passeren — 'to test / to pass' (Dijkstra's Dutch)",
    simple: "The claim: decrement the semaphore, or sleep if it is zero.",
    technical:
      "The atomic wait (down) operation: if the value is 0 the caller joins the semaphore's wait queue and yields the CPU (no spinning); otherwise it decrements and proceeds — consuming one unit of whatever the semaphore counts.",
    example:
      "P(empty) on a full buffer's empty = 0: the producer sleeps until a consumer's V(empty); on empty = 2 it just decrements to 1 and inserts.",
    related: ["semaphore", "v-operation", "producer-consumer", "atomic"],
    moduleId: "synchronization",
    lessonRef: "synchronization/semaphores-mutexes",
    simId: "producer-consumer-lab",
  },
  {
    id: "v-operation",
    term: "V operation",
    fullForm: "verhogen / vrijgeven — 'to increment / to release' (Dijkstra's Dutch)",
    simple: "The release: increment the semaphore and wake exactly one thread waiting on it.",
    technical:
      "The atomic signal (up) operation: increments the value and, if threads are blocked on the semaphore, wakes one of them whose pending P then completes; it has no owner — any thread may V a semaphore it never P'd, which is what makes cross-thread signaling possible.",
    example:
      "Two producers block on empty = 0; the consumer's single V(empty) wakes exactly one — the other keeps sleeping until the next V.",
    related: ["semaphore", "p-operation", "condition-variable", "atomic"],
    moduleId: "synchronization",
    lessonRef: "synchronization/semaphores-mutexes",
    simId: "producer-consumer-lab",
  },
  {
    id: "binary-semaphore",
    term: "Binary semaphore",
    simple: "A semaphore restricted to 0 and 1 — usable as a lock, but with no owner.",
    technical:
      "A semaphore whose value stays in {0, 1}; around a critical section P at entry and V at exit mimic a mutex, but the absence of ownership means any thread may V — correct for signaling between threads, hazardous for exclusion where owner-awareness (priority inheritance, error checks) matters.",
    example:
      "Thread A P's a binary semaphore (1→0), thread B P's (blocks), thread A V's — B proceeds: a handshake no owner-based mutex would allow.",
    related: ["semaphore", "mutex", "counting-semaphore", "critical-section"],
    moduleId: "synchronization",
    lessonRef: "synchronization/semaphores-mutexes",
    refUrl: "https://man7.org/linux/man-pages/man7/sem_overview.7.html",
    refLabel: "man7: sem_overview(7)",
  },
  {
    id: "counting-semaphore",
    term: "Counting semaphore",
    simple: "A semaphore that counts N identical units — N slots, N permits, N connections.",
    technical:
      "A semaphore initialized to N whose value expresses how many claims remain; each P consumes one (blocking at 0), each V returns one — the natural tool for resource pools and for the empty/full counters of the bounded-buffer pattern.",
    example:
      "empty initialized to the buffer's capacity N: producers consume it via P, consumers replenish it via V, and empty + full always equals N between transactions.",
    related: ["semaphore", "producer-consumer", "binary-semaphore", "bounded-buffer"],
    moduleId: "synchronization",
    lessonRef: "synchronization/producer-consumer",
    simId: "producer-consumer-lab",
  },
  {
    id: "condition-variable",
    term: "Condition variable",
    simple: "A wait queue for 'some condition may have changed' — sleep holding nothing, wake and re-check.",
    technical:
      "A synchronization object with no value, used with a mutex: wait(cv, m) atomically releases m and sleeps; signal wakes one waiter, broadcast wakes all; sleepers must re-check their predicate in a while loop, since wakes can be raced or spurious.",
    example:
      "while (count == N) notFull.wait(m); insert(); notEmpty.signal(); — the monitor-style producer, sleeping without holding m.",
    related: ["monitor", "mutex", "semaphore", "v-operation", "thread"],
    moduleId: "synchronization",
    lessonRef: "synchronization/semaphores-mutexes",
    refUrl: "https://pages.cs.wisc.edu/~remzi/OSTEP/threads-cv.pdf",
    refLabel: "OSTEP ch. 29: Condition Variables",
  },
  {
    id: "monitor",
    term: "Monitor",
    simple: "A bundle of lock plus condition variables around one data structure — exclusion and waiting, handled together.",
    technical:
      "A language-level or library construct enclosing shared state with a mutex (acquired on entry, released on exit, automatically) and condition variables for waiting; Java's synchronized methods with wait/notify are the canonical realization of Hoare's monitor concept.",
    example:
      "A synchronized Buffer class: every method enters with the lock held; producers wait on notFull, consumers on notEmpty, both re-checking in while loops.",
    related: ["condition-variable", "mutex", "critical-section", "thread-safety"],
    moduleId: "synchronization",
    lessonRef: "synchronization/semaphores-mutexes",
  },
  {
    id: "producer-consumer",
    term: "Producer–consumer",
    simple: "One thread makes items into a finite buffer; another takes them out — with no overflow, no underflow, no races.",
    technical:
      "The classical problem solved by three semaphores: empty (free slots, init N), full (items, init 0), mutex (init 1); each side claims its condition BEFORE the mutex and releases the mutex BEFORE signaling — the order whose reversal deadlocks producer and consumer across the buffer.",
    example:
      "Capacity 2, produce 2, consume 1: empty 2→0→1, full 0→2→1 — the invariant empty + full = 2 holds at every quiet moment.",
    related: ["counting-semaphore", "bounded-buffer", "p-operation", "v-operation", "race-condition"],
    moduleId: "synchronization",
    lessonRef: "synchronization/producer-consumer",
    simId: "producer-consumer-lab",
    refUrl: "https://pages.cs.wisc.edu/~remzi/OSTEP/threads-sema.pdf",
    refLabel: "OSTEP ch. 30: producer/consumer",
  },
  {
    id: "readers-writers",
    term: "Readers–writers",
    simple: "Many readers may share the data; a writer needs it alone — the policy decides who starves.",
    technical:
      "The problem family maintaining 'readers ≥ 0 ∧ writer = 0, or readers = 0 ∧ writer = 1', where a reader count lets the first reader lock out the writer and the last unlock: reader preference maximizes read concurrency (writer starvation), writer preference protects writers (reader starvation), and the fair policy queues everyone (bottleneck).",
    example:
      "Three readers inside, writer waiting, fourth reader arrives: under reader preference it enters immediately; under writer preference it queues behind the writer.",
    related: ["mutex", "critical-section", "starvation", "semaphore", "thread"],
    moduleId: "synchronization",
    lessonRef: "synchronization/readers-writers",
    simId: "readers-writers-lab",
  },
  {
    id: "dining-philosophers",
    term: "Dining philosophers",
    simple: "Five thinkers, five forks, each meal needs two adjacent forks — the model of resource-ring deadlocks.",
    technical:
      "Dijkstra's allocation model: N processes in a ring each need two adjacent resources; naive left-then-right acquisition deadlocks all N. Fixes: resource hierarchy (take the lower-numbered fork first — only philosopher N−1 changes habit), an arbitrator admitting at most N−1 contenders, or atomic pair acquisition.",
    example:
      "All five grab their left forks: every fork held, every right-fork request blocked — a complete circular-wait deadlock in one synchronized move.",
    related: ["circular-wait", "deadlock", "resource-hierarchy", "coffman-conditions"],
    moduleId: "synchronization",
    lessonRef: "synchronization/dining-philosophers",
    simId: "dining-philosophers-lab",
    refUrl: "https://en.wikipedia.org/wiki/Dining_philosophers_problem",
    refLabel: "Wikipedia: Dining philosophers problem",
  },
  {
    id: "resource-hierarchy",
    term: "Resource hierarchy",
    simple: "Number every resource; everyone must grab lower numbers first — rings of waiting become impossible.",
    technical:
      "Deadlock prevention by total ordering: processes acquire resources in increasing global order, so no process holds a higher-ordered resource while waiting for a lower-ordered one; a circular wait would require exactly that, so cycles cannot form. The dining philosophers' fix where only the philosopher holding forks {N−1, 0} changes behavior.",
    example:
      "Forks numbered 0–4, lower-first: philosopher 4 takes fork 0 (its 'right') before fork 4 — the one asymmetric reach that breaks the ring.",
    related: ["circular-wait", "dining-philosophers", "coffman-conditions", "deadlock"],
    moduleId: "synchronization",
    lessonRef: "synchronization/dining-philosophers",
    simId: "dining-philosophers-lab",
  },
  {
    id: "arbitrator",
    term: "Arbitrator",
    simple: "A central authority (butler) that limits how many threads may contend at once.",
    technical:
      "A central admission control — typically a counting semaphore initialized to N−1 (or a mutex-granting protocol) — that prevents deadlock by capping contenders below the level where the ring can close; its costs are a throughput bottleneck, a single point of failure, and whatever unfairness its own policy has.",
    example:
      "The philosophers' butler admits at most 4 to reach for 5 forks: someone always completes a pair — but every request now queues at one desk.",
    related: ["dining-philosophers", "counting-semaphore", "deadlock", "resource-hierarchy"],
    moduleId: "synchronization",
    lessonRef: "synchronization/dining-philosophers",
    simId: "dining-philosophers-lab",
  },
];
