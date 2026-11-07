import type { Lesson } from "@/types";

/**
 * Module 11 — System Calls, Protection & Security.
 * The guarded doorway into the kernel: syscall stages, user/kernel modes,
 * hardware isolation, permissions and least privilege, and — defensively
 * framed — attack surfaces and sandboxing.
 * Lab conventions in this course: the System Call Lab walks a fixed 7-stage
 * pipeline (user-code → trap → mode-switch → dispatch → kernel-exec →
 * return → resume) over read/write/open/close with argument validation at
 * dispatch; the Protection Lab models Unix owner/group/other rwx triads
 * (first-match), base/limit memory regions with simulated segfaults, and a
 * kernel-mode toggle as the superuser analog that bypasses checks.
 */
export const lessons: Lesson[] = [
  {
    id: "syscalls-security/system-calls",
    moduleId: "syscalls-security",
    title: "The System Call Interface",
    minutes: 10,
    objectives: [
      "walk the seven stages of a system call from user code to resume",
      "explain why arguments — especially pointers — are validated by the kernel",
      "distinguish a system call from an ordinary function call",
    ],
    sections: [
      {
        kind: "problem",
        body: [
          "Applications constantly need what only the kernel may provide: files on disk, network packets, memory, the clock. But modules 5 and 6 built a wall around the kernel for good reasons — user code cannot touch kernel memory, and in module 1 you saw that entering the kernel is a hardware-controlled event. So the OS must thread a needle: give user code *access to every kernel service* through *one narrow, checked doorway*. Every service, zero direct reach.",
          "That doorway is the **system call interface** — and it is the single most-trafficked boundary in your machine: every `printf`, every `open`, every millisecond of sleep crosses it. The design constraints are unforgiving. It must be *fast* (crossed millions of times per second), *total* (every needed service reachable), and *paranoid* (whatever the caller passes is untrusted data from the wild). This lesson walks one call through the machinery, stage by stage, because the stages are the boundary.",
        ],
      },
      {
        kind: "intuition",
        body: [
          "A **bank counter**. You (user code) can't walk into the vault — you fill out a *form* (syscall number + arguments), slide it under the glass (the trap instruction), and the teller (the kernel) takes it from there: the glass is a one-way hatch, the bank's back office (kernel mode) is a place your badge simply doesn't open. The teller *checks the form* — is the account number real? is the signature yours? — before touching anything (argument validation), does the work, stamps a receipt (the return value), and slides it back. You resume your day, none the wiser about the vault's layout.",
          "Notice the two-directional ignorance: you don't know how the vault works, and the bank doesn't trust your form. Both ignorances are the security model working. A *function call* is a coworker leaning over your desk — same privilege, same memory, no glass. A *system call* is the glass: same building, different world.",
        ],
      },
      {
        kind: "visual",
        simId: "syscall-lab",
        body: [
          "The **System Call Lab** is the 7-stage walk made literal. Issue `read` and step: **user-code** issues the call with its number; **trap** — the special instruction hands control to the kernel's entry point and saves caller state; **mode-switch** — the CPU is now in kernel mode; **dispatch** — syscall number → handler via the system-call table, and (read the log!) the kernel *validates the arguments, checking pointers against the caller's address space*; **kernel-exec** — the service runs and produces a result; **return** — result placed in a register, CPU back to user mode; **resume** — the application continues right after the call, never having seen the kernel's internals.",
          "Then issue `open` and compare: different number, different handler, *identical glass*. Walk `close` too and notice which stages never change — the trap, the mode switch, the return are the doorway itself; only dispatch and kernel-exec know which service you asked for.",
        ],
      },
      {
        kind: "technical",
        body: [
          "Mechanically, a syscall is: user code places a **syscall number** and arguments in registers (on Linux x86-64: number in `rax`, arguments in `rdi, rsi, rdx, …`), then executes a special **trap instruction** (`syscall` on x86-64, `ecall` on RISC-V). The CPU hardware — not the OS — switches to **kernel mode**, jumps to the kernel's single entry point, and saves the caller's state (module 1's trap machinery, now used deliberately). The kernel's entry code routes through the **system-call table** — an array indexed by syscall number whose entries are handler functions — and, critically, **validates every argument**: file descriptors must be the caller's, counts sane, and *every user-supplied pointer checked to live in the caller's address space*, because a pointer aimed at kernel memory would otherwise turn `read()` into a kernel-memory writer.",
          "The handler runs in kernel mode with full authority, produces a **return value** (or a negative errno like `-EFAULT`, `-EBADF`), and the return path restores caller state, drops the CPU back to **user mode**, and resumes exactly after the trap instruction. User code sees a C function that returned — the library wrapper (`open()`, `read()`) hid the number, the registers and the trap. The whole round trip costs hundreds of nanoseconds on modern hardware (vDSO shortcuts even skip the trap for some 'calls' like `gettimeofday`) — cheap enough that applications cross this glass millions of times a second.",
          "Why not simply let user code call kernel functions? Because then *any* kernel address would be callable: the wall module 6 built would have a door in every wall panel, and one hijacked return address would be root. The number-and-table design is the choke point: user code can *name* one of ~400 services — it cannot *be* any kernel code it likes. Every defense in this module's last lesson starts from that choke point.",
        ],
        equations: [
          {
            expr: "handler = syscall_table[num]      result = handler(validated args)",
            symbols: [
              { sym: "num", meaning: "the syscall number the caller placed in a register (read=0, write=1, open=2, close=3 in the lab)" },
              { sym: "syscall_table", meaning: "the kernel's array of handler functions, indexed by number" },
            ],
            note: "The table is the doorway's spine: user code can only index it — never jump past it.",
          },
          {
            expr: "t_syscall ≈ t_trap + t_mode-switch + t_dispatch + t_exec + t_return",
            symbols: [
              { sym: "t_syscall", meaning: "total cost of one system call — order 100s of ns on modern hardware" },
            ],
            note: "This floor is why syscall-heavy designs (tiny reads, chatty drivers) lose to batched ones — and why io_uring (module 10) amortizes the crossing.",
          },
        ],
      },
      {
        kind: "worked-example",
        steps: [
          {
            title: "open(\"/docs/notes.txt\"), all seven stages",
            body: [
              "Library wrapper sets the number (open = 2) and arguments — a pointer to the path string — and traps. **Trap**: the CPU saves the caller's state and vectors to the kernel entry; **mode-switch**: kernel mode. **Dispatch**: the table hands the request to the open handler, which validates: is that path pointer inside the *caller's* address space (it must be — otherwise return `-EFAULT`), is it null-terminated within bounds? Then the handler resolves the path (module 9's directory walk), checks permissions (lesson 3), and allocates a file descriptor.",
              "**Kernel-exec** completes: 'new file descriptor 3'. **Return**: 3 goes in the result register, CPU drops to user mode; **resume**: the app continues, holding a small integer that names an open file — an index into the kernel's per-process descriptor table, a fact the app must never poke directly.",
            ],
          },
          {
            title: "What a hostile argument looks like",
            body: [
              "Now the dishonest caller: `read(fd, ptr, 4096)` where `ptr` aims at *kernel* memory — if the kernel copied bytes there, user code just read the kernel's secrets through the return path. The dispatch-stage validation catches it: the pointer does not live in the caller's address space → `-EFAULT`, nothing copied. Same for a bogus `fd` → `-EBADF`, a negative count → `-EINVAL`.",
              "This is the pattern to internalize: *every* argument is hostile until checked, because the glass transmits forms from strangers. Real kernels have been broken precisely at stages where a validation was skipped for 'obviously safe' arguments — the checklist exists because the failure mode is that expensive.",
            ],
          },
        ],
      },
      {
        kind: "misconceptions",
        items: [
          {
            wrong: "A system call is just a function call into the kernel's code.",
            right: "A function call stays in one privilege world; a syscall crosses the user/kernel boundary through a trap instruction, a hardware mode switch, and a numbered dispatch table. You cannot 'call' an arbitrary kernel address — only the services the table names.",
          },
          {
            wrong: "The kernel can trust the arguments the caller passes — they're just integers and pointers.",
            right: "Arguments arrive from the least trusted code in the machine. Pointers are validated against the caller's address space, descriptors against the caller's table, counts against sane ranges — a hostile pointer aimed at kernel memory must fail as EFAULT, not succeed.",
          },
        ],
      },
      {
        kind: "knowledge-check",
        questions: [
          {
            id: "kc-m11-sc-1",
            q: "Which ordering of the syscall walk is correct?",
            options: [
              "user-code → trap → mode-switch → dispatch → kernel-exec → return → resume",
              "user-code → dispatch → trap → mode-switch → kernel-exec → return → resume",
              "trap → user-code → mode-switch → kernel-exec → dispatch → return → resume",
              "user-code → trap → dispatch → mode-switch → return → kernel-exec → resume",
            ],
            answerIndex: 0,
            explanation:
              "The lab's 7 stages: the trap saves state and enters the kernel's entry point, the mode switch makes privileged execution legal, dispatch validates and routes via the table, then exec, return, resume. Dispatch cannot precede the mode switch — the table is kernel memory.",
          },
          {
            id: "kc-m11-sc-2",
            q: "Why does the dispatch stage validate that a caller's buffer pointer lives in the caller's address space?",
            options: [
              "A pointer aimed at kernel memory would let user code read or write kernel data through the syscall's copy",
              "To make the call faster by skipping unmapped pages",
              "Because file descriptors must point into the kernel heap",
              "To check that the caller has execute permission on the buffer",
            ],
            answerIndex: 0,
            explanation:
              "Arguments come from untrusted code. Unchecked, `read(fd, kernel_ptr, n)` is a kernel-memory disclosure; the validation turns it into -EFAULT. Every syscall's security begins at this check.",
          },
        ],
      },
      {
        kind: "references",
        items: [
          {
            label: "OSTEP, Chapter 6: Direct Execution (Limited Direct Execution)",
            url: "https://pages.cs.wisc.edu/~remzi/OSTEP/cpu-mechanisms.pdf",
            note: "why user code runs directly but must trap for services — this module's theoretical base",
          },
          {
            label: "man7: syscalls(2) — Linux system calls",
            url: "https://man7.org/linux/man-pages/man2/syscalls.2.html",
            note: "the real interface: numbers, calling conventions, and the list of services behind the glass",
          },
          {
            label: "man7: syscall(2) — indirect system call",
            url: "https://man7.org/linux/man-pages/man2/syscall.2.html",
            note: "the raw kernel libc function — see the number-and-register convention yourself",
          },
        ],
      },
      {
        kind: "note",
        body: [
          "Lab simplifications: the lab's walk is a fixed 7-stage pipeline; real entry differs per architecture (x86-64 `syscall`/`sysenter`, RISC-V `ecall`, each with its own register conventions and stack switching), and libc wrappers add another layer the lab elides. The lab's table holds 4 syscalls where Linux exposes ~400; validation is described in the dispatch log rather than modeled byte by byte; timing is not simulated — no tick counter crosses the glass.",
        ],
      },
    ],
  },
  {
    id: "syscalls-security/protection-isolation",
    moduleId: "syscalls-security",
    title: "Protection Rings & Isolation",
    minutes: 10,
    objectives: [
      "explain the user/kernel mode bit and what privileged instructions it gates",
      "compute valid address ranges under base/limit protection and predict fault addresses",
      "argue why isolation must be enforced by hardware, not by polite software",
    ],
    sections: [
      {
        kind: "problem",
        body: [
          "The syscall interface (lesson 1) is a doorway — but a doorway is only as good as the wall around it. Two isolation guarantees must hold before the doorway means anything: a process must not read or write *another process's* memory (horizontal isolation), and user code must not execute *privileged operations* — page-table changes, device access, the mode switch itself (vertical isolation). One buggy game must not corrupt the browser; one hijacked program must not reprogram the MMU.",
          "The deep design fact of this lesson: **software cannot enforce these guarantees on itself**. If isolation were 'the OS checks each access politely', then the buggy process's wild pointer would simply… skip the check, because the check runs *in the same machine* as the bug. Enforcement must sit *between* the process and every access — which means it must be hardware, configured by the OS but not bypassable by it. Every protection mechanism you have met — base/limit (module 5), page tables (module 6) — is exactly that: hardware walls, OS-designed.",
        ],
      },
      {
        kind: "intuition",
        body: [
          "A **hotel with staff-only corridors**. Guests (user processes) move freely in their own rooms and the public halls; the service corridors (kernel), the master key cabinet (page tables, device registers) and the elevator's manual override are behind doors their keycards simply do not open. Two guest keys open two different rooms — and no guest key, waved harder, opens another guest's room: the *lock hardware* decides, not the guest's sincerity.",
          "Staff (kernel mode) carry the master key. But notice the hotel's real discipline: staff enter guest rooms only on *request* (a syscall — housekeeping), with logged procedures. The mode bit is the keycard reader: same CPU, same building — two authority levels, enforced by electronics at every door.",
        ],
      },
      {
        kind: "visual",
        simId: "protection-lab",
        body: [
          "The **Protection Lab** gives pid 7 (user alice) two memory regions — code `[0, 100)` and data `[100, 160)` — and a neighboring process's region at `[200, 250)`. Attempt a memory access at address 150: inside data, allowed. Attempt 250: outside every region of pid 7 — **segmentation fault**, simulated, with the log explaining the bounds check that failed.",
          "Then toggle to **kernel mode** and repeat the same 250 access: allowed — 'protection checks are bypassed', the superuser analog. Let that asymmetry sink in: the *same access*, judged by the *same hardware*, with one bit different. That bit is the entire vertical axis of this module.",
        ],
      },
      {
        kind: "experiment",
        simId: "protection-lab",
        prompts: [
          "As pid 7 in user mode, probe the boundary exactly: access addresses 99, 100, 159, 160. Predict each verdict before checking — the rule is `base ≤ addr < base + limit` per region. Which side of the boundary does the fault land on, and why is the upper end exclusive?",
          "Try to reach the *other process's* region: as pid 7, access 220 (inside pid 8's `[200, 250)`). It faults — the lab checks regions *owned by your pid* only. Explain why 'a valid address somewhere in memory' and 'a valid address for me' are different questions.",
          "Switch to kernel mode and repeat the pid-8 access: allowed. This is the superuser analog — and the danger of over-privileged code: the same process, one mode bit up, ignores every wall. Which principle from lesson 3 (next) says authority should have been smaller?",
          "Attempt file operations as alice against `/etc/config` (root's file) in user mode — denied. Kernel mode — allowed. List, in order, the three walls between a user process and a forbidden file: isolation (this lesson), the syscall doorway (lesson 1), and permissions (lesson 3).",
        ],
        body: [
          "Lab conventions: regions are base/limit segments per pid; the check is hardware-style (instant, per access, unforgiving); kernel mode bypasses both memory and file checks — the lab's honest stand-in for 'root can do anything'; switching modes is a button press here, but in a real machine only the trap/return instructions may touch that bit.",
        ],
      },
      {
        kind: "technical",
        body: [
          "**Dual-mode operation**: the CPU runs in **user mode** or **kernel mode**, distinguished by a **mode bit**. In user mode, *privileged instructions* fault: touching device registers, loading page-table base registers, modifying the mode bit itself, halting the CPU. The OS boots in kernel mode, configures the walls, and drops to user mode to run processes; the only ways back across are the events module 1 catalogued — interrupts, exceptions, and the syscall trap. This is **limited direct execution**: processes run at full speed directly on the CPU, *except* at exactly the places the OS must mediate.",
          "**Vertical isolation** (user vs kernel) is the mode bit. **Horizontal isolation** (process vs process) is address translation: base/limit segments — hardware checks `base ≤ addr < base + limit` on every access, faulting outside it — or, modern, paging: each process has its own page table (module 6), and another process's memory is not merely forbidden but *unnameable* — its addresses map nowhere in your space. The OS configures these structures in kernel mode; user code cannot alter them (privileged), and hardware enforces them per access (unbypassable).",
          "x86 hardware formalizes the levels as **protection rings** 0–3 — ring 0 kernel, ring 3 user, rings 1–2 historically unused (some hypervisors and virtualization tricks have worn them). Modern OSes use two rings; the virtualization module shows how a *hypervisor* adds a ring-like layer beneath the kernel. One consequence deserves emphasis for lesson 4: kernel mode is not a *place*, it is an *authority* — and code running with it (drivers included) can bypass every wall this lesson built. Least privilege says: stay in user mode as long as possible, cross the glass only through the checked doorway.",
        ],
        equations: [
          {
            expr: "Access allowed ⟺ ∃ region: base ≤ addr < base + limit",
            symbols: [
              { sym: "base", meaning: "the region's first valid address" },
              { sym: "limit", meaning: "the region's length in addresses" },
            ],
            note: "The lab's regions: code [0,100), data [100,160) for pid 7. Address 160 faults — the upper bound is exclusive; 159 is the last legal byte.",
          },
          {
            expr: "Privileged ⟺ instruction faulted when mode bit = user",
            symbols: [
              { sym: "mode bit", meaning: "the CPU flag distinguishing user (0) from kernel (1) authority" },
            ],
            note: "The set includes: I/O port access, page-table base load, mode-bit change, halt. Every one is 'reconfigure the walls' — which is why it must be kernel-only.",
          },
        ],
      },
      {
        kind: "worked-example",
        steps: [
          {
            title: "One wild pointer, three layers of response",
            body: [
              "pid 7 executes `load r1, [250]` — 250 is outside its data region `[100, 160)`. Hardware (base/limit or the page-table walk) faults *before the load completes*: the access raises an exception, the CPU switches to kernel mode, and module 1's machinery dispatches to the fault handler.",
              "The kernel's judgment: an access outside any of the process's regions is not recoverable by fetching anything — unlike a page fault (module 6), the address is *invalid*, so the kernel delivers SIGSEGV and terminates the process. Trace the layers: hardware caught it (unbypassable), the kernel decided (policy), the process died (containment). The buggy game corrupted nothing but itself — that is horizontal isolation doing its one job.",
            ],
          },
          {
            title: "Why the mode bit can't be 'polite'",
            body: [
              "Imagine the walls were software: the OS checks each access against the regions *in code*. pid 7's wild pointer doesn't execute the check — it just loads; the check ran in *other* instructions. A compromised kernel-checking routine is worse: it has the keys it was guarding.",
              "This is why the mode bit lives in the CPU and the bounds live in registers/page-tables the CPU walks *per access*: enforcement sits on the path of every load and store, in silicon, before the access happens. The OS's role is architect and locksmith — it builds and configures the walls — but never a per-access doorman. When you configure a page table, you are writing hardware policy; that division of labor is the foundation every security mechanism in this course stands on.",
            ],
          },
        ],
      },
      {
        kind: "misconceptions",
        items: [
          {
            wrong: "Kernel mode is a region of memory where the kernel lives.",
            right: "Kernel *mode* is an execution authority of the CPU — a bit, not an address range. (Kernel *memory* is a separate thing: address ranges only kernel mode may access.) One CPU flips between the two authorities on every trap and return.",
          },
          {
            wrong: "Isolation works because the OS checks each access and politely refuses bad ones.",
            right: "A process's own bad access cannot be intercepted by a software check — it must fault in hardware, on the access path, before completing. The OS configures the hardware walls; hardware enforces them per access; software only decides what happens after a fault.",
          },
        ],
      },
      {
        kind: "knowledge-check",
        questions: [
          {
            id: "kc-m11-pi-1",
            q: "A process has a region with base 100 and limit 60. Which is the largest address it may legally access?",
            options: [
              "159 — the range is [100, 160), upper bound exclusive",
              "160 — base + limit is always included",
              "60 — the limit is the top address",
              "100 — only the base itself is guaranteed",
            ],
            answerIndex: 0,
            explanation:
              "base ≤ addr < base + limit: 100..159 inclusive. Address 160 faults — the same off-by-one discipline as module 5's segments and the lab's boundary probes.",
          },
          {
            id: "kc-m11-pi-2",
            q: "User code executes a privileged instruction (say, loading the page-table base register). What happens, and why is this the right design?",
            options: [
              "The CPU faults it in user mode; allowing it would let one process rewrite the walls around every other process",
              "It executes with a warning; the OS fixes up any damage afterward",
              "It is ignored silently — privileged simply means 'discouraged'",
              "It executes normally if the process owns enough memory",
            ],
            answerIndex: 0,
            explanation:
              "Privileged instructions fault in user mode and trap to the kernel. This is vertical isolation: page tables, device access and the mode bit itself are exactly the powers that must not be reachable from user code — the walls cannot include their own reconfiguration switch.",
          },
        ],
      },
      {
        kind: "references",
        items: [
          {
            label: "OSTEP, Chapter 6: Direct Execution (Limited Direct Execution)",
            url: "https://pages.cs.wisc.edu/~remzi/OSTEP/cpu-mechanisms.pdf",
            note: "the restricted-operation and mode-switch story this lesson formalizes",
          },
          {
            label: "OSTEP, Chapter 15: Address Translation",
            url: "https://pages.cs.wisc.edu/~remzi/OSTEP/vm-mechanism.pdf",
            note: "how per-access hardware enforcement actually works, from base/limit to page tables",
          },
        ],
      },
      {
        kind: "note",
        body: [
          "Lab simplifications: the Protection Lab's mode switch is a button any state can press (real machines: only trap/return instructions may change the mode bit, and entering kernel mode routes through the one entry point); its regions are base/limit segments with no paging, permissions on the regions themselves, or kernel-memory mapping; the kernel-mode bypass is the superuser analog, not a modeled privilege-escalation path.",
        ],
      },
    ],
  },
  {
    id: "syscalls-security/access-control",
    moduleId: "syscalls-security",
    title: "Access Control & Least Privilege",
    minutes: 10,
    objectives: [
      "separate authentication from authorization and apply the Unix owner/group/other first-match rule",
      "convert between rwx strings and octal modes, including for directories",
      "apply least privilege to explain why root's bypass is dangerous and capabilities exist",
    ],
    sections: [
      {
        kind: "problem",
        body: [
          "Isolation (lesson 2) keeps processes apart; it says nothing about *who may do what to which object*. A multi-user machine needs answers to real questions, per file, per operation: may bob read alice's report? may the web server write the log directory? may anyone but root edit `/etc/passwd`? Asking the user each time is absurd — the decisions must be stored, systematic and mechanical.",
          "And once stored, one more principle must govern the *design* of authority itself. The tempting pattern — 'the admin can do everything, so run everything as admin' — turns every bug into a catastrophe, because every component holds total power whether it needs it or not. **Least privilege** is the correction: every subject gets exactly the authority its job requires, no more. This lesson builds Unix's stored answers (permission triads, groups, the root bypass) and then uses least privilege to judge them.",
        ],
      },
      {
        kind: "intuition",
        body: [
          "A **conference badge system**. At the door, *authentication*: your photo ID proves you are Dana. Inside, *authorization*: the badge's printed tiers decide everything else — DANA (owner tier), TEAM-BLUE (group tier), EVERYONE (other tier) — and every door in the building carries a sign listing what each tier may do there. One badge, checked per door, signs pre-stored — nobody re-argues your identity at the copy room.",
          "Two design details make the system *decidable*. First, **first match**: if you're Dana, only the DANA line of each sign applies — the TEAM-BLUE line never rescues you, and a stricter DANA line wins even if EVERYONE is looser. No ambiguity, no negotiations. Second, the **master badge** (root) opens everything — convenient and terrifying, exactly as in the lab's kernel-mode toggle. Least privilege asks: does the copy-room restocker *need* the master badge, or just the copy-room line?",
        ],
      },
      {
        kind: "visual",
        simId: "protection-lab",
        body: [
          "The lab's three files carry textbook modes: `/home/alice/report.txt` — alice:staff, `rw-r-----`; `/usr/bin/tool` — root:staff, `rwxr-xr-x`; `/etc/config` — root:wheel, `rw-r-----`. Users alice and bob (group staff) and root (group wheel) are one click away.",
          "Work the first-match rule by hand, then verify: alice reads `report.txt` (owner triad `rw-` → allowed); **bob writes `report.txt`** (he's not the owner; group triad `r--` has no w → denied — even though 'everyone' would… no wait, other is `---` too; make bob's case interesting by chmod'ing the file to `rw-r---w-` and watching bob *gain* write from the OTHER triad? No — bob is in staff, so group applies and other is never consulted. Watch the denial persist. That persistence is first-match, working.)",
          "Then switch to kernel mode and repeat a denied operation: allowed, checks bypassed. That is root without the paperwork — and lesson 4's whole argument is about making that power rarer.",
        ],
      },
      {
        kind: "experiment",
        simId: "protection-lab",
        prompts: [
          "As alice, attempt read and write on `report.txt` (owner triad `rw-`): both allowed. Now `chmod /home/alice/report.txt` to `r--r-----` and retry the write: denied — *the owner's own triad* now refuses. First-match means owners can lock themselves out; there is no fallback to group or other bits.",
          "As bob (group staff, not owner), attempt read on `report.txt` (`rw-r-----`): allowed via the group triad. Attempt write: denied. `chmod` the file to `rw----rwx` (other = rwx) and retry as bob: STILL denied — bob matches the group triad, so the generous other bits are invisible to him. Explain why this 'no second look' rule makes the system predictable.",
          "As alice, attempt execute on `/usr/bin/tool` (`rwxr-xr-x`, owner root): alice matches OTHER → `r-x` → allowed. Attempt write: denied. Now attempt anything on `/etc/config` (root:wheel, `rw-r-----`): alice is neither owner nor in wheel → other `---` → everything denied.",
          "Switch to kernel mode and attempt write on `/etc/config`: allowed — the superuser bypass. Then answer in one sentence: which single design change would let alice back up `/etc/config` *without* giving her the master key? (A group with just the needed bits, or — lesson 4 — a capability scoped to that one file.)",
        ],
        body: [
          "Lab conventions: triads are checked owner → group → other, first match only; group membership is a plain list (staff: alice, bob; wheel: root); kernel mode bypasses all file and memory checks — root's power, honestly modeled as total.",
        ],
      },
      {
        kind: "technical",
        body: [
          "**Authentication** precedes authorization: proving *who* the subject is — a login and password, a key, a session cookie; in the kernel, a **user ID (uid)** attached to every process at login (man7's credentials). **Authorization** then answers *what that subject may do to which object*, and Unix's answer is stored in each inode (module 9): nine permission bits in three **triads** — **owner** (the file's uid), **group** (one group per file, checked against the subject's memberships), **other** (everyone else) — each triad holding `r`, `w`, `x`. The kernel's rule is strictly **first match**: owner triad if uid matches, else group triad if the subject belongs to the file's group, else other triad — *and the search stops there*. Group bits cannot override owner bits; other bits cannot rescue a group member.",
          "Modes are written in octal: each triad is 4 (r) + 2 (w) + 1 (x), so `rw-r-x---` = 750, `rwxr-xr-x` = 755. On **directories** the bits mean: `r` = list entries, `w` = create/delete entries *in* it, `x` = traverse through it to reach paths beyond. Unix adds three special bits beyond this lesson's scope — setuid/setgid (run with the file's owner's authority: a deliberate, dangerous least-privilege exception) and the sticky bit — and the general tool, an **access-control list (ACL)**, extends 'owner/group/other' to per-user and per-group entries attached to the object; Windows ACLs are the mainstream example. The triad system is the special case: coarse, fast, stored in 9 bits.",
          "The **root bypass**: uid 0 (the superuser) is checked *before* the triads — the kernel simply grants uid-0 processes nearly everything (modern Linux decomposes this into **capabilities**: CAP_DAC_OVERRIDE for permission bits, CAP_NET_ADMIN for networking, …, so authority can be granted *per power* instead of per god-mode). Least privilege judges the design: running every daemon as root means every daemon bug is a root bug; running each component with only its needed capabilities (or as its own unprivileged user) contains the blast radius. The same principle at the application scale is **privilege separation**: one program, several processes, each holding only the authority its stage needs, talking over narrow channels.",
        ],
        equations: [
          {
            expr: "allowed(subject, op, obj) = triad(obj)[match(subject, obj)][op]",
            symbols: [
              { sym: "match(subject, obj)", meaning: "owner if uid equal, else group if member, else other — first match only" },
              { sym: "triad", meaning: "the 9 permission bits from the inode (module 9)" },
            ],
            note: "First match is load-bearing: the lookup never consults a second triad, which is why 'group can't rescue owner' and the lab's persistent denials both hold.",
          },
          {
            expr: "mode (octal) = 64·owner_digit + 8·group_digit + other_digit,   digit = 4r + 2w + 1x",
            symbols: [
              { sym: "owner_digit", meaning: "the owner triad's value, 0–7" },
            ],
            note: "755 = rwxr-xr-x; 750 = rwxr-x---; 644 = rw-r--r--. Three digits, three triads, one glance — the lab's chmod strings in arithmetic form.",
          },
        ],
      },
      {
        kind: "worked-example",
        steps: [
          {
            title: "Deciding four accesses, mechanically",
            body: [
              "`report.txt` = alice:staff, `rw-r-----`. (1) alice writes: uid match → owner triad `rw-` → w set → **allowed**. (2) bob writes: not owner; in staff → group triad `r--` → w clear → **denied** (other never consulted). (3) root writes: uid 0 — the bypass precedes triads → **allowed** without reading the bits.",
              "`/usr/bin/tool` = root:staff, `rwxr-xr-x`. (4) alice executes: not owner, in staff → group triad `r-x` → x set → **allowed**. Every answer came from one lookup rule and nine bits — no conversation, no context. Predictability *is* the feature.",
            ],
          },
          {
            title: "Least privilege, applied twice",
            body: [
              "A backup service must read every user's files, including `/etc/config` (`rw-r-----`, root:wheel). Design 1: run it as root — it can also delete every file, because root's bypass is total; one path-traversal bug in the backup code is a whole-machine event. Design 2: run it as its own user in a group granted read on the needed trees — one triad edit per tree, and the service *cannot* delete what it cannot write.",
              "Design 2 is least privilege in nine-bit arithmetic: authority = a set of triads, each scoped to one tree, instead of one global bypass. Modern Linux goes further with capabilities and with userspaces like systemd hardening — but the *shape* of the decision is exactly the one you just made, and the lab's kernel-mode toggle is precisely the power design 1 handed to a bug.",
            ],
          },
        ],
      },
      {
        kind: "misconceptions",
        items: [
          {
            wrong: "If your group's triad says no, but 'other' says yes, you still get access.",
            right: "First match stops the search: a group member is judged solely by the group triad. That is why `rw-r---w-` gives a random outsider write while a group member stays read-only — unpredictable only if you expected OR; the kernel never ORs triads.",
          },
          {
            wrong: "root bypasses permissions because a special root bit is set on each file.",
            right: "Nothing on the file enables root; the kernel grants uid-0 processes the overriding *power* (CAP_DAC_OVERRIDE in capability terms). The bypass lives in the subject, not the object — which is why least-privilege design tries to stop handing that subject around.",
          },
        ],
      },
      {
        kind: "knowledge-check",
        questions: [
          {
            id: "kc-m11-ac-1",
            q: "`report.txt` is alice:staff, mode `rw-r-----`. bob is in staff. What may bob do, and under which triad?",
            options: [
              "Read only — he matches the group triad `r--`; other bits are never consulted for him",
              "Read and write — the owner's rw applies to group members too",
              "Nothing — non-owners always fall to 'other' (`---`)",
              "Read, plus whatever 'other' grants",
            ],
            answerIndex: 0,
            explanation:
              "First match: not owner, but in the file's group → group triad `r--` → read only. The 'other' triad is invisible to group members, which is what makes the rule decidable.",
          },
          {
            id: "kc-m11-ac-2",
            q: "Which octal mode grants the owner full access, the group read-and-execute, and others nothing?",
            options: [
              "750 — rwx (7), r-x (5), --- (0)",
              "755 — that also gives others r-x",
              "740 — the group digit 4 means read-only",
              "710 — execute without read is unusual and not 'r-x'",
            ],
            answerIndex: 0,
            explanation:
              "owner rwx = 4+2+1 = 7; group r-x = 4+1 = 5; other --- = 0 → 750. Fluency in this mapping is the difference between designing permissions and guessing at them.",
          },
        ],
      },
      {
        kind: "references",
        items: [
          {
            label: "man7: credentials(7) — process identities",
            url: "https://man7.org/linux/man-pages/man7/credentials.7.html",
            note: "uid, gid and supplementary groups — the subjects this lesson's rules match",
          },
          {
            label: "man7: capabilities(7) — Linux capabilities",
            url: "https://man7.org/linux/man-pages/man7/capabilities.7.html",
            note: "root's monolithic bypass decomposed into grantable pieces — least privilege, industrialized",
          },
          {
            label: "OSTEP (Reiher), Chapter 55: Access Control",
            url: "https://pages.cs.wisc.edu/~remzi/OSTEP/security-access.pdf",
            note: "access-control matrices, ACLs and capabilities — the general theory behind the triads",
          },
        ],
      },
      {
        kind: "note",
        body: [
          "Lab simplifications: the lab checks exactly owner → group → other over plain membership lists — no supplementary groups, no setuid/sticky bits, no ACLs, no per-operation capability granularity. Kernel mode is the root bypass with no finer setting; the chmod tool edits triads without octal. The concept graph from triads to capabilities (and to lesson 4's defenses) is the part you carry out of the lab.",
        ],
      },
    ],
  },
  {
    id: "syscalls-security/attacks-defenses",
    moduleId: "syscalls-security",
    title: "Attack Surfaces & Defenses",
    minutes: 10,
    objectives: [
      "define the attack surface of a program and name what grows and shrinks it",
      "classify defenses as surface reduction, least privilege, isolation or defense in depth",
      "explain, defensively, why argument validation is the first wall behind the syscall doorway",
    ],
    sections: [
      {
        kind: "problem",
        body: [
          "Everything this module built — the syscall doorway, hardware isolation, permission triads — exists because some code, somewhere, will misbehave on purpose. This lesson looks at the machine the way a defender must: not 'how do attacks work?' (this course teaches no attack recipes) but *where is the machine exposed, and what makes each wall earn its place?* Two facts organize everything. First: every kernel service reachable by user code is an entry point, and entry points are where hostile input meets privileged code. Second: every wall built so far has failed someone, somewhere — so mature systems do not rely on any single one.",
          "The defensive vocabulary is short and worth memorizing: **attack surface** (the set of ways in), **least privilege** (small authority per component), **isolation** (walls that contain failure), **defense in depth** (independent layers, so one failure is not fatal). Notice these are exactly the last three lessons re-scored as security policy — this lesson's job is to make the connection explicit and honest about limits.",
        ],
      },
      {
        kind: "intuition",
        body: [
          "A **castle**. The moat is isolation (module 2's rings, lesson 2's mode bit); the gate is the syscall interface (lesson 1) — narrow, numbered, one form at a time. Behind the gate, every cart is **inspected** (lesson 1's argument validation) because the gate lets strangers' carts through *by design*. Inside, the treasury is not guarded by the same guard as the kitchen, and neither holds the king's seal (**least privilege**, lesson 3). And because a guard can be bribed, a gate can be rushed and an inspection missed, the castle has *inner walls* too — **defense in depth**: no single failure is fatal, and each layer assumes the previous one leaks.",
          "The castle's exposure — the number of gates, the width of the moat, how many carts enter daily — is its **attack surface**. Castles didn't get safer by building taller walls around *more* gates; they got safer by having fewer, narrower, better-inspected gates.",
        ],
      },
      {
        kind: "visual",
        simId: "protection-lab",
        body: [
          "Use the Protection Lab to *feel* the defender's two dials. Dial one — **surface**: every operation the lab lets you attempt (file read/write/execute, memory access) is an entry point into its little kernel; imagine the log is an attack-surface inventory, and each operation you remove (say, no file writes at all) is surface deleted before any wall is tested.",
          "Dial two — **authority**: switch to kernel mode and every check bypasses — one toggle, total power. Now trace what lesson 3's least privilege would change: if 'kernel mode' were decomposed into smaller grants (capabilities), the toggle becomes a set of switches, and the question 'which switches does this task actually need?' has a small answer. The lab cannot model an attack — and should not — but it models exactly the two quantities every defense below trades against.",
        ],
      },
      {
        kind: "technical",
        body: [
          "A program's **attack surface** is the set of ways untrusted input can reach its logic: for the kernel, the syscall interface (~400 services, each taking pointers and counts — lesson 1's glass); for a server, its parsers and protocol handlers; for any process, every file, socket and environment value it consumes. Surface *grows* with each exposed service, each accepted format, each default-on feature; it *shrinks* with disabled services, strict parsers, and least-privilege defaults. Surface reduction is the cheapest security because unexposed code cannot be attacked at all — no wall needed where there is no gate.",
          "**Why validation is the first wall**: the doorway (lesson 1) deliberately lets hostile data *into* privileged code — that is its job. So the kernel's first act on the far side is to reject malformed forms: bad pointers (→ EFAULT), bad descriptors (→ EBADF), bad counts, bad flags. Miss one check and the door you built for service becomes a door for the attacker: a missing bounds check on a *buffer* lets input overwrite adjacent memory (the classic buffer-overflow class), and a hijacked return address can turn 'user data' into 'kernel execution' — privilege escalation. The defensive stack against that class is layered: bounds-checked code and memory-safe languages (prevention), stack canaries and address-space layout randomization (detection/hardening — making the layout unpredictable), and the hardware walls of lesson 2 (containment). Each assumes the previous one failed.",
          "**Sandboxing** is least privilege made concrete for running untrusted or fragile code: execute it inside a restricted authority subset — its own namespace view of the filesystem (containers, module 12), a syscall filter that rejects everything beyond an allowlist (Linux `seccomp`, the browser sandbox), a separate user, a capability set. The sandbox answer to 'what if this code is hostile?' is not 'trust the walls' but 'the walls are all it can even *name*'. Together with **privilege separation** (lesson 3's design 2) and defense in depth, this is the modern posture: assume breach, shrink authority, layer independent walls — never 'one strong wall is enough'.",
        ],
        equations: [
          {
            expr: "Attack surface = Σ reachable entry points × input complexity",
            symbols: [
              { sym: "entry point", meaning: "a path by which untrusted input reaches privileged logic (syscalls, parsers, ports)" },
            ],
            note: "Not a number to compute — a checklist to shrink: every removed service, disabled format and default-deny filter deletes terms from the sum.",
          },
          {
            expr: "Authority(subject) ⊆ Authority(needed by its task)      Sandbox(S) ⊆ Authority(caller)",
            symbols: [
              { sym: "Authority", meaning: "the set of operations the subject may perform" },
            ],
            note: "Least privilege as set containment, twice: components hold only what they need; sandboxes hold only what they were handed. The lab's kernel-mode toggle is the anti-pattern: Authority = everything.",
          },
        ],
      },
      {
        kind: "worked-example",
        steps: [
          {
            title: "Anatomy of one defended syscall",
            body: [
              "`open(path, flags)` arrives at the kernel. Wall 1 — *the doorway itself*: only syscall numbers index the dispatch table; arbitrary kernel addresses are uncallable (lesson 1). Wall 2 — *validation*: path pointer in caller's space? flags sane? (→ EFAULT/EINVAL otherwise). Wall 3 — *resolution and permission*: path walk (module 9), then triad check (lesson 3) — the file may simply refuse.",
              "Wall 4 — *containment*: even a kernel bug past all three hits hardware isolation — the process's page table cannot name kernel memory, and a fault kills the process, not the machine (lesson 2). Wall 5 — *reduction*: does this machine need to expose this service at all? (seccomp profiles on servers reject `open` for write to entire process classes). Five independent layers, each with a distinct failure mode — and the lesson's point is not that five is enough, but that *one* never was.",
            ],
          },
          {
            title: "Reading a defense announcement, defensively",
            body: [
              "A browser ships 'the sandbox'. Ask the four defender questions. *Surface*: which syscalls and IPC channels does the sandboxed renderer still reach? (A short allowlist — seccomp.) *Authority*: can it read files? touch the network? (No: it asks a broker process — privilege separation.) *Isolation*: if it crashes or is compromised, what is in scope? (Its own tab's data, hopefully — namespaces, module 12.) *Depth*: which layer catches it if the sandbox has a bug? (Site isolation: *another* process boundary.)",
              "Notice every answer is a concept you already own from this module — nothing here required an attack technique, only the discipline of asking 'what can this component *name*, and what happens if each wall fails?'. That discipline, not vocabulary about exploits, is the transferable skill.",
            ],
          },
        ],
      },
      {
        kind: "misconceptions",
        items: [
          {
            wrong: "Only network-facing servers have an attack surface.",
            right: "Every process that consumes untrusted input has one — a document viewer parsing a downloaded file, a kernel syscall interface, a setuid utility. 'Local only' shrinks surface; it does not erase it, and multi-user machines make local hostile.",
          },
          {
            wrong: "One strong defense — say, ASLR or the mode bit — makes a system secure.",
            right: "Every known defense has been defeated in some setting; security comes from *independent* layers (defense in depth) whose failures don't correlate. A single wall is a single point of failure wearing armor.",
          },
        ],
      },
      {
        kind: "knowledge-check",
        questions: [
          {
            id: "kc-m11-ad-1",
            q: "Which change most directly *reduces* a server's attack surface?",
            options: [
              "Disabling the file-transfer service it never uses",
              "Adding a second firewall rule to the same service",
              "Switching the log format to include more detail",
              "Running the service with more memory",
            ],
            answerIndex: 0,
            explanation:
              "Surface is the set of reachable entry points: an unused service removed is a gate deleted — unexposed code cannot be attacked. The other options change capacity, telemetry or hardening of gates that remain open.",
          },
          {
            id: "kc-m11-ad-2",
            q: "A browser runs each tab in a separate process with a syscall allowlist and no file access, while a broker handles file requests. Which two principles is that design applying?",
            options: [
              "Isolation (separate processes) and least privilege (minimal authority per component)",
              "Authentication and authorization",
              "Defense in depth and write-back caching",
              "Spooling and memory-mapped I/O",
            ],
            answerIndex: 0,
            explanation:
              "Process-per-tab is isolation (a wall around each tab's failure); the allowlist-and-broker structure is least privilege — the renderer simply cannot name the operations it was never granted. Defense in depth is the meta-principle stacking them.",
          },
        ],
      },
      {
        kind: "references",
        items: [
          {
            label: "OSTEP (Reiher), Chapter 53: Intro Security",
            url: "https://pages.cs.wisc.edu/~remzi/OSTEP/security-intro.pdf",
            note: "threats, policies and mechanisms — the defensive framing this lesson applies",
          },
          {
            label: "man7: capabilities(7) — Linux capabilities",
            url: "https://man7.org/linux/man-pages/man7/capabilities.7.html",
            note: "the mechanism that turns 'root or nothing' into grantable, revocable authority",
          },
          {
            label: "Linux kernel docs: Security",
            url: "https://docs.kernel.org/security/index.html",
            note: "where the kernel's defense layers (LSMs, seccomp-adjacent machinery) are documented",
          },
        ],
      },
      {
        kind: "note",
        body: [
          "Lab simplifications: the Protection Lab models no exploits, no escalation paths and no sandbox — its kernel-mode toggle shows the *end state* of over-privileged authority, and its file/memory checks show the walls such authority would bypass. Attack techniques are deliberately absent from this course; the transferable content is the defender's vocabulary — surface, least privilege, isolation, depth — which the lab exercises through its two dials.",
        ],
      },
    ],
  },
];
