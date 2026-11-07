import type { Lesson } from "@/types";

/**
 * Module 0 — Computers & Operating Systems.
 * Written for absolute beginners: plain language first, visuals second,
 * formal terms only once the idea has landed.
 */
export const lessons: Lesson[] = [
  {
    id: "intro-computers-os/what-is-a-computer",
    moduleId: "intro-computers-os",
    title: "What Is a Computer?",
    minutes: 8,
    objectives: [
      "name the core hardware parts and what each one does",
      "trace how data moves through a computer",
    ],
    sections: [
      {
        kind: "problem",
        body: [
          "Imagine a factory with a brilliant worker who can only do **one thing at a time**, works astonishingly fast, and forgets everything the instant the shift ends. That is your **CPU** (Central Processing Unit). Around it sit a storeroom (the **disk**), a small workbench that remembers only while the power is on (**RAM**), and doors to the outside world (the **keyboard, screen, network**).",
          "How do these parts become one machine that can edit a photo while playing music and checking the network? Nobody hardwires that cooperation — it has to be *organized*. That organization problem is the subject of this entire course.",
        ],
      },
      {
        kind: "intuition",
        body: [
          "Think of a restaurant kitchen. The **CPU** is the chef: incredibly fast, but one dish at a time. **RAM** is the counter right next to the chef — small, but instant to reach. The **disk** is the pantry in the basement: huge, but a trip down the stairs. **Devices** are the doors: orders come in, plates go out.",
          "A good kitchen does not leave the chef running to the basement — someone fetches ingredients, queues the orders, and tells the chef what is next. Keep that image: an operating system is exactly that someone, for a computer.",
        ],
      },
      {
        kind: "visual",
        simId: "computer-diagram",
        body: [
          "Click a part in the explorer to see what it stores, how fast it is, and how data moves to and from the CPU. Notice the huge speed gaps: RAM is thousands of times faster than the disk, and the CPU is faster still. Almost every clever trick in this course — caches, buffers, scheduling — exists to hide one of those gaps.",
        ],
      },
      {
        kind: "experiment",
        simId: "computer-diagram",
        prompts: [
          "Send a file from the disk to the CPU and watch the stops it takes. Which stage is the slowest, and why?",
          "Send two things at once and watch what happens — this *queueing* is a preview of Module 3 (CPU scheduling).",
        ],
      },
      {
        kind: "technical",
        body: [
          "Formally: a computer is a **von Neumann machine** — a processor, memory holding both program and data, and input/output devices, connected by buses. The CPU executes a **fetch–decode–execute cycle**: it fetches the instruction its program counter points at, decodes it, executes it, and repeats, billions of times per second (a 3 GHz CPU issues roughly 3 billion cycles each second).",
          "Keep the classic speed ladder in mind, in approximate numbers for a modern machine: a CPU register access costs well under a nanosecond, RAM roughly a hundred nanoseconds, an SSD tens of microseconds, a spinning disk several milliseconds, the network tens of milliseconds. Each step down is hundreds to millions of times slower than the one above.",
        ],
        equations: [
          {
            expr: "CPU time per program ≈ instructions × cycles/instruction × seconds/cycle",
            symbols: [
              { sym: "instructions", meaning: "how many instructions the program executes" },
              { sym: "cycles/instruction", meaning: "average cycles each instruction needs" },
              { sym: "seconds/cycle", meaning: "how long one clock tick lasts" },
            ],
          },
        ],
      },
      {
        kind: "misconceptions",
        items: [
          {
            wrong: "The CPU 'does' the whole computer — programs just talk to the CPU.",
            right: "Programs mostly talk to *memory* and *devices*; the CPU is the executor. Coordinating those talks is the operating system's job.",
          },
          {
            wrong: "RAM and 'storage' are the same thing.",
            right: "RAM is fast, small, and forgets when power is lost; storage (disk/SSD) is slow, large, and permanent. Computers constantly move data between them — you will see why in the virtual-memory module.",
          },
        ],
      },
      {
        kind: "knowledge-check",
        questions: [
          {
            id: "kc-m0-computer-1",
            q: "You open a large photo from your disk and edit it. Where is the photo while you are actually editing?",
            options: [
              "In RAM — the CPU can only work on data that is in memory",
              "On the disk — editing always happens at the storage location",
              "In the CPU itself — that is what CPU cache is for",
              "Split evenly between disk and screen",
            ],
            answerIndex: 0,
            explanation:
              "The file is loaded from disk into RAM; the CPU reads and writes the image data in RAM. The disk copy is only updated when the program saves.",
          },
          {
            id: "kc-m0-computer-2",
            q: "Which statement about the CPU is true?",
            options: [
              "It executes one instruction stream at a time per core",
              "It can execute all running programs simultaneously",
              "It stores all running programs permanently",
              "It talks directly to the disk without memory",
            ],
            answerIndex: 0,
            explanation:
              "Each CPU core executes a single instruction stream at a time; running many programs at once is an illusion created by switching rapidly — the heart of Modules 2 and 3.",
          },
        ],
      },
      {
        kind: "references",
        items: [
          {
            label: "OSTEP, Chapter 2: Introduction to the Operating System (Arpaci-Dusseau)",
            url: "https://pages.cs.wisc.edu/~remzi/OSTEP/intro.pdf",
            note: "free online textbook; the 'virtualizing, concurrency, persistence' framing this course follows",
          },
          {
            label: "RISC-V specifications overview",
            url: "https://docs.riscv.org/",
            note: "what a minimal real CPU actually executes",
          },
        ],
      },
      {
        kind: "note",
        body: [
          "Speed figures are order-of-magnitude teaching numbers for typical 2020s consumer hardware; they vary by model and workload. The relative gaps — the part that matters — are accurate.",
        ],
      },
    ],
  },
  {
    id: "intro-computers-os/why-an-os",
    moduleId: "intro-computers-os",
    title: "Why Do We Need an OS?",
    minutes: 9,
    objectives: [
      "explain in your own words what an operating system does",
      "predict what would break if apps talked to hardware directly",
    ],
    sections: [
      {
        kind: "problem",
        body: [
          "Suppose every application could use the hardware however it liked. Two apps both want to print — both drive the same printer, interleaving half of each document. One app wants the memory your other app is using. A bug in one program scribbles over the files of every other program.",
          "Every application would have to contain a full, correct, conflict-free implementation of printing, memory bookkeeping, disk layouts and keyboard handling — and they would all disagree with each other. Clearly the machine needs a **manager**.",
        ],
      },
      {
        kind: "intuition",
        body: [
          "Think of an apartment building. Tenants (applications) do not wire their own electricity or negotiate shared hallways. A building manager sets the rules, shares the common resources fairly, and calls specialists (drivers) when something needs fixing.",
          "The **operating system** is that manager: it divides memory between tenants, decides who runs on the CPU and for how long, arbitrates the disk and devices, and offers standard services so every tenant can just say 'read this file' instead of talking to hardware.",
        ],
      },
      {
        kind: "visual",
        simId: "computer-diagram",
        body: [
          "In the explorer, every request between apps and hardware now passes through the OS layer — watch it broker the traffic. Without that middle layer, two simultaneous requests would collide.",
        ],
      },
      {
        kind: "technical",
        body: [
          "The OS provides three broad services: **virtualization** (giving each program the illusion of its own CPU and its own memory), **concurrency** coordination (safe simultaneous access), and **persistence** (organizing data on storage so it survives restarts). It also handles **accounting** (who used what) and **protection** (one process cannot damage another).",
          "The OS is itself just a program — a very privileged one called the **kernel** — that the hardware loads at boot and keeps running. The next lessons make this concrete.",
        ],
      },
      {
        kind: "worked-example",
        steps: [
          {
            title: "Two programs open a file at the 'same time'",
            body: [
              "Without an OS: each program's code tells the disk controller where to put its data; their writes interleave and corrupt each other's files.",
              "With an OS: both programs call a standard operation — *open the file named X* — and the kernel serializes the actual device work, hands each program a private token (a **file descriptor**, Module 9), and keeps a log of who owns which blocks.",
            ],
          },
          {
            title: "A program crashes",
            body: [
              "Without protection, the crash overwrites whatever memory happens to be nearby — including the manager itself.",
              "With an OS and hardware protection, the CPU *traps* the illegal access (Module 1), the kernel terminates only the guilty program, and everyone else keeps running. You have seen this: one tab dying does not usually take down the whole machine.",
            ],
          },
        ],
      },
      {
        kind: "misconceptions",
        items: [
          {
            wrong: "The OS is just 'the interface' — windows, icons, buttons.",
            right: "Windows and icons are a shell or desktop environment sitting *on top* of the OS. The kernel — the real OS — has no windows at all.",
          },
          {
            wrong: "Applications manage their own memory and devices; the OS only watches.",
            right: "Applications *request*; the kernel *decides*. Even 'malloc' ends up asking the kernel for memory (Module 5), and every disk write passes through kernel code (Module 9).",
          },
        ],
      },
      {
        kind: "knowledge-check",
        questions: [
          {
            id: "kc-m0-os-1",
            q: "Which is the best one-sentence description of an operating system?",
            options: [
              "A resource manager that shares the machine's hardware among programs and protects them from each other",
              "The set of programs installed on the computer",
              "The graphical interface of the computer",
              "A program that makes the CPU run faster",
            ],
            answerIndex: 0,
            explanation:
              "Sharing (virtualization), protecting, and standardizing access to hardware — that is the OS. Interfaces sit on top; speed comes from hardware.",
          },
          {
            id: "kc-m0-os-2",
            q: "Two apps write to the same physical printer at once. What does a correct OS do?",
            options: [
              "Queue and serialize the print jobs so pages do not interleave",
              "Let both print; interleaving is the apps' problem",
              "Refuse both jobs until the printer is reset",
              "Print whichever app was installed first",
            ],
            answerIndex: 0,
            explanation:
              "The OS (via a spooler — Module 10) queues the jobs and feeds the printer one job at a time. This is one tiny example of resource arbitration.",
          },
        ],
      },
      {
        kind: "references",
        items: [
          {
            label: "OSTEP, Chapter 2 (sections 'Virtualizing the CPU' and 'Virtualizing Memory')",
            url: "https://pages.cs.wisc.edu/~remzi/OSTEP/intro.pdf",
          },
          {
            label: "Linux kernel documentation: subsystem overviews",
            url: "https://docs.kernel.org/",
            note: "a real kernel's own description of its subsystems",
          },
        ],
      },
    ],
  },
  {
    id: "intro-computers-os/kernel-user-space",
    moduleId: "intro-computers-os",
    title: "The Kernel and User Space",
    minutes: 8,
    objectives: [
      "distinguish kernel mode from user mode",
      "explain why applications cannot just flip the protection bits themselves",
    ],
    sections: [
      {
        kind: "problem",
        body: [
          "If our manager (the OS) is just a program, what stops a misbehaving app from *pretending* to be the manager — reading other apps' memory, scribbling on the disk? The answer is one of the most elegant ideas in computing: the hardware itself enforces two privilege levels, and the only way across is through a guarded gate.",
        ],
      },
      {
        kind: "intuition",
        body: [
          "Picture an airport. Passengers (user programs) may move freely in the terminal (**user space**) but cannot wander onto the tarmac. Pilots and crew (the **kernel**) work on the tarmac (**kernel space**). The only way through is the security gate, and the guards (the **CPU's privilege checking**) only open it for people following the official procedure.",
          "When your music app wants to read a file, it does not sneak past the gate — it politely asks at the desk by number: 'service 0: read'. That polite request is a **system call**, and the crossing it triggers is a **trap** into the kernel.",
        ],
      },
      {
        kind: "visual",
        simId: "computer-diagram",
        body: [
          "Watch the layering: apps live in user space; the kernel sits between them and the hardware. Every arrow from an app to a device crosses the kernel boundary.",
        ],
      },
      {
        kind: "technical",
        body: [
          "The CPU tracks its current privilege level. On RISC-V these are the M (machine), S (supervisor) and U (user) modes; x86 calls them ring 0–3, of which 0 (kernel) and 3 (user) are the ones most operating systems use. In a low-privilege mode the hardware **faults** on privileged actions — touching another process's memory, driving a device directly, changing page tables.",
          "Crossing from user to kernel happens through a controlled trap: the CPU switches mode, saves the caller's state, and jumps to an address the kernel registered in advance (the **trap vector**). The kernel verifies the request, performs it with full privileges, and returns to user mode. Module 1 dissects this mechanism with interrupts; Module 11 revisits it from the security side.",
        ],
      },
      {
        kind: "misconceptions",
        items: [
          {
            wrong: "User space and kernel space are separate areas of RAM you can point at.",
            right: "They are privilege *levels*, not addresses. The same physical memory exists; the CPU just refuses certain accesses unless it is in kernel mode. (Virtual memory then adds address separation on top — Module 6.)",
          },
          {
            wrong: "System calls are like normal library functions.",
            right: "A normal call stays in user mode; a system call executes a special instruction that traps into the kernel. That is why a system call is far more expensive than a function call — Module 11 shows the full walk.",
          },
        ],
      },
      {
        kind: "knowledge-check",
        questions: [
          {
            id: "kc-m0-kernel-1",
            q: "Your app calls the OS to write a file. During the actual disk work, the CPU is in…",
            options: [
              "kernel mode — the OS is performing the service",
              "user mode — the app owns the CPU the whole time",
              "no particular mode — modes only matter at boot",
              "hybrid mode shared by app and OS",
            ],
            answerIndex: 0,
            explanation:
              "The app traps into the kernel; the kernel performs the privileged device work in kernel mode, then returns control (and user mode) to the app.",
          },
          {
            id: "kc-m0-kernel-2",
            q: "Why can't an app simply set the CPU's privilege level to kernel mode itself?",
            options: [
              "The instruction that raises privilege is itself privileged — the hardware rejects it in user mode",
              "It can, but the OS will notice later",
              "Only system administrators can, via passwords",
              "It could on old computers but not new ones",
            ],
            answerIndex: 0,
            explanation:
              "Privilege changes upward happen only via controlled traps into kernel-registered handlers. This hardware rule is the foundation of all OS protection.",
          },
        ],
      },
      {
        kind: "references",
        items: [
          {
            label: "xv6: a simple, Unix-like teaching operating system (MIT)",
            url: "https://github.com/mit-pdos/xv6-riscv",
            note: "a tiny real kernel you can read line by line",
          },
          {
            label: "RISC-V privileged architecture (modes and trap handling)",
            url: "https://docs.riscv.org/",
          },
          {
            label: "OSTEP, Chapter 6: Limited Direct Execution",
            url: "https://pages.cs.wisc.edu/~remzi/OSTEP/cpu-mechanisms.pdf",
          },
        ],
      },
    ],
  },
  {
    id: "intro-computers-os/booting",
    moduleId: "intro-computers-os",
    title: "Booting: How a Computer Wakes Up",
    minutes: 7,
    objectives: [
      "describe the path from power-on to a running OS",
      "explain why firmware is needed first",
    ],
    sections: [
      {
        kind: "problem",
        body: [
          "Here is a chicken-and-egg puzzle: the OS is a program stored on disk. To run a program you need an OS. So when the machine powers on — memory empty, nothing running — what runs *first*?",
        ],
      },
      {
        kind: "intuition",
        body: [
          "Every morning you wake up the same way: alarm (a pre-set trigger you arranged while awake), get dressed, then your own plans take over. A computer has a small permanent 'alarm routine' burned into a chip: the **firmware** (BIOS/UEFI).",
          "The firmware knows almost nothing — but it knows how to poke the memory awake, check the hardware (POST), find a boot device, and load the first stage of the OS from a fixed location. Each stage loads the next, slightly bigger and smarter, until the kernel takes over.",
        ],
      },
      {
        kind: "visual",
        simId: "boot-sequence",
        body: [
          "Step through the whole sequence in order and watch control pass from stage to stage. Each step explains what it can and cannot do yet.",
        ],
      },
      {
        kind: "experiment",
        simId: "boot-sequence",
        prompts: [
          "Step to the bootloader stage: why can it read the disk but still not juggle multiple programs?",
          "Predict what happens if no boot device is found, then step through and check.",
        ],
      },
      {
        kind: "technical",
        body: [
          "On a modern x86/UEFI machine: power-on → CPU starts at a fixed address in firmware → POST/self-test → UEFI reads partition tables or a boot entry → the **bootloader** (GRUB, systemd-boot…) loads the kernel image into memory → the kernel initializes subsystems (memory management, scheduling, drivers) → starts **PID 1** (init/systemd), which launches services and finally a login prompt. ARM/RISC-V boards follow the same shape with different stage names (e.g. U-Boot, SBI).",
          "The important concept: booting is a **chain of trust and capability** — each stage needs only enough skill to load and verify the next.",
        ],
      },
      {
        kind: "worked-example",
        steps: [
          {
            title: "What the firmware can and cannot do",
            body: [
              "It can: talk to a subset of devices via fixed routines, read simple structures from disk, load a blob into memory and jump to it.",
              "It cannot: multitask, protect processes, manage page tables for applications — all of that is the kernel's job once loaded.",
            ],
          },
          {
            title: "When the kernel is finally running",
            body: [
              "There is no magic switch: the kernel's first instructions set up its own stacks and page tables, then slowly replaces the firmware's helpers with real drivers.",
              "Only after mounting the root filesystem can it execute the first user program — which is why a damaged root filesystem stops a machine before any login screen.",
            ],
          },
        ],
      },
      {
        kind: "misconceptions",
        items: [
          {
            wrong: "The OS 'restarts' the hardware on boot.",
            right: "The hardware starts itself at a hardcoded address in firmware; the OS is found and loaded by that fixed process. The firmware is the alarm clock, not the OS.",
          },
          {
            wrong: "BIOS and bootloader are the same thing.",
            right: "Firmware (BIOS/UEFI) is on a chip and always runs first; the bootloader lives on your disk and is just the first file of the OS's startup chain.",
          },
        ],
      },
      {
        kind: "knowledge-check",
        questions: [
          {
            id: "kc-m0-boot-1",
            q: "What runs first when you press the power button?",
            options: [
              "Code at a fixed address in the motherboard's firmware",
              "The operating system kernel",
              "The first program on the disk",
              "Whichever device was fastest to answer",
            ],
            answerIndex: 0,
            explanation:
              "The CPU begins executing at a hardcoded firmware address — that is how it can then find anything else, including the disk's bootloader.",
          },
          {
            id: "kc-m0-boot-2",
            q: "Why does booting happen in several small stages?",
            options: [
              "Each stage only needs to be able to load and check the next one",
              "For backward compatibility with tape drives",
              "Because the kernel refuses to start alone",
              "To give the user time to press keys",
            ],
            answerIndex: 0,
            explanation:
              "A tiny first stage can fit in fixed firmware constraints; it loads a bigger stage, which loads the kernel. Capability grows stage by stage.",
          },
        ],
      },
      {
        kind: "references",
        items: [
          {
            label: "Linux kernel documentation: boot configuration",
            url: "https://docs.kernel.org/admin-guide/bootconfig.html",
          },
          {
            label: "UEFI specifications",
            url: "https://uefi.org/specifications",
          },
          {
            label: "OSTEP, Interlude: Virtual Machine",
            url: "https://pages.cs.wisc.edu/~remzi/OSTEP/vm-intro.pdf",
          },
        ],
      },
      {
        kind: "note",
        body: [
          "The boot stepper models the common UEFI → bootloader → kernel → init chain and is deliberately simplified: real firmware variants, Secure Boot verification, and initramfs unpacking are folded into single steps.",
        ],
      },
    ],
  },
];
