"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { ProgressStateV1 } from "@/types";
import { MODULES } from "@/data/curriculum/config";

/**
 * MACHINA game layer. Learning progress stays in the original
 * `visual-os-academy-progress` store (untouched); this store adds the game
 * skin: bonus-XP ledger, achievements, streak, codex, missions, boss stats,
 * daily circuit, stats counters, sound + quality preferences.
 *
 * XP is DERIVED from learning progress (`deriveXp`) plus a bonus ledger, so
 * resetting learning progress genuinely resets the game (with `resetGame`).
 */

// ---------------------------------------------------------------------------
// Ranks
// ---------------------------------------------------------------------------

export interface Rank {
  name: string;
  minXp: number;
  blurb: string;
}

export const RANKS: Rank[] = [
  { name: "Boot Sector", minXp: 0, blurb: "You just woke up in the Boot Docks." },
  { name: "Signal Scout", minXp: 150, blurb: "You can hear the towers of Signal Heights." },
  { name: "Process Handler", minXp: 400, blurb: "Fork, exec, wait — the Foundry answers to you." },
  { name: "Queue Runner", minXp: 800, blurb: "Cyan Yards run on your timetable." },
  { name: "Thread Weaver", minXp: 1400, blurb: "You weave without tangling." },
  { name: "Page Warden", minXp: 2200, blurb: "The Heights map cleanly under your watch." },
  { name: "Deadlock Breaker", minXp: 3200, blurb: "Gridlock Junction fears your diagrams." },
  { name: "Cache Keeper", minXp: 4500, blurb: "Hot paths stay hot around you." },
  { name: "Syscall Adept", minXp: 6000, blurb: "The Bastion validates you on sight." },
  { name: "Ring-0 Operator", minXp: 8000, blurb: "Privilege looks good on you." },
  { name: "Hypervisor", minXp: 10500, blurb: "You run worlds inside worlds." },
  { name: "Kernel Hacker", minXp: 13500, blurb: "The Core speaks your name." },
];

export function rankFor(xp: number): { index: number; rank: Rank; next: Rank | null; into: number; span: number } {
  let index = 0;
  for (let i = 0; i < RANKS.length; i += 1) {
    if (xp >= RANKS[i].minXp) index = i;
  }
  const rank = RANKS[index];
  const next = index + 1 < RANKS.length ? RANKS[index + 1] : null;
  const span = next ? next.minXp - rank.minXp : 1;
  const into = xp - rank.minXp;
  return { index, rank, next, into, span };
}

// ---------------------------------------------------------------------------
// XP derivation from learning progress
// ---------------------------------------------------------------------------

const LESSON_XP = 25;
const BOSS_XP = 120;
const ATTEMPT_XP = 10;
const ATTEMPT_XP_CAP_PER_MODULE = 50;

