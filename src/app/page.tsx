"use client";

import Link from "next/link";
import { useMemo } from "react";
import { MODULES } from "@/data/curriculum/config";
import { lessonsForModule } from "@/data/curriculum/lessons";
import { useProgressStore } from "@/lib/progress/store";
import { isModuleUnlocked } from "@/lib/progress/unlock";
import { useHasMounted } from "@/lib/useHasMounted";
import { ChartIcon, CheckIcon, LockIcon, TerminalIcon } from "@/components/ui/icons";

const FIRST_LESSON = "/lesson/intro-computers-os/what-is-a-computer";

export default function HomePage() {
  const mounted = useHasMounted();
  const modules = useProgressStore((s) => s.modules);

  const { completedCount, continueHref, startFresh } = useMemo(() => {
    let done = 0;
    let cont: string | null = null;
    for (const m of MODULES) {
      const unlocked = isModuleUnlocked(m, { modules });
      const lessons = lessonsForModule(m.id);
      const doneLessons = (modules[m.id]?.lessonsDone ?? []).filter((id) =>
        lessons.some((l) => l.id === id),
      );
      if (modules[m.id]?.passed) done += 1;
      if (!cont && unlocked && doneLessons.length < lessons.length) {
        const next = lessons[doneLessons.length];
        cont = next ? `/lesson/${m.id}/${next.id.split("/")[1]}` : null;
      }
    }
    return {
      completedCount: done,
      continueHref: cont,
      startFresh: done === 0 && !cont,
    };
  }, [modules]);

  return (
    <div className="space-y-12">
      {/* Hero */}
      <section className="relative rounded-2xl border border-line bg-panel px-6 py-10 sm:px-10 sm:py-14">
        <div className="relative max-w-2xl">
          <p className="section-label">An interactive operating-systems course</p>
          <h1 className="mt-3 text-3xl font-semibold leading-tight text-ink sm:text-5xl">
            Don&apos;t memorize operating systems.{" "}
            <span className="text-accent">
              Watch them work.
            </span>
          </h1>
          <p className="mt-4 text-base leading-relaxed text-ink-muted sm:text-lg">
            Start from zero and climb to undergraduate-level OS topics —
            interrupts, processes, scheduling, memory, deadlocks, filesystems,
            security and more — by stepping through live simulations of the
            machine itself. Every idea is introduced as a problem first, a
            picture second, and formal terms only once the idea makes sense.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            {startFresh || !continueHref ? (
              <Link href={FIRST_LESSON} className="btn btn-primary px-5 py-2.5 text-base">
                Start from zero
              </Link>
            ) : (
              <Link href={continueHref} className="btn btn-primary px-5 py-2.5 text-base">
                Continue learning
              </Link>
            )}
            <Link href="/roadmap" className="btn px-5 py-2.5 text-base">
              See the full roadmap
            </Link>
            <Link href="/playground" className="btn btn-ghost px-4 py-2.5 text-base">
              Just explore the labs
            </Link>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            <span className="chip">14 modules</span>
            <span className="chip">26 live simulations</span>
            <span className="chip">280 quiz questions</span>
            <span className="chip">runs 100% locally</span>
          </div>
          {mounted && completedCount > 0 ? (
            <p className="mt-4 text-sm text-ink-muted">
              You have completed {completedCount} of {MODULES.length} module
              {MODULES.length === 1 ? "" : "s"} — keep going!
            </p>
          ) : null}
        </div>
      </section>

      {/* How it works */}
      <section aria-labelledby="how-it-works">
        <h2 id="how-it-works" className="text-xl font-semibold text-ink">
          How you&apos;ll learn
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {[
            {
              icon: <ChartIcon />,
              title: "Watch the machine",
              body: "Every concept begins with a live 2D simulation — a CPU taking interrupts, jobs fighting for the scheduler, pages faulting — with play, pause and step controls.",
            },
            {
              icon: <TerminalIcon />,
              title: "Poke at it",
              body: "Change bursts, reference strings, resource requests — or type commands into a safe educational terminal that drives the very same simulation state.",
            },
            {
              icon: <CheckIcon />,
              title: "Prove it",
              body: "Each module ends with a ten-question assessment. Pass it (80%) and the next module unlocks. Progress is saved in your browser, no account needed.",
            },
          ].map((c) => (
            <div key={c.title} className="card panel-pad">
              <div className="flex items-center gap-2 text-accent">
                {c.icon}
                <h3 className="text-sm font-semibold text-ink">{c.title}</h3>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">{c.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Roadmap preview */}
      <section aria-labelledby="journey">
        <div className="flex items-end justify-between">
          <h2 id="journey" className="text-xl font-semibold text-ink">
            The learning journey
          </h2>
          <Link href="/roadmap" className="link text-sm">
            Open full roadmap →
          </Link>
        </div>
        <ol className="mt-4 grid gap-2.5 sm:grid-cols-2">
          {MODULES.map((m) => {
            const unlocked = !mounted || isModuleUnlocked(m, { modules });
            return (
              <li key={m.id}>
                <Link
                  href={unlocked ? `/roadmap/${m.id}` : "/roadmap"}
                  className={`card flex items-center gap-3 px-4 py-3 transition-colors ${
                    unlocked ? "hover:border-accent/50" : "opacity-70"
                  }`}
                >
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-panel-soft font-mono text-sm text-ink-muted">
                    {unlocked ? m.num : <LockIcon width={14} height={14} />}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-ink">
                      {m.title}
                    </span>
                    <span className="block truncate text-xs text-ink-muted">
                      {m.tagline}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}
