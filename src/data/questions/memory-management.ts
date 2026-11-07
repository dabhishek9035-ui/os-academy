import type { QuizQuestion } from "@/types";

/**
 * Assessment bank — module 5 (Memory Management). 20 questions.
 * Hand-verified numerics:
 *   - Holes 18, 13, 22 (address order), request 12:
 *     first fit → 18-hole, leftover 6 · best fit → 13-hole, leftover 1 · worst fit → 22-hole, leftover 10.
 *   - Free B(15) between holes [0,20) and [35,45) → coalesced hole [0,45) of 45 units.
 *   - 13-unit request in a 16-unit partition → 3 units internal = 18.75%.
 *   - Holes 20 + 10 (free 30): largest satisfiable request 20; after compaction 35 (holes 20/10/5) or 30+10… see q12.
 *   - base 30000, limit 5000: logical 4200 → 34200; logical 6000 → fault (6000 ≥ 5000).
 */
export const questions: QuizQuestion[] = [
  {
    id: "m5-q01",
    moduleId: "memory-management",
    lessonRef: "memory-management/why-manage-memory",
    difficulty: "easy",
    kind: "concept",
    stem: "Two programs load into RAM and nothing manages memory. What is the inevitable result?",
    options: [
      "Either program can read or write the other's bytes (and the OS's) — one stray pointer corrupts a neighbor",
      "They simply run somewhat slower than alone",
      "The CPU refuses to execute two programs sharing one RAM",
      "Only one program may exist at a time, by hardware rule",
    ],
    answerIndex: 0,
    whyNot: [
      null,
      "Slowness is not the failure — silent corruption is; without protection there is nothing to stop an address into a neighbor.",
      "No such refusal exists: with no management, nothing checks addresses at all.",
      "Hardware happily runs many programs in one RAM — dividing and protecting it is precisely the OS's job.",
    ],
    explanation:
      "Without a memory manager there is no referee: every address any program forms reaches RAM unchecked. Multiprogramming needs allocation, bookkeeping — and hardware-enforced protection.",
  },
  {
    id: "m5-q02",
    moduleId: "memory-management",
    lessonRef: "memory-management/contiguous-allocation",
    difficulty: "easy",
    kind: "concept",
    stem: "In dynamic (variable-size) allocation, what is a 'hole'?",
    options: [
      "A stretch of free memory between allocated regions",
      "A region reserved for the OS kernel",
      "An allocation the program forgot to free (a leak)",
      "A page that has been written out to disk",
    ],
    answerIndex: 0,
    whyNot: [
      null,
      "Kernel regions are allocated, occupied space — the opposite of a hole.",
      "A leaked allocation is still *allocated*; it shows in the allocated map, not the free list.",
      "Paging to disk is module 6's machinery — unrelated to the free list of this module.",
    ],
    explanation:
      "Holes are the free-list entries: gaps between allocated blocks, in various sizes. Choosing which hole to carve into is this module's allocation question.",
  },
  {
    id: "m5-q03",
    moduleId: "memory-management",
    lessonRef: "memory-management/contiguous-allocation",
    difficulty: "easy",
    kind: "numeric",
    stem: "Free holes in address order: 18, 13 and 22 units. A request of 12 arrives under FIRST fit. Which hole is used, and what leftover remains?",
    options: [
      "The 18-hole — leftover 6",
      "The 13-hole — leftover 1",
      "The 22-hole — leftover 10",
      "No hole fits — the request fails",
    ],
    answerIndex: 0,
    whyNot: [
      null,
      "The 13-hole is BEST fit's choice (smallest sufficient), not first fit's — first fit stops at the first sufficient hole.",
      "The 22-hole is WORST fit's choice (largest), which first fit never reaches — it stopped at 18.",
      "All three holes are ≥ 12, so the request certainly succeeds under every strategy.",
    ],
    explanation:
      "First fit scans from the front and splits the first hole with size ≥ 12: the 18-hole, leaving a 6-unit leftover behind at its front.",
  },
  {
    id: "m5-q04",
    moduleId: "memory-management",
    lessonRef: "memory-management/contiguous-allocation",
    difficulty: "medium",
    kind: "numeric",
    stem: "Same hole list — 18, 13, 22 in address order — and the same 12-unit request, now under BEST fit. Which hole is used, and what leftover remains?",
    options: [
      "The 13-hole — leftover 1",
      "The 18-hole — leftover 6",
      "The 22-hole — leftover 10",
      "The 13-hole — leftover 13",
    ],
    answerIndex: 0,
    whyNot: [
      null,
      "The 18-hole is first fit's pick — first *sufficient* is not *smallest sufficient*; best fit must examine every hole.",
      "The 22-hole is worst fit's pick — best fit deliberately avoids the big holes.",
      "The leftover is hole minus request: 13 − 12 = 1, not the hole's whole size.",
    ],
    explanation:
      "Best fit selects the smallest hole ≥ 12: the 13-hole, leaving a 1-unit sliver — minimal waste now, but a sliver nothing real will ever claim.",
  },
  {
    id: "m5-q05",
    moduleId: "memory-management",
    lessonRef: "memory-management/contiguous-allocation",
    difficulty: "medium",
    kind: "numeric",
    stem: "Same hole list — 18, 13, 22 — and the same 12-unit request, under WORST fit. Which hole is used, and what leftover remains?",
    options: [
      "The 22-hole — leftover 10",
      "The 18-hole — leftover 6",
      "The 13-hole — leftover 1",
      "The 22-hole — leftover 22",
    ],
    answerIndex: 0,
    whyNot: [
      null,
      "First fit's pick: the first sufficient hole from the front — worst fit is deliberately not that.",
      "Best fit's pick: the smallest sufficient — worst fit is deliberately not that either.",
      "The leftover is what remains after carving: 22 − 12 = 10, not the untouched hole.",
    ],
    explanation:
      "Worst fit takes the largest hole (22), leaving 10 units — big enough to stay useful, but the strip's only hole ≥ 20 is now gone.",
  },
  {
    id: "m5-q06",
    moduleId: "memory-management",
    lessonRef: "memory-management/contiguous-allocation",
    difficulty: "easy",
    kind: "concept",
    stem: "Which placement strategy makes the simplest decision and can stop scanning the free list earliest?",
    options: [
      "First fit — take the first hole that is big enough",
      "Best fit — it just picks the minimum",
      "Worst fit — the largest hole is easy to spot",
      "None — every strategy scans the entire list",
    ],
    answerIndex: 0,
    whyNot: [
      null,
      "Picking the minimum sufficient hole requires examining every hole — 'just picks the minimum' is exactly the full scan.",
      "Finding the largest hole also requires seeing the whole list.",
      "First fit stops at the first sufficient hole — later, larger holes are never examined.",
    ],
    explanation:
      "First fit's speed is structural: the scan ends at the first hole ≥ request. Best and worst fit must always complete the scan to know they found the min/max.",
  },
  {
    id: "m5-q07",
    moduleId: "memory-management",
    lessonRef: "memory-management/fragmentation-compaction",
    difficulty: "easy",
    kind: "concept",
    stem: "Which pairing of fragmentation types is correct?",
    options: [
      "Internal = waste inside an allocated block; external = free space scattered into unusable holes",
      "Internal = holes between allocations; external = waste inside a partition",
      "Both describe waste inside allocated partitions",
      "Both describe free space lost to scattering",
    ],
    answerIndex: 0,
    whyNot: [
      null,
      "Swapped: the inside-a-partition waste is internal, the between-allocations scattering is external.",
      "Only the first half describes internal fragmentation; the two are distinct phenomena.",
      "Scattered free space is external fragmentation — internal fragmentation is not about free space at all.",
    ],
    explanation:
      "Internal: you own it and can't use it (a 13-unit request in a 16-unit partition). External: nobody owns it, but it's chopped too small to serve (holes of 20 + 10 can't fit a 25-unit request).",
  },
  {
    id: "m5-q08",
    moduleId: "memory-management",
    lessonRef: "memory-management/fragmentation-compaction",
    difficulty: "medium",
    kind: "numeric",
    stem: "A request for 13 units is served from a fixed 16-unit partition. How much memory is internally fragmented, as a percentage of the partition?",
    options: [
      "18.75% — 3 of the 16 units",
      "23% — 3 of the 13 requested units",
      "25% — a quarter of the partition",
      "3% — 3 units out of 100",
    ],
    answerIndex: 0,
    whyNot: [
      null,
      "3/13 measures the waste against the *request*; the partition (16) is what was actually consumed.",
      "A quarter would require 4 wasted units; the waste here is 16 − 13 = 3.",
      "Percentages are of the 16-unit partition, not of an arbitrary 100 units.",
    ],
    explanation:
      "Internal fragmentation = allocated − requested = 16 − 13 = 3 units, which is 3/16 = 18.75% of the partition — locked inside, unusable by anyone else.",
  },
  {
    id: "m5-q09",
    moduleId: "memory-management",
    lessonRef: "memory-management/fragmentation-compaction",
    difficulty: "hard",
    kind: "numeric",
    stem: "Free space totals 30 units, scattered as holes of 20 and 10 separated by allocated blocks. A 25-unit request fails. What is the largest request that could succeed right now, without compaction?",
    options: [
      "20 — the largest single hole",
      "30 — the total free space",
      "10 — the smallest hole",
      "25 — half of the 64-unit strip",
    ],
    answerIndex: 0,
    whyNot: [
      null,
      "Total free space is not usable at once — allocations here must be contiguous, and no single hole holds 30.",
      "The smallest hole does not bound what fits; larger holes exist and succeed.",
      "The 25-unit request is precisely the one that FAILED — it cannot also be the largest that succeeds.",
    ],
    explanation:
      "A contiguous allocator can only use one hole at a time: the bound is the largest hole, 20. The other 10 units are stranded by scattering — external fragmentation, quantified.",
  },
  {
    id: "m5-q10",
    moduleId: "memory-management",
    lessonRef: "memory-management/fragmentation-compaction",
    difficulty: "medium",
    kind: "state-transition",
    stem: "A 20-unit hole sits at [0,20) and a 10-unit hole at [35,45), with allocated block B (15 units) between them at [20,35). B is freed. What happens?",
    options: [
      "All three merge into one hole of 45 units at [0,45)",
      "Nothing merges — the two holes are separated by 15 units of address space",
      "The 20-hole grows to 35; the 10-hole waits for its own neighbor to free",
      "The allocator performs a compaction first, then merges",
    ],
    answerIndex: 0,
    whyNot: [
      null,
      "The separation *was* B's 15 units — which just became free, so nothing separates the regions any more.",
      "Both neighbors of the freed block are free, so both merges happen immediately, not one.",
      "No compaction is needed: coalescing handles *adjacent* free regions for free; compaction is for non-adjacent ones.",
    ],
    explanation:
      "Coalescing on free: the freed block checks its neighbors, finds free on both sides, and [0,20) + [20,35) + [35,45) become a single 45-unit hole. Free healing, zero copying.",
  },
  {
    id: "m5-q11",
    moduleId: "memory-management",
    lessonRef: "memory-management/fragmentation-compaction",
    difficulty: "medium",
    kind: "concept",
    stem: "Why don't general-purpose operating systems compact memory after every allocation failure?",
    options: [
      "Compaction must copy every moved byte, fix up address references, and pause the moved processes — a large global cost",
      "Compaction is not physically possible on real hardware",
      "Compaction only works when memory is completely full",
      "The OS cannot change which physical bytes a process uses",
    ],
    answerIndex: 0,
    whyNot: [
      null,
      "Copying memory is entirely possible — gigabytes at memory bandwidth, plus the fix-ups and the pause, are what make it prohibitive.",
      "Fragmented-but-not-full memory is exactly where compaction is most relevant; fullness is not the trigger.",
      "Changing physical placement is precisely what relocation enables (base/limit here, paging in module 6) — the cost, not the possibility, is the obstacle.",
    ],
    explanation:
      "Compaction buys contiguity with a full-copy, fix-up-everything, stop-the-world operation. Real systems prefer to avoid needing it — coalescing, size classes, or paging (module 6).",
  },
  {
    id: "m5-q12",
    moduleId: "memory-management",
    lessonRef: "memory-management/fragmentation-compaction",
    difficulty: "medium",
    kind: "numeric",
    stem: "Holes of 20, 10 and 5 units (total 35) are separated by allocated blocks. Compaction runs. What is the largest request that can now succeed?",
    options: [
      "35 — all holes merged into one",
      "20 — compaction does not change hole sizes",
      "64 — compaction empties the whole strip",
      "30 — the two larger holes summed",
    ],
    answerIndex: 0,
    whyNot: [
      null,
      "20 was the largest hole BEFORE compaction; after sliding, the holes are one contiguous stretch of 35.",
      "Compaction moves allocated blocks together; it does not free anything — allocated memory stays allocated.",
      "30 is an arbitrary partial sum; compaction merges ALL the holes, not two of them.",
    ],
    explanation:
      "After compaction the largest satisfiable request equals the total free space: 35 units in one contiguous hole. The 20-hole ceiling was the fragmentation, not a law.",
  },
  {
    id: "m5-q13",
    moduleId: "memory-management",
    lessonRef: "memory-management/fragmentation-compaction",
    difficulty: "medium",
    kind: "misconception",
    stem: "A student sees 35 free units in a 64-unit strip (holes of 20, 10, 5) and says: 'any request under 35 must succeed.' What is the best correction?",
    options: [
      "Only the largest single hole (20) bounds a contiguous allocation — scattered free space cannot be combined on demand",
      "Correct — free space is freely movable, so any request under the total works",
      "Correct only if the allocator uses best fit",
      "Wrong only because the strip is 64 units — the student should have said 64",
    ],
    answerIndex: 0,
    whyNot: [
      null,
      "In a contiguous allocator free space is NOT fungible: holes at different addresses cannot be added together without moving allocated blocks.",
      "No placement strategy creates contiguity — first, best and worst fit all choose among existing holes.",
      "The strip size is irrelevant; the argument fails because of scattering, whatever the strip's size.",
    ],
    explanation:
      "Free total bounds nothing; the largest hole bounds everything. 25 free-but-scattered units beyond a 20-hole are stranded until compaction (or module 6's paging) intervenes.",
  },
  {
    id: "m5-q14",
    moduleId: "memory-management",
    lessonRef: "memory-management/contiguous-allocation",
    difficulty: "easy",
    kind: "misconception",
    stem: "Best fit minimizes the leftover of each individual allocation. A student concludes it is therefore the best strategy overall. What is the catch?",
    options: [
      "Its tiny leftovers are useless slivers — over time it riddles memory with unusable holes; first fit does at least as well in practice",
      "None — minimizing each leftover really does minimize total waste",
      "The catch is that best fit refuses any request that does not fit a hole exactly",
      "The catch is that best fit cannot be implemented on real hardware",
    ],
    answerIndex: 0,
    whyNot: [
      null,
      "Locally optimal is not globally optimal: slivers accumulate, and simulations show first fit equal or better.",
      "Best fit happily splits any sufficient hole — exact fits are a bonus, not a requirement.",
      "It is a linear scan and a comparison — trivially implementable; its problem is behavioral, not mechanical.",
    ],
    explanation:
      "Each best-fit allocation leaves the *smallest possible* leftover — which is to say, a leftover almost too small to use. The hole list degenerates into slivers. Greedy per-choice, poor long-run citizenship.",
  },
  {
    id: "m5-q15",
    moduleId: "memory-management",
    lessonRef: "memory-management/base-limit-protection",
    difficulty: "easy",
    kind: "concept",
    stem: "Which statement about logical and physical addresses (in the base/limit scheme) is correct?",
    options: [
      "A logical address is the process's own offset from 0; hardware translates it to physical via base + logical",
      "They are two names for the same number",
      "Logical addresses are physical addresses divided by two",
      "The process chooses its own physical addresses directly",
    ],
    answerIndex: 0,
    whyNot: [
      null,
      "They coincide only when base = 0; generally physical = base + logical, and the process never learns base.",
      "No division is involved — translation is an addition plus a bounds check.",
      "The entire point of the scheme is that the process does NOT choose (or even know) physical addresses.",
    ],
    explanation:
      "The process lives in logical addresses counted from its own 0; the MMU adds base and checks limit on every access. Relocation and protection both fall out of that one mechanism.",
  },
  {
    id: "m5-q16",
    moduleId: "memory-management",
    lessonRef: "memory-management/base-limit-protection",
    difficulty: "medium",
    kind: "numeric",
    stem: "base = 30000, limit = 5000. The process accesses logical address 4200. What physical address results?",
    options: ["34200", "35200", "4200", "36000"],
    answerIndex: 0,
    whyNot: [
      null,
      "35200 is base + limit — one past the region's last legal byte, not the translation of 4200.",
      "4200 is the untranslated logical address; translation adds the base.",
      "36000 is base + 6000 — the translation of an address that should have FAULTED (6000 ≥ limit), not of 4200.",
    ],
    explanation:
      "4200 < 5000, so the access is legal: physical = base + logical = 30000 + 4200 = 34200.",
  },
  {
    id: "m5-q17",
    moduleId: "memory-management",
    lessonRef: "memory-management/base-limit-protection",
    difficulty: "hard",
    kind: "prediction",
    stem: "Same region: base = 30000, limit = 5000. The process accesses logical address 6000. What happens?",
    options: [
      "Protection fault — 6000 ≥ limit, so no translation happens and the OS (typically) terminates the process",
      "It translates to 36000 — legal, because physical RAM is certainly that large",
      "It wraps around to logical 1000 — accesses beyond the limit cycle back into range",
      "It translates to 30000 — out-of-range accesses clamp to the base",
    ],
    answerIndex: 0,
    whyNot: [
      null,
      "Addressable is not permitted: 36000 exists in RAM but is outside this process's region — the bounds check fires first.",
      "No wraparound exists in this mechanism; the MMU compares and faults, it does not reduce modulo.",
      "No clamping either — an illegal offset is a fault, not a redirect to the region's start.",
    ],
    explanation:
      "Legal logical offsets are 0 … limit − 1. Logical 6000 ≥ 5000 triggers the protection fault (the segmentation fault) before any memory is touched.",
  },
  {
    id: "m5-q18",
    moduleId: "memory-management",
    lessonRef: "memory-management/base-limit-protection",
    difficulty: "medium",
    kind: "concept",
    stem: "A protection fault fires while a process is running. What does the OS typically do about the offending process?",
    options: [
      "Terminates it — the classic 'segmentation fault', which ordinary programs do not handle",
      "Corrects the address and lets the process continue",
      "Nothing — the hardware handles faults entirely on its own",
      "Compacts memory so future accesses land inside the region",
    ],
    answerIndex: 0,
    whyNot: [
      null,
      "The OS does not silently rewrite a program's addresses — the access was a bug; continuing would hide corruption.",
      "The hardware traps INTO the OS (module 1's interrupt machinery); the OS must decide the response.",
      "Compaction moves memory but cannot make an offset beyond the limit legal — the region's size is the issue.",
    ],
    explanation:
      "The fault is a trap into the OS, whose default response is to terminate the offender with the segmentation fault users know. The innocent neighbors were never touched — that is the mechanism working.",
  },
  {
    id: "m5-q19",
    moduleId: "memory-management",
    lessonRef: "memory-management/base-limit-protection",
    difficulty: "easy",
    kind: "concept",
    stem: "What do the base and limit registers contain?",
    options: [
      "base = the physical start of the process's region; limit = the region's size (the largest legal offset)",
      "base = the process's first logical address; limit = its last logical address",
      "base = the total size of RAM; limit = the maximum number of processes",
      "base = the stack pointer; limit = the heap pointer",
    ],
    answerIndex: 0,
    whyNot: [
      null,
      "Logical addresses start at 0 by definition — there is no 'first logical address' to store.",
      "RAM size and process limits are system-wide facts, not per-process translation state.",
      "Stack and heap pointers are ordinary per-thread software state — the MMU's registers are set by the OS at context switch.",
    ],
    explanation:
      "The pair defines the process's physical window: [base, base + limit). Every access is translated by adding base and checked against limit — in hardware, on every access.",
  },
  {
    id: "m5-q20",
    moduleId: "memory-management",
    lessonRef: "memory-management/fragmentation-compaction",
    difficulty: "hard",
    kind: "concept",
    stem: "Beyond slivers, what deeper reason makes no placement strategy able to truly SOLVE external fragmentation?",
    options: [
      "All strategies only split existing holes — none can merge non-adjacent holes or move blocks; that needs coalescing, compaction, or abandoning contiguity (module 6)",
      "Placement strategies are only theoretical — no real allocator uses any of them",
      "Because RAM physically cannot contain holes of different sizes",
      "Because best fit always degenerates into worst fit over time",
    ],
    answerIndex: 0,
    whyNot: [
      null,
      "First/best/worst fit are the textbook heart of real allocator design — the point is their structural limit, not their absence.",
      "Holes of different sizes are ordinary — that is exactly why a strategy is needed at all.",
      "The two never merge into each other: they differ by selection rule (min vs max sufficient), and both merely split holes.",
    ],
    explanation:
      "Placement is a local decision among existing holes. Fragmentation's structure — non-adjacent free regions — is untouched by any of them; healing requires moving or merging, which is compaction's job, or ending contiguity entirely, which is paging's.",
  },
];
