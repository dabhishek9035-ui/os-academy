"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useEffect, useMemo } from "react";
import { MODULES, LESSON_TITLES } from "@/data/curriculum/config";
import { lessonsForModule } from "@/data/curriculum/lessons";
import { useProgressStore } from "@/lib/progress/store";
import { isModuleUnlocked } from "@/lib/progress/unlock";
import { rankFor, totalXp, useGameStore } from "@/lib/game/player";
import { zoneFor } from "@/lib/game/zones";
import { useHasMounted } from "@/lib/useHasMounted";
import { useMood } from "@/lib/game/mood";
import { BitIcon } from "@/components/game/HUD";

const FIRST_LESSON = "/lesson/intro-computers-os/what-is-a-computer";

export default function HomePage() {
  const mounted = useHasMounted();
  const bump = useMood((s) => s.bump);
  useEffect(() => {
    if (mounted) {
      const t = window.setTimeout(() => bump("wave"), 900);
      return () => window.clearTimeout(t);
    }
  }, [mounted, bump]);

  const progress = useProgressStore((s) => s.modules);
  const game = useGameStore();
  const daily = game.daily;

  const { continueHref, nextZone, nextLabel, dailyDone } = useMemo(() => {
    let cont: string | null = null;
    let zoneId: string | null = null;
    let label = "";
    for (const m of MODULES) {
      const unlocked = isModuleUnlocked(m, { modules: progress });
      const lessons = lessonsForModule(m.id);
      const done = (progress[m.id]?.lessonsDone ?? []).filter((id) =>
        lessons.some((l) => l.id === id),
      );
      if (!cont && unlocked && done.length < lessons.length) {
        const next = lessons[done.length];
        cont = next ? `/lesson/${m.id}/${next.id.split("/")[1]}` : null;
        zoneId = m.id;
        label = next?.title ?? "";
      }
    }
    const today = new Date();
    const key = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    return {
      continueHref: cont,
      nextZone: zoneId,
      nextLabel: label,
      dailyDone: daily.lastDate === key,
    };
  }, [progress, daily.lastDate]);

  const xp = totalXp(progress, game);
  const { rank, into, span, next, index } = rankFor(xp);
  const zone = zoneFor(nextZone ?? undefined);

  return (
    <div className="space-y-10">
      {/* ---------------------------------- hero ---------------------------------- */}
      <section className="relative overflow-hidden rounded-2xl border border-line/80 bg-panel/70 px-6 py-10 shadow-pop backdrop-blur-md sm:px-10 sm:py-14">
        <div className="relative flex flex-col gap-8 md:flex-row md:items-center">
          <div className="min-w-0 grow">
            <p className="section-label">Machina · a machine world that runs on what you learn</p>
            <h1 className="mt-3 text-4xl font-black leading-[1.05] tracking-tight text-ink sm:text-6xl">
              Reboot the world.
              <br />
              <span className="bg-gradient-to-r from-cyan-300 via-sky-300 to-indigo-300 bg-clip-text text-transparent">
                One zone at a time.
              </span>
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-ink-muted">
              Fourteen districts of a dormant operating system. Learn how each
              one works, beat its boss, and the road to the Core lights up.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              {continueHref ? (
                <Link href={continueHref} className="btn btn-primary px-6 py-3 text-base">
                  ▶ Continue quest
                </Link>
              ) : (
                <Link href={FIRST_LESSON} className="btn btn-primary px-6 py-3 text-base">
                  ▶ Start from zero
                </Link>
              )}
              <Link href="/roadmap" className="btn px-5 py-3 text-base">
                World map
              </Link>
              <Link href="/daily" className="btn px-5 py-3 text-base">
                ◈ Daily circuit {dailyDone ? "✓" : ""}
              </Link>
            </div>

            {/* player strip */}
            <div className="mt-7 flex max-w-md items-center gap-3 rounded-xl border border-line/70 bg-panel-soft/70 px-4 py-3">
              <BitIcon size={34} />
              <div className="min-w-0 grow">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-accent">
                    {rank.name}
                  </span>
                  <span className="font-mono text-[10px] text-ink-faint">{xp} XP</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-panel">
                  <motion.div
                    className="fill-gradient h-full rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, Math.round((into / span) * 100))}%` }}
                    transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
                  />
                </div>
                <p className="mt-1 truncate text-[11px] text-ink-faint">
                  {next ? `${next.minXp - xp} XP to ${next.name}` : "Maximum rank — the Core knows you"}
                </p>
              </div>
            </div>
          </div>

          {/* next objective card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.6, ease: "easeOut" }}
            className="w-full shrink-0 rounded-xl border border-accent/30 bg-bg-soft/80 p-5 backdrop-blur-sm md:w-80"
          >
            <p className="section-label">Next objective</p>
            {continueHref ? (
              <>
                <p
                  className="mt-2 font-mono text-[11px] uppercase tracking-widest"
                  style={{ color: zone.hue[0] }}
                >
                  {zone.glyph} {zone.name}
                </p>
                <p className="mt-1 text-lg font-bold text-ink">{nextLabel || "Enter the zone"}</p>
                <p className="mt-1.5 text-sm text-ink-muted">{zone.story}</p>
                <Link href={continueHref} className="btn mt-4 w-full">
                  Open quest →
                </Link>
              </>
            ) : (
              <>
                <p className="mt-2 text-lg font-bold text-ink">Machina is awake.</p>
                <p className="mt-1.5 text-sm text-ink-muted">
                  Every zone is online. Replay any quest, chase badges, or take
                  the Daily Circuit to keep your streak burning.
                </p>
                <Link href="/roadmap" className="btn mt-4 w-full">
                  Open the world map →
                </Link>
              </>
            )}
            <p className="mt-3 font-mono text-[10px] text-ink-faint">
              RANK {String(index + 1).padStart(2, "0")} · {rank.name.toUpperCase()}
            </p>
          </motion.div>
        </div>
      </section>

      {/* ------------------------------ systems row ------------------------------ */}
      <section aria-label="How the game works" className="grid gap-4 sm:grid-cols-3">
        {[
          {
            icon: "📜",
            title: "Lessons are quests",
            body: "Every quest checkpoints your progress, drops codex cards, and ends with XP.",
            href: "/roadmap",
          },
          {
            icon: "⚔",
            title: "Bosses guard every zone",
            body: "Ten-question boss fights with health bars and combos. Win to unlock the next district.",
            href: "/roadmap",
          },
          {
            icon: "🕹",
            title: "Labs are missions",
            body: "Real machine simulations with objectives — bust the convoy, break a race on purpose, untangle a deadlock.",
            href: "/playground",
          },
        ].map((c) => (
          <Link
            key={c.title}
            href={c.href}
            className="card panel-pad transition-all hover:-translate-y-0.5 hover:border-accent/50 hover:shadow-glow"
          >
            <span className="text-2xl" aria-hidden>
              {c.icon}
            </span>
            <h2 className="mt-2 text-base font-bold text-ink">{c.title}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{c.body}</p>
          </Link>
        ))}
      </section>

      {/* ------------------------------ journey strip ---------------------------- */}
      <section aria-labelledby="journey">
        <div className="flex items-end justify-between">
          <h2 id="journey" className="text-xl font-bold text-ink">
            The 14 districts
          </h2>
          <Link href="/roadmap" className="link text-sm">
            Open world map →
          </Link>
        </div>
        <div className="thin-scroll mt-4 flex gap-2 overflow-x-auto pb-3">
          {MODULES.map((m) => {
            const passed = mounted && progress[m.id]?.passed;
            const unlocked = !mounted || isModuleUnlocked(m, { modules: progress });
            const zone = zoneFor(m.id);
            return (
              <Link
                key={m.id}
                href={unlocked ? `/roadmap/${m.id}` : "/roadmap"}
                className={`group relative flex w-40 shrink-0 flex-col rounded-xl border p-3 transition-all ${
                  passed
                    ? "border-ok/30 bg-panel"
                    : unlocked
                      ? "border-accent/40 bg-panel hover:-translate-y-0.5 hover:shadow-glow"
                      : "border-line/60 bg-panel/50 opacity-70"
                }`}
              >
                <span
                  className="font-mono text-[10px] uppercase tracking-widest"
                  style={{ color: zone.hue[0] }}
                >
                  {zone.glyph} {zone.name}
                </span>
                <span className="mt-1.5 text-sm font-semibold leading-snug text-ink">{m.title}</span>
                <span className="mt-1 text-[10px] text-ink-faint">
                  {passed ? "★ cleared" : unlocked ? "ready" : "locked"}
                </span>
                <span
                  className="absolute inset-x-3 bottom-0 h-0.5 rounded-full opacity-60"
                  style={{ background: `linear-gradient(90deg, ${zone.hue[0]}, ${zone.hue[1]})` }}
                  aria-hidden
                />
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
