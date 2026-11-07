import type { Lesson } from "@/types";

/**
 * Module 12 — Virtualization & Modern OS Concepts.
 * OS ideas at two extremes of scale: operating systems on operating systems
 * (hypervisors, trap-and-emulate, containers/namespaces/cgroups) and OS
 * variants for many cores and tight contracts (multicore scheduling, NUMA,
 * real-time, embedded, mobile).
 * Lab conventions in this course: the Virtualization Lab shows two static
 * layer stacks — VM = [Guest App, Guest OS (kernel), Virtual Hardware (vCPU,
 * vRAM, vDisk), Hypervisor (VMM), Host OS (kernel), Physical Hardware] and
 * container = [App processes, Isolated namespaces (pid, net, mnt), Container
 * Runtime, Host OS (kernel, shared), Physical Hardware] — plus two vCPU load
 * sliders with overcommit logged when combined demand exceeds host capacity
 * (100%). The Multiprocessor Lab places tasks by list scheduling in LPT order
 * (longest processing time first) on identical CPUs, and carries a separate
 * EDF real-time panel: periodic tasks (period, wcet), deadline == period,
 * utilization = Σ wcet/period, deadline misses when utilization exceeds 1.
 */
export const lessons: Lesson[] = [
  {
    id: "virtualization/virtual-machines",
    moduleId: "virtualization",
    title: "Virtual Machines & Hypervisors",
    minutes: 10,
    objectives: [
      "place every layer of the VM stack in order and say what each layer owns",
      "explain trap-and-emulate and how hardware assist (VT-x/AMD-V) makes it cheap",
      "predict when vCPU overcommit is logged and what the hypervisor does about it",
    ],
    sections: [
      {
        kind: "problem",
        body: [
          "You own one physical machine but keep needing *more machines*: a clean box to test an installer, a Windows box beside your Linux one, a disposable playground you can break without consequences. Buying hardware per workload is absurd. Could the OS help? Not really — modules 2–11 gave you processes with walls, but every process shares *one kernel*: you cannot run a different operating system at all, and a kernel bug is shared infrastructure for everyone. The demand is stranger than 'more processes' — it is *more operating systems*, each fully convinced it owns real hardware.",
          "The obstacle is module 11's own success story: an OS earns its authority by executing privileged instructions against hardware it believes is *its* — page-table loads, device registers, the mode bit itself. Put two OSes on one machine and both will reach for those instructions. Someone must referee *below* the operating system, at the level of the machine itself. That referee is the **hypervisor** — an operating system whose 'processes' are entire operating systems, and whose tricks are every trick of this course, one level down.",
        ],
      },
      {
        kind: "intuition",
        body: [
          "A **flight simulator** built for pilots of operating systems. The guest OS slides into the cockpit and grabs the controls expecting real wings: it loads a page-table register, programs a disk controller, sets the mode bit. The simulator (the hypervisor) intercepts *every* grab, keeps a truthful pretend-world — virtual CPUs, virtual memory, virtual disks — and answers exactly as the real machine would. The guest flies normally and, crucially, *cannot tell* that it never left the hangar. Two properties make this honest rather than a cartoon: the guest's behavior is identical to flight on real hardware (equivalence), and no control grab ever escapes the simulator (control).",
          "The interception loop — guest reaches for something privileged, the machine traps into the hypervisor, the hypervisor fakes the result, the guest resumes — is called **trap-and-emulate**. It is module 11's limited direct execution played one octave lower: there, user code ran at full speed and only *syscalls* trapped; here, the guest OS runs at full speed and only *privileged operations* trap. Most of what any guest does — every arithmetic instruction, every branch — needs no referee at all.",
        ],
      },
      {
        kind: "visual",
        simId: "virtualization-lab",
        body: [
          "The **Virtualization Lab** stacks the layers for you. In VM mode, read the tower from top to bottom: **Guest App**, **Guest OS (kernel)**, **Virtual Hardware (vCPU, vRAM, vDisk)**, **Hypervisor (VMM)**, **Host OS (kernel)**, **Physical Hardware** — *two kernels* on one machine, with a machine-faker sandwiched between them. The guest kernel believes layer 3 is silicon; layer 4 exists to make that belief true.",
          "Now the sliders: the lab's host has a capacity of 100%, and each vCPU has a load you can drag. Push both toward 80 and read the log: demand 160/100% — **OVERCOMMIT** — 'the hypervisor TIME-SLICES the physical cores; each guest slows down'. The hypervisor schedules vCPUs onto physical cores exactly the way module 3's scheduler scheduled processes onto a CPU. You are watching module 3 run one level down.",
        ],
      },
      {
        kind: "technical",
        body: [
          "A **hypervisor** (or **VMM** — virtual machine monitor) presents to each guest a **virtual machine**: a faithful, private copy of a computer. The classic requirements (Popek & Goldberg, 1974) are **equivalence** — software runs identically to how it would on real hardware, timing aside; **resource control** — the guest cannot touch physical resources without the hypervisor's mediation; and **efficiency** — the overwhelming majority of guest instructions execute directly on the real CPU, uninterpreted. A 'hypervisor' that interpreted every instruction would be correct and useless.",
          "**Type 1 vs. Type 2** is about where the referee sits. A **type 1 (bare-metal) hypervisor** runs directly on hardware — Xen, VMware ESXi, Hyper-V; Linux with **KVM** turns the kernel itself into a type-1 hypervisor (guests become a new kind of process the kernel schedules). A **type 2 (hosted) hypervisor** runs as an application on a host OS — VirtualBox, VMware Workstation, Parallels: the host owns the devices, and the hypervisor is scheduled like any program. The isolation contract is the same; the difference is who drives the hardware underneath.",
          "**Trap-and-emulate, and the x86 detour.** The guest OS believes it runs in kernel mode; the CPU ensures its 'kernel mode' is actually *deprivileged*. When the guest kernel executes a privileged operation — load the page-table base, touch a device register — the hardware traps to the hypervisor, which performs the effect against the *virtual* hardware and resumes the guest. Classic x86 (pre-2005) broke this: a handful of instructions behaved differently depending on privilege *without* trapping, so plain trap-and-emulate was impossible and hypervisors resorted to costly binary translation. **Hardware assistance** — Intel **VT-x**, AMD **AMD-V** — added a CPU mode *below* ring 0: the guest genuinely runs its kernel in 'guest ring 0', and any sensitive operation causes a **VM exit** to the hypervisor. Clean trap-and-emulate, no translation, unmodified guests. (Guest memory gets the same treatment: the guest's page tables map guest-virtual → guest-physical, and the hardware composes them with the host's mapping — shadow page tables in software, or two-dimensional hardware translation such as EPT/NPT.)",
          "**vCPUs and overcommit.** Each guest is given **virtual CPUs**; the hypervisor schedules vCPUs onto physical cores as module 3 scheduled processes onto a CPU — and just as the OS oversubscribes memory, the hypervisor may *overcommit* CPU: promise guests more vCPU capacity than physical cores provide. Time-slicing makes it safe in principle and slower in practice: when combined demand exceeds capacity, every guest's effective speed drops, and the lab logs exactly that moment.",
        ],
        equations: [
          {
            expr: "total demand D = Σ (load of each vCPU)      overcommit ⟺ D > host capacity",
            symbols: [
              { sym: "D", meaning: "combined vCPU demand as a percentage of the host's physical capacity (the lab's sliders sum)" },
              { sym: "host capacity", meaning: "100% in the lab — one host's worth of physical CPU time" },
            ],
            note: "In the lab: two vCPUs at 80% each give D = 160 > 100 → OVERCOMMIT, and the hypervisor time-slices. Real hypervisors add memory tricks (ballooning, swap) to overcommit RAM the same way.",
          },
          {
            expr: "effective per-guest speed ≈ capacity / D   (while D > capacity)",
            symbols: [
              { sym: "capacity", meaning: "the host's total deliverable CPU time" },
            ],
            note: "Overcommit does not break promises by default — it spreads the same physical time thinner. Capacity planning is the discipline of keeping D below capacity with margin.",
          },
        ],
      },
      {
        kind: "worked-example",
        steps: [
          {
            title: "One guest syscall, trap-and-emulate end to end",
            body: [
              "An application inside the guest calls `read()`. **Trap #1 — by design**: the CPU enters the *guest kernel* in guest ring 0; the hypervisor is not involved at all — this is the efficiency requirement paying off, because ordinary syscalls (millions per second) cost the guest nothing extra. The guest kernel handles the request and executes a privileged operation: program the (emulated) disk controller.",
              "**VM exit — the referee**: the hardware notices a privileged access from guest mode and traps into the hypervisor. The hypervisor sees *which* device register the guest wrote, translates the intent into a real request, and hands it down the host's own driver stack (module 10's machinery — one level down) to the physical disk. When the data arrives, the hypervisor performs a **VM entry**: the guest kernel resumes, convinced its controller did the work. Two nested traps, one honest fiction.",
            ],
          },
          {
            title: "What VT-x changed",
            body: [
              "Before hardware assist, that second trap did not exist for some instructions: a few sensitive x86 instructions executed 'silently' in deprivileged mode — wrong behavior, no trap, no chance to emulate. Hypervisors therefore *rewrote the guest kernel's code* (binary translation) or shipped kernels modified to avoid the bad instructions (para-virtualization) — correct, but expensive or invasive.",
              "VT-x/AMD-V made the trap real: guest mode is a hardware fact, sensitive operations VM-exit by construction, and an off-the-shelf kernel runs unmodified and unaware. Same theory as 1974, finally cheap silicon in 2006 — which is why the cloud is built on this lesson.",
            ],
          },
        ],
      },
      {
        kind: "misconceptions",
        items: [
          {
            wrong: "A type 2 hypervisor (VirtualBox on your laptop) isn't 'real' virtualization.",
            right: "The type number records *where the hypervisor sits* — type 2 rides on a host OS, type 1 rides on bare metal — not whether the isolation is genuine. On modern CPUs both use the same hardware assists and enforce the same trap-and-emulate contract; 'hosted' describes the plumbing, not the promise.",
          },
          {
            wrong: "The guest OS must be specially modified to run in a VM.",
            right: "With hardware assist, an unmodified guest runs unaware: the CPU presents faithful virtual hardware and VM-exits on sensitive operations. Para-virtualization — deliberately telling the guest (virtio-style drivers that say 'I am virtual, call me directly') — is an optimization choice, not a requirement.",
          },
        ],
      },
      {
        kind: "knowledge-check",
        questions: [
          {
            id: "kc-m12-vm-1",
            q: "Which ordering of the VM stack, from top (application) down to silicon, is correct?",
            options: [
              "Guest App → Guest OS (kernel) → Virtual Hardware → Hypervisor → Host OS (kernel) → Physical Hardware",
              "Guest App → Virtual Hardware → Guest OS → Host OS → Hypervisor → Physical Hardware",
              "Guest App → Guest OS → Hypervisor → Virtual Hardware → Host OS → Physical Hardware",
              "Guest App → Host OS → Guest OS → Virtual Hardware → Hypervisor → Physical Hardware",
            ],
            answerIndex: 0,
            explanation:
              "The guest kernel sits on *virtual* hardware; the hypervisor produces that virtual hardware using the host OS and real hardware beneath. Swapping any of the middle three layers breaks the story — the hypervisor must be between the fake machine and the real one.",
          },
          {
            id: "kc-m12-vm-2",
            q: "On a VT-x machine, the guest kernel executes a privileged instruction. What happens?",
            options: [
              "The hardware VM-exits to the hypervisor, which emulates the effect on virtual hardware and resumes the guest",
              "The instruction executes directly on the physical device — that is what virtualization means",
              "The instruction is skipped silently and the guest continues with stale state",
              "The guest kernel is terminated for attempting an illegal operation",
            ],
            answerIndex: 0,
            explanation:
              "Guest mode makes sensitive operations trap by construction — that is the entire point of the hardware assist. The hypervisor performs the effect faithfully (equivalence) and only on its own terms (resource control).",
          },
        ],
      },
      {
        kind: "references",
        items: [
          {
            label: "OSTEP, Chapter 6: Direct Execution (Limited Direct Execution)",
            url: "https://pages.cs.wisc.edu/~remzi/OSTEP/cpu-mechanisms.pdf",
            note: "the run-fast-but-trap-for-privileged-operations pattern this lesson applies one level down",
          },
          {
            label: "QEMU documentation",
            url: "https://www.qemu.org/docs/master/",
            note: "a real hypervisor's own description of device emulation and machine models",
          },
          {
            label: "Linux kernel docs: KVM — Kernel-based Virtual Machine",
            url: "https://docs.kernel.org/virt/kvm/index.html",
            note: "how Linux became a type-1 hypervisor: guests as processes, VM exits as syscalls, one level down",
          },
        ],
      },
      {
        kind: "note",
        body: [
          "Lab simplifications: the Virtualization Lab's stacks are static pictures — no emulation, traps or VM exits are modeled. vCPU loads drift toward your slider targets with a toy damped model, and overcommit is a pure threshold: combined demand above host capacity logs the event and names time-slicing, where a real hypervisor would also balloon memory, swap guests, or migrate them between hosts. Memory virtualization (shadow tables, EPT) and device emulation appear only as words in this lesson, not mechanisms in the lab.",
        ],
      },
    ],
  },
  {
    id: "virtualization/containers",
    moduleId: "virtualization",
    title: "Containers & Namespaces",
    minutes: 10,
    objectives: [
      "order the container stack and say exactly which VM layers it deletes",
      "separate the jobs of namespaces (what you can see) from cgroups (how much you may use)",
      "state the isolation price of sharing one host kernel",
    ],
    sections: [
      {
        kind: "problem",
        body: [
          "Virtual machines buy beautiful isolation and pay full price for it: every guest boots an entire kernel — hundreds of megabytes, seconds to minutes of startup, its own drivers and updates — and the hypervisor must emulate a whole machine per guest. Now look at what a typical deployment actually wants: *my own view of the same OS*. A private process table, a private network stack, a private filesystem root, a capped slice of CPU and memory — running my service, not someone else's kernel. At fleet scale, where environments are created and destroyed by the hundreds per machine, weight is the enemy.",
          "So invert the question. Not 'how do we fake a whole machine?' but 'how much isolation can the kernel we already have provide for the processes it already runs?' Modules 2–11 built a kernel that can (almost) make a resource *unnameable* to a process — module 6 did it for memory with page tables. This lesson is what happens when that idea is applied to every global resource at once: the answer is containers, and the price list — isolation versus weight — is the trade this module keeps returning to.",
        ],
      },
      {
        kind: "intuition",
        body: [
          "A **gated suburb versus an apartment building**. A VM is a suburb: each house sits on its own foundation with its own utilities, pipes and boiler — total separation, weeks to build, a full house-warming before anyone moves in. A container is an apartment in one building: a single foundation and one utility grid — the shared host kernel — but each unit has *locked doors* (namespaces: which rooms, pipes and meters you can even see) and a *circuit breaker with a meter* (cgroups: how much power and water you may draw).",
          "The building metaphor earns its keep on the failure mode too. Suburb houses burn independently; apartments share one electrical room — a fault in *shared infrastructure* is everyone's problem. That is exactly the container trade: no guest kernel to patch per container, but only *one* kernel, and a bug in it is reachable from every container on the host. Light, fast, and one shared point of failure.",
        ],
      },
      {
        kind: "visual",
        simId: "virtualization-lab",
        body: [
          "Switch the **Virtualization Lab** to container mode and hold the two stacks side by side. Container: **App processes**, **Isolated namespaces (pid, net, mnt)**, **Container Runtime**, **Host OS (kernel, shared)**, **Physical Hardware** — five layers against the VM's six, and the differences are the entire lesson. Gone: *Virtual Hardware* (nothing is emulated) and *Guest OS* (nothing boots — the host kernel is reused). Added: a thin **Container Runtime** whose whole job is arranging namespaces and cgroups before `exec`.",
          "Count the kernels: two in VM mode, one in container mode. Then re-read the lab's own summary line for each mode — 'Strong isolation; heavy' versus 'Light; kernel bugs are shared infrastructure'. That sentence is the trade-off this lesson is about.",
        ],
      },
      {
        kind: "technical",
        body: [
          "**Namespaces make resources unnameable.** A Linux process can be created inside one or more *namespaces*, each giving a private instance of one global resource: **pid** (your own numbering — you are pid 1 in yours), **net** (your own interfaces, routes, firewall), **mnt** (your own mount tree and root filesystem), **uts** (your own hostname), **ipc** (your own IPC objects), **user** (your own uid mapping — root inside without being root outside), plus cgroup and time namespaces. Notice the mechanism is not 'permission denied' — it is *absence*: inside a pid namespace, the host's other processes do not appear in your view at all, exactly as another process's page was not forbidden but *unnameable* in module 6. The supporting syscalls are module 11's ordinary doorway: `clone` (with namespace flags), `unshare`, `setns`.",
          "**cgroups set the meter.** Namespaces change *visibility*, not consumption — so **control groups (cgroups)** organize processes into hierarchical groups whose controllers *limit and account* usage: CPU time (v2's `cpu.max`, a quota per period), memory (`memory.max`), I/O bandwidth, even the count of processes (`pids.max`). The two mechanisms compose cleanly: namespaces decide *what exists in your world*; cgroups decide *how much of the shared machine you may use*. A container is simply a process tree wrapped in both, plus a root filesystem.",
          "**The image is just files.** A **container image** is a stack of read-only, content-addressed filesystem layers (a minimal base distribution, then your app's layers), shared between containers and topped by one thin writable layer. At run time the runtime mounts that stack as the container's root and pivots into it — no install, no boot: the 'machine' is a directory view plus a process, which is why containers start in milliseconds and why ten containers of the same image store the base layers *once*.",
          "**The trade, stated plainly.** All containers on a host run *one* kernel. That kernel is patched once and shared by all — wonderful for weight — and it is one shared attack surface: a kernel vulnerability reachable through a syscall is *infrastructure* every container stands on, while a VM guest would have to attack a different kernel entirely, through the much smaller and more stable hardware interface the hypervisor emulates. VMs isolate at the machine boundary; containers isolate at the syscall boundary. The rest of this module keeps pricing that difference.",
        ],
        equations: [
          {
            expr: "CPU ceiling per container = quota / period",
            symbols: [
              { sym: "quota", meaning: "CPU time granted per period (cgroup v2 `cpu.max` first value, e.g. 200000 μs)" },
              { sym: "period", meaning: "the refill interval (e.g. 100000 μs)" },
            ],
            note: "200000/100000 = 2 cores maximum for that group, no matter how many threads spin inside. Where a hypervisor spreads shortage by time-slicing every guest (lesson 1's overcommit), a cgroup *caps* one consumer and leaves the rest of the machine alone.",
          },
          {
            expr: "cost(n VMs) = n × (guest kernel + guest userland + app)      cost(n containers) = host kernel + n × (app)",
            symbols: [
              { sym: "app", meaning: "the workload's own memory and startup cost" },
            ],
            note: "The shared terms are counted once on the container side — that is the entire economic case for containers, and it is why images share base layers on disk too.",
          },
        ],
      },
      {
        kind: "experiment",
        simId: "virtualization-lab",
        prompts: [
          "Toggle VM → container and list, layer by layer, what disappears. 'Virtual Hardware' vanishes because nothing is emulated — but where did 'Guest OS (kernel)' *go*? (Nowhere: the host kernel is reused. That substitution, not any technology, is what a container *is*.)",
          "With the stack in container mode, count the highlighted kernel layers. In VM mode, count again. Now state the security consequence in one sentence each: which mode must survive a hostile kernel bug, and which mode must contain a hostile *application*?",
          "Set both vCPU sliders to 80 and tick once: demand 160/100 — OVERCOMMIT, and the log says the hypervisor time-slices so *each guest slows down*. Contrast that with the cgroup equation from this lesson (`quota/period`): when a container hits its cap, who slows down, and who doesn't even notice?",
          "Set one slider to 0 and the other to 100. Predict the log before ticking. (100 ≤ 100 — no overcommit; the boundary is strict.) This is the same off-by-one discipline as module 11's base/limit ranges — capacity is an interval, and its top edge matters.",
        ],
        body: [
          "Lab conventions: the two stacks are fixed pictures — the lab does not build namespaces, mount root filesystems, or enforce cgroup numbers; the vCPU meter models the *VM* side only, because overcommit is a hypervisor policy. The container story in the lab is the *shape* of the isolation (one kernel, namespaces between processes and the machine), which is precisely the part the technical section turned into mechanisms.",
        ],
      },
      {
        kind: "worked-example",
        steps: [
          {
            title: "docker run alpine sh, with the curtains open",
            body: [
              "The CLI hands the request to the daemon; the runtime then does four ordinary-syscall moves (module 11's doorway, nothing exotic). **One**: `clone()` the shell process with namespace flags — CLONE_NEWPID (own pid numbering; sh will be pid 1), CLONE_NEWNET (own interfaces), CLONE_NEWNS (own mount tree), CLONE_NEWUTS (own hostname), CLONE_NEWIPC (own IPC objects), and typically a user namespace mapping 'root' *inside* to an unprivileged uid *outside*. **Two**: write the cgroup limits — `cpu.max`, `memory.max`, `pids.max` — and move the process in.",
              "**Three**: mount the image's layers as the new root filesystem and `pivot_root` into it — `/` is now Alpine's tree; the host's files are unnameable. **Four**: `exec` the entrypoint. Total elapsed: milliseconds. Result: a process tree that believes it is a machine — on the host kernel, at process speed. Replay the same story through lesson 1: firmware, a guest kernel booting on emulated hardware, init, then finally sh — minutes and megabytes apart, and that gap *is* the layer count you counted in the lab.",
            ],
          },
          {
            title: "Reading the boundary honestly",
            body: [
              "Ask the defender's question from module 11: what can the containerized process *name*? Not the host's pids, interfaces, mounts or IPC — those namespaces removed them from its world. Not memory beyond its cgroup limit — the OOM killer reaps it, not its neighbors. But *yes* to every syscall the kernel exposes: the same ~400 doors module 11 catalogued, all live, all shared with every other container. Its escape route is a kernel bug behind one of those doors — which is why hardened deployments stack module 11's layers on top: seccomp allowlists to shrink the syscall surface, user namespaces to de-privilege 'root', VMs *underneath* containers when the tenant is untrusted.",
              "That last arrangement — containers inside VMs — is not a compromise but the design lesson made visible: choose the cheapest wall that stops the threat, then keep stacking.",
            ],
          },
        ],
      },
      {
        kind: "misconceptions",
        items: [
          {
            wrong: "A container is a tiny VM with its own miniature kernel.",
            right: "A container has *no kernel at all* — it is ordinary host processes wearing namespaces and cgroup limits, running on the one host kernel. 'The container' is a constructed *view*; the execution machinery is entirely shared infrastructure.",
          },
          {
            wrong: "Namespaces limit how much CPU or memory a container can consume.",
            right: "That is cgroups' job. Namespaces only change *what exists in your view* — which pids, which network, which files. The curtain and the meter are different mechanisms, and a real container needs both.",
          },
        ],
      },
      {
        kind: "knowledge-check",
        questions: [
          {
            id: "kc-m12-ct-1",
            q: "Which layer appears in the lab's VM stack but has NO counterpart anywhere in the container stack?",
            options: [
              "Guest OS (kernel) — containers reuse the host kernel instead of booting their own",
              "Container Runtime — containers have this and VMs do not",
              "Physical Hardware — nothing virtual ever reaches real silicon",
              "Host OS (kernel) — containers run without any host",
            ],
            answerIndex: 0,
            explanation:
              "VM: App, Guest OS, Virtual Hardware, Hypervisor, Host OS, Physical HW. Container: App processes, Namespaces, Runtime, Host OS, Physical HW. The deleted layers are Guest OS and Virtual Hardware — the kernel-per-instance and the fake machine that carried it.",
          },
          {
            id: "kc-m12-ct-2",
            q: "A team wants their service unable to *see* other tenants' processes AND unable to use more than 2 cores. Which mechanism pair does that?",
            options: [
              "pid namespace for visibility, cgroup cpu.max quota/period = 2 cores for the limit",
              "cgroup for visibility, pid namespace for the limit — the roles are interchangeable",
              "Two VMs, one per requirement — namespaces and cgroups cannot combine",
              "A seccomp filter for visibility and a chroot for the limit",
            ],
            answerIndex: 0,
            explanation:
              "Namespaces decide what exists in your world (hide the other pids); cgroups decide how much you may use (cap at 2 cores via 200000/100000). The roles do not swap, and the mechanisms compose in one container.",
          },
        ],
      },
      {
        kind: "references",
        items: [
          {
            label: "man7: namespaces(7) — overview of Linux namespaces",
            url: "https://man7.org/linux/man-pages/man7/namespaces.7.html",
            note: "all eight namespace kinds, the clone/unshare/setns API, and lifetime rules — the real mechanism behind the lab's layer",
          },
          {
            label: "man7: cgroups(7) — control groups",
            url: "https://man7.org/linux/man-pages/man7/cgroups.7.html",
            note: "v1 vs v2, controllers and hierarchies — the meter half of the lesson",
          },
          {
            label: "Docker: What is Docker? (official overview)",
            url: "https://docs.docker.com/get-started/docker-overview/",
            note: "images, registries, daemon and client — how the namespace/cgroup machinery ships as a product",
          },
        ],
      },
      {
        kind: "note",
        body: [
          "Lab simplifications: the container stack shows namespaces as ONE layer, where real systems stack six-plus kinds per container; no cgroup numbers exist in the lab (the quota/period equation is real-world syntax, not lab state); the vCPU overcommit meter belongs to the VM story — containers have no vCPUs to overcommit, which is itself the point of the layer count; and the shared-kernel risk is stated in the lab's caption but cannot be *modeled* — there is no attacker in this lab, only architecture.",
        ],
      },
    ],
  },
  {
    id: "virtualization/multicore-numa",
    moduleId: "virtualization",
    title: "Multicore Scheduling & NUMA",
    minutes: 10,
    objectives: [
      "argue per-core run queues vs one global queue, and when a scheduler migrates a thread",
      "place tasks on identical CPUs with list scheduling (LPT) and compute the makespan",
      "compute NUMA-averaged memory latency from a local/remote access mix",
    ],
    sections: [
      {
        kind: "problem",
        body: [
          "Module 3 built scheduling on a polite fiction: one CPU, one queue, one decision at a time. Your machine has eight to a hundred and twenty-eight cores, and nothing in that theory *breaks* so much as it multiplies: every per-CPU data structure in modules 1–11 — run queues, page-table locks, interrupt masks — is now a shared resource that N cores fight over. Three new questions define the field. **Where does a thread wait?** One global ready queue means one lock that every core pounds on (module 4's contention lesson, at kernel scale); per-core queues mean someone must rebalance. **Where should a thread run?** It was on core 3 last quantum — its data is warm in core 3's caches and TLB — but core 3 is busy and core 7 is idle. **Is memory just memory?** On a two-socket board, each socket's cores reach their *own* RAM faster than the other socket's — and a scheduler that ignores that pins your database to the slow path forever.",
          "Notice this is the same shape as the rest of the course: locality and balance, trading against each other, with the OS as the referee. Only now the referee manages a *team* of CPUs, not one.",
        ],
      },
      {
        kind: "intuition",
        body: [
          "A **row of chefs, each with a private prep station**. Per-core run queue: each chef has an own ticket rail — no queue-jumping, no fights over one rail (that single shared rail *is* the global-queue design, and every chef bumping it at once is the lock contention). **Cache affinity**: a chef mid-recipe has the ingredients chopped and laid out at *their* station; yank them to another station and they re-chop everything — the dish isn't lost, but the head start is. **Load balancing**: the head chef watches the rails and occasionally slides a ticket from a piled rail to an empty one — but only when the imbalance is big enough to be worth the re-prep.",
          "**NUMA** is the second renovation: the restaurant grows a second kitchen, each with its own pantry. Any chef can fetch from either pantry, but the far one is a longer walk. A good floor manager assigns each dish to the kitchen whose pantry already holds its ingredients — and stores new ingredients in the pantry of the kitchen that ordered them. Balance the kitchens, but balance them *with their pantries in mind*.",
        ],
      },
      {
        kind: "visual",
        simId: "multiproc-lab",
        body: [
          "The **Multiprocessor Lab** is the chefs' floor in miniature: add tasks (durations 1–4 per button) and watch them placed on CPU lanes by **list scheduling in LPT order** — longest processing time first, each task assigned to the currently least-loaded CPU. Notice the placement discipline: big tasks land first, while the CPUs are most empty, so no late small task strands a huge job on an otherwise idle machine.",
          "Keep adding tasks and watch the two lanes converge: the *makespan* (when the last task finishes) approaches Σ durations ÷ 2 — the theoretical floor for two CPUs. The lab's note says the same in engine-speak: LPT order on identical CPUs, no preemption, no I/O — the cleanest possible version of the balancing problem.",
        ],
      },
      {
        kind: "technical",
        body: [
          "**Per-core run queues and load balancing.** Modern kernels give each CPU its own ready queue: enqueue and dequeue are local operations with no global lock to stampede (module 4's critical-section economics, applied inside the scheduler itself). The cost is possible imbalance, so a periodic **load balancer** migrates runnable threads from the busiest to the emptiest CPU — but only when the imbalance exceeds a threshold, because migration is not free. **Cache affinity** is the migration tax made explicit: a thread's working set lives in its CPU's caches and TLB (module 6's locality, module 3's loop) — move the thread and it re-misses everything. Hence the standard policy: keep a thread on its previous CPU unless imbalance says otherwise, and prefer the *most recently used* CPU when it becomes free.",
          "**List scheduling (LPT).** The lab's model: m identical CPUs, independent tasks of known duration, no preemption. Rule: sort tasks longest-first; always give the next task to the least-loaded CPU. Greedy, trivial to run — and provably decent: its makespan is never worse than (4/3 − 1/(3m)) × the optimal (for m = 2, at most 7/6 of optimal). The analysis rests on a two-case argument: if LPT happens to schedule the longest task last, that task starts no later than the average load; otherwise the longest task is already running first and dominates the bound. Greedy is not *optimal* — the worked example and this module's quiz include a case where it isn't — but 'never much worse, always instant' is exactly what a batch scheduler wants.",
          "**NUMA — non-uniform memory.** Put several sockets in one board and memory becomes *per-socket*: any core can address all of RAM, but its own node's memory is reached through the local memory controller while the other node's crosses a socket-to-socket interconnect — one address space, two latencies. The OS answers with two cooperating policies: **first-touch placement** (module 6's allocator puts a page on the node of the core that first writes it) and **NUMA-aware scheduling** (keep a thread on, or near, the node where its memory lives — cache affinity's bigger sibling). Get both wrong and the machine is 'healthy' but every access is remote: the worst kind of slowdown, one that no single number on a monitoring graph explains.",
        ],
        equations: [
          {
            expr: "makespan = max over CPUs c of Σ (durations of tasks on c)      LPT rule: place next-longest task on argmin_c load(c)",
            symbols: [
              { sym: "load(c)", meaning: "total duration assigned to CPU c so far" },
              { sym: "makespan", meaning: "the finish time of the last task = the schedule's length" },
            ],
            note: "Two floors bound any schedule: every task must run (⌈Σ durations / m⌉) and the longest task sets a minimum. In the worked example LPT hits the floor; in this module's quiz it misses it by one — greedy's honest report card.",
          },
          {
            expr: "t_mem = f · t_local + (1 − f) · t_remote",
            symbols: [
              { sym: "f", meaning: "fraction of memory accesses served by the local node" },
              { sym: "t_local, t_remote", meaning: "local vs cross-socket access latency" },
            ],
            note: "The NUMA tax is driven by (1 − f): at f = 0.7 with 100 ns local and 300 ns remote, average access = 0.7·100 + 0.3·300 = 160 ns — 60% worse than local, earned by nothing but placement.",
          },
        ],
      },
      {
        kind: "worked-example",
        steps: [
          {
            title: "LPT by hand: durations 4, 3, 3, 2 on two CPUs",
            body: [
              "Sort descending: 4, 3, 3, 2. Place each on the least-loaded CPU. **4** → CPU0 (loads 4, 0). **3** → CPU1 (4, 3). **3** → CPU1 again, still lighter (4, 6). **2** → CPU0 (6, 6). Makespan: 6.",
              "Check it against the floors: Σ durations = 12, so no two-CPU schedule beats ⌈12/2⌉ = 6; the longest task (4) demands at least 4. LPT landed exactly on the floor — optimal. This is the *good* case: tasks big enough and divisible enough that greedy's table-filling finds the perfect split.",
            ],
          },
          {
            title: "The NUMA arithmetic the scheduler is doing",
            body: [
              "A thread on socket 0 touches its hot data with mix f = 0.7 local (80 ns) and 0.3 remote (240 ns): average = 0.7·80 + 0.3·240 = 56 + 72 = 128 ns. A balancer that mindlessly 'improves' CPU balance by moving the thread to socket 1 — where its memory all lives remotely — flips the mix: 0.3·80 + 0.7·240 = 24 + 168 = 192 ns.",
              "Nothing about the *code* changed; the schedule got 50% worse per access. This is why real balancers keep threads node-local first, core-local second, and only then chase perfect CPU balance — the lesson's whole argument in one computation.",
            ],
          },
        ],
      },
      {
        kind: "misconceptions",
        items: [
          {
            wrong: "My program will run 8× faster on an 8-core machine.",
            right: "A single-threaded program uses one core no matter how many exist — the other seven idle (or run *other* programs, which is the OS's win, not yours). Speedup needs the work itself split into threads, and even then coordination costs and serial fractions cap it.",
          },
          {
            wrong: "A good scheduler keeps every CPU exactly balanced at all times.",
            right: "Balance is bought with migration: cold caches, TLB reloads, NUMA-remote memory. Schedulers deliberately tolerate imbalance below a threshold, and cache affinity often beats perfect balance — the chefs keep their stations unless the rails get badly unequal.",
          },
        ],
      },
      {
        kind: "knowledge-check",
        questions: [
          {
            id: "kc-m12-mc-1",
            q: "Three tasks with durations 7, 5 and 3 run on two identical CPUs under LPT. Where does the last task land, and what is the makespan?",
            options: [
              "The 3 lands on the CPU holding 5 (lighter, 5 < 7); makespan = 8",
              "The 3 lands on the CPU holding 7 (heavier, so it needs help); makespan = 10",
              "The 3 is split across both CPUs; makespan = 5",
              "The 3 waits until a CPU finishes; makespan = 15",
            ],
            answerIndex: 0,
            explanation:
              "LPT: 7 → CPU0, 5 → CPU1, then 3 → the lighter CPU (CPU1 at 5), giving loads 7 and 8 — makespan 8, which equals the lower bound ⌈15/2⌉ = 8. Greedy is optimal here.",
          },
          {
            id: "kc-m12-mc-2",
            q: "On a NUMA machine, what placement goal do the allocator (first-touch) and the scheduler pursue together?",
            options: [
              "Keep each thread running on (or near) the node where its memory was allocated",
              "Spread every thread evenly across all nodes, regardless of where its memory lives",
              "Put all memory on one node so access is always uniform",
              "Disable the interconnect so remote accesses become impossible",
            ],
            answerIndex: 0,
            explanation:
              "First-touch puts pages on the allocating core's node; the scheduler then avoids migrating threads across nodes. The pair minimizes (1 − f) in t_mem = f·t_local + (1−f)·t_remote — the fraction of slow, remote accesses.",
          },
        ],
      },
      {
        kind: "references",
        items: [
          {
            label: "OSTEP, Chapter 10: Multi-CPU Scheduling",
            url: "https://pages.cs.wisc.edu/~remzi/OSTEP/cpu-sched-multi.pdf",
            note: "per-core queues, affinity and the single-queue lock problem — this lesson's backbone chapter",
          },
          {
            label: "Linux kernel docs: Scheduler",
            url: "https://docs.kernel.org/scheduler/index.html",
            note: "how Linux actually organizes per-CPU run queues, load balancing and NUMA placement",
          },
        ],
      },
      {
        kind: "note",
        body: [
          "Lab simplifications: the Multiprocessor Lab's tasks are independent, known-length, non-preemptible and device-free — the opposite of real threads, and LPT-on-identical-CPUs is a *batch* model, not the per-core-queue-plus-balancer design Linux runs. Ties (equal loads) are broken by CPU order in the lab; any tie-break gives the same makespan for the placements explored here. NUMA is narrated, not simulated: no memory, caches or sockets exist in the engine — but the placement problem it poses is exactly the one on the lanes. The EDF panel beside the lanes belongs to the next lesson's model.",
        ],
      },
    ],
  },
  {
    id: "virtualization/rt-embedded-mobile",
    moduleId: "virtualization",
    title: "Real-Time, Embedded & Mobile",
    minutes: 10,
    objectives: [
      "distinguish hard from soft deadlines, and real-time guarantees from best-effort speed",
      "compute Σ wcet/period utilization for a periodic task set and judge EDF feasibility",
      "name the constraints that shape embedded and mobile OS design",
    ],
    sections: [
      {
        kind: "problem",
        body: [
          "Everything so far optimized *averages*: throughput, fairness, mean response time. A brake controller, a pacemaker and an industrial arm are not graded on averages — each sensor reading must be processed *before its deadline*, every time, and a late answer is not a slow answer but a *wrong* one. Meanwhile, at the other end of the scale, a thermostat and a phone run the same shape of problem under different tyrants: a microcontroller with kilobytes of RAM, no disk and no swap; a handset with a battery, a thermal budget and a human who notices a dropped frame. What unites them is that the scheduler's real product is no longer fairness — it is a **promise**: either 'this will never be late' (real-time) or 'the machine stays responsive and alive under scarcity' (embedded/mobile).",
          "This lesson gives the promise a number. For the classic model — periodic tasks with known worst-case times — feasibility collapses into one sum you can compute by hand, and the lab will make you watch the moment it crosses its threshold.",
        ],
      },
      {
        kind: "intuition",
        body: [
          "An **operating room versus a walk-in clinic**. Best-effort scheduling (module 3's fairness — this course's default) is the clinic: everyone is eventually seen, urgent cases usually jump the line, and nobody promises anything. Real-time is the operating room: procedures are booked as contracts — *duration* (worst case, not hope) and *deadline* — and you do not book a schedule you cannot prove fits. **Utilization** is the OR's capacity check: if the booked procedures consume at most 100% of the table's time in the long run, a good scheduler can honor every deadline; overbook it and no algorithm, however clever, saves you — the misses belong to the schedule, not the surgeons.",
          "The good scheduler here is **EDF — earliest deadline first**: among ready jobs, always run the one whose deadline is nearest. It is module 3's priority instinct aimed at the right target: not who is shortest or who paid most, but who is *most urgent right now*.",
        ],
      },
      {
        kind: "visual",
        simId: "multiproc-lab",
        body: [
          "The Multiprocessor Lab's **Real-time (EDF)** panel is the operating room: add periodic tasks, each a (period, wcet) contract, and the engine simulates EDF over the hyperperiod (the LCM of the periods) with deadline = period. The readout shows **utilization = Σ wcet/period** as one number, and the event log announces the verdict — the default set, sensor(5, 2) + control(7, 3), logs 'utilization ≈ 0.83 < 1, EDF meets all deadlines'.",
          "Now cross the line. Add tasks until the number passes 1 and watch the log start counting **deadline misses** — jobs whose deadline arrived with work still remaining. No algorithm you could swap in would help: the demand simply exceeds the supply, and the panel is honest about which failure that is.",
        ],
      },
      {
        kind: "technical",
        body: [
          "**Hard vs. soft.** A **hard deadline** is one whose miss is system failure — airbag timing, flight control loops, pacemaker pulses; the design goal is a *proof* that misses cannot happen. A **soft deadline** tolerates occasional misses that degrade quality — a video frame late is visible jank, an audio buffer late is a click — and the design goal is a low, quantified miss rate. **Real-time means predictable, not fast**: an RT system may be slower on average than a desktop; its defining property is a *bound* on worst-case behavior — bounded interrupt latency (module 1's interrupt costs, now guaranteed), no swapping, drivers with known worst-case costs. Determinism is the currency; averages are decoration.",
          "**The periodic task model.** Task i releases a job every T_i (its **period**); each job needs up to C_i time (**worst-case execution time**, wcet — measured, never hoped); in the lab's model the **deadline equals the period**. The set's **utilization** U = Σ C_i/T_i is the long-run fraction of CPU it demands. The clean theorem of this model: preemptive **EDF** on one CPU schedules the set meeting every deadline **if and only if U ≤ 1** — a genuine iff, vanishingly rare in scheduling theory, and the reason EDF is the textbook dynamic-priority answer. (Fixed-priority alternatives like rate-monotonic trade that exactness for simpler runtimes: their sufficient utilization bound tops out near 69% for many tasks — they leave slack on the table in exchange for priorities that never change.) The lab simulates EDF over one hyperperiod and *counts misses* — the experiment makes you walk both sides of U = 1.",
          "**Embedded: an OS under scarcity.** A microcontroller-class machine: KB–MB of RAM, flash instead of disk, and therefore **no swap** — swapping to flash is slow and wears it out, so module 6's demand-paging machinery simply doesn't ship. Drivers are selected at *build* time and fused into the image; a **watchdog timer** reboots the system if software hangs (the failure policy is restart, not diagnosis); many chips lack an MMU entirely, so module 6's page tables are gone and protection falls back to module 5's base/limit — or to nothing but discipline. **RTOSes** (FreeRTOS, Zephyr, QNX) center the scheduler on priorities and deadlines and shrink everything else to fit.",
          "**Mobile: a full OS with two tyrants.** Android and iOS carry this course's whole stack — processes, virtual memory, syscalls, files — and add **battery** and **thermals** as first-class scheduling constraints: heterogeneous cores (big cores for burst, little cores for efficiency, the scheduler choosing work-per-joule over raw speed), background work frozen or killed (the low-memory killer acts where swap can't), and one very human deadline: the **frame budget** — 60 fps means a new frame every 16.7 ms, a soft deadline you *feel* when it is missed ('jank') and an app store *measures* when it is missed often.",
        ],
        equations: [
          {
            expr: "U = Σᵢ Cᵢ / Tᵢ      EDF feasible ⟺ U ≤ 1",
            symbols: [
              { sym: "Cᵢ", meaning: "worst-case execution time (wcet) of one job of task i" },
              { sym: "Tᵢ", meaning: "the task's period (deadline = period in the lab's model)" },
            ],
            note: "The lab's default set: 2/5 + 3/7 ≈ 0.4 + 0.429 = 0.829 ≤ 1 — feasible, with ~17% of the CPU as slack. U > 1 is not 'EDF struggles' — it is *infeasible*: no scheduler can fit the demand into the time.",
          },
          {
            expr: "t_frame = 1000 ms / fps   (60 fps → 16.7 ms per frame)",
            symbols: [
              { sym: "t_frame", meaning: "the soft deadline within which one display frame must be produced" },
            ],
            note: "Mobile's most felt deadline: input handling, layout, render and composite all share the budget — which is why the mobile scheduler treats the foreground app's priority as near-sacred.",
          },
        ],
      },
      {
        kind: "experiment",
        simId: "multiproc-lab",
        prompts: [
          "Start from the default RT set — sensor(period 5, wcet 2) and control(period 7, wcet 3). Compute U by hand first: 2/5 + 3/7 ≈ 0.83. Predict zero misses, then run the hyperperiod and verify. Identify the slack: 17% of the CPU unbooked.",
          "Push past the cliff. Add a periodic task that lifts U well above 1 (for example a task with period 5 and wcet 3: 0.4 + 0.429 + 0.6 = 1.43). Before running: what is the *minimum* rate of missed work such a set must suffer, no matter what scheduler runs it? Then run it and match the log's miss labels to your expectation.",
          "Build a set with U exactly 1 (two tasks with period 4 and wcet 2 works: 0.5 + 0.5). Run it: EDF meets every deadline with zero slack — then explain what a real system adds as a safety margin, and why 'exactly feasible' is a knife's edge (wcet was a *worst case*; optimism here is how hard systems die).",
          "Now the diagnosis flip: run a *feasible* set with several tasks and confirm zero misses — then ask which policy would convert it into misses while U stays ≤ 1 ('always run the longest ready job' is one such). U is feasibility, not achievement; this is why the utilization theorem names its scheduler.",
        ],
        body: [
          "Lab conventions: deadline = period, one CPU, independent preemptible tasks, EDF over one hyperperiod, misses counted as jobs with remaining work at their deadline. No jitter (releases are exact), no blocking (tasks never wait on devices or locks), no release offsets — the clean model of the utilization theorem; real analyses (response-time bounds, offsets, shared resources) exist precisely for what the lab leaves out.",
        ],
      },
      {
        kind: "misconceptions",
        items: [
          {
            wrong: "Real-time means real fast.",
            right: "Real-time means *bounded* — deadlines met (hard) or rarely missed in a measured way (soft). An RT system can be slower on average than a desktop; what it sells is a provable worst case, which no amount of average speed provides.",
          },
          {
            wrong: "If utilization ≤ 1, any scheduler will meet the deadlines.",
            right: "U ≤ 1 says a schedule *exists* (feasibility); EDF is the policy that *finds* it in this model. A perverse policy — always run the longest job — can miss deadlines on a feasible set, and no policy at all can save U > 1: demand exceeding supply is arithmetic, not scheduling.",
          },
        ],
      },
      {
        kind: "knowledge-check",
        questions: [
          {
            id: "kc-m12-rt-1",
            q: "Task A: C = 1, T = 4. Task B: C = 2, T = 8. Compute U and the EDF verdict.",
            options: [
              "U = 1/4 + 2/8 = 0.5 ≤ 1 — feasible; EDF meets all deadlines and half the CPU is slack",
              "U = 1/4 + 2/8 = 0.5, but only fixed priorities can prove feasibility",
              "U = (1 + 2)/(4 + 8) = 0.25 — feasible, but EDF cannot be applied to two tasks",
              "U = 3/4 = 0.75 ≤ 1 — feasible with no slack left for anything else",
            ],
            answerIndex: 0,
            explanation:
              "Each task contributes wcet/period: 0.25 + 0.25 = 0.5. Under the lab's model (deadline = period, preemptive EDF, one CPU) that is feasible with a wide margin — the other half of the CPU stays free for anything else.",
          },
          {
            id: "kc-m12-rt-2",
            q: "Which pairing classifies the deadlines correctly?",
            options: [
              "Airbag firing: hard (a miss is system failure); video frame render: soft (a miss is visible quality loss)",
              "Both hard — users notice a dropped frame exactly as they would notice a failed airbag",
              "Both soft — nothing in user-facing software is truly hard real-time",
              "Airbag: soft, because it tolerates wide timing; frame render: hard, because 16.7 ms is exact",
            ],
            answerIndex: 0,
            explanation:
              "Hardness is about the *cost of a miss*, not the tightness of the timing: an airbag controller treats a late firing as failure (hard), while a late frame degrades an experience (soft). The 16.7 ms frame budget is strict — and still soft.",
          },
        ],
      },
      {
        kind: "references",
        items: [
          {
            label: "Linux kernel docs: Deadline Task Scheduling (SCHED_DEADLINE)",
            url: "https://docs.kernel.org/scheduler/sched-deadline.html",
            note: "EDF + CBS as shipped in mainline Linux — the utilization math of this lesson, productionized",
          },
          {
            label: "FreeRTOS — the open-source RTOS",
            url: "https://www.freertos.org/",
            note: "an RTOS built around priority- and deadline-driven scheduling on microcontrollers",
          },
          {
            label: "Android Developers: App performance",
            url: "https://developer.android.com/topic/performance",
            note: "the mobile side: frame budgets, ANRs and vitals — soft deadlines, measured and enforced",
          },
        ],
      },
      {
        kind: "note",
        body: [
          "Lab simplifications: the EDF panel assumes deadline = period, exact releases, independent preemptible tasks on one CPU, and judges feasibility by simulated misses over a single hyperperiod — no jitter, blocking, or shared resources, and no admission control (a real RTOS would *refuse* to admit a set with U > 1 rather than run and count misses). The LPT lanes and the EDF panel are separate models sharing one lab; real systems often pin RT workloads to dedicated cores. Embedded and mobile constraints (watchdogs, no-swap, big.LITTLE, low-memory killer) are narrative here — the lab has no battery, no flash and no frame to drop.",
        ],
      },
    ],
  },
];
