import type { Lesson } from "@/types";

/**
 * Module 3 — CPU Scheduling.
 * One CPU, many jobs: the problem first, then FCFS/SJF/SRTF, Round Robin,
 * priority and aging — always reading real numbers off the timeline.
 * Conventions in this course: a *smaller* priority number means higher
 * priority; ties break by arrival time, then process id.
 */
export const lessons: Lesson[] = [
  {
    id: "cpu-scheduling/one-cpu-many-jobs",
    moduleId: "cpu-scheduling",
    title: "One CPU, Many Jobs",
    minutes: 9,
    objectives: [
      "explain why a single CPU forces scheduling decisions at all",
      "define turnaround, waiting and response time from a timeline",
      "read a Gantt chart and compute each job's metrics from it",
    ],
    sections: [
      {
        kind: "problem",
        body: [
          "Module 2 gave you processes — and a CPU that executes exactly one process's instructions at a time. Meanwhile your laptop has a video playing, a browser redrawing this page, a music app and dozens of background helpers, all ready to run at once. One runner, a whole crowd at the starting line. Someone must decide, moment by moment, **who runs next**.",
          "That decision is *scheduling*, made many times per second by the part of the OS called the **scheduler**. Pick badly and short jobs languish behind long ones, interaction feels laggy, the CPU idles while work waits. Pick well and the machine feels like it does everything at once. This module builds that judgment — but first we need a ruler: how do we even measure whether a schedule was good?",
        ],
      },
      {
        kind: "intuition",
        body: [
          "Picture a sandwich shop with **one counter** and a line of customers. The counter is the CPU; each customer is a process with an order size (its *burst*). Whoever runs the counter is the scheduler, and their single decision — who serves next — changes everything: serve the giant order first and everyone behind waits; serve quick orders first and the line races, but the giant order's customer fumes.",
          "You already have competing intuitions about which line moves 'best': fairness (strict first-come-first-served), efficiency (quickest orders first), responsiveness (start everyone's sandwich early, one bite at a time). Every algorithm in this module is one of those intuitions made precise. The metrics below are how we *argue* about them instead.",
        ],
      },
      {
        kind: "visual",
        simId: "scheduling-lab",
        body: [
          "The **CPU Scheduling Lab** gives you a single CPU, editable processes (arrival, CPU burst, priority), an algorithm selector, and one **Gantt chart** — the timeline of which process held the CPU when. Step it forward: each new colored segment is one scheduling decision, shown with its *reason* (e.g. 'shortest remaining', 'quantum expired', 'higher priority').",
          "Below the chart, the metrics table computes completion, turnaround, waiting and response time per process, plus the averages, throughput and CPU utilization. Run the same workload under two algorithms and compare the averages — that comparison is the entire module in miniature.",
        ],
      },
      {
        kind: "technical",
        body: [
          "The scheduler picks from the **ready queue** — the set of processes in memory, ready, waiting for the CPU (module 2's ready state). Algorithms split into **non-preemptive** (a running job keeps the CPU until it finishes or blocks) and **preemptive** (the OS can take the CPU away, usually via the timer interrupt from module 1). Either way, the timeline of CPU assignment is the **Gantt chart**, and every metric is read off it.",
          "Three per-job metrics matter, each a difference of two times on the timeline. **Turnaround time** is the whole stay: arrival to completion — waiting *plus* running. **Waiting time** is the stay minus the service: how long the job sat ready but unrun. **Response time** is the interactive one: arrival to the *first* moment the job gets the CPU, however briefly.",
          "Two whole-system rulers complete the kit. **Throughput** counts jobs finished per unit of time; **CPU utilization** is the fraction of time the CPU was busy rather than idle. And note one structural fact of this module's model: jobs here are pure CPU work with no I/O, so a job's total service is exactly its burst, and waiting time works out to turnaround minus burst. (With I/O, waiting would also exclude time blocked on devices — module 10.)",
        ],
        equations: [
          {
            expr: "Turnaround time = Completion − Arrival",
            symbols: [
              { sym: "Completion", meaning: "time at which the job finished" },
              { sym: "Arrival", meaning: "time at which the job became available" },
            ],
            note: "The job's whole stay in the system: all waiting plus all service.",
          },
          {
            expr: "Waiting time = Turnaround time − Burst",
            symbols: [{ sym: "Burst", meaning: "total CPU service the job needs" }],
            note: "Exact in this module's no-I/O model: every non-running moment is ready-queue waiting.",
          },
          {
            expr: "Response time = First start − Arrival",
            symbols: [
              { sym: "First start", meaning: "time at which the job first got the CPU" },
            ],
            note: "A job can start, be preempted and wait more later — response time only counts up to the first taste of CPU.",
          },
        ],
      },
      {
        kind: "worked-example",
        steps: [
          {
            title: "Reading metrics off one FCFS timeline",
            body: [
              "Three jobs: P1 arrives at 0 needing 5; P2 arrives at 3 needing 3; P3 arrives at 4 needing 1. First-come-first-served runs P1 [0–5], P2 [5–8], P3 [8–9].",
              "P2: completion 8, arrival 3 → turnaround 5; burst 3 → waiting 5 − 3 = 2; first start 5 → response 5 − 3 = 2. P3: completion 9, arrival 4 → turnaround 5; burst 1 → waiting 4; first start 8 → response 4.",
            ],
          },
          {
            title: "Averages, and what they hide",
            body: [
              "Average turnaround = (5 + 5 + 5) ÷ 3 = 5; average waiting = (0 + 2 + 4) ÷ 3 = 2; average response = 2. With numbers in hand we can *prove* an ordering is bad instead of gesturing at it.",
              "But no single number crowns a winner: this schedule is fine on the averages yet awful for P3's response time — a 1-unit job waited 4 units just to start. Which metric to optimize is a policy question; the next lessons supply the algorithms and their answers.",
            ],
          },
        ],
      },
      {
        kind: "misconceptions",
        items: [
          {
            wrong: "The OS runs all those programs literally at the same time on my one CPU.",
            right: "On a single core it rapidly switches between them — often dozens of times per second. The illusion of simultaneity is scheduling plus fast context switches (module 2); on a multicore chip a few processes genuinely do run at once.",
          },
          {
            wrong: "Waiting time counts from when the job arrived until it finished.",
            right: "That is turnaround time. Waiting time excludes the job's own CPU service: it is turnaround minus burst — only the time spent ready but not running.",
          },
        ],
      },
      {
        kind: "knowledge-check",
        questions: [
          {
            id: "kc-m3-one-1",
            q: "A job arrives at 2, first gets the CPU at 9, finishes at 15, with burst 4. What is its waiting time?",
            options: [
              "9 — turnaround is 13, minus burst 4",
              "13 — arrival to completion is all 'waiting'",
              "7 — arrival to first start",
              "11 — completion 15 minus burst 4",
            ],
            answerIndex: 0,
            explanation:
              "Turnaround = 15 − 2 = 13; waiting = turnaround − burst = 13 − 4 = 9. The 7 is the response time; the 11 subtracts the burst from the wrong endpoint.",
          },
          {
            id: "kc-m3-one-2",
            q: "Which metric best captures 'how snappy an app feels when you click it'?",
            options: [
              "Response time — arrival to first taste of CPU",
              "Turnaround time — arrival to completion",
              "Throughput — jobs finished per second",
              "CPU utilization — fraction of time busy",
            ],
            answerIndex: 0,
            explanation:
              "Interaction cares about the delay before the app *reacts*, not before it finishes. Response time is the interactive metric; turnaround suits batch work.",
          },
        ],
      },
      {
        kind: "references",
        items: [
          {
            label: "OSTEP, Chapter 7: Scheduling (Arpaci-Dusseau)",
            url: "https://pages.cs.wisc.edu/~remzi/OSTEP/cpu-sched.pdf",
            note: "workload assumptions, scheduling metrics and first algorithms — this module's backbone",
          },
          {
            label: "man7: sched(7) — Linux scheduling overview",
            url: "https://man7.org/linux/man-pages/man7/sched.7.html",
            note: "what real Linux policies (SCHED_FIFO, SCHED_RR, CFS) inherit from these ideas",
          },
        ],
      },
      {
        kind: "note",
        body: [
          "The Scheduling Lab simplifies in ways to keep in mind: every job is pure CPU work (no I/O waits), context switches are instantaneous and cost nothing, and jobs are interrupted only by the scheduler itself. It also assumes burst lengths are known exactly — convenient for learning, unattainable in practice (lesson 2 shows what real systems do instead).",
        ],
      },
    ],
  },
  {
    id: "cpu-scheduling/fcfs-sjf-srtf",
    moduleId: "cpu-scheduling",
    title: "FCFS, SJF & SRTF",
    minutes: 10,
    objectives: [
      "trace FCFS on a small workload and name the convoy effect it causes",
      "compute why SJF lowers average waiting time and what it costs",
      "step through SRTF preemption and find its timeline by hand",
    ],
    sections: [
      {
        kind: "problem",
        body: [
          "The sandwich shop opens. First in line: one customer ordering 100 sandwiches. Behind them: five customers wanting one each. Serve strictly in arrival order — first come, first served — and the quick customers stand there through the entire giant order. One long job at the front makes *everyone* slow, and the disease has a name.",
          "The obvious fix — serve the shortest order first — works beautifully on average. But it opens two questions: how can the scheduler know how long a job will take *before* running it? And is it fair to keep delaying the big order forever while small ones keep arriving? This lesson takes all three ideas seriously: FCFS, SJF, and SJF's preemptive cousin SRTF.",
        ],
      },
      {
        kind: "intuition",
        body: [
          "FCFS is a single supermarket line: nobody overtakes, perfectly fair in arrival — and one cartful of groceries stalls every basket behind it. That stall is the **convoy effect**, like one slow truck turning a motorway into a parking lot, fast cars stacked up behind.",
          "SJF is the express-till rule: always serve the quickest order next. The line's *average* wait drops sharply — but the weekly-shop customer watches basket after basket cut in front, indefinitely. SRTF is the same rule with impatience added: the moment a shorter order *arrives*, you pause the current sandwich mid-spread and switch.",
        ],
      },
      {
        kind: "visual",
        simId: "scheduling-lab",
        body: [
          "Keep the default processes and run the three algorithms on the *same* workload. Watch the Gantt chart: under FCFS one long early segment stretches across the chart while later short ones pile up behind it; under SJF the short jobs get pulled forward; under SRTF a running segment is cut mid-way the instant a shorter job arrives.",
          "Before each run, predict from the chart which average waiting number the metrics table will show — then check. Getting the *prediction* right is the learning.",
        ],
      },
      {
        kind: "technical",
        body: [
          "**FCFS** (first come, first served) is a non-preemptive queue ordered by arrival. Simple, starvation-free — and hostage to ordering: a single long job that arrives early delays every short job behind it, the **convoy effect**. Response times suffer worst for jobs that arrive just after a long one starts.",
          "**SJF** (shortest job first) is non-preemptive: among jobs that have already arrived, run the one with the smallest total burst. When all jobs are available at once it is the best non-preemptive scheduler for *average waiting time*: moving a short job earlier in the timeline subtracts its length from the wait of everyone it jumps ahead of. Its prices: long jobs can be overtaken indefinitely (starvation — cured in lesson 4), and the scheduler cannot actually see future bursts. Real systems *predict* them from each job's recent CPU-burst history, so practical 'SJF' means shortest *predicted* job first.",
          "**SRTF** (shortest remaining time first) is SJF made preemptive: at every decision point, run whichever ready job has the least *remaining* work — including cutting the current job short when a newcomer's whole burst beats its remaining time. With full knowledge, SRTF is optimal for average waiting time among preemptive schedulers. The same caveats apply, plus one more: every preemption is a context switch, so SRTF switches more often than SJF by construction.",
        ],
        equations: [
          {
            expr: "Average waiting time = (W₁ + W₂ + … + Wₙ) ÷ n",
            symbols: [
              { sym: "Wᵢ", meaning: "waiting time of job i (turnaround − burst)" },
              { sym: "n", meaning: "number of jobs" },
            ],
            note: "The quantity SJF minimizes: each unit by which a short job moves forward on the timeline removes one unit of waiting from every job it passes.",
          },
          {
            expr: "Waiting saved by a swap = (B_long − B_short) per job jumped",
            symbols: [
              { sym: "B_long", meaning: "burst of the job that moves later" },
              { sym: "B_short", meaning: "burst of the job that moves earlier" },
            ],
            note: "Why shortest-first wins: swapping a shorter job ahead of a longer one strictly reduces total waiting, by the difference of the bursts times the number of jobs affected.",
          },
        ],
      },
      {
        kind: "worked-example",
        steps: [
          {
            title: "One workload, three schedulers",
            body: [
              "Workload: P1 arrives 0, burst 7; P2 arrives 2, burst 4; P3 arrives 4, burst 1. **FCFS**: P1 [0–7], P2 [7–11], P3 [11–12]. Waits: P1 0, P2 5, P3 7 → average **4**.",
              "**SJF** (non-preemptive): only P1 exists at t=0, so P1 [0–7]; then P3 (burst 1) beats P2 (burst 4): P3 [7–8], P2 [8–12]. Waits: P1 0, P3 3, P2 6 → average **3**.",
              "**SRTF**: P1 runs 0–2; at t=2 P2's burst 4 beats P1's remaining 5 → P2 [2–4]; at t=4 P3's 1 beats P2's remaining 2 → P3 [4–5] done; P2 [5–7] done; P1 [7–12]. Waits: P1 5, P2 1, P3 0 → average **2**.",
            ],
          },
          {
            title: "Read the trade-offs off the same numbers",
            body: [
              "Average waiting fell 4 → 3 → 2 as the scheduler got greedier. But P1's turnaround went 7 → 7 → 12: under SRTF the long job was shoved aside twice, finishing last. And compare response times for P3: 7 under FCFS, 3 under SJF, 0 under SRTF — preemption serves interactivity, not just averages.",
              "Also count what SRTF paid: two extra preemptions, each a context switch the lab models as free. Every 'optimal' claim on the metrics table silently assumes switches cost nothing — the lab's simplification, not the world's.",
            ],
          },
        ],
      },
      {
        kind: "misconceptions",
        items: [
          {
            wrong: "SJF is useless in real systems because the future burst length is unknowable.",
            right: "Exact SJF is impossible, but the idea survives: schedulers estimate the next burst from recent history and run shortest-predicted-first. The theorem's value is as a benchmark — it says what perfect knowledge would buy.",
          },
          {
            wrong: "SRTF and SJF are two names for the same algorithm.",
            right: "SJF lets the running job finish (non-preemptive); SRTF may evict it mid-run the moment a shorter job arrives. Same greedy principle, different timelines — in the worked example SJF's average wait is 3, SRTF's is 2.",
          },
        ],
      },
      {
        kind: "knowledge-check",
        questions: [
          {
            id: "kc-m3-fcfs-1",
            q: "One long job starts under FCFS; ten 1-second jobs arrive one second later. What is this pathology called?",
            options: [
              "The convoy effect — short jobs queue behind the long one",
              "Starvation — the short jobs never run at all",
              "Aging — priorities rise while waiting",
              "Thrashing — the CPU spends all its time switching",
            ],
            answerIndex: 0,
            explanation:
              "The short jobs do run eventually (FCFS is starvation-free) but all wait out the long job: the convoy effect. Starvation would mean never running.",
          },
          {
            id: "kc-m3-fcfs-2",
            q: "Under SRTF, the running job has 3 time units remaining. A new job arrives with burst 4. What happens?",
            options: [
              "The current job keeps running — 4 beats 3 only if 4 were smaller",
              "The current job is preempted — newcomers always win",
              "Both run simultaneously for 3 units",
              "The new job waits until the current one blocks on I/O",
            ],
            answerIndex: 0,
            explanation:
              "SRTF compares remaining work: the running job's 3 is less than the newcomer's 4, so no preemption. Preemption happens only when the arrival's burst beats the remaining time.",
          },
        ],
      },
      {
        kind: "references",
        items: [
          {
            label: "OSTEP, Chapter 7: Scheduling — FCFS, SJF, STCF",
            url: "https://pages.cs.wisc.edu/~remzi/OSTEP/cpu-sched.pdf",
            note: "the convoy effect and the optimality argument, in course-text form",
          },
          {
            label: "OSTEP, Chapter 8: Multi-Level Feedback Queue",
            url: "https://pages.cs.wisc.edu/~remzi/OSTEP/cpu-sched-mlfq.pdf",
            note: "how real schedulers get SJF's benefits without knowing the future — by watching behavior",
          },
          {
            label: "man7: sched(7) — Linux scheduling policies",
            url: "https://man7.org/linux/man-pages/man7/sched.7.html",
          },
        ],
      },
      {
        kind: "note",
        body: [
          "The lab executes SJF and SRTF with exact burst knowledge — no prediction from history — and models context switches as instantaneous. With real switch costs, SRTF's frequent preemptions would give back part of its advantage. The lab's FCFS also keeps a single queue with no priority classes; real convoys form per class in multi-level queues.",
        ],
      },
    ],
  },
  {
    id: "cpu-scheduling/round-robin",
    moduleId: "cpu-scheduling",
    title: "Round Robin & the Time Quantum",
    minutes: 9,
    objectives: [
      "trace a round-robin schedule including the arrival-at-quantum-expiry rule",
      "argue the quantum trade-off from the switch-overhead equation",
      "explain why RR improves response time but often worsens turnaround",
    ],
    sections: [
      {
        kind: "problem",
        body: [
          "FCFS is fair by arrival but makes a freshly-arrived interactive job wait out an entire convoy; SJF and SRTF are snappy but postpone long jobs and need bursts they cannot know. Neither guarantees every job *a bite early*. For time-sharing machines — where dozens of people each expected the computer to answer *them* — that guarantee was the whole product.",
          "The winning rule is almost embarrassingly simple: take turns, on a timer. But its one free parameter — how long a turn lasts — hides a sharp trade-off, and one subtle bookkeeping rule decides who goes next when an arrival lands exactly on a turn's boundary.",
        ],
      },
      {
        kind: "intuition",
        body: [
          "Four friends share one game console with a kitchen timer set to ten minutes. When the timer dings, the player pauses — game saved exactly where it was — and the next friend continues *their* save. Nobody waits more than three turns to play; everybody makes progress every round. That is **round robin**: the timer is the **quantum**, the save-and-hand-over is the context switch.",
          "Now tune the timer. Five seconds per turn: you spend more time swapping seats and re-finding your place than playing. Five hours per turn: the last friend might as well have waited for the whole session — you have reinvented FCFS. The quantum must be long enough that real progress outweighs the handover, short enough that everyone gets a turn soon.",
        ],
      },
      {
        kind: "visual",
        simId: "scheduling-lab",
        body: [
          "Select Round Robin in the lab and use the quantum control. Step the Gantt decision by decision: each segment ends at a quantum boundary or at completion, and the reason line says which. Try quantum 1, 2, 5, and a value larger than every burst on the same workload — that last run should reproduce the FCFS chart exactly.",
          "While stepping, watch who enters the ready queue in the reason lines: a job whose quantum expired goes to the *back* — behind anyone who arrived while it ran.",
        ],
      },
      {
        kind: "experiment",
        simId: "scheduling-lab",
        prompts: [
          "Run three processes (bursts 5, 3, 1; arrivals 0, 1, 2) with quantum 2. Prediction first: which finishes first? Step through and check — pay attention to what happens when an arrival lands exactly on a quantum boundary.",
          "Raise the quantum until it exceeds the longest burst. How does the Gantt chart compare to FCFS on the same workload? Explain why that is the *expected* result, not a bug.",
          "Shrink the quantum to 1 and count the context switches. If each switch cost 0.5 time units, what fraction of the CPU's time would be overhead? Compare with the equation below.",
        ],
        body: [
          "Conventions used by the lab (and this course): at the instant a quantum expires, a process arriving at *exactly* that time is enqueued first, and the preempted process goes behind it; other ties break by arrival time, then process id.",
        ],
      },
      {
        kind: "technical",
        body: [
          "**Round robin (RR)** is preemptive FCFS with a clock: the head of the ready queue runs for at most one **quantum** (time slice) *q*. If the job finishes early, fine; if the quantum expires first, the timer interrupt fires, the job is preempted to the back of the queue, and the next job runs.",
          "The fairness claim is quantitative: with n ready jobs, a fresh arrival waits at most about (n − 1) × q for its first slice, and over a long run each job receives roughly 1/n of the CPU in chunks of at most q. Response time is therefore *bounded* — the property time-sharing needed. The price shows on the other metrics: RR's average turnaround and waiting are usually *worse* than SJF's on the same workload, because RR deliberately delays every completion instead of finishing short jobs first.",
          "**The quantum trade-off.** Too large and no one is preempted before finishing: RR degenerates into FCFS with extra bookkeeping. Too small and the CPU spends its life context-switching: with switch cost T_switch, each run-switch cycle lasts q + T_switch and the overhead fraction grows as q shrinks. RR is the first algorithm here where a *tuning parameter*, not just the policy, decides success.",
          "One bookkeeping rule matters in practice (and in the lab): when a new process arrives at *exactly* the moment a quantum expires, the arrival is enqueued **before** the preempted process — the newcomer has waited without ever running, and this keeps its response time tight under load.",
        ],
        equations: [
          {
            expr: "Max wait for a fresh arrival ≈ (n − 1) × q",
            symbols: [
              { sym: "n", meaning: "number of ready processes" },
              { sym: "q", meaning: "the quantum (time slice)" },
            ],
            note: "RR's promise: the CPU within n − 1 slices. FCFS makes no such promise at all.",
          },
          {
            expr: "Switch overhead fraction ≈ T_switch ÷ (q + T_switch)",
            symbols: [
              { sym: "T_switch", meaning: "cost of one context switch" },
              { sym: "q", meaning: "the quantum" },
            ],
            note: "q → 0 sends the fraction toward 100% (pure overhead); q → ∞ sends it to 0 and RR to FCFS. Real systems pick q comfortably above the switch cost — often tens of milliseconds.",
          },
        ],
      },
      {
        kind: "worked-example",
        steps: [
          {
            title: "Quantum 2, with an arrival on the boundary",
            body: [
              "P1 arrives 0 burst 5; P2 arrives 1 burst 3; P3 arrives 2 burst 1; quantum 2. P1 [0–2]; P2 arrived during the slice, and at t=2 P3 arrives exactly as P1's quantum expires: P3 enqueues first, *then* P1 → queue [P2, P3, P1].",
              "P2 [2–4] (rem 1) → back: [P3, P1, P2]. P3 [4–5] — finishes! Queue [P1, P2]. P1 [5–7] (rem 1) → [P2, P1]. P2 [7–8] done. P1 [8–9] done. Completion order: P3, P2, P1.",
            ],
          },
          {
            title: "Metrics, and the RR lesson in them",
            body: [
              "Turnarounds: P1 9−0 = 9, P2 8−1 = 7, P3 5−2 = 3 → average 19/3 ≈ 6.3. Waits: 4, 4, 2 → average 10/3 ≈ 3.3 — *worse* than SJF-style orderings achieve on this workload.",
              "But response times: P1 0, P2 1, P3 2 → average 1. Every job was running within 2 time units of arriving. That is the deal RR makes: worse completions, guaranteed early starts.",
            ],
          },
        ],
      },
      {
        kind: "misconceptions",
        items: [
          {
            wrong: "A smaller quantum is always better — more preemptions means more fairness.",
            right: "Each preemption costs a context switch. Shrink q toward the switch cost and the CPU mostly switches: the overhead fraction T_switch ÷ (q + T_switch) climbs toward 100%. Fair — and useless.",
          },
          {
            wrong: "Round robin improves every metric — it is strictly better than FCFS.",
            right: "RR buys bounded response time and pays with average turnaround/waiting, which usually get *worse*: nothing finishes early because everything is sliced. With a quantum larger than every burst, RR *is* FCFS plus overhead.",
          },
        ],
      },
      {
        kind: "knowledge-check",
        questions: [
          {
            id: "kc-m3-rr-1",
            q: "P1's quantum expires at t=10 with work remaining. At exactly t=10, P2 arrives. Who runs next?",
            options: [
              "P2 — an arrival at quantum expiry enqueues before the preempted process",
              "P1 — the preempted process re-enqueues first",
              "Whoever has the shorter remaining burst",
              "The CPU stays idle one quantum to be fair",
            ],
            answerIndex: 0,
            explanation:
              "Course and lab convention: the arrival is admitted first, the preempted process goes behind it. P1 does not get to skip the line it was just pushed into.",
          },
          {
            id: "kc-m3-rr-2",
            q: "Eight jobs are ready, quantum 10 ms. At most how long does a ninth job wait for its first slice after arriving?",
            options: [
              "80 ms — behind all eight: (n − 1) × q",
              "10 ms — preemption is immediate",
              "720 ms — n × n × q",
              "Unbounded — RR gives no bound",
            ],
            answerIndex: 0,
            explanation:
              "Each of the 8 jobs ahead can hold the CPU at most one 10 ms quantum before the newcomer runs: 8 × 10 = 80 ms worst case. That bound is RR's raison d'être.",
          },
        ],
      },
      {
        kind: "references",
        items: [
          {
            label: "OSTEP, Chapter 7: Scheduling — RR and slice-length trade-offs",
            url: "https://pages.cs.wisc.edu/~remzi/OSTEP/cpu-sched.pdf",
          },
          {
            label: "man7: sched(7) — SCHED_RR, the real-time round-robin policy",
            url: "https://man7.org/linux/man-pages/man7/sched.7.html",
            note: "Linux's real RR: slice lengths, priorities, and how the kernel bookkeeps the queue",
          },
        ],
      },
      {
        kind: "note",
        body: [
          "The lab's RR assumes every switch is free and quantum boundaries are exact; real kernels slice on timer ticks and virtual runtime, and a preemption can be delayed by other interrupt activity. The lab also fixes the tie-break (arrival, then id) and the boundary rule (arrival enqueues before the preempted process) — implementations vary in detail, though the effect is the same.",
        ],
      },
    ],
  },
  {
    id: "cpu-scheduling/priority-and-metrics",
    moduleId: "cpu-scheduling",
    title: "Priority, Aging & the Metrics",
    minutes: 9,
    objectives: [
      "apply the course's smaller-number-is-higher-priority convention to predict runs",
      "explain starvation under priority scheduling and how aging cures it",
      "choose the right metric — turnaround, waiting, response, throughput, utilization — for a given goal",
    ],
    sections: [
      {
        kind: "problem",
        body: [
          "Every scheduler so far treated jobs as equals. Your machine does not: the process redrawing the cursor matters more, right now, than a backup that can finish any time tonight. Real schedulers attach a **priority** to each job and let urgency cut in line. Immediately a new question appears — the one SJF only hinted at: if important jobs keep arriving, does the unimportant one *ever* run? A scheduler that never runs a ready job has broken a promise even bigger than speed.",
          "This lesson closes the module: priority scheduling with its starkest failure and its standard cure — then the full metrics toolkit, so that when you meet Linux's real policies in the references you can ask the only questions that matter: how good, for whom, measured how?",
        ],
      },
      {
        kind: "intuition",
        body: [
          "An emergency room again (module 1 used it for interrupts): a sprained ankle can wait behind chest pain — that is priority scheduling, and it is *right*. But suppose walk-ins with paper cuts keep streaming in all night: the ankle patient could wait until Tuesday. The triage nurse's fix is exactly the OS's: the longer someone has waited, the more their urgency quietly climbs (**aging**). Eventually the waiting patient outranks the stream of newcomers and is seen.",
          "One institutional quirk to memorize: in this course — as in several real systems, including the ARM interrupt controller you met in module 1 — **a smaller priority number means more urgent**. Priority 1 preempts priority 9. Always check which way a numbering runs before reading anyone's diagram, including ours.",
        ],
      },
      {
        kind: "visual",
        simId: "scheduling-lab",
        body: [
          "Switch the lab to Priority mode and give the processes different priority values. Run it non-preemptive first: a running job finishes even when something more urgent arrives. Then switch to preemptive: watch the Gantt chart cut the running job mid-segment the moment a smaller-numbered job arrives.",
          "Now give one process a terrible priority (say 9) while several low-numbered processes keep arriving near it, and watch its segments get pushed later and later. That chart is starvation, drawn in color.",
        ],
      },
      {
        kind: "experiment",
        simId: "scheduling-lab",
        prompts: [
          "Give four processes priorities 1, 2, 3 and 9 (smaller = more urgent) and run non-preemptive priority. When does the priority-9 job run? Then run preemptive mode — what changes for its metrics?",
          "Construct a workload where the priority-9 process is pushed as late as the simulation allows. Describe the arrival pattern that does this to it.",
          "The lab has no aging control. From the queue behavior you just observed, state precisely where an aging rule would have intervened.",
        ],
        body: [
          "Conventions: smaller priority number = higher priority; ties break by arrival time, then process id.",
        ],
      },
      {
        kind: "technical",
        body: [
          "**Priority scheduling** runs the ready job with the highest priority (in this course: the *smallest* priority number), either non-preemptively (the running job finishes) or preemptively (a higher-priority arrival preempts). It is less a single algorithm than a knob every serious scheduler has: FCFS, SJF and RR are what priority scheduling becomes when all priorities are equal plus a tie-break rule.",
          "**Starvation** (indefinite blocking) is the failure mode: a low-priority ready job can be overtaken forever if higher-priority work keeps arriving faster than the CPU drains it. It is not deadlock (module 7) — nothing is held, no cycle exists; the job is simply never chosen. The standard cure is **aging**: a job's effective priority rises the longer it has waited, so any job, however unimportant, eventually outranks the newcomers and runs. Real schedulers implement the same idea as decay-usage calculations or queue promotion (see the MLFQ chapter).",
          "With the algorithms done, assemble the **metrics** — the five rulers from lesson 1, now with their natural users. Turnaround and waiting judge batch completion of *your* job; response time judges interaction; throughput judges the system as a whole; CPU utilization judges capacity. Two warnings for reading any comparison: averages hide outliers (P3's terrible response time vanished inside lesson 1's averages), and gains on one metric routinely cost another — the module's deepest pattern.",
        ],
        equations: [
          {
            expr: "Effective priority = base + w × time_waited",
            symbols: [
              { sym: "base", meaning: "the job's static priority (smaller = more urgent)" },
              { sym: "w", meaning: "aging weight — how fast waiting becomes urgency" },
              { sym: "time_waited", meaning: "how long the job has been ready without running" },
            ],
            note: "One illustrative aging rule: with any w > 0, effective priority eventually beats every fixed base, so starvation becomes impossible.",
          },
          {
            expr: "Throughput = jobs completed ÷ total time",
            symbols: [
              { sym: "jobs completed", meaning: "count of finished jobs in the window" },
              { sym: "total time", meaning: "length of the observation window" },
            ],
            note: "Read the lab's throughput cell after each algorithm run — algorithms differ here less than on waiting time.",
          },
          {
            expr: "CPU utilization = busy time ÷ total time",
            symbols: [
              { sym: "busy time", meaning: "time the CPU ran any job (not idle)" },
              { sym: "total time", meaning: "the same observation window" },
            ],
            note: "High utilization is easy — just keep the queue full. The art is high utilization *and* good response times at once.",
          },
        ],
      },
      {
        kind: "misconceptions",
        items: [
          {
            wrong: "Priority 9 outranks priority 1 — bigger numbers mean more important.",
            right: "In this course (and in ARM's interrupt controller from module 1) it is inverted: smaller number, more urgent — priority 1 preempts priority 9. Some systems do run the other way; the lesson is to check the convention, not to memorize one.",
          },
          {
            wrong: "A starved process is deadlocked — both mean 'never runs'.",
            right: "Deadlock is a structural trap: jobs hold resources and wait on each other in a cycle (module 7), and no scheduling choice can fix it. A starved job waits for a *choice* the scheduler could make any moment — and aging forces that choice eventually.",
          },
        ],
      },
      {
        kind: "knowledge-check",
        questions: [
          {
            id: "kc-m3-pri-1",
            q: "Job A (priority 6) is running under non-preemptive priority scheduling. Job B arrives with priority 2. What happens?",
            options: [
              "A keeps the CPU until it finishes or blocks — B decides only the next pick",
              "B preempts A immediately",
              "A is terminated and B takes over",
              "Both share the CPU in alternate quanta",
            ],
            answerIndex: 0,
            explanation:
              "Non-preemptive priority scheduling never interrupts a running job; B's higher urgency (smaller number) only decides the next selection. In preemptive mode, B would take the CPU at once.",
          },
          {
            id: "kc-m3-pri-2",
            q: "Which change best describes what aging does to a waiting job?",
            options: [
              "Its effective priority rises with the time it has waited",
              "Its burst shrinks as it waits",
              "It is moved to a disk queue until the system is idle",
              "Its priority number is permanently reset to the best value",
            ],
            answerIndex: 0,
            explanation:
              "Aging converts patience into urgency: effective priority = base + w × waited. Given long enough waiting, it beats any fixed stream of higher-priority arrivals — starvation becomes impossible.",
          },
        ],
      },
      {
        kind: "references",
        items: [
          {
            label: "OSTEP, Chapter 8: Multi-Level Feedback Queue — aging via queue promotion",
            url: "https://pages.cs.wisc.edu/~remzi/OSTEP/cpu-sched-mlfq.pdf",
            note: "how the MLFQ design turns our one-knob aging idea into a working scheduler",
          },
          {
            label: "OSTEP, Chapter 7: Scheduling — proportional share and metrics",
            url: "https://pages.cs.wisc.edu/~remzi/OSTEP/cpu-sched.pdf",
          },
          {
            label: "man7: sched(7) — nice values, real-time priorities and Linux policy",
            url: "https://man7.org/linux/man-pages/man7/sched.7.html",
            note: "where the metric talk gets concrete: nice ranges, SCHED_FIFO/SCHED_RR and what Linux actually optimizes",
          },
        ],
      },
      {
        kind: "note",
        body: [
          "The lab's priority mode uses fixed static priorities with no aging, so it can exhibit starvation but never cure it — the cure is yours to reason about in the experiment. Preemptions are free in the lab, its tie-breaks are a course convention (arrival, then id), and real schedulers compute priorities dynamically from usage and wait time, making the table's 'priority' a moving target rather than a constant.",
        ],
      },
    ],
  },
];
