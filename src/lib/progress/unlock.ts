import type { ModuleDef, QuizQuestion } from "@/types";

/** A module is unlocked when every prerequisite module has been passed. */
export function isModuleUnlocked(
  module: ModuleDef,
  progress: Pick<ProgressStateV1Like, "modules">,
): boolean {
  return module.prereqIds.every((pid) => progress.modules[pid]?.passed === true);
}

export function isModulePassed(
  progress: Pick<ProgressStateV1Like, "modules">,
  moduleId: string,
): boolean {
  return progress.modules[moduleId]?.passed === true;
}

/** Minimal structural type so callers can pass the store state or a snapshot. */
export interface ProgressStateV1Like {
  modules: Record<
    string,
    { lessonsDone: string[]; attempts: { questionIds: string[]; answers: (number | null)[] }[]; bestScore: number; passed: boolean }
  >;
}

export interface WeakArea {
  lessonRef: string;
  moduleId: string;
  wrong: number;
  answered: number;
}

/**
 * Derives weak lessons from recorded quiz attempts: lessons whose questions
 * were answered wrong most often. Correctness is recomputed here from the
 * question bank, so the analysis stays honest even if the UI changed.
 */
export function deriveWeakAreas(
  progress: Pick<ProgressStateV1Like, "modules">,
  questionsById: Record<string, QuizQuestion>,
  limit = 6,
): WeakArea[] {
  const stats = new Map<string, WeakArea>();
  for (const mp of Object.values(progress.modules)) {
    for (const attempt of mp.attempts) {
      attempt.questionIds.forEach((qid, i) => {
        const q = questionsById[qid];
        const chosen = attempt.answers[i];
        if (!q || chosen === null || chosen === undefined) return;
        const entry =
          stats.get(q.lessonRef) ??
          ({ lessonRef: q.lessonRef, moduleId: q.moduleId, wrong: 0, answered: 0 } as WeakArea);
        entry.answered += 1;
        if (chosen !== q.answerIndex) entry.wrong += 1;
        stats.set(q.lessonRef, entry);
      });
    }
  }
  return [...stats.values()]
    .filter((s) => s.wrong > 0)
    .sort((a, b) => b.wrong - a.wrong || b.answered - a.answered)
    .slice(0, limit);
}

/**
 * Overall course completion in percent: per module, lessons count for 50%
 * and passing the assessment for the other 50%.
 */
export function courseCompletion(
  modules: ModuleDef[],
  progress: Pick<ProgressStateV1Like, "modules">,
  lessonCounts: Record<string, number>,
): number {
  if (modules.length === 0) return 0;
  let total = 0;
  for (const m of modules) {
    const mp = progress.modules[m.id];
    const lessons = lessonCounts[m.id] ?? 0;
    const lessonScore = lessons > 0 ? (mp?.lessonsDone.length ?? 0) / lessons : 0;
    total += Math.min(1, lessonScore) * 0.5 + (mp?.passed ? 0.5 : 0);
  }
  return total / modules.length;
}
