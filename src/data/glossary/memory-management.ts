import type { GlossaryEntry } from "@/types";

/** Glossary — module 5 (Memory Management). The lab models a 64-unit physical strip. */
export const entries: GlossaryEntry[] = [
  {
    id: "hole",
    term: "Hole",
    simple: "A stretch of free memory between allocated regions — a gap looking for a tenant.",
    technical:
      "An entry in the allocator's free list: a contiguous unallocated region of physical memory characterized by its address and size; requests are served by splitting holes, and frees heal them by coalescing with adjacent holes.",
    example:
      "After processes A and C exit, the strip shows holes of 20 and 10 units with B and D still resident between them.",
    related: ["first-fit", "coalescing", "fragmentation", "ram"],
    moduleId: "memory-management",
    lessonRef: "memory-management/contiguous-allocation",
    simId: "memory-allocation-lab",
    refUrl: "https://pages.cs.wisc.edu/~remzi/OSTEP/vm-freespace.pdf",
    refLabel: "OSTEP ch. 17: Free-Space Management",
  },
  {
    id: "first-fit",
    term: "First fit",
    simple: "Take the first hole that's big enough — stop scanning, done.",
    technical:
      "The placement strategy that splits the first free hole with size ≥ request when scanning the free list from its start; fastest to decide (early termination) and empirically as good as or better than best fit, at the cost of clustering small leftovers near the list's head.",
    example:
      "With holes of 18, 13, 22 (address order), a 12-unit request goes into the 18-hole, leaving 6.",
    related: ["hole", "best-fit", "worst-fit", "fragmentation"],
    moduleId: "memory-management",
    lessonRef: "memory-management/contiguous-allocation",
    simId: "memory-allocation-lab",
    refUrl: "https://pages.cs.wisc.edu/~remzi/OSTEP/vm-freespace.pdf",
    refLabel: "OSTEP ch. 17: Free-Space Management",
  },
  {
    id: "best-fit",
    term: "Best fit",
    simple: "Scan every hole; use the smallest one that fits — minimal waste this time.",
    technical:
      "The placement strategy that selects the smallest sufficient hole, minimizing the per-allocation leftover; its known weakness is producing many tiny, unusable slivers over time (plus the full-list scan cost), so simulations usually favor first fit.",
    example:
      "Holes 18, 13, 22 and a 12-unit request: best fit carves the 13-hole, leaving a 1-unit sliver nothing will ever claim.",
    related: ["hole", "first-fit", "worst-fit", "external-fragmentation"],
    moduleId: "memory-management",
    lessonRef: "memory-management/contiguous-allocation",
    simId: "memory-allocation-lab",
    refUrl: "https://pages.cs.wisc.edu/~remzi/OSTEP/vm-freespace.pdf",
    refLabel: "OSTEP ch. 17: Free-Space Management",
  },
  {
    id: "worst-fit",
    term: "Worst fit",
    simple: "Use the biggest hole on purpose, so what's left stays usable.",
    technical:
      "The placement strategy that selects the largest hole, maximizing the leftover in the hope it remains serviceable; historically a poor performer — repeatedly carving the largest hole destroys the only hole that can serve large requests.",
    example:
      "Holes 18, 13, 22 and a 12-unit request: worst fit takes the 22-hole (leftover 10) — and now no hole ≥ 20 remains.",
    related: ["hole", "first-fit", "best-fit", "external-fragmentation"],
    moduleId: "memory-management",
    lessonRef: "memory-management/contiguous-allocation",
    simId: "memory-allocation-lab",
  },
  {
    id: "coalescing",
    term: "Coalescing",
    simple: "Freeing a block merges it with any free neighbors — the strip heals itself for free.",
    technical:
      "The free-side repair in which a released block is merged with any adjacent (immediately preceding and/or following) free region to form a larger hole; immediate coalescing uses an address-ordered free list, while deferred variants batch the merges.",
    example:
      "Holes [0,20) and [35,45) with allocated B(15) at [20,35): freeing B coalesces all three into one 45-unit hole at [0,45).",
    related: ["hole", "compaction", "external-fragmentation", "first-fit"],
    moduleId: "memory-management",
    lessonRef: "memory-management/fragmentation-compaction",
    simId: "memory-allocation-lab",
    refUrl: "https://pages.cs.wisc.edu/~remzi/OSTEP/vm-freespace.pdf",
    refLabel: "OSTEP ch. 17: Free-Space Management",
  },
  {
    id: "fragmentation",
    term: "Fragmentation",
    simple: "Memory that exists but can't be used — either locked inside allocations or scattered between them.",
    technical:
      "The umbrella term for capacity lost to the allocator's granularity and history: internal fragmentation (waste inside allocated blocks) and external fragmentation (free space divided into holes too small to serve real requests).",
    example:
      "35 units free in holes of 20, 10 and 5: a 25-unit request fails — fragmented despite abundant free space.",
    related: ["internal-fragmentation", "external-fragmentation", "compaction", "hole"],
    moduleId: "memory-management",
    lessonRef: "memory-management/fragmentation-compaction",
    simId: "memory-allocation-lab",
    refUrl: "https://pages.cs.wisc.edu/~remzi/OSTEP/vm-freespace.pdf",
    refLabel: "OSTEP ch. 17: Free-Space Management",
  },
  {
    id: "internal-fragmentation",
    term: "Internal fragmentation",
    simple: "Waste inside your own allocation — the suitcase too big for the trip.",
    technical:
      "Allocated size minus requested size: memory an allocator reserved (via fixed partitions, size classes or alignment) that the owner cannot use and no one else can be given; invisible to the free list and cured only by finer granularity.",
    example:
      "A 13-unit request in a 16-unit fixed partition wastes 3 units — 18.75% of the partition — locked inside.",
    related: ["fragmentation", "external-fragmentation", "hole"],
    moduleId: "memory-management",
    lessonRef: "memory-management/fragmentation-compaction",
    simId: "memory-allocation-lab",
  },
  {
    id: "external-fragmentation",
    term: "External fragmentation",
    simple: "Plenty of free space in total, but scattered into gaps too small to use.",
    technical:
      "The gap between total free memory and the largest contiguous hole: free space divided among non-adjacent holes by allocation churn, so requests larger than the biggest hole fail regardless of the total; bounded by (free total − largest hole), managed by coalescing and compaction, abolished by paging.",
    example:
      "Free 30 as holes of 20 + 10: a 25-unit request fails; 10 units are stranded by scattering.",
    related: ["fragmentation", "internal-fragmentation", "compaction", "coalescing", "hole"],
    moduleId: "memory-management",
    lessonRef: "memory-management/fragmentation-compaction",
    simId: "memory-allocation-lab",
  },
  {
    id: "compaction",
    term: "Compaction",
    simple: "Slide all allocations to one end so every hole merges into one big one.",
    technical:
      "The expensive remedy for external fragmentation: relocate allocated blocks toward one end of memory so all free space becomes contiguous, requiring a full copy of every moved byte, fix-up of address references, and (typically) pausing the moved processes; requires hardware relocation to be safe.",
    example:
      "After compaction, holes of 20 + 10 + 5 become one 35-unit hole — the 25-unit request that failed now succeeds.",
    related: ["external-fragmentation", "coalescing", "base-limit", "logical-address"],
    moduleId: "memory-management",
    lessonRef: "memory-management/fragmentation-compaction",
    simId: "memory-allocation-lab",
    refUrl: "https://pages.cs.wisc.edu/~remzi/OSTEP/vm-freespace.pdf",
    refLabel: "OSTEP ch. 17: why compaction is a last resort",
  },
  {
    id: "base-limit",
    term: "Base and limit registers",
    simple: "Two hardware numbers per process: where its memory starts, and how big it is.",
    technical:
      "The MMU pair implementing dynamic relocation: base holds the physical start of the process's region and limit its size; on every access hardware computes physical = base + logical and faults if logical ≥ limit, giving protection and free relocation with no OS involvement in steady state.",
    example:
      "base 30000, limit 5000: logical 4200 → physical 34200; logical 6000 → protection fault (the segmentation fault).",
    related: ["logical-address", "physical-address", "segmentation-fault", "process", "ram"],
    moduleId: "memory-management",
    lessonRef: "memory-management/base-limit-protection",
    simId: "address-translation-lab",
    refUrl: "https://pages.cs.wisc.edu/~remzi/OSTEP/vm-mechanism.pdf",
    refLabel: "OSTEP ch. 15: Mechanism — Address Translation",
  },
  {
    id: "logical-address",
    term: "Logical address",
    simple: "The address a process uses — counted from its own zero, not from RAM's.",
    technical:
      "An address generated by the CPU on behalf of a process, interpreted as an offset within that process's region (0 … limit − 1 in the base/limit scheme); requires translation to reach physical memory, which is what makes relocation and protection possible.",
    example:
      "The process's instruction says 'load from 4200'; only the MMU knows that means physical 34200 today.",
    related: ["physical-address", "virtual-address", "base-limit", "process"],
    moduleId: "memory-management",
    lessonRef: "memory-management/base-limit-protection",
    simId: "address-translation-lab",
  },
  {
    id: "physical-address",
    term: "Physical address",
    simple: "The real location in RAM chips — what the memory hardware actually sees.",
    technical:
      "An address on the memory bus naming an actual storage cell; in the base/limit scheme it equals base + logical for legal accesses, and the OS arranges different processes' [base, base+limit) windows to be disjoint.",
    example:
      "Two processes both use logical 4200, but their bases (30000 and 50000) send them to different physical cells.",
    related: ["logical-address", "base-limit", "ram", "virtual-address"],
    moduleId: "memory-management",
    lessonRef: "memory-management/base-limit-protection",
    simId: "address-translation-lab",
  },
  {
    id: "virtual-address",
    term: "Virtual address",
    simple: "The process's private fake address space — 'as if it had the machine to itself'.",
    technical:
      "The address-space abstraction each process executes in; in this module's simple scheme, virtual/logical addresses translate via base+limit, while module 6's virtual memory translates them through page tables — supporting growth, sharing and swapping beyond base/limit's one contiguous window.",
    example:
      "Every process on your machine believes its code starts at the same low address — each has its own virtual space.",
    related: ["logical-address", "physical-address", "base-limit", "process", "ram"],
    moduleId: "memory-management",
    lessonRef: "memory-management/base-limit-protection",
    refUrl: "https://pages.cs.wisc.edu/~remzi/OSTEP/vm-intro.pdf",
    refLabel: "OSTEP ch. 13: The Abstraction: Address Spaces",
  },
  {
    id: "segmentation-fault",
    term: "Segmentation fault",
    simple: "The crash you get when your program touches memory it was never given.",
    technical:
      "The userspace-visible consequence of a protection fault: an access outside the process's allowed region (logical ≥ limit in the base/limit scheme) traps into the OS, which by default terminates the offending process with SIGSEGV.",
    example:
      "Dereferencing a wild pointer forms an address beyond the region; the MMU faults before any byte is touched, and the shell prints 'Segmentation fault'.",
    related: ["base-limit", "logical-address", "physical-address", "trap", "process"],
    moduleId: "memory-management",
    lessonRef: "memory-management/base-limit-protection",
    simId: "address-translation-lab",
  },
];
