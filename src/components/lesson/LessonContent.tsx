"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo } from "react";
import { lessonById, nextLesson, prevLesson, lessonsForModule, lessonIdsForModule } from "@/data/curriculum/lessons";
import { MODULE_MAP } from "@/data/curriculum/config";
import { LessonRenderer } from "@/components/lesson/LessonRenderer";
import { useProgressStore } from "@/lib/progress/store";
import { isModuleUnlocked } from "@/lib/progress/unlock";
import { useHasMounted } from "@/lib/useHasMounted";
import { CheckIcon, ChevronLeftIcon, ChevronRightIcon, LockIcon } from "@/components/ui/icons";

export function LessonContent() {
  const params = useParams<{ moduleId: string; lessonId: string }>();
  const moduleId = params?.moduleId ?? "";
  const lessonSlug = params?.lessonId ?? "";
  const lessonId = `${moduleId}/${lessonSlug}`;

  const mounted = useHasMounted();
  const markLessonDone = useProgressStore((s) => s.markLessonDone);
  const modules = useProgressStore((s) => s.modules);

  const lesson = lessonById(lessonId);
  const mod = MODULE_MAP[moduleId];
  const unlocked = !mod || !mounted ? true : isModuleUnlocked(mod, { modules });

  const prev = useMemo(() => prevLesson(lessonId), [lessonId]);
  const next = useMemo(() => nextLesson(lessonId), [lessonId]);
  const isDone = Boolean(modules[moduleId]?.lessonsDone.includes(lessonId));
  const moduleLessons = lessonsForModule(moduleId);
  const moduleLessonIds = lessonIdsForModule(moduleId);
  const isLastLessonOfModule =
    moduleLessonIds.length > 0 && moduleLessonIds[moduleLessonIds.length - 1] === lessonId;

  // Scroll to top on lesson change.
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [lessonId]);

  if (!lesson) {
    return (
      <div className="card panel-pad">
        <h1 className="text-lg font-semibold text-ink">Lesson not found</h1>
        <p className="mt-2 text-sm text-ink-muted">
          No lesson “{lessonId}”.{" "}
          <Link href={`/roadmap/${moduleId}`} className="link">
            Back to the module
          </Link>
          .
        </p>
      </div>
    );
  }

  if (!unlocked) {
    return (
      <div className="card panel-pad text-center">
        <LockIcon width={28} height={28} className="mx-auto text-ink-faint" />
        <h1 className="mt-3 text-lg font-semibold text-ink">This lesson is locked</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Complete the earlier modules first.{" "}
          <Link href="/roadmap" className="link">
            View the roadmap
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_240px]">
      <div className="min-w-0 space-y-8">
        <LessonRenderer lesson={lesson} />

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-6">
          {prev ? (
            <Link
              href={`/lesson/${prev.id}`}
              className="btn"
              aria-label={`Previous lesson: ${prev.title}`}
            >
              <ChevronLeftIcon /> {prev.title}
            </Link>
          ) : (
            <span />
          )}
          {isLastLessonOfModule ? (
            <div className="flex flex-wrap items-center gap-2">
              {next ? (
                <Link
                  href={`/lesson/${next.id}`}
                  className="btn btn-ghost"
                  onClick={() => {
                    if (!isDone) markLessonDone(moduleId, lesson.id, lesson.title);
                  }}
                  aria-label={`Next lesson: ${next.title}`}
                >
                  {next.title} <ChevronRightIcon />
                </Link>
              ) : null}
              <Link
                href={`/quiz/${moduleId}`}
                className="btn btn-primary"
                onClick={() => {
                  if (!isDone) markLessonDone(moduleId, lesson.id, lesson.title);
                }}
              >
                Go to the module assessment
              </Link>
            </div>
          ) : next ? (
            <Link
              href={`/lesson/${next.id}`}
              className="btn btn-primary"
              onClick={() => {
                if (!isDone) markLessonDone(moduleId, lesson.id, lesson.title);
              }}
              aria-label={`Next lesson: ${next.title}`}
            >
              {next.title} <ChevronRightIcon />
            </Link>
          ) : null}
        </div>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start" aria-label="Lesson tools">
        <button
          type="button"
          className={`btn w-full ${isDone ? "" : "btn-primary"}`}
          onClick={() => markLessonDone(moduleId, lesson.id, lesson.title)}
          disabled={isDone}
        >
          {isDone ? (
            <>
              <CheckIcon width={14} height={14} /> Lesson completed
            </>
          ) : (
            "Mark lesson complete"
          )}
        </button>

        {moduleLessons.length > 0 ? (
          <nav className="card p-3" aria-label="Module lessons">
            <h2 className="section-label mb-2">{mod?.title ?? "Module"}</h2>
            <ol className="space-y-1">
              {moduleLessons.map((l, i) => {
                const active = l.id === lessonId;
                const done = modules[moduleId]?.lessonsDone.includes(l.id);
                return (
                  <li key={l.id}>
                    <Link
                      href={`/lesson/${l.id}`}
                      aria-current={active ? "page" : undefined}
                      className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors ${
                        active
                          ? "bg-accent-soft text-ink"
                          : "text-ink-muted hover:bg-panel-soft hover:text-ink"
                      }`}
                    >
                      <span
                        className={`grid h-4 w-4 shrink-0 place-items-center rounded-full text-xs ${
                          done ? "bg-ok/20 text-ok" : "bg-panel-soft text-ink-faint"
                        }`}
                        aria-hidden
                      >
                        {done ? "✓" : i + 1}
                      </span>
                      <span className="truncate">{l.title}</span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          </nav>
        ) : null}
      </aside>
    </div>
  );
}
