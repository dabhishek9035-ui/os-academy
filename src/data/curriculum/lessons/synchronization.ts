import type { Lesson } from "@/types";

/**
 * Module 8 — Synchronization Deep Dive.
 * Classical coordination problems, solved for real: semaphores and their P/V
 * discipline, condition variables and monitors, then the producer–consumer,
 * readers–writers and dining philosophers problems with their honest
 * trade-offs. Lab conventions: the Producer–Consumer Lab shows live values of
 * the empty/full/mutex semaphores and logs every P and V event.
 */
export const lessons: Lesson[] = [
  {
    id: "synchronization/semaphores-mutexes",
    moduleId: "synchronization",
    title: "Semaphores, Mutexes & Condition Variables",
    minutes: 10,
    objectives: [
      "define a semaphore and trace its value through interleaved P and V operations",
      "contrast binary semaphores, counting semaphores and mutexes by ownership and use",
      "explain what a condition variable's wait does that no lock or semaphore does",
    ],
    sections: [
      {
        kind: "problem",
        body: [
          "Module 4 gave you the mutex: acquire, critical section, release. That solves *mutual exclusion* — one thread in the room at a time. But watch what coordination problems remain. A consumer needs to wait *until an item exists* — not for a room, for an **event**. A producer managing a 10-slot buffer needs to count **how many slots are free** — a quantity, not a flag. A pipeline stage must not start **until another stage finishes** — an ordering, not an exclusion. Spin-waiting on a flag wastes CPU, and a sleeping thread needs someone to *wake it at the right moment*.",
          "Dijkstra's answer, in 1965, was a single primitive that could express all three: an integer counter with two atomic operations, which *sleeps callers instead of making them spin* and wakes them when the count allows. That primitive — the **semaphore** — plus one refinement (the condition variable) is the vocabulary for every problem in the rest of this module.",
        ],
      },
      {
        kind: "intuition",
        body: [
          "The name is a piece of railway history. Old rail lines had **semaphore signals** — mechanical arms beside the track showing red (block occupied — wait) or green (block clear — proceed). The driver does not spin in circles looking at the track; the train *stops* at the signal, and the signal arm itself rises when the block frees. The signal is the counter: how many trains the block ahead can take. Passing the block is the **P** operation (claim a slot — wait if none); leaving the block and raising the arm is **V** (return a slot — the signal change itself wakes whoever waited). Dijkstra, who was Dutch, named them P for *proberen*/*passeren* (test/pass) and V for *verhogen*/*vrijgeven* (increment/release).",
          "The crucial property the signal has that a flag on a pole does not: the check and the stop are **one atomic act**. A driver never sees green and then collides with another driver who saw the same green — the machinery guarantees each green is consumed by exactly one train. And a driver never busy-loops at red: the stop is a real sleep, ended by the arm rising.",
        ],
      },
      {
        kind: "visual",
        simId: "producer-consumer-lab",
        body: [
          "The **Producer–Consumer Lab** displays a bounded buffer with the three semaphores of the classic solution — `empty`, `full`, `mutex` — as live counters, and logs every P and V event with the thread that issued it and what it did (proceeded, blocked, or woke).",
          "Step a producer through one item and read the log against the pattern below. Then fill the buffer and step one more producer P: the log shows the call *blocking* — the thread leaves the CPU without spinning — and the exact V from the consumer's side that later wakes it. That block-then-wake pair is the entire point of the primitive.",
        ],
      },
      {
        kind: "technical",
        body: [
          "A **semaphore** is an integer value S plus a wait queue, with two atomic operations. **P(S)** (also wait/down): try to decrement; if S is 0 the caller *blocks* — it joins the queue and releases the CPU — instead of decrementing. **V(S)** (also signal/up): increment; if any thread is blocked on S, wake **one** of them. Every interleaving of P and V from different threads yields the same counter arithmetic, because each operation is atomic. The value is a resource count: S = 3 means 'three claims available right now'.",
          "Two specializations matter. A **binary semaphore** keeps S in {0, 1} — around a critical section, P at the door, V at the exit — which makes it *look* like a **mutex**. The difference is ownership: a mutex is acquired and released *by the same thread* (which is why real mutexes can support priority inheritance and owner-tracking error checks), while a semaphore has no owner — any thread may V, which is exactly what *signaling* between threads requires. A **counting semaphore** keeps S in {0…N} and expresses 'N identical units': N buffer slots, N connections, N permits.",
          "The **condition variable** refines waiting further. It has no value — it is a queue paired with a mutex — and its key operation **wait** does something neither a lock nor a semaphore can: it *atomically* releases the calling thread's mutex and puts the thread to sleep, so that the state it is waiting for can be changed by someone else. **signal** wakes one waiter; **broadcast** wakes all. Because sleepers must re-check their condition after waking (other threads raced them to the wake-up), the idiom is always a `while` loop around the wait. Bundle a mutex with the condition variables guarding one data structure and you have a **monitor** — the shape of Java's `synchronized`/`wait`/`notify`, and the conceptual grandparent of almost every high-level concurrency tool.",
        ],
        equations: [
          {
            expr: "P(S): if S = 0 then block else S ← S − 1   (atomic)",
            symbols: [
              { sym: "S", meaning: "the semaphore's current value — units available now" },
              { sym: "block", meaning: "join S's wait queue and yield the CPU (no spinning)" },
            ],
            note: "Some textbooks let S go negative and read the waiters as −S; this course keeps S ≥ 0 and tracks the queue separately — matching how the labs display values.",
          },
          {
            expr: "V(S): S ← S + 1; wake one thread blocked on S   (atomic)",
            symbols: [
              { sym: "wake one", meaning: "exactly a single waiter proceeds — not all of them" },
            ],
            note: "The woken thread's P completes as if it had just decremented the (freshly incremented) counter.",
          },
          {
            expr: "wait(cv, m): atomically release m and sleep;  signal(cv): wake one waiter",
            symbols: [
              { sym: "cv", meaning: "the condition variable" },
              { sym: "m", meaning: "the mutex the caller holds while testing its condition" },
            ],
            note: "The atomic release-then-sleep is the whole trick: no window in which the event could fire while you still hold the lock (missing it forever) or while you sleep holding it (deadlocking everyone).",
          },
        ],
      },
      {
        kind: "worked-example",
        steps: [
          {
            title: "Counter arithmetic under interleaving",
            body: [
              "S starts at 3. Four operations arrive from various threads: P, V, P, P. Trace: P → 2; V → 3; P → 2; P → 1. Final value 1, nobody waiting — every P found the counter positive, so no one blocked.",
              "Now S starts at 1 (binary). P → 0 (one thread 'inside'); a second thread's P finds 0 and **blocks** (value stays 0, queue holds one waiter); V from anywhere — say, the first thread leaving — wakes the waiter, whose P completes, putting it 'inside'. That is a mutual-exclusion handshake between threads with no shared notion of who locked what — possible precisely because a semaphore has no owner.",
            ],
          },
          {
            title: "What the wake-one rule implies",
            body: [
              "Ten threads block on a semaphore at 0. One V arrives. Exactly **one** thread wakes and proceeds; nine keep sleeping, and the value returns to 0. If the awakened thread's job was to make *ten* units available, it will need to V ten times — or the code should use a different pattern.",
              "This is why semaphore code is written as claim-release pairs around resources, not as broadcast announcements. For 'wake everyone and let them re-check', the condition variable's `broadcast` is the tool — and the re-checking `while` loop is not optional.",
            ],
          },
        ],
      },
      {
        kind: "misconceptions",
        items: [
          {
            wrong: "A semaphore is just a fancier mutex.",
            right: "They differ in contract: a mutex has *ownership* (the locker unlocks, enabling owner-aware debugging and priority inheritance) and exists for exclusion; a semaphore has no owner and exists for *signaling and counting* — a thread may legitimately V a semaphore it never P'd. Swapping them 'because both block' produces code that works in tests and deadlocks in production.",
          },
          {
            wrong: "V wakes every thread waiting on the semaphore.",
            right: "V wakes exactly one waiter (semantics of the counter: one unit returned, one claim granted). Waking all waiters to re-check a shared state is the condition variable's `broadcast` — a different primitive with a different contract.",
          },
        ],
      },
      {
        kind: "knowledge-check",
        questions: [
          {
            id: "kc-m8-sema-1",
            q: "A semaphore is initialized to 2. Three threads call P on it simultaneously. What results?",
            options: [
              "Two threads proceed (value 0); the third blocks",
              "All three proceed; the value goes to −1",
              "All three block; the value stays 2",
              "One proceeds; two block, and the value reads 2",
            ],
            answerIndex: 0,
            explanation:
              "Each P consumes one unit atomically: the first two find 2 and 1, decrementing to 0; the third finds 0 and joins the queue. (This course keeps the value non-negative and the waiter in the queue.)",
          },
          {
            id: "kc-m8-sema-2",
            q: "Which primitive guarantees 'only the thread that acquired it may release it'?",
            options: [
              "A mutex",
              "A binary semaphore",
              "A counting semaphore",
              "A condition variable",
            ],
            answerIndex: 0,
            explanation:
              "Ownership is the mutex's defining contract. A semaphore — even a binary one — has no owner: any thread may V it, which is a *feature* for signaling and a hazard for exclusion.",
          },
        ],
      },
      {
        kind: "references",
        items: [
          {
            label: "OSTEP, Chapter 30: Semaphores",
            url: "https://pages.cs.wisc.edu/~remzi/OSTEP/threads-sema.pdf",
            note: "definition, the producer–consumer pattern, and the philosopher problem — this module's core text",
          },
          {
            label: "OSTEP, Chapter 29: Condition Variables",
            url: "https://pages.cs.wisc.edu/~remzi/OSTEP/threads-cv.pdf",
            note: "the wait/sleep/wake machinery and why the while-loop re-check is mandatory",
          },
          {
            label: "man7: sem_overview(7) — POSIX semaphores",
            url: "https://man7.org/linux/man-pages/man7/sem_overview.7.html",
            note: "the real API family: unnamed and named semaphores, sem_wait/sem_post",
          },
        ],
      },
      {
        kind: "note",
        body: [
          "The lab shows semaphore values as non-negative counters with separate wait queues, P/V fully atomic, and no priorities — no priority inheritance, no timeouts (real APIs offer sem_timedwait), and no process-shared semaphores living in shared memory. It also models 'wake one' deterministically (longest-waiting first), where real wake policies may differ.",
        ],
      },
    ],
  },
  {
    id: "synchronization/producer-consumer",
    moduleId: "synchronization",
    title: "The Producer–Consumer Problem",
    minutes: 10,
    objectives: [
      "assemble the three-semaphore solution (empty, full, mutex) and justify each one",
      "trace semaphore values through a produce and a consume on a small buffer",
      "explain why the order of P operations is load-bearing and what reversing it costs",
    ],
    sections: [
      {
        kind: "problem",
        body: [
          "Two threads, one finite buffer. A **producer** creates items and puts them in; a **consumer** takes items out and processes them. They run at independent, mismatched speeds — the producer may sprint while the consumer naps and vice versa. Three failure modes lurk: the producer overflows the buffer with nowhere to put an item; the consumer drains an empty buffer and consumes garbage; and both touch the buffer's indices *simultaneously* (module 4's race condition, back for an encore).",
          "Plainly a mutex is needed — and plainly it is not enough. A consumer holding the lock on an empty buffer must *sleep*, but if it sleeps while holding the lock, the producer can never enter to fill anything: deadlock. What is needed is the ability to sleep *about the count* while *not* holding the exclusion — and to be woken the moment the count changes in one's favor.",
        ],
      },
      {
        kind: "intuition",
        body: [
          "A bakery with a rack of exactly **N** slots between the baker and the counter staff. Three rules of the shop: a ticket board shows **empty slots** (the baker takes one ticket before loading a tray — no tickets, the baker waits in the back); another board shows **items waiting** (counter staff take from it — none, they wait out front); and aturnstile (**mutex**) lets exactly one person at a time onto the rack itself, because two hands rearranging trays at once drop them.",
          "Note who waits on what: the baker waits on *slots*, never on the turnstile; staff wait on *items*, never on the turnstile. Each ticket board is checked **before** entering the turnstile — because the ticket you wait for can only be produced by someone on the *other* side of the rack, and you must not be hogging the rack while you wait for them to make it available.",
        ],
      },
      {
        kind: "visual",
        simId: "producer-consumer-lab",
        body: [
          "The lab *is* the bakery, instrumented: buffer slots fill and drain while `empty`, `full` and `mutex` tick up and down, and the P/V log names the thread, the semaphore, and the effect (proceeded / blocked / woke).",
          "Watch one full cycle: producer P(empty) 2→1, P(mutex) 1→0, insert, V(mutex) 0→1, V(full) 0→1; then the consumer's mirror image. The counters never lie about who is waiting for what — which is exactly what you need for the order-swap exercise below.",
        ],
      },
      {
        kind: "experiment",
        simId: "producer-consumer-lab",
        prompts: [
          "Run the default scenario and verify the invariant: at every log step, empty + full = buffer capacity. Pause mid-run and predict the next counter change before stepping.",
          "Fill the buffer to capacity, then step one more producer P(empty). Note the block. Then step the consumer's V(empty) — confirm the *producer* is the thread woken. Which V did the work, and how many waiters remained?",
          "Now reason through the broken ordering: producer does P(mutex) *before* P(empty), with the buffer full. Walk it: what is the producer holding when it blocks, and what is the consumer blocked on? Convince yourself no future step can save the pair.",
        ],
        body: [
          "Lab conventions: buffer capacity 4 in the default scenario, semaphores shown as non-negative counters, wake-one policy (longest-waiting first). The broken-order scenario is an exercise in prediction — the lab's default order is always the correct one.",
        ],
      },
      {
        kind: "technical",
        body: [
          "The canonical solution uses **three semaphores**. `empty` counts *free slots*, initialized to N. `full` counts *items present*, initialized to 0. `mutex`, initialized to 1, makes buffer manipulation exclusive. The producer runs **P(empty); P(mutex); insert; V(mutex); V(full)**; the consumer runs **P(full); P(mutex); remove; V(mutex); V(empty)**.",
          "Read the structure as two lessons in one. First, the *counting* semaphores (empty, full) encode the two waiting conditions: producers sleep only when no slot is free; consumers only when no item exists. Second, the **order** is load-bearing: each thread claims its *resource condition* **before** taking the mutex, and releases the mutex **before** signaling. Reverse it — P(mutex) then P(empty) — and with a full buffer the producer takes the mutex, blocks on empty… while the consumer, trying to free a slot, blocks on the very mutex the producer holds. Circular wait across two semaphores: a textbook deadlock (module 7's Coffman conditions, all present).",
          "The same pattern generalizes beyond two threads: multiple producers and consumers work unchanged (mutex still serializes rack access; counts remain globally true), and swapping the semaphores for condition variables (notFull, notEmpty under one mutex) gives the monitor-style solution — same discipline, different idiom: `while (count == N) notFull.wait(m);` … `notEmpty.signal();`. Both forms live in production code; the semaphore version shows the *counting* structure most clearly, which is why this course teaches it first.",
        ],
        equations: [
          {
            expr: "Producer: P(empty); P(mutex); insert; V(mutex); V(full)",
            symbols: [
              { sym: "empty", meaning: "free-slot counter, initialized to capacity N" },
              { sym: "mutex", meaning: "binary semaphore guarding the buffer indices" },
              { sym: "full", meaning: "item counter, initialized to 0" },
            ],
            note: "The consumer is the mirror image: P(full); P(mutex); remove; V(mutex); V(empty).",
          },
          {
            expr: "Invariant: empty + full = N  (whenever no thread is mid-transaction)",
            symbols: [
              { sym: "N", meaning: "buffer capacity" },
            ],
            note: "Every produce moves one unit from empty to full; every consume moves one back. Watching this invariant in the lab is the fastest way to spot a confused implementation.",
          },
        ],
      },
      {
        kind: "worked-example",
        steps: [
          {
            title: "Capacity 2, by the numbers",
            body: [
              "Start: empty = 2, full = 0, mutex = 1. Producer makes item 1: P(empty) → 1; P(mutex) → 0; insert; V(mutex) → 1; V(full) → 1. Producer makes item 2: empty → 0, full → 2. Buffer now holds both items.",
              "Consumer takes one: P(full) → 1; P(mutex) → 0; remove; V(mutex) → 1; V(empty) → 1. Final state: **empty = 1, full = 1** — and the invariant empty + full = 2 held at every quiet moment throughout.",
            ],
          },
          {
            title: "The wrong order, frozen mid-step",
            body: [
              "Buffer full (empty = 0, full = 2), producer runs the *broken* order: P(mutex) → 0, then P(empty) — blocks. The producer now sleeps **holding mutex**. The consumer wakes to consume: P(full) → 1 succeeds, then P(mutex) — value 0, and the only thread that could V it is asleep. The consumer blocks too.",
              "Both threads wait forever: the producer waits for the consumer to make a slot; the consumer waits for the producer to let go of the rack. Mutual exclusion, hold-and-wait, no preemption, circular wait — the producer–consumer problem reduced to a deadlock because two P calls were swapped.",
            ],
          },
        ],
      },
      {
        kind: "misconceptions",
        items: [
          {
            wrong: "One mutex around the buffer is a complete producer–consumer solution.",
            right: "The mutex prevents races on the buffer indices, but says nothing about overflow or underflow — and worse, a thread that sleeps on a condition *while holding the mutex* deadlocks everyone who could fix its condition. The counting semaphores (or condition variables) exist precisely to sleep *without* the lock.",
          },
          {
            wrong: "The semaphore values are where the data lives.",
            right: "`full` counts items; the items themselves live in the buffer. The semaphores are pure synchronization state — counts and wait queues. Deleting the buffer and keeping the counters (or vice versa) breaks the pattern immediately.",
          },
        ],
      },
      {
        kind: "knowledge-check",
        questions: [
          {
            id: "kc-m8-prod-1",
            q: "A capacity-2 buffer starts empty. The producer creates 2 items and the consumer consumes 1. What are the semaphore values now?",
            options: [
              "empty = 1, full = 1",
              "empty = 0, full = 2",
              "empty = 2, full = 0",
              "empty = 1, full = 2",
            ],
            answerIndex: 0,
            explanation:
              "Each produce moves a unit empty→full (2→0, 0→2); each consume moves one back (full→1, empty→1). Net: one slot free, one item waiting — and empty + full = 2 throughout.",
          },
          {
            id: "kc-m8-prod-2",
            q: "Why must the producer call P(empty) *before* P(mutex)?",
            options: [
              "So it never sleeps holding the mutex the consumer needs to free a slot",
              "Because empty must be decremented before full is incremented",
              "Because mutex only works if acquired second",
              "So two producers cannot insert simultaneously",
            ],
            answerIndex: 0,
            explanation:
              "Claim the condition first, the exclusion second. Reversed, a producer blocked on empty holds mutex — and the consumer that could create a slot is blocked on that mutex: circular wait, deadlock.",
          },
        ],
      },
      {
        kind: "references",
        items: [
          {
            label: "OSTEP, Chapter 30: Semaphores — producer/consumer",
            url: "https://pages.cs.wisc.edu/~remzi/OSTEP/threads-sema.pdf",
            note: "the three-semaphore solution and the famous first/second attempts that get it wrong",
          },
          {
            label: "OSTEP, Chapter 29: Condition Variables",
            url: "https://pages.cs.wisc.edu/~remzi/OSTEP/threads-cv.pdf",
            note: "the producer/consumer problem recast with condition variables and a while-loop",
          },
        ],
      },
      {
        kind: "note",
        body: [
          "The lab models single-item insert/remove as atomic under the mutex, uses capacity 4 by default with non-negative semaphore displays, and wakes the longest-waiting thread — real schedulers may wake any waiter, which is one more reason condition-variable code must re-check its predicate in a loop.",
        ],
      },
    ],
  },
  {
    id: "synchronization/readers-writers",
    moduleId: "synchronization",
    title: "The Readers–Writers Problem",
    minutes: 9,
    objectives: [
      "state the readers–writers invariant and why readers are safe to share",
      "trace reader-preference and writer-preference policies and name each one's starvation victim",
      "explain the fair (third) policy and what it trades away",
    ],
    sections: [
      {
        kind: "problem",
        body: [
          "Some shared data is read constantly and written rarely: configuration caches, routing tables, product catalogs. A strict mutex treats every access as exclusive — but two *readers* touching the same data cannot corrupt each other. Forcing them to take turns wastes the common case; allowing them to share while keeping writers exclusive creates a genuinely new design question, one with no answer that is fair to everybody:",
          "**When a writer is waiting, do new readers still get in?** Let them, and the steady stream of readers can starve the writer forever. Block them, and a burst of writes starves the readers. There is no third option that satisfies both sides simultaneously — only different, explicit policies. This problem is famous precisely because it forces you to *choose* whom to starve.",
        ],
      },
      {
        kind: "intuition",
        body: [
          "A museum room holds one exhibit. **Visitors (readers)** may roam freely and simultaneously — looking changes nothing. **The restorer (writer)** needs the room completely empty, and the door locked while working. The museum's real decision is door policy: keep admitting visitors while the restorer waits (cheap, popular, and the restorer may never get the room); or, once the restorer has signed in at the desk, hold new visitors at the entrance (the restorer always gets the room eventually — but a busy restoration schedule empties the museum of visitors); or issue everyone a numbered ticket and admit strictly in order (fair to all, at the price of a queue and a slower door).",
          "Note the mechanism hiding under all three policies: someone must **count** the visitors and let the *first one in* acquire the room against the restorer, and the *last one out* release it. That counting, not the exclusion itself, is the interesting machinery.",
        ],
      },
      {
        kind: "visual",
        simId: "readers-writers-lab",
        body: [
          "The **Readers–Writers Lab** shows active readers, the writer's state (idle / waiting / writing), and the waiting sets — with the current policy selectable.",
          "Stage the dilemma directly: start three readers, then launch a writer, then a fourth reader. Under **reader preference** the fourth reader walks straight in and the writer keeps waiting; under **writer preference** the fourth reader queues behind the writer. Watch the waiting sets change as you flip the policy with the same traffic — the starved party is whoever keeps arriving while the policy favors the other side.",
        ],
      },
      {
        kind: "experiment",
        simId: "readers-writers-lab",
        prompts: [
          "Under reader preference, keep starting new readers while the writer waits. How long can you keep the writer starved? What does this predict for a cache that is read 1000× more often than it is written?",
          "Switch to writer preference and reverse the experiment: a stream of readers with writers arriving periodically. Who waits now, and is their wait bounded?",
          "In the reader-counting machinery, identify (from the lab's state panel) which lock the *first* reader takes and the *last* reader releases — and why readers two, three, four never touch it.",
        ],
        body: [
          "Lab conventions: readers and writers hold the room for fixed durations, all readers inside are symmetric, and the policy switch takes effect for newly arriving threads only — already-admitted readers finish their turn regardless.",
        ],
      },
      {
        kind: "technical",
        body: [
          "The **invariant** every solution maintains: any number of readers *or* exactly one writer — never both. The implementation challenge is that 'any number of readers' must be *counted* by the threads themselves: the first reader entering must exclude the writer; readers two through n must not (or concurrency is lost); the last reader out must re-open the door. A **read count** — protected by its own small mutex — does the accounting.",
          "**Reader preference** (the first or 'classic' solution): readers increment the count under the count-mutex; the *first* one performs P on the writer-locking semaphore, the *last* one out performs the V. A writer locks with a plain P/V of that same semaphore. Readers already inside are untouched; **new readers keep entering while a writer waits** — maximum read concurrency, and, under a steady stream of readers, writer starvation. Right for read-mostly data with patient writers; wrong by design for anything else.",
          "**Writer preference**: a pending writer raises a flag that makes arriving readers *wait* (they queue on the writer's gate) even though readers are currently inside. The writer gets the room as soon as current readers drain — writers are never overtaken by the reader stream. The starvation merely changes sides: a write-heavy phase can starve readers indefinitely. **The fair (third) policy** hands out numbered admission: every reader and writer takes a ticket from one queue semaphore and is served in arrival order — no starvation on either side — at the cost of serializing *the decision* (one bottleneck all traffic passes through) and slightly less read concurrency. These are the same trade-offs real reader-writer locks (rwlock) expose as modes; Linux additionally offers RCU for read-mostly data at scales this problem doesn't attempt.",
        ],
        equations: [
          {
            expr: "Inside: readers ≥ 0 ∧ writer = 0   ∨   readers = 0 ∧ writer = 1",
            symbols: [
              { sym: "readers", meaning: "count of readers currently in the critical section" },
              { sym: "writer", meaning: "0 or 1 — the writer's exclusive presence" },
            ],
            note: "The invariant every policy maintains; the policies differ only in *who waits at the door and in what order*.",
          },
          {
            expr: "First reader: P(resource);  last reader out: V(resource);  writer: P(resource); V(resource)",
            symbols: [
              { sym: "resource", meaning: "the binary semaphore/lock representing the data itself" },
            ],
            note: "The count (under its own mutex) decides who touches 'resource' on the readers' behalf — this delegation is the whole trick of the solution.",
          },
        ],
      },
      {
        kind: "worked-example",
        steps: [
          {
            title: "One arrival, two policies",
            body: [
              "Three readers R1–R3 are inside. Writer W arrives (must wait for the room to empty). Reader R4 arrives. **Reader preference**: R4 increments the count (4 readers) and enters immediately; W still waits — its P sits behind the readers' collective hold. **Writer preference**: R4 finds a writer pending and queues; the readers inside finish and drain; W enters alone; on W's exit, R4 (and any other queued readers) proceed.",
              "Same traffic, opposite victims: reader preference makes W's wait depend on *arrival rates of readers* (potentially infinite); writer preference makes R4's wait depend on *write frequency* (bounded per writer, but potentially endless in aggregate).",
            ],
          },
          {
            title: "Why the count-mutex cannot be the resource lock",
            body: [
              "Suppose readers used one shared mutex for everything. R1 holds it while 'reading' (long!), R2 blocks on the mutex — but two readers were supposed to share. If instead readers release the mutex before reading, then two readers can simultaneously see count = 0 and *both* claim to be first — the classic check-then-act race (module 4).",
              "The fix is the delegation you traced: a tiny count-mutex held only for the increment/decrement (microseconds), and the *resource* lock taken or released by whichever reader finds the count transitioning 0→1 or n→0. Exclusion against the writer is a property of the count's phases, not of any single reader's hold.",
            ],
          },
        ],
      },
      {
        kind: "misconceptions",
        items: [
          {
            wrong: "There is one correct readers–writers solution; the others are bugs.",
            right: "It is a *family* of policies — reader preference, writer preference, fair — each correct against the invariant and each starving someone under the wrong workload. Choosing the policy is a workload decision, not a debugging chore.",
          },
          {
            wrong: "A waiting writer must wait for every reader that ever arrives.",
            right: "Only under reader preference, and only for readers that arrive *while it waits*. Under writer preference or the fair policy, pending writers block or order the newcomers. What a waiter is exposed to is precisely what the policy choice controls.",
          },
        ],
      },
      {
        kind: "knowledge-check",
        questions: [
          {
            id: "kc-m8-rw-1",
            q: "Under reader preference, how many readers may be inside while a writer waits?",
            options: [
              "Unbounded — every newly arriving reader still enters",
              "Exactly one — the first reader holds the door",
              "Zero — a waiting writer locks the room",
              "Two — a reader and the writer alternate",
            ],
            answerIndex: 0,
            explanation:
              "Reader preference admits every new reader regardless of pending writers — which is what maximizes read concurrency and what can starve the writer indefinitely under a steady reader stream.",
          },
          {
            id: "kc-m8-rw-2",
            q: "Which policy can starve *readers*?",
            options: [
              "Writer preference — pending writers hold new readers at the door",
              "Reader preference",
              "The fair (ticket-order) policy",
              "None — readers always get in eventually",
            ],
            answerIndex: 0,
            explanation:
              "Every policy starves someone under an adversarial workload: reader preference starves writers, writer preference starves readers, the fair policy starves no one but queues everyone. Choosing sides is the problem's whole lesson.",
          },
        ],
      },
      {
        kind: "references",
        items: [
          {
            label: "OSTEP, Chapter 30: Semaphores",
            url: "https://pages.cs.wisc.edu/~remzi/OSTEP/threads-sema.pdf",
            note: "the reader–writer solutions built from semaphores, preference by preference",
          },
          {
            label: "OSTEP, Chapter 29: Condition Variables",
            url: "https://pages.cs.wisc.edu/~remzi/OSTEP/threads-cv.pdf",
            note: "the same problem in monitor style, with the count as shared state",
          },
        ],
      },
      {
        kind: "note",
        body: [
          "The lab fixes reader/writer durations and admits symmetric readers; real reader-writer locks add re-entrancy, writer handoff rules, reader-batching, and (for read-mostly data at scale) entirely different designs like RCU, where 'readers' take no lock at all. The starvation trade-offs, though, are exactly the ones this lesson makes you choose between.",
        ],
      },
    ],
  },
  {
    id: "synchronization/dining-philosophers",
    moduleId: "synchronization",
    title: "The Dining Philosophers",
    minutes: 10,
    objectives: [
      "reproduce the classic deadlock with left-then-right fork acquisition",
      "apply the resource-hierarchy fix and identify exactly whose habit changes",
      "weigh the arbitrator and atomic-grab alternatives and their risks",
    ],
    sections: [
      {
        kind: "problem",
        body: [
          "Five philosophers sit around a table with five forks — one between each pair of neighbors. A philosopher alternates between thinking (no resources needed) and eating, and eating requires **both** adjacent forks. Each philosopher works independently and politely: pick up the left fork; then pick up the right fork; eat; put both down. Now suppose all five get hungry at the same moment. Each grabs their left fork — every fork is now held. Each reaches for their right fork — held by their neighbor. All five block, forever, each waiting for a fork that will never be released. No one is rude, no one is buggy in isolation, and dinner never happens.",
          "Dijkstra invented this scenario in 1965 to be *memorable, minimal and general*: five processes, a ring of resources each needing two neighbors — the structure of every resource-contention system from transaction locks to network routing. It is the module's final exam because it cannot be solved by 'use a mutex' (each fork already needs one) — the *acquisition protocol itself* must change.",
        ],
      },
      {
        kind: "intuition",
        body: [
          "The deadlock at the table is pure geometry: five people, five held forks, five waits — a closed ring of holding-and-waiting, every Coffman condition satisfied. Any fix must break the ring, and the ring is broken most cheaply by making one person reach *across* the table: if philosopher 4 picks up the fork on their **right** first (fork 0, shared with philosopher 0), the ring loses its symmetry — someone at the table can always complete their pair.",
          "Alternatively, hire a butler who lets **at most four** philosophers reach for forks at once. With four reaching and five forks, at least one philosopher completes their pair; when they finish, another may try. The table never locks up — but now everyone's dinner is at the butler's discretion.",
        ],
      },
      {
        kind: "visual",
        simId: "dining-philosophers-lab",
        body: [
          "The **Dining Philosophers Lab** shows the ring: five philosophers cycling through thinking / hungry / eating, five forks, and who holds what. Run the naive left-then-right strategy with everyone hungry at once and watch all five go red — blocked, holding one fork each.",
          "Then switch strategies and re-run the same traffic. Under the **hierarchy** strategy, notice which philosopher now picks up a *different first fork*; under the **arbitrator**, notice how many philosophers can be reaching at once. The lab logs each pickup, block and put-down, so the ring's death and rebirth are both traceable.",
        ],
      },
      {
        kind: "experiment",
        simId: "dining-philosophers-lab",
        prompts: [
          "Run left-then-right with all five hungry simultaneously. Confirm the deadlock. Match each philosopher's state to a Coffman condition — which condition does the *ring as a whole* demonstrate?",
          "Enable the hierarchy strategy (number forks 0–4, always take the lower number first). Which philosopher's first pickup changes, and to which fork? Explain why that one change makes a circular wait impossible.",
          "Enable the arbitrator (at most four philosophers may reach for forks). Count how many can eat at once in steady state versus the hierarchy strategy — and identify what new single point of failure the table has acquired.",
        ],
        body: [
          "Lab conventions: five philosophers, symmetric think/eat durations, attempts resolved in id order, wake-ups in waiting order. Real systems add randomness and fairness policies that this lab's determinism lets you see without.",
        ],
      },
      {
        kind: "technical",
        body: [
          "**The failure.** Left-then-right with all five hungry: each Pᵢ holds fork Lᵢ and waits for Rᵢ — the wait-for ring closes and nobody can proceed. Deadlock, exactly as module 7 predicted: mutual exclusion (each fork, one hand), hold-and-wait (fork held while wanting the next), no preemption (forks aren't grabbed), circular wait (the ring).",
          "**Fix 1 — resource hierarchy (Dijkstra's ordering).** Impose a total order on the forks — number them 0–4 — and require every philosopher to take the **lower-numbered** fork first. Philosophers 0–3 still take their left fork first (it happens to be their lower one); philosopher 4, whose forks are 4 and 0, must take **0** — the 'right' fork — first. A circular wait would now require some philosopher to hold a higher-numbered fork while waiting for a lower-numbered one, which the rule makes impossible: whoever holds the highest-numbered fork in any putative cycle cannot be waiting (its partner fork is lower). Cycles cannot form; deadlock is gone. Cost: near zero — one philosopher reaches across the table. Note what ordering does *not* promise: a fair table under adversarial timing can still starve a slow philosopher; ordering kills deadlock, not every wait.",
          "**Fix 2 — the arbitrator (central lock / butler).** A counting semaphore initialized to 4 (or a mutex-and-permission protocol) admits at most four philosophers to *contend* for forks. Since four philosophers can hold at most four forks among five, at least one contender completes a pair; the table cannot lock. Cost: a bottleneck and a single point of failure — the butler's state is now on every path, its fairness policy decides who eats, and a buggy butler deadlocks everyone. **Fix 3 — atomic pair-grab.** Let a philosopher take both forks or neither (a monitor per fork-pair, or 'AND-semantics' acquisition). No one ever holds one fork while waiting, so hold-and-wait is destroyed. Cost: complexity, and some throughput loss when a grabbed pair blocks a neighbor who only needed one fork. (The distributed classic, Chandy–Misra's clean forks, removes even the central authority — one sentence here to know it exists.)",
        ],
        equations: [
          {
            expr: "take(lower(i, i+1 mod 5)); take(higher(i, i+1 mod 5))",
            symbols: [
              { sym: "i", meaning: "philosopher index 0–4; forks i and (i+1) mod 5 are its pair" },
              { sym: "lower / higher", meaning: "the smaller / larger fork number of the pair" },
            ],
            note: "The resource-hierarchy rule. Only philosopher 4's behavior changes: its lower fork is 0, not its 'left' fork 4.",
          },
          {
            expr: "arbitrator: P(seats) before contending for forks, with seats initialized to N − 1",
            symbols: [
              { sym: "seats", meaning: "counting semaphore — how many philosophers may reach for forks at once" },
              { sym: "N − 1", meaning: "4 of 5: guarantees some contender completes a pair" },
            ],
            note: "Deadlock-free by counting: 4 contenders, 5 forks — someone's second fork is always free.",
          },
        ],
      },
      {
        kind: "worked-example",
        steps: [
          {
            title: "The ring closes (and how ordering keeps it open)",
            body: [
              "Naive, all hungry: P0 holds 4? — careful, follow the rule *left*: P0's left is fork 0, P1's is 1, …, P4's is 4. After the first wave every fork 0–4 is held by its left-neighbor philosopher, and every right-fork request blocks. Five holders, five waiters, zero progress — the deadlock you reproduced in the lab.",
              "Under the hierarchy rule with philosophers acting in id order: P0 takes fork 0, then fork 1 — **eats**. P1's lower fork is 1, held — blocks (holding nothing). P2 takes fork 2, then fork 3 — **eats**. P3's lower fork is 3, held — blocks. P4's lower fork is 0, held by P0 — blocks. Fork 4 lies free, but nobody unsafe holds two wait-handles: P1 and P3 hold nothing, P4 holds nothing. No holder is waiting on a fork that waits back — no cycle.",
            ],
          },
          {
            title: "What each fix costs at the table",
            body: [
              "Count throughput on the ordered table: P0 and P2 eat; on their exit, P1 (forks 1,2) and P3 (forks 3,4) can both complete — two diners at a time, same as the theoretical best for five forks.",
              "The arbitrator achieves the same deadlock-freedom but routes every decision through one seat-count: its fairness (or lack) becomes the table's fairness, and its failure is everyone's failure. The hierarchy has no single point of failure but relies on *every* philosopher's code following the same global numbering — one rebel reintroduces the ring. Neither dominates; that is the honest summary of the whole module.",
            ],
          },
        ],
      },
      {
        kind: "misconceptions",
        items: [
          {
            wrong: "The dining philosophers is really about eating — a quirky puzzle with a quirky fix.",
            right: "It is the standard model of *any* set of processes contending for overlapping resource pairs: transaction managers, lock managers, routing tables. The fixes — global ordering, central admission, atomic multi-acquire — are production patterns, and the ring deadlock is a production failure mode.",
          },
          {
            wrong: "More forks would fix the deadlock — the table is just under-resourced.",
            right: "Five forks already allow two philosophers to eat at once; the deadlock is caused by the *acquisition protocol* (everyone holding one fork while waiting for the next), not by scarcity. The working fixes change the protocol — ordering, admission, atomic grab — not the fork count.",
          },
        ],
      },
      {
        kind: "knowledge-check",
        questions: [
          {
            id: "kc-m8-dining-1",
            q: "All five philosophers grab their left forks simultaneously and wait for their right. Which Coffman condition does the table as a whole most clearly exhibit?",
            options: [
              "Circular wait — the five waits close into a ring",
              "Mutual exclusion only — nothing else applies",
              "Starvation — they will eat eventually, just late",
              "Livelock — they are actively retrying and yielding",
            ],
            answerIndex: 0,
            explanation:
              "Each philosopher holds one fork and waits for the next philosopher's held fork: P0 → P1 → … → P4 → P0. That closed ring of holding-and-waiting is circular wait — with all four conditions present, a full deadlock.",
          },
          {
            id: "kc-m8-dining-2",
            q: "Under the resource-hierarchy fix (always take the lower-numbered fork first), which philosopher's first pickup is NOT its left fork?",
            options: [
              "Philosopher 4 — its forks are 4 and 0, so it must take 0 (its 'right') first",
              "Philosopher 0 — its left fork is the table's lowest number",
              "All of them — everyone reaches across",
              "None — ordering never changes anyone's first pickup",
            ],
            answerIndex: 0,
            explanation:
              "For philosophers 0–3 the left fork already is the lower-numbered one. Only P4 (forks 4 and 0) must invert its habit and take fork 0 first — the single asymmetric reach that breaks the ring.",
          },
        ],
      },
      {
        kind: "references",
        items: [
          {
            label: "OSTEP, Chapter 32: Common Concurrency Problems",
            url: "https://pages.cs.wisc.edu/~remzi/OSTEP/threads-bugs.pdf",
            note: "deadlock prevention strategies — ordering, acquisition discipline — applied for real",
          },
          {
            label: "OSTEP, Chapter 30: Semaphores",
            url: "https://pages.cs.wisc.edu/~remzi/OSTEP/threads-sema.pdf",
            note: "the philosophers among the semaphore patterns, including the butler/arbitrator form",
          },
          {
            label: "Wikipedia: Dining philosophers problem",
            url: "https://en.wikipedia.org/wiki/Dining_philosophers_problem",
            note: "the history (Dijkstra 1965, Hoare's naming), and the Chandy–Misra distributed solution",
          },
        ],
      },
      {
        kind: "note",
        body: [
          "The lab is deterministic: symmetric timing, attempts in id order, wake-ups in waiting order — so the deadlock always forms on cue and fixes always demonstrate cleanly. Real tables (and real systems) add timing noise under which the naive strategy deadlocks only *sometimes*, which is worse: nondeterministic deadlocks are the ones that reach production.",
        ],
      },
    ],
  },
];
