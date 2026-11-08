/**
 * MCQ presentation-order tests.
 *
 * The content banks author the correct answer in position A almost always;
 * the renderer permutes options deterministically per question id. These
 * tests run over the REAL lesson data and assert what must never break:
 *  - the correct OPTION TEXT is preserved (position may move, meaning may not);
 *  - every option survives exactly once (a permutation, no loss/duplication);
 *  - the same question always presents the same order (determinism);
 *  - correct answers are not clustered at position A anymore.
 */
import { describe, expect, it } from "vitest";
import { ALL_LESSONS } from "@/data/curriculum/lessons";
import { presentMcq, seededOrder, type McqView } from "@/lib/mcq/shuffle";
import type { CheckQuestion } from "@/types";

function collectQuestions(): CheckQuestion[] {
  const out: CheckQuestion[] = [];
  for (const lesson of ALL_LESSONS) {
    for (const section of lesson.sections) {
      if (section.kind === "knowledge-check") out.push(...section.questions);
    }
  }
  return out;
}

describe("mcq presentation order (real lesson data)", () => {
  const questions = collectQuestions();

  it("every knowledge-check question gets a valid permutation that preserves the answer text", () => {
    expect(questions.length).toBeGreaterThan(100); // the data we know exists
    for (const q of questions) {
      const presented = presentMcq(q as McqView);
      expect(presented.options).toHaveLength(q.options.length);
      // Permutation: same options, no loss, no duplication.
      expect([...presented.options].sort()).toEqual([...q.options].sort());
      // The answer index now points at the SAME TEXT as the original answer.
      expect(presented.options[presented.answerIndex]).toBe(q.options[q.answerIndex]);
      // Explanation untouched.
      expect(presented.explanation).toBe(q.explanation);
    }
  });

  it("is deterministic for a given question id", () => {
    for (const q of questions.slice(0, 20)) {
      expect(seededOrder(q.id, 4)).toEqual(seededOrder(q.id, 4));
      expect(presentMcq(q as McqView).options).toEqual(presentMcq(q as McqView).options);
    }
  });

  it("correct answers are no longer clustered at option A", () => {
    const atZero = questions.filter((q) => presentMcq(q as McqView).answerIndex === 0);
    // All 112 questions authored the answer at index 0; after shuffling the
    // expected share is ~25%. A cluster above 60% would mean the shuffle
    // regressed to the authored bias.
    expect(atZero.length / questions.length).toBeLessThan(0.6);
    // And every position actually occurs somewhere in the course.
    const positions = new Set(questions.map((q) => presentMcq(q as McqView).answerIndex));
    expect(positions).toEqual(new Set([0, 1, 2, 3]));
  });
});

describe("seededOrder (synthetic distribution)", () => {
  it("spreads permutations across 200 distinct seeds", () => {
    const firstSlotCounts = [0, 0, 0, 0];
    for (let i = 0; i < 200; i += 1) {
      const order = seededOrder(`question-${i}`, 4);
      expect([...order].sort((a, b) => a - b)).toEqual([0, 1, 2, 3]);
      firstSlotCounts[order[0]] += 1;
    }
    // Uniform-ish: no slot may dominate (expected 50, allow 90).
    for (const count of firstSlotCounts) {
      expect(count).toBeLessThan(90);
      expect(count).toBeGreaterThan(10);
    }
  });
});
