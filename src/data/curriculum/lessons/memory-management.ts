import type { Lesson } from "@/types";

/**
 * Module 5 — Memory Management.
 * Dividing RAM among processes: allocation strategies, the fragmentation they
 * cause, compaction, and the base/limit hardware that keeps everyone honest.
 * The lab models a 64-unit physical strip; all numbers in these lessons use it.
 */
export const lessons: Lesson[] = [
  {
    id: "memory-management/why-manage-memory",
    moduleId: "memory-management",
    title: "Why Memory Needs Managing",
    minutes: 8,
    objectives: [
      "explain what goes wrong when processes share RAM with no referee",
      "list the three jobs of a memory manager: allocate, protect, and track",
      "contrast fixed partitions with dynamic allocation as the two starting points",
    ],
    sections: [
      {
        kind: "problem",
        body: [
          "Modules 3 and 4 made many processes take turns on one CPU — but the illusion of a private machine needs more than CPU time. Every process needs **memory**: its code, its globals, its heap and stack. And unlike the CPU, memory cannot be 'taken turns' — a process's instructions must sit somewhere in RAM *the whole time it runs*, contiguous (for now — module 6 changes that) and untouched by anyone else.",
          "Suppose the OS did nothing: the first program loaded at address 0, the second wherever its linker guessed — straight into the middle of the first. One stray pointer in process A reads process B's passwords; one bad write corrupts the OS itself. Multiprogramming without memory management is not merely inefficient — it is impossible. Something must divide RAM, keep the tenants honest, and remember who owns what.",
        ],
      },
      {
        kind: "intuition",
        body: [
          "Think of physical memory as a long **street of numbered parking spots** (address 0 at one end, say 64 spots in our lab). The OS is the **parking attendant**: it assigns each arriving process a stretch of consecutive spots, records the assignment on a clipboard, and — critically — tows anyone caught parking in a neighbor's spot.",
          "Two attendants exist in the wild. One paints fixed-width lines the day the lot opens (say, every car gets exactly 8 spots whether it is a bicycle or a bus) — simple, and wasteful in both directions. The other assigns on demand, whatever length you need, squeezing cars in wherever a gap fits — flexible, and soon the lot is peppered with gaps too small for anyone. The whole module is about living with the second attendant, because the first wastes too much.",
        ],
      },
      {
        kind: "visual",
        simId: "memory-allocation-lab",
        body: [
          "The **Memory Allocation Lab** is the street itself: a 64-unit strip of physical memory. Allocate processes of various sizes and watch the OS carve them into the strip; free them and watch holes open. The strip shows every block's owner and extent, and a live **external fragmentation** stat tracks how scattered the free space has become.",
          "Before touching anything else, try the thought experiment the lab makes testable: allocate two processes, then attempt a third that is larger than any *single* free stretch but smaller than the *total* free space. The lab will refuse — and that refusal is this module in one sentence.",
        ],
      },
      {
        kind: "technical",
        body: [
          "The memory manager has three standing jobs. **Allocation**: when a process (or `malloc` inside it) requests space, find a free region large enough and record it. **Protection**: make it impossible for one process to read or write another's region — or the OS's — enforced by hardware, not goodwill (lesson 4). **Bookkeeping**: track which bytes are owned by whom and which are free, so frees return real space and leaks (never-freed allocations) are visible.",
          "Two families of scheme start the story. **Fixed (static) partitions** divide memory into predetermined sizes at boot; a process goes into any partition big enough to hold it. Simple, zero bookkeeping cleverness — but a 3-unit process in a 8-unit partition permanently wastes 5 units *inside* its partition (**internal fragmentation**), and a 9-unit process cannot load at all. **Dynamic (variable) allocation** gives each request exactly what it asks, carving regions as needed — no internal waste at allocation time, but as processes come and go the strip develops scattered **holes**, and we inherit the allocation problem: which hole should a new request go into? That question owns the next two lessons.",
          "One more idea enters here because everything downstream depends on it: the addresses a process uses are about to become a *different thing* from the addresses RAM uses. In this module the mapping is one register each for start and size (lesson 4's base and limit); module 6 generalizes it into virtual memory.",
        ],
        equations: [
          {
            expr: "Total memory = allocated (Σ block sizes) + free (Σ hole sizes)",
            symbols: [
              { sym: "block sizes", meaning: "sizes of currently allocated regions" },
              { sym: "hole sizes", meaning: "sizes of the free gaps between them" },
            ],
            note: "The strip's conservation law. Allocation moves units from 'free' to 'allocated' but the total never changes — which is exactly why 'plenty of free space in total' can still mean 'cannot allocate', if it is scattered.",
          },
        ],
      },
      {
        kind: "worked-example",
        steps: [
          {
            title: "A day on the 64-unit street",
            body: [
              "Boot: the strip is one hole of 64. Process A asks for 20 → allocated at [0, 20). B asks 15 → [20, 35). C asks 10 → [35, 45). D asks 19 → [45, 64). Full house: allocated 64, free 0.",
              "A exits → hole [0, 20) of 20 units. C exits → hole [35, 45) of 10 units. Bookkeeping check (the conservation law): allocated = B 15 + D 19 = 34; free = 20 + 10 = 30; 34 + 30 = 64. ✓",
            ],
          },
          {
            title: "The refusal that motivates a module",
            body: [
              "A new process E asks for 25 units. Free space totals 30 — E fits 'in principle'. But the holes are 20 and 10: no *single* free stretch holds 25. Without the ability to move things around, the allocator must refuse.",
              "This gap between '30 free' and 'largest hole 20' is **external fragmentation**: free memory exists, but it is fragmented across holes. Next lessons quantify it and try two fixes — smarter hole choice, and compaction.",
            ],
          },
        ],
      },
      {
        kind: "misconceptions",
        items: [
          {
            wrong: "Memory management only matters when RAM is nearly full.",
            right: "Even at 20% load, protection must hold (a small process must not stomp a large one), and fragmentation can block an allocation while most of RAM is free. Both jobs are about *arrangement*, not fullness.",
          },
          {
            wrong: "The OS could just prevent bad writes by checking every access in software.",
            right: "Checking each memory access with OS code would slow the machine to a crawl — accesses happen billions of times per second. Protection is done by *hardware* comparing every address against registers (lesson 4), with the OS only setting up the rules.",
          },
        ],
      },
      {
        kind: "knowledge-check",
        questions: [
          {
            id: "kc-m5-why-1",
            q: "A 3-unit process loads into an 8-unit fixed partition. What is the 5 wasted units called, and where is it?",
            options: [
              "Internal fragmentation — wasted space inside the allocated partition",
              "External fragmentation — wasted space between allocations",
              "A memory leak — space lost by never freeing",
              "A protection fault — the hardware blocks the space",
            ],
            answerIndex: 0,
            explanation:
              "The waste sits *inside* a partition that was assigned, so no other process can use it: internal fragmentation. External fragmentation is the scattered-holes problem of dynamic allocation.",
          },
          {
            id: "kc-m5-why-2",
            q: "Free space totals 30 units across holes of 20 and 10. A 25-unit request arrives. Why must a contiguous allocator refuse?",
            options: [
              "No single hole is large enough — free space must be contiguous here",
              "25 exceeds the total free space of 30",
              "The allocator is out of internal partitions",
              "The hardware only allows allocations of 20 or fewer",
            ],
            answerIndex: 0,
            explanation:
              "In this module allocations occupy one contiguous stretch. Total free (30) exceeds the request (25), but the largest hole (20) does not — external fragmentation in action.",
          },
        ],
      },
      {
        kind: "references",
        items: [
          {
            label: "OSTEP, Chapter 13: The Abstraction: Address Spaces",
            url: "https://pages.cs.wisc.edu/~remzi/OSTEP/vm-intro.pdf",
            note: "why each process needs the *illusion* of private memory — the why behind this module",
          },
          {
            label: "OSTEP, Chapter 17: Free-Space Management",
            url: "https://pages.cs.wisc.edu/~remzi/OSTEP/vm-freespace.pdf",
            note: "the allocator's problem in full — this module's technical backbone",
          },
        ],
      },
      {
        kind: "note",
        body: [
          "The lab's 64-unit strip models *physical* memory with unit-granularity allocations and no OS-overhead region reserved. Real systems also reserve memory for the kernel and device buffers, align allocations to size classes, and (module 6) stop requiring contiguity altogether via paging — which is why the fragmentation problem here ends up confined to the allocator inside each process.",
        ],
      },
    ],
  },
  {
    id: "memory-management/contiguous-allocation",
    moduleId: "memory-management",
    title: "Contiguous Allocation Strategies",
    minutes: 9,
    objectives: [
      "trace first fit, best fit and worst fit on the same hole list",
      "compute the leftover fragment each strategy leaves behind",
      "argue the trade-offs: speed, leftovers, and the tiny-holes trap of best fit",
    ],
    sections: [
      {
        kind: "problem",
        body: [
          "Dynamic allocation reduced to one recurring decision: a request of size *s* arrives; the strip holds several holes of assorted sizes; **which hole do you carve it from?** Choose well and the strip stays tidy for a long time; choose badly and you manufacture the fragmentation from last lesson faster than necessary.",
          "There is no single right answer — there are three classic answers with different personalities. One is fast and thoughtless. One is tidy-looking and, to everyone's surprise, often the *worst* long-run citizen. One is deliberately untidy on purpose. All three live in real allocators, and by the end of this lesson you can hand-trace all of them and say exactly why each behaves the way it does.",
        ],
      },
      {
        kind: "intuition",
        body: [
          "You are parking a minivan on a street with several gaps. **First fit**: take the first gap that looks big enough — fastest decision, done scanning the moment it works. **Best fit**: cruise the whole street and take the *tightest* gap that fits — elegant, minimal waste *this time*. **Worst fit**: take the *biggest* gap on the street — leaving leftovers big enough that someone else can still park in them.",
          "The surprise is best fit's hidden bill: squeezing the van into the tightest gap leaves a sliver too small for *anything*, and slivers accumulate — the street becomes riddled with useless scraps. Worst fit's philosophy is the opposite: accept a bigger cut now in exchange for leftovers that remain usable. Neither trick fixes the underlying disease; they only differ in how they feed it.",
        ],
      },
      {
        kind: "visual",
        simId: "memory-allocation-lab",
        body: [
          "In the **Memory Allocation Lab**, set the strategy selector to **first fit**, allocate and free a few processes to build a hole list, then run the same allocation and watch which hole it picks. Repeat with **best fit** and **worst fit** on the same layout — the strip colors show the different choices instantly.",
          "Keep one eye on the external-fragmentation stat as you run the same sequence under each strategy: the strategies' real difference is not where today's block lands, but how the *hole list* evolves.",
        ],
      },
      {
        kind: "experiment",
        simId: "memory-allocation-lab",
        prompts: [
          "Build holes of sizes 18, 13 and 22 (in that address order) — for example by allocating A(18), X(5), B(13), Y(5), C(22) in a row from the start of the strip, then freeing A, B and C (X and Y stay put, keeping the holes apart). Now allocate 12 units under each of the three strategies and record which hole each one picks and what leftover it leaves.",
          "Repeat the sequence ten times (allocate 12, free it) under best fit versus worst fit. Which strategy's hole list degenerates into tiny useless holes first?",
          "Try to construct a hole list where best fit and first fit pick the *same* hole — when do the two strategies coincide?",
        ],
        body: [
          "All three strategies only ever split a hole; none moves an existing allocation. Moving is a different tool — compaction, next lesson.",
        ],
      },
      {
        kind: "technical",
        body: [
          "**First fit** scans the free list from the start and splits the first hole with size ≥ s. Cheap: the scan stops early, and near the list's head the holes are usually small and numerous. Its leftovers tend to be small fragments at the front of memory, which future first-fit scans skip quickly.",
          "**Best fit** scans *every* hole and splits the smallest one with size ≥ s. It minimizes leftover *per allocation* — but the leftover is a fragment smaller than almost any future request: best fit is famous for riddling memory with tiny, unusable holes. It also always scans the whole list, so it is the slowest of the three.",
          "**Worst fit** splits the largest hole, leaving a leftover of (largest − s), betting that a big-enough remainder stays useful. It needs the full scan too, and its record is poor in practice: repeatedly carving the big hole reliably destroys the only hole that could serve *large* requests — worst fit tends to fail big allocations later.",
          "None of the three eliminates **external fragmentation**; they differ in speed and in the *shape* of the damage. Real allocators fight back with two further moves: **segregated free lists** (separate pools per size class so a 12-unit request never breaks up a 30-unit hole) and **coalescing** on free — merging a freed block with any hole adjacent to it, so neighbors heal the strip automatically (next lesson makes coalescing precise). The 50-percent rule from the reading is the sobering backdrop: even with optimal placement, roughly half of all free space ends up fragmented.",
        ],
        equations: [
          {
            expr: "Leftover = hole size − request size (for the hole the strategy chose)",
            symbols: [
              { sym: "hole size", meaning: "size of the selected free hole" },
              { sym: "request size", meaning: "size of the incoming allocation" },
            ],
            note: "First fit takes the first sufficient hole; best fit minimizes this leftover over all holes; worst fit maximizes it. The leftover becomes a (usually tiny) new hole.",
          },
          {
            expr: "Coalesced hole = freed block + adjacent hole(s)",
            symbols: [
              { sym: "freed block", meaning: "the region just released" },
              { sym: "adjacent hole(s)", meaning: "any free region immediately before or after it" },
            ],
            note: "Freeing heals only when neighbors are free — two separated holes never merge without compaction (next lesson).",
          },
        ],
      },
      {
        kind: "worked-example",
        steps: [
          {
            title: "One hole list, three verdicts",
            body: [
              "The strip's free list, in address order: holes of **18**, **13** and **22** units. A request for **12** arrives. *First fit*: scans from the front, 18 ≥ 12 → carve from the 18-hole at its start; leftover **6**.",
              "*Best fit*: the sufficient holes are 18, 13, 22; smallest sufficient is 13 → leftover **1**. *Worst fit*: largest is 22 → leftover **10**.",
            ],
          },
          {
            title: "Reading the futures",
            body: [
              "Best fit's leftover of 1 is dead space — nothing real is 1 unit. Worst fit left 10, which can still serve a future request of 10 or less. First fit left 6, usable by small requests.",
              "Now watch the large-allocation angle: worst fit just split the *only* hole ≥ 20. A future 20-unit request that all three strategies could have served from the 22-hole now fails under worst fit — the 'fails big allocations later' cost, concretely.",
            ],
          },
        ],
      },
      {
        kind: "misconceptions",
        items: [
          {
            wrong: "Best fit is the best strategy — it wastes the least, by definition.",
            right: "It minimizes *this allocation's* leftover, but the leftovers it creates are the tiniest and least reusable, and it fragments memory into slivers over time. Simulations consistently show first fit equal or better in practice.",
          },
          {
            wrong: "A clever choice of strategy can eliminate external fragmentation.",
            right: "All three strategies only split holes; they never merge or move. Fragmentation is managed by coalescing on free, size-class lists, and compaction — placement strategy merely shapes the damage.",
          },
        ],
      },
      {
        kind: "knowledge-check",
        questions: [
          {
            id: "kc-m5-alloc-1",
            q: "Holes in address order: 20, 15, 8. A request of 11 arrives under FIRST fit. Which hole is used, and what leftover remains?",
            options: [
              "The 20-hole — first sufficient scan hit; leftover 9",
              "The 15-hole — smallest sufficient; leftover 4",
              "The 20-hole — largest, per worst fit",
              "No hole fits — the request fails",
            ],
            answerIndex: 0,
            explanation:
              "First fit stops at the first hole ≥ 11: the 20-hole at the front of the list. (The 15-hole answer is *best* fit; the request does fit, so 'fails' is wrong.)",
          },
          {
            id: "kc-m5-alloc-2",
            q: "Why does worst fit tend to fail *large* allocations later?",
            options: [
              "It keeps splitting the only hole big enough for large requests",
              "It allocates more memory than the request asked for",
              "It refuses large requests by policy",
              "It merges holes too aggressively",
            ],
            answerIndex: 0,
            explanation:
              "Worst fit always carves the largest hole; after enough carvings the big hole that large requests depend on is gone. First fit, by contrast, tends to leave big holes at the back of the list untouched.",
          },
        ],
      },
      {
        kind: "references",
        items: [
          {
            label: "OSTEP, Chapter 17: Free-Space Management",
            url: "https://pages.cs.wisc.edu/~remzi/OSTEP/vm-freespace.pdf",
            note: "first/best/worst fit, the 50-percent rule, and segregated lists — the chapter this lesson condenses",
          },
          {
            label: "OSTEP, Chapter 13: The Abstraction: Address Spaces",
            url: "https://pages.cs.wisc.edu/~remzi/OSTEP/vm-intro.pdf",
          },
        ],
      },
      {
        kind: "note",
        body: [
          "The lab allocates at unit granularity with no size classes, no alignment, and no split threshold, and its free list is kept in address order. Real allocators (glibc's, for instance) use size classes, footer/header metadata per block, deferred coalescing, and thresholds below which a hole is not split — so their behavior matches these three strategies only in spirit.",
        ],
      },
    ],
  },
  {
    id: "memory-management/fragmentation-compaction",
    moduleId: "memory-management",
    title: "Fragmentation & Compaction",
    minutes: 9,
    objectives: [
      "distinguish internal from external fragmentation with a number for each",
      "compute coalescing on free and the largest satisfiable request from a hole list",
      "explain what compaction buys, and what it costs",
    ],
    sections: [
      {
        kind: "problem",
        body: [
          "Two different kinds of waste now have similar-sounding names, and they are routinely confused. A process asked for 13 units but sits in a 16-unit partition: 3 units wasted *inside* an allocation. Three free holes of 20, 10 and 5 total 35 free units — yet a 30-unit request fails. Both are fragmentation; only one of them can be *fixed* by rearranging memory, and the operation that fixes it is expensive enough that you do not do it casually.",
          "This lesson pins the two kinds down with numbers, learns the free-side repair that is cheap (coalescing), and then faces the expensive one honestly: **compaction** — sliding all the allocations together to merge all the holes — including why real systems mostly avoid it.",
        ],
      },
      {
        kind: "intuition",
        body: [
          "**Internal fragmentation** is a suitcase too big for the trip: you booked a 16 kg case for 13 kg of clothes — the spare 3 kg travels with you, useless, locked inside your own allocation. It is waste *you own*. **External fragmentation** is a parking lot with 35 free spaces scattered as slivers between cars: plenty of total space, no single space where the bus can fit. It is waste *nobody owns* — it lives between the allocations.",
          "**Coalescing** is two neighboring slivers discovering they touch and merging into one space — free, automatic, but only works for *adjacent* free spaces. **Compaction** is hiring a tow truck to shuffle every car to one end of the lot so all the free space becomes one giant space. It always works — and every shuffle costs, plus every car's driver (process) must be told their spot changed.",
        ],
      },
      {
        kind: "visual",
        simId: "memory-allocation-lab",
        body: [
          "In the **Memory Allocation Lab**, create the classic wound: allocate A, B, C, D in a row, then free B and D, leaving scattered holes. Read the fragmentation stat: it reports how much of the *free* space is unusable for typical requests given how the holes are scattered.",
          "Now free the block between two holes and watch **coalescing** heal the strip: three free regions collapse into one. Finally press **compaction** and watch every allocated block slide left until all free space merges into a single hole at the top — and check how the largest-satisfiable-request number jumps.",
        ],
      },
      {
        kind: "experiment",
        simId: "memory-allocation-lab",
        prompts: [
          "Build holes of 18, 13 and 22 separated by resident blocks (allocate A(18), X(5), B(13), Y(5), C(22) in a row and free A, B, C — X and Y keep the holes from touching). Total free? Largest hole? What is the largest request that can succeed right now?",
          "Press compaction. What is the largest request now? Express the gain as a number, then explain why the same total free space supports it after compaction but not before.",
          "Time the compaction by counting how many allocated blocks had to move. What would this cost if each block were megabytes and the move had to copy every byte?",
        ],
        body: [
          "Watch the addresses: after compaction every process's start address changed. Whoever referred to those addresses directly would now be wrong — remember this when lesson 4 separates logical from physical addresses.",
        ],
      },
      {
        kind: "technical",
        body: [
          "**Internal fragmentation** is waste *inside* an allocated block: allocation granularity or fixed partitions hand out more than asked (a 13-unit request in a 16-unit slot wastes 3). It is invisible to the free list, harmless to others, and cured only by better granularity (size classes). **External fragmentation** is free space chopped into holes too small to use: waste *between* allocations, tracked by the free list, growing with allocation churn. The lab's fragmentation stat reports the external kind: scattered free space that cannot serve requests of meaningful size.",
          "**Coalescing** happens on free: when a block is released, if either neighbor is free, merge immediately (address-ordered free lists make the check trivial). Coalescing repairs the strip *locally* and for free, but only merges holes that happen to touch — two holes with one allocated block between them can never merge by freeing.",
          "**Compaction** relocates allocated blocks toward one end so all holes merge into one. It always restores the ability to allocate (largest request = total free), but it costs a full copy of every moved byte, must update anything that pointed at old addresses, and generally requires *stopping* the processes being moved — no running process can safely access memory mid-slide without hardware relocation. That combination is why pure compaction is rare in modern general-purpose OSes: module 6's paging makes contiguity unnecessary instead, and garbage-collecting language runtimes (which *do* compact heaps) lean on hardware and compiler support to pause and relocate safely.",
        ],
        equations: [
          {
            expr: "Internal fragmentation = allocated size − requested size",
            symbols: [
              { sym: "allocated size", meaning: "what the allocator actually reserved (partition or size class)" },
              { sym: "requested size", meaning: "what the caller asked for" },
            ],
            note: "A 13-unit request in a 16-unit partition wastes 3 units — 18.75% of the partition.",
          },
          {
            expr: "External fragmentation = free total − largest hole",
            symbols: [
              { sym: "free total", meaning: "sum of all hole sizes" },
              { sym: "largest hole", meaning: "the biggest single contiguous free stretch" },
            ],
            note: "The gap between 'how much is free' and 'how much is usable at once'. Here: 30 free across holes 20 + 10 → 30 − 20 = 10 units stranded by scattering.",
          },
          {
            expr: "After compaction: largest request = free total",
            symbols: [
              { sym: "free total", meaning: "all holes merged into one" },
            ],
            note: "Compaction converts scattered free space into one contiguous stretch: largest hole rises to meet free total.",
          },
        ],
      },
      {
        kind: "worked-example",
        steps: [
          {
            title: "The wound, quantified",
            body: [
              "64-unit strip. Allocated: A(20) at [0,20), B(10) at [20,30), C(20) at [30,50), D(4) at [50,54). Free B and C (D's right side is... keep D and the tail): holes become [20,30) = 10 and [30,50) = 20 — adjacent! Freeing B then C coalesces them into one hole of 30 at [20,50).",
              "Now free A too: hole [0,20) merges with [20,50) → one hole of 50 at [0,50), plus D(4) still at [50,54), plus tail hole [54,64) = 10. Free total 60, largest hole 50 — the tail 10 is the only stranded part.",
            ],
          },
          {
            title: "The compaction ledger",
            body: [
              "Contrast case: holes 20, 10, 5 with allocated blocks between them — free 35, largest 20, a 30-unit request fails; compaction slides, say, 3 allocated blocks (copying all their bytes) to produce one hole of 35. The 30-unit request now succeeds.",
              "The bill: every moved byte is copied, every address-bearing pointer/register must be fixed up, and the moved processes must be paused during the slide. On a busy system with gigabytes resident, that is a large, spiky, global pause — the reason paging (module 6) replaced this world.",
            ],
          },
        ],
      },
      {
        kind: "misconceptions",
        items: [
          {
            wrong: "Compaction is a free win — more usable memory, no downside.",
            right: "Compaction copies every moved byte, must fix up addresses, and pauses the moved processes. It converts CPU time and pause time into contiguity — a real, sometimes prohibitive price, which is why general-purpose OSes avoid it.",
          },
          {
            wrong: "Lots of free memory means any large request will succeed.",
            right: "Only the *largest contiguous hole* bounds what can be allocated. 35 free units in holes of 20, 10, 5 cannot serve a 30-unit request — check the largest hole, not the total.",
          },
        ],
      },
      {
        kind: "knowledge-check",
        questions: [
          {
            id: "kc-m5-frag-1",
            q: "Free memory: holes of 20, 10 and 5 (total 35). Which statement is exactly right?",
            options: [
              "External fragmentation: the largest satisfiable request is 20, stranding 15 units",
              "Internal fragmentation: 15 units are wasted inside allocations",
              "No fragmentation: 35 units are free and usable",
              "The 10 and 5 holes will coalesce on the next free",
            ],
            answerIndex: 0,
            explanation:
              "Free-but-unusable-because-scattered is external fragmentation: free total 35, largest hole 20, so 35 − 20 = 15 units are stranded. The holes cannot coalesce — allocated blocks separate them.",
          },
          {
            id: "kc-m5-frag-2",
            q: "Which operation can merge two holes separated by one allocated block?",
            options: [
              "Only compaction — coalescing merges adjacent free regions only",
              "Coalescing, on the next free",
              "Best fit, by choosing the pair as one hole",
              "Nothing can ever merge them",
            ],
            answerIndex: 0,
            explanation:
              "Coalescing works only when free regions touch. With a live block between them, the holes merge only if the block itself is relocated — that is compaction's job.",
          },
        ],
      },
      {
        kind: "references",
        items: [
          {
            label: "OSTEP, Chapter 17: Free-Space Management",
            url: "https://pages.cs.wisc.edu/~remzi/OSTEP/vm-freespace.pdf",
            note: "fragmentation definitions, coalescing policy, and why compaction is a last resort",
          },
          {
            label: "OSTEP, Chapter 13: The Abstraction: Address Spaces",
            url: "https://pages.cs.wisc.edu/~remzi/OSTEP/vm-intro.pdf",
          },
        ],
      },
      {
        kind: "note",
        body: [
          "The lab compacts instantly and updates everything for you: no copying cost, no pause, no fix-up of address-bearing state. Its fragmentation stat measures external fragmentation only. Real compaction would copy bytes at memory bandwidth, invalidate caches, and require hardware relocation support to pause-and-move safely — costs the lab cannot show.",
        ],
      },
    ],
  },
  {
    id: "memory-management/base-limit-protection",
    moduleId: "memory-management",
    title: "Base & Limit: Memory Protection",
    minutes: 9,
    objectives: [
      "translate a logical address to a physical one with base + offset",
      "determine exactly which accesses trigger a protection fault",
      "explain how hardware enforcement frees the OS from checking every access",
    ],
    sections: [
      {
        kind: "problem",
        body: [
          "Compaction just broke something subtle: it *moved* a process, but the process's own code contains addresses — 'load the value stored at address 2412'. If address 2412 meant one physical location before the move and another after, every move corrupts the process. Worse, nothing yet stops a buggy or malicious process from forming address 0 and reading the *OS's* memory — protection by goodwill is no protection.",
          "Both problems dissolve with one idea: **stop the process from using physical addresses at all**. Let it live in *logical* addresses — its own numbering from 0 — and have hardware translate every access on the fly. Translation is the hinge of all of memory management: this lesson builds the simplest version (base and limit), and module 6 turns the same crank much further.",
        ],
      },
      {
        kind: "intuition",
        body: [
          "A hotel wing where every guest is told: 'your room numbers are 1 to 12' — nobody knows (or needs to know) that *their* room 1 is physically on the 7th floor, door 714. The front desk holds a card per guest: **your wing starts at door 714; you have 12 rooms**. Guest asks for 'room 5' → front desk computes 714 + (5 − 1) and hands over the physical door.",
          "Now the protection, free of charge: a guest asking for 'room 15' — past their 12 — is not looked up at all; the desk simply refuses. The guest *cannot even name* a room outside their wing in any way that resolves to one. That desk is the **memory management unit (MMU)**; the card is a pair of **base and limit registers**; and the refusal is the protection fault your programs call a **segmentation fault**.",
        ],
      },
      {
        kind: "visual",
        simId: "address-translation-lab",
        body: [
          "The **Address Translation Lab** shows both address spaces side by side: a process's logical addresses counting from 0, and the physical strip below. Set **base** and **limit** for the process, then issue memory accesses from its code: each logical address visibly becomes base + offset on the physical side — a legal access lights up its physical cell; an out-of-range access raises the protection fault and the lab flags the terminating violation.",
          "Slide the base register (compaction, translated) and watch the process's *logical* view stay perfectly still while its physical home moves — the decoupling that makes relocation safe.",
        ],
      },
      {
        kind: "technical",
        body: [
          "A **logical address** (in this simple scheme, also called a **virtual address**) is an offset the process generates, counted from its own 0. The hardware pair: **base** = the physical address where this process's region starts, **limit** = the size of the region (largest legal offset). On *every* memory access, the MMU does two things in one cycle: **translate** — physical = base + logical — and **bounds-check** — if logical ≥ limit, raise a **protection fault** instead of completing the access.",
          "Two consequences deserve spelling out. **Relocation is now free and safe**: the OS may place the process anywhere (or move it later — compaction is back on the menu) by setting base; the process's view never changes. **Protection is hardware-enforced**: the check happens on every single access at full CPU speed, with no OS involvement — software cannot check that often. The OS's role is at process creation and context switch: load base/limit with this process's values (privileged operation — module 0's dual-mode hardware in action).",
          "When the fault fires, the hardware traps (module 1's machinery) into the OS, which — in the classic case — terminates the offending process: that is the **segmentation fault** userspace knows and loathes. One vocabulary caution: this course uses *logical* and *virtual* address loosely as synonyms for 'the process's own addresses'; module 6 sharpens the distinction (virtual addresses go through page tables, not just base/limit). And note what base/limit *cannot* do: one contiguous region per process, no sharing of a library's code between processes, no growing past the limit without OS help — the limits of the simple scheme that paging was invented to remove.",
        ],
        equations: [
          {
            expr: "Physical address = base + logical address",
            symbols: [
              { sym: "base", meaning: "physical start of the process's region (set by the OS)" },
              { sym: "logical address", meaning: "the address the process's code generated" },
            ],
            note: "Example: base 30000, access to logical 4200 → physical 34200. The process neither knows nor cares about 30000.",
          },
          {
            expr: "Fault condition: logical address ≥ limit",
            symbols: [
              { sym: "limit", meaning: "the region's size in bytes — the largest legal offset" },
            ],
            note: "Legal logical addresses are 0 … limit − 1. Exactly at limit is already a fault: base + limit is one past the region's last byte.",
          },
          {
            expr: "Region covers physical: base … base + limit − 1",
            symbols: [
              { sym: "base", meaning: "physical start" },
              { sym: "limit", meaning: "size" },
            ],
            note: "The last legal physical byte is base + limit − 1; a limit of 0 means the process may not access memory at all.",
          },
        ],
      },
      {
        kind: "worked-example",
        steps: [
          {
            title: "Three accesses, translated and checked",
            body: [
              "base = 30000, limit = 5000. Access A: logical 0 → physical 30000 (the region's first byte — legal, offset 0 < 5000). Access B: logical 4200 → physical 34200 — legal, 4200 < 5000.",
              "Access C: logical 6000 → 6000 ≥ 5000 → **protection fault**; no translation is even performed. The hardware traps to the OS, which terminates the process with a segmentation fault. The offending process never touched another tenant's byte — and note that logical 6000 would have translated to a perfectly *addressable* physical 36000; the fault exists precisely because addressability is not permission.",
            ],
          },
          {
            title: "Relocation by register",
            body: [
              "Compaction slides the process 10 000 units left: the OS changes base to 20000 and adjusts nothing else. The same code, same logical 4200, now lands at physical 24200 — and the limit check is unchanged, because the region's *size* did not change.",
              "This is why the guest never needs to know the floor number: every address the process ever forms is an offset from base, and the OS re-points base whenever it re-homes the region. Process A's base and process B's base keep their regions disjoint — 30000 + 5000 = 35000 ≤ B's base, say 35000, with the MMU checking every access both ways.",
            ],
          },
        ],
      },
      {
        kind: "misconceptions",
        items: [
          {
            wrong: "A logical address IS a physical address — they are the same number.",
            right: "In this scheme they coincide only when base = 0. Generally physical = base + logical, and the process is deliberately unaware of base. Mixing them up makes protection checks look mysterious; keeping them apart makes everything click.",
          },
          {
            wrong: "The OS checks each memory access against base/limit in software.",
            right: "The check is in hardware (the MMU), on every access, at full speed — software checking would be far too slow. The OS only *loads* the registers at context switch, a privileged operation.",
          },
        ],
      },
      {
        kind: "knowledge-check",
        questions: [
          {
            id: "kc-m5-bl-1",
            q: "base = 30000, limit = 5000. Access to logical address 4200 goes where?",
            options: [
              "Physical 34200 — base plus the logical offset",
              "Physical 35000 — base plus limit",
              "Physical 4200 — logical addresses are physical",
              "Fault — nothing under limit translates",
            ],
            answerIndex: 0,
            explanation:
              "4200 < 5000, so the access is legal and translates: 30000 + 4200 = 34200. Base + limit (35000) is one past the last legal byte.",
          },
          {
            id: "kc-m5-bl-2",
            q: "Same region. Which access triggers the protection fault?",
            options: [
              "Logical 5000 — exactly at the limit, one past the last legal byte",
              "Logical 4999 — the last legal byte",
              "Logical 0 — the region's start",
              "Physical 30000 — the region's first physical byte",
            ],
            answerIndex: 0,
            explanation:
              "Legal logical offsets run 0 … limit − 1 = 0 … 4999. Logical 5000 fails the check (5000 ≥ 5000) and faults — even though base + 5000 is a perfectly valid physical address, it is not *ours*.",
          },
        ],
      },
      {
        kind: "references",
        items: [
          {
            label: "OSTEP, Chapter 15: Mechanism: Address Translation",
            url: "https://pages.cs.wisc.edu/~remzi/OSTEP/vm-mechanism.pdf",
            note: "dynamic relocation via base/limit — the exact mechanism of this lesson, in full",
          },
          {
            label: "OSTEP, Chapter 13: The Abstraction: Address Spaces",
            url: "https://pages.cs.wisc.edu/~remzi/OSTEP/vm-intro.pdf",
          },
          {
            label: "OSTEP, Chapter 17: Free-Space Management",
            url: "https://pages.cs.wisc.edu/~remzi/OSTEP/vm-freespace.pdf",
          },
        ],
      },
      {
        kind: "note",
        body: [
          "The lab checks bounds on every access and raises a visible fault, but it models the simplest scheme: one base/limit pair per process, no read/write permission bits, no sharing, and it counts bytes in the strip's units. Real x86-64 systems use paging (module 6) with per-page permission bits; 'segmentation fault' survives as the name of the fault a paging-based system delivers on an illegal access — the base/limit world is the mechanism's ancestor, not its current form.",
        ],
      },
    ],
  },
];
