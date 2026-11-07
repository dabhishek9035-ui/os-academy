import type { GlossaryEntry } from "@/types";

/**
 * Glossary — module 12 (Virtualization & Modern OS Concepts).
 * Lab anchors: the Virtualization Lab's two layer stacks (VM = 6 layers with
 * Guest OS + Virtual Hardware + Hypervisor; container = 5 layers sharing the
 * host kernel) with vCPU overcommit logged above 100% combined demand; the
 * Multiprocessor Lab's LPT placement on identical CPUs and its EDF real-time
 * panel (utilization = Σ wcet/period, misses when > 1).
 */
export const entries: GlossaryEntry[] = [
  {
    id: "hypervisor",
    term: "Hypervisor",
    simple: "The referee beneath operating systems: it gives each guest OS a faithful private machine and mediates every reach toward real hardware.",
    technical:
      "Software (or firmware+software) that multiplexes physical machines into virtual ones, satisfying Popek & Goldberg's three requirements: equivalence (guests behave as on real hardware), resource control (guests touch physical resources only through the hypervisor), and efficiency (most guest instructions run directly on the CPU). Type 1 runs on bare metal; type 2 runs on a host OS.",
    example:
      "The Virtualization Lab's VM stack places 'Hypervisor (VMM)' between 'Virtual Hardware' and 'Host OS (kernel)' — the layer that makes the guest's machine a well-kept fiction.",
    related: ["vmm", "guest-os", "virtual-cpu", "virtualization-os"],
    moduleId: "virtualization",
    lessonRef: "virtualization/virtual-machines",
    simId: "virtualization-lab",
    refUrl: "https://docs.kernel.org/virt/kvm/index.html",
    refLabel: "Linux kernel docs: KVM",
  },
  {
    id: "vmm",
    term: "VMM",
    fullForm: "Virtual Machine Monitor",
    simple: "The hypervisor's formal name — the monitor that watches every guest and answers privileged reaches itself.",
    technical:
      "Synonym for hypervisor, from the Popek & Goldberg literature: the monitor that traps sensitive guest operations, emulates them against virtual hardware, and resumes the guest — preserving equivalence, resource control and efficiency.",
    example:
      "When a guest kernel loads a page-table base register, the VMM receives the VM exit, updates the shadow/extended tables, and re-enters the guest — which never noticed.",
    related: ["hypervisor", "trap-and-emulate", "kernel"],
    moduleId: "virtualization",
    lessonRef: "virtualization/virtual-machines",
    refUrl: "https://www.qemu.org/docs/master/",
    refLabel: "QEMU documentation",
  },
  {
    id: "guest-os",
    term: "Guest OS",
    simple: "A complete operating system running inside a virtual machine, believing it owns hardware that is actually emulated.",
    technical:
      "The OS executing in guest mode: its 'kernel mode' is deprivileged by the CPU, so its privileged operations VM-exit to the hypervisor. With hardware assist it runs unmodified and unaware; its syscalls from user code trap to IT, not to the hypervisor (the efficiency win).",
    example:
      "The lab's VM stack shows 'Guest OS (kernel)' as the layer the guest app talks to — the second kernel on the machine, the one containers refuse to pay for.",
    related: ["hypervisor", "kernel", "system-call", "virtual-cpu"],
    moduleId: "virtualization",
    lessonRef: "virtualization/virtual-machines",
    simId: "virtualization-lab",
    refUrl: "https://pages.cs.wisc.edu/~remzi/OSTEP/cpu-mechanisms.pdf",
    refLabel: "OSTEP ch. 6: Limited Direct Execution",
  },
  {
    id: "virtual-cpu",
    term: "vCPU",
    fullForm: "Virtual CPU",
    simple: "A CPU a guest believes it owns; in reality a share of physical core time, scheduled by the hypervisor.",
    technical:
      "A schedulable entity the hypervisor places onto physical cores, exactly as an OS schedules processes onto a CPU — one level down. Overcommitting vCPUs (more combined demand than physical capacity) is safe via time-slicing and costs latency: effective per-guest speed ≈ capacity ÷ demand.",
    example:
      "The lab's two sliders are vCPUs: drag both to 80% and demand reads 160/100 — OVERCOMMIT, time-slicing, slower guests.",
    related: ["hypervisor", "overcommit", "cpu-scheduling", "context-switch"],
    moduleId: "virtualization",
    lessonRef: "virtualization/virtual-machines",
    simId: "virtualization-lab",
  },
  {
    id: "trap-and-emulate",
    term: "Trap-and-emulate",
    simple: "The hypervisor's core loop: let the guest run at full speed, and when it reaches for something privileged, trap in, fake the result faithfully, and resume.",
    technical:
      "Requires sensitive instructions to trap under deprivilege (Popek & Goldberg). Classic x86 violated this for a few instructions (forcing binary translation); VT-x/AMD-V added a guest mode below ring 0 where sensitive operations VM-exit by construction — restoring the clean loop with unmodified guests.",
    example:
      "A guest writes to its (emulated) disk controller's command register → VM exit → the hypervisor turns it into a real request down the host's driver stack → VM entry with the guest none the wiser.",
    related: ["vmm", "trap", "protection-ring", "guest-os"],
    moduleId: "virtualization",
    lessonRef: "virtualization/virtual-machines",
    refUrl: "https://pages.cs.wisc.edu/~remzi/OSTEP/cpu-mechanisms.pdf",
    refLabel: "OSTEP ch. 6: Limited Direct Execution",
  },
  {
    id: "namespace",
    term: "Namespace",
    simple: "A private view of one kind of global resource — which processes, networks, or files even EXIST in your world.",
    technical:
      "Kernel mechanism (kinds: pid, net, mnt, uts, ipc, user, cgroup, time) giving processes private instances of global resources; created via clone(2) flags, unshare(2), setns(2). Visibility, not limits: resources outside your namespaces are not denied — they are unnameable, the page-table trick generalized from memory to everything.",
    example:
      "Inside a pid namespace the container's shell is pid 1 — not hidden by permission, simply absent from the numbering, like another process's page in module 6.",
    related: ["cgroup", "container-image", "process", "system-call"],
    moduleId: "virtualization",
    lessonRef: "virtualization/containers",
    simId: "virtualization-lab",
    refUrl: "https://man7.org/linux/man-pages/man7/namespaces.7.html",
    refLabel: "man7: namespaces(7)",
  },
  {
    id: "cgroup",
    term: "cgroup",
    fullForm: "control group",
    simple: "The meter: a kernel grouping that limits and accounts how much CPU, memory or I/O its processes may consume.",
    technical:
      "Hierarchical process groups with controllers (cgroup v2: cpu.max as quota/period, memory.max, io.max, pids.max) enforced by the kernel. Complementary to namespaces: namespaces decide what exists in your view; cgroups decide how much of the shared machine you may use.",
    example:
      "cpu.max = 200000/100000 caps a container at 2 cores no matter how many threads spin inside it — a hard cap, unlike the hypervisor's time-sliced sharing under overcommit.",
    related: ["namespace", "overcommit", "process"],
    moduleId: "virtualization",
    lessonRef: "virtualization/containers",
    refUrl: "https://man7.org/linux/man-pages/man7/cgroups.7.html",
    refLabel: "man7: cgroups(7)",
  },
  {
    id: "container-image",
    term: "Container image",
    simple: "The files a container runs from: a stack of read-only filesystem layers shared between containers, topped by one thin writable layer.",
    technical:
      "Content-addressed layer stack (base distribution + app layers) mounted union-style as the container's root filesystem, then pivot_root(2) into it. Shared base layers make N containers store the base once; there is no kernel and no boot inside — just files plus namespaces plus cgroups.",
    example:
      "Ten containers of the same base image on one host: one copy of the base layers on disk, ten thin writable tops — the density equation's container side.",
    related: ["namespace", "cgroup", "filesystem"],
    moduleId: "virtualization",
    lessonRef: "virtualization/containers",
    refUrl: "https://docs.docker.com/get-started/docker-overview/",
    refLabel: "Docker: What is Docker?",
  },
  {
    id: "overcommit",
    term: "Overcommit",
    simple: "Promising guests more of a resource than physically exists — safe because time-slicing spreads the shortage, at the cost of everyone slowing down.",
    technical:
      "Hypervisor policy of allocating more combined vCPU capacity than physical cores provide: overcommit ⟺ Σ vCPU demand > host capacity. The hypervisor time-slices (effective speed ≈ capacity ÷ demand); real hypervisors overcommit memory too, via ballooning and swap. The cgroup alternative caps per consumer instead of sharing shortage globally.",
    example:
      "The lab logs it in one line: demand 160/100% — OVERCOMMIT — the hypervisor TIME-SLICES the physical cores; each guest slows down.",
    related: ["virtual-cpu", "hypervisor", "swapping"],
    moduleId: "virtualization",
    lessonRef: "virtualization/virtual-machines",
    simId: "virtualization-lab",
  },
  {
    id: "numa",
    term: "NUMA",
    fullForm: "Non-Uniform Memory Access",
    simple: "Memory attached per socket: any core can reach all of RAM, but its own node's memory is faster — one address space, two latencies.",
    technical:
      "Multi-socket memory architecture where local (own-node) access beats remote (cross-socket interconnect) access: t_mem = f·t_local + (1−f)·t_remote. The OS fights the tax with first-touch page placement and node-local scheduling — cache affinity's bigger sibling — minimizing the remote fraction (1 − f).",
    example:
      "70% local at 100 ns, 30% remote at 300 ns → 160 ns average; mindlessly balancing the thread to the other node flips the mix and makes every access slower.",
    related: ["cache-affinity", "cpu-scheduling", "tlb"],
    moduleId: "virtualization",
    lessonRef: "virtualization/multicore-numa",
    refUrl: "https://docs.kernel.org/scheduler/index.html",
    refLabel: "Linux kernel docs: Scheduler",
  },
  {
    id: "cache-affinity",
    term: "Cache affinity",
    simple: "A thread runs fastest on the CPU where it recently ran — its data is still warm in that core's caches — so schedulers keep it there unless imbalance says otherwise.",
    technical:
      "Scheduling policy weighting placement toward a thread's previous CPU, because migration costs re-misses in L1/L2 and a TLB flush. Balancing and affinity trade directly: real balancers tolerate imbalance below a threshold and prefer the most-recently-used CPU when one frees up.",
    example:
      "A chef mid-recipe has the ingredients laid out at their station: moving them to a free station is only worth it if the other rail is badly piled.",
    related: ["numa", "context-switch", "locality"],
    moduleId: "virtualization",
    lessonRef: "virtualization/multicore-numa",
    simId: "multiproc-lab",
  },
  {
    id: "edf",
    term: "EDF",
    fullForm: "Earliest Deadline First",
    simple: "Always run the ready job whose deadline is nearest — the scheduler that turns utilization ≤ 1 into a guarantee.",
    technical:
      "Dynamic-priority real-time policy: at every point, dispatch the ready job with the earliest absolute deadline. For periodic independent preemptive tasks with deadline = period on one CPU, EDF meets every deadline if and only if U = Σ wcet/period ≤ 1 — a rare exact feasibility theorem. Linux ships it as SCHED_DEADLINE (with CBS bandwidth isolation).",
    example:
      "The Multiprocessor Lab's RT panel runs EDF over one hyperperiod: sensor(5,2)+control(7,3) gives U ≈ 0.83 — all deadlines met; push U past 1 and the log counts misses.",
    related: ["real-time-os", "cpu-scheduling", "priority-scheduling", "starvation"],
    moduleId: "virtualization",
    lessonRef: "virtualization/rt-embedded-mobile",
    simId: "multiproc-lab",
    refUrl: "https://docs.kernel.org/scheduler/sched-deadline.html",
    refLabel: "Linux kernel docs: SCHED_DEADLINE",
  },
  {
    id: "real-time-os",
    term: "Real-time OS",
    simple: "An OS whose scheduler sells guarantees instead of averages: deadlines are met (hard) or rarely missed in a measured way (soft).",
    technical:
      "An OS designed for bounded worst-case behavior: priority/deadline-driven scheduling (EDF, rate-monotonic), bounded interrupt latency, no swap, drivers with known worst-case costs. Real-time means predictable, not fast — an RTOS may trail a desktop on averages and still be correct.",
    example:
      "A brake controller on an RTOS: the sensor loop's 5 ms deadline is a contract proven by utilization arithmetic, not a hope enforced by good intentions.",
    related: ["edf", "embedded-os", "interrupt-latency"],
    moduleId: "virtualization",
    lessonRef: "virtualization/rt-embedded-mobile",
    refUrl: "https://docs.kernel.org/scheduler/sched-deadline.html",
    refLabel: "Linux kernel docs: SCHED_DEADLINE",
  },
  {
    id: "embedded-os",
    term: "Embedded OS",
    simple: "The OS shrunk to fit a microcontroller: kilobytes of RAM, flash storage, no swap, drivers fused at build time.",
    technical:
      "OS (RTOS or bare-metal runtime) for constrained devices: KB–MB RAM, flash without swap (too slow, wears cells), build-time-selected drivers, watchdog timers as the failure policy, often no MMU — so protection degrades to base/limit or discipline. FreeRTOS, Zephyr, QNX are the canonical RTOSes.",
    example:
      "A thermostat's firmware: no disk to swap to and no MMU to page with — RAM is a hard boundary, and the watchdog reboots the world if software hangs.",
    related: ["real-time-os", "firmware", "bootloader"],
    moduleId: "virtualization",
    lessonRef: "virtualization/rt-embedded-mobile",
    refUrl: "https://www.freertos.org/",
    refLabel: "FreeRTOS — the open-source RTOS",
  },
];
