/**
 * Predict-what-happens prompts — a game layer around lessons. Lesson text is
 * untouched; after a visual/experiment section whose simId has a prompt, the
 * quest renderer offers a quick prediction moment (revealing costs nothing,
 * guessing counts toward the Oracle badge).
 */
export const PREDICT_PROMPTS: Record<string, { q: string; a: string }> = {
  "scheduling-lab": {
    q: "Predict: if P3 (burst 1) arrives last under FCFS, who finishes last?",
    a: "Under FCFS arrival order rules the run — P3 is tiny but must wait for everyone ahead. Switch to SJF/SRTF and the story flips.",
  },
  "interrupt-lab": {
    q: "Predict: what happens to the running instruction when the interrupt lands mid-flight?",
    a: "Nothing visible — and that's the point. The PC and progress are saved, the handler runs, and the instruction resumes exactly where it stopped.",
  },
  "paging-lab": {
    q: "Predict: which access in the default string will suffer the first page fault?",
    a: "The very first access — nothing is resident yet. After that, the walk depends on your frames and algorithm.",
  },
  "race-condition-lab": {
    q: "Predict: both threads increment once. What's in the counter afterwards?",
    a: "Unsynchronized? Probably 1, not 2 — one store overwrites the other. That lost update is the whole lesson.",
  },
};
