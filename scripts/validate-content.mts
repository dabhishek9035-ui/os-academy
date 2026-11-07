/**
 * Final content validation — run after all content agents complete.
 * Enforces the master spec's assessment rules: ≥20 questions per module,
 * exactly 4 options, whyNot fully populated, unique ids, valid lesson refs,
 * and full glossary cross-link resolution.
 *
 * Usage: npx vite-node scripts/validate-content.mts
 */
import { MODULES, CURRICULUM_LESSON_IDS } from "../src/data/curriculum/config";
import { ALL_LESSONS } from "../src/data/curriculum/lessons";
import { ALL_QUESTIONS } from "../src/data/questions";
import { ALL_GLOSSARY } from "../src/data/glossary";

let failures = 0;
const fail = (msg: string) => {
  failures += 1;
  console.error(`  ✗ ${msg}`);
};
const pass = (msg: string) => console.log(`  ✓ ${msg}`);

console.log("== Curriculum completeness ==");
for (const m of MODULES) {
  const lessons = ALL_LESSONS.filter((l) => l.moduleId === m.id);
  const expected = CURRICULUM_LESSON_IDS[m.id] ?? [];
  if (lessons.length !== expected.length) {
    fail(`${m.id}: ${lessons.length} lessons authored, registry expects ${expected.length}`);
  } else {
    pass(`${m.id}: ${lessons.length} lessons`);
  }
}

console.log("== Question banks (≥20 per module, spec requires exactly 10 per attempt) ==");
for (const m of MODULES) {
  const bank = ALL_QUESTIONS.filter((q) => q.moduleId === m.id);
  if (bank.length < 20) fail(`${m.id}: only ${bank.length}/20 questions`);
  else pass(`${m.id}: ${bank.length} questions`);
}

console.log("== Question shape ==");
const qIds = new Set<string>();
const lessonIds = new Set(ALL_LESSONS.map((l) => l.id));
for (const q of ALL_QUESTIONS) {
  if (qIds.has(q.id)) fail(`duplicate question id ${q.id}`);
  qIds.add(q.id);
  if (q.options.length !== 4) fail(`${q.id}: ${q.options.length} options`);
  if (q.whyNot.length !== 4) fail(`${q.id}: whyNot has ${q.whyNot.length} items`);
  if (q.whyNot[q.answerIndex] !== null) fail(`${q.id}: whyNot at answerIndex not null`);
  if (q.whyNot.filter((w) => w === null).length !== 1) fail(`${q.id}: multiple null whyNot`);
  for (let i = 0; i < 4; i += 1) {
    if (i !== q.answerIndex && !q.whyNot[i]) fail(`${q.id}: missing whyNot for option ${i}`);
  }
  if (!lessonIds.has(q.lessonRef)) fail(`${q.id}: unknown lessonRef ${q.lessonRef}`);
}
pass(`checked ${ALL_QUESTIONS.length} questions`);

console.log("== Glossary cross-links ==");
const gIds = new Set(ALL_GLOSSARY.map((g) => g.id));
let dangling = 0;
for (const g of ALL_GLOSSARY) {
  for (const rel of g.related) {
    if (!gIds.has(rel)) {
      dangling += 1;
      fail(`glossary ${g.id} → unresolved related id "${rel}"`);
    }
  }
}
if (dangling === 0) pass(`all cross-links resolve (${ALL_GLOSSARY.length} entries)`);

console.log("== Assessment feasibility ==");
for (const m of MODULES) {
  const bank = ALL_QUESTIONS.filter((q) => q.moduleId === m.id);
  if (bank.length >= 10) {
    // each attempt draws 10 distinct questions from the bank
    pass(`${m.id}: can draw 10 of ${bank.length}`);
  }
}

console.log(failures === 0 ? "\nALL CONTENT CHECKS PASSED" : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
