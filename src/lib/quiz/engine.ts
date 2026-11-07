import type { QuizAttempt, QuizQuestion } from "@/types";

/** Percentage of questions that must be correct to pass (default 80%). */
export const PASSING_THRESHOLD = 0.8;
/** Questions per assessment attempt. */
export const QUESTIONS_PER_ATTEMPT = 10;

/** Small deterministic PRNG so tests can pin randomness. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface PreparedQuestion {
  /** Stable original question id (for grading and analytics). */
  id: string;
  moduleId: string;
  lessonRef: string;
  difficulty: QuizQuestion["difficulty"];
  kind: QuizQuestion["kind"];
  stem: string;
  options: string[];
  answerIndex: number;
  whyNot: (string | null)[];
  explanation: string;
}

function shuffle<T>(items: T[], rng: () => number): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Builds one attempt: selects `count` questions from the bank (shuffled) and
 * shuffles each question's answer options while remapping the answer index
 * and the per-option "why wrong" explanations.
 */
export function prepareAttempt(
  bank: QuizQuestion[],
  opts: { count?: number; seed?: number } = {},
): PreparedQuestion[] {
  const count = Math.min(opts.count ?? QUESTIONS_PER_ATTEMPT, bank.length);
  const rng = mulberry32(opts.seed ?? Math.floor(Math.random() * 2 ** 31));
  const chosen = shuffle(bank, rng).slice(0, count);
  return chosen.map((q) => {
    const perm = shuffle([0, 1, 2, 3], rng);
    return {
      id: q.id,
      moduleId: q.moduleId,
      lessonRef: q.lessonRef,
      difficulty: q.difficulty,
      kind: q.kind,
      stem: q.stem,
      options: perm.map((i) => q.options[i]),
      answerIndex: perm.indexOf(q.answerIndex),
      whyNot: perm.map((i) => q.whyNot[i]),
      explanation: q.explanation,
    };
  });
}

export interface GradedQuestion {
  id: string;
  chosen: number | null;
  correct: boolean;
}

export interface GradedAttempt {
  score: number;
  total: number;
  passed: boolean;
  perQuestion: GradedQuestion[];
}

export function gradeAttempt(
  prepared: PreparedQuestion[],
  answers: (number | null)[],
): GradedAttempt {
  const perQuestion: GradedQuestion[] = prepared.map((q, i) => ({
    id: q.id,
    chosen: answers[i] ?? null,
    correct: answers[i] === q.answerIndex,
  }));
  const score = perQuestion.filter((r) => r.correct).length;
  return {
    score,
    total: prepared.length,
    passed: prepared.length > 0 && score / prepared.length >= PASSING_THRESHOLD,
    perQuestion,
  };
}

/** Groups a bank by module id. */
export function bankByModule(bank: QuizQuestion[]): Record<string, QuizQuestion[]> {
  const out: Record<string, QuizQuestion[]> = {};
  for (const q of bank) {
    (out[q.moduleId] ??= []).push(q);
  }
  return out;
}

export function attemptFromGraded(
  prepared: PreparedQuestion[],
  graded: GradedAttempt,
): QuizAttempt {
  return {
    id: `${prepared[0]?.moduleId ?? "unknown"}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
    moduleId: prepared[0]?.moduleId ?? "unknown",
    takenAt: new Date().toISOString(),
    score: graded.score,
    total: graded.total,
    passed: graded.passed,
    questionIds: prepared.map((q) => q.id),
    answers: graded.perQuestion.map((r) => r.chosen),
  };
}
