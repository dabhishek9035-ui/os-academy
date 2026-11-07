import type { ConceptEdge, ConceptNode, GlossaryEntry } from "@/types";
import { MODULES } from "../curriculum/config";
import * as m0 from "./intro-computers-os";
import * as m1 from "./interrupts";
import * as m2 from "./processes";
import * as m3 from "./cpu-scheduling";
import * as m4 from "./threads-concurrency";
import * as m5 from "./memory-management";
import * as m6 from "./virtual-memory";
import * as m7 from "./deadlocks";
import * as m8 from "./synchronization";
import * as m9 from "./filesystems";
import * as m10 from "./io-systems";
import * as m11 from "./syscalls-security";
import * as m12 from "./virtualization";
import * as m13 from "./capstone";

const FILES: Record<string, { entries: GlossaryEntry[] }> = {
  "intro-computers-os": m0,
  interrupts: m1,
  processes: m2,
  "cpu-scheduling": m3,
  "threads-concurrency": m4,
  "memory-management": m5,
  "virtual-memory": m6,
  deadlocks: m7,
  synchronization: m8,
  filesystems: m9,
  "io-systems": m10,
  "syscalls-security": m11,
  virtualization: m12,
  capstone: m13,
};

export const ALL_GLOSSARY: GlossaryEntry[] = MODULES.flatMap(
  (m) => FILES[m.id]?.entries ?? [],
);

const GLOSSARY_MAP: Record<string, GlossaryEntry> = Object.fromEntries(
  ALL_GLOSSARY.map((g) => [g.id, g]),
);

export function glossaryById(id: string): GlossaryEntry | undefined {
  return GLOSSARY_MAP[id];
}

/**
 * Concept graph for the explorer: nodes are key concepts, edges express
 * "builds on" / "feeds into" relationships across the curriculum.
 */
export const CONCEPT_NODES: ConceptNode[] = [
  { id: "cpu", label: "CPU", moduleId: "intro-computers-os", glossaryId: "cpu" },
  { id: "kernel", label: "Kernel", moduleId: "intro-computers-os", glossaryId: "kernel" },
  { id: "user-mode", label: "User mode", moduleId: "intro-computers-os", glossaryId: "user-mode" },
  { id: "boot", label: "Booting", moduleId: "intro-computers-os", glossaryId: "booting" },
  { id: "interrupt", label: "Interrupt", moduleId: "interrupts", glossaryId: "interrupt" },
  { id: "trap", label: "Trap", moduleId: "interrupts", glossaryId: "trap" },
  { id: "process", label: "Process", moduleId: "processes", glossaryId: "process" },
  { id: "pcb", label: "PCB", moduleId: "processes", glossaryId: "pcb" },
  { id: "context-switch", label: "Context switch", moduleId: "processes", glossaryId: "context-switch" },
  { id: "syscall", label: "System call", moduleId: "syscalls-security", glossaryId: "system-call" },
  { id: "scheduling", label: "CPU scheduling", moduleId: "cpu-scheduling", glossaryId: "cpu-scheduling" },
  { id: "ready-queue", label: "Ready queue", moduleId: "cpu-scheduling", glossaryId: "ready-queue" },
  { id: "thread", label: "Thread", moduleId: "threads-concurrency", glossaryId: "thread" },
  { id: "race-condition", label: "Race condition", moduleId: "threads-concurrency", glossaryId: "race-condition" },
  { id: "mutex", label: "Mutex", moduleId: "synchronization", glossaryId: "mutex" },
  { id: "semaphore", label: "Semaphore", moduleId: "synchronization", glossaryId: "semaphore" },
  { id: "deadlock", label: "Deadlock", moduleId: "deadlocks", glossaryId: "deadlock" },
  { id: "virtual-address", label: "Virtual address", moduleId: "memory-management", glossaryId: "virtual-address" },
  { id: "fragmentation", label: "Fragmentation", moduleId: "memory-management", glossaryId: "fragmentation" },
  { id: "page", label: "Page", moduleId: "virtual-memory", glossaryId: "page" },
  { id: "page-fault", label: "Page fault", moduleId: "virtual-memory", glossaryId: "page-fault" },
  { id: "tlb", label: "TLB", moduleId: "virtual-memory", glossaryId: "tlb" },
  { id: "inode", label: "Inode", moduleId: "filesystems", glossaryId: "inode" },
  { id: "filesystem", label: "Filesystem", moduleId: "filesystems", glossaryId: "filesystem" },
  { id: "dma", label: "DMA", moduleId: "io-systems", glossaryId: "dma" },
  { id: "buffering", label: "Buffering", moduleId: "io-systems", glossaryId: "buffering" },
  { id: "hypervisor", label: "Hypervisor", moduleId: "virtualization", glossaryId: "hypervisor" },
  { id: "container", label: "Container", moduleId: "virtualization", glossaryId: "container" },
];

export const CONCEPT_EDGES: ConceptEdge[] = [
  { from: "boot", to: "kernel", label: "loads the" },
  { from: "cpu", to: "interrupt", label: "notified by" },
  { from: "interrupt", to: "kernel", label: "handled in" },
  { from: "trap", to: "syscall", label: "enters via" },
  { from: "syscall", to: "kernel", label: "requests services from" },
  { from: "kernel", to: "process", label: "manages" },
  { from: "process", to: "pcb", label: "described by a" },
  { from: "process", to: "context-switch", label: "switched via" },
  { from: "interrupt", to: "context-switch", label: "can trigger a" },
  { from: "context-switch", to: "scheduling", label: "decided by" },
  { from: "ready-queue", to: "scheduling", label: "feeds" },
  { from: "process", to: "thread", label: "contains" },
  { from: "thread", to: "race-condition", label: "share memory →" },
  { from: "race-condition", to: "mutex", label: "prevented by a" },
  { from: "mutex", to: "semaphore", label: "generalizes to a" },
  { from: "semaphore", to: "deadlock", label: "misused →" },
  { from: "process", to: "virtual-address", label: "sees memory as" },
  { from: "virtual-address", to: "fragmentation", label: "allocation causes" },
  { from: "virtual-address", to: "page", label: "translated via" },
  { from: "page", to: "tlb", label: "cached in the" },
  { from: "page", to: "page-fault", label: "missing →" },
  { from: "page-fault", to: "buffering", label: "I/O fills memory via" },
  { from: "process", to: "filesystem", label: "stores data in a" },
  { from: "filesystem", to: "inode", label: "described by an" },
  { from: "filesystem", to: "dma", label: "transfers blocks via" },
  { from: "dma", to: "interrupt", label: "completes with an" },
  { from: "kernel", to: "hypervisor", label: "hosted by / coexists with a" },
  { from: "hypervisor", to: "container", label: "alternative:" },
  { from: "syscall", to: "container", label: "interposed by" },
];
