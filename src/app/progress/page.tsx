"use client";

import Link from "next/link";
import { useMemo } from "react";
import { motion } from "framer-motion";
import { MODULES, LESSON_TITLES } from "@/data/curriculum/config";
import { lessonsForModule } from "@/data/curriculum/lessons";
import { ALL_QUESTIONS } from "@/data/questions";
import { useProgressStore } from "@/lib/progress/store";
import { useGameStore, rankFor, totalXp, RANKS } from "@/lib/game/player";
import { ACHIEVEMENTS } from "@/lib/game/achievements";
import { zoneFor } from "@/lib/game/zones";
import { useHasMounted } from "@/lib/useHasMounted";
import { BitIcon } from "@/components/game/HUD";
import { CheckIcon, LockIcon } from "@/components/ui/icons";

export default function ProfilePage() {
  const mounted = useHasMounted();
  const progress = useProgressStore((s) => s.modules);
  const activity = useProgressStore((s) => s.activity);
  const game = useGameStore();

  const questionsById = useMemo(
    () => Object.fromEntries(ALL_QUESTIONS.map((q) => [q.id, q])),
    [],
  );
  const lessonCounts = useMemo(
    () => Object.fromEntries(MODULES.map((m) => [m.id, lessonsForModule(m.id).length])),
    [],
  );
  const xp = totalXp(progress, game);
  const { rank, index, into, span, next } = rankFor(xp);
  const passedCount = MODULES.filter((m) => progress[m.id]?.passed).length;
  const lessonsDone = MODULES.reduce((a, m) => a + (progress[m.id]?.lessonsDone.length ?? 0), 0);
  const missionsDone = Object.values(game.missions).filter((m) => m.done).length;

  // 14-day streak calendar (today leftmost? classic: oldest → today)
  const calendar = useMemo(() => {
    const days: { key: string; active: boolean; label: string }[] = [];
    for (let i = 13; i >= 0; i -= 1) {
      const d = new Date(Date.now() - i * 86_400_000);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      days.push({
        key,
        active: game.streak.lastActive !== "" && daysBetweenInclusive(game.streak.lastActive, key, game.streak.count),
        label: d.toLocaleDateString(undefined, { weekday: "narrow" }),
      });
    }
    return days;
  }, [game.streak]);

  if (!mounted) {
    return <p className="card panel-pad text-sm text-ink-faint">Loading profile…</p>;
  }

  return (
    <div className="space-y-8">
      {/* ------------------------------ player card ------------------------------ */}
      <section className="card overflow-hidden">
        <div className="fill-gradient h-1.5" aria-hidden />
        <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center">
          <div className="grid h-24 w-24 shrink-0 place-items-center rounded-2xl border border-accent/40 bg-panel-soft shadow-glow">
            <BitIcon size={64} mood="cheer" />
          </div>
          <div className="min-w-0 grow">
            <p className="section-label">Player profile · MACHINA</p>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-ink">
              Rank {index + 1} —{" "}
              <span className="bg-gradient-to-r from-cyan-300 to-indigo-300 bg-clip-text text-transparent">
                {rank.name}
              </span>
            </h1>
            <p className="mt-1 text-sm italic text-ink-muted">“{rank.blurb}”</p>
            <div className="mt-3 max-w-md">
              <div className="flex items-baseline justify-between text-xs text-ink-faint">
                <span>{xp} XP</span>
                <span>{next ? `${next.minXp - xp} XP → ${next.name}` : "MAX RANK"}</span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-panel-soft">
                <motion.div
                  className="fill-gradient h-full rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, (into / span) * 100)}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                />
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                ["🔥", "Day streak", `${game.streak.count}`],
                ["📜", "Quests", `${lessonsDone}`],
                ["⚔", "Zones cleared", `${passedCount}/14`],
                ["🎯", "Missions", `${missionsDone}`],
              ].map(([icon, label, value]) => (
                <div key={label} className="rounded-lg border border-line bg-panel-soft px-3 py-2">
                  <p className="text-[10px] uppercase tracking-wider text-ink-faint">
                    {icon} {label}
                  </p>
                  <p className="font-mono text-lg font-bold text-ink">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------- mastery map + streak -------------------------- */}
      <div className="grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="mastery" className="card panel-pad">
          <h2 id="mastery" className="text-base font-bold text-ink">
            Zone mastery
          </h2>
          <ul className="mt-3 space-y-2">
            {MODULES.map((m) => {
              const mp = progress[m.id];
              const zone = zoneFor(m.id);
              const lessons = lessonsForModule(m.id);
              const lessonsStar = lessons.length > 0 && lessons.every((l) => mp?.lessonsDone.includes(l.id));
              const bossStar = mp?.passed;
              const missionStar = false; // per-module mission stars need per-module mission sets; see GAME_DESIGN knobs
              return (
                <li key={m.id} className="flex items-center gap-3">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ background: zone.hue[0] }}
                    aria-hidden
                  />
                  <span className="min-w-0 grow truncate text-sm text-ink-muted">
                    {zone.glyph} {m.title}
                  </span>
                  <span className="flex gap-1 font-mono text-xs" aria-label="mastery stars">
                    {[lessonsStar, bossStar, missionStar].map((on, i) => (
                      <span key={i} className={on ? "text-amber-300" : "text-ink-faint/40"}>
                        ★
                      </span>
                    ))}
                  </span>
                  {isModuleUnlockedSafe(m.id, progress) ? (
                    <Link href={`/roadmap/${m.id}`} className="btn px-2 py-0.5 text-xs">
                      Open
                    </Link>
                  ) : (
                    <LockIcon width={12} height={12} className="text-ink-faint" />
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        <div className="space-y-6">
          <section aria-labelledby="streak" className="card panel-pad">
            <h2 id="streak" className="text-base font-bold text-ink">
              Streak — {game.streak.count} days{" "}
              <span className="text-sm font-normal text-ink-faint">
                (longest {game.streak.longest} · {game.streak.restDays} rest day{game.streak.restDays === 1 ? "" : "s"} banked)
              </span>
            </h2>
            <div className="mt-3 flex gap-1.5" aria-hidden>
              {calendar.map((d) => (
                <div key={d.key} className="flex-1 text-center">
                  <div
                    className={`grid aspect-square place-items-center rounded-md border text-[10px] ${
                      d.active
                        ? "fill-gradient border-transparent text-[#071019]"
                        : "border-line bg-panel-soft text-ink-faint"
                    }`}
                  >
                    {d.active ? "★" : ""}
                  </div>
                  <p className="mt-1 text-[9px] text-ink-faint">{d.label}</p>
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-ink-faint">
              Miss a day and a banked rest day keeps the streak alive — no guilt,
              the world waits.
            </p>
          </section>

          <section aria-labelledby="activity" className="card panel-pad">
            <h2 id="activity" className="text-base font-bold text-ink">
              Recent activity
            </h2>
            {activity.length === 0 ? (
              <p className="mt-2 text-sm text-ink-muted">
                No activity yet — the Boot Docks are waiting.
              </p>
            ) : (
              <ol className="mt-3 space-y-1.5 text-sm">
                {activity.slice(0, 10).map((a, i) => (
                  <li key={i} className="flex items-baseline justify-between gap-3">
                    <span className="text-ink-muted">{a.label}</span>
                    <time className="shrink-0 text-xs text-ink-faint" dateTime={a.ts}>
                      {new Date(a.ts).toLocaleDateString()}
                    </time>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      </div>

      {/* ------------------------------ badge wall ------------------------------ */}
      <section aria-labelledby="badges" className="card panel-pad">
        <div className="flex items-baseline justify-between">
          <h2 id="badges" className="text-base font-bold text-ink">
            Badge wall
          </h2>
          <span className="font-mono text-xs text-ink-faint">
            {Object.keys(game.achievements).length}/{ACHIEVEMENTS.length}
          </span>
        </div>
        <ul className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
          {ACHIEVEMENTS.map((def) => {
            const at = game.achievements[def.id];
            const unlocked = Boolean(at);
            const show = unlocked || !def.secret;
            return (
              <li
                key={def.id}
                className={`rounded-xl border px-3 py-3 transition-colors ${
                  unlocked
                    ? "border-accent/40 bg-accent-soft/40 shadow-glow"
                    : "border-line/70 bg-panel-soft/60"
                }`}
                title={show ? def.desc : "Secret badge — keep playing"}
              >
                <span className={`text-2xl ${unlocked ? "" : "opacity-30 grayscale"}`} aria-hidden>
                  {show ? def.icon : "❔"}
                </span>
                <p className={`mt-1 text-xs font-bold ${unlocked ? "text-ink" : "text-ink-faint"}`}>
                  {show ? def.name : "Secret badge"}
                </p>
                <p className="mt-0.5 text-[10px] leading-snug text-ink-faint">
                  {show ? def.desc : unlocked ? def.desc : "Hidden — discover it"}
                </p>
                {unlocked ? (
                  <p className="mt-1 text-[9px] text-ink-faint">
                    {new Date(at).toLocaleDateString()}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      </section>

      {/* ---------------------------- rank ladder ------------------------------ */}
      <section aria-labelledby="ranks" className="card panel-pad">
        <h2 id="ranks" className="text-base font-bold text-ink">
          Rank ladder
        </h2>
        <ol className="mt-3 space-y-1.5">
          {RANKS.map((r, i) => {
            const achieved = xp >= r.minXp;
            return (
              <li
                key={r.name}
                className={`flex items-center gap-3 rounded-lg px-3 py-1.5 text-sm ${
                  i === index ? "border border-accent/40 bg-accent-soft/50 text-ink" : achieved ? "text-ink-muted" : "text-ink-faint"
                }`}
              >
                <span className="font-mono text-xs">{String(i + 1).padStart(2, "0")}</span>
                <span className="grow font-medium">{r.name}</span>
                <span className="font-mono text-xs">{r.minXp} XP</span>
                {achieved ? <CheckIcon width={14} height={14} className="text-ok" /> : null}
              </li>
            );
          })}
        </ol>
      </section>

      <p className="text-xs text-ink-faint">
        Missed questions feed your weak-spot radar:{" "}
        {Object.keys(questionsById).length > 0 && game.codexSeen.length >= 0 ? (
          <Link href="/daily" className="link">
            run the Daily Circuit
          </Link>
        ) : null}{" "}
        to turn them into XP.
      </p>
    </div>
  );
}

function isModuleUnlockedSafe(moduleId: string, modules: ReturnType<typeof useProgressStore.getState>["modules"]): boolean {
  const m = MODULES.find((x) => x.id === moduleId);
  if (!m) return false;
  return m.prereqIds.every((pid) => modules[pid]?.passed === true);
}

function daysBetweenInclusive(lastActive: string, key: string, count: number): boolean {
  if (!lastActive) return false;
  const a = new Date(`${lastActive}T00:00:00`).getTime();
  const b = new Date(`${key}T00:00:00`).getTime();
  const diff = Math.round((b - a) / 86_400_000);
  return diff >= 0 && diff < Math.max(1, count);
}
