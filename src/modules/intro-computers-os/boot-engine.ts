import type { SimEvent, SimulationEngine } from "@/types";

/**
 * Boot sequence stepper — walks from power-on to the first user program.
 * A deliberately linear model: real firmware variants and Secure Boot are
 * folded into single stages (documented in the lesson note).
 */

export interface BootStage {
  id: string;
  name: string;
  /** What happens in this stage. */
  what: string;
  /** What this stage CAN do. */
  can: string[];
  /** What it CANNOT do yet — builds the capability-chain intuition. */
  cannot: string[];
  /** Where control came from / goes. */
  handsTo: string;
}

export const BOOT_STAGES: BootStage[] = [
  {
    id: "power",
    name: "Power-on",
    what: "The power supply stabilizes and the CPU resets to a fixed address hardcoded in the motherboard's firmware chip.",
    can: ["Run whatever code lives at its fixed reset address (the firmware)"],
    cannot: ["Find the disk", "Use the network", "Run any program you know about"],
    handsTo: "Firmware (UEFI/BIOS)",
  },
  {
    id: "firmware",
    name: "Firmware (UEFI/BIOS)",
    what: "The firmware wakes the memory, checks the hardware (POST), initializes a small set of devices, and looks for a boot device in its configured order.",
    can: ["Test RAM and basic devices", "Read simple structures from disk", "Load a bigger program into memory"],
    cannot: ["Multitask", "Protect processes from each other", "Understand filesystems deeply"],
    handsTo: "Bootloader",
  },
  {
    id: "bootloader",
    name: "Bootloader (GRUB / systemd-boot)",
    what: "The bootloader reads its menu, finds the kernel image on disk, loads it into memory, and can pass configuration to it.",
    can: ["Read partitions and files", "Load the kernel and optional initramfs", "Show a choice menu"],
    cannot: ["Run applications", "Manage virtual memory for programs", "Talk to most devices"],
    handsTo: "Kernel",
  },
  {
    id: "kernel",
    name: "Kernel initialization",
    what: "The kernel sets up its own page tables and stacks, starts its subsystems one by one (memory, scheduler, drivers), replaces firmware helpers with real drivers, and mounts the root filesystem.",
    can: ["Full hardware control", "Create processes", "Enforce protection"],
    cannot: ["Serve users yet — there is no login, no shell, no apps running"],
    handsTo: "Init (PID 1)",
  },
  {
    id: "init",
    name: "Init (PID 1)",
    what: "The kernel's first user process starts, launches system services, and finally presents a login prompt or graphical session.",
    can: ["Run user programs as processes", "Start/stop services", "Offer users a session"],
    cannot: ["Exist without the kernel below it — everything user-facing rests on the previous stages"],
    handsTo: "You (the user)",
  },
];

export interface BootState {
  stageIndex: number;
  /** Intra-stage progress for a sense of elapsed effort. */
  progress: number;
  done: boolean;
  eventLog: SimEvent[];
}

export type BootAction = "tick" | "reset";

export const bootEngine: SimulationEngine<BootState, BootAction> = {
  id: "boot-sequence",
  initialState() {
    return {
      stageIndex: 0,
      progress: 0,
      done: false,
      eventLog: [
        { time: 0, kind: "boot", label: "Power button pressed.", severity: "info" },
      ],
    };
  },

  step(state, action) {
    switch (action.type) {
      case "tick": {
        if (state.done) return state;
        const progress = state.progress + 0.25;
        if (progress < 1) {
          return { ...state, progress };
        }
        const stageIndex = state.stageIndex + 1;
        if (stageIndex >= BOOT_STAGES.length) {
          return {
            ...state,
            progress: 1,
            done: true,
            eventLog: [
              ...state.eventLog.slice(-98),
              { time: state.stageIndex + 1, kind: "boot", label: "Login prompt reached — the OS is fully up.", severity: "ok" },
            ],
          };
        }
        const stage = BOOT_STAGES[stageIndex];
        return {
          stageIndex,
          progress: 0,
          done: false,
          eventLog: [
            ...state.eventLog.slice(-98),
            {
              time: stageIndex,
              kind: "boot-stage",
              label: `Control handed to: ${stage.name}. ${stage.what}`,
              severity: "ok",
            },
          ],
        };
      }
      case "reset":
        return bootEngine.initialState();
      default:
        return state;
    }
  },

  explain(state) {
    const stage = BOOT_STAGES[Math.min(state.stageIndex, BOOT_STAGES.length - 1)];
    if (state.done) return "Boot complete — a user could log in now.";
    return `Stage ${state.stageIndex + 1}/${BOOT_STAGES.length}: ${stage.name} — ${stage.handsTo} comes next.`;
  },
};
