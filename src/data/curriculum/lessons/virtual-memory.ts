import type { Lesson } from "@/types";

/**
 * Module 6 — Virtual Memory & Paging.
 * The illusion every process owns the machine: pages, frames, page tables,
 * TLBs, page faults and demand paging, replacement policies, and the
 * swap / copy-on-write / mmap machinery that ties it together.
 * Lab conventions in this course: 16 pages of 16 units each (8-bit virtual
 * addresses), a one-level page table, and a 2-entry LRU TLB.
 */
export const lessons: Lesson[] = [
  {
    id: "virtual-memory/why-virtual-memory",
    moduleId: "virtual-memory",
    title: "Why Virtual Memory Exists",
    minutes: 9,
    objectives: [
      "name the three cracks in base/limit memory management that virtual memory fixes",
      "define the address space as an abstraction requiring per-access translation",
      "split a lab address into page number and offset using shifts and masks",
    ],
    sections: [
      {
        kind: "problem",
        body: [
          "Module 5 left you with a workable but rigid arrangement: each process gets one contiguous region, protected by base and limit registers. Three cracks run through that design. First, *contiguity*: every process needs one unbroken stretch of physical memory, so external fragmentation — the scattered holes you learned to coalesce and compact — is a permanent tax. Second, *size*: a process can never use more memory than physically exists, and no process's region can grow past the hole that happens to surround it. Third, *sharing*: letting two processes safely share a table or a library means hand-managing overlapping regions.",
          "Every one of these is really the same missing ingredient: the addresses a program uses are *wired to* the addresses RAM uses. The fix is to cut that wire. Give every process its own **virtual address space** — a private range of addresses it may use as if it owned the whole machine — and translate, on every single access, to wherever the bytes actually live. That translation layer is **virtual memory**. This lesson builds the *why*; the next four build the *how*.",
        ],
      },
      {
        kind: "intuition",
        body: [
          "Picture a hotel in which every guest believes they have the whole building to themselves. Each guest's room is numbered starting from 1 — the same numbers for every guest. The concierge translates: guest A's 'room 101' is physical room 512, guest B's 'room 101' is physical room 87. Guests never collide, because the numbers they say are not the numbers the building uses. If the hotel is overbooked, the concierge quietly keeps a guest's luggage in a storage depot and fetches it the moment the guest reaches for it — the guest notices nothing but a short delay.",
          "The guests are processes; the room numbers are virtual addresses; the concierge is the **MMU** (memory management unit) working from records the OS keeps; the storage depot is disk, holding pieces of the address space that do not currently fit in RAM. The illusion costs a translation on every memory access — which is exactly why this module spends a whole lesson on making that translation *fast*.",
        ],
      },
      {
        kind: "visual",
        simId: "paging-lab",
        body: [
          "The **Paging & TLB Lab** gives one process a 16-page virtual address space, each page 16 units — so addresses run 0x00 to 0xFF. Type an address and step the walk: the lab splits it into a *page number* and an *offset*, looks the page up, and lands on a physical frame.",
          "Do two experiments by hand. First, enter 0x2A: notice the split into page 2 and offset 10 — the low nibble never changes during translation, only the high nibble is looked up. Second, reason about what would happen if a second process used the same address 0x2A: its page 2 could map to an entirely different frame, and the two programs could never touch each other's memory.",
        ],
      },
      {
        kind: "technical",
        body: [
          "The **address space** is the abstraction: a private, uniform range of addresses per process, starting at 0 regardless of where the program physically sits. An address the program uses is a **virtual address**; an address on the memory bus is a **physical address**; hardware (the MMU) maps one to the other on *every* access, using tables the OS maintains. Because translation is per-access, the OS can relocate a process, grow it, or move its data at any moment without the program knowing — the program's own addresses never change.",
          "What does indirection buy? **Relocation** (link every program as if it started at 0), **protection** (a process simply has no virtual address that names another process's memory — the illusion is the wall), **growth** (the heap can claim fresh virtual pages without sitting next to free RAM), **sharing** (two address spaces can map the same physical page for a shared library), and — the star of this module — **oversubscription**: the sum of all processes' address spaces may exceed physical RAM, because rarely-used pieces can live on disk and be brought in only when touched.",
          "In this course's lab the address space is deliberately tiny so every step is visible: 16 pages × 16 units, giving 8-bit addresses (0x00–0xFF). The split of an address is pure bit arithmetic: the high 4 bits name the page, the low 4 bits name the offset within the page. You will compute it the way the MMU does — with a shift and a mask — in every lesson of this module.",
        ],
        equations: [
          {
            expr: "Virtual address = page number × page size + offset",
            symbols: [
              { sym: "page number", meaning: "which page of the address space (high bits)" },
              { sym: "page size", meaning: "bytes per page — 16 in the lab" },
              { sym: "offset", meaning: "position within that page (low bits)" },
            ],
            note: "The offset passes through translation unchanged; only the page number is looked up.",
          },
          {
            expr: "Page = address >> 4    Offset = address & 15",
            symbols: [
              { sym: ">> 4", meaning: "shift right 4 bits — discard the offset, keep the page number" },
              { sym: "& 15", meaning: "mask the low 4 bits — discard the page, keep the offset" },
            ],
            note: "The lab's page size of 16 makes this a clean nibble split of every 8-bit address; with 4 KiB pages the same idea shifts and masks by 12 bits.",
          },
          {
            expr: "Pages in a space = 2^(address bits − offset bits)",
            symbols: [
              { sym: "address bits", meaning: "width of a virtual address (8 in the lab)" },
              { sym: "offset bits", meaning: "log₂ of the page size (4 for 16-unit pages)" },
            ],
            note: "8 − 4 = 4 bits of page number → 16 pages, addressing 0x00–0xFF.",
          },
        ],
      },
      {
        kind: "worked-example",
        steps: [
          {
            title: "One virtual address, two processes",
            body: [
              "Take virtual address 0x2A — binary `0010 1010`. Split it: high nibble `0010` = page 2, low nibble `1010` = offset 10. Now imagine two processes, each with its own page table: process A's table says page 2 lives in frame 5; process B's table says page 2 lives in frame 9.",
              "Process A's access lands at physical 5 × 16 + 10 = 90. Process B's access lands at physical 9 × 16 + 10 = 154. Identical program addresses, entirely different memory — and no protection hardware beyond the fact that neither process possesses a virtual address that maps into the other's frames.",
            ],
          },
          {
            title: "Why per-access translation is affordable in principle",
            body: [
              "Notice what did the work in that example: only 4 bits were looked up, and the same lookup table answers every access a process ever makes. The cost is one table consultation per memory access — which sounds ruinous until you remember most programs re-touch the same few pages constantly (their *locality*). The machinery that exploits that repetition is the TLB, the subject of the next lesson.",
              "For now, hold on to the shape of the scheme: virtual page number → look up → physical frame number, with the offset riding along unchanged. Every mechanism in this module — TLBs, faults, replacement, COW — is an optimization of or an exception to that one line.",
            ],
          },
        ],
      },
      {
        kind: "misconceptions",
        items: [
          {
            wrong: "Virtual memory is disk space used as extra RAM.",
            right: "That describes *swapping*, one supporting mechanism. Virtual memory is the abstraction itself: per-process address spaces made real by per-access translation. Swapping, paging, TLBs and COW all exist to serve that illusion.",
          },
          {
            wrong: "Translation happens once, when the program is loaded.",
            right: "The MMU translates on every single access. Only per-access translation lets the OS move pages, grow stacks, or swap behind the program's back — and it is why translation speed (the TLB) matters so much.",
          },
        ],
      },
      {
        kind: "knowledge-check",
        questions: [
          {
            id: "kc-m6-why-1",
            q: "Which problem can base/limit memory management NOT solve, but virtual memory can?",
            options: [
              "Running a program whose address space is larger than physical RAM",
              "Preventing one process from writing into another's memory",
              "Relocating a program to a different physical base",
              "Translating addresses on every access",
            ],
            answerIndex: 0,
            explanation:
              "Base/limit confines a process to one contiguous physical region that must actually exist. Virtual memory lets the sum of address spaces exceed RAM because unused pieces can live on disk and load on demand.",
          },
          {
            id: "kc-m6-why-2",
            q: "In the lab's space of 16 pages × 16 units, how many bits of each 8-bit address name the page?",
            options: [
              "4 bits — 16 pages need 4 bits, leaving 4 for the offset",
              "8 bits — every bit participates in the lookup",
              "2 bits — 4 regions of the space",
              "16 bits — one per page",
            ],
            answerIndex: 0,
            explanation:
              "log₂(16 pages) = 4 bits of page number; log₂(16 units) = 4 bits of offset; 4 + 4 = 8 bits total. Page = address >> 4, offset = address & 15.",
          },
        ],
      },
      {
        kind: "references",
        items: [
          {
            label: "OSTEP, Chapter 13: The Abstraction: Address Spaces",
            url: "https://pages.cs.wisc.edu/~remzi/OSTEP/vm-intro.pdf",
            note: "the case for virtual memory as *the* OS abstraction — goals, illusion, mechanisms",
          },
          {
            label: "OSTEP, Chapter 15: Address Translation",
            url: "https://pages.cs.wisc.edu/~remzi/OSTEP/vm-mechanism.pdf",
            note: "hardware-based translation, from dynamic relocation to page tables",
          },
        ],
      },
      {
        kind: "note",
        body: [
          "Lab simplifications to keep in mind: the lab uses 16 pages of 16 units where real systems use millions of 4 KiB pages (x86-64 also has 2 MiB and 1 GiB pages); its page table is one flat level, while real tables are multi-level trees; and its translation walk is always shown step by step, where real hardware consults caches you will meet next lesson before touching any table.",
        ],
      },
    ],
  },
  {
    id: "virtual-memory/pages-frames-tlb",
    moduleId: "virtual-memory",
    title: "Pages, Frames & the TLB",
    minutes: 11,
    objectives: [
      "explain how fixed-size pages and frames eliminate external fragmentation",
      "translate an address through a one-level page table by hand",
      "predict TLB hits, misses and evictions for a short access sequence under LRU",
    ],
    sections: [
      {
        kind: "problem",
        body: [
          "Base/limit gives each process one contiguous strip — and every hole in memory is a process waiting for a perfect fit. The insight of **paging** is to stop asking for contiguity altogether: cut every address space into equal-sized **pages**, cut physical memory into same-sized **frames**, and let any page live in any frame. A 3-page process can occupy frames 2, 17 and 4, and the holes between other processes' frames stop mattering — any free frame serves any request. External fragmentation, module 5's recurring villain, is abolished by construction.",
          "But the freedom has a price: with pages scattered everywhere, *every* memory access now needs a lookup that says which frame holds which page. And a lookup on every access sounds like it would double the cost of every load and store in every program ever written. Paging works in the real world only because that lookup is almost never actually performed — because a tiny, furious cache catches it first.",
        ],
      },
      {
        kind: "intuition",
        body: [
          "Every book is chopped into equal 16-page chapters, and the library shelves every chapter wherever there's space — chapter 3 of this book may sit three floors from chapters 1 and 2. The **card catalog** (the page table) records the shelf (frame) of every chapter. The page number is the chapter you want; the offset is the sentence within it, which needs no lookup at all.",
          "Now the economics: walking to the catalog before reading *every sentence* would be absurd. But readers barely move between chapters — you read page after page of chapter 7, then maybe chapter 8. So the library employs a librarian who memorizes the last two catalog lookups (**the TLB**). Ask the librarian 'where's chapter 7?' and — a hit — the answer is instant. Ask about a chapter the librarian has forgotten — a miss — and only then does anyone walk to the catalog. Readers' chapter-hopping habits (*locality*) decide whether the librarian's memory is big enough, and for real workloads it almost always is.",
        ],
      },
      {
        kind: "visual",
        simId: "paging-lab",
        body: [
          "The lab's **Paging & TLB Lab** shows all three layers at once: the virtual address you type, the one-level page table mapping all 16 pages, and the 2-entry LRU TLB. Each step of a walk reports whether the TLB hit or missed and whether the access faulted.",
          "Watch the bookkeeping carefully on a miss: the looked-up translation is *inserted* into the TLB, and if the TLB already holds two entries, the least-recently-*used* one is evicted. A hit refreshes an entry's recency — that refresh is exactly what makes the eviction decision in the next experiment interesting.",
        ],
      },
      {
        kind: "experiment",
        simId: "paging-lab",
        prompts: [
          "Walk pages 2, 3, 2, 5 (addresses 0x20, 0x31, 0x2C, 0x54). Predict the TLB contents after each step before stepping — then check. Which entry did 0x54 evict, and why that one rather than page 2?",
          "Access every page exactly once in order (0x00, 0x10, 0x20, …, 0xF0) and count TLB hits. Then loop over just two pages repeatedly. What hit rates do you get, and what does that tell you about who TLBs are built for?",
          "In a tight loop that touches one page over and over, a 2-entry TLB still catches every lookup. Explain why even the smallest cache wins under this access pattern.",
        ],
        body: [
          "Lab conventions: the TLB holds exactly 2 translations with LRU replacement; a hit refreshes recency; a miss inserts the new translation (evicting the LRU entry if full). Page table entries also carry a *valid* bit — you will use it heavily next lesson.",
        ],
      },
      {
        kind: "technical",
        body: [
          "A **page** is a fixed-size block of a virtual address space; a **frame** is the same-sized block of physical memory. The size is a power of two so the split is free: with 16-unit pages, `page = address >> 4` and `offset = address & 15`. The **page table** — one per process — maps each virtual page number (VPN) to a physical frame number (PFN) plus status bits, the most important of which is *valid*: is this page currently in a frame at all? Translation is then `physical = PFN × 16 + offset`: look up only the high bits, pass the low bits through.",
          "Consulting that table on every access would roughly double memory cost — one extra read before every real one. The fix is the **translation lookaside buffer (TLB)**: a small cache *of translations* inside the MMU, typically 16 to 512 entries in real hardware, highly associative, addressed by VPN. On each access the MMU asks the TLB first: a **TLB hit** yields the frame instantly, no table walk; a **TLB miss** requires the page-table lookup (and, in hardware-managed TLBs, the walk is done by the MMU itself). Missed translations are inserted, evicting an older one under the TLB's policy — the lab uses 2 entries with LRU.",
          "The whole scheme stands on **locality of reference**: programs cluster their accesses in a small working set of pages for long stretches. With 2 entries you catch loops over one or two pages; with the dozens of entries real TLBs have, hit rates above 99% are routine. Locality is also what makes paging viable at all — it will decide fault behavior in the next two lessons just as it decides TLB behavior here.",
        ],
        equations: [
          {
            expr: "Physical address = PFN × page size + offset",
            symbols: [
              { sym: "PFN", meaning: "frame number the page table gives for this virtual page" },
              { sym: "page size", meaning: "16 units in the lab" },
              { sym: "offset", meaning: "the address's low bits, unchanged by translation" },
            ],
            note: "In the lab: physical = (PFN << 4) | (address & 15).",
          },
          {
            expr: "Effective access time ≈ h × t_TLB + (1 − h) × (t_TLB + t_mem)",
            symbols: [
              { sym: "h", meaning: "TLB hit rate" },
              { sym: "t_TLB", meaning: "TLB lookup time (fast — often under one clock cycle)" },
              { sym: "t_mem", meaning: "one RAM access time" },
            ],
            note: "A miss pays the TLB time *and* the full table walk plus the access — which is why h, driven by locality, is the number that matters.",
          },
        ],
      },
      {
        kind: "worked-example",
        steps: [
          {
            title: "A four-address walk with the 2-entry LRU TLB",
            body: [
              "Accesses: 0x25, 0x31, 0x2C, 0x54. Split each: 0x25 = page 2, offset 5; 0x31 = page 3, offset 1; 0x2C = page 2, offset 12; 0x54 = page 5, offset 4.",
              "**0x25**: TLB miss → walk the table → page 2 → frame, say, 7. Insert; TLB = [2]. **0x31**: miss → page 3 → frame 1. Insert; TLB = [2, 3]. **0x2C**: page 2 — TLB **hit** (no table walk!) — and the hit refreshes page 2's recency, making page 3 the least recently used. **0x54**: page 5 — miss, TLB full → evict the LRU entry, which is page **3**, and insert page 5. TLB = [2, 5].",
            ],
          },
          {
            title: "Read the story the walk tells",
            body: [
              "Three of the four accesses needed a page-table walk; the one repeat access was free. That ratio is entirely a property of the access *pattern*, not of the hardware: the same TLB would have caught all four if the program had looped over pages 2 and 3.",
              "Notice also what the eviction decision required: not age of *insertion* but recency of *use*. Page 2 survived the eviction at step 4 despite being the oldest resident, because the 0x2C hit refreshed it. That LRU-versus-FIFO distinction returns with much higher stakes in lesson 4, where whole *pages* are the things being evicted from RAM.",
            ],
          },
        ],
      },
      {
        kind: "misconceptions",
        items: [
          {
            wrong: "The TLB caches recently accessed data or instructions.",
            right: "The TLB caches *translations* — virtual page number to frame number pairs. The data itself lives in the ordinary memory caches; the TLB exists only to save the page-table walk.",
          },
          {
            wrong: "The offset must also be looked up or translated.",
            right: "The offset's meaning is position *within* any page, so it passes through unchanged. Only the page number (the high bits) consults the TLB or page table — that is what makes the fixed-size, power-of-two page design so cheap.",
          },
        ],
      },
      {
        kind: "knowledge-check",
        questions: [
          {
            id: "kc-m6-pft-1",
            q: "Translate 0x3C in the lab's 16-page × 16-unit space.",
            options: [
              "Page 3, offset 12",
              "Page 12, offset 3",
              "Page 3, offset 60",
              "Page 6, offset 3",
            ],
            answerIndex: 0,
            explanation:
              "0x3C = `0011 1100`: high nibble 3 = page, low nibble 0xC = 12 = offset. Equivalently 0x3C >> 4 = 3 and 0x3C & 15 = 12.",
          },
          {
            id: "kc-m6-pft-2",
            q: "A 2-entry LRU TLB holds pages 5 and 7. The CPU accesses page 5 (hit), then page 9 (miss). Which translation is evicted?",
            options: [
              "Page 7 — the hit on 5 refreshed 5, making 7 the least recently used",
              "Page 5 — the oldest resident entry",
              "Page 9 — the newest entry is sacrificed first",
              "Nothing — the TLB grows to hold all three",
            ],
            answerIndex: 0,
            explanation:
              "LRU evicts by recency of *use*, not insertion: the hit renewed page 5, so page 7 — untouched since its insertion — is the victim. TLBs never grow; they evict.",
          },
        ],
      },
      {
        kind: "references",
        items: [
          {
            label: "OSTEP, Chapter 18: Paging: Introduction",
            url: "https://pages.cs.wisc.edu/~remzi/OSTEP/vm-paging.pdf",
            note: "pages, frames and the page table layout — the formal version of this lesson",
          },
          {
            label: "OSTEP, Chapter 19: Paging: Faster Translations (TLBs)",
            url: "https://pages.cs.wisc.edu/~remzi/OSTEP/vm-tlbs.pdf",
            note: "TLB design, hit-rate economics and locality, from the course text",
          },
        ],
      },
      {
        kind: "note",
        body: [
          "The lab's TLB is 2 entries with exact LRU; real TLBs hold dozens to hundreds of entries in set-associative organization with policies you don't control. The lab's page table is one flat array of 16 entries — real tables are multi-level trees (or hashed/inverted) precisely because a flat table for a 48-bit address space would itself be gigabytes. Permissions and dirty/accessed bits exist in real page-table entries but are hidden in the lab.",
        ],
      },
    ],
  },
  {
    id: "virtual-memory/page-faults-demand-paging",
    moduleId: "virtual-memory",
    title: "Page Faults & Demand Paging",
    minutes: 10,
    objectives: [
      "trace the full servicing sequence of a page fault, from trap to instruction retry",
      "explain demand paging and what the valid bit contributes to it",
      "compute effective access time under a given fault rate and reason about its consequence",
    ],
    sections: [
      {
        kind: "problem",
        body: [
          "Here is a problem hiding inside the abstraction you just built. If every page of every process needs a frame, then RAM caps how many processes can exist — and every program pays for every byte of its address space, including the error-handling code it never runs and the arrays it only sometimes fills. On your machine right now, browsers, editors and agents each hold address spaces far larger than the RAM they actively use. If paging required full residency, your machine could run a handful of them. It runs dozens.",
          "The resolution is one of the most elegant tricks in OS design: make *not having the page* a normal, recoverable event. Mark every page-table entry valid-or-not; let a process touch any address it likes; when it touches a page whose valid bit is 0, trap into the OS — which finds a frame, fetches the page, updates the table, and restarts the access as if nothing happened. Programs get the whole space; RAM only pays for what is actually used.",
        ],
      },
      {
        kind: "intuition",
        body: [
          "A research library does not hand you the whole building when you enroll. You request a book; the librarian fetches it from the stacks to your desk; you read. Request something the library simply does not own — an address outside the catalog — and you are refused outright. The desk has limited space, so when it fills, the librarian retires your least-interesting books back to the stacks to make room. You experience a short wait per request; the library experiences one small desk serving thousands of readers.",
          "Your desk is RAM; the stacks are disk. The wait — fetching a book — is a **page fault**. Demand paging is simply the policy of never fetching a book until a reader actually asks for it. The magic is that from your chair, the library *appears* to contain everything.",
        ],
      },
      {
        kind: "visual",
        simId: "paging-lab",
        body: [
          "In the lab, page-table entries start invalid: every page is *mapped* in the address space but *not present* in a frame. Walk an address on such a page and the step reports a **fault** — the lab's proxy for the trap into the OS. Step again after the handler's work and the same address walks clean: valid bit set, translation cached, access retired.",
          "Fault on several different pages and watch how many frames get claimed. Nothing is loaded until it is touched — count the frames used before versus after your walk, and notice you have just implemented 'load on demand' with your own keystrokes.",
        ],
      },
      {
        kind: "technical",
        body: [
          "A **page fault** occurs when an access's virtual page has valid bit 0 — mapped but not resident. The MMU raises a *trap* (module 1's machinery), the CPU switches to kernel mode, and the **page-fault handler** runs: it validates the access (a page with no mapping at all is a genuine error — the segfault from module 5), finds a free frame (or chooses a victim — lesson 4), issues a disk read of the page from the file or swap space, updates the page-table entry, and **restarts the faulting instruction**, which now completes normally. The process was blocked during the fetch; the OS scheduled something else meanwhile.",
          "**Demand paging** is the policy: load nothing until first touch. Code pages fault in when executed, data when read, stack when pushed — which is why a process can start in milliseconds with only a few pages resident. A fault satisfied from disk (or a mapped file) is a *major* fault; one satisfied from elsewhere in memory (a shared library another process already brought in) is a *minor* fault. The distinction matters because the costs differ by five orders of magnitude.",
          "That cost is the whole risk of the design. A RAM access costs ~100 ns; servicing a major fault — seek, rotate, transfer — costs milliseconds. Rare faults are cheap; *frequent* faults are catastrophic, and the arithmetic below makes it exact.",
        ],
        equations: [
          {
            expr: "EAT = (1 − p) × t_mem + p × t_fault",
            symbols: [
              { sym: "EAT", meaning: "effective (average) access time" },
              { sym: "p", meaning: "page-fault rate — fraction of accesses that fault" },
              { sym: "t_mem", meaning: "memory access time (~100 ns)" },
              { sym: "t_fault", meaning: "fault service time (~8 ms for a disk fetch)" },
            ],
            note: "At p = 10⁻⁴: EAT = 0.9999 × 100 + 0.0001 × 8,000,000 = 99.99 + 800 ≈ 900 ns — a 9× slowdown from one fault per 10,000 accesses.",
          },
          {
            expr: "EAT ≤ 1.1 × t_mem  ⟺  p ≤ 0.1 × t_mem ÷ (t_fault − t_mem)",
            symbols: [
              { sym: "p", meaning: "the largest tolerable fault rate" },
            ],
            note: "With t_mem = 100 ns, t_fault = 8 ms: p ≤ 10 ÷ 7,999,900 ≈ 1.25 × 10⁻⁶ — about one fault per 800,000 accesses keeps the overhead within 10%. Faults must be *rare*; locality is what keeps them rare.",
          },
        ],
      },
      {
        kind: "worked-example",
        steps: [
          {
            title: "One fault in ten thousand: the price of the illusion",
            body: [
              "Set t_mem = 100 ns, t_fault = 8 ms, p = 1/10,000. The no-fault part: 0.9999 × 100 = 99.99 ns. The fault part: 0.0001 × 8,000,000 = 800 ns. Total EAT = 899.99 ns ≈ 900 ns.",
              "Read that again: a fault rate of 0.01% made memory nine times slower. One disk fetch costs as much as **80,000** RAM accesses. This is why the OS fights for locality — and why the *next* lesson's algorithms, which decide which page to sacrifice, are measured in faults avoided.",
            ],
          },
          {
            title: "Budgeting faults",
            body: [
              "Suppose engineering requires EAT ≤ 200 ns (a 100% overhead allowance). Solve 100 + p × (8,000,000 − 100) = 200: the fault budget is p = 100 ÷ 7,999,900 ≈ 1.25 × 10⁻⁵ — one fault per 80,000 accesses.",
              "The lesson generalizes: as t_fault shrinks (fast SSDs: ~100 µs) the tolerable rate rises; as it grows (network storage) it collapses. Demand paging is a bet on locality, and the EAT equation is how you audit the bet.",
            ],
          },
        ],
      },
      {
        kind: "misconceptions",
        items: [
          {
            wrong: "A page fault is an error — programs crash when they fault.",
            right: "A fault on a *mapped but not resident* page is the mechanism working normally; the OS fetches and the instruction retries. Only a fault on an address with no mapping at all (invalid access) becomes the fatal SIGSEGV you met in module 5.",
          },
          {
            wrong: "The OS loads the whole program into RAM when it starts.",
            right: "Under demand paging it loads only the first few touched pages; everything else faults in as used. Combined with copy-on-write (lesson 5), program startup touches a tiny fraction of the address space.",
          },
        ],
      },
      {
        kind: "knowledge-check",
        questions: [
          {
            id: "kc-m6-fault-1",
            q: "The handler has found a frame, read the page from disk, and updated the page-table entry. What must happen before the process continues?",
            options: [
              "The faulting instruction is retried — it trapped mid-access and must re-execute",
              "The whole program restarts from its entry point",
              "The disk write-back of the evicted page completes first",
              "The process is moved to the terminated state",
            ],
            answerIndex: 0,
            explanation:
              "The access never completed — the trap interrupted it — so the instruction is re-executed and now finds the page present. Write-backs belong to eviction, not to fault-in.",
          },
          {
            id: "kc-m6-fault-2",
            q: "With t_mem = 100 ns and t_fault = 8 ms, roughly what fault rate keeps the effective access time within 200 ns?",
            options: [
              "About 1 fault per 80,000 accesses",
              "About 1 fault per 8,000 accesses",
              "About 1 fault per 800,000 accesses",
              "About 1 fault per 10,000 accesses",
            ],
            answerIndex: 0,
            explanation:
              "100 + p × 8,000,000 ≈ 200 needs p ≈ 1.25 × 10⁻⁵ ≈ 1/80,000. (The 1/800,000 figure is the tighter 10%-overhead budget; 1/10,000 gives ~900 ns.)",
          },
        ],
      },
      {
        kind: "references",
        items: [
          {
            label: "OSTEP, Chapter 21: Swapping: Mechanisms",
            url: "https://pages.cs.wisc.edu/~remzi/OSTEP/vm-beyondphys.pdf",
            note: "swap space, the valid bit, and the full page-fault servicing sequence",
          },
          {
            label: "OSTEP, Chapter 18: Paging: Introduction",
            url: "https://pages.cs.wisc.edu/~remzi/OSTEP/vm-paging.pdf",
            note: "where the valid bit and the demand-paging idea are introduced",
          },
        ],
      },
      {
        kind: "note",
        body: [
          "The lab models faults as instant: a fault step costs nothing and the page appears immediately. Real faults cost milliseconds (the EAT arithmetic above), involve a disk queue, and can block the process for the duration. The lab also has no swap partition of its own — pages materialize — and it never writes pages back, which real eviction must do for dirty pages.",
        ],
      },
    ],
  },
  {
    id: "virtual-memory/replacement-algorithms",
    moduleId: "virtual-memory",
    title: "Page Replacement: FIFO, LRU & Optimal",
    minutes: 11,
    objectives: [
      "trace FIFO, LRU and Optimal replacement on a reference string and count faults",
      "define Belady's anomaly and explain the stack property that rules it out for LRU",
      "connect working sets and thrashing to overcommitted memory, and name the fix",
    ],
    sections: [
      {
        kind: "problem",
        body: [
          "Demand paging made one quiet assumption: when a fault needs a frame, a free one exists. That assumption fails the moment RAM is fully committed — which is the normal state of a busy machine. Now every fault forces a decision: **which resident page do we evict?** Choose a page the program is about to use, and you have converted one fault into two. Choose well, and the evicted page was never going to be touched again anyway.",
          "So the question becomes an algorithm-design problem with a twist: the right choice depends on the *future*, and the future is precisely what the OS cannot see. Three algorithms structure the whole story — two honest ones that guess from the past, and one cheating oracle that defines what 'best' even means.",
        ],
      },
      {
        kind: "intuition",
        body: [
          "Your closet holds ten jackets, but every new purchase needs a hanger. **FIFO**: whatever has hung there longest goes — simple, fair-sounding, and blind to the fact that the winter coat you retire has a season left. **LRU** (least recently used): the jacket you haven't worn in months goes — a bet that your habits continue. **Optimal**: a fortune-teller whispers which jacket you will *never* wear again — perfect, but fortune-tellers are not implementable.",
          "Here is the surprise that gives this lesson its edge: with FIFO, buying a *bigger closet can make you unhappier* — a certain wardrobe sequence forces more evictions with twelve hangers than with ten. That paradox, Belady's anomaly, is FIFO's signature flaw. LRU and the fortune-teller are immune, for a deep and checkable reason.",
        ],
      },
      {
        kind: "visual",
        simId: "page-replacement-lab",
        body: [
          "The **Page Replacement Lab** shares its engine with the Paging Lab but focuses on the fault stream: step a reference string one access at a time — each step reports TLB behavior and whether the access faulted, and which page (if any) was evicted — and it computes whole-string fault totals for FIFO, LRU and Optimal side by side.",
          "Run the same string under all three and read the totals before studying per-step traces. The ranking you will see — Optimal fewest, LRU close, FIFO worst — is the module's central empirical claim, and the experiment below makes you prove it to yourself.",
        ],
      },
      {
        kind: "experiment",
        simId: "page-replacement-lab",
        prompts: [
          "Run the reference string 1,2,3,4,1,2,5,1,2,3,4,5 with 3 frames. Confirm the totals: FIFO 9, LRU 10, Optimal 7. Find the step where LRU's extra fault appears and explain which repeated reference FIFO got lucky on.",
          "Raise the frame count to 4 and run FIFO on the same string. You should see 10 faults — more than with 3. That is Belady's anomaly. Then check LRU and Optimal at 4 frames: did their fault counts rise or fall?",
          "Construct a short string (5–6 references) where LRU beats FIFO, and another where FIFO matches LRU. What does the second one have in common with a tight loop?",
          "Give the lab a working set bigger than its frames (loop over 5 pages with 3 frames) and watch the fault rate. This is thrashing in miniature — describe what the CPU would be doing in a real system.",
        ],
        body: [
          "Lab conventions: fault counts are computed over whole string runs with identical tie-breaks for all three algorithms, so totals are directly comparable. Disk cost is not modeled — counts, not nanoseconds, are the metric here.",
        ],
      },
      {
        kind: "technical",
        body: [
          "**FIFO** evicts the page that has been resident longest, tracked with a simple queue. It is cheap and needs no hardware support — but it is *history-blind in the wrong dimension*: age of loading says nothing about likelihood of use, and, infamously, FIFO suffers **Belady's anomaly** — increasing the frame count can *increase* faults on some reference strings (the experiment reproduces 9 faults at 3 frames, 10 at 4). The root cause: FIFO lacks the **stack property** — its 3-frame resident set is not a subset of its 4-frame set, so extra frames can reorder evictions perversely.",
          "**LRU** evicts the page whose *last use* is oldest — the past as a prediction of the future. It has the stack property (with n+1 frames, LRU's resident set contains its n-frame set), so it is immune to the anomaly, and under locality it performs close to Optimal. Its cost is precision: exact LRU must timestamp or list-update on *every* memory access, which hardware finds expensive — so real systems approximate it with clock/second-chance schemes that use the page table's accessed bits instead.",
          "**Optimal (OPT, Belady's algorithm)** evicts the page whose *next use* is farthest in the future. It is unimplementable — it reads the future — but it is the provable benchmark: no algorithm faults less on a given string. The gap between your favorite algorithm and OPT measures what better prediction could buy. Two system-level ideas complete the picture: a process's **working set** — the set of pages it has touched in a recent window — is what must fit in frames for it to run usefully; and when the sum of all active processes' working sets exceeds memory, the machine **thrashes**: it faults constantly, spends its time swapping, and the CPU idles while the disk burns. The cure is to *reduce* multiprogramming — suspend or swap out a process so the rest fit.",
        ],
        equations: [
          {
            expr: "Working set W(t, Δ) = pages referenced in the window [t − Δ, t]",
            symbols: [
              { sym: "t", meaning: "current time" },
              { sym: "Δ", meaning: "the window length — how far back 'recently' reaches" },
            ],
            note: "Thrashing test: if the sum of every active process's working set exceeds the available frames, memory is overcommitted and fault rates explode.",
          },
          {
            expr: "Stack property: resident(n) ⊆ resident(n+1)",
            symbols: [
              { sym: "resident(n)", meaning: "the set of pages held with n frames available" },
            ],
            note: "LRU and Optimal satisfy it — adding a frame can only help. FIFO does not, which is exactly why Belady's anomaly is possible.",
          },
        ],
      },
      {
        kind: "worked-example",
        steps: [
          {
            title: "One string, three algorithms, by hand",
            body: [
              "Reference string `1,2,3,4,1,2,5,1,2,3,4,5`, 3 frames. **FIFO**: fault 1,2,3 (fill); fault 4 evicts 1; fault 1 evicts 2; fault 2 evicts 3; fault 5 evicts 4; **hits** on 1 and 2; fault 3 evicts 1; fault 4 evicts 2; **hit** on 5. Total: **9 faults**.",
              "**LRU**: same first seven events by coincidence (faults on 1,2,3,4,1,2,5) — but the later hits on 1 and 2 refresh them, so the fault on 3 evicts **5** (untouched since reference 7), the fault on 4 evicts 1, and the final 5 faults again. Total: **10 faults**. **Optimal**: fault 1,2,3,4 (evicting 3 — used farthest ahead); hit 1, hit 2; fault 5 (evict 4); hit 1, hit 2; fault 3 (evict 1); fault 4 (evict 2); hit 5. Total: **7 faults**.",
            ],
          },
          {
            title: "The anomaly, demonstrated",
            body: [
              "Same string, FIFO, **4 frames**: faults on 1,2,3,4; hits on 1,2; fault 5 evicts 1; then 1, 2, 3, 4, 5 fault *in a row* as the queue churns. Total: **10 faults — more than the 9 with fewer frames.** Belady's anomaly, live.",
              "Run LRU at 4 frames and its count only improves. That asymmetry is the stack property at work — and it is why no real kernel evicts by pure load order.",
            ],
          },
        ],
      },
      {
        kind: "misconceptions",
        items: [
          {
            wrong: "Belady's anomaly shows that adding memory can hurt any system.",
            right: "The anomaly is specific to algorithms without the stack property — FIFO is the classic case. LRU and Optimal can only improve with more frames; real kernels use LRU approximations precisely to stay on the safe side.",
          },
          {
            wrong: "LRU is the optimal algorithm, since it uses the most information.",
            right: "LRU is the best *implementable heuristic* built from the past, but Optimal — reading the future — beats it on essentially every string (7 vs 10 faults above). LRU's virtue is that the past predicts the future well *under locality*.",
          },
        ],
      },
      {
        kind: "knowledge-check",
        questions: [
          {
            id: "kc-m6-repl-1",
            q: "Which eviction algorithm can exhibit Belady's anomaly?",
            options: [
              "FIFO — it lacks the stack property",
              "LRU — recency tracking misbehaves at scale",
              "Optimal — future knowledge is imperfect",
              "All three equally",
            ],
            answerIndex: 0,
            explanation:
              "The anomaly — more frames producing more faults — requires the n-frame resident set not to be contained in the (n+1)-frame set. LRU and Optimal have the stack property; FIFO does not.",
          },
          {
            id: "kc-m6-repl-2",
            q: "Three active processes each have a working set of 10 pages; RAM holds 25 frames. What is the symptom and the standard fix?",
            options: [
              "Thrashing (30 > 25) — suspend or swap out one process so the rest fit",
              "TLB thrashing — add more TLB entries",
              "Belady's anomaly — switch from FIFO to LRU",
              "External fragmentation — run compaction",
            ],
            answerIndex: 0,
            explanation:
              "The working sets sum to 30 pages against 25 frames: no process can hold its working set, so faults dominate and the CPU idles behind the disk. Reducing multiprogramming — suspending a process — lets the survivors' working sets fit.",
          },
        ],
      },
      {
        kind: "references",
        items: [
          {
            label: "OSTEP, Chapter 22: Swapping: Policies",
            url: "https://pages.cs.wisc.edu/~remzi/OSTEP/vm-beyondphys-policy.pdf",
            note: "replacement policies in full — FIFO, random, LRU, the clock approximation, thrashing",
          },
          {
            label: "OSTEP, Chapter 21: Swapping: Mechanisms",
            url: "https://pages.cs.wisc.edu/~remzi/OSTEP/vm-beyondphys.pdf",
            note: "the eviction machinery policies assume — swap space, dirty pages, write-back",
          },
        ],
      },
      {
        kind: "note",
        body: [
          "The lab computes exact LRU and exact Optimal over a small frame set with instant, costless disk traffic; real kernels run clock-style approximations of LRU (exact LRU is too expensive per access), face dirty-page write-back costs the lab ignores, and juggle per-process memory limits rather than one global frame pool. Fault totals in the lab are exact for its conventions but are a teaching model, not a benchmark.",
        ],
      },
    ],
  },
  {
    id: "virtual-memory/swapping-cow-mmap",
    moduleId: "virtual-memory",
    title: "Swapping, Copy-on-Write & mmap",
    minutes: 10,
    objectives: [
      "describe where evicted pages go and what write-back means for dirty pages",
      "trace copy-on-write fork and count the copies that actually happen",
      "explain what mmap changes about how files enter an address space",
    ],
    sections: [
      {
        kind: "problem",
        body: [
          "Three loose ends dangle from the module. First: when the replacer evicts a page, *where does it go?* Second: `fork` (module 2) conceptually duplicates a process — its whole address space. If that duplication were literal, every shell pipeline would copy hundreds of megabytes before the child immediately discarded most of them by calling `exec`. Fork would be the most expensive syscall in the OS. Third: programs read files with `read()`/`write()` syscalls — a copy from a kernel buffer into a user buffer, twice-touched memory. Could the file just *be* memory?",
          "All three answers are the same idea wearing different clothes: a page's mapping is a pointer, not a copy. Where the pointer aims — disk, another process, a file — is the OS's business, managed invisibly, one page at a time.",
        ],
      },
      {
        kind: "intuition",
        body: [
          "**Swapping** is self-storage for pages: when the closet (RAM) overflows, boxes go to the storage unit (swap space on disk) and a ledger remembers what went where; retrieving a box costs a trip — your page fault. **Copy-on-write** is how identical twins move house: they own every piece of furniture jointly, and the rule is 'the first twin to repaint a piece gets a fresh copy of it'. If neither repaints, nothing is ever duplicated — and the twins have been 'fully separated' for the price of a signature.",
          "**mmap** is pinning a book's pages directly onto your wall: reading the wall *is* reading the book, with no librarian copying pages onto slips of paper first. The wall starts bare (nothing is loaded until you look), pages you look at get pinned in by the page-fault machinery you already know, and if two people pin the same book, they share the same pages.",
        ],
      },
      {
        kind: "visual",
        simId: "paging-lab",
        body: [
          "The lab's **fork (COW) + write-page demo** makes the accounting visible. Fork a process: its pages are all marked shared read-only — *zero* copies so far. Have the child write to a page: the step reports a COW fault, copies exactly that one page, and remaps it writable for the child alone.",
          "Write to a few more pages, then have the parent write to one of *its* still-shared pages and watch the same thing happen for the parent. Keep a running count of copies: it equals the number of pages actually written — not the size of the address space, and not the sum of both processes' spaces.",
        ],
      },
      {
        kind: "technical",
        body: [
          "**Swapping** moves pages between RAM and **swap space** — a reserved disk region whose slots the OS tracks per page. Evicting a *clean* page (unchanged since it was read in, e.g. code) costs nothing to write back: the file or swap slot still holds a valid copy, so the frame is simply reclaimed. Evicting a *dirty* page (modified in memory) requires a **write-back** first — the disk copy is stale — which is why eviction costs vary and why the lab's 'instant fault' hides real work. *Swapping out* a whole process (classical swapping) is now rare; modern systems page out individual pages, and the term 'swapping' colloquially covers all of it.",
          "**Copy-on-write (COW)** redefines `fork`: parent and child initially map *the same physical frames*, all marked read-only in both page tables, with a reference count per frame. Any write to a shared page traps a fault; the handler copies just that page, remaps the writer's entry writable, decrements the refcount, and retries. A fork therefore costs page-table entries, not memory bandwidth — and a `fork` immediately followed by `exec` (the common shell pattern) copies almost nothing, because `exec` tears the address space down before most pages are ever written.",
          "**mmap** asks the OS to map a file (or anonymous memory) into the address space: `mmap` returns an address; touching it faults the corresponding file pages in directly, with the page cache serving as the backing store. Reads become memory reads; writes dirty pages that the kernel later flushes back to the file. A *shared* mapping hands two processes the same frames — a lookup table or an IPC channel without any copying — while a *private* mapping combines with COW to give each process its own copy of whatever it modifies. Loaders use exactly this to map program binaries in on demand.",
        ],
        equations: [
          {
            expr: "Copies after fork = pages actually written (by parent or child)",
            symbols: [
              { sym: "written", meaning: "pages whose first write after fork triggers the COW fault" },
            ],
            note: "Verified by the lab's demo: 100 shared pages, child writes 5, parent writes 3 → 8 copies. A literal fork would have copied 100; eager duplication for both would be 200.",
          },
          {
            expr: "First access to an mmap'd page = page fault from the file; later accesses = RAM speed",
            symbols: [
              { sym: "page fault", meaning: "the same major-fault machinery from lesson 3, with the file as backing store" },
            ],
            note: "mmap does not avoid the first-touch cost — it hides it behind demand paging and lets the OS share and write back pages behind your back.",
          },
        ],
      },
      {
        kind: "worked-example",
        steps: [
          {
            title: "A fork, accounted in pages",
            body: [
              "A process has 100 resident pages. It forks. Copies performed: **zero** — both processes now map the same 100 frames, every mapping read-only. The child writes 5 pages: 5 COW faults, 5 copies, those pages now private to the child. The parent writes 3 *different* pages — still shared, because the child never touched them: 3 more copies, now private to the parent.",
              "Total: 8 pages copied out of 100 — and the 92 untouched pages still cost nothing to either side. Had the child `exec`'d immediately, even fewer would ever be written; eager duplication at fork time would have billed 100 copies up front regardless.",
            ],
          },
          {
            title: "Choosing the mechanism on purpose",
            body: [
              "You need two processes to share a read-only lookup table without duplicating it: map the same file (or a shared anonymous region) with `mmap` — both processes' virtual pages point at the same frames, and neither pays a copy. You need to hand a 200 MB dataset from a server to a worker per request: `fork` + COW means the dataset is referenced, not copied; the worker's edits cost only the pages it rewrites.",
              "The general principle, one last time: *a mapping is a pointer*. Copies happen at page granularity, lazily, only on first write — and the OS arranges all of it without either program's instructions changing.",
            ],
          },
        ],
      },
      {
        kind: "misconceptions",
        items: [
          {
            wrong: "fork always duplicates the parent's entire address space.",
            right: "With copy-on-write, fork shares every page read-only and copies only on first write, one page at a time. The textbook 'exact copy of the parent' is the *illusion* fork presents — COW is how the trick is paid for.",
          },
          {
            wrong: "mmap and read() are interchangeable ways to get file data.",
            right: "They differ in mechanism: read() copies through a buffer via a syscall; mmap faults file pages directly into your address space, shares them between processes, and lets the kernel manage write-back — with different error semantics (a truncated file can fault as SIGBUS instead of returning a short read).",
          },
        ],
      },
      {
        kind: "knowledge-check",
        questions: [
          {
            id: "kc-m6-swap-1",
            q: "After fork with COW, the parent writes to a page it still shares with the child. What happens?",
            options: [
              "The kernel copies that one page for the parent and remaps it writable; the child keeps its read-only mapping",
              "Both processes now share the page as writable",
              "The child's access to the page is revoked",
              "The write is refused with a segmentation fault",
            ],
            answerIndex: 0,
            explanation:
              "COW is symmetric: whichever process writes first gets its own private copy of that page. The other side keeps sharing the original until it writes too.",
          },
          {
            id: "kc-m6-swap-2",
            q: "Two processes need to share one read-only lookup table without any duplication. Which mechanism fits best?",
            options: [
              "A shared mmap of the same file — both map the same physical frames",
              "Each process reads the file into its own heap buffer",
              "Swap the table out; both fault it back in on demand",
              "Double the physical RAM and let each load its own copy",
            ],
            answerIndex: 0,
            explanation:
              "A shared mapping points both address spaces at the same pages: one copy in RAM, zero copying into user buffers. Private heap reads duplicate; swap is a storage mechanism, not a sharing one.",
          },
        ],
      },
      {
        kind: "references",
        items: [
          {
            label: "OSTEP, Chapter 21: Swapping: Mechanisms",
            url: "https://pages.cs.wisc.edu/~remzi/OSTEP/vm-beyondphys.pdf",
            note: "swap space layout, page-out/page-in, and the bits that make COW and demand paging possible",
          },
          {
            label: "OSTEP, Chapter 13: The Abstraction: Address Spaces",
            url: "https://pages.cs.wisc.edu/~remzi/OSTEP/vm-intro.pdf",
            note: "the goals — sharing, laziness, the illusion — that these three mechanisms deliver",
          },
          {
            label: "man7: mmap(2) — map files or devices into memory",
            url: "https://man7.org/linux/man-pages/man2/mmap.2.html",
            note: "the real syscall: MAP_SHARED vs MAP_PRIVATE, and the fault-driven semantics",
          },
        ],
      },
      {
        kind: "note",
        body: [
          "The lab's COW demo copies instantly and hides reference counts, dirty tracking, and page-table teardown on exit; real COW must also handle shared library text, huge pages, and the accounting of who owns what at process exit. Swap traffic is not simulated at all — faults are free — so this lesson's EAT and write-back costs live only in your head, where (unlike in the lab) they are the dominant design constraint.",
        ],
      },
    ],
  },
];
