/**
 * Deterministic option shuffling for multiple-choice content.
 *
 * The question banks were authored with the correct answer almost always in
 * position A (all 112 lesson knowledge-checks, 253/280 quiz questions).
 * Instead of rewriting content, the RENDERER permutes options with a seed
 * derived from the question id: the order is stable for a given question
 * (no re-shuffle on every render, no hydration mismatch) but the correct
 * answer is no longer predictably the first option.
 *
 * The quiz engine does its own per-attempt random shuffle; this module is
 * for stable presentation-order shuffling.
 */

/** FNV-1a — small, fast, well-distributed string hash. */
export function hashSeed(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32 — tiny seeded PRNG, good enough for presentation order. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A deterministic permutation of [0, count) derived from the seed text. */
export function seededOrder(seedText: string, count: number): number[] {
  const rng = mulberry32(hashSeed(seedText));
  const order = Array.from({ length: count }, (_, i) => i);
  for (let i = count - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

export interface McqView {
  id: string;
  q: string;
  options: string[];
  answerIndex: number;
  explanation: string;
}

/** The question as it should be PRESENTED: options permuted, answer remapped. */
export function presentMcq(q: McqView): McqView {
  const order = seededOrder(q.id, q.options.length);
  return {
    ...q,
    options: order.map((i) => q.options[i]),
    answerIndex: order.indexOf(q.answerIndex),
  };
}
