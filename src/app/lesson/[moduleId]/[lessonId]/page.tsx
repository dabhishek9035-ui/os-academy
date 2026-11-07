"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { lessonById, nextLesson, prevLesson, lessonsForModule } from "@/data/curriculum/lessons";
import { MODULE_MAP } from "@/data/curriculum/config";
import { LessonRenderer } from "@/components/lesson/LessonRenderer";
import { useProgressStore } from "@/lib/progress/store";
import { isModuleUnlocked } from "@/lib/progress/unlock";
import { useHasMounted } from "@/lib/useHasMounted";
import { zoneFor } from "@/lib/game/zones";
import { useGameStore } from "@/lib/game/player";
import { codexForLesson, glossaryById } from "@/lib/game/codex";
import { useSfx } from "@/lib/game/sfx";
import { bumpMood } from "@/lib/game/mood";
import { XpPop, CodexDrop } from "@/components/game/Juice";
import { CheckIcon, ChevronLeftIcon, ChevronRightIcon, LockIcon } from "@/components/ui/icons";

export default function LessonPage() {
  const params = useParams<{ moduleId: string; lessonId: string }>();
  const moduleId = params?.moduleId ?? "";
  const lessonSlug = params?.lessonId ?? "";
  const lessonId = `${moduleId}/${lessonSlug}`;

  const mounted = useHasMounted();
  const markLessonDone = useProgressStore((s) => s.markLessonDone);
  const progressModules = useProgressStore((s) => s.modules);
  const seeCodex = useGameStore((s) => s.seeCodex);
  const sfx = useSfx();

  const lesson = lessonById(lessonId);
  const mod = MODULE_MAP[moduleId];
  const zone = zoneFor(moduleId);
  const unlocked = !mod || !mounted ? true : isModuleUnlocked(mod, { modules: progressModules });

  const prev = useMemo(() => prevLesson(lessonId), [lessonId]);
  const next = useMemo(() => nextLesson(lessonId), [lessonId]);
  const isDone = Boolean(progressModules[moduleId]?.lessonsDone.includes(lessonId));
  const moduleLessons = lessonsForModule(moduleId);
  const moduleLessonIds = moduleLessons.map((l) => l.id);
  const isLastLessonOfModule =
    moduleLessons.length > 0 &&
    moduleLessonIds[moduleLessonIds.length - 1] === lessonId &&
    moduleLessonIds.includes(lessonId);
  const checkpointCount = lesson?.sections.length ?? 0;

  // scroll-driven checkpoint progress over the rendered sections
  const articleRef = useRef<HTMLElement | null>(null);
  const [checkpoints, setCheckpoints] = useState(0);

  const measureCheckpoints = useCallback(() => {
    const article = articleRef.current;
    if (!article) return;
    const sections = article.querySelectorAll("article > section, article > div > section");
    const viewportH = window.innerHeight;
    let passedCount = 0;
    sections.forEach((sec) => {
      const r = sec.getBoundingClientRect();
      if (r.top < viewportH * 0.62) passedCount += 1;
    });
    setCheckpoints(passedCount);
  }, []);

  useEffect(() => {
    measureCheckpoints();
    window.addEventListener("scroll", measureCheckpoints, { passive: true });
    window.addEventListener("resize", measureCheckpoints);
    return () => {
      window.removeEventListener("scroll", measureCheckpoints);
      window.removeEventListener("resize", measureCheckpoints);
    };
  }, [measureCheckpoints, lessonId, lesson?.sections.length]);

  // completion juice
  const [xpPop, setXpPop] = useState(0);
  const [codexDrop, setCodexDrop] = useState<{ count: number; names: string[] }>({ count: 0, names: [] });

  const completeLesson = () => {
    if (!lesson || isDone) return;
    markLessonDone(moduleId, lesson.id, lesson.title);
    setXpPop((x) => x + 1);
    sfx("xp");
    bumpMood("cheer");
    const drops = codexForLesson(lesson.id).filter((id) => !useGameStore.getState().codexSeen.includes(id));
    if (drops.length > 0) {
      seeCodex(drops);
      const names = drops
        .map((id) => glossaryById(id)?.term)
        .filter(Boolean)
        .slice(0, 3) as string[];
      setCodexDrop({ count: drops.length, names });
      sfx("unlock");
    }
  };

  // scroll to top on lesson change
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [lessonId]);

  if (!lesson) {
    return (
      <div className="card panel-pad">
        <h1 className="text-lg font-semibold text-ink">Quest not found</h1>
        <p className="mt-2 text-sm text-ink-muted">
          No lesson “{lessonId}”.{" "}
          <Link href={`/roadmap/${moduleId}`} className="link">
            Back to the zone
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
        <h1 className="mt-3 text-lg font-semibold text-ink">This district is fogged</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Clear the previous zone&apos;s boss first.{" "}
          <Link href="/roadmap" className="link">
            Open the world map
          </Link>
          .
        </p>
      </div>
    );
  }

  const revealedCheckpoints = Math.min(checkpoints, checkpointCount);
  const checkpointPct =
    checkpointCount === 0
      ? 0
      : Math.min(100, Math.round((revealedCheckpoints / checkpointCount) * 100));

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_240px]">
      <div className="min-w-0 space-y-8">
        {/* quest banner */}
        <header className="overflow-hidden rounded-2xl border border-line/80 bg-panel/70 backdrop-blur-md">
          <div
            className="h-1"
            style={{ background: `linear-gradient(90deg, ${zone.hue[0]}, ${zone.hue[1]})` }}
            aria-hidden
          />
          <div className="px-5 py-4 sm:px-6">
            <p
              className="font-mono text-[11px] font-bold uppercase tracking-[0.2em]"
              style={{ color: zone.hue[0] }}
            >
              {zone.glyph} Quest · {zone.name}
            </p>
            <h1 className="mt-1.5 text-2xl font-black tracking-tight text-ink sm:text-3xl">
              {lesson.title}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-ink-faint">
              <span className="chip">{lesson.minutes} min</span>
              <span className="chip">+25 XP on completion</span>
              {isDone ? (
                <span className="chip border-ok/40 text-ok">
                  <CheckIcon width={12} height={12} /> cleared
                </span>
              ) : null}
            </div>
            {/* checkpoint path */}
            <div className="mt-4">
              <div className="relative h-1.5 overflow-hidden rounded-full bg-panel-soft">
                <div
                  className="fill-gradient h-full rounded-full transition-all duration-300"
                  style={{ width: `${checkpointPct}%` }}
                />
              </div>
              <div className="mt-1 flex justify-between">
                {Array.from({ length: Math.min(checkpointCount, 12) }, (_, i) => (
                  <span
                    key={i}
                    className={`h-1.5 w-1.5 rounded-full ${
                      (i + 1) / Math.min(checkpointCount, 12) <= checkpointPct / 100
                        ? "bg-accent"
                        : "bg-panel-soft"
                    }`}
                    aria-hidden
                  />
                ))}
                <span className="font-mono text-[10px] text-ink-faint">
                  {Math.min(checkpoints, checkpointCount)}/{checkpointCount} checkpoints
                </span>
              </div>
            </div>
          </div>
        </header>

        <article ref={articleRef} className="space-y-8" aria-label={lesson.title}>
          <div className="space-y-8">
            <LessonBody lesson={lesson} hideHeader />
          </div>
        </article>

        <div className="relative flex flex-wrap items-center justify-between gap-3 border-t border-line pt-6">
          <XpPop amount={25} trigger={xpPop} />
          {prev ? (
            <Link
              href={`/lesson/${prev.id}`}
              className="btn"
              aria-label={`Previous quest: ${prev.title}`}
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
                    if (!isDone) completeLesson();
                  }}
                  aria-label={`Next quest: ${next.title}`}
                >
                  {next.title} <ChevronRightIcon />
                </Link>
              ) : null}
              <Link
                href={`/quiz/${moduleId}`}
                className="btn btn-primary"
                onClick={() => {
                  if (!isDone) completeLesson();
                }}
              >
                ⚔ Face the zone boss
              </Link>
            </div>
          ) : next ? (
            <Link
              href={`/lesson/${next.id}`}
              className="btn btn-primary"
              onClick={() => {
                if (!isDone) completeLesson();
              }}
              aria-label={`Next quest: ${next.title}`}
            >
              {next.title} <ChevronRightIcon />
            </Link>
          ) : null}
        </div>

        <CodexDrop count={codexDrop.count} names={codexDrop.names} />
      </div>

      <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start" aria-label="Quest tools">
        <button
          type="button"
          className={`btn w-full ${isDone ? "" : "btn-primary"}`}
          onClick={completeLesson}
          disabled={isDone}
        >
          {isDone ? (
            <>
              <CheckIcon width={14} height={14} /> Quest cleared
            </>
          ) : (
            "Complete quest (+25 XP)"
          )}
        </button>

        {moduleLessons.length > 0 ? (
          <nav className="card p-3" aria-label="Zone quests">
            <h2 className="section-label mb-2">{mod?.title ?? "Zone"}</h2>
            <ol className="space-y-1">
              {moduleLessons.map((l, i) => {
                const active = l.id === lessonId;
                const done = progressModules[moduleId]?.lessonsDone.includes(l.id);
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
                        className={`grid h-4 w-4 shrink-0 place-items-center rounded-full text-[9px] ${
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

/** Renders the lesson body (kept in sync with LessonRenderer's section map). */
function LessonBody({ lesson, hideHeader }: { lesson: import("@/types").Lesson; hideHeader?: boolean }) {
  return <LessonRenderer lesson={lesson} hideHeader={hideHeader} />;
}
