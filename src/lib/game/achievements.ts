"use client";

import { MODULES } from "@/data/curriculum/config";
import { useProgressStore } from "@/lib/progress/store";
import { useGameStore } from "./player";

/**
 * Achievement definitions (28). `check` reads current progress + game state;
 * evaluation is idempotent — new unlocks fire a toast + sfx from GameWatcher.
 * `secret` achievements hide their name/desc until unlocked.
 */

export interface AchievementDef {
  id: string;
  name: string;
  desc: string;
  icon: string;
  secret?: boolean;
  check: (ctx: AchievementCtx) => boolean;
}

export interface AchievementCtx {
  lessonsDone: number;
  modulesPassed: number;
  allPassed: boolean;
  perfectBoss: boolean;
  bossFirstTry: boolean;
  bossWins: number;
  bestCombo: number;
  missionDone: Record<string, boolean>;
  stepBacks: number;
  terminal: number;
  labsVisited: number;
  predictions: number;
  codexCount: number;
  streakCount: number;
  dailyStreak: number;
  hour: number;
  soundOn: boolean;
  theme: string;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: "first-boot", name: "Power On", desc: "Complete your first lesson.", icon: "⚡", check: (c) => c.lessonsDone >= 1 },
  { id: "first-quest", name: "Quest Habit", desc: "Complete 5 lessons.", icon: "📜", check: (c) => c.lessonsDone >= 5 },
  { id: "scholar", name: "Scholar of Machina", desc: "Complete 20 lessons.", icon: "📚", check: (c) => c.lessonsDone >= 20 },
  { id: "librarian", name: "Librarian of the Machine", desc: "Complete every lesson in the world.", icon: "🏛️", check: (c) => c.lessonsDone >= 56 },
  { id: "zone-one", name: "Dock Cleared", desc: "Pass your first zone boss.", icon: "🚪", check: (c) => c.modulesPassed >= 1 },
  { id: "signal-received", name: "Signal Received", desc: "Pass 3 zone bosses.", icon: "📡", check: (c) => c.modulesPassed >= 3 },
  { id: "halfway", name: "Halfway to the Core", desc: "Pass 7 zone bosses.", icon: "🌗", check: (c) => c.modulesPassed >= 7 },
  { id: "boss-slayer", name: "Boss Slayer", desc: "Defeat any boss with a perfect 10/10.", icon: "🗡️", check: (c) => c.perfectBoss },
  { id: "first-try", name: "Untouchable", desc: "Beat a boss on your first attempt.", icon: "🛡️", check: (c) => c.bossFirstTry },
  { id: "combo-5", name: "Combo Breaker… Maker", desc: "Reach a 5-answer combo in a boss fight.", icon: "🔥", check: (c) => c.bestCombo >= 5 },
  { id: "all-zones", name: "The Kernel Wakes", desc: "Pass all 14 zone bosses.", icon: "👑", check: (c) => c.allPassed },
  { id: "race-breaker", name: "Broke It On Purpose", desc: "Witness a lost update in the Loom (race mission).", icon: "🧵", check: (c) => Boolean(c.missionDone["race-lost-update"]) },
  { id: "deadlock-untangled", name: "Untangled", desc: "Grant a request safely via the Banker (Banker's mission).", icon: "🪢", check: (c) => Boolean(c.missionDone["bankers-safe-passage"]) },
  { id: "zero-faults", name: "Fault-Less", desc: "Finish a paging walk with 3 or fewer faults.", icon: "🧊", check: (c) => Boolean(c.missionDone["vm-fault-economist"]) },
  { id: "scheduler-perfect", name: "Convoy Buster", desc: "Beat the convoy: average wait under 5.", icon: "🚂", check: (c) => Boolean(c.missionDone["sched-convoy"]) },
  { id: "step-master", name: "Time Turner", desc: "Step back through simulation time 20 times.", icon: "⏪", check: (c) => c.stepBacks >= 20 },
  { id: "terminal-initiate", name: "Terminal Initiate", desc: "Run 10 commands in the educational terminal.", icon: "⌨️", check: (c) => c.terminal >= 10 },
  { id: "explorer", name: "District Explorer", desc: "Visit 10 different simulation labs.", icon: "🧭", check: (c) => c.labsVisited >= 10 },
  { id: "predictor", name: "Oracle", desc: "Make 5 predictions in quests.", icon: "🔮", check: (c) => c.predictions >= 5 },
  { id: "codex-10", name: "Collector", desc: "Discover 10 codex entries.", icon: "🃏", check: (c) => c.codexCount >= 10 },
  { id: "codex-30", name: "Codex Master", desc: "Discover 30 codex entries.", icon: "🂠", check: (c) => c.codexCount >= 30 },
  { id: "streak-3", name: "Warming Up", desc: "Keep a 3-day streak.", icon: "🔥", check: (c) => c.streakCount >= 3 },
  { id: "streak-7", name: "Week of the Machine", desc: "Keep a 7-day streak.", icon: "📅", check: (c) => c.streakCount >= 7 },
  { id: "daily-5", name: "Circuit Regular", desc: "Run the Daily Circuit 5 times.", icon: "🔁", check: (c) => c.dailyStreak >= 5 },
  { id: "night-owl", name: "Night Owl", desc: "Study after midnight.", icon: "🦉", secret: true, check: (c) => c.hour >= 0 && c.hour < 4 },
  { id: "come-back", name: "The World Waited", desc: "Return after some time away.", icon: "🌅", secret: true, check: (c) => c.lessonsDone >= 3 },
  { id: "light-touch", name: "Schematic Mode", desc: "Try the day (light) theme.", icon: "🌤️", secret: true, check: (c) => c.theme === "light" },
  { id: "sound-on", name: "Sound of the Machine", desc: "Enable the machine's voice.", icon: "🔊", secret: true, check: (c) => c.soundOn },
];

