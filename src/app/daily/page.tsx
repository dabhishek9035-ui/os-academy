"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ALL_QUESTIONS } from "@/data/questions";
import { ALL_GLOSSARY } from "@/data/glossary";
import { prepareAttempt, gradeAttempt, type PreparedQuestion } from "@/lib/quiz/engine";
import { useProgressStore } from "@/lib/progress/store";
import { useGameStore, todayKey } from "@/lib/game/player";
import { deriveWeakAreas } from "@/lib/progress/unlock";
import { useHasMounted } from "@/lib/useHasMounted";
import { useSfx } from "@/lib/game/sfx";
import { bumpMood } from "@/lib/game/mood";
import { LESSON_TITLES } from "@/data/curriculum/config";

/**
 * Daily Circuit — a 5-question quick-fire round, weighted toward weak areas,
 * once per day. XP + streak touch on completion. Same honest grading as the
 * boss fights (the answer key never lies).
 */
const DAILY_COUNT = 5;
const SECONDS = 30;

export default function DailyPage() {
  const mounted = useHasMounted();
  const progress = useProgressStore((s) => s.modules);
  const game = useGameStore();
  const recordDaily = useGameStore((s) => s.recordDaily);
  const sfx = useSfx();

  const [phase, setPhase] = useState<"idle" | "run" | "done">("idle");
  const [qs, setQs] = useState<PreparedQuestion[]>([]);
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(SECONDS);

  const today = todayKey();
  const doneToday = game.daily.lastDate === today;

  const questionsById = useMemo(
    () => Object.fromEntries(ALL_QUESTIONS.map((q) => [q.id, q])),
    [],
  );

  const buildDaily = useMemo(() => {
    return () => {
      const bank = ALL_QUESTIONS;
      const weak = deriveWeakAreas({ modules: progress }, questionsById, 4);
      const weakQs = bank.filter((q) =>
        weak.some((w) => w.lessonRef === q.lessonRef),
      );
      const picked: typeof bank = [];
      const used = new Set<string>();
      for (const q of weakQs) {
        if (picked.length < 3) {
          picked.push(q);
          used.add(q.id);
        }
      }
      // fill the rest randomly
      let guard = 0;
      while (picked.length < DAILY_COUNT && guard < 200) {
        guard += 1;
        const q = bank[Math.floor(Math.random() * bank.length)];
        if (!used.has(q.id)) {
          picked.push(q);
          used.add(q.id);
        }
      }
      return prepareAttempt(picked, { count: DAILY_COUNT });
    };
  }, [progress, questionsById]);

  if (phase === "run") {
    return (
      <DailyRun
        qs={qs}
        idx={idx}
        picked={picked}
        score={score}
        secondsLeft={secondsLeft}
        onPick={(oi) => {
          if (picked !== null) return;
          setPicked(oi);
          const correct = oi === qs[idx].answerIndex;
          if (correct) {
            setScore((s) => s + 1);
            sfx("correct");
            bumpMood("cheer");
          } else {
            sfx("wrong");
            bumpMood("oops");
          }
          window.setTimeout(() => {
            if (idx + 1 >= qs.length) {
              const perfect = score + (correct ? 1 : 0) === qs.length;
              recordDaily(perfect);
              setScore(score + (correct ? 1 : 0));
              setPhase("done");
              sfx(perfect ? "levelup" : "xp");
              bumpMood("cheer");
            } else {
              setIdx((i) => i + 1);
              setPicked(null);
              setSecondsLeft(SECONDS);
            }
          }, 900);
        }}
        onTimeout={() => {
          if (picked !== null) return;
          setPicked(-1);
          sfx("wrong");
          window.setTimeout(() => {
            if (idx + 1 >= qs.length) {
              recordDaily(false);
              setPhase("done");
            } else {
              setIdx((i) => i + 1);
              setPicked(null);
              setSecondsLeft(SECONDS);
            }
          }, 900);
        }}
      />
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header className="text-center">
        <p className="section-label">Machina · daily circuit</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-ink sm:text-4xl">
          Daily{" "}
          <span className="bg-gradient-to-r from-cyan-300 to-indigo-300 bg-clip-text text-transparent">
            Circuit
          </span>
        </h1>
        <p className="mx-auto mt-3 max-w-lg text-sm text-ink-muted">
          Five quick strikes, thirty seconds each — weighted toward the spots
          that have tripped you up. +25 XP (+15 more for a perfect run), and it
          keeps your streak burning.
        </p>
      </header>

      <section className="card panel-pad text-center">
        {doneToday ? (
          <>
            <p className="text-3xl" aria-hidden>
              ◈
            </p>
            <h2 className="mt-2 text-lg font-bold text-ink">Today&apos;s circuit is done</h2>
            <p className="mx-auto mt-1.5 max-w-sm text-sm text-ink-muted">
              A fresh one assembles at midnight. Your streak is{" "}
              {game.daily.streak} day{game.daily.streak === 1 ? "" : "s"} — the
              world keeps count, gently.
            </p>
          </>
        ) : (
          <>
            <p className="text-3xl" aria-hidden>
              ◈
            </p>
            <h2 className="mt-2 text-lg font-bold text-ink">
              {DAILY_COUNT} strikes · {SECONDS}s each
            </h2>
            <p className="mt-1.5 text-sm text-ink-muted">
              Circuit streak: {game.daily.streak} day{game.daily.streak === 1 ? "" : "s"}
            </p>
            <button
              type="button"
              className="btn btn-primary mt-4 px-8 py-3"
              onClick={() => {
                setQs(buildDaily());
                setIdx(0);
                setPicked(null);
                setScore(0);
                setSecondsLeft(SECONDS);
                setPhase("run");
              }}
            >
              ▶ Run today&apos;s circuit
            </button>
          </>
        )}
      </section>

      {phase === "done" ? (
        <motion.section
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="card panel-pad text-center"
          role="status"
        >
          <p className="text-4xl font-black text-ink">{score}/{DAILY_COUNT}</p>
          <p className="mt-1 font-bold text-ok">
            {score === DAILY_COUNT ? "Perfect circuit — +40 XP" : `+25 XP banked`}
          </p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-ink-muted">
            Missed strikes feed your weak-spot radar. Come back tomorrow for a
            fresh set.
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <Link href="/roadmap" className="btn">
              World map
            </Link>
            <Link href="/progress" className="btn">
              Profile
            </Link>
          </div>
        </motion.section>
      ) : null}
    </div>
  );
}

function DailyRun({
  qs,
  idx,
  picked,
  score,
  secondsLeft: initialSeconds,
  onPick,
  onTimeout,
}: {
  qs: PreparedQuestion[];
  idx: number;
  picked: number | null;
  score: number;
  secondsLeft: number;
  onPick: (oi: number) => void;
  onTimeout: () => void;
}) {
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);
  const sfx = useSfx();
  const q = qs[idx];

  const timer = useCountdown(idx, (left) => setSecondsLeft(left), () => onTimeout());

  if (!q) return null;
  const timePct = (timer / 30) * 100;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between text-xs text-ink-faint">
        <span>
          Strike {idx + 1}/{qs.length} · score {score}
        </span>
        <span className={`font-mono ${timer <= 5 ? "text-bad" : ""}`}>⏱ {timer}s</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-panel-soft" aria-hidden>
        <div
          className={`h-full rounded-full transition-all duration-1000 ease-linear ${timer <= 5 ? "bg-bad" : "fill-gradient"}`}
          style={{ width: `${timePct}%` }}
        />
      </div>

      <fieldset className="card panel-pad">
        <legend className="sr-only">Daily question {idx + 1}</legend>
        <p className="text-[15px] font-medium leading-relaxed text-ink">{q.stem}</p>
        <div className="mt-4 space-y-2">
          {q.options.map((opt, oi) => {
            const revealed = picked !== null;
            const isAnswer = oi === q.answerIndex;
            const isPicked = picked === oi;
            return (
              <button
                key={oi}
                type="button"
                disabled={revealed}
                onClick={() => onPick(oi)}
                className={`w-full rounded-lg border px-3 py-2.5 text-left text-sm transition-all ${
                  revealed && isAnswer
                    ? "border-ok/60 bg-ok/10 text-ink"
                    : revealed && isPicked
                      ? "border-bad/60 bg-bad/10 text-ink"
                      : revealed
                        ? "border-line text-ink-faint"
                        : "border-line hover:border-accent/50 hover:bg-panel-soft/60"
                }`}
              >
                <span className="mr-2 font-mono text-[10px] text-ink-faint">{String.fromCharCode(65 + oi)}</span>
                {opt}
              </button>
            );
          })}
        </div>
        {picked !== null ? (
          <p className="mt-3 rounded-lg bg-panel-soft px-3 py-2 text-xs text-ink-muted">
            {picked === q.answerIndex ? "💥 Hit!" : "⏱ Missed"}{" "}
            {q.explanation.length > 120 ? q.explanation.slice(0, 120) + "…" : q.explanation}{" "}
            <Link href={`/lesson/${q.lessonRef}`} className="link">
              {LESSON_TITLES[q.lessonRef] ?? q.lessonRef}
            </Link>
          </p>
        ) : null}
      </fieldset>
    </div>
  );
}

/** Countdown hook: seconds remaining, fires onZero once per question. */
function useCountdown(
  questionIndex: number,
  onTick: (left: number) => void,
  onZero: () => void,
): number {
  const [left, setLeft] = useState(30);
  const zeroFired = useRef(false);
  useEffect(() => {
    setLeft(30);
    zeroFired.current = false;
    const id = window.setInterval(() => {
      setLeft((l) => {
        const next = l - 1;
        if (next <= 0 && !zeroFired.current) {
          zeroFired.current = true;
          window.clearInterval(id);
          onZero();
        } else if (next > 0) {
          onTick(next);
        }
        return Math.max(0, next);
      });
    }, 1000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionIndex]);
  return left;
}
