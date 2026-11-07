import type { GlossaryEntry } from "@/types";

/**
 * Glossary — module 6 (Virtual Memory & Paging).
 * The lab models 16 pages × 16 units, a one-level page table, a 2-entry LRU
 * TLB, and instant (cost-free) page faults.
 */
export const entries: GlossaryEntry[] = [
  {
    id: "page",
    term: "Page",
    simple: "A fixed-size block of a process's address space — the unit that moves between RAM and disk.",
    technical:
      "A contiguous, fixed-size (power-of-two) region of a virtual address space, mapped by the page table to a same-sized physical frame; the page size splits every address into a high page-number part and a low offset, making translation a shift and a mask.",
    example:
      "The lab's 16-unit pages split address 0x2A into page 2 (0x2A >> 4) and offset 10 (0x2A & 15); real x86-64 pages are 4 KiB.",
    related: ["frame", "page-table", "virtual-address", "physical-address", "locality"],
    moduleId: "virtual-memory",
    lessonRef: "virtual-memory/pages-frames-tlb",
    simId: "paging-lab",
    refUrl: "https://pages.cs.wisc.edu/~remzi/OSTEP/vm-paging.pdf",
    refLabel: "OSTEP ch. 18: Paging: Introduction",
  },
  {
    id: "frame",
    term: "Frame",
    simple: "A same-sized slot in physical RAM that can hold exactly one page.",
    technical:
      "A fixed-size block of physical memory, the counterpart of the page: the page table maps each virtual page number to a physical frame number (PFN), and any frame may hold any page — which is why paging abolishes external fragmentation.",
    example:
      "Process A's page 2 in frame 5 and process B's page 2 in frame 9: identical pages, arbitrary frames, no adjacency required.",
    related: ["page", "page-table", "physical-address", "ram", "fragmentation"],
    moduleId: "virtual-memory",
    lessonRef: "virtual-memory/pages-frames-tlb",
    simId: "paging-lab",
  },
  {
    id: "page-table",
    term: "Page table",
    simple: "Per-process index that says which frame (if any) holds each of its pages.",
    technical:
      "The OS-maintained data structure mapping virtual page numbers to physical frame numbers plus status bits (valid, protection, dirty, accessed); consulted on every TLB miss, with one entry per page of the address space — which is why real systems use multi-level trees.",
    example:
      "The lab's table has 16 entries (one per page); a 48-bit address space with 4 KiB pages would need 2³⁶ entries flat — hence hierarchical tables.",
    related: ["page", "frame", "tlb", "page-fault", "virtual-address"],
    moduleId: "virtual-memory",
    lessonRef: "virtual-memory/pages-frames-tlb",
    simId: "paging-lab",
    refUrl: "https://pages.cs.wisc.edu/~remzi/OSTEP/vm-paging.pdf",
    refLabel: "OSTEP ch. 18: Paging: Introduction",
  },
  {
    id: "tlb",
    term: "TLB",
    fullForm: "Translation Lookaside Buffer",
    simple: "A tiny cache inside the MMU that remembers recent page translations so most accesses skip the table walk.",
    technical:
      "A small, highly associative cache of VPN → PFN entries consulted before every page-table walk; under locality it achieves >99% hit rates with dozens of entries, and misses insert a translation under the TLB's replacement policy (the lab: 2 entries, LRU).",
    example:
      "Walking pages 5, 7, 5, 9 in the lab's 2-entry TLB: the hit on 5 refreshes it, so 9's arrival evicts 7 — final contents [5, 9].",
    related: ["page-table", "locality", "page", "mmu-translation"],
    moduleId: "virtual-memory",
    lessonRef: "virtual-memory/pages-frames-tlb",
    simId: "paging-lab",
    refUrl: "https://pages.cs.wisc.edu/~remzi/OSTEP/vm-tlbs.pdf",
    refLabel: "OSTEP ch. 19: Paging: Faster Translations (TLBs)",
  },
  {
    id: "mmu-translation",
    term: "MMU",
    fullForm: "Memory Management Unit",
    simple: "The hardware that translates every virtual address to a physical one, using the OS's tables.",
    technical:
      "The CPU-side hardware performing address translation on each access: TLB lookup first, then the page-table walk on miss, raising a trap on an invalid entry; it is what makes per-access relocation and protection free of OS involvement in steady state.",
    example:
      "The MMU turns process A's virtual 0x2A into physical 90 via A's page table — and turns B's identical 0x2A into 154 via B's.",
    related: ["page-table", "tlb", "virtual-address", "physical-address", "base-limit"],
    moduleId: "virtual-memory",
    lessonRef: "virtual-memory/why-virtual-memory",
    refUrl: "https://pages.cs.wisc.edu/~remzi/OSTEP/vm-mechanism.pdf",
    refLabel: "OSTEP ch. 15: Address Translation",
  },
  {
    id: "page-fault",
    term: "Page fault",
    simple: "The trap raised when a program touches a page that is mapped but not currently in RAM.",
    technical:
      "The exception raised by the MMU when an access's PTE has valid bit 0; the handler validates the access, obtains a frame, reads the page from file or swap, updates the PTE, and retries the faulting instruction — the mechanism demand paging is built on.",
    example:
      "First touch of a data page: fault → disk read (~8 ms) → retry. Only an access with NO mapping at all becomes the fatal SIGSEGV.",
    related: ["demand-paging", "page-table", "swapping", "trap", "segmentation-fault"],
    moduleId: "virtual-memory",
    lessonRef: "virtual-memory/page-faults-demand-paging",
    simId: "paging-lab",
    refUrl: "https://pages.cs.wisc.edu/~remzi/OSTEP/vm-beyondphys.pdf",
    refLabel: "OSTEP ch. 21: Swapping: Mechanisms",
  },
  {
    id: "demand-paging",
    term: "Demand paging",
    simple: "Load nothing until it is actually touched — pages arrive one fault at a time.",
    technical:
      "The policy of starting a process with few or no resident pages, marking all PTEs invalid and letting page faults pull in code, data and stack on first use; it makes the sum of address spaces exceed RAM and makes startup cheap.",
    example:
      "A 20-page process that touches 2 pages at startup has exactly 2 pages resident; the other 18 load only when first referenced.",
    related: ["page-fault", "working-set", "swapping", "thrashing"],
    moduleId: "virtual-memory",
    lessonRef: "virtual-memory/page-faults-demand-paging",
    simId: "paging-lab",
  },
  {
    id: "belady-anomaly",
    term: "Belady's anomaly",
    simple: "With FIFO replacement, adding memory can increase page faults.",
    technical:
      "The phenomenon in which a reference string produces more faults with n+1 frames than with n under FIFO replacement, caused by FIFO lacking the stack property (its n-frame resident set is not contained in its (n+1)-frame set); LRU and Optimal are immune.",
    example:
      "The string 1,2,3,4,1,2,5,1,2,3,4,5: FIFO gives 9 faults at 3 frames but 10 at 4 frames — more memory, more faults.",
    related: ["working-set", "page-fault", "demand-paging"],
    moduleId: "virtual-memory",
    lessonRef: "virtual-memory/replacement-algorithms",
    simId: "page-replacement-lab",
    refUrl: "https://pages.cs.wisc.edu/~remzi/OSTEP/vm-beyondphys-policy.pdf",
    refLabel: "OSTEP ch. 22: Swapping: Policies",
  },
  {
    id: "working-set",
    term: "Working set",
    simple: "The set of pages a process has actually used recently — what must fit in RAM for it to run usefully.",
    technical:
      "W(t, Δ): the collection of pages referenced in the recent window of length Δ; a process faults acceptably only when its working set is resident, and the sum of active working sets versus available frames is the thrashing test.",
    example:
      "Three processes with working sets of 10 pages on a 25-frame machine: 30 > 25 — overcommitted, and the standard fix is to suspend one process.",
    related: ["locality", "thrashing", "demand-paging", "page-fault"],
    moduleId: "virtual-memory",
    lessonRef: "virtual-memory/replacement-algorithms",
    refUrl: "https://pages.cs.wisc.edu/~remzi/OSTEP/vm-beyondphys-policy.pdf",
    refLabel: "OSTEP ch. 22: Swapping: Policies",
  },
  {
    id: "thrashing",
    term: "Thrashing",
    simple: "The system spends all its time swapping pages in and out while the CPU sits idle.",
    technical:
      "The collapse mode in which memory is overcommitted — active working sets exceed frames — so every eviction steals a page another process needs immediately; fault rates dominate and CPU utilization plummets. Remedied by reducing multiprogramming (suspending/swapping out processes).",
    example:
      "CPU utilization falls as load rises: each new process pushes others' pages out, the disk saturates with fetch traffic, and nobody makes progress.",
    related: ["working-set", "page-fault", "swapping", "demand-paging"],
    moduleId: "virtual-memory",
    lessonRef: "virtual-memory/replacement-algorithms",
    simId: "page-replacement-lab",
  },
  {
    id: "swapping",
    term: "Swapping",
    simple: "Moving pages (or whole processes) between RAM and a disk region reserved as overflow.",
    technical:
      "Transferring pages between frames and swap space: eviction of a clean page costs nothing (its copy is still valid), while a dirty page needs a write-back first; classical whole-process swapping is rare in modern systems, which page out individual pages.",
    example:
      "Evicting a modified data page: write it to its swap slot, then hand the frame to the faulting process; evicting untouched code text needs no write at all.",
    related: ["page-fault", "thrashing", "demand-paging", "page"],
    moduleId: "virtual-memory",
    lessonRef: "virtual-memory/swapping-cow-mmap",
    refUrl: "https://pages.cs.wisc.edu/~remzi/OSTEP/vm-beyondphys.pdf",
    refLabel: "OSTEP ch. 21: Swapping: Mechanisms",
  },
  {
    id: "copy-on-write",
    term: "Copy-on-write",
    fullForm: "COW",
    simple: "Share pages read-only after fork; copy one page only when someone first writes it.",
    technical:
      "The fork optimization in which parent and child map the same frames read-only with per-frame reference counts; a write traps a fault, the handler copies just that page, remaps the writer's entry writable, and retries — so fork costs page-table entries, not memory bandwidth.",
    example:
      "100 shared pages, child writes 5, parent writes 3: exactly 8 copies — a fork+exec child may write almost nothing.",
    related: ["fork", "page-fault", "process", "mmap", "shared-memory"],
    moduleId: "virtual-memory",
    lessonRef: "virtual-memory/swapping-cow-mmap",
    simId: "paging-lab",
  },
  {
    id: "mmap",
    term: "mmap",
    fullForm: "memory map",
    simple: "Map a file (or fresh memory) directly into your address space — reading the memory reads the file.",
    technical:
      "The syscall returning an address at which file (MAP_SHARED/MAP_PRIVATE) or anonymous pages become accessible, faulting in from the file on first touch; shared mappings give processes the same frames (zero-copy sharing and IPC), and the kernel writes dirty pages back to the file.",
    example:
      "Two processes mmap the same read-only lookup table: one copy in RAM, both address spaces pointing at it — no buffers, no copying.",
    related: ["page-fault", "copy-on-write", "shared-memory", "system-call"],
    moduleId: "virtual-memory",
    lessonRef: "virtual-memory/swapping-cow-mmap",
    refUrl: "https://man7.org/linux/man-pages/man2/mmap.2.html",
    refLabel: "man7: mmap(2)",
  },
  {
    id: "locality",
    term: "Locality of reference",
    simple: "Programs reuse the same few pages and neighbors of recent accesses — the habit every cache bets on.",
    technical:
      "Temporal locality (recently referenced items are referenced again soon) and spatial locality (nearby items are referenced together); together they keep TLB hit rates above 99%, keep working sets small, and are the empirical foundation demand paging stands on.",
    example:
      "A loop over one array page: a 2-entry TLB catches every translation, and the page never faults again after the first touch.",
    related: ["tlb", "working-set", "page-fault", "page"],
    moduleId: "virtual-memory",
    lessonRef: "virtual-memory/pages-frames-tlb",
    simId: "paging-lab",
  },
];
