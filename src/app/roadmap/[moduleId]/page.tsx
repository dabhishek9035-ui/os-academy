"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { MODULE_MAP, SIM_TITLES } from "@/data/curriculum/config";
import { lessonsForModule } from "@/data/curriculum/lessons";
import { useProgressStore } from "@/lib/progress/store";
import { isModuleUnlocked } from "@/lib/progress/unlock";
import { useHasMounted } from "@/lib/useHasMounted";
import { CheckIcon, LockIcon } from "@/components/ui/icons";

export default function ModuleOverviewPage() {
  const params = useParams<{ moduleId: string }>();
  const moduleId = params?.moduleId ?? "";
  const mounted = useHasMounted();
  const modules = useProgressStore((s) => s.modules);

  const mod = MODULE_MAP[moduleId];
  if (!mod) {
    return (
      <div className="card panel-pad">
        <h1 className="text-lg font-semibold text-ink">Module not found</h1>
        <p className="mt-2 text-sm text-ink-muted">
          No module with id “{moduleId}”.{" "}
          <Link href="/roadmap" className="link">
            Back to the roadmap
          </Link>
          .
        </p>
      </div>
    );
  }

  const unlocked = !mounted || isModuleUnlocked(mod, { modules });
  const lessons = lessonsForModule(moduleId);
  const mp = modules[moduleId];
  const doneLessons = mp?.lessonsDone ?? [];
  const allLessonsDone =
    lessons.length > 0 && lessons.every((l) => doneLessons.includes(l.id));

  if (!unlocked) {
    return (
      <div className="card panel-pad text-center">
        <LockIcon width={28} height={28} className="mx-auto text-ink-faint" />
        <h1 className="mt-3 text-lg font-semibold text-ink">{mod.title} is locked</h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-ink-muted">
          Pass the assessment of {mod.prereqIds.join(" and ")} to unlock this
          module. You can revisit completed modules any time.
        </p>
        <Link href="/roadmap" className="btn btn-primary mt-4">
          Back to roadmap
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <nav aria-label="Breadcrumb" className="text-xs text-ink-faint">
        <Link href="/roadmap" className="hover:text-ink">
          Roadmap
        </Link>{" "}
        / <span className="text-ink-muted">{mod.title}</span>
      </nav>

      <header>
        <p className="section-label">Module {mod.num}</p>
        <h1 className="mt-1 text-2xl font-bold text-ink sm:text-3xl">{mod.title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-muted">
          {mod.description}
        </p>
      </header>

      <section aria-labelledby="lessons-heading" className="space-y-2">
        <h2 id="lessons-heading" className="text-lg font-semibold text-ink">
          Lessons
        </h2>
        {lessons.length === 0 ? (
          <p className="card panel-pad text-sm text-ink-muted">
            Lessons for this module are being written.
          </p>
        ) : (
          <ol className="space-y-2">
            {lessons.map((lesson, i) => {
              const done = doneLessons.includes(lesson.id);
              return (
                <li key={lesson.id}>
                  <Link
                    href={`/lesson/${moduleId}/${lesson.id.split("/")[1]}`}
                    className="card flex items-center gap-3 px-4 py-3 transition-colors hover:border-accent/50"
                  >
                    <span
                      className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs ${
                        done ? "bg-ok/15 text-ok" : "bg-panel-soft text-ink-faint"
                      }`}
                      aria-label={done ? "Lesson completed" : `Lesson ${i + 1}`}
                    >
                      {done ? <CheckIcon width={13} height={13} /> : i + 1}
                    </span>
                    <span className="min-w-0 grow">
                      <span className="block text-sm font-medium text-ink">
                        {lesson.title}
                      </span>
                      <span className="block text-xs text-ink-faint">
                        {lesson.minutes} min · {lesson.objectives[0]}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      <section aria-labelledby="assess-heading" className="card panel-pad">
        <h2 id="assess-heading" className="text-lg font-semibold text-ink">
          Module assessment
        </h2>
        <p className="mt-1.5 text-sm text-ink-muted">
          Ten multiple-choice questions drawn from a larger bank. Score at least
          80% to pass and unlock the next module. Retakes are unlimited and each
          attempt draws fresh questions.
        </p>
        {lessons.length > 0 && !allLessonsDone ? (
          <p className="mt-3 rounded-lg border border-warn/40 bg-warn/10 px-3 py-2 text-sm text-ink">
            Finish all {lessons.length} lessons first — the assessment opens once
            every lesson is marked complete.
          </p>
        ) : null}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Link
            href={`/quiz/${moduleId}`}
            className={`btn btn-primary ${lessons.length > 0 && !allLessonsDone ? "pointer-events-none opacity-40" : ""}`}
            aria-disabled={lessons.length > 0 && !allLessonsDone}
          >
            {mp?.passed ? "Retake assessment" : "Start assessment"}
          </Link>
          {mp && mp.attempts.length > 0 ? (
            <span className="text-xs text-ink-faint">
              Attempts: {mp.attempts.length} · best {Math.round(mp.bestScore * 100)}%
              {mp.passed ? " · PASSED" : ""}
            </span>
          ) : null}
        </div>
      </section>

      {mod.simIds.length > 0 ? (
        <section aria-labelledby="sims-heading" className="card panel-pad">
          <h2 id="sims-heading" className="text-sm font-semibold text-ink">
            Simulations in this module
          </h2>
          <ul className="mt-2 flex flex-wrap gap-2">
            {mod.simIds.map((s) => (
              <li key={s} className="chip">
                {SIM_TITLES[s] ?? s}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
