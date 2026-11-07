# Simulation Specifications

Every simulation is a pure state machine (`SimulationEngine<S, A>` from
`src/types/index.ts`) with: initial state, actions, event log, validation,
derived metrics, and a one-line `explain()`. All engines are deterministic
(unit-tested against hand-computed traces) and shared by lesson embeds, the
playground and the terminal. This document records each engine's model, its
actions, and — critically — its **documented simplifications**, which the UI
repeats under every lab ("Model notes").

Shared playback (all labs): play/pause/step-forward/step-back (bounded undo
history)/reset/speed 0.5–4×. `tick` advances time-driven engines; event-driven
engines ignore it and auto-pause playback.

## Module 0

### computer-diagram — Computer Anatomy Explorer (`src/modules/intro-computers-os/computer-engine.ts`)
- **Model:** six parts (CPU, RAM, disk, keyboard, screen, network) on a fixed
  layout; transfers are "data units" moving start→end over part-dependent
  tick durations reflecting the speed ladder (CPU↔RAM 2 ticks … network 8).
- **Actions:** `send {from,to}`, `tick`, `toggle-os`, `select`, `reset`.
- **Teaching point:** with the OS broker ON, requests are arbitrated; OFF
  ("chaos"), concurrent direct transfers collide (marked failed).
- **Simplifications:** abstract units, no real protocols or DMA detail; the
  OS broker is a single toggle rather than per-request kernel paths.

### boot-sequence (`boot-engine.ts`)
- **Model:** five stages (power-on → firmware → bootloader → kernel → init);
  each stage consumes 4 ticks then hands control to the next.
- **Teaching point:** each stage's "can / cannot (yet)" lists build the
  capability-chain intuition.
- **Simplifications:** linear UEFI-shaped path; Secure Boot, initramfs and
  firmware variants folded into single stages.

## Module 1

### interrupts — Interrupt Lab (`src/modules/interrupts/engine.ts`)
- **Model:** a 3–4 instruction demo program; interrupts (timer prio 1, I/O
  prio 2, exception/trap prio 0) queue and are delivered before the next
  instruction tick. Handler pipeline: detect → save-context → vector-lookup →
  run-handler (2–3 ticks) → restore-context → resume; each stage = 1 tick.
  Delivery pushes {pc, progress, mode} onto a saved-context stack; resume pops
  it, restoring mid-instruction. Latency = delivery time − raise time.
- **Actions:** `tick`, `raise-timer|raise-io|raise-exception`,
  `toggle-source {source,enabled}` (exceptions unmaskable — enforced),
  `set-polling`, `load-program`, `reset-pc`, `reset`.
- **Polling mode:** raising I/O starts a busy device (3 ticks default; the
  polling-vs-interrupt race passes a slow device of 20 ticks). While waiting,
  the CPU burns one poll tick per tick and cannot execute the program — the
  waste interrupts avoid.
- **Simplifications:** one fixed handler per source (no vector tables with
  multiple handlers, no nesting), no interrupt controller programming, no
  per-device registers; x86/RISC-V differences discussed in lessons, not
  modeled.

### polling-vs-interrupt
The same engine instantiated twice (polling vs interrupt) run in lockstep by
`PollingVsInterrupt.tsx`, comparing wasted poll ticks vs handler latency and
completed instruction ticks.

## Module 2

### processes — Process Table Lab & fork/wait Laboratory (`src/modules/processes/engine.ts`)
One engine, two framings.
- **Model:** process table {pid, ppid, name, state, burst, progress, children,
  blockedReason?, exitCode?, creationTime, terminationTime?}; states
  new/ready/running/blocked/zombie/terminated; single CPU, round-robin with a
  settable quantum; FIFO ready queue; context switches counted live→live.
- **Actions:** `tick`, `create`, `fork pid` (child copies parent's remaining
  burst), `exec {pid,name}` (image rename), `wait pid` (reap zombie or block),
  `kill pid` (zombie if parent alive; orphans re-parented to PID 1),
  `block/resume`, `set-quantum`, `reset`.
- **Semantics:** natural exit → zombie while the parent lives; `wait` reaps
  immediately or blocks ("wait-for-child:<pid>") and wakes next tick; a
  parentless exit is an unreapable root zombie (deliberate teaching moment).
- **Simplifications:** no real syscalls; exec does not replace the address
  space (burst/progress kept); fork copies burst rather than pages; IPC is
  modelled narratively in lessons, not as channels here.

## Module 3

### scheduling — CPU Scheduling Lab (`src/modules/scheduling/engine.ts`)
- **Model:** batch single-CPU, integer time, no I/O bursts. Algorithms: FCFS;
  SJF (non-preemptive); SRTF (preemptive at arrivals/completions); priority
  (preemptive and non-preemptive; lower number = higher priority); Round
  Robin (arrival at quantum-expiry enqueues before the preempted process).
  Ties: arrival, then numeric-aware id (P2 < P10). Idle CPU appears as an
  explicit IDLE segment.
- **Metrics (definitions used everywhere):** turnaround = completion −
  arrival; waiting = turnaround − burst (valid in this no-I/O model);
  response = first start − arrival; utilization = busy/makespan; throughput
  = n/makespan; context switches = live→live transitions.
- **Step-through:** the full schedule is computed by `computeSchedule` (pure,
  exported for tests); each timeline segment carries the scheduler's *reason*;
  `cursor` reveals segments one decision at a time (`tick`/`rewind`).
- **Inputs:** editable process rows (id/arrival/burst/priority), quantum,
  presets (classic, convoy effect, simultaneous arrivals, idle-gap), ≤ 8
  processes, full validation with visible errors.
- **Simplifications:** zero context-switch cost; no multi-level queues, no
  I/O interleaving (the lesson text explains how waiting time must then be
  computed from ready-queue residence instead).

## Modules 4–13

The remaining engines (concurrency/threads, bounded buffer + semaphores,
readers-writers, dining philosophers, memory allocation, paging/TLB +
FIFO/LRU/Optimal + COW, RAG/deadlock detection, Banker's algorithm,
filesystem allocation, disk scheduling, I/O transfer methods (PIO/interrupt/
DMA), syscall walk, protection matrix, virtualization layers,
multiprocessor/real-time, and the end-to-end capstone simulator) follow the
same framework contract; their detailed specs live alongside the engines as
documented headers, and every engine's "Model notes" line in the UI restates
its simplifications. Engine-level unit tests encode the authoritative
hand-computed traces (e.g. textbook head-movement totals for disk scheduling,
Banker's safe sequences, FIFO/LRU/Optimal fault counts).

## Honest-computation rules (all engines)

1. Results are computed from inputs on every change — no hardcoded charts.
2. The same inputs + algorithm produce identical results everywhere
   (Gantt, tables, metrics, terminal) because they read one state.
3. Invalid input sets a visible `error` string instead of "succeeding".
4. Anywhere the model diverges from real kernels, the divergence is stated in
   the lab's Model notes and the lesson's Assumptions section.
