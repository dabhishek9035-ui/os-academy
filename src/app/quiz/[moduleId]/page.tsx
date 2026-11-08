"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
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
import { useHasMounted } from "@/lib/useHasMounted";
import { CheckIcon, XIcon } from "@/components/ui/icons";

type Phase = "intro" | "running" | "graded";

export default function QuizPage() {
  const params = useParams<{ moduleId: string }>();
  const moduleId = params?.moduleId ?? "";
  const mounted = useHasMounted();
  const recordAttempt = useProgressStore((s) => s.recordAttempt);
  const attempts = useProgressStore((s) => s.modules[moduleId]?.attempts ?? []);

  const mod = MODULE_MAP[moduleId];
  const bank = useMemo(() => questionsForModule(moduleId), [moduleId]);

  const [phase, setPhase] = useState<Phase>("intro");
  const [prepared, setPrepared] = useState<PreparedQuestion[]>([]);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [current, setCurrent] = useState(0);
  const [graded, setGraded] = useState<GradedAttempt | null>(null);

  if (!mod) {
    return (
      <div className="card panel-pad">
        <h1 className="text-lg font-semibold text-ink">Module not found</h1>
        <Link href="/roadmap" className="link mt-2 inline-block text-sm">
          Back to the roadmap
        </Link>
      </div>
    );
  }

  const start = () => {
    if (bank.length < QUESTIONS_PER_ATTEMPT) {
      setPhase("intro");
      return;
    }
    const qs = prepareAttempt(bank, { count: QUESTIONS_PER_ATTEMPT });
    setPrepared(qs);
    setAnswers(Array(qs.length).fill(null));
    setCurrent(0);
    setGraded(null);
    setPhase("running");
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
  };

  const answeredCount = answers.filter((a) => a !== null).length;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <nav aria-label="Breadcrumb" className="text-xs text-ink-faint">
        <Link href="/roadmap" className="hover:text-ink">Roadmap</Link> /{" "}
        <Link href={`/roadmap/${moduleId}`} className="hover:text-ink">{mod.title}</Link> /{" "}
        <span className="text-ink-muted">Assessment</span>
      </nav>

      {phase === "intro" ? (
        <section className="card panel-pad">
          <h1 className="text-xl font-semibold text-ink">{mod.title} — assessment</h1>
          <ul className="mt-4 space-y-2 text-sm text-ink-muted">
            <li>• {QUESTIONS_PER_ATTEMPT} multiple-choice questions, one correct answer each.</li>
            <li>• All questions must be answered before submitting.</li>
            <li>• Pass mark: {Math.round(PASSING_THRESHOLD * 100)}% ({Math.ceil(QUESTIONS_PER_ATTEMPT * PASSING_THRESHOLD)} of {QUESTIONS_PER_ATTEMPT}).</li>
            <li>• Passing unlocks the next module. Retakes are unlimited; each attempt draws 10 questions from a bank of {bank.length}.</li>
          </ul>
          {bank.length < QUESTIONS_PER_ATTEMPT ? (
            <p role="alert" className="mt-4 rounded-lg border border-warn/40 bg-warn/10 px-3 py-2 text-sm text-ink">
              This module&apos;s question bank is still being written ({bank.length}/
              {QUESTIONS_PER_ATTEMPT} questions ready). The assessment will open
              as soon as the bank is complete.
            </p>
          ) : null}
          {mounted && attempts.length > 0 ? (
            <div className="mt-4 text-xs text-ink-faint">
              Previous attempts:{" "}
              {attempts
                .slice(-5)
                .reverse()
                .map((a) => `${a.score}/${a.total}${a.passed ? " (passed)" : ""}`)
                .join(", ")}
            </div>
          ) : null}
          <button
            type="button"
            className="btn btn-primary mt-5 px-5 py-2.5"
            onClick={start}
            disabled={bank.length < QUESTIONS_PER_ATTEMPT}
          >
            {attempts.length > 0 ? "New attempt" : "Start assessment"}
          </button>
        </section>
      ) : null}

      {phase === "running" ? (
        <section className="space-y-4">
          <div className="flex items-center justify-between text-xs text-ink-faint">
            <span>
              Question {current + 1} of {prepared.length}
            </span>
            <span>{answeredCount}/{prepared.length} answered</span>
          </div>
          <div
            className="h-1.5 overflow-hidden rounded-full bg-panel-soft"
            role="progressbar"
            aria-valuenow={answeredCount}
            aria-valuemin={0}
            aria-valuemax={prepared.length}
          >
            <div
              className="h-full rounded-full bg-accent transition-all"
              style={{ width: `${(answeredCount / prepared.length) * 100}%` }}
            />
          </div>

          <fieldset className="card panel-pad">
            <legend className="sr-only">Question {current + 1}</legend>
            <div className="flex items-start justify-between gap-3">
              <p className="text-[15px] font-medium leading-relaxed text-ink">
                {prepared[current].stem}
              </p>
              <span className="chip shrink-0">{prepared[current].difficulty}</span>
            </div>
            <div className="mt-4 space-y-2">
              {prepared[current].options.map((opt, i) => (
                <label
                  key={i}
                  className={`flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2.5 text-sm transition-colors ${
                    answers[current] === i
                      ? "border-accent bg-accent-soft"
                      : "border-line hover:border-accent/40"
                  }`}
                >
                  <input
                    type="radio"
                    className="mt-1 accent-[rgb(var(--accent))]"
                    name={`q-${current}`}
                    checked={answers[current] === i}
                    onChange={() =>
                      setAnswers((a) => a.map((v, idx) => (idx === current ? i : v)))
                    }
                  />
                  <span className="text-ink-muted">{opt}</span>
                </label>
              ))}
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
            <div className="flex flex-wrap gap-1" role="tablist" aria-label="Question navigator">
              {prepared.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  role="tab"
                  aria-selected={i === current}
                  aria-label={`Go to question ${i + 1}`}
                  className={`h-7 w-7 rounded-md text-xs font-mono transition-colors ${
                    i === current
                      ? "bg-accent text-accent-ink"
                      : answers[i] !== null
                        ? "bg-ok/20 text-ok"
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
                title={
                  answeredCount < prepared.length
                    ? "Answer every question before submitting"
                    : undefined
                }
              >
                Submit assessment
              </button>
            )}
          </div>
        </section>
      ) : null}

      {phase === "graded" && graded ? (
        <section className="space-y-4">
          <div
            className={`card panel-pad text-center ${graded.passed ? "border-ok/50" : "border-bad/50"}`}
            role="status"
          >
            <p className="text-4xl font-semibold text-ink">
              {graded.score}/{graded.total}
            </p>
            <p className={`mt-1 text-sm font-semibold ${graded.passed ? "text-ok" : "text-bad"}`}>
              {graded.passed
                ? `Passed — ${mod.title} is complete${moduleUnlockedNext(moduleId) ? " and the next module is unlocked" : ""}.`
                : `Not passed — you need ${Math.ceil(graded.total * PASSING_THRESHOLD)} correct. Review the explanations below and retake when ready.`}
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <button type="button" className="btn btn-primary" onClick={start}>
                Retake (fresh questions)
              </button>
              <Link href={`/roadmap/${moduleId}`} className="btn">
                Back to module
              </Link>
            </div>
          </div>

          <ol className="space-y-3">
            {prepared.map((q, i) => {
              const chosen = graded.perQuestion[i].chosen;
              const correct = graded.perQuestion[i].correct;
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
                    <p><strong className="text-ink">Why:</strong> {q.explanation}</p>
                    {q.whyNot.map((wn, oi) =>
                      wn && oi !== q.answerIndex ? (
                        <p key={oi}>
                          <strong className="text-ink-faint">Why not option {oi + 1}:</strong> {wn}
                        </p>
                      ) : null,
                    )}
                    <p className="text-ink-faint">
                      Review:{" "}
                      <Link href={`/lesson/${q.lessonRef}`} className="link">
                        {LESSON_TITLES[q.lessonRef] ?? q.lessonRef}
                      </Link>
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      ) : null}
    </div>
  );
}

function moduleUnlockedNext(moduleId: string): boolean {
  const idx = Object.values(MODULE_MAP).findIndex((m) => m.id === moduleId);
  const nextMod = Object.values(MODULE_MAP)[idx + 1];
  return Boolean(nextMod);
}
