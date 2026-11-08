"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { MODULES } from "@/data/curriculum/config";
import { lessonsForModule } from "@/data/curriculum/lessons";
import { useProgressStore } from "@/lib/progress/store";
import { isModuleUnlocked } from "@/lib/progress/unlock";
import { useHasMounted } from "@/lib/useHasMounted";
import { useSettingsStore } from "@/lib/settings/store";
import { CheckIcon, LockIcon } from "@/components/ui/icons";

type Status = "passed" | "frontier" | "available" | "locked";

const ROAD_FILL = "rgb(var(--accent) / 0.55)";
const NODE_FILL = "rgb(var(--accent))";

export default function RoadmapPage() {
  const mounted = useHasMounted();
  const osReduce = useReducedMotion();
  const motionPref = useSettingsStore((s) => s.motion);
  const reduce = Boolean(osReduce) || motionPref === "reduced";
  const progress = useProgressStore((s) => s.modules);

  // --- road fill measurement ---------------------------------------------
  const railRef = useRef<HTMLDivElement | null>(null);
  const nodeRefs = useRef<Array<HTMLDivElement | null>>([]);
  const [fillPx, setFillPx] = useState(0);

  const passedSet = useMemo(
    () =>
      new Set(
        MODULES.filter((m) => progress[m.id]?.passed === true).map((m) => m.id),
      ),
    [progress],
  );

  const measure = useCallback(() => {
    const rail = railRef.current;
    if (!rail) return;
    const railTop = rail.getBoundingClientRect().top;
    let max = 0;
    nodeRefs.current.forEach((el, i) => {
      if (el && MODULES[i] && passedSet.has(MODULES[i].id)) {
        const r = el.getBoundingClientRect();
        max = Math.max(max, r.top + r.height / 2 - railTop);
      }
    });
    setFillPx(max);
  }, [passedSet]);

  useLayoutEffect(() => {
    measure();
    const ro = new ResizeObserver(measure);
    if (railRef.current) ro.observe(railRef.current);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [measure]);

  // --- statuses ------------------------------------------------------------
  const statuses = useMemo<Status[]>(
    () =>
      MODULES.map((m) => {
        if (mounted && progress[m.id]?.passed) return "passed";
        if (mounted && !isModuleUnlocked(m, { modules: progress })) return "locked";
        const frontier = MODULES.find(
          (x) =>
            (mounted ? isModuleUnlocked(x, { modules: progress }) : true) &&
            !(mounted && progress[x.id]?.passed),
        );
        return frontier?.id === m.id ? "frontier" : "available";
      }),
    [mounted, progress],
  );
  const passedCount = statuses.filter((s) => s === "passed").length;
  const pct = Math.round((passedCount / MODULES.length) * 100);

  return (
    <div className="space-y-8">
      <header className="mx-auto max-w-3xl text-center">
        <p className="section-label">Your journey through the machine</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          Course{" "}
          <span className="text-accent">
            roadmap
          </span>
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-ink-muted">
          Fourteen stations, one connected road. Pass each module&apos;s
          assessment (80%) and the road extends to the next station — follow
          the light.
        </p>

        {/* overall progress */}
        <div className="mx-auto mt-6 flex max-w-md items-center gap-3">
          <div
            className="h-2 grow overflow-hidden rounded-full bg-panel-soft"
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Overall course progress"
          >
            <motion.div
              className="h-full rounded-full fill-gradient"
              initial={{ width: 0 }}
              animate={{ width: `${mounted ? pct : 0}%` }}
              transition={{ duration: reduce ? 0 : 1.1, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
            />
          </div>
          <span className="shrink-0 font-mono text-xs text-ink-muted">
            {mounted ? passedCount : 0}/{MODULES.length}
          </span>
        </div>
      </header>

      {/* ------------------------------ the road ------------------------------ */}
      <ol className="relative mx-auto max-w-5xl py-10">
        {/* rail */}
        <div
          ref={railRef}
          aria-hidden
          className="pointer-events-none absolute bottom-10 left-6 top-10 w-[3px] -translate-x-1/2 rounded-full bg-line/60 md:left-1/2 md:w-1"
        >
          {/* filled (completed) portion — grows as modules are passed */}
          <motion.div
            className="absolute left-0 top-0 w-full rounded-full"
            style={{ background: ROAD_FILL }}
            initial={{ height: 0 }}
            animate={{ height: fillPx }}
            transition={
              reduce
                ? { duration: 0 }
                : { duration: 1.6, ease: [0.22, 1, 0.36, 1], delay: 0.35 }
            }
          />
          {/* the traveller — rides the road once per visit */}
          {fillPx > 10 && !reduce && (
            <motion.div
              className="absolute left-1/2 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-cyan-200"
              style={{ boxShadow: "0 0 16px 5px rgba(34,211,238,0.55)" }}
              initial={{ top: 0, opacity: 0 }}
              animate={{ top: [0, fillPx], opacity: [0, 1, 1, 0] }}
              transition={{
                duration: 2.4,
                delay: 1.15,
                ease: "easeInOut",
                times: [0, 0.12, 0.88, 1],
              }}
            />
          )}
        </div>

        {/* start / finish markers */}
        <span
          aria-hidden
          className="absolute left-6 top-1 -translate-x-1/2 font-mono text-xs tracking-[0.22em] text-ink-faint md:left-1/2"
        >
          START
        </span>
        <span
          aria-hidden
          className="absolute bottom-1 left-6 -translate-x-1/2 font-mono text-xs tracking-[0.22em] text-ink-faint md:left-1/2"
        >
          FINISH
        </span>

        {MODULES.map((m, i) => {
          const status = statuses[i];
          const unlocked = !mounted || status !== "locked";
          const lessons = lessonsForModule(m.id);
          const done = (progress[m.id]?.lessonsDone ?? []).filter((id) =>
            lessons.some((l) => l.id === id),
          ).length;
          const lessonPct = lessons.length ? Math.round((done / lessons.length) * 100) : 0;

          return (
            <li
              key={m.id}
              className="relative pb-12 pl-16 last:pb-2 md:pb-16 md:pl-0"
            >
              {/* station node */}
              <div
                ref={(el) => {
                  nodeRefs.current[i] = el;
                }}
                className="absolute left-6 top-9 z-10 -translate-x-1/2 md:left-1/2"
              >
                <NodeBadge
                  status={status}
                  num={m.num}
                  index={i}
                  reduce={reduce}
                />
              </div>

              <div className="md:grid md:grid-cols-2 md:gap-28">
                <motion.div
                  initial={{ opacity: 0, y: 26 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{
                    duration: reduce ? 0 : 0.55,
                    delay: reduce ? 0 : (i % 2) * 0.08,
                    ease: "easeOut",
                  }}
                  className={
                    i % 2 === 0 ? "md:col-start-1" : "md:col-start-2 md:row-start-1"
                  }
                >
                  <Card
                    m={m}
                    status={status}
                    unlocked={unlocked}
                    done={done}
                    total={lessons.length}
                    lessonPct={lessonPct}
                  />
                </motion.div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

// ---------------------------------------------------------------------------
// station node
// ---------------------------------------------------------------------------

function NodeBadge({
  status,
  num,
  index,
  reduce,
}: {
  status: Status;
  num: number;
  index: number;
  reduce: boolean;
}) {
  const base =
    "grid h-11 w-11 place-items-center rounded-full border font-mono text-sm font-semibold";
  const inner =
    status === "passed" ? (
      <motion.span
        key={`p-${index}`}
        initial={reduce ? false : { scale: 0.4, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: reduce ? 0 : 0.5 + index * 0.12, type: "spring", stiffness: 260, damping: 18 }}
        className={`${base} border-transparent`}
        style={{ background: NODE_FILL, color: "var(--accent-ink)" }}
        aria-label={`Module ${num} passed`}
      >
        <CheckIcon width={18} height={18} />
      </motion.span>
    ) : status === "frontier" ? (
      <span
        className={`${base} node-frontier border-accent/70 bg-panel text-accent`}
        aria-current="step"
        aria-label={`Module ${num} — up next`}
      >
        {num}
      </span>
    ) : status === "available" ? (
      <span className={`${base} border-accent/40 bg-panel text-ink-muted`} aria-label={`Module ${num} available`}>
        {num}
      </span>
    ) : (
      <span className={`${base} border-line bg-panel-soft text-ink-faint`} aria-label={`Module ${num} locked`}>
        <LockIcon width={15} height={15} />
      </span>
    );
  return inner;
}

// ---------------------------------------------------------------------------
// module card
// ---------------------------------------------------------------------------

function Card({
  m,
  status,
  unlocked,
  done,
  total,
  lessonPct,
}: {
  m: (typeof MODULES)[number];
  status: Status;
  unlocked: boolean;
  done: number;
  total: number;
  lessonPct: number;
}) {
  const shell = `block h-full rounded-xl border px-5 py-4 transition-all duration-200 ${
    status === "frontier"
      ? "border-accent/45 bg-panel"
      : status === "passed"
        ? "border-ok/25 bg-panel hover:border-ok/45"
        : unlocked
          ? "border-line bg-panel hover:border-accent/50"
          : "border-line/70 bg-panel/60 opacity-80"
  }`;

  const chip =
    status === "passed" ? (
      <span className="chip border-ok/40 text-ok">
        <CheckIcon width={12} height={12} /> passed
      </span>
    ) : status === "frontier" ? (
      <span className="chip border-accent/50 text-accent">
        <span className="inline-flex h-2 w-2 rounded-full bg-accent" aria-hidden />
        up next
      </span>
    ) : status === "locked" ? (
      <span className="chip">
        <LockIcon width={11} height={11} /> locked
      </span>
    ) : (
      <span className="chip border-accent/30 text-ink-muted">available</span>
    );

  const body = (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className="section-label">Module {String(m.num).padStart(2, "0")}</span>
        {chip}
      </div>
      <h2 className="mt-2 text-lg font-semibold text-ink">{m.title}</h2>
      <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-ink-muted">
        {m.description}
      </p>
      <div className="mt-4 flex items-center gap-3">
        {unlocked ? (
          <>
            <div
              className="h-1.5 grow overflow-hidden rounded-full bg-panel-soft"
              role="progressbar"
              aria-valuenow={lessonPct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${m.title} lesson progress`}
            >
              <div
                className={`h-full rounded-full ${status === "passed" ? "bg-ok/70" : "fill-gradient"}`}
                style={{ width: `${lessonPct}%` }}
              />
            </div>
            <span className="shrink-0 text-xs text-ink-faint">
              {status === "passed" ? "module complete" : `${done}/${total} lessons`}
            </span>
          </>
        ) : (
          <span className="text-xs text-ink-faint">
            Pass {m.prereqIds.length === 1 ? "the previous module" : `${m.prereqIds.length} prerequisite modules`} to unlock
          </span>
        )}
      </div>
    </>
  );

  if (unlocked) {
    return (
      <Link href={`/roadmap/${m.id}`} className={`${shell} hover:border-accent/50`}>
        {body}
      </Link>
    );
  }
  return (
    <div className={shell} aria-disabled>
      {body}
    </div>
  );
}
