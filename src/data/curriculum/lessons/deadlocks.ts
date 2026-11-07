import type { Lesson } from "@/types";

/**
 * Module 7 — Deadlocks.
 * When everyone waits forever: the definition and the four Coffman conditions,
 * resource allocation graphs and cycle detection, Banker's algorithm and safe
 * states, then detection and recovery for systems that cannot afford avoidance.
 * Lab conventions: the RAG lab detects cycles and reduces multi-instance
 * graphs; the Banker's lab edits allocation/max/available matrices and either
 * grants a request (with the safe sequence) or denies it (with the reason).
 */
export const lessons: Lesson[] = [
  {
    id: "deadlocks/what-is-deadlock",
    moduleId: "deadlocks",
    title: "What Exactly Is a Deadlock?",
    minutes: 9,
    objectives: [
      "state the formal definition of deadlock and recognize it in a lock trace",
      "list the four Coffman conditions and explain why all four are required",
      "distinguish deadlock from starvation and from livelock",
    ],
    sections: [
      {
        kind: "problem",
        body: [
          "Thread 1 locks file A, then reaches for file B. Thread 2 has just locked B, and reaches for A. Each blocks, politely, waiting for the other to finish. Neither ever will. Nothing crashes, nothing prints an error, CPU utilization may look perfectly healthy — every *other* process runs fine — but these two threads are frozen, permanently, holding resources they will never release. The system has leaked two threads, two locks, and whatever work they were doing.",
          "This is a **deadlock**, and it is nastier than a crash precisely because it is silent and partial. Databases deadlock transactions; file systems deadlock journal locks; browsers deadlock between renderer and compositor threads. Before you can *prevent* or *detect* deadlocks — the rest of this module — you need an exact answer to the question in the title: under precisely what conditions can this freeze happen?",
        ],
      },
      {
        kind: "intuition",
        body: [
          "Two people meet in a narrow hallway, each carrying a box too heavy to put down. Each is too polite to back up, so each stands waiting for the other to move — and neither can, because the hallway is exactly one-person wide and everyone's arms are full. That is hold-and-wait plus no-preemption in one image: resources (floor space) are held while more is requested, and nothing can be forcibly taken away.",
          "Now widen the scene to a four-way intersection where four cars have crept forward into the box, each occupying the quadrant the car to its left needs: a *ring* of waiting — everyone waits for someone, and the ring closes. The formal condition hiding in these pictures is **circular wait**, and it is one of exactly four conditions that must *all* hold before a deadlock can exist. Each picture also suggests a cure — put the boxes down (break hold-and-wait), back up (allow preemption), or agree that nobody enters the intersection until their whole path is clear (break circular wait).",
        ],
      },
      {
        kind: "visual",
        simId: "rag-lab",
        body: [
          "The **Resource Allocation Graph Lab** lets you stage the two-thread scenario precisely: create two processes and two single-instance resources, draw 'held by' and 'wants' edges to match the trace above, and watch the lab flag the cycle and the deadlock.",
          "Then break it from the graph side: delete one 'wants' edge (imagine thread 2 timed out and retried) and watch the deadlock dissolve. The graph is not decoration — every prevention strategy in this module is an edit you can make in this lab.",
        ],
      },
      {
        kind: "technical",
        body: [
          "Formally: a set of processes is **deadlocked** when every member is blocked waiting for an event (specifically, a resource release) that only another member of the set can cause. The key words: *blocked* (not running, not spinning), *every member* (a chain that dead-ends at an idle or external process is not a deadlock), and *only another member* (the cause of the wait circulates inside the set). Deadlocks concern **non-preemptable resources** — locks, printers, tape drives, database rows: things that cannot be snatched back without breaking their owner. CPU time and memory are preemptable, so they do not starve a deadlock by themselves.",
          "In 1971, Coffman, Elphick and Shoshani stated the four **necessary conditions**, often called the Coffman conditions. **Mutual exclusion**: the resource cannot serve two users at once. **Hold and wait**: a process holds some resources while requesting more. **No preemption**: a resource cannot be forcibly taken; it must be released voluntarily. **Circular wait**: a cycle P₁ → P₂ → … → Pₙ → P₁ exists where each process waits for a resource the next holds. *All four* must hold simultaneously — which is why every prevention technique in this module is simply the systematic destruction of one of them.",
          "One necessary condition deserves care: with **single-instance** resources, circular wait is also *sufficient* — a cycle means deadlock, no exceptions. With **multi-instance** resources (three printers, a semaphore counting four slots), a cycle can exist while everyone eventually proceeds; the cycle is then only a suspicion, and resolving it is the reduction algorithm of lessons 2 and 4. And keep the neighbors straight: **starvation** (module 3) is a process waiting for a *choice* the scheduler could make any moment; **livelock** is processes actively retrying and yielding forever without progress; **deadlock** is waiting for an event that will never occur. All three are 'no progress'; only deadlock is a structural trap.",
        ],
        equations: [
          {
            expr: "Deadlock ⟹ mutual exclusion ∧ hold-and-wait ∧ no preemption ∧ circular wait",
            symbols: [
              { sym: "⟹", meaning: "if a deadlock exists, then all four conditions hold (necessity)" },
              { sym: "∧", meaning: "logical AND — each condition is required, none alone is enough" },
            ],
            note: "The converse needs single-instance resources: with those, the cycle alone is sufficient. Prevention works by making at least one condition impossible to satisfy.",
          },
          {
            expr: "Cycle in the wait-for graph ⟺ deadlock (single-instance resources)",
            symbols: [
              { sym: "wait-for graph", meaning: "nodes are processes; an edge P → Q means P waits for a resource Q holds" },
            ],
            note: "Dropping resource nodes from the RAG gives the wait-for graph — the form detection uses in lesson 4.",
          },
        ],
      },
      {
        kind: "worked-example",
        steps: [
          {
            title: "A two-lock deadlock, condition by condition",
            body: [
              "Trace: `T1: lock(A)` — acquired. `T2: lock(B)` — acquired. `T1: lock(B)` — blocks (T2 holds B). `T2: lock(A)` — blocks (T1 holds A). Nothing further happens, ever.",
              "Audit the four conditions: mutual exclusion — each lock serves one thread at a time. Hold and wait — T1 holds A while wanting B; T2 holds B while wanting A. No preemption — locks cannot be grabbed from their holder. Circular wait — T1 → T2 → T1. All four hold: the threads are deadlocked, and the system will hold them (and their locks) until a human intervenes.",
            ],
          },
          {
            title: "The same trace, one edit earlier",
            body: [
              "Now suppose both threads follow the *global* order A-then-B. Rerun it: T1 takes A. T2 asks for A first — and blocks immediately, holding nothing. T1 takes B, finishes its work, releases A and B; T2 unblocks, takes A, and proceeds. No deadlock.",
              "That one edit — **lock ordering** — is the most widely deployed deadlock prevention in existence, and it works by destroying exactly one Coffman condition: circular wait. Two threads can never hold each other's target because neither acquires a lower-ordered lock while holding a higher-ordered one. The trade-off (all code must agree on the order) is the price you will weigh in the next lesson.",
            ],
          },
        ],
      },
      {
        kind: "misconceptions",
        items: [
          {
            wrong: "A deadlock is a kind of crash — something errors out and dies.",
            right: "Nothing fails. Deadlocked threads are *blocked*, indistinguishable from normally waiting threads to any code that does not look. The system keeps running; the victims and their resources are simply lost until something detects and breaks the situation.",
          },
          {
            wrong: "A starved process is deadlocked — both mean 'never runs'.",
            right: "Starvation waits for a *decision* that could be made at any moment (the scheduler keeps choosing others); deadlock waits for an *event* that cannot occur (every entity that could trigger it is itself stuck). Aging cures starvation; only preemption, rollback or killing cures deadlock.",
          },
        ],
      },
      {
        kind: "knowledge-check",
        questions: [
          {
            id: "kc-m7-what-1",
            q: "Which set lists exactly the four Coffman conditions?",
            options: [
              "Mutual exclusion, hold-and-wait, no preemption, circular wait",
              "Mutual exclusion, starvation, preemption, round-robin",
              "Hold-and-wait, aging, circular wait, safe state",
              "Mutual exclusion, no preemption, livelock, critical section",
            ],
            answerIndex: 0,
            explanation:
              "The Coffman conditions are: mutual exclusion, hold-and-wait, no preemption, circular wait. All four must hold for a deadlock; destroying any one prevents it.",
          },
          {
            id: "kc-m7-what-2",
            q: "A low-priority batch job has not run for days while high-priority jobs keep arriving. Is it deadlocked?",
            options: [
              "No — that is starvation; nothing is held and the scheduler could run it at any time",
              "Yes — 'never runs' is the definition of deadlock",
              "Yes — but only if the job is in a ready state",
              "No — it is livelock, since the scheduler is actively deciding",
            ],
            answerIndex: 0,
            explanation:
              "No resource is held against it and no cycle exists — the scheduler simply keeps choosing others. Aging or a policy change fixes it; that is the starvation/deadlock boundary from module 3.",
          },
        ],
      },
      {
        kind: "references",
        items: [
          {
            label: "OSTEP, Chapter 32: Common Concurrency Problems",
            url: "https://pages.cs.wisc.edu/~remzi/OSTEP/threads-bugs.pdf",
            note: "deadlock definition, Coffman conditions and prevention — this module's course text",
          },
          {
            label: "OSTEP, Chapter 28: Locks",
            url: "https://pages.cs.wisc.edu/~remzi/OSTEP/threads-locks.pdf",
            note: "the lock machinery whose misuse creates the deadlock",
          },
        ],
      },
      {
        kind: "note",
        body: [
          "The RAG lab models processes and resources as pure nodes with 'held' and 'wants' edges — no time, no retries, no timeouts. Real deadlocks also arise over network sockets, database transactions and distributed leases, where detection involves clocks and message passing that this lab deliberately excludes.",
        ],
      },
    ],
  },
  {
    id: "deadlocks/resource-allocation-graphs",
    moduleId: "deadlocks",
    title: "Resource Allocation Graphs",
    minutes: 10,
    objectives: [
      "draw and interpret a resource allocation graph with request and assignment edges",
      "apply the rule 'cycle = deadlock' and state exactly when it fails",
      "run the reduction algorithm on a multi-instance graph and read the result",
    ],
    sections: [
      {
        kind: "problem",
        body: [
          "'Two threads each hold what the other wants' is easy to see at a whiteboard with two threads. In a real system — dozens of processes, hundreds of resources, some with many identical instances — you need a *notation* that answers two questions mechanically: is this system deadlocked right now? And if this process gets this resource, could it deadlock later?",
          "The notation is the **resource allocation graph** (RAG): a picture whose arrows carry exactly the information deadlock analysis needs. This lesson teaches you to read it, to apply its beautiful special case (a cycle means deadlock — sometimes), and to run the algorithm that settles the ambiguous cases.",
        ],
      },
      {
        kind: "intuition",
        body: [
          "Think of the RAG as a map of debts. Circles are people (processes); squares are banks (resource types), with a dot for every unit the bank holds. An arrow from a person to a bank is a loan *requested*; an arrow from a bank's dot to a person is a loan *granted* (an assignment edge). Everyone wants to be debt-free: a person with no pending requests can 'finish', returning everything they hold.",
          "A **cycle** of arrows — person A waits on a bank whose money is with B, who waits on a bank whose money is with A — is a closed loop of IOUs. If each bank has exactly one unit, the loop can never unwind: deadlock. But if a bank has two units and a third person — with no debts — holds the spare, that person can finish and repay, the loop's weakest link dissolves, and the chain unwinds. The picture tells you which world you are in at a glance.",
        ],
      },
      {
        kind: "visual",
        simId: "rag-lab",
        body: [
          "The **RAG Lab** draws processes as circles and resources as squares (with one dot per instance), and takes 'request' and 'assignment' edges from you. Its **cycle detection** highlights any closed loop among the arrows.",
          "Its second power is the one to watch: with multi-instance resources, the lab runs **reduction** — it repeatedly finishes any process with no pending requests, deletes its edges, and releases its instances — and reports which processes, if any, remain stuck. Build the same cycle twice, once with single-instance resources and once with a spare instance held by an idle process, and compare what the two analyses say.",
        ],
      },
      {
        kind: "experiment",
        simId: "rag-lab",
        prompts: [
          "Build P1 → R2 (request), R2 → P2 (assignment), P2 → R1 (request), R1 → P1 (assignment), with R1 and R2 single-instance. Confirm the lab calls it a deadlock. How many processes are on the cycle, and does any process *off* the cycle matter?",
          "Give R1 a second instance and hand it to a new process P3 that requests nothing. Run reduction. The cycle is still on screen — why is the answer now 'no deadlock'?",
          "Make P3 request R2 as well. Re-run the analysis and explain what changed: whose completion was the loop's escape hatch, and what does its loss cost?",
        ],
        body: [
          "Lab conventions: a process is 'reducible' when it has no outstanding request edges; reduction repeatedly completes such processes and releases their assignment edges. What remains unreduced after the fixpoint is deadlocked.",
        ],
      },
      {
        kind: "technical",
        body: [
          "The **RAG** has two node types: process circles Pᵢ and resource squares Rⱼ, each square holding one dot per *instance*. Two edge types: a **request edge** P → R (process P is waiting for an instance of R) and an **assignment edge** R → P (one instance of R is currently allocated to P). A **claim edge** (dashed, P ⇢ R) may be drawn for resources a process will eventually request — the raw material of avoidance, next lesson. The graph changes only when processes request, acquire, or release.",
          "**Cycle analysis.** A cycle is a *necessary* condition for deadlock: no cycle, no deadlock — ever. With **single-instance** resources it is also *sufficient*: each resource on the cycle has one instance, held by the next process on the cycle, so no member of the cycle can ever be satisfied. With **multi-instance** resources the sufficiency breaks — the cycle says *someone on it is blocked*, but a third party holding an extra instance may be able to finish and feed the chain.",
          "**Reduction** settles multi-instance cases. A process with no outstanding requests is not blocked: pretend it finishes, remove its request edges (it has none) and its assignment edges (it releases everything it holds), making those instances available. Repeat until no further process can be reduced. If every process reduces, the system is *not* deadlocked — the order in which they reduced is a legal completion order. Whatever remains unreduced is deadlocked, and (with one subtlety) that set is unique regardless of reduction order. Reduction *is* the deadlock detection algorithm — lesson 4 runs it in matrix form.",
        ],
        equations: [
          {
            expr: "Cycle ⟹ deadlock possible;   single-instance ∧ cycle ⟹ deadlock",
            symbols: [
              { sym: "⟹", meaning: "implication — the right side must hold" },
              { sym: "single-instance", meaning: "every resource type on the cycle has exactly one instance" },
            ],
            note: "Necessity always holds: no cycle, no deadlock. Sufficiency needs single-instance resources; otherwise run reduction.",
          },
          {
            expr: "Reducible(P) ⟺ P has no outstanding request edges",
            symbols: [
              { sym: "Reducible(P)", meaning: "P can finish with the resources it already holds" },
            ],
            note: "Reduction: complete P, delete its edges, free its instances, repeat to fixpoint. Unreduced processes are the deadlocked set.",
          },
        ],
      },
      {
        kind: "worked-example",
        steps: [
          {
            title: "A cycle that is not a deadlock",
            body: [
              "Setup: R1 has **2 instances**, R2 has 1. P1 holds one R1 and requests R2. P2 holds R2 and requests R1. P3 holds the second R1 and requests nothing. The cycle P1 → R2 → P2 → R1 → P1 is visible — under the single-instance rule this would be a deadlock.",
              "Run reduction: P3 has no requests → finishes → releases its R1 instance. Now P2's request for R1 is satisfiable → P2 finishes → releases R2. Now P1 gets R2 → finishes. Every process reduced: **no deadlock**, despite the cycle on screen.",
            ],
          },
          {
            title: "Kill the escape hatch and the cycle closes",
            body: [
              "Add one edge: P3 requests R2. Now nobody is reducible: P1 waits on R2, P2 waits on R1, P3 waits on R2 — and R2's single instance sits with P2, who waits too. Reduction stalls at step zero.",
              "The deadlocked set is now {P1, P2, P3} — note that P3 deadlocked *without being on the original cycle*: it is a casualty chained to a victim. Detection (lesson 4) must therefore report whole sets, not just loops.",
            ],
          },
        ],
      },
      {
        kind: "misconceptions",
        items: [
          {
            wrong: "A cycle in the RAG always means the system is deadlocked.",
            right: "A cycle is always *necessary* but only *sufficient* when every resource on it has a single instance. With multi-instance resources, run reduction: a spare instance held by an off-cycle process can unwind the whole loop (as the worked example shows).",
          },
          {
            wrong: "Only the processes on the cycle are deadlocked.",
            right: "Processes off the cycle can be chained to it — waiting for a resource that only a cycle member will ever release. Reduction handles this naturally: the deadlocked set is whatever remains unreduced, and it can be larger than the cycle.",
          },
        ],
      },
      {
        kind: "knowledge-check",
        questions: [
          {
            id: "kc-m7-rag-1",
            q: "In a resource allocation graph, what does an edge R2 → P1 mean?",
            options: [
              "An instance of R2 is currently allocated to (held by) P1",
              "P1 has a pending request for an instance of R2",
              "P1 is allowed to preempt R2",
              "R2 sends a completion signal to P1",
            ],
            answerIndex: 0,
            explanation:
              "Assignment edges run resource → process (who holds it); request edges run process → resource (who wants it). Direction is the whole grammar of the graph.",
          },
          {
            id: "kc-m7-rag-2",
            q: "All resources in a system have exactly one instance. A cycle appears in the RAG. What is true?",
            options: [
              "Exactly the processes on the cycle are deadlocked",
              "No deadlock — cycles only warn",
              "The whole system halts, including processes off the cycle",
              "Depends on the scheduler's quantum",
            ],
            answerIndex: 0,
            explanation:
              "With single-instance resources a cycle is necessary and sufficient for deadlock, and the victims are precisely the cycle's members. Off-cycle processes may be inconvenienced but they are not deadlocked.",
          },
        ],
      },
      {
        kind: "references",
        items: [
          {
            label: "OSTEP, Chapter 32: Common Concurrency Problems",
            url: "https://pages.cs.wisc.edu/~remzi/OSTEP/threads-bugs.pdf",
            note: "deadlock avoidance and prevention around lock acquisition order",
          },
          {
            label: "man7: pthreads(7) — POSIX threads overview",
            url: "https://man7.org/linux/man-pages/man7/pthreads.7.html",
            note: "the lock primitives whose call graphs the RAG models",
          },
        ],
      },
      {
        kind: "note",
        body: [
          "The lab draws one square per resource *type* with dots per instance and reduces instantly at each edit; real deadlock analysis in databases and file systems runs over lock tables that change thousands of times per second, and distributed systems cannot even draw one shared graph — each node sees only its own edges.",
        ],
      },
    ],
  },
  {
    id: "deadlocks/bankers-algorithm",
    moduleId: "deadlocks",
    title: "Banker's Algorithm & Safe States",
    minutes: 11,
    objectives: [
      "compute the need matrix and run the safety algorithm to find a safe sequence",
      "decide a resource request: grant with proof, or deny with the reason",
      "distinguish safe, unsafe and deadlocked states precisely",
    ],
    sections: [
      {
        kind: "problem",
        body: [
          "Prevention (breaking a Coffman condition globally) is blunt: 'acquire everything up front' wastes resources; 'total ordering' needs every programmer's cooperation. Detection-and-recovery, next lesson, lets the damage happen. Between them sits a third idea, due to Dijkstra: **avoidance** — stay flexible, but refuse to *enter* any state from which deadlock could follow. The system keeps running normally until someone asks for a resource; then, before granting, it asks one question: *if I say yes, can I still guarantee everyone can eventually finish?*",
          "Answering that question needs one piece of foresight nobody likes admitting: each process must declare, in advance, the **maximum** of each resource it might ever hold. With that, the grant decision becomes pure arithmetic — Dijkstra's Banker's algorithm, run at every request.",
        ],
      },
      {
        kind: "intuition",
        body: [
          "A cautious bank lends from a fixed vault. Before approving a loan, the manager asks: *is there some order in which all my borrowers could repay, given what's in the vault now?* Repay the corner shop, the vault grows; repay the factory, it grows more; if every borrower can be paid off in *some* order, today's loans are safe. If no order works — the vault is too thin no matter who repays first — the manager defers the new loan and keeps the cash.",
          "The 'safe order' is the **safe sequence**: not a prediction of what will happen, but a proof that it *could*. The bank never promises deadlock-freedom in the abstract — it promises never to approve a loan that would destroy the possibility of an orderly wind-down. That is exactly the state the OS maintains over processes and their max claims.",
        ],
      },
      {
        kind: "visual",
        simId: "bankers-lab",
        body: [
          "The **Banker's Algorithm Lab** shows editable **Allocation**, **Max** and **Available** matrices, computes **Need = Max − Allocation** for you, and exposes the safety computation step by step: which process was picked, what Work grew to, what sequence was found — or the exact point where none could proceed.",
          "Type a **Request** row for one process and the lab does what the banker does: tentatively grants it, re-runs safety, and answers either *granted, here is the safe sequence* or *denied, here is the reason* (request exceeds need, exceeds available, or would leave the state unsafe).",
        ],
      },
      {
        kind: "experiment",
        simId: "bankers-lab",
        prompts: [
          "Rebuild the worked example: Available 3; Allocation P0=5, P1=2, P2=2; Max P0=10, P1=4, P2=9. Run safety and confirm the sequence ⟨P1, P0, P2⟩. Try to find any *other* safe sequence — how many exist for this state?",
          "Submit P2's request for 1 unit. Read the denial: which processes could still finish after the tentative grant, and at what Work value did the check stall?",
          "Submit P1's request for 1 unit instead. Confirm it is granted and the safe sequence survives. Why does the same-sized request get opposite answers for different processes?",
          "Drop Available to 1 (imagine other work consumed it) and run safety with no new request. The state is unsafe but nobody is blocked — reconcile that with the definitions before moving on.",
        ],
        body: [
          "Lab conventions: single resource type in these scenarios, integer units, and safety re-computed from scratch on every edit. Denial reasons follow the textbook order: request ≤ need, request ≤ available, then the safety check.",
        ],
      },
      {
        kind: "technical",
        body: [
          "The bookkeeping, for n processes and m resource types: **Allocation**ᵢⱼ (what Pᵢ holds of Rⱼ), **Max**ᵢⱼ (what Pᵢ may ever need), **Available**ⱼ (free instances of Rⱼ), and the derived **Need**ᵢⱼ = Maxᵢⱼ − Allocationᵢⱼ (what Pᵢ could still ask for). A state is **safe** if a sequence of *all* processes exists such that each process's Need can be satisfied by Available plus the resources released by everyone earlier in the sequence — a **safe sequence**. Safety means the OS can always avoid deadlock by choosing whom to satisfy; it does not mean nobody ever blocks.",
          "The **safety algorithm**: set Work ← Available and mark all processes unfinished. Repeatedly find an unfinished Pᵢ with Needᵢ ≤ Work; pretend it runs to completion and releases everything: Work ← Work + Allocationᵢ, mark it finished, append it to the sequence. If all processes finish, the state is safe and the appended order is a safe sequence; if you stall with unfinished processes remaining, the state is **unsafe**.",
          "The **grant rule**: when Pᵢ requests Requestᵢ, first check feasibility — Requestᵢ ≤ Needᵢ (it is not asking beyond its declared max) and Requestᵢ ≤ Available (you have it). Then *tentatively* grant: Available −= Requestᵢ, Allocationᵢ += Requestᵢ, Needᵢ −= Requestᵢ — and re-run safety. Grant if the result is safe; otherwise roll the tentative grant back and make Pᵢ wait. The cost is O(n²·m) per request, and the premise — every process declares its true maximum — is exactly why general-purpose operating systems *don't* run a banker (you cannot predict your browser's peak memory), while some embedded systems, databases and transaction monitors genuinely do.",
          "Keep the three labels straight: **safe** — a completion order exists, deadlock is avoidable. **unsafe** — no completion order exists, so deadlock is *possible*; the banker refuses to go here, but processes are not necessarily stuck yet. **deadlocked** — requests have actually completed the cycle and processes are blocked. Unsafe is a forecast; deadlock is a fact.",
        ],
        equations: [
          {
            expr: "Need = Max − Allocation",
            symbols: [
              { sym: "Max", meaning: "declared maximum demand of the process, per resource type" },
              { sym: "Allocation", meaning: "resources the process currently holds" },
              { sym: "Need", meaning: "the most it could still request — the banker's exposure" },
            ],
            note: "Computed per resource type: Needᵢⱼ = Maxᵢⱼ − Allocationᵢⱼ.",
          },
          {
            expr: "Work ← Available;  pick unfinished Pᵢ with Needᵢ ≤ Work;  Work ← Work + Allocationᵢ;  repeat",
            symbols: [
              { sym: "Work", meaning: "resources that would be available as prior finishers release theirs" },
            ],
            note: "All finish → safe, and the pick-order is a safe sequence. Stall with unfinished processes → unsafe. This is the O(n²·m) core the lab re-runs per edit.",
          },
          {
            expr: "Grant ⟺ Request ≤ Need ∧ Request ≤ Available ∧ safety(tentative state)",
            symbols: [
              { sym: "Request", meaning: "the incoming request vector from one process" },
            ],
            note: "Failing the first two is a trivial denial; failing the third means 'wait now, retry later' — the request itself was legal.",
          },
        ],
      },
      {
        kind: "worked-example",
        steps: [
          {
            title: "One resource type, three processes, one safe sequence",
            body: [
              "Total instances: 12. Available = 3. Allocation: P0 = 5, P1 = 2, P2 = 2. Max: P0 = 10, P1 = 4, P2 = 9. Need = Max − Allocation: P0 = 5, P1 = 2, P2 = 7.",
              "Safety: Work = 3. P0 needs 5 > 3, P1 needs 2 ≤ 3 → P1 finishes, Work = 3 + 2 = 5. P0 needs 5 ≤ 5 → P0 finishes, Work = 10. P2 needs 7 ≤ 10 → finishes. **Safe**, sequence ⟨P1, P0, P2⟩. Note the order matters: ⟨P1, P2, P0⟩ fails because P2 needs 7 while Work is only 5 — for this state, ⟨P1, P0, P2⟩ is the *only* safe sequence.",
            ],
          },
          {
            title: "A request the banker must refuse",
            body: [
              "P2 requests 1 unit. Feasible: 1 ≤ Need 7 and 1 ≤ Available 3. Tentatively grant: Available = 2, Allocation P2 = 3, Need P2 = 6. Safety re-run: Work = 2 → only P1 (need 2) finishes → Work = 4. P0 needs 5 > 4; P2 needs 6 > 4. Stall — **unsafe**. Roll back; P2 waits.",
              "Contrast: P1 requests 1 unit. Tentative state: Available = 2, Need P1 = 1. Safety: P1 (1 ≤ 2) → Work 5 → P0 → Work 10 → P2. Safe → **grant**. Same request size, opposite verdicts — the banker judges states, not requests.",
            ],
          },
        ],
      },
      {
        kind: "misconceptions",
        items: [
          {
            wrong: "An unsafe state means the system is deadlocked.",
            right: "Unsafe means *no guarantee*: no completion order exists, so a deadlock is possible if processes exercise their remaining needs. Nothing is blocked yet. The banker treats unsafe as untouchable — prevention by refusing the risk — but the actual deadlock only materializes when the requests complete a cycle.",
          },
          {
            wrong: "Real operating systems run Banker's algorithm to stay deadlock-free.",
            right: "They almost never do: it requires every process to declare its true maximum demand in advance and fixes the resource counts. General-purpose OSes prevent with lock ordering and detect-and-recover (or just hang); bankers live in constrained embedded systems and inside some databases and transaction schedulers.",
          },
        ],
      },
      {
        kind: "knowledge-check",
        questions: [
          {
            id: "kc-m7-bankers-1",
            q: "In Banker's algorithm, what does the Need matrix represent?",
            options: [
              "Max minus Allocation — the most each process could still request",
              "Allocation minus Available — what is owed back to the system",
              "The order in which processes must run",
              "Resources each process is guaranteed to receive",
            ],
            answerIndex: 0,
            explanation:
              "Needᵢⱼ = Maxᵢⱼ − Allocationᵢⱼ: the banker's remaining exposure to each process. The safety algorithm asks, repeatedly, whether some process's Need fits in what Work can offer.",
          },
          {
            id: "kc-m7-bankers-2",
            q: "Two resource types A and B. Available = (1, 0). Allocation — P0: (1,0), P1: (1,1), P2: (0,1). Max — P0: (2,2), P1: (2,1), P2: (1,2). Which is a safe sequence?",
            options: [
              "⟨P1, P2, P0⟩",
              "⟨P0, P1, P2⟩",
              "⟨P2, P1, P0⟩",
              "⟨P1, P0, P2⟩",
            ],
            answerIndex: 0,
            explanation:
              "Needs: P0 (1,2), P1 (1,0), P2 (1,1). Work (1,0): only P1 fits → Work (2,1). Then P2 (1,1) fits → Work (2,2). Then P0. ⟨P0,…⟩ and ⟨P2,…⟩ fail immediately (B is short), and ⟨P1, P0, P2⟩ fails because P0 needs 2 of B against Work's 1.",
          },
        ],
      },
      {
        kind: "references",
        items: [
          {
            label: "OSTEP, Chapter 32: Common Concurrency Problems",
            url: "https://pages.cs.wisc.edu/~remzi/OSTEP/threads-bugs.pdf",
            note: "where avoidance sits among prevention, detection and recovery",
          },
          {
            label: "Wikipedia: Banker's algorithm",
            url: "https://en.wikipedia.org/wiki/Banker%27s_algorithm",
            note: "Dijkstra's original framing, the full multi-type example, and critiques",
          },
        ],
      },
      {
        kind: "note",
        body: [
          "The lab uses integer units and re-runs safety from scratch on every edit, instantly. A real banker also needs atomic snapshots of all three matrices, a policy for processes that never reach their max, and a distributed version if resources span machines — none of it simulated here.",
        ],
      },
    ],
  },
  {
    id: "deadlocks/detection-recovery",
    moduleId: "deadlocks",
    title: "Detection & Recovery",
    minutes: 10,
    objectives: [
      "run the detection algorithm (reduction) and identify the deadlocked process set",
      "choose when a system should invoke detection, and why",
      "compare recovery strategies — kill, rollback, preemption — and their costs",
    ],
    sections: [
      {
        kind: "problem",
        body: [
          "Banker's avoidance has an impossible price for most systems: every process must predict its own resource appetite in advance. So general-purpose systems — and databases above all — take the opposite bargain: *let deadlocks happen*. Processes acquire whatever they acquire; nothing is refused up front. In exchange, the system accepts two duties: **detect** the deadlock once it exists, and **recover** from it by sacrificing something.",
          "This is the smoke-detector design: prevention by never letting anyone cook is unworkable, so instead you install sensors (detection), decide how often to check them (invocation policy), and rehearse the fire drill (recovery). The engineering questions are all about cost — how often to look, what to give up, and who chooses the victim.",
        ],
      },
      {
        kind: "intuition",
        body: [
          "Detection is the reduction game from lesson 2, played by an referee who never watched the setup: repeatedly ask every player 'can you finish with what's free and what you hold?' Anyone who can, finishes and dumps their resources into the free pile; the freed pile may let the next player finish; whoever *never* can, even after the pile stops growing, is deadlocked. It is solitaire: no knowledge of the future, no decisions refused — just an honest accounting of the present.",
          "Recovery is the referee's penalty decision, and every option hurts. Void the match (kill all deadlocked processes — lose everyone's work). Eject one player at a time (kill a victim, re-run detection, hope the rest proceed — lose only their work, but choose a victim fairly). Rewind (roll back to a checkpoint — lose only the work since the save, but you needed to have been saving). Confiscate (preempt a resource and hand it to someone else — but you can only do that with resources whose state can be transferred, like memory pages, not with half-finished locks).",
        ],
      },
      {
        kind: "visual",
        simId: "rag-lab",
        body: [
          "The **RAG Lab** is your detection workbench: build any configuration — cycles, spare instances, off-cycle bystanders — and its reduction reports the deadlocked set as it stands, no claims or max declarations needed.",
          "Use it to see recovery's mechanics without the pain: identify the deadlocked set, delete one process (your 'kill'), and re-run the reduction. Watch whether the deadlock fully dissolves or merely shrinks — both outcomes are possible, and which one you get depends on what the victim happened to hold.",
        ],
      },
      {
        kind: "experiment",
        simId: "rag-lab",
        prompts: [
          "Single resource type, 3 instances: P1, P2, P3 each hold one instance and each request one more; Available = 0. Run the reduction. Who is deadlocked, and why does holding *and* wanting an instance of the same type not exempt anyone?",
          "Edit the previous graph so P3 requests nothing. Re-run. Confirm the deadlock vanishes — then explain in reduction terms: whose completion fed whose request?",
          "Rebuild the full 3-process deadlock and kill only P2 (delete it). Re-run detection. Did killing one victim resolve the deadlock? If resources remain stuck, what does that tell you about victim selection?",
        ],
        body: [
          "Lab conventions: the reduction fixpoint is recomputed after every edit; 'killing' a process deletes its node and releases its assignment edges. The lab does not model lost work, checkpoints or retries — the costs are yours to reason about.",
        ],
      },
      {
        kind: "technical",
        body: [
          "**Detection, single-instance case.** Collapse the RAG to the **wait-for graph**: one node per process, edge P → Q if P waits for a resource that Q holds. With single-instance resources, deadlock ⟺ a cycle. Detection is cycle-finding — cheap enough to run on demand, e.g. whenever a lock wait exceeds a threshold.",
          "**Detection, general case.** Run the reduction (the safety algorithm's sibling, minus the max declarations): Work ← Available; Finishᵢ ← false for all. Repeatedly pick a process with Finishᵢ = false and Requestᵢ ≤ Work — its current request is satisfiable, so it *could* finish — set Work ← Work + Allocationᵢ, Finishᵢ ← true. At the fixpoint, every process with Finishᵢ = false is **deadlocked**. Note the difference from the banker: this uses *current requests*, not declared maxima, so nothing was refused along the way — you learn the truth only after it is true.",
          "**Invocation policy.** Detection costs CPU, so when to run it? Options: on every impossible-to-satisfy wait (too often), periodically (every hour?), or **when symptoms appear** — CPU utilization dropping while process counts stay high is the classic thrash-then-deadlock signal, since deadlocked processes consume zero CPU. The trade-off: rare detection means long deadlocks (throughput and victims pile up); frequent detection burns cycles on systems that rarely deadlock.",
          "**Recovery.** Three families, in increasing sophistication. *Termination*: kill all deadlocked processes (brutal, certain), or kill one and re-run detection, repeating until clear — choosing victims by cost: how much work lost, what resources released, what priority. *Rollback*: periodically checkpoint processes (save state), and on detection restore a victim to its checkpoint — the deadlock never happened *for that process*; it repeats its recent past. *Preemption*: forcibly transfer a resource to another process — only sane for resources whose state can be handed over (memory pages) — and watch for a new hazard: if the same process is always the victim, it is *starved* by the recovery algorithm itself; the fix is to include victim history in the cost function. Where do you meet this daily? Databases: the engine runs detection continuously over its lock table and recovers by aborting a transaction — rollback was free because transactions are already designed to undo.",
        ],
        equations: [
          {
            expr: "Work ← Available;  pick unfinished Pᵢ with Requestᵢ ≤ Work;  Work ← Work + Allocationᵢ;  repeat",
            symbols: [
              { sym: "Requestᵢ", meaning: "Pᵢ's *current* outstanding request (not its declared max)" },
              { sym: "Finishᵢ", meaning: "false while Pᵢ cannot (even hypothetically) finish" },
            ],
            note: "Fixpoint: processes with Finish = false are the deadlocked set. Compare with the banker's safety loop — same shape, different inputs.",
          },
          {
            expr: "Deadlocked set = { Pᵢ : Finishᵢ = false at fixpoint }",
            symbols: [
              { sym: "fixpoint", meaning: "no further process's request fits Work" },
            ],
            note: "The set can include processes off every cycle — bystanders chained to victims. Detection reports sets, not just loops.",
          },
        ],
      },
      {
        kind: "worked-example",
        steps: [
          {
            title: "Detection, step by step",
            body: [
              "One resource type, 3 instances. Allocation: P1 = 1, P2 = 1, P3 = 1. Requests: P1 = 1, P2 = 1, P3 = 1. Available = 0.",
              "Reduction: Work = 0; every request (1) > 0 — nobody can finish. Fixpoint immediately. Deadlocked set = {P1, P2, P3}. Note each process holds *and* wants an instance of the same type — irrelevant: what matters is only whether requests fit Work.",
            ],
          },
          {
            title: "One edit clears the board — and one kill does not",
            body: [
              "Change P3's request to 0. Reduction: P3 finishes (Work = 1) → P1's request fits (Work = 2) → P2 fits (Work = 3). Deadlocked set: empty. One process's changed appetite unblocked the entire chain.",
              "Back to the full deadlock, but now recover by killing P2 alone: its instance is released (Work = 1). P1's request (1 ≤ 1) fits → P1 finishes (Work = 2) → P3 fits. Resolved with one kill — but only because P2's release unblocked P1. Kill P1 instead and P2 is satisfied by the same release; kill either and the chain unwinds here. In denser graphs, a single kill can leave the rest stuck — hence the kill-one-re-detect-restart loop.",
            ],
          },
        ],
      },
      {
        kind: "misconceptions",
        items: [
          {
            wrong: "Running detection prevents deadlocks.",
            right: "Detection finds deadlocks *after* they form — damage (blocked processes, stalled work) has already occurred. It is the first half of a bargain whose second half, recovery, does the actual unwinding. Only prevention or avoidance stop the deadlock from existing.",
          },
          {
            wrong: "Recovery is cheap — just kill a process and move on.",
            right: "Every recovery option destroys something: killed processes lose all their work; rollback needs checkpoints that cost storage and time; preemption risks starving whichever process is repeatedly chosen as victim. Victim selection is an economics problem, not a formality.",
          },
        ],
      },
      {
        kind: "knowledge-check",
        questions: [
          {
            id: "kc-m7-detect-1",
            q: "In a system where every resource has exactly one instance, deadlock detection reduces to checking for what?",
            options: [
              "A cycle in the wait-for graph",
              "A safe sequence in the banker's matrices",
              "A process with zero allocations",
              "Available resources equal to zero",
            ],
            answerIndex: 0,
            explanation:
              "With single-instance resources, collapse the RAG to the wait-for graph (P → Q: P waits for something Q holds); a cycle there is exactly a deadlock. Banker's machinery is not needed — no maxima were ever declared.",
          },
          {
            id: "kc-m7-detect-2",
            q: "Detection has identified a deadlock and you killed one victim, releasing its resources. What happens next?",
            options: [
              "Re-run detection — the deadlock may be fully resolved or may persist among the survivors",
              "Nothing — killing any victim always resolves the whole deadlock",
              "Restart the entire operating system",
              "Grant the remaining processes their requests immediately",
            ],
            answerIndex: 0,
            explanation:
              "The victim's released resources unblock *some* processes, but a smaller deadlock among the survivors is entirely possible — standard practice is kill-one, re-detect, repeat until the fixpoint is clean.",
          },
        ],
      },
      {
        kind: "references",
        items: [
          {
            label: "OSTEP, Chapter 32: Common Concurrency Problems",
            url: "https://pages.cs.wisc.edu/~remzi/OSTEP/threads-bugs.pdf",
            note: "detection, recovery, and why real systems prefer prevention where they can afford it",
          },
          {
            label: "man7: pthread_mutex_lock(3)",
            url: "https://man7.org/linux/man-pages/man3/pthread_mutex_lock.3.html",
            note: "trylock and timed variants — the practical escape hatch that lets code detect-and-back-off",
          },
        ],
      },
      {
        kind: "note",
        body: [
          "The lab's recovery is deletion: victims lose nothing, checkpoints don't exist, and resources transfer instantly. Real recovery weighs lost work against release value, may cascade (killing one process frees a lock another deadlocked process was waiting on *and* one it merely borrowed), and in distributed databases needs global agreement about who is deadlocked — a problem an order of magnitude harder than this lab's fixpoint.",
        ],
      },
    ],
  },
];
