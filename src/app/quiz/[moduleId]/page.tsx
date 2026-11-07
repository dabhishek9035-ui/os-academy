"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MODULE_MAP, LESSON_TITLES } from "@/data/curriculum/config";
import { questionsForModule } from "@/data/questions";
import {
  gradeAttempt,
  PASSING_THRESHOLD,
  prepareAttempt,
  QUESTIONS_PER_ATTEMPT,
  type GradedAttempt,
  type PreparedQuestion,
} from "@/lib/quiz/engine";
import { useProgressStore } from "@/lib/progress/store";
import { useGameStore } from "@/lib/game/player";
import { zoneFor } from "@/lib/game/zones";
import { useHasMounted } from "@/lib/useHasMounted";
import { useSfx } from "@/lib/game/sfx";
import { bumpMood } from "@/lib/game/mood";
import { CheckIcon, XIcon } from "@/components/ui/icons";

type Phase = "intro" | "running" | "graded";

const BOSS_MAX_HP = 10;

export default function QuizPage() {
  const params = useParams<{ moduleId: string }>();
  const moduleId = params?.moduleId ?? "";
  const mounted = useHasMounted();
  const recordAttempt = useProgressStore((s) => s.recordAttempt);
  // stable selector: the modules map reference only changes on real writes
  const modulesMap = useProgressStore((s) => s.modules);
  const attempts = useMemo(
    () => modulesMap[moduleId]?.attempts ?? [],
    [modulesMap, moduleId],
  );
  const recordBoss = useGameStore((s) => s.recordBoss);
  const addBonusXp = useGameStore((s) => s.addBonusXp);
  const touchStreak = useGameStore((s) => s.touchStreak);
  const sfx = useSfx();

  const mod = MODULE_MAP[moduleId];
  const zone = zoneFor(moduleId);
  const bank = useMemo(() => questionsForModule(moduleId), [moduleId]);

  const [phase, setPhase] = useState<Phase>("intro");
  const [prepared, setPrepared] = useState<PreparedQuestion[]>([]);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [current, setCurrent] = useState(0);
  const [graded, setGraded] = useState<GradedAttempt | null>(null);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [bossHit, setBossHit] = useState(0); // flash trigger
  const [playerHit, setPlayerHit] = useState(0);
  const [hintUsed, setHintUsed] = useState<Record<number, number[]>>({});

  useEffect(() => {
    if (phase === "intro") {
      sfx("boss");
      bumpMood("wave");
    }
  }, [phase, sfx]);

  const playerHp = Math.max(
    0,
    BOSS_MAX_HP - answers.filter((a, i) => a !== null && a !== prepared[i]?.answerIndex).length,
  );
  const bossHp = BOSS_MAX_HP - answers.filter((a, i) => a === prepared[i]?.answerIndex).length;

  const start = () => {
    if (bank.length < QUESTIONS_PER_ATTEMPT) return;
    const qs = prepareAttempt(bank, { count: QUESTIONS_PER_ATTEMPT });
    setPrepared(qs);
    setAnswers(Array(qs.length).fill(null));
    setCurrent(0);
    setGraded(null);
    setCombo(0);
    setMaxCombo(0);
    setHintUsed({});
    setPhase("running");
  };

  const choose = (qi: number, oi: number) => {
    if (answers[qi] !== null) return;
    const nextAnswers = answers.map((v, idx) => (idx === qi ? oi : v));
    setAnswers(nextAnswers);
    if (prepared[qi].answerIndex === oi) {
      const nc = combo + 1;
      setCombo(nc);
      setMaxCombo((m) => Math.max(m, nc));
      setBossHit((h) => h + 1);
      sfx("correct");
      bumpMood("cheer");
    } else {
      setCombo(0);
      setPlayerHit((h) => h + 1);
      sfx("wrong");
      bumpMood("oops");
    }
  };

  const useHint = () => {
    const qi = current;
    if (hintUsed[qi] || answers[qi] !== null) return;
    const q = prepared[qi];
    const wrongIdx = q.options.map((_, i) => i).filter((i) => i !== q.answerIndex);
    const removed = wrongIdx.slice(0, 2);
    setHintUsed((h) => ({ ...h, [qi]: removed }));
    sfx("click");
  };

  const submit = () => {
    const g = gradeAttempt(prepared, answers);
    setGraded(g);
    setPhase("graded");
    recordAttempt({
      id: `${moduleId}-${Date.now()}`,
      moduleId,
      takenAt: new Date().toISOString(),
      score: g.score,
      total: g.total,
      passed: g.passed,
      questionIds: prepared.map((q) => q.id),
      answers: g.perQuestion.map((r) => r.chosen),
    });
    recordBoss(moduleId, {
      win: g.passed,
      combo: maxCombo,
      attempts: attempts.length + 1,
    });
    touchStreak();
    if (g.passed) {
      const bonus = Math.max(0, maxCombo - 3) * 10;
      if (bonus > 0) addBonusXp(`Combo bonus ×${maxCombo}`, bonus);
      sfx("levelup");
      bumpMood("cheer");
    } else {
      sfx("wrong");
      bumpMood("oops");
    }
  };

  const answeredCount = answers.filter((a) => a !== null).length;

  if (!mod) {
    return (
      <div className="card panel-pad">
        <h1 className="text-lg font-semibold text-ink">Zone not found</h1>
        <Link href="/roadmap" className="link mt-2 inline-block text-sm">
          Back to the world map
        </Link>
      </div>
    );
  }

  // ------------------------------- intro --------------------------------
  if (phase === "intro") {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <nav aria-label="Breadcrumb" className="text-xs text-ink-faint">
          <Link href="/roadmap" className="hover:text-ink">
            World map
          </Link>{" "}
          /{" "}
          <Link href={`/roadmap/${moduleId}`} className="hover:text-ink">
            {zone.name}
          </Link>{" "}
          / <span className="text-ink-muted">Boss</span>
        </nav>

        <motion.section
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="card overflow-hidden"
          aria-label="Boss introduction"
        >
          <div className="h-1.5" style={{ background: `linear-gradient(90deg, ${zone.hue[0]}, ${zone.hue[1]})` }} aria-hidden />
          <div className="panel-pad text-center">
            <p
              className="font-mono text-[11px] font-bold uppercase tracking-[0.25em]"
              style={{ color: zone.hue[0] }}
            >
              {zone.glyph} {zone.name} · boss encounter
            </p>
            <motion.h1
              initial={{ scale: 0.92, opacity: 0.6 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.15, duration: 0.35 }}
              className="mt-3 text-4xl font-black tracking-tight text-ink"
            >
              {zone.boss.name}
            </motion.h1>
            <p className="mt-1 font-mono text-xs uppercase tracking-widest text-ink-faint">
              {zone.boss.title}
            </p>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="mx-auto mt-4 max-w-md text-sm italic leading-relaxed text-ink-muted"
            >
              “{zone.boss.taunt}”
            </motion.p>

            <div className="mx-auto mt-6 grid max-w-md gap-1.5 text-left text-xs text-ink-muted">
              <p>• {QUESTIONS_PER_ATTEMPT} strikes — one correct answer each.</p>
              <p>• Every correct hit damages the boss; a wrong answer costs you HP.</p>
              <p>• Chain answers for a combo. A 50/50 hint is free, once per strike.</p>
              <p>• Win = {Math.round(PASSING_THRESHOLD * 100)}% (same pass rules as always).</p>
            </div>

            {bank.length < QUESTIONS_PER_ATTEMPT ? (
              <p role="alert" className="mx-auto mt-4 max-w-md rounded-lg border border-warn/40 bg-warn/10 px-3 py-2 text-sm text-ink">
                The boss is still summoning strikes ({bank.length}/{QUESTIONS_PER_ATTEMPT} ready). Come back soon.
              </p>
            ) : null}
            {mounted && attempts.length > 0 ? (
              <p className="mt-4 text-xs text-ink-faint">
                Encounters so far:{" "}
                {attempts
                  .slice(-5)
                  .reverse()
                  .map((a) => `${a.score}/${a.total}${a.passed ? " won" : ""}`)
                  .join(", ")}
              </p>
            ) : null}

            <button
              type="button"
              className="btn btn-primary mt-6 px-8 py-3 text-base"
              onClick={start}
              disabled={bank.length < QUESTIONS_PER_ATTEMPT}
            >
              ⚔ Engage {zone.boss.name}
            </button>
            <div className="mt-3">
              <Link href={`/roadmap/${moduleId}`} className="link text-xs">
                Retreat to the zone
              </Link>
            </div>
          </div>
        </motion.section>
      </div>
    );
  }

  // ------------------------------ running --------------------------------
  if (phase === "running") {
    const q = prepared[current];
    const removed = hintUsed[current] ?? [];
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        {/* boss encounter header */}
        <div className="card overflow-hidden">
          <div className="grid grid-cols-2 gap-3 px-4 py-3" aria-hidden>
            <div>
              <p className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-ink-faint">
                <span>You</span>
                <span>{playerHp}/{BOSS_MAX_HP}</span>
              </p>
              <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-panel-soft">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500"
                  animate={{ width: `${(playerHp / BOSS_MAX_HP) * 100}%` }}
                  transition={{ type: "spring", stiffness: 200, damping: 26 }}
                />
              </div>
            </div>
            <div>
              <p className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-ink-faint">
                <span style={{ color: zone.hue[0] }}>{zone.boss.name}</span>
                <span>{bossHp}/{BOSS_MAX_HP}</span>
              </p>
              <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-panel-soft">
                <motion.div
                  key={bossHit}
                  className="h-full rounded-full"
                  style={{ background: `linear-gradient(90deg, ${zone.hue[0]}, ${zone.hue[1]})` }}
                  animate={{ width: `${(bossHp / BOSS_MAX_HP) * 100}%` }}
                  transition={{ type: "spring", stiffness: 200, damping: 26 }}
                />
              </div>
            </div>
          </div>
          {combo >= 2 ? (
            <motion.p
              key={combo}
              initial={{ scale: 1.3, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="border-t border-line/60 py-1.5 text-center font-mono text-xs font-bold text-accent"
              role="status"
            >
              COMBO ×{combo}
            </motion.p>
          ) : null}
        </div>

        <div className="flex items-center justify-between text-xs text-ink-faint">
          <span>
            Strike {current + 1} of {prepared.length}
          </span>
          <span>{answeredCount}/{prepared.length} thrown</span>
        </div>
        <div
          className="h-1.5 overflow-hidden rounded-full bg-panel-soft"
          role="progressbar"
          aria-valuenow={answeredCount}
          aria-valuemin={0}
          aria-valuemax={prepared.length}
        >
          <div
            className="fill-gradient h-full rounded-full transition-all"
            style={{ width: `${(answeredCount / prepared.length) * 100}%` }}
          />
        </div>

        <fieldset className="card panel-pad relative">
          <legend className="sr-only">Strike {current + 1}</legend>
          <div className="flex items-start justify-between gap-3">
            <p className="text-[15px] font-medium leading-relaxed text-ink">{q.stem}</p>
            <span className="chip shrink-0">{q.difficulty}</span>
          </div>
          <div className="mt-4 space-y-2">
            {q.options.map((opt, i) => {
              const removedOut = removed.includes(i);
              const chosen = answers[current] === i;
              return (
                <button
                  key={i}
                  type="button"
                  disabled={removedOut || answers[current] !== null}
                  onClick={() => choose(current, i)}
                  className={`flex w-full items-start gap-2.5 rounded-lg border px-3 py-2.5 text-left text-sm transition-all ${
                    removedOut
                      ? "border-line/40 bg-panel-soft/40 text-ink-faint line-through opacity-50"
                      : chosen
                        ? "border-accent bg-accent-soft"
                        : "border-line hover:border-accent/50 hover:bg-panel-soft/60"
                  }`}
                >
                  <span className="mt-0.5 font-mono text-[10px] text-ink-faint">{String.fromCharCode(65 + i)}</span>
                  <span className="text-ink-muted">{opt}</span>
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex items-center justify-between">
            <button
              type="button"
              className="btn text-xs"
              onClick={useHint}
              disabled={removed.length > 0 || answers[current] !== null}
            >
              {removed.length > 0 ? "hint used" : "50/50 hint (free)"}
            </button>
            {answers[current] !== null ? (
              <span className="text-xs text-ink-faint">
                {answers[current] === q.answerIndex ? "💥 Hit!" : "💢 You took a hit"}
              </span>
            ) : null}
          </div>
        </fieldset>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            className="btn"
            onClick={() => setCurrent((c) => Math.max(0, c - 1))}
            disabled={current === 0}
          >
            Previous
          </button>
          <div className="flex flex-wrap gap-1" role="tablist" aria-label="Strike navigator">
            {prepared.map((_, i) => (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={i === current}
                aria-label={`Go to strike ${i + 1}`}
                className={`h-7 w-7 rounded-md text-xs font-mono transition-colors ${
                  i === current
                    ? "bg-accent text-accent-ink"
                    : answers[i] !== null
                      ? answers[i] === prepared[i].answerIndex
                        ? "bg-ok/20 text-ok"
                        : "bg-bad/20 text-bad"
                      : "bg-panel-soft text-ink-faint hover:text-ink"
                }`}
                onClick={() => setCurrent(i)}
              >
                {i + 1}
              </button>
            ))}
          </div>
          {current < prepared.length - 1 ? (
            <button
              type="button"
              className="btn"
              onClick={() => setCurrent((c) => Math.min(prepared.length - 1, c + 1))}
            >
              Next
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary"
              onClick={submit}
              disabled={answeredCount < prepared.length}
              title={answeredCount < prepared.length ? "Throw every strike first" : undefined}
            >
              ⚔ Finish the encounter
            </button>
          )}
        </div>
      </div>
    );
  }

  // ------------------------------- graded --------------------------------
  const win = graded?.passed ?? false;
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <motion.section
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.35 }}
        className={`card panel-pad text-center ${win ? "border-ok/50" : "border-bad/50"}`}
        role="status"
      >
        <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-ink-faint">
          {zone.name} · boss encounter
        </p>
        <motion.p
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.15, type: "spring", stiffness: 220, damping: 16 }}
          className="mt-2 text-4xl font-black tracking-tight text-ink"
        >
          {graded!.score}/{graded!.total}
        </motion.p>
        <p className={`mt-1 text-lg font-black ${win ? "text-ok" : "text-bad"}`}>
          {win ? `${zone.boss.name} defeated!` : `${zone.boss.name} holds the zone`}
        </p>
        <p className="mx-auto mt-2 max-w-md text-sm text-ink-muted">
          {win
            ? zone.boss.defeated
            : `You needed ${Math.ceil(graded!.total * PASSING_THRESHOLD)} correct. Study the weak spots below — every strike links back to its lesson.`}
        </p>
        {maxCombo >= 3 ? (
          <p className="mt-2 font-mono text-xs text-accent">best combo ×{maxCombo}</p>
        ) : null}
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <button type="button" className="btn btn-primary" onClick={start}>
            Rematch (fresh strikes)
          </button>
          <Link href={`/roadmap/${moduleId}`} className="btn">
            Back to {zone.name}
          </Link>
        </div>
      </motion.section>

      <ol className="space-y-3">
        {prepared.map((q, i) => {
          const chosen = graded!.perQuestion[i].chosen;
          const correct = graded!.perQuestion[i].correct;
          return (
            <li key={q.id} className="card panel-pad">
              <p className="flex items-start gap-2 text-sm font-medium text-ink">
                {correct ? (
                  <CheckIcon width={15} height={15} className="mt-0.5 shrink-0 text-ok" aria-label="Correct" />
                ) : (
                  <XIcon width={15} height={15} className="mt-0.5 shrink-0 text-bad" aria-label="Wrong" />
                )}
                {q.stem}
              </p>
              <ul className="mt-2.5 space-y-1 text-sm">
                {q.options.map((opt, oi) => (
                  <li
                    key={oi}
                    className={`rounded-md border px-3 py-1.5 ${
                      oi === q.answerIndex
                        ? "border-ok/50 bg-ok/10 text-ink"
                        : oi === chosen
                          ? "border-bad/50 bg-bad/10 text-ink"
                          : "border-line text-ink-muted"
                    }`}
                  >
                    {opt}
                    {oi === q.answerIndex ? (
                      <span className="ml-2 text-xs font-semibold text-ok">correct</span>
                    ) : oi === chosen ? (
                      <span className="ml-2 text-xs font-semibold text-bad">your answer</span>
                    ) : null}
                  </li>
                ))}
              </ul>
              <div className="mt-2.5 space-y-1.5 rounded-lg bg-panel-soft px-3 py-2 text-xs leading-relaxed text-ink-muted">
                <p>
                  <strong className="text-ink">Why:</strong> {q.explanation}
                </p>
                {q.whyNot.map(
                  (wn, oi) =>
                    wn && oi !== q.answerIndex ? (
                      <p key={oi}>
                        <strong className="text-ink-faint">Why not option {oi + 1}:</strong> {wn}
                      </p>
                    ) : null,
                )}
                <p className="text-ink-faint">
                  Weak spot review:{" "}
                  <Link href={`/lesson/${q.lessonRef}`} className="link">
                    {LESSON_TITLES[q.lessonRef] ?? q.lessonRef}
                  </Link>
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
