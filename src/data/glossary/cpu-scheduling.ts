import type { GlossaryEntry } from "@/types";

/** Glossary — module 3 (CPU Scheduling). Convention: smaller priority number = higher priority. */
export const entries: GlossaryEntry[] = [
  {
    id: "cpu-scheduling",
    term: "CPU scheduling",
    simple: "The OS's ongoing decision about which ready process gets the CPU next.",
    technical:
      "The scheduler's policy for selecting among processes in the ready state: non-preemptive (running jobs finish) or preemptive (the OS can revoke the CPU, typically on a timer interrupt), judged by metrics such as turnaround, waiting, response, throughput and utilization.",
    example:
      "Your video, browser and music app share one core; the scheduler switches between them dozens of times per second so all three feel alive.",
    related: ["ready-queue", "process", "context-switch", "turnaround-time", "response-time"],
    moduleId: "cpu-scheduling",
    lessonRef: "cpu-scheduling/one-cpu-many-jobs",
    simId: "scheduling-lab",
    refUrl: "https://pages.cs.wisc.edu/~remzi/OSTEP/cpu-sched.pdf",
    refLabel: "OSTEP ch. 7: Scheduling",
  },
  {
    id: "ready-queue",
    term: "Ready queue",
    simple: "The waiting line of processes that are loaded and ready but not currently running.",
    technical:
      "The set (conventionally a FIFO queue, in practice often a priority-ordered structure) of processes in the ready state from which the scheduler selects; each preemption or arrival appends, each dispatch removes.",
    example:
      "Three background jobs and your foreground editor are all ready: four entries the scheduler orders into the Gantt chart.",
    related: ["cpu-scheduling", "process-state", "context-switch", "pcb"],
    moduleId: "cpu-scheduling",
    lessonRef: "cpu-scheduling/one-cpu-many-jobs",
    simId: "scheduling-lab",
  },
  {
    id: "gantt",
    term: "Gantt chart",
    simple: "The timeline picture of which process occupied the CPU during which interval.",
    technical:
      "A horizontal bar chart of CPU allocation over time: one colored segment per burst of service, with idle gaps where no ready work existed; all scheduling metrics are computed from the segment endpoints.",
    example:
      "The Scheduling Lab's chart shows P1 on [0–7], P3 on [7–8], P2 on [8–12] — everything the metrics table reports comes from those boundaries.",
    related: ["cpu-scheduling", "turnaround-time", "waiting-time", "response-time"],
    moduleId: "cpu-scheduling",
    lessonRef: "cpu-scheduling/one-cpu-many-jobs",
    simId: "scheduling-lab",
  },
  {
    id: "fcfs",
    term: "FCFS",
    fullForm: "First Come, First Served",
    simple: "Run jobs strictly in arrival order — the supermarket single line.",
    technical:
      "A non-preemptive algorithm serving the ready queue in arrival order; simple and starvation-free, but hostage to ordering — a long early job delays all short jobs behind it (the convoy effect).",
    example:
      "P1 (burst 7) arrives first and runs 0–7; a 1-unit job arriving at t=4 waits out the whole thing.",
    related: ["cpu-scheduling", "ready-queue", "convoy-effect", "sjf"],
    moduleId: "cpu-scheduling",
    lessonRef: "cpu-scheduling/fcfs-sjf-srtf",
    simId: "scheduling-lab",
    refUrl: "https://pages.cs.wisc.edu/~remzi/OSTEP/cpu-sched.pdf",
    refLabel: "OSTEP ch. 7: FCFS",
  },
  {
    id: "sjf",
    term: "SJF",
    fullForm: "Shortest Job First",
    simple: "Among the jobs already arrived, run the one that needs the least CPU.",
    technical:
      "A non-preemptive algorithm choosing the ready job with the smallest total burst; provably optimal for average waiting time when all jobs are available at once. Practically, bursts must be predicted from history, and long jobs risk starvation.",
    example:
      "With P2 (burst 4) and P3 (burst 1) both ready, SJF runs P3 first — dropping average waiting from 4 (FCFS) to 3 on the standard workload.",
    related: ["cpu-scheduling", "convoy-effect", "fcfs", "starvation", "ready-queue"],
    moduleId: "cpu-scheduling",
    lessonRef: "cpu-scheduling/fcfs-sjf-srtf",
    simId: "scheduling-lab",
    refUrl: "https://pages.cs.wisc.edu/~remzi/OSTEP/cpu-sched.pdf",
    refLabel: "OSTEP ch. 7: SJF and STCF",
  },
  {
    id: "round-robin",
    term: "Round robin",
    simple: "Take turns: each ready job runs for one time slice, then goes to the back of the line.",
    technical:
      "A preemptive algorithm in which the head of the ready queue runs for at most one quantum q, then (if unfinished) is preempted to the queue's tail. Guarantees bounded response time (~ (n−1) × q) at the cost of usually worse average turnaround; with q larger than every burst it degenerates to FCFS.",
    example:
      "Quantum 2 with jobs of bursts 5, 3, 1 slices the CPU into 2-unit segments, round and round until each finishes.",
    related: ["quantum", "ready-queue", "context-switch", "cpu-scheduling"],
    moduleId: "cpu-scheduling",
    lessonRef: "cpu-scheduling/round-robin",
    simId: "scheduling-lab",
    refUrl: "https://man7.org/linux/man-pages/man7/sched.7.html",
    refLabel: "man7 sched(7): SCHED_RR",
  },
  {
    id: "quantum",
    term: "Quantum",
    fullForm: "Time slice / time quantum",
    simple: "How long one turn on the CPU lasts before the timer forces a switch.",
    technical:
      "The maximum continuous run time a preemptive scheduler grants before a timer interrupt preempts the job. Too small and switch overhead dominates (fraction ≈ T_switch ÷ (q + T_switch)); too large and the scheduler behaves like FCFS.",
    example:
      "A 10 ms quantum with 8 ready jobs guarantees each a turn within 80 ms — but 1 µs would spend more time switching than running.",
    related: ["round-robin", "context-switch", "cpu-scheduling"],
    moduleId: "cpu-scheduling",
    lessonRef: "cpu-scheduling/round-robin",
    simId: "scheduling-lab",
  },
  {
    id: "priority-scheduling",
    term: "Priority scheduling",
    simple: "Run the most urgent job first — in this course, the one with the smallest priority number.",
    technical:
      "A family of algorithms selecting the ready job with the highest priority (our convention: smaller number = more urgent), preemptively or not; FCFS/SJF/RR are its degenerate case when all priorities are equal. Its hazard is starvation of low-priority jobs, standardly cured by aging.",
    example:
      "A priority-1 cursor-redraw thread preempts a priority-9 backup job; without aging, the backup may wait indefinitely.",
    related: ["starvation", "aging", "cpu-scheduling", "interrupt-priority"],
    moduleId: "cpu-scheduling",
    lessonRef: "cpu-scheduling/priority-and-metrics",
    simId: "scheduling-lab",
    refUrl: "https://man7.org/linux/man-pages/man7/sched.7.html",
    refLabel: "man7 sched(7): priorities and nice values",
  },
  {
    id: "turnaround-time",
    term: "Turnaround time",
    simple: "How long a job takes from arrival to completion — the whole stay.",
    technical:
      "Per-job metric TAT = completion − arrival, covering all waiting plus all service; the batch-oriented measure of a scheduler, minimized (for waiting) by SJF-style orderings at the expense of long jobs.",
    example:
      "A job arriving at 2 and completing at 12 has turnaround 10 — even if it only ran for 4 of those units.",
    related: ["waiting-time", "response-time", "gantt", "cpu-scheduling"],
    moduleId: "cpu-scheduling",
    lessonRef: "cpu-scheduling/one-cpu-many-jobs",
    simId: "scheduling-lab",
  },
  {
    id: "waiting-time",
    term: "Waiting time",
    simple: "How long a job sat ready but unrun — turnaround minus its own service.",
    technical:
      "Per-job metric waiting = turnaround − burst in this module's no-I/O model (every non-running moment is ready-queue time); the quantity SJF provably minimizes on average.",
    example:
      "Turnaround 9 with burst 7 means the job waited 2 units — it was running most of its stay.",
    related: ["turnaround-time", "ready-queue", "sjf", "cpu-scheduling"],
    moduleId: "cpu-scheduling",
    lessonRef: "cpu-scheduling/one-cpu-many-jobs",
    simId: "scheduling-lab",
  },
  {
    id: "response-time",
    term: "Response time",
    simple: "How long until a job first gets the CPU — the interactive metric.",
    technical:
      "Per-job metric response = first start − arrival, counting only up to the first dispatch (later preemptions excluded); bounded by ~(n−1) × q under round robin, which is why time-sharing systems prize RR.",
    example:
      "A keystroke handler arriving at 2 that first runs at 7 has response time 5 — the delay the user feels, regardless of total runtime.",
    related: ["turnaround-time", "round-robin", "quantum", "cpu-scheduling"],
    moduleId: "cpu-scheduling",
    lessonRef: "cpu-scheduling/one-cpu-many-jobs",
    simId: "scheduling-lab",
  },
  {
    id: "convoy-effect",
    term: "Convoy effect",
    simple: "One long job at the front makes every short job behind it slow.",
    technical:
      "The FCFS pathology in which a single long-running process at the head of the queue inflates the waiting (and response) times of all subsequent short processes, as when a CPU-bound job precedes many interactive ones.",
    example:
      "A 7-unit backup starting at t=0 makes ten 1-unit jobs that arrive at t=1 all wait ~6 units each.",
    related: ["fcfs", "ready-queue", "cpu-scheduling", "sjf"],
    moduleId: "cpu-scheduling",
    lessonRef: "cpu-scheduling/fcfs-sjf-srtf",
    simId: "scheduling-lab",
  },
  {
    id: "starvation",
    term: "Starvation",
    fullForm: "Indefinite blocking / starving",
    simple: "A ready job that never gets picked because others keep winning.",
    technical:
      "The liveness failure in which a process remains ready indefinitely because the scheduling policy (e.g. strict priority or SJF) always favors others; distinct from deadlock — nothing is held or cyclic, the choice could be made differently at any moment.",
    example:
      "A priority-9 job under strict priority scheduling with a steady stream of priority-1 arrivals may never run at all.",
    related: ["aging", "priority-scheduling", "sjf", "cpu-scheduling"],
    moduleId: "cpu-scheduling",
    lessonRef: "cpu-scheduling/priority-and-metrics",
    simId: "scheduling-lab",
  },
  {
    id: "aging",
    term: "Aging",
    simple: "The longer a job waits, the more its priority quietly grows — until it wins.",
    technical:
      "The anti-starvation technique of increasing a waiting job's effective priority as a function of time waited (e.g. effective = base + w × waited), guaranteeing that any job eventually outranks a stream of static higher-priority arrivals; MLFQ schedulers implement the same idea by promoting jobs between queues.",
    example:
      "After enough seconds of waiting, yesterday's priority-9 backup outranks today's priority-1 arrivals and finally runs.",
    related: ["starvation", "priority-scheduling", "cpu-scheduling"],
    moduleId: "cpu-scheduling",
    lessonRef: "cpu-scheduling/priority-and-metrics",
    refUrl: "https://pages.cs.wisc.edu/~remzi/OSTEP/cpu-sched-mlfq.pdf",
    refLabel: "OSTEP ch. 8: MLFQ (aging via promotion)",
  },
];
