import type { GlossaryEntry } from "@/types";

/**
 * Glossary — module 7 (Deadlocks).
 * Cross-links: "starvation" (cpu-scheduling), "mutex", "semaphore",
 * "process", "thread", "critical-section" exist elsewhere in the glossary.
 */
export const entries: GlossaryEntry[] = [
  {
    id: "deadlock",
    term: "Deadlock",
    simple: "A circle of processes each waiting forever for something only another member can release.",
    technical:
      "A state in which every member of a set of processes is blocked waiting for an event (a resource release) that only another member of the set can cause; structurally impossible to resolve without preemption, rollback or killing, since no member can proceed to release anything.",
    example:
      "Thread 1 holds lock A and wants B; thread 2 holds B and wants A — both block permanently, holding everything they own.",
    related: ["coffman-conditions", "circular-wait", "rag", "starvation", "process"],
    moduleId: "deadlocks",
    lessonRef: "deadlocks/what-is-deadlock",
    simId: "rag-lab",
    refUrl: "https://pages.cs.wisc.edu/~remzi/OSTEP/threads-bugs.pdf",
    refLabel: "OSTEP ch. 32: Common Concurrency Problems",
  },
  {
    id: "coffman-conditions",
    term: "Coffman conditions",
    simple: "The four conditions — mutual exclusion, hold-and-wait, no preemption, circular wait — that must ALL hold for a deadlock.",
    technical:
      "Coffman, Elphick & Shoshani (1971): deadlock is possible only when resources are non-shareable, processes hold resources while requesting more, held resources cannot be forcibly taken, and a cycle of waiting exists; all four are necessary, and destroying any one (prevention) makes deadlock impossible.",
    example:
      "Lock-ordering rules destroy circular wait; acquiring all resources up front destroys hold-and-wait — either suffices to prevent deadlock.",
    related: ["deadlock", "circular-wait", "hold-and-wait", "no-preemption"],
    moduleId: "deadlocks",
    lessonRef: "deadlocks/what-is-deadlock",
    refUrl: "https://pages.cs.wisc.edu/~remzi/OSTEP/threads-bugs.pdf",
    refLabel: "OSTEP ch. 32: Common Concurrency Problems",
  },
  {
    id: "rag",
    term: "Resource allocation graph",
    simple: "A picture of who holds what (resource → process) and who wants what (process → resource).",
    technical:
      "The directed graph with process nodes and resource-type nodes (one dot per instance), request edges P→R, and assignment edges R→P (claim edges optional for avoidance); cycle analysis settles single-instance systems, and reduction settles multi-instance ones.",
    example:
      "P1 → R2 → P2 → R1 → P1 with R1 single-instance: a deadlock. Give R1 a second instance held by an idle P3 and the same cycle is harmless.",
    related: ["deadlock", "circular-wait", "wait-for-graph", "no-preemption"],
    moduleId: "deadlocks",
    lessonRef: "deadlocks/resource-allocation-graphs",
    simId: "rag-lab",
  },
  {
    id: "circular-wait",
    term: "Circular wait",
    simple: "A ring of waiting: P1 waits for what P2 holds, P2 for P3's, …, Pn for P1's.",
    technical:
      "The Coffman condition in which a cycle P₁ → P₂ → … → Pₙ → P₁ exists with each Pᵢ waiting for a resource held by Pᵢ₊₁; necessary for deadlock and sufficient when every resource on the cycle has a single instance. Destroyed in practice by global resource (lock) ordering.",
    example:
      "Thread 1 holds A wants B, thread 2 holds B wants A: a 2-cycle. Ordering every lock acquisition A-then-B makes the ring unclosable.",
    related: ["coffman-conditions", "deadlock", "hold-and-wait", "rag", "resource-hierarchy"],
    moduleId: "deadlocks",
    lessonRef: "deadlocks/what-is-deadlock",
  },
  {
    id: "hold-and-wait",
    term: "Hold-and-wait",
    simple: "Grabbing something new without letting go of what you already have.",
    technical:
      "The Coffman condition in which a process holds at least one resource while blocked requesting additional ones; the pattern that lets one blocked process freeze everything it holds. Prevented by requiring all-or-nothing acquisition (request everything up front) — at a cost in utilization.",
    example:
      "A thread holding lock A calls lock(B): if B is held elsewhere, A is frozen too — hold-and-wait is the amplifier that turns one wait into a chain.",
    related: ["coffman-conditions", "circular-wait", "deadlock", "mutex"],
    moduleId: "deadlocks",
    lessonRef: "deadlocks/what-is-deadlock",
  },
  {
    id: "no-preemption",
    term: "No preemption",
    simple: "What's held can't be snatched — a resource leaves its owner only voluntarily.",
    technical:
      "The Coffman condition that resources cannot be forcibly reallocated from a holding process; valid for stateful exclusive resources (locks, printers, tape drives) where seizure corrupts state. Its destruction — preemption — is viable only for transferable resources and is one route to deadlock recovery.",
    example:
      "You cannot take a mutex from its holder (another thread would believe it exclusive); you can preempt memory pages, which is why page replacement never deadlocks.",
    related: ["coffman-conditions", "deadlock", "deadlock-recovery", "mutex"],
    moduleId: "deadlocks",
    lessonRef: "deadlocks/what-is-deadlock",
  },
  {
    id: "safe-state",
    term: "Safe state",
    simple: "A state from which some order of letting everyone finish still exists — deadlock is avoidable from here.",
    technical:
      "A Banker's-algorithm state for which a safe sequence exists: an ordering of all processes where each can obtain its remaining Need from Available plus the resources released by earlier finishers; unsafe states (no such order) are refused by avoidance even though nothing is blocked in them yet.",
    example:
      "Available 3 with Needs 5, 2, 7: safe via ⟨P1, P0, P2⟩ — but P0 cannot be served first (5 > 3), so the ORDER matters, not just feasibility.",
    related: ["safe-sequence", "bankers-algorithm", "deadlock", "deadlock-detection"],
    moduleId: "deadlocks",
    lessonRef: "deadlocks/bankers-algorithm",
    simId: "bankers-lab",
  },
  {
    id: "safe-sequence",
    term: "Safe sequence",
    simple: "A completion order that proves the current state can still avoid deadlock.",
    technical:
      "In the safety algorithm, the order in which unfinished processes are picked (each with Need ≤ Work, then Work += Allocation) such that all processes finish; its existence defines a safe state, and finding none classifies the state as unsafe.",
    example:
      "From ⟨P1, P0, P2⟩ the banker can promise: whatever happens, everyone can eventually complete — some states have exactly one such sequence.",
    related: ["safe-state", "bankers-algorithm", "deadlock-detection"],
    moduleId: "deadlocks",
    lessonRef: "deadlocks/bankers-algorithm",
    simId: "bankers-lab",
  },
  {
    id: "bankers-algorithm",
    term: "Banker's algorithm",
    simple: "Grant a resource request only if a safe sequence would still exist afterward.",
    technical:
      "Dijkstra's deadlock-avoidance scheme: each process declares its maximum demand (Max); on a request the banker checks Request ≤ Need and Request ≤ Available, tentatively grants, re-runs the safety algorithm, and either commits (safe) or rolls back and blocks the requester (unsafe). Needs O(n²·m) per request and a-priori maxima — hence rare outside embedded systems and some databases.",
    example:
      "P2 requests 1 unit from a state with Available 3: legal (≤ Need 7, ≤ Available 3) but unsafe after granting (Work stalls at 4) — denied, P2 waits.",
    related: ["safe-state", "safe-sequence", "coffman-conditions", "deadlock"],
    moduleId: "deadlocks",
    lessonRef: "deadlocks/bankers-algorithm",
    simId: "bankers-lab",
    refUrl: "https://en.wikipedia.org/wiki/Banker%27s_algorithm",
    refLabel: "Wikipedia: Banker's algorithm",
  },
  {
    id: "deadlock-detection",
    term: "Deadlock detection",
    simple: "Looking for existing deadlocks: find cycles (single-instance) or run reduction (multi-instance).",
    technical:
      "The discovery half of the detection-and-recovery bargain: with single-instance resources, find a cycle in the wait-for graph; generally, run the reduction fixpoint (Work ← Available; finish any process whose current Request ≤ Work) — whoever remains unfinished is deadlocked. Invoked periodically or on symptoms like falling CPU utilization.",
    example:
      "Three processes each holding and requesting one of 3 instances, Available 0: no request fits Work — all three are deadlocked.",
    related: ["deadlock-recovery", "wait-for-graph", "rag", "safe-state"],
    moduleId: "deadlocks",
    lessonRef: "deadlocks/detection-recovery",
    simId: "rag-lab",
  },
  {
    id: "deadlock-recovery",
    term: "Deadlock recovery",
    simple: "Breaking a detected deadlock by killing, rolling back, or forcibly taking resources.",
    technical:
      "The corrective half of detection-and-recovery: process termination (all at once, or one victim at a time with re-detection), rollback of a victim to a checkpoint, or resource preemption; victims are chosen by cost (work lost, resources released, priority), and repeated victim selection of the same process induces starvation, so victim history enters the cost function.",
    example:
      "Kill one member of a three-process cycle, re-run detection: its released resource may clear the rest — or leave a smaller deadlock, requiring another round.",
    related: ["deadlock-detection", "deadlock", "no-preemption", "starvation"],
    moduleId: "deadlocks",
    lessonRef: "deadlocks/detection-recovery",
    simId: "rag-lab",
  },
  {
    id: "wait-for-graph",
    term: "Wait-for graph",
    simple: "The RAG simplified to processes only: an arrow means 'P waits for something Q holds'.",
    technical:
      "The graph obtained from the resource allocation graph by removing resource nodes — edge P → Q iff P waits for a resource Q holds; with single-instance resources its cycles are exactly the deadlocks, making detection a cycle-find over process nodes alone.",
    example:
      "P1 → P2 → P1 (each waiting for the other's lock): a 2-node cycle — the deadlock, with all resource bookkeeping abstracted away.",
    related: ["rag", "deadlock-detection", "circular-wait"],
    moduleId: "deadlocks",
    lessonRef: "deadlocks/detection-recovery",
    simId: "rag-lab",
  },
];