export function deriveXp(progress: ProgressStateV1["modules"]): number {
  let xp = 0;
  for (const m of MODULES) {
    const mp = progress[m.id];
    if (!mp) continue;
    xp += mp.lessonsDone.length * LESSON_XP;
    const passed = mp.attempts.find((a) => a.passed);
    if (mp.passed) {
      xp += BOSS_XP;
      // bonus for beating the boss with room to spare
      if (passed) xp += Math.max(0, passed.score - 8) * 30;
    }
    xp += Math.min(ATTEMPT_XP_CAP_PER_MODULE, mp.attempts.length * ATTEMPT_XP);
  }
  return xp;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export interface MissionRecord {
  done: boolean;
  attempts: number;
}

export interface BossRecord {
  wins: number;
  losses: number;
  bestCombo: number;
  firstTry: boolean;
}

export interface DailyRecord {
  lastDate?: string;
  streak: number;
}

export interface GameStateV1 {
  version: 1;
  /** Bonus XP ledger entries: [label, xp, ISO date]. Reset clears this. */
  xpLedger: [string, number, string][];
  achievements: Record<string, string>;
  streak: { count: number; longest: number; lastActive: string; restDays: number };
  codexSeen: string[];
  missions: Record<string, MissionRecord>;
  boss: Record<string, BossRecord>;
  daily: DailyRecord;
  stats: { stepBacks: number; terminal: number; labsVisited: string[]; predictions: number };
  sound: boolean;
  quality: "auto" | "high" | "medium" | "low";
}

export const emptyGame = (): GameStateV1 => ({
  version: 1,
  xpLedger: [],
  achievements: {},
  streak: { count: 0, longest: 0, lastActive: "", restDays: 3 },
  codexSeen: [],
  missions: {},
  boss: {},
  daily: { streak: 0 },
  stats: { stepBacks: 0, terminal: 0, labsVisited: [], predictions: 0 },
  sound: false,
  quality: "auto",
});

function migrateGame(raw: unknown): GameStateV1 {
  if (!raw || typeof raw !== "object") return emptyGame();
  const r = raw as Partial<GameStateV1>;
  if (r.version !== 1) return emptyGame();
  const base = emptyGame();
  return {
    version: 1,
    xpLedger: Array.isArray(r.xpLedger)
      ? r.xpLedger.filter((e) => Array.isArray(e) && typeof e[1] === "number")
      : [],
    achievements: typeof r.achievements === "object" && r.achievements ? r.achievements : {},
    streak:
      r.streak && typeof r.streak.count === "number"
        ? { ...base.streak, ...r.streak }
        : base.streak,
    codexSeen: Array.isArray(r.codexSeen) ? r.codexSeen.filter((x) => typeof x === "string") : [],
    missions: typeof r.missions === "object" && r.missions ? r.missions : {},
    boss: typeof r.boss === "object" && r.boss ? r.boss : {},
    daily: r.daily && typeof r.daily === "object" ? { ...base.daily, ...r.daily } : base.daily,
    stats:
      r.stats && typeof r.stats === "object"
        ? { ...base.stats, ...r.stats, labsVisited: Array.isArray(r.stats.labsVisited) ? r.stats.labsVisited : [] }
        : base.stats,
    sound: Boolean(r.sound),
    quality: r.quality === "high" || r.quality === "medium" || r.quality === "low" ? r.quality : "auto",
  };
}

/** Today as a local YYYY-MM-DD string. */
export function todayKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function daysBetween(a: string, b: string): number {
  if (!a || !b) return Infinity;
  const da = new Date(`${a}T00:00:00`).getTime();
  const db = new Date(`${b}T00:00:00`).getTime();
  return Math.round((db - da) / 86_400_000);
}

interface GameStore extends GameStateV1 {
  addBonusXp: (label: string, xp: number) => void;
  grantAchievement: (id: string) => boolean;
  touchStreak: () => { counted: boolean; count: number };
  seeCodex: (ids: string[]) => number;
  recordMission: (id: string, done: boolean) => void;
  recordBoss: (moduleId: string, opts: { win: boolean; combo: number; attempts: number }) => void;
  recordDaily: (perfect: boolean) => void;
  trackStepBack: () => void;
  trackTerminal: () => void;
  visitLab: (simId: string) => void;
  trackPrediction: () => void;
  setSound: (on: boolean) => void;
  setQuality: (q: GameStateV1["quality"]) => void;
  resetGame: () => void;
}

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      ...emptyGame(),

      addBonusXp: (label, xp) =>
        set((s) => ({
          xpLedger: [...s.xpLedger.slice(-40), [label, xp, new Date().toISOString()]],
        })),

      grantAchievement: (id) => {
        if (get().achievements[id]) return false;
        set((s) => ({
          achievements: { ...s.achievements, [id]: new Date().toISOString() },
        }));
        return true;
      },

      touchStreak: () => {
        const s = get();
        const today = todayKey();
        if (s.streak.lastActive === today) {
          return { counted: false, count: s.streak.count };
        }
        const gap = daysBetween(s.streak.lastActive, today);
        let { count, restDays } = s.streak;
        if (s.streak.lastActive === "" || gap > 2) {
          count = 1; // fresh start (no guilt: gaps just restart gently)
        } else if (gap === 2) {
          if (restDays > 0) {
            restDays -= 1; // a rest day kept the streak alive
          } else {
            count = 1;
          }
        } else {
          count += 1;
        }
        const milestoneRefill = count > 0 && count % 7 === 0;
        if (milestoneRefill) restDays = Math.min(3, restDays + 1);
        set({
          streak: {
            count,
            longest: Math.max(s.streak.longest, count),
            lastActive: today,
            restDays,
          },
        });
        return { counted: true, count };
      },

      seeCodex: (ids) => {
        const s = get();
        const fresh = ids.filter((id) => !s.codexSeen.includes(id));
        if (fresh.length === 0) return 0;
        set({ codexSeen: [...s.codexSeen, ...fresh] });
        return fresh.length;
      },

      recordMission: (id, done) =>
        set((s) => {
          const rec = s.missions[id] ?? { done: false, attempts: 0 };
          return {
            missions: {
              ...s.missions,
              [id]: { done: rec.done || done, attempts: rec.attempts + 1 },
            },
          };
        }),

      recordBoss: (moduleId, opts) =>
        set((s) => {
          const rec = s.boss[moduleId] ?? { wins: 0, losses: 0, bestCombo: 0, firstTry: false };
          return {
            boss: {
              ...s.boss,
              [moduleId]: {
                wins: rec.wins + (opts.win ? 1 : 0),
                losses: rec.losses + (opts.win ? 0 : 1),
                bestCombo: Math.max(rec.bestCombo, opts.combo),
                firstTry: rec.firstTry || (opts.win && opts.attempts <= 1),
              },
            },
          };
        }),

      recordDaily: (perfect) =>
        set((s) => {
          const today = todayKey();
          const consecutive = s.daily.lastDate === todayKey(new Date(Date.now() - 86_400_000));
          return {
            daily: {
              lastDate: today,
              streak: s.daily.lastDate === today ? s.daily.streak : consecutive ? s.daily.streak + 1 : 1,
            },
            xpLedger: [
              ...s.xpLedger.slice(-40),
              ["Daily circuit" + (perfect ? " (perfect)" : ""), perfect ? 40 : 25, new Date().toISOString()],
            ],
          };
        }),

      trackStepBack: () => set((s) => ({ stats: { ...s.stats, stepBacks: s.stats.stepBacks + 1 } })),
      trackTerminal: () => set((s) => ({ stats: { ...s.stats, terminal: s.stats.terminal + 1 } })),
      visitLab: (simId) =>
        set((s) => ({
          stats: {
            ...s.stats,
            labsVisited: s.stats.labsVisited.includes(simId)
              ? s.stats.labsVisited
              : [...s.stats.labsVisited, simId],
          },
        })),
      trackPrediction: () => set((s) => ({ stats: { ...s.stats, predictions: s.stats.predictions + 1 } })),

      setSound: (on) => set({ sound: on }),
      setQuality: (q) => set({ quality: q }),

      resetGame: () => set(() => ({ ...emptyGame() })),
    }),
    {
      name: "visual-os-academy-game",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      merge: (persisted, current) => ({ ...current, ...migrateGame(persisted) }),
    },
  ),
);

// ---------------------------------------------------------------------------
// Total XP + summary selector (pure helpers, used by HUD/profile)
// ---------------------------------------------------------------------------

export function bonusXpTotal(ledger: [string, number, string][]): number {
  return ledger.reduce((a, e) => a + (e[1] || 0), 0);
}

export function totalXp(progress: ProgressStateV1["modules"], game: GameStateV1): number {
  return deriveXp(progress) + bonusXpTotal(game.xpLedger);
}
