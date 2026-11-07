"use client";

import { ALL_GLOSSARY, glossaryById } from "@/data/glossary";
import { useGameStore } from "./player";

/**
 * Codex layer — the glossary becomes collectible cards. Rarity is derived
 * from a stable hash of the entry id (no per-entry authoring needed):
 * common 60% / rare 25% / epic 12% / legendary 3%.
 */

export type Rarity = "common" | "rare" | "epic" | "legendary";

export const RARITY_ORDER: Rarity[] = ["common", "rare", "epic", "legendary"];

export const RARITY_META: Record<Rarity, { label: string; frame: string; text: string; glow: string }> = {
  common: { label: "Common", frame: "border-line", text: "text-ink-muted", glow: "none" },
  rare: { label: "Rare", frame: "border-sky-400/50", text: "text-sky-300", glow: "0 0 12px rgba(56,189,248,0.25)" },
  epic: { label: "Epic", frame: "border-violet-400/60", text: "text-violet-300", glow: "0 0 16px rgba(167,139,250,0.35)" },
  legendary: { label: "Legendary", frame: "border-amber-300/70", text: "text-amber-300", glow: "0 0 20px rgba(252,211,77,0.45)" },
};

function hashId(id: string): number {
  let h = 5381;
  for (let i = 0; i < id.length; i += 1) {
    h = ((h << 5) + h + id.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function rarityOf(id: string): Rarity {
  const r = hashId(id) % 100;
  if (r < 3) return "legendary";
  if (r < 15) return "epic";
  if (r < 40) return "rare";
  return "common";
}

export function isCodexSeen(id: string): boolean {
  return useGameStore.getState().codexSeen.includes(id);
}

export function codexCounts(): { seen: number; total: number; byRarity: Record<Rarity, { seen: number; total: number }> } {
  const seen = new Set(useGameStore.getState().codexSeen);
  const byRarity: Record<Rarity, { seen: number; total: number }> = {
    common: { seen: 0, total: 0 },
    rare: { seen: 0, total: 0 },
    epic: { seen: 0, total: 0 },
    legendary: { seen: 0, total: 0 },
  };
  for (const g of ALL_GLOSSARY) {
    const r = rarityOf(g.id);
    byRarity[r].total += 1;
    if (seen.has(g.id)) byRarity[r].seen += 1;
  }
  return { seen: seen.size, total: ALL_GLOSSARY.length, byRarity };
}

/** Codex ids belonging to a module (used on boss clear to drop the set). */
export function codexForModule(moduleId: string): string[] {
  return ALL_GLOSSARY.filter((g) => g.moduleId === moduleId).map((g) => g.id);
}

/** Codex ids taught by a specific lesson. */
export function codexForLesson(lessonId: string): string[] {
  return ALL_GLOSSARY.filter((g) => g.lessonRef === lessonId).map((g) => g.id);
}

export { glossaryById };
