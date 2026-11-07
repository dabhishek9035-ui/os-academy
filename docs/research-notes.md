# Research Notes

How authoritative sources informed the Visual OS Academy curriculum,
simulations, and reference lists — with an honest verification log.

All lesson prose, diagrams, examples, questions and simulations in this
repository are **original work**. External sources are cited on the relevant
lessons as *pointers for further reading* and shaped our pedagogy and model
design; nothing is reproduced from them beyond short attributed phrases.

## Sources consulted & how each was used

### Operating Systems: Three Easy Pieces (OSTEP) — primary text reference
- **URLs:** https://pages.cs.wisc.edu/~remzi/OSTEP/ (site) plus the canonical
  chapter PDFs (e.g. `/cpu-mechanisms.pdf`, `/cpu-sched.pdf`, `/cpu-api.pdf`,
  `/cpu-intro.pdf`, `/threads-intro.pdf`, `/threads-locks.pdf`,
  `/threads-sema.pdf`, `/threads-cv.pdf`, `/threads-beyond.pdf`,
  `/vm-intro.pdf`, `/vm-mechanism.pdf`, `/vm-psm.pdf`, `/vm-freespace.pdf`,
  `/vm-swapping.pdf`, `/file-intro.pdf`, `/file-devices.pdf`).
- **Verified:** 2026-10, fetched the landing page. Confirmed: *Operating
  Systems: Three Easy Pieces*, Version 1.10 (Nov 2023), by Remzi & Andrea
  Arpaci-Dusseau (UW–Madison), security chapters by Peter Reiher. The book is
  "and will always be free in PDF form"; instructors are asked to link to
  chapters rather than redistribute them — which is exactly what we do.
- **Informed:** the course's three-pillar framing (virtualization,
  concurrency, persistence); the problem-first lesson structure (the
  "scheduling" chapter's approach of motivating FCFS→SJF→MLFQ as answers to
  problems became our Module 3 arc); limited-direct-execution framing for
  Modules 1/11; the bounded-buffer and dining-philosopher presentations in
  Module 8; pacer/fault-cost arithmetic (effective-access-time) used in
  Module 6 quiz questions.

### xv6-riscv (MIT PDOS)
- **URLs:** https://github.com/mit-pdos/xv6-riscv (repo), MIT 6.1810 course
  site for the xv6 book.
- **Verified:** 2026-10, fetched the repo page. Confirmed: xv6 is a
  re-implementation of Unix v6 for a modern RISC-V multiprocessor, written as
  a teaching OS for MIT's 6.1810; the LICENSE file in the repo applies
  (MIT-style; the repo page defers to the LICENSE file).
- **Informed:** Module 0's kernel/user-space lesson (a real, tiny kernel to
  point at); the boot chain description (Module 0); honest "this is a
  teaching abstraction" framing throughout — xv6 demonstrates that
  simplification is a legitimate teaching tool when declared.

### Linux man-pages (man7.org)
- **URLs:** https://man7.org/linux/man-pages/ with the specific pages
  fork(2), execve(2), wait(2), pipe(2), mmap(2), proc(5), syscalls(2),
  sched(7), pthreads(7), sem_overview(7).
- **Verified:** 2026-10, fetched fork(2) directly: "creates a new process by
  duplicating the calling process" — the semantics our fork/wait lab teaches
  (with documented simplifications).
- **Informed:** Modules 2 (process API semantics: fork/exec/wait, zombies,
  orphans, re-parenting to init), 8 (semaphore overview), 9 (paths,
  permissions), 11 (syscall surface). Glossary entries cite the relevant
  man page as `refUrl`.

### POSIX / The Open Group Base Specifications
- **URLs:** https://pubs.opengroup.org/onlinepubs/9799919799/ (Issue 8).
- **Verified:** 2026-10, fetched the landing page; confirmed Issue 8.
- **Informed:** the definitions of fork/exec/wait/pthread/semaphore behavior
  used across Modules 2, 4, 8; the "POSIX semantics vs. our lab's
  simplification" annotations (e.g. our wait() waits for all children; POSIX
  wait() reaps an arbitrary child — the lesson text calls this out).

### RISC-V specifications
- **URLs:** https://docs.riscv.org/ (redirects to the RISC-V Specifications
  Library — noted honestly; the redirect stub was all the fetch returned).
