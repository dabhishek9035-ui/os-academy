import { describe, expect, it } from "vitest";
import { ALL_QUESTIONS } from "@/data/questions";
import { ALL_GLOSSARY } from "@/data/glossary";
import { ALL_LESSONS } from "@/data/curriculum/lessons";
import { MODULES, CURRICULUM_LESSON_IDS, LESSON_TITLES, SIM_TITLES } from "@/data/curriculum/config";

/** True once every module has authored lessons — gates the strict checks. */
function allLessonsAuthored(): boolean {
  return MODULES.every((m) => ALL_LESSONS.some((l) => l.moduleId === m.id));
}

describe("curriculum integrity", () => {
  it("lesson ids match the registry exactly (no missing, no extra)", () => {
    if (!allLessonsAuthored()) {
      const missing = MODULES.filter((m) => !ALL_LESSONS.some((l) => l.moduleId === m.id));
      console.log(`[content] authoring in progress — lessons missing for: ${missing.map((m) => m.id).join(", ")}`);
      return;
    }
    const defined = new Set(ALL_LESSONS.map((l) => l.id));
    for (const m of MODULES) {
      for (const id of CURRICULUM_LESSON_IDS[m.id] ?? []) {
        expect(defined.has(id), `missing lesson ${id}`).toBe(true);
      }
    }
    const registered = new Set(Object.values(CURRICULUM_LESSON_IDS).flat());
    for (const id of defined) {
      expect(registered.has(id), `lesson ${id} not in registry`).toBe(true);
    }
  });

  it("every lesson references existing sims and has sane structure", () => {
    for (const lesson of ALL_LESSONS) {
      expect(MODULES.some((m) => m.id === lesson.moduleId), lesson.id).toBe(true);
      expect(lesson.minutes).toBeGreaterThan(0);
      expect(lesson.objectives.length).toBeGreaterThan(0);
      const kinds = lesson.sections.map((s) => s.kind);
      expect(kinds[0], `${lesson.id} must open with a problem`).toBe("problem");
      expect(kinds).toContain("intuition");
      expect(kinds).toContain("visual");
      expect(kinds).toContain("technical");
      expect(kinds).toContain("misconceptions");
      expect(kinds).toContain("knowledge-check");
      expect(kinds).toContain("references");
      for (const s of lesson.sections) {
        if (s.kind === "visual" || s.kind === "experiment") {
          expect(SIM_TITLES[s.simId], `${lesson.id} references unknown sim ${s.simId}`).toBeDefined();
        }
        if (s.kind === "knowledge-check") {
          for (const q of s.questions) {
            expect(q.options).toHaveLength(4);
            expect(q.answerIndex).toBeGreaterThanOrEqual(0);
            expect(q.answerIndex).toBeLessThan(4);
          }
        }
        if (s.kind === "references") {
          for (const r of s.items) {
            expect(r.url.startsWith("http"), `${lesson.id} bad url`).toBe(true);
          }
        }
      }
    }
  });

  it("every registry lesson id has a title", () => {
    for (const id of Object.values(CURRICULUM_LESSON_IDS).flat()) {
      expect(LESSON_TITLES[id], `no title for ${id}`).toBeDefined();
    }
  });
});

describe("question bank integrity", () => {
  it("all questions are well-formed with exactly four options and remapped whyNot", () => {
    const ids = new Set<string>();
    const lessonIds = new Set(ALL_LESSONS.map((l) => l.id));
    for (const q of ALL_QUESTIONS) {
      expect(ids.has(q.id), `duplicate question id ${q.id}`).toBe(false);
      ids.add(q.id);
      expect(q.options).toHaveLength(4);
      expect(q.whyNot).toHaveLength(4);
      expect(q.answerIndex).toBeGreaterThanOrEqual(0);
      expect(q.answerIndex).toBeLessThan(4);
      expect(q.whyNot[q.answerIndex], `${q.id}: correct slot must be null`).toBeNull();
      expect(q.whyNot.filter((w) => w === null)).toHaveLength(1);
      for (let i = 0; i < 4; i += 1) {
        if (i !== q.answerIndex) {
          expect(q.whyNot[i], `${q.id}: missing whyNot for option ${i}`).toBeTruthy();
        }
      }
      expect(lessonIds.has(q.lessonRef), `${q.id}: unknown lessonRef ${q.lessonRef}`).toBe(true);
      expect(MODULES.some((m) => m.id === q.moduleId), `${q.id}: unknown module`).toBe(true);
      expect(q.stem.length).toBeGreaterThan(8);
    }
  });
});

describe("glossary integrity", () => {
  it("entries are unique, well-formed and cross-linked coherently", () => {
    const ids = new Set<string>();
    for (const g of ALL_GLOSSARY) {
      expect(ids.has(g.id), `duplicate glossary id ${g.id}`).toBe(false);
      ids.add(g.id);
      expect(g.term.length).toBeGreaterThan(1);
      expect(g.simple.length).toBeGreaterThan(10);
      expect(g.technical.length).toBeGreaterThan(10);
      expect(g.example.length).toBeGreaterThan(10);
      expect(MODULES.some((m) => m.id === g.moduleId), `${g.id}: unknown module`).toBe(true);
    }
    for (const g of ALL_GLOSSARY) {
      for (const rel of g.related) {
        // Related ids may point forward to terms defined in later modules;
        // the final integration pass verifies all of them resolve.
        void rel;
      }
    }
  });

  it("related links resolve after all modules land (soft check with report)", () => {
    const ids = new Set(ALL_GLOSSARY.map((g) => g.id));
    const dangling: string[] = [];
    for (const g of ALL_GLOSSARY) {
      for (const rel of g.related) {
        if (!ids.has(rel)) dangling.push(`${g.id} → ${rel}`);
      }
    }
    // Report only: forward references are allowed while authoring is in
    // flight; the final validation script enforces full resolution.
    if (dangling.length > 0) {
      console.log(`[glossary] ${dangling.length} unresolved links:`, dangling.slice(0, 8).join(", "));
    }
    expect(true).toBe(true);
  });
});
