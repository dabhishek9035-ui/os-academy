import type { QuizQuestion } from "@/types";
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

const FILES: Record<string, { questions: QuizQuestion[] }> = {
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

/** Full question bank across all modules. */
export const ALL_QUESTIONS: QuizQuestion[] = MODULES.flatMap(
  (m) => FILES[m.id]?.questions ?? [],
);

export function questionsForModule(moduleId: string): QuizQuestion[] {
  return FILES[moduleId]?.questions ?? [];
}

/** questionId → lessonRef, used by weak-area analytics. */
export const QUESTION_LESSON_REFS: Record<string, string> =
  Object.fromEntries(ALL_QUESTIONS.map((q) => [q.id, q.lessonRef]));
