"use client";

import { useState } from "react";
import type { Equation, Lesson, LessonSection } from "@/types";
import { presentMcq } from "@/lib/mcq/shuffle";
import { getSimComponent, simTitle, SimPlaceholder } from "@/components/visualizations/registry";
import { Paragraphs, Inline } from "./Inline";
import { CheckIcon, XIcon } from "@/components/ui/icons";

const SECTION_LABELS: Record<LessonSection["kind"], string> = {
  problem: "The problem",
  intuition: "Intuition",
  visual: "Visual model",
  experiment: "Interactive experiment",
  technical: "Under the hood",
  "worked-example": "Worked example",
  misconceptions: "Common misconceptions",
  "knowledge-check": "Quick check",
  references: "References",
  note: "Assumptions & simplifications",
};

export function LessonRenderer({ lesson }: { lesson: Lesson }) {
  return (
    <article className="space-y-8" aria-label={lesson.title}>
      <header>
        <h1 className="text-2xl font-semibold text-ink sm:text-3xl">{lesson.title}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-ink-faint">
          <span className="chip">{lesson.minutes} min</span>
          {lesson.objectives.length > 0 ? (
            <span>
              After this lesson you can: {lesson.objectives.join(" · ")}
            </span>
          ) : null}
        </div>
      </header>

      {(() => {
        const seenSims = new Set<string>();
        return lesson.sections.map((section, i) => {
          const simAlreadyMounted =
            (section.kind === "visual" || section.kind === "experiment") &&
            seenSims.has(section.simId);
          if (section.kind === "visual" || section.kind === "experiment") {
            seenSims.add(section.simId);
          }
          return <SectionBlock key={i} section={section} simAlreadyMounted={simAlreadyMounted} />;
        });
      })()}
    </article>
  );
}

