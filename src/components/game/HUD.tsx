"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { RANKS, totalXp, rankFor, useGameStore } from "@/lib/game/player";
import { useProgressStore } from "@/lib/progress/store";
import { useSettingsStore } from "@/lib/settings/store";
import { useHasMounted } from "@/lib/useHasMounted";
import { useSfx } from "@/lib/game/sfx";
import { evaluateAchievements, ACHIEVEMENTS } from "@/lib/game/achievements";
import { bumpMood, useMood } from "@/lib/game/mood";

/**
 * GameWatcher — the juice hub mounted once in the layout:
 *  - evaluates achievements whenever progress/game state changes
 *  - toasts badges + rank-ups (with sfx)
 *  - keeps the mood bus honest after celebrations
 */
export function GameWatcher() {
  const mounted = useHasMounted();
  const progress = useProgressStore();
  const game = useGameStore();
  const theme = useSettingsStore((s) => s.theme);
  const sfx = useSfx();
  const lastRank = useRef<number | null>(null);
  const [toasts, setToasts] = useState<{ id: number; icon: string; title: string; sub: string }[]>([]);
  const toastId = useRef(1);

  useEffect(() => {
    if (!mounted) return;
    const xp = totalXp(progress.modules, game);
    const { index } = rankFor(xp);

    // rank-up moment
    if (lastRank.current !== null && index > lastRank.current) {
      const rank = RANKS[index];
      sfx("levelup");
      bumpMood("cheer");
      const id = toastId.current++;
      setToasts((t) => [
        ...t,
        { id, icon: "🏅", title: `RANK UP — ${rank.name}`, sub: rank.blurb },
      ]);
      window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
    }
    lastRank.current = index;

    // achievements
    const { unlocked, state } = evaluateAchievements(progress, game, theme);
    if (unlocked.length > 0) {
      useGameStore.setState({ achievements: state });
      sfx("unlock");
      for (const def of unlocked.slice(0, 3)) {
        const id = toastId.current++;
        setToasts((t) => [
          ...t,
          { id, icon: def.icon, title: `Badge — ${def.name}`, sub: def.desc },
        ]);
        window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, progress, game, theme]);

  return (
    <div className="pointer-events-none fixed bottom-20 right-4 z-50 flex flex-col items-end gap-2 md:bottom-6">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, x: 40, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 320, damping: 24 }}
            className="pointer-events-auto flex max-w-xs items-start gap-3 rounded-xl border border-accent/40 bg-panel/90 px-4 py-3 shadow-glow backdrop-blur-md"
            role="status"
          >
            <span className="text-2xl" aria-hidden>
              {t.icon}
            </span>
            <span>
              <span className="block text-sm font-bold text-ink">{t.title}</span>
              <span className="block text-xs text-ink-muted">{t.sub}</span>
            </span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

/** Mini schematic of Bit for the HUD (2D honest fallback). */
export function BitIcon({ mood = "idle", size = 34 }: { mood?: string; size?: number }) {
  const happy = mood === "cheer" || mood === "wave";
  const sad = mood === "oops";
  const sleep = mood === "sleep";
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden>
      {/* antenna */}
      <line x1="20" y1="4" x2="20" y2="10" stroke="currentColor" strokeWidth="2" />
      <circle cx="20" cy="4" r="2.2" fill="#22d3ee" />
      {/* head */}
      <rect x="7" y="10" width="26" height="20" rx="6" fill="currentColor" opacity="0.16" stroke="currentColor" strokeWidth="2" />
      {/* eyes */}
      {sleep ? (
        <>
          <line x1="13" y1="19" x2="17" y2="19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <line x1="23" y1="19" x2="27" y2="19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </>
      ) : sad ? (
        <>
          <circle cx="15" cy="19" r="2" fill="currentColor" />
          <circle cx="25" cy="19" r="2" fill="currentColor" />
          <path d="M15 26q5-3 10 0" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" />
        </>
      ) : happy ? (
        <>
          <path d="M13 19l2.4 2.4L13 23.8" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M27 19l-2.4 2.4L27 23.8" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M15 25.5q5 4 10 0" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" />
        </>
      ) : (
        <>
          <circle cx="15" cy="19" r="2.1" fill="#22d3ee" />
          <circle cx="25" cy="19" r="2.1" fill="#22d3ee" />
          <path d="M16.5 25h7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}

/** The HUD strip — rank, XP, streak, sound. Mounted under the navbar. */
export function GameHUD() {
  const mounted = useHasMounted();
  const progress = useProgressStore((s) => s.modules);
  const game = useGameStore();
  const setSound = useGameStore((s) => s.setSound);
  const sfx = useSfx();
  const mood = useMoodState();
  if (!mounted) return null;

  const xp = totalXp(progress, game);
  const { rank, index, into, span, next } = rankFor(xp);
  const pct = Math.min(100, Math.round((into / span) * 100));

  return (
    <div className="pointer-events-auto fixed bottom-3 left-1/2 z-40 flex w-[min(94vw,560px)] -translate-x-1/2 items-center gap-3 rounded-2xl border border-line/80 bg-panel/85 px-4 py-2 shadow-pop backdrop-blur-md">
      <div className="flex items-center gap-2" title={`Rank ${index + 1}: ${rank.name}`}>
        <span className="grid h-9 w-9 place-items-center rounded-lg border border-accent/40 bg-panel-soft">
          <BitIcon mood={mood} size={26} />
        </span>
        <span className="hidden sm:block">
          <span className="block text-[11px] font-bold uppercase tracking-wider text-accent">{rank.name}</span>
          <span className="block text-[10px] text-ink-faint">
            {next ? `${next.minXp - xp} XP → ${next.name}` : "max rank"}
          </span>
        </span>
      </div>
      <div className="min-w-0 grow">
        <div className="h-2 overflow-hidden rounded-full bg-panel-soft">
          <motion.div
            className="fill-gradient h-full rounded-full"
            initial={false}
            animate={{ width: `${pct}%` }}
            transition={{ type: "spring", stiffness: 90, damping: 20 }}
          />
        </div>
        <div className="mt-0.5 flex justify-between text-[10px] text-ink-faint">
          <span>{xp} XP</span>
          <span className="flex items-center gap-2">
            <span title="day streak">🔥 {game.streak.count}</span>
            <span title="badges">🏅 {Object.keys(game.achievements).length}/{ACHIEVEMENTS.length}</span>
          </span>
        </div>
      </div>
      <button
        type="button"
        className="btn btn-ghost px-2"
        aria-label={game.sound ? "Mute machine sounds" : "Enable machine sounds"}
        onClick={() => {
          setSound(!game.sound);
          if (!game.sound) window.setTimeout(() => sfx("correct"), 60);
        }}
      >
        {game.sound ? "🔊" : "🔇"}
      </button>
    </div>
  );
}

function useMoodState(): string {
  const mood = useMood((s) => s.mood);
  const since = useMood((s) => s.since);
  const [display, setDisplay] = useState("idle");
  useEffect(() => {
    const oneShot = mood === "cheer" || mood === "oops" || mood === "wave";
    if (!oneShot) {
      setDisplay(mood);
      return;
    }
    setDisplay(mood);
    const remaining = Math.max(0, 2600 - (Date.now() - since));
    const t = window.setTimeout(() => setDisplay("idle"), remaining);
    return () => window.clearTimeout(t);
  }, [mood, since]);
  return display;
}
