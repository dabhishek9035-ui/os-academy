"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { missionsFor } from "@/lib/game/missions";
import { useGameStore } from "@/lib/game/player";
import { useSfx } from "@/lib/game/sfx";
import { bumpMood } from "@/lib/game/mood";

/**
 * Mission layer for sim labs. Rendered by SimShell when the lab has
 * missions; evaluates predicates on every engine state change. Engines stay
 * pure — this only READS state and records results in the game store.
 */
export function MissionPanel({ simId, state }: { simId: string; state: unknown }) {
  const missions = missionsFor(simId);
  const recordMission = useGameStore((s) => s.recordMission);
  const addBonusXp = useGameStore((s) => s.addBonusXp);
  const doneMap = useGameStore((s) => s.missions);
  const sfx = useSfx();
  const firedRef = useRef<Set<string>>(new Set());

  // evaluate on state change
  useEffect(() => {
    for (const m of missions) {
      if (firedRef.current.has(m.id)) continue;
      if (doneMap[m.id]?.done) {
        firedRef.current.add(m.id);
        continue;
      }
      let ok = false;
      try {
        ok = m.evaluate(state);
      } catch {
        ok = false;
      }
      if (ok) {
        firedRef.current.add(m.id);
        recordMission(m.id, true);
        const xp = m.xp ?? 40;
        addBonusXp(`Mission — ${m.title}`, xp);
        sfx("unlock");
        bumpMood("cheer");
      }
    }
  }, [state, missions, doneMap, recordMission, addBonusXp, sfx]);

  if (missions.length === 0) return null;

  return (
    <section className="rounded-xl border border-accent/30 bg-accent-soft/40 p-4" aria-label="Lab missions">
      <p className="section-label">🎯 Missions</p>
      <ul className="mt-2 space-y-2">
        {missions.map((m) => {
          const done = Boolean(doneMap[m.id]?.done);
          return (
            <li key={m.id} className="flex items-start gap-2.5">
              <span
                className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border text-[11px] ${
                  done ? "border-ok/60 bg-ok/15 text-ok" : "border-line text-ink-faint"
                }`}
                aria-hidden
              >
                {done ? "✓" : ""}
              </span>
              <div className="min-w-0">
                <p className={`text-sm font-medium ${done ? "text-ok" : "text-ink"}`}>
                  {m.title}
                  <span className="ml-2 font-mono text-[10px] text-ink-faint">+{m.xp ?? 40} XP</span>
                </p>
                <p className="text-xs leading-relaxed text-ink-muted">{m.desc}</p>
                {m.setup && !done ? (
                  <p className="mt-0.5 text-[11px] italic text-ink-faint">Hint: {m.setup}</p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
      <AnimatePresence>
        {/* success flash rendered when everything just completed */}
        {missions.every((m) => doneMap[m.id]?.done) && (
          <motion.p
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-3 rounded-lg border border-ok/40 bg-ok/10 px-3 py-1.5 text-center text-sm font-bold text-ok"
            role="status"
          >
            🏆 All missions clear — the zone remembers.
          </motion.p>
        )}
      </AnimatePresence>
    </section>
  );
}