- **Informed:** privilege modes (M/S/U) and trap-based privilege transitions
  described in Module 0's kernel/user lesson and Module 1's interrupt model;
  the choice to teach the interrupt lifecycle as an architecture family
  ("RISC-flavoured") rather than any single ISA.

### Linux kernel documentation
- **URLs:** https://docs.kernel.org/ (boot config, scheduler, memory
  management, DMA API overviews).
- **Informed:** Module 10's driver/controller/DMA vocabulary; Module 12's
  multicore and overcommit discussion; the "real kernels do X" asides (e.g.
  spooling, page cache). Fetched during content development; used as a
  vocabulary/behavior check rather than a design driver.

### Other curriculum-design influences (consulted, not fetched for this log)
- **Silberschatz, Galvin & Gagne, *Operating System Concepts*** — the
  Banker's algorithm matrices used in our Module 7 lab follow the classic
  5-process/3-resource teaching example (re-derived and re-tested by hand;
  see `tests/deadlock-engine.test.ts`), and the disk-scheduling queue
  (head 53; requests 98,183,37,122,14,124,65,67) is the standard example set —
  our engine reproduces the textbook totals (FCFS 640, SSTF 236, SCAN 331,
  LOOK 299, C-SCAN 382, C-LOOK 322) as unit tests.
- **Tanenbaum, *Modern Operating Systems*** — general sanity check on
  terminology.

## Attribution & licensing summary

| Source | License / terms | Our usage |
|---|---|---|
| OSTEP | Free-to-read PDFs; © Arpaci-Dusseau. Instructors asked to link, not copy. | Link-only references on lessons |
| xv6 / xv6 book | MIT License (repo LICENSE file) | Link-only references |
| Linux kernel docs | GPL-2.0-style documentation licensing (per-process/licensing notes) | Link-only references; vocabulary |
| man-pages | Per-page licenses (GPL/Linux man-pages project terms) | Link-only references; semantics |
| POSIX (Open Group) | IEEE/Open Group copyright; free web reading | Link-only references; semantics |

No source text is embedded in this repository beyond short attributed
phrases (e.g. a one-line man-page definition quoted in a glossary entry).

## Educational simplifications inventory (deliberate, declared in-product)

Every lab repeats its simplifications in a visible "Model notes" strip; the
full list lives in `docs/simulation-specifications.md`. Highlights:

1. Single CPU, integer time units, batch processes without I/O bursts in the
   scheduling model (waiting = turnaround − burst is exact only there).
2. Instantaneous context switches (no switch cost in timelines).
3. Interrupt Lab: one fixed handler per source, every pipeline stage = 1 tick,
   exceptions unmaskable, polling = busy-wait with a fixed device wait.
4. fork copies the parent's remaining burst (not pages); exec renames only.
5. Memory lab: 64 units, contiguous allocation only, free compaction.
6. VM lab: 16 pages × 16 units, one-level page table, TLB size 2, COW copies
   "conceptually" (frames are not duplicated in the model).
7. Disk: movement in cylinders; no rotational latency or seek curve; C-SCAN
   counts the wrap as a full sweep.
8. Filesystem: flat path namespace, no directories-as-files, no content —
   layout only.
9. I/O: per-block fixed tick costs (no seek/rotate/transfer curves).
10. Protection: Unix triads + kernel-mode bypass as the superuser analog.
11. Virtualization: static layer stacks; vCPU load is a toy damped model.
12. RT: EDF over one hyperperiod (cap 48 ticks), deadline = period.

## Source verification log

| Fetch | Result |
|---|---|
| `https://pages.cs.wisc.edu/~remzi/OSTEP/` | confirmed title, authors, v1.10 (Nov 2023), free-PDF terms, chapter list |
| `https://man7.org/linux/man-pages/man2/fork.2.html` | confirmed fork(2) semantics |
| `https://github.com/mit-pdos/xv6-riscv` | confirmed purpose, teaching role, license pointer |
| `https://pubs.opengroup.org/onlinepubs/9799919799/` | confirmed Open Group Base Specifications Issue 8 |
| `https://docs.riscv.org/` | redirect stub → RISC-V Specifications Library (content not fetched; recorded honestly) |
| `https://docs.kernel.org/` | consulted during content development via curriculum agents (canonical URLs cited in lessons) |

Lesson-level references were authored against these canonical URLs by the
curriculum team and re-checked for shape (see `tests/content-integrity.test.ts`).
