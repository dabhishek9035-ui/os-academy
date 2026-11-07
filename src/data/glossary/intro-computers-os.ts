import type { GlossaryEntry } from "@/types";

/** Glossary — module 0 (Computers & Operating Systems). */
export const entries: GlossaryEntry[] = [
  {
    id: "cpu",
    term: "CPU",
    fullForm: "Central Processing Unit",
    simple: "The part of the computer that actually executes instructions, one at a time per core.",
    technical:
      "The processor core that performs the fetch–decode–execute cycle over instructions held in memory; the executor of all program code.",
    example: "When you click 'render video', the CPU runs millions of instructions that transform the pixel data.",
    related: ["process", "kernel", "ram"],
    moduleId: "intro-computers-os",
    lessonRef: "intro-computers-os/what-is-a-computer",
    simId: "computer-diagram",
  },
  {
    id: "ram",
    term: "RAM",
    fullForm: "Random Access Memory",
    simple: "The computer's fast, temporary working memory that forgets everything at power-off.",
    technical:
      "Volatile byte-addressable memory with near-uniform access time; the workspace the CPU reads and writes directly.",
    example: "An open photo lives in RAM while you edit it; 'saving' copies it to persistent storage.",
    related: ["cpu", "virtual-address", "page"],
    moduleId: "intro-computers-os",
    lessonRef: "intro-computers-os/what-is-a-computer",
    simId: "computer-diagram",
  },
  {
    id: "operating-system",
    term: "Operating system",
    simple: "The manager program that shares the hardware between programs and protects them from each other.",
    technical:
      "System software that virtualizes hardware resources (CPU, memory, devices), provides abstractions (processes, files), and enforces protection.",
    example: "Windows, Linux, macOS and Android are operating systems.",
    related: ["kernel", "process", "system-call"],
    moduleId: "intro-computers-os",
    lessonRef: "intro-computers-os/why-an-os",
  },
  {
    id: "kernel",
    term: "Kernel",
    simple: "The core of the operating system — the only code allowed full control of the hardware.",
    technical:
      "The privileged component of the OS running in kernel mode, implementing scheduling, memory management, drivers, filesystems and syscall handling.",
    example: "Linux is a kernel; Ubuntu is Linux plus thousands of user-space programs around it.",
    related: ["operating-system", "user-mode", "system-call"],
    moduleId: "intro-computers-os",
    lessonRef: "intro-computers-os/kernel-user-space",
    refUrl: "https://docs.kernel.org/",
    refLabel: "Linux kernel docs",
  },
  {
    id: "user-mode",
    term: "User space / user mode",
    simple: "The restricted world where ordinary apps run, kept away from dangerous hardware powers.",
    technical:
      "The CPU privilege level (RISC-V U, x86 ring 3) in which privileged instructions fault; applications run here and reach the kernel only via system calls.",
    example: "Your browser runs in user mode; it must ask the kernel to open a file.",
    related: ["kernel", "system-call", "trap"],
    moduleId: "intro-computers-os",
    lessonRef: "intro-computers-os/kernel-user-space",
  },
  {
    id: "system-call",
    term: "System call",
    simple: "A polite, numbered request from a program asking the kernel to do something it cannot do itself.",
    technical:
      "The controlled trap-based interface (e.g. read, write, fork) by which user code invokes kernel services; specified by POSIX for Unix-like systems.",
    example: "printf() ultimately issues the write() system call to put bytes on the screen.",
    related: ["trap", "kernel", "user-mode"],
    moduleId: "intro-computers-os",
    lessonRef: "intro-computers-os/kernel-user-space",
    refUrl: "https://man7.org/linux/man-pages/man2/syscalls.2.html",
    refLabel: "man7 syscalls(2)",
  },
  {
    id: "trap",
    term: "Trap",
    simple: "The hardware-controlled jump that hands control from user code into the kernel.",
    technical:
      "A synchronous privilege transition caused by an instruction (syscall) or fault, saving state and vectoring to a kernel-registered handler.",
    example: "Dividing by zero traps: the kernel's handler kills the offending process.",
    related: ["interrupt", "system-call", "kernel"],
    moduleId: "intro-computers-os",
    lessonRef: "intro-computers-os/kernel-user-space",
  },
  {
    id: "firmware",
    term: "Firmware",
    simple: "Small permanent software on a chip that wakes the machine up and finds the OS.",
    technical:
      "Persistent code (BIOS/UEFI, U-Boot) executing at power-on to initialize hardware and load a bootloader from a boot device.",
    example: "The logo screen you see before an OS loads is the firmware working.",
    related: ["booting", "bootloader"],
    moduleId: "intro-computers-os",
    lessonRef: "intro-computers-os/booting",
  },
  {
    id: "bootloader",
    term: "Bootloader",
    simple: "The first piece of the OS that runs; its whole job is loading the kernel.",
    technical:
      "A program (GRUB, systemd-boot) loaded by firmware that locates, optionally verifies, and transfers control to the OS kernel image.",
    example: "GRUB's menu letting you choose Linux or Windows is a bootloader at work.",
    related: ["firmware", "booting", "kernel"],
    moduleId: "intro-computers-os",
    lessonRef: "intro-computers-os/booting",
    simId: "boot-sequence",
  },
  {
    id: "booting",
    term: "Booting",
    simple: "The wake-up sequence from power-on to a working OS.",
    technical:
      "The staged startup chain: firmware POST → bootloader → kernel initialization → first user process (init/PID 1).",
    example: "Each boot stage can only do one thing well: find and start the next stage.",
    related: ["firmware", "bootloader", "kernel"],
    moduleId: "intro-computers-os",
    lessonRef: "intro-computers-os/booting",
    simId: "boot-sequence",
  },
  {
    id: "virtualization-os",
    term: "Virtualization (OS sense)",
    simple: "Giving every program the illusion it has the whole machine to itself.",
    technical:
      "The OS technique of multiplexing physical resources: time-sharing the CPU (scheduling) and space-sharing memory (virtual memory).",
    example: "Twenty processes each 'think' they own a CPU; the scheduler gives each a turn.",
    related: ["process", "virtual-address", "cpu-scheduling"],
    moduleId: "intro-computers-os",
    lessonRef: "intro-computers-os/why-an-os",
  },
];
