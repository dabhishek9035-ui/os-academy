import type { GlossaryEntry } from "@/types";

/**
 * Glossary — module 11 (System Calls, Protection & Security).
 * The System Call Lab walks the 7-stage pipeline (user-code → trap →
 * mode-switch → dispatch → kernel-exec → return → resume) over
 * read/write/open/close; the Protection Lab models owner/group/other rwx
 * triads, base/limit memory regions with simulated segfaults, and a
 * kernel-mode toggle as the superuser analog.
 */
export const entries: GlossaryEntry[] = [
  {
    id: "system-call-table",
    term: "System-call table",
    simple: "The kernel's array mapping syscall numbers to handler functions — the spine of the doorway.",
    technical:
      "An array indexed by syscall number whose entries are kernel handler functions; dispatch looks the number up and calls the handler with validated arguments. User code can only INDEX the table — it can never jump to arbitrary kernel addresses.",
    example:
      "The lab's table has four entries — read=0, write=1, open=2, close=3; Linux's has roughly 400. Issue open and the walk lands on table[2].",
    related: ["system-call", "trap", "trap-handler"],
    moduleId: "syscalls-security",
    lessonRef: "syscalls-security/system-calls",
    simId: "syscall-lab",
    refUrl: "https://man7.org/linux/man-pages/man2/syscalls.2.html",
    refLabel: "man7: syscalls(2)",
  },
  {
    id: "trap-handler",
    term: "Trap handler",
    simple: "The kernel's single entry point where every trap — syscall, fault or interrupt — lands first.",
    technical:
      "The architecture-specific kernel entry code invoked by the hardware on a trap: it saves the caller's state, switches stacks if needed, and routes by cause — syscall number to the system-call table, exceptions to fault handlers, IRQs to device handlers.",
    example:
      "One instruction (syscall/ecall) in; the trap handler decides whether it was an open() request, a page fault, or a disk interrupt — three doors, one frame.",
    related: ["trap", "system-call-table", "interrupt-handler", "system-call"],
    moduleId: "syscalls-security",
    lessonRef: "syscalls-security/system-calls",
    simId: "syscall-lab",
    refUrl: "https://pages.cs.wisc.edu/~remzi/OSTEP/cpu-mechanisms.pdf",
    refLabel: "OSTEP ch. 6: Direct Execution",
  },
  {
    id: "protection-ring",
    term: "Protection ring",
    simple: "Hardware privilege levels for code; modern operating systems use ring 0 (kernel) and ring 3 (user).",
    technical:
      "x86 formalizes privilege as rings 0–3 with a current privilege level; ring 0 executes privileged instructions, ring 3 faults on them. Rings 1–2 saw little use; hypervisors add an effective level beneath ring 0 for guest kernels.",
    example:
      "Application code (ring 3) executing a page-table load faults and traps; kernel code (ring 0) executes it freely — the mode bit of lesson 2, wearing its x86 name.",
    related: ["user-mode", "kernel", "address-space-isolation"],
    moduleId: "syscalls-security",
    lessonRef: "syscalls-security/protection-isolation",
    refUrl: "https://pages.cs.wisc.edu/~remzi/OSTEP/cpu-mechanisms.pdf",
    refLabel: "OSTEP ch. 6: Direct Execution",
  },
  {
    id: "privilege-escalation",
    term: "Privilege escalation",
    simple: "Turning a bug into more authority than the subject was ever granted — the thing every defense here exists to prevent.",
    technical:
      "Vertical escalation (user → kernel) typically follows memory-safety failures past the syscall doorway's validation; horizontal escalation (user A → user B) follows permission and isolation flaws. Defenses are the whole stack: argument validation, hardware isolation, least privilege, sandboxing — taught defensively, without attack recipes.",
    example:
      "A missing bounds check on a syscall buffer lets input overwrite adjacent kernel memory: this is why dispatch validates every pointer and why EFAULT exists.",
    related: ["least-privilege", "defense-in-depth", "address-space-isolation", "system-call"],
    moduleId: "syscalls-security",
    lessonRef: "syscalls-security/attacks-defenses",
  },
  {
    id: "least-privilege",
    term: "Least privilege",
    simple: "Give every component exactly the authority its task needs — and nothing more.",
    technical:
      "Authority(subject) ⊆ Authority(needed): each component holds the minimal grant that lets it work, so its failures stay bounded. Industrialized by decomposing root into capabilities and by privilege separation (one program, several minimally-authorized processes).",
    example:
      "A backup service with read-only grants on the needed trees does the same job as a root-run one — but its bug can at worst read what was granted, not delete the machine.",
    related: ["privilege-escalation", "sandboxing", "authorization", "access-control-list"],
    moduleId: "syscalls-security",
    lessonRef: "syscalls-security/access-control",
    refUrl: "https://man7.org/linux/man-pages/man7/capabilities.7.html",
    refLabel: "man7: capabilities(7)",
  },
  {
    id: "sandboxing",
    term: "Sandboxing",
    simple: "Run code inside a restricted authority subset — an allowlisted syscall set, its own filesystem view, its own user — so its failures stay contained.",
    technical:
      "Concrete mechanisms for Authority(sandbox) ⊆ Authority(caller): syscall filters (seccomp), namespaces and containers, separate uids, capability sets. The answer to 'what if this code is hostile?' is structural: beyond the walls, it cannot even name the operations.",
    example:
      "A browser tab: its own process, a short syscall allowlist, no direct file access — file requests go through a broker that grants only what the tab legitimately needs.",
    related: ["least-privilege", "privilege-escalation", "defense-in-depth"],
    moduleId: "syscalls-security",
    lessonRef: "syscalls-security/attacks-defenses",
    refUrl: "https://docs.kernel.org/security/index.html",
    refLabel: "Linux kernel docs: Security",
  },
  {
    id: "authentication",
    term: "Authentication",
    simple: "Proving who a subject is — the step that must precede every decision about what it may do.",
    technical:
      "Establishing identity from credentials (password, key, token) and attaching them to the subject as kernel credentials (uid, gid, groups); performed once at login, consulted implicitly by every later authorization check.",
    example:
      "alice authenticates at login and becomes uid 1000; from then on, every ALLOWED/DENIED the Protection Lab shows is authorization working from that identity.",
    related: ["authorization", "access-control-list", "kernel"],
    moduleId: "syscalls-security",
    lessonRef: "syscalls-security/access-control",
    refUrl: "https://man7.org/linux/man-pages/man7/credentials.7.html",
    refLabel: "man7: credentials(7)",
  },
  {
    id: "authorization",
    term: "Authorization",
    simple: "Deciding what an authenticated subject may do to which object — mechanically, per access.",
    technical:
      "The policy evaluation: Unix first-match triads (owner → group → other), ACLs, or capability checks, applied on every access to every object. Stored in the object's metadata (module 9's inode bits) so no per-access conversation is needed.",
    example:
      "bob reads report.txt (group triad r--) and cannot write it — one lookup, one triad, decided in microseconds the same way every time.",
    related: ["authentication", "access-control-list", "least-privilege"],
    moduleId: "syscalls-security",
    lessonRef: "syscalls-security/access-control",
    simId: "protection-lab",
  },
  {
    id: "access-control-list",
    term: "Access-control list",
    simple: "A per-object list of exactly who may do what — the general form of Unix's three-triad shortcut.",
    technical:
      "Entries attached to the object granting operations to named users and groups (Windows ACLs are the mainstream example; POSIX ACLs extend the triad model). Trades the triads' 9-bit economy for expressive, per-object policy.",
    example:
      "Granting bob write on one file without touching group bits: an ACL entry ('bob': write) on that object — impossible with triads alone.",
    related: ["authorization", "inode", "least-privilege"],
    moduleId: "syscalls-security",
    lessonRef: "syscalls-security/access-control",
    refUrl: "https://pages.cs.wisc.edu/~remzi/OSTEP/security-access.pdf",
    refLabel: "OSTEP (Reiher) ch. 55: Access Control",
  },
  {
    id: "defense-in-depth",
    term: "Defense in depth",
    simple: "Layer independent defenses so that one failure is never fatal — no single wall is trusted.",
    technical:
      "The posture of stacking mechanisms with distinct, uncorrelated failure modes: argument validation behind the syscall doorway, hardware isolation beneath it, least-privilege authority, sandboxing around untrusted code. Each layer assumes the previous one leaks.",
    example:
      "One open() call meets five walls: the numbered doorway, pointer validation, permission triads, hardware address-space isolation — and the service may simply not need to be exposed at all.",
    related: ["least-privilege", "sandboxing", "address-space-isolation", "privilege-escalation"],
    moduleId: "syscalls-security",
    lessonRef: "syscalls-security/attacks-defenses",
    refUrl: "https://pages.cs.wisc.edu/~remzi/OSTEP/security-intro.pdf",
    refLabel: "OSTEP (Reiher) ch. 53: Intro Security",
  },
  {
    id: "address-space-isolation",
    term: "Address-space isolation",
    simple: "Each process can only name its own memory — enforced by hardware on every single access.",
    technical:
      "Horizontal isolation via base/limit checks (base ≤ addr < base + limit) or per-process page tables: another process's memory is not merely forbidden but unnameable. Violations fault before the access completes; the kernel terminates the offender.",
    example:
      "In the Protection Lab, pid 7 touching address 220 — valid memory, but of pid 8 — takes a simulated segmentation fault: 'valid somewhere' is not 'valid for me'.",
    related: ["base-limit", "page-table", "segmentation-fault", "user-mode"],
    moduleId: "syscalls-security",
    lessonRef: "syscalls-security/protection-isolation",
    simId: "protection-lab",
    refUrl: "https://pages.cs.wisc.edu/~remzi/OSTEP/vm-mechanism.pdf",
    refLabel: "OSTEP ch. 15: Address Translation",
  },
  {
    id: "setuid",
    term: "setuid",
    simple: "A file bit that lets a program run with the file owner's authority — a deliberate, dangerous exception to normal permission rules.",
    technical:
      "The set-user-ID bit on an executable: when run, the process's effective uid becomes the file owner's (often root) for the duration — granting narrowly scoped powers a normal user lacks. A classic escalation target when the program is buggy; modern design prefers fine-grained capabilities.",
    example:
      "passwd runs setuid root so it can edit /etc/shadow — the one power it needs, and the textbook argument for why such grants must be tiny and audited.",
    related: ["least-privilege", "privilege-escalation", "authorization"],
    moduleId: "syscalls-security",
    lessonRef: "syscalls-security/access-control",
  },
];