export interface AchievementEvalResult {
  unlocked: AchievementDef[];
  state: Record<string, string>;
}

export function achievementCtx(
  progress: ReturnType<typeof useProgressStore.getState>,
  game: ReturnType<typeof useGameStore.getState>,
  theme: string,
): AchievementCtx {
  const lessonsDone = MODULES.reduce((a, m) => a + (progress.modules[m.id]?.lessonsDone.length ?? 0), 0);
  const modulesPassed = MODULES.filter((m) => progress.modules[m.id]?.passed).length;
  const missionDone: Record<string, boolean> = {};
  for (const [k, v] of Object.entries(game.missions)) missionDone[k] = v.done;
  let bestCombo = 0;
  let bossFirstTry = false;
  let bossWins = 0;
  let perfectBoss = false;
  for (const [mid, mp] of Object.entries(progress.modules)) {
    void mid;
    for (const a of mp.attempts) {
      if (a.passed && a.score === a.total) perfectBoss = true;
    }
  }
  for (const b of Object.values(game.boss)) {
    bestCombo = Math.max(bestCombo, b.bestCombo);
    bossFirstTry = bossFirstTry || b.firstTry;
    bossWins += b.wins;
  }
  return {
    lessonsDone,
    modulesPassed,
    allPassed: modulesPassed >= MODULES.length,
    perfectBoss,
    bossFirstTry,
    bossWins,
    bestCombo,
    missionDone,
    stepBacks: game.stats.stepBacks,
    terminal: game.stats.terminal,
    labsVisited: game.stats.labsVisited.length,
    predictions: game.stats.predictions,
    codexCount: game.codexSeen.length,
    streakCount: game.streak.count,
    dailyStreak: game.daily.streak,
    hour: new Date().getHours(),
    soundOn: game.sound,
    theme,
  };
}

export function evaluateAchievements(
  progress: ReturnType<typeof useProgressStore.getState>,
  game: ReturnType<typeof useGameStore.getState>,
  theme: string,
): AchievementEvalResult {
  const ctx = achievementCtx(progress, game, theme);
  const unlocked: AchievementDef[] = [];
  const state: Record<string, string> = { ...game.achievements };
  for (const def of ACHIEVEMENTS) {
    if (!state[def.id] && def.check(ctx)) {
      state[def.id] = new Date().toISOString();
      unlocked.push(def);
    }
  }
  return { unlocked, state };
}