function SectionBlock({
  section,
  simAlreadyMounted,
}: {
  section: LessonSection;
  simAlreadyMounted: boolean;
}) {
  const title = section.title ?? SECTION_LABELS[section.kind];
  const common = (
    <h2 className="section-label">{title}</h2>
  );

  switch (section.kind) {
    case "problem":
    case "intuition":
    case "note":
      return (
        <section
          className={
            section.kind === "note"
              ? "rounded-xl border border-line/70 bg-bg-soft px-4 py-3"
              : "space-y-3"
          }
        >
          {common}
          <Paragraphs body={section.body} />
        </section>
      );

    case "visual":
    case "experiment": {
      const Sim = simAlreadyMounted ? null : getSimComponent(section.simId);
      return (
        <section className="space-y-3">
          {common}
          {section.body?.length ? <Paragraphs body={section.body} /> : null}
          {simAlreadyMounted ? (
            <p className="rounded-lg border border-line bg-bg-soft px-3 py-2 text-xs text-ink-faint">
              Use the “{simTitle(section.simId)}” simulation above for this
              experiment — it keeps its state as you work through the prompts.
            </p>
          ) : Sim ? (
            <Sim />
          ) : (
            <SimPlaceholder
              label={`The “${simTitle(section.simId)}” simulation is being connected.`}
            />
          )}
          {section.kind === "experiment" ? (
            <div className="rounded-xl border border-accent/30 bg-accent-soft px-4 py-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-ink">
                Try this
              </h3>
              <ul className="mt-2 space-y-1.5 text-sm text-ink-muted">
                {section.prompts.map((p, i) => (
                  <li key={i} className="flex gap-2">
                    <span aria-hidden className="text-accent">▸</span>
                    <span><Inline text={p} /></span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      );
    }

    case "technical":
      return (
        <section className="space-y-3">
          {common}
          <Paragraphs body={section.body} />
          {section.equations?.map((eq, i) => (
            <EquationBlock key={i} eq={eq} />
          ))}
        </section>
      );

    case "worked-example":
      return (
        <section className="space-y-3">
          {common}
          <ol className="space-y-3">
            {section.steps.map((step, i) => (
              <li key={i} className="card panel-pad">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
                  <span className="grid h-5 w-5 place-items-center rounded-full bg-accent-soft font-mono text-xs text-accent">
                    {i + 1}
                  </span>
                  {step.title}
                </h3>
                <div className="mt-2 space-y-2 text-sm">
                  <Paragraphs body={step.body} />
                </div>
              </li>
            ))}
          </ol>
        </section>
      );

    case "misconceptions":
      return (
        <section className="space-y-3">
          {common}
          <ul className="space-y-2.5">
            {section.items.map((m, i) => (
              <li key={i} className="card panel-pad text-sm">
                <p className="flex gap-2 text-ink-muted">
                  <XIcon width={15} height={15} className="mt-0.5 shrink-0 text-bad" aria-hidden />
                  <span><strong className="font-semibold text-ink">Myth:</strong> {m.wrong}</span>
                </p>
                <p className="mt-1.5 flex gap-2">
                  <CheckIcon width={15} height={15} className="mt-0.5 shrink-0 text-ok" aria-hidden />
                  <span><strong className="font-semibold text-ink">Actually:</strong> {m.right}</span>
                </p>
              </li>
            ))}
          </ul>
        </section>
      );

    case "knowledge-check":
      return (
        <section className="space-y-3">
          {common}
          {section.questions.map((q, i) => (
            <CheckQuestionCard key={q.id} index={i + 1} q={q} />
          ))}
        </section>
      );

    case "references":
      return (
        <section className="space-y-2">
          {common}
          <ul className="space-y-1.5 text-sm">
            {section.items.map((r, i) => (
              <li key={i} className="text-ink-muted">
                <a href={r.url} target="_blank" rel="noreferrer" className="link">
                  {r.label}
                </a>
                {r.note ? <span className="text-ink-faint"> — {r.note}</span> : null}
              </li>
            ))}
          </ul>
        </section>
      );

    default:
      return null;
  }
}

function EquationBlock({ eq }: { eq: Equation }) {
  return (
    <div className="rounded-lg border border-line bg-bg-soft px-4 py-3">
      <p className="font-mono text-[15px] text-ink">{eq.expr}</p>
      <dl className="mt-2 space-y-1 text-xs text-ink-muted">
        {eq.symbols.map((s, i) => (
          <div key={i} className="flex gap-2">
            <dt className="font-mono text-accent">{s.sym}</dt>
            <dd>— {s.meaning}</dd>
          </div>
        ))}
      </dl>
      {eq.note ? <p className="mt-2 text-xs text-ink-faint">{eq.note}</p> : null}
    </div>
  );
}

function CheckQuestionCard({
  q,
  index,
}: {
  q: { id: string; q: string; options: string[]; answerIndex: number; explanation: string };
  index: number;
}) {
  // Content was authored with the correct answer first; present a stable,
  // id-seeded permutation so the answer is not predictably option A.
  const view = presentMcq(q);
  const [picked, setPicked] = useState<number | null>(null);
  const name = `check-${q.id}`;
  return (
    <fieldset className="card panel-pad">
      <legend className="sr-only">Knowledge check {index}</legend>
      <p className="text-sm font-medium text-ink">
        {index}. <Inline text={view.q} />
      </p>
      <div className="mt-2.5 space-y-1.5">
        {view.options.map((opt, i) => {
          const isPicked = picked === i;
          const isCorrect = i === view.answerIndex;
          const state =
            picked === null ? "idle" : isCorrect ? "correct" : isPicked ? "wrong" : "idle";
          return (
            <label
              key={i}
              className={`flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                state === "correct"
                  ? "border-ok/60 bg-ok/10"
                  : state === "wrong"
                    ? "border-bad/60 bg-bad/10"
                    : "border-line hover:border-accent/40"
              }`}
            >
              <input
                type="radio"
                name={name}
                className="mt-1 accent-[rgb(var(--accent))]"
                checked={isPicked}
                onChange={() => setPicked(i)}
              />
              <span className="text-ink-muted">{opt}</span>
            </label>
          );
        })}
      </div>
      {picked !== null ? (
        <p className="mt-2.5 rounded-lg bg-panel-soft px-3 py-2 text-xs leading-relaxed text-ink-muted">
          {picked === view.answerIndex ? "Correct — " : "Not quite — "}
          {view.explanation}
        </p>
      ) : null}
    </fieldset>
  );
}
