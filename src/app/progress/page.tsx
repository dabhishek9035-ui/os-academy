"use client";

import Link from "next/link";
import { useMemo } from "react";
import { MODULES, LESSON_TITLES } from "@/data/curriculum/config";
import { lessonsForModule } from "@/data/curriculum/lessons";
import { ALL_QUESTIONS } from "@/data/questions";
import { useProgressStore } from "@/lib/progress/store";
import {
  courseCompletion,
  deriveWeakAreas,
  isModuleUnlocked,
} from "@/lib/progress/unlock";
import { useHasMounted } from "@/lib/useHasMounted";
import { CheckIcon, LockIcon } from "@/components/ui/icons";

export default function ProgressPage() {
  const mounted = useHasMounted();
  const modules = useProgressStore((s) => s.modules);
  const activity = useProgressStore((s) => s.activity);

  const questionsById = useMemo(
    () => Object.fromEntries(ALL_QUESTIONS.map((q) => [q.id, q])),
    [],
  );
  const lessonCounts = useMemo(
    () => Object.fromEntries(MODULES.map((m) => [m.id, lessonsForModule(m.id).length])),
    [],
  );
  const overall = courseCompletion(MODULES, { modules }, lessonCounts);
  const weakAreas = useMemo(
    () => deriveWeakAreas({ modules }, questionsById),
    [modules, questionsById],
  );
  const passedCount = MODULES.filter((m) => modules[m.id]?.passed).length;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-ink sm:text-3xl">Your progress</h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-muted">
          Everything on this page is computed from your actual lesson and
          assessment history, stored locally in this browser.
        </p>
      </header>

      {!mounted ? (
        <p className="card panel-pad text-sm text-ink-faint">Loading saved progress…</p>
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-3" aria-label="Overview">
            <div className="card panel-pad">
              <p className="section-label">Course completion</p>
              <p className="mt-2 text-3xl font-semibold text-ink">{Math.round(overall * 100)}%</p>
              <div
                className="mt-3 h-2 overflow-hidden rounded-full bg-panel-soft"
                role="progressbar"
                aria-valuenow={Math.round(overall * 100)}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div className="fill-gradient h-full rounded-full" style={{ width: `${overall * 100}%` }} />
              </div>
            </div>
            <div className="card panel-pad">
              <p className="section-label">Modules passed</p>
              <p className="mt-2 text-3xl font-semibold text-ink">
                {passedCount}
                <span className="text-base font-normal text-ink-faint"> / {MODULES.length}</span>
              </p>
              <p className="mt-3 text-xs text-ink-faint">
                80% or more on each module&apos;s assessment.
              </p>
            </div>
            <div className="card panel-pad">
              <p className="section-label">Lessons completed</p>
              <p className="mt-2 text-3xl font-semibold text-ink">
                {MODULES.reduce((acc, m) => acc + (modules[m.id]?.lessonsDone.length ?? 0), 0)}
                <span className="text-base font-normal text-ink-faint">
                  {" "}
                  / {Object.values(lessonCounts).reduce((a, b) => a + b, 0)}
                </span>
              </p>
              <Link href="/roadmap" className="link mt-3 inline-block text-xs">
                Continue learning →
              </Link>
            </div>
          </section>

          <section aria-labelledby="per-module">
            <h2 id="per-module" className="text-lg font-semibold text-ink">
              Modules
            </h2>
            <ul className="mt-3 space-y-2">
              {MODULES.map((m) => {
                const mp = modules[m.id];
                const lessons = lessonsForModule(m.id);
                const done = (mp?.lessonsDone ?? []).filter((id) =>
                  lessons.some((l) => l.id === id),
                ).length;
                const unlocked = isModuleUnlocked(m, { modules });
                return (
                  <li key={m.id} className="card flex flex-wrap items-center gap-3 px-4 py-3">
                    <span
                      className={`grid h-7 w-7 place-items-center rounded-full text-xs ${
                        mp?.passed ? "bg-ok/15 text-ok" : "bg-panel-soft text-ink-faint"
                      }`}
                    >
                      {mp?.passed ? <CheckIcon width={13} height={13} /> : unlocked ? m.num : <LockIcon width={12} height={12} />}
                    </span>
                    <span className="min-w-0 grow truncate text-sm text-ink">
                      {m.num}. {m.title}
                    </span>
                    <span className="text-xs text-ink-faint">
                      {done}/{lessons.length} lessons
                    </span>
                    <span className="w-24 text-right text-xs text-ink-faint">
                      {mp && mp.attempts.length > 0
                        ? `best ${Math.round(mp.bestScore * 100)}% (${mp.attempts.length} try${mp.attempts.length === 1 ? "" : "s"})`
                        : "no attempts"}
                    </span>
                    {unlocked ? (
                      <Link href={`/roadmap/${m.id}`} className="btn text-xs">
                        Open
                      </Link>
                    ) : (
                      <span className="chip">locked</span>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            <section aria-labelledby="weak-heading" className="card panel-pad">
              <h2 id="weak-heading" className="text-lg font-semibold text-ink">
                Concepts to revisit
              </h2>
              {weakAreas.length === 0 ? (
                <p className="mt-2 text-sm text-ink-muted">
                  Nothing flagged yet — take an assessment and this panel will
                  point at lessons whose questions you missed.
                </p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {weakAreas.map((w) => (
                    <li key={w.lessonRef} className="flex items-center justify-between gap-2">
                      <Link href={`/lesson/${w.lessonRef}`} className="link text-sm">
                        {LESSON_TITLES[w.lessonRef] ?? w.lessonRef}
                      </Link>
                      <span className="chip shrink-0 text-xs">
                        {w.wrong} wrong of {w.answered}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section aria-labelledby="activity-heading" className="card panel-pad">
              <h2 id="activity-heading" className="text-lg font-semibold text-ink">
                Recent activity
              </h2>
              {activity.length === 0 ? (
                <p className="mt-2 text-sm text-ink-muted">
                  No activity yet — start with the first lesson on the roadmap.
                </p>
              ) : (
                <ol className="mt-3 space-y-1.5 text-sm">
                  {activity.slice(0, 12).map((a, i) => (
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
        </>
      )}
    </div>
  );
}
