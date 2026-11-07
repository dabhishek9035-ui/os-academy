import { describe, expect, it } from "vitest";
import {
  gradeAttempt,
  mulberry32,
  PASSING_THRESHOLD,
  prepareAttempt,
  QUESTIONS_PER_ATTEMPT,
} from "@/lib/quiz/engine";
import type { QuizQuestion } from "@/types";

function makeQuestion(i: number): QuizQuestion {
  return {
    id: `q${i}`,
    moduleId: "test",
    lessonRef: "test/lesson",
    difficulty: "medium",
    kind: "concept",
    stem: `Question ${i}?`,
    options: [`A${i}`, `B${i}`, `C${i}`, `D${i}`],
    answerIndex: 2,
    whyNot: [null, null, null, null].map((_, idx) =>
      idx === 2 ? null : `option ${idx} is wrong`,
    ) as QuizQuestion["whyNot"],
    explanation: "Because C.",
  };
}

describe("prepareAttempt", () => {
  it("returns exactly ten questions for a bank of twenty", () => {
    const bank = Array.from({ length: 20 }, (_, i) => makeQuestion(i));
    const attempt = prepareAttempt(bank, { seed: 1 });
    expect(attempt).toHaveLength(QUESTIONS_PER_ATTEMPT);
  });

  it("caps at the bank size when the bank is smaller", () => {
    const bank = Array.from({ length: 6 }, (_, i) => makeQuestion(i));
    expect(prepareAttempt(bank, { seed: 1 })).toHaveLength(6);
  });

  it("never loses the correct answer when shuffling options", () => {
    const bank = Array.from({ length: 20 }, (_, i) => makeQuestion(i));
    for (let seed = 0; seed < 50; seed += 1) {
      const attempt = prepareAttempt(bank, { seed, count: 10 });
      for (const q of attempt) {
        expect(q.options).toHaveLength(4);
        expect(q.whyNot).toHaveLength(4);
        expect(q.answerIndex).toBeGreaterThanOrEqual(0);
        expect(q.answerIndex).toBeLessThan(4);
        // answer mapping survived: the whyNot at answerIndex is null
        expect(q.whyNot[q.answerIndex]).toBeNull();
        expect(q.whyNot.filter((w) => w === null)).toHaveLength(1);
      }
    }
  });

  it("shuffles question order deterministically for a fixed seed", () => {
    const bank = Array.from({ length: 20 }, (_, i) => makeQuestion(i));
    const a = prepareAttempt(bank, { seed: 7 }).map((q) => q.id);
    const b = prepareAttempt(bank, { seed: 7 }).map((q) => q.id);
    expect(a).toEqual(b);
    const c = prepareAttempt(bank, { seed: 8 }).map((q) => q.id);
    expect(a).not.toEqual(c);
  });

  it("remaps whyNot together with options", () => {
    const q = makeQuestion(0); // answer "C0" at index 2
    const [prepared] = prepareAttempt([q], { seed: 3, count: 1 });
    expect(prepared.options[prepared.answerIndex]).toBe("C0");
    expect(prepared.whyNot[prepared.answerIndex]).toBeNull();
    // every non-answer slot explains why it is wrong
    prepared.whyNot.forEach((w, i) => {
      if (i !== prepared.answerIndex) expect(w).toContain("wrong");
    });
  });
});

describe("gradeAttempt", () => {
  const bank = Array.from({ length: 10 }, (_, i) => makeQuestion(i));
  const attempt = prepareAttempt(bank, { seed: 42, count: 10 });

  it("grades all-correct as a pass at the 80% threshold", () => {
    const answers = attempt.map((q) => q.answerIndex);
    const g = gradeAttempt(attempt, answers);
    expect(g.score).toBe(10);
    expect(g.passed).toBe(true);
  });

  it("passes at exactly 8/10 and fails at 7/10", () => {
    const all = attempt.map((q) => q.answerIndex);
    const eight = [...all.slice(0, 8), (all[8] + 1) % 4, (all[9] + 1) % 4];
    const seven = [...all.slice(0, 7), (all[7] + 1) % 4, (all[8] + 1) % 4, (all[9] + 1) % 4];
    expect(gradeAttempt(attempt, eight).passed).toBe(true);
    expect(gradeAttempt(attempt, seven).passed).toBe(false);
    expect(PASSING_THRESHOLD).toBe(0.8);
  });

  it("treats unanswered questions as wrong", () => {
    const answers: (number | null)[] = attempt.map((q) => q.answerIndex);
    answers[0] = null;
    const g = gradeAttempt(attempt, answers);
    expect(g.score).toBe(9);
  });
});

describe("mulberry32", () => {
  it("is deterministic and uniform enough", () => {
    const r1 = mulberry32(123);
    const r2 = mulberry32(123);
    const seq1 = [r1(), r1(), r1()];
    const seq2 = [r2(), r2(), r2()];
    expect(seq1).toEqual(seq2);
    for (const v of seq1) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});
