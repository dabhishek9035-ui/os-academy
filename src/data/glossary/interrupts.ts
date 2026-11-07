import type { GlossaryEntry } from "@/types";

/** Glossary — module 1 (Interrupts, Exceptions & Traps). */
export const entries: GlossaryEntry[] = [
  {
    id: "interrupt",
    term: "Interrupt",
    simple: "A hardware signal that makes the CPU pause its work, run a handler, and continue where it left off.",
    technical:
      "An asynchronous event raised by a device or controller; the CPU completes the current instruction, saves PC and status, vectors to a registered handler in kernel mode, then restores state and resumes.",
    example:
      "Pressing a key raises an interrupt; the keyboard handler stores the character and your video keeps playing.",
    related: ["interrupt-handler", "interrupt-controller", "trap", "exception", "kernel"],
    moduleId: "interrupts",
    lessonRef: "interrupts/why-interrupts",
    simId: "interrupt-lab",
    refUrl: "https://pages.cs.wisc.edu/~remzi/OSTEP/cpu-mechanisms.pdf",
    refLabel: "OSTEP ch. 6: Limited Direct Execution",
  },
  {
    id: "irq",
    term: "IRQ",
    fullForm: "Interrupt ReQuest",
    simple: "The request line (or number) a device uses to ask the CPU for attention.",
    technical:
      "A physical interrupt line or logical interrupt number asserted by a device; the number often doubles as the index into the interrupt vector table.",
    example: "A keyboard wired to IRQ 1 raises that line whenever a key is pressed.",
    related: ["interrupt", "interrupt-controller", "ivt"],
    moduleId: "interrupts",
    lessonRef: "interrupts/why-interrupts",
  },
  {
    id: "exception",
    term: "Exception",
    simple: "An event caused by the running instruction itself — like dividing by zero — rather than by a device.",
    technical:
      "A synchronous trap arising from instruction execution (faults, illegal opcodes, breakpoints); distinguished from asynchronous device interrupts, though both use the same save-and-vector machinery.",
    example:
      "A program dividing by zero raises an exception; the kernel's handler typically terminates it with an error.",
    related: ["trap", "interrupt", "system-call", "kernel"],
    moduleId: "interrupts",
    lessonRef: "interrupts/why-interrupts",
  },
  {
    id: "interrupt-handler",
    term: "Interrupt handler",
    simple: "The short routine the CPU runs to service one kind of interrupt.",
    technical:
      "Also called an ISR (interrupt service routine); registered per interrupt source at boot, it acknowledges the device, moves the data, and returns via a special restore-and-resume instruction.",
    example:
      "The timer handler ticks the OS clock; the keyboard handler copies the key code into a buffer.",
    related: ["interrupt", "ivt", "interrupt-latency", "interrupt-controller"],
    moduleId: "interrupts",
    lessonRef: "interrupts/interrupt-lifecycle",
    simId: "interrupt-lab",
  },
  {
    id: "interrupt-controller",
    term: "Interrupt controller",
    simple: "The hardware 'receptionist' that collects device requests, sorts them by urgency, and signals the CPU.",
    technical:
      "Hardware (e.g. legacy PIC, modern APIC/GIC) that receives IRQs, resolves priorities, latches pending requests while masked, and delivers one request to the CPU at a time.",
    example:
      "When the disk and keyboard fire at once, the controller delivers the higher-priority one first.",
    related: ["irq", "interrupt-priority", "masking", "interrupt"],
    moduleId: "interrupts",
    lessonRef: "interrupts/priorities-masking",
    simId: "interrupt-lab",
  },
  {
    id: "ivt",
    term: "Interrupt vector table",
    simple: "The OS-filled array that maps each interrupt number to the address of its handler.",
    technical:
      "An array of handler entry points indexed by interrupt/exception number; the OS populates it at boot so hardware can dispatch to the right code without searching.",
    example:
      "Interrupt number 32 indexes an entry holding the address of the timer handler.",
    related: ["interrupt-handler", "interrupt", "exception"],
    moduleId: "interrupts",
    lessonRef: "interrupts/interrupt-lifecycle",
  },
  {
    id: "interrupt-latency",
    term: "Interrupt latency",
    simple: "How long it takes from a device's signal to the first instruction of the handler.",
    technical:
      "The interval from interrupt assertion to handler entry: time to complete the current instruction, save PC/status and switch mode, plus the vector-table dispatch. Event-processing delay adds the handler and restore time on top.",
    example:
      "Signal during a 2-cycle-remaining instruction with 4-cycle save and 2-cycle vector: latency = 8 cycles.",
    related: ["interrupt-handler", "interrupt-controller", "context-switch", "masking"],
    moduleId: "interrupts",
    lessonRef: "interrupts/interrupt-lifecycle",
    simId: "interrupt-lab",
  },
  {
    id: "polling",
    term: "Polling",
    simple: "Repeatedly asking a device 'ready yet?' instead of waiting to be told.",
    technical:
      "A busy-wait loop reading a device status register until it reports readiness; CPU cost is proportional to the number and frequency of checks, independent of when the device becomes ready.",
    example:
      "Checking the oven every 30 seconds for bread that takes 10 minutes — 19 wasted trips.",
    related: ["interrupt", "interrupt-latency", "cpu"],
    moduleId: "interrupts",
    lessonRef: "interrupts/polling-vs-interrupts",
    simId: "polling-vs-interrupt",
  },
  {
    id: "interrupt-priority",
    term: "Interrupt priority",
    simple: "The urgency ranking that decides which pending interrupt is handled first.",
    technical:
      "A per-source level resolved by the interrupt controller; in this course a smaller number means more urgent, and a higher-urgency arrival may preempt a lower-urgency handler (nested interrupts).",
    example:
      "A power-fail alert (priority 1) preempts a disk handler (priority 3); a mouse event (priority 7) waits for both.",
    related: ["interrupt-controller", "masking", "nmi", "interrupt"],
    moduleId: "interrupts",
    lessonRef: "interrupts/priorities-masking",
    simId: "interrupt-lab",
  },
  {
    id: "masking",
    term: "Masking",
    simple: "Temporarily telling the CPU 'do not disturb' so certain interrupts wait outside.",
    technical:
      "Disabling delivery of maskable interrupts (per source or CPU-wide via a status flag) around critical sections; masked requests stay pending at the controller and are delivered when unmasked — delayed, not discarded.",
    example:
      "The kernel masks interrupts for the few instructions that update its ready queue, then unmasks.",
    related: ["maskable", "nmi", "interrupt-controller", "interrupt-priority"],
    moduleId: "interrupts",
    lessonRef: "interrupts/priorities-masking",
    simId: "interrupt-lab",
  },
  {
    id: "maskable",
    term: "Maskable interrupt",
    simple: "An interrupt that can be told to wait while critical code runs.",
    technical:
      "An interrupt source whose delivery can be inhibited by the CPU's interrupt-disable state or a controller enable bit; the standard mechanism protecting kernel critical sections.",
    example:
      "Keyboard and timer interrupts are maskable; the OS silences them briefly during scheduler bookkeeping.",
    related: ["masking", "nmi", "interrupt"],
    moduleId: "interrupts",
    lessonRef: "interrupts/priorities-masking",
  },
  {
    id: "nmi",
    term: "NMI",
    fullForm: "Non-Maskable Interrupt",
    simple: "The fire alarm of interrupts — so urgent it cannot be silenced, even by masking.",
    technical:
      "An interrupt line outside the mask mechanism, reserved for events like impending power failure, hardware errors or watchdogs; delivered even when maskable interrupts are disabled.",
    example:
      "A server's power supply warning arrives as an NMI so the OS can flush data before shutdown.",
    related: ["maskable", "masking", "exception", "interrupt"],
    moduleId: "interrupts",
    lessonRef: "interrupts/priorities-masking",
  },
];
