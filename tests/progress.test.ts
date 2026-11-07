import { beforeEach, describe, expect, it } from "vitest";
import { useProgressStore, emptyModuleProgress } from "@/lib/progress/store";
import {
  courseCompletion,
  deriveWeakAreas,
  isModuleUnlocked,
} from "@/lib/progress/unlock";
import { MODULES } from "@/data/curriculum/config";
import { ALL_QUESTIONS } from "@/data/questions";
import type { QuizAttempt } from "@/types";

function attempt(
  moduleId: string,
  score: number,
  total: number,
  questionIds: string[] = [],
  answers: (number | null)[] = [],
): QuizAttempt {
  return {
    id: `${moduleId}-${Math.random()}`,
    moduleId,
    takenAt: new Date().toISOString(),
    score,
    total,
    passed: score / total >= 0.8,
    questionIds,
    answers,
  };
}

beforeEach(() => {
  useProgressStore.setState({ ...emptyModuleProgress(), modules: {}, activity: [] });
});

describe("unlock logic", () => {
  it("unlocks the first module with no prerequisites", () => {
    const m0 = MODULES.find((m) => m.id === "intro-computers-os")!;
    expect(isModuleUnlocked(m0, { modules: {} })).toBe(true);
  });

  it("locks a module until its prerequisite is passed", () => {
    const interrupts = MODULES.find((m) => m.id === "interrupts")!;
    expect(isModuleUnlocked(interrupts, { modules: {} })).toBe(false);
    expect(
      isModuleUnlocked(interrupts, {
        modules: { "intro-computers-os": { ...emptyModuleProgress(), passed: true } },
      }),
    ).toBe(true);
    expect(
      isModuleUnlocked(interrupts, {
        modules: { "intro-computers-os": { ...emptyModuleProgress(), passed: false, bestScore: 0.5 } },
      }),
    ).toBe(false); // high score alone is not a pass
  });
});

describe("progress store", () => {
  it("marks lessons done once and records activity", () => {
    const s = useProgressStore.getState();
    s.markLessonDone("interrupts", "interrupts/why-interrupts", "Why Interrupts Exist");
    s.markLessonDone("interrupts", "interrupts/why-interrupts", "Why Interrupts Exist");
    const mp = useProgressStore.getState().modules["interrupts"];
    expect(mp.lessonsDone).toEqual(["interrupts/why-interrupts"]);
    expect(useProgressStore.getState().activity.filter((a) => a.kind === "lesson")).toHaveLength(1);
  });

  it("records attempts, keeps best score, and flips passed on first pass", () => {
    const s = useProgressStore.getState();
    s.recordAttempt(attempt("interrupts", 5, 10));
    const afterFail = useProgressStore.getState().modules["interrupts"];
    expect(afterFail.passed).toBe(false);
    expect(afterFail.bestScore).toBeCloseTo(0.5);

    s.recordAttempt(attempt("interrupts", 9, 10));
    const afterPass = useProgressStore.getState().modules["interrupts"];
    expect(afterPass.passed).toBe(true);
    expect(afterPass.bestScore).toBeCloseTo(0.9);
    expect(afterPass.attempts).toHaveLength(2);
  });

  it("caps the activity log", () => {
    const s = useProgressStore.getState();
    for (let i = 0; i < 80; i += 1) {
      s.recordAttempt(attempt("interrupts", i % 11, 10));
    }
    expect(useProgressStore.getState().activity.length).toBeLessThanOrEqual(60);
  });

  it("resetProgress clears modules but logs the reset", () => {
    const s = useProgressStore.getState();
    s.recordAttempt(attempt("interrupts", 10, 10));
    s.resetProgress();
    const state = useProgressStore.getState();
    expect(Object.keys(state.modules)).toHaveLength(0);
    expect(state.activity).toHaveLength(1);
    expect(state.activity[0].kind).toBe("reset");
  });
});

describe("weak areas", () => {
  it("counts wrong answers per lesson from raw attempts", () => {
    const q1 = ALL_QUESTIONS.find((q) => q.id === "m0-q01")!;
    const wrong = (q1.answerIndex + 1) % 4;
    const modules = {
      "intro-computers-os": {
        ...emptyModuleProgress(),
        attempts: [
          attempt("intro-computers-os", 0, 1, [q1.id], [wrong]),
          attempt("intro-computers-os", 0, 1, [q1.id], [q1.answerIndex]), // recovered later
        ],
      },
    };
    const byId = Object.fromEntries(ALL_QUESTIONS.map((q) => [q.id, q]));
    const weak = deriveWeakAreas({ modules }, byId);
    const entry = weak.find((w) => w.lessonRef === q1.lessonRef);
    expect(entry).toBeDefined();
    expect(entry!.answered).toBe(2);
    expect(entry!.wrong).toBe(1);
  });

  it("ignores lessons answered correctly every time", () => {
    const q1 = ALL_QUESTIONS.find((q) => q.id === "m0-q01")!;
    const modules = {
      "intro-computers-os": {
        ...emptyModuleProgress(),
        attempts: [attempt("intro-computers-os", 1, 1, [q1.id], [q1.answerIndex])],
      },
    };
    const byId = Object.fromEntries(ALL_QUESTIONS.map((q) => [q.id, q]));
    expect(deriveWeakAreas({ modules }, byId)).toHaveLength(0);
  });
});

describe("courseCompletion", () => {
  it("is zero with no progress and 100% with everything passed", () => {
    expect(courseCompletion(MODULES, { modules: {} }, { "intro-computers-os": 4 })).toBe(0);
    const modules = Object.fromEntries(
      MODULES.map((m) => [
        m.id,
        {
          ...emptyModuleProgress(),
          lessonsDone: ["a", "b", "c", "d"].slice(0, 4),
          passed: true,
        },
      ]),
    );
    const counts = Object.fromEntries(MODULES.map((m) => [m.id, 4]));
    expect(courseCompletion(MODULES, { modules }, counts)).toBeCloseTo(1);
  });
});
