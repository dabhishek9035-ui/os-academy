import type { Lesson, ModuleDef } from "@/types";
import { MODULES, CURRICULUM_LESSON_IDS, LESSON_TITLES } from "./config";
import * as m0 from "./lessons/intro-computers-os";
import * as m1 from "./lessons/interrupts";
import * as m2 from "./lessons/processes";
import * as m3 from "./lessons/cpu-scheduling";
import * as m4 from "./lessons/threads-concurrency";
import * as m5 from "./lessons/memory-management";
import * as m6 from "./lessons/virtual-memory";
import * as m7 from "./lessons/deadlocks";
import * as m8 from "./lessons/synchronization";
import * as m9 from "./lessons/filesystems";
import * as m10 from "./lessons/io-systems";
import * as m11 from "./lessons/syscalls-security";
import * as m12 from "./lessons/virtualization";
import * as m13 from "./lessons/capstone";

const LESSON_FILES: Record<string, { lessons: Lesson[] }> = {
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

/** All lessons in curriculum order. */
export const ALL_LESSONS: Lesson[] = MODULES.flatMap(
  (m) => LESSON_FILES[m.id]?.lessons ?? [],
);

const LESSON_MAP: Record<string, Lesson> = Object.fromEntries(
  ALL_LESSONS.map((l) => [l.id, l]),
);

export function lessonsForModule(moduleId: string): Lesson[] {
  return (
    LESSON_FILES[moduleId]?.lessons ?? []
  ).slice()
}

export function lessonById(id: string): Lesson | undefined {
  return LESSON_MAP[id];
}

export function moduleOfLesson(lessonId: string): string {
  return lessonId.split("/")[0];
}

/** Next lesson in the global curriculum order, or null. */
export function nextLesson(id: string): Lesson | null {
  const idx = ALL_LESSONS.findIndex((l) => l.id === id);
  if (idx < 0 || idx + 1 >= ALL_LESSONS.length) return null;
  return ALL_LESSONS[idx + 1];
}

export function prevLesson(id: string): Lesson | null {
  const idx = ALL_LESSONS.findIndex((l) => l.id === id);
  if (idx <= 0) return null;
  return ALL_LESSONS[idx - 1];
}

/** Ordered lesson ids per module from the registry (used for navigation). */
export function lessonIdsForModule(moduleId: string): string[] {
  return CURRICULUM_LESSON_IDS[moduleId] ?? [];
}

export function lessonTitle(id: string): string {
  return LESSON_TITLES[id] ?? id;
}

export type { ModuleDef };
