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
import { zoneFor } from "@/lib/game/zones";
import { CheckIcon, LockIcon } from "@/components/ui/icons";

type Status = "passed" | "frontier" | "available" | "locked";

/**
 * World Map — the road is now a circuit trace between 14 zone nodes. Locked
 * zones sit behind fog, cleared zones glow with a star, and the frontier
 * pulses with a "YOU ARE HERE" beacon.
 */
export default function WorldMapPage() {
  const mounted = useHasMounted();
  const osReduce = useReducedMotion();
  const motionPref = useSettingsStore((s) => s.motion);
  const reduce = Boolean(osReduce) || motionPref === "reduced";
  const progress = useProgressStore((s) => s.modules);

  const railRef = useRef<HTMLDivElement | null>(null);
  const nodeRefs = useRef<Array<HTMLDivElement | null>>([]);
  const [fillPx, setFillPx] = useState(0);

  const passedSet = useMemo(
    () => new Set(MODULES.filter((m) => progress[m.id]?.passed === true).map((m) => m.id)),
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

  return (
    <div className="space-y-8">
      <header className="mx-auto max-w-3xl text-center">
        <p className="section-label">Machina · world map</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-ink sm:text-4xl">
          Fourteen zones.{" "}
          <span className="bg-gradient-to-r from-cyan-300 to-indigo-300 bg-clip-text text-transparent">
            One dead Kernel.
          </span>
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-ink-muted">
          Beat a zone&apos;s boss (80% on ten questions) and the circuit trace
          extends to the next district. Fog lifts. The road to the Core is
          long — follow the light.
        </p>
        <div className="mx-auto mt-6 flex max-w-md items-center gap-3">
          <div
            className="h-2 grow overflow-hidden rounded-full bg-panel-soft"
            role="progressbar"
            aria-valuenow={passedCount}
            aria-valuemin={0}
            aria-valuemax={MODULES.length}
            aria-label="Zones cleared"
          >
            <motion.div
              className="fill-gradient h-full rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${mounted ? (passedCount / MODULES.length) * 100 : 0}%` }}
              transition={{ duration: reduce ? 0 : 1.1, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
            />
          </div>
          <span className="shrink-0 font-mono text-xs text-ink-muted">
            {mounted ? passedCount : 0}/{MODULES.length} zones
          </span>
        </div>
      </header>

      {/* ------------------------------ the circuit ------------------------------ */}
      <ol className="relative mx-auto max-w-5xl py-10">
        {/* circuit rail */}
        <div
          ref={railRef}
          aria-hidden
          className="pointer-events-none absolute bottom-10 left-6 top-10 w-[3px] -translate-x-1/2 rounded-full bg-line/60 md:left-1/2 md:w-1"
        >
          <motion.div
            className="absolute left-0 top-0 w-full rounded-full"
            style={{
              background: "linear-gradient(180deg, #22d3ee 0%, #6366f1 100%)",
              boxShadow: "0 0 14px rgba(34,211,238,0.5)",
            }}
            initial={{ height: 0 }}
            animate={{ height: fillPx }}
            transition={reduce ? { duration: 0 } : { duration: 1.6, ease: [0.22, 1, 0.36, 1], delay: 0.35 }}
          />
          {fillPx > 10 && !reduce && (
            <motion.div
              className="absolute left-1/2 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-cyan-200"
              style={{ boxShadow: "0 0 16px 5px rgba(34,211,238,0.55)" }}
              initial={{ top: 0, opacity: 0 }}
              animate={{ top: [0, fillPx], opacity: [0, 1, 1, 0] }}
              transition={{ duration: 2.4, delay: 1.15, ease: "easeInOut", times: [0, 0.12, 0.88, 1] }}
            />
          )}
        </div>

        <span
          aria-hidden
          className="absolute left-6 top-1 -translate-x-1/2 font-mono text-[9px] tracking-[0.22em] text-ink-faint md:left-1/2"
        >
          START
        </span>
        <span
          aria-hidden
          className="absolute bottom-1 left-6 -translate-x-1/2 font-mono text-[9px] tracking-[0.22em] text-ink-faint md:left-1/2"
        >
          THE CORE
        </span>

        {MODULES.map((m, i) => {
          const status = statuses[i];
          const zone = zoneFor(m.id);
          const lessons = lessonsForModule(m.id);
          const done = (progress[m.id]?.lessonsDone ?? []).filter((id) =>
            lessons.some((l) => l.id === id),
          ).length;
          const lessonPct = lessons.length ? Math.round((done / lessons.length) * 100) : 0;

          return (
            <li key={m.id} className="relative pb-12 pl-16 last:pb-2 md:pb-16 md:pl-0">
              {/* node */}
              <div
                ref={(el) => {
                  nodeRefs.current[i] = el;
                }}
                className="absolute left-6 top-9 z-10 -translate-x-1/2 md:left-1/2"
              >
                <ZoneNode status={status} zone={zone} index={i} reduce={reduce} />
              </div>

              <div className="md:grid md:grid-cols-2 md:gap-28">
                <motion.div
                  initial={{ opacity: 0, y: 26 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ duration: reduce ? 0 : 0.55, delay: reduce ? 0 : (i % 2) * 0.08, ease: "easeOut" }}
                  className={i % 2 === 0 ? "md:col-start-1" : "md:col-start-2 md:row-start-1"}
                >
                  <ZoneCard
                    m={m}
                    zone={zone}
                    status={status}
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

function ZoneNode({
  status,
  zone,
  index,
  reduce,
}: {
  status: Status;
  zone: ReturnType<typeof zoneFor>;
  index: number;
  reduce: boolean;
}) {
  const base = "grid h-12 w-12 place-items-center rounded-full border text-sm font-bold";
  if (status === "passed") {
    return (
      <motion.span
        initial={reduce ? false : { scale: 0.4, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: reduce ? 0 : 0.5 + index * 0.12, type: "spring", stiffness: 260, damping: 18 }}
        className={`${base} relative border-transparent`}
        style={{
          background: `linear-gradient(135deg, ${zone.hue[0]}, ${zone.hue[1]})`,
          color: "#071019",
          boxShadow: `0 0 22px ${zone.hue[0]}66`,
        }}
        aria-label={`${zone.name} cleared`}
      >
        <CheckIcon width={18} height={18} />
        <span className="absolute -right-1 -top-1 text-xs text-amber-300" aria-hidden>
          ★
        </span>
      </motion.span>
    );
  }
  if (status === "frontier") {
    return (
      <span
        className={`${base} node-frontier border-accent/70 bg-panel`}
        style={{ color: zone.hue[0] }}
        aria-current="step"
        aria-label={`${zone.name} — you are here`}
      >
        {zone.glyph}
      </span>
    );
  }
  if (status === "available") {
    return (
      <span className={`${base} border-accent/40 bg-panel text-ink-muted`} aria-label={`${zone.name} available`}>
        {zone.glyph}
      </span>
    );
  }
  return (
    <span className={`${base} border-line bg-panel-soft text-ink-faint`} aria-label={`${zone.name} locked`}>
      <LockIcon width={15} height={15} />
    </span>
  );
}

function ZoneCard({
  m,
  zone,
  status,
  done,
  total,
  lessonPct,
}: {
  m: (typeof MODULES)[number];
  zone: ReturnType<typeof zoneFor>;
  status: Status;
  done: number;
  total: number;
  lessonPct: number;
}) {
  const unlocked = status !== "locked";
  const shell = `block h-full rounded-xl border px-5 py-4 transition-all duration-200 ${
    status === "frontier"
      ? "border-accent/45 bg-panel shadow-glow"
      : status === "passed"
        ? "border-ok/25 bg-panel hover:border-ok/45"
        : unlocked
          ? "border-line bg-panel hover:-translate-y-0.5 hover:border-accent/50 hover:shadow-glow"
          : "border-line/70 bg-panel/50"
  }`;

  const chip =
    status === "passed" ? (
      <span className="chip border-ok/40 text-ok">
        <CheckIcon width={12} height={12} /> cleared ★
      </span>
    ) : status === "frontier" ? (
      <span className="chip border-accent/50 text-accent">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
        </span>
        you are here
      </span>
    ) : status === "locked" ? (
      <span className="chip">
        <LockIcon width={11} height={11} /> fogged
      </span>
    ) : (
      <span className="chip border-accent/30 text-ink-muted">unlocked</span>
    );

  const body = (
    <>
      <div className="flex items-center justify-between gap-2">
        <span
          className="font-mono text-[10px] uppercase tracking-[0.18em]"
          style={{ color: zone.hue[0] }}
        >
          {zone.glyph} {zone.name}
        </span>
        {chip}
      </div>
      <h2 className="mt-2 text-lg font-bold text-ink">{m.title}</h2>
      <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-ink-muted">
        {status === "locked" ? "This district is still under fog. Clear the previous boss to lift it." : zone.story}
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
              {status === "passed" ? "★ zone cleared" : `${done}/${total} quests`}
            </span>
          </>
        ) : (
          <span className="text-xs text-ink-faint">
            Beat the boss of{" "}
            {m.prereqIds.map((p) => zoneFor(p).name).join(" and ")} to enter
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
