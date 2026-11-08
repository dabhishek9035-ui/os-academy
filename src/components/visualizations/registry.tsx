"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import { SIM_TITLES } from "@/data/curriculum/config";

/**
 * Registry of interactive simulations by id (referenced from lesson sections
 * and the playground). Each lab is client-only and lazy-loaded so heavy
 * modules never block first paint. Engines keep all state; these components
 * only render it and dispatch actions.
 */
export const SIM_REGISTRY: Record<string, ComponentType> = {
  "computer-diagram": dynamic(() => import("./ComputerDiagram").then((m) => m.ComputerDiagram), {
    loading: () => <SimPlaceholder label="Loading the anatomy explorer…" />,
  }),
  "boot-sequence": dynamic(() => import("./BootSequence").then((m) => m.BootSequence), {
    loading: () => <SimPlaceholder label="Loading the boot stepper…" />,
  }),
  "interrupt-lab": dynamic(() => import("./InterruptLab").then((m) => m.InterruptLab), {
    loading: () => <SimPlaceholder label="Loading the interrupt lab…" />,
  }),
  "polling-vs-interrupt": dynamic(() => import("./PollingVsInterrupt").then((m) => m.PollingVsInterrupt), {
    loading: () => <SimPlaceholder label="Loading the polling race…" />,
  }),
  "process-lab": dynamic(() => import("./ProcessesLab").then((m) => m.ProcessLab), {
    loading: () => <SimPlaceholder label="Loading the process lab…" />,
  }),
  "fork-wait-lab": dynamic(() => import("./ProcessesLab").then((m) => m.ForkWaitLab), {
    loading: () => <SimPlaceholder label="Loading the fork/wait lab…" />,
  }),
  "scheduling-lab": dynamic(() => import("./SchedulingLab").then((m) => m.SchedulingLab), {
    loading: () => <SimPlaceholder label="Loading the scheduling lab…" />,
  }),
  "race-condition-lab": dynamic(() => import("./ConcurrencyLabs").then((m) => m.RaceConditionLab), {
    loading: () => <SimPlaceholder label="Loading the race stepper…" />,
  }),
  "bounded-buffer-lab": dynamic(() => import("./ConcurrencyLabs").then((m) => m.BoundedBufferLab), {
    loading: () => <SimPlaceholder label="Loading the bounded buffer…" />,
  }),
  "memory-allocation-lab": dynamic(() => import("./MemoryAllocationLab").then((m) => m.MemoryAllocationLab), {
    loading: () => <SimPlaceholder label="Loading the memory lab…" />,
  }),
  "address-translation-lab": dynamic(() => import("./MemoryAllocationLab").then((m) => m.AddressTranslationLab), {
    loading: () => <SimPlaceholder label="Loading the translation lab…" />,
  }),
  "paging-lab": dynamic(() => import("./PagingLab").then((m) => m.PagingLab), {
    loading: () => <SimPlaceholder label="Loading the paging lab…" />,
  }),
  "page-replacement-lab": dynamic(() => import("./PageReplacementLab").then((m) => m.PageReplacementLab), {
    loading: () => <SimPlaceholder label="Loading the replacement lab…" />,
  }),
  "rag-lab": dynamic(() => import("./RagLab").then((m) => m.RagLab), {
    loading: () => <SimPlaceholder label="Loading the RAG lab…" />,
  }),
  "bankers-lab": dynamic(() => import("./BankersLab").then((m) => m.BankersLab), {
    loading: () => <SimPlaceholder label="Loading the Banker's lab…" />,
  }),
  "producer-consumer-lab": dynamic(() =>
    import("./ConcurrencyLabs").then((m) => {
      // Same semaphore mechanism as the bounded-buffer lab, framed as the
      // classic producer–consumer problem (its own intro and guidance).
      const ProducerConsumerVariant = () => (
        <m.BoundedBufferLab
          title="Producer–Consumer Lab"
          description="Semaphores in action: producers append items, consumers remove them, and the counters (empty/full/mutex) gate every move."
        />
      );
      ProducerConsumerVariant.displayName = "ProducerConsumerLab";
      return ProducerConsumerVariant;
    }), {
    loading: () => <SimPlaceholder label="Loading the producer-consumer lab…" />,
  }),
  "readers-writers-lab": dynamic(() => import("./SyncLabs").then((m) => m.ReadersWritersLab), {
    loading: () => <SimPlaceholder label="Loading the readers-writers lab…" />,
  }),
  "dining-philosophers-lab": dynamic(() => import("./SyncLabs").then((m) => m.DiningPhilosophersLab), {
    loading: () => <SimPlaceholder label="Loading the philosophers…" />,
  }),
  "filesystem-lab": dynamic(() => import("./StorageLabs").then((m) => m.FilesystemLab), {
    loading: () => <SimPlaceholder label="Loading the filesystem lab…" />,
  }),
  "disk-scheduling-lab": dynamic(() => import("./StorageLabs").then((m) => m.DiskSchedulingLab), {
    loading: () => <SimPlaceholder label="Loading the disk lab…" />,
  }),
  "io-transfer-lab": dynamic(() => import("./IoSyscallLabs").then((m) => m.IoTransferLab), {
    loading: () => <SimPlaceholder label="Loading the I/O lab…" />,
  }),
  "syscall-lab": dynamic(() => import("./IoSyscallLabs").then((m) => m.SyscallLab), {
    loading: () => <SimPlaceholder label="Loading the syscall lab…" />,
  }),
  "protection-lab": dynamic(() => import("./IoSyscallLabs").then((m) => m.ProtectionLab), {
    loading: () => <SimPlaceholder label="Loading the protection lab…" />,
  }),
  "virtualization-lab": dynamic(() => import("./VirtCapstoneLabs").then((m) => m.VirtualizationLab), {
    loading: () => <SimPlaceholder label="Loading the virtualization lab…" />,
  }),
  "multiproc-lab": dynamic(() => import("./VirtCapstoneLabs").then((m) => m.MultiprocLab), {
    loading: () => <SimPlaceholder label="Loading the multiprocessor lab…" />,
  }),
  "capstone-sim": dynamic(() => import("./VirtCapstoneLabs").then((m) => m.CapstoneLab), {
    loading: () => <SimPlaceholder label="Loading the capstone simulator…" />,
  }),
};

export function SimPlaceholder({ label }: { label: string }) {
  return (
    <div className="grid min-h-40 place-items-center rounded-lg border border-dashed border-line bg-bg-soft p-6 text-center text-sm text-ink-faint">
      {label}
    </div>
  );
}

export function getSimComponent(simId: string): ComponentType | null {
  return SIM_REGISTRY[simId] ?? null;
}

export function simTitle(simId: string): string {
  return SIM_TITLES[simId] ?? simId;
}
