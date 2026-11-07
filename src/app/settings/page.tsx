"use client";

import { useState } from "react";
import { useSettingsStore } from "@/lib/settings/store";
import { useProgressStore } from "@/lib/progress/store";
import { useGameStore } from "@/lib/game/player";

export default function SettingsPage() {
  const theme = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const motion = useSettingsStore((s) => s.motion);
  const setMotion = useSettingsStore((s) => s.setMotion);
  const resetProgress = useProgressStore((s) => s.resetProgress);
  const resetGame = useGameStore((s) => s.resetGame);
  const sound = useGameStore((s) => s.sound);
  const setSound = useGameStore((s) => s.setSound);
  const quality = useGameStore((s) => s.quality);
  const setQuality = useGameStore((s) => s.setQuality);
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-ink">Settings</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Preferences are stored locally. Progress never leaves this browser.
        </p>
      </header>

      <section className="card panel-pad" aria-labelledby="theme-heading">
        <h2 id="theme-heading" className="text-base font-semibold text-ink">
          Theme
        </h2>
        <div className="mt-3 flex gap-2" role="radiogroup" aria-label="Theme">
          {(["dark", "light"] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="radio"
              aria-checked={theme === t}
              className={`btn ${theme === t ? "btn-primary" : ""}`}
              onClick={() => setTheme(t)}
            >
              {t === "dark" ? "Dark (laboratory)" : "Light (daylight)"}
            </button>
          ))}
        </div>
      </section>

      <section className="card panel-pad" aria-labelledby="sound-heading">
        <h2 id="sound-heading" className="text-base font-semibold text-ink">
          Machine sounds
        </h2>
        <p className="mt-1 text-sm text-ink-muted">
          Tiny synthesised effects (no files). Off by default.
        </p>
        <div className="mt-3 flex gap-2" role="radiogroup" aria-label="Machine sounds">
          {([false, true] as const).map((on) => (
            <button
              key={String(on)}
              type="button"
              role="radio"
              aria-checked={sound === on}
              className={`btn ${sound === on ? "btn-primary" : ""}`}
              onClick={() => setSound(on)}
            >
              {on ? "🔊 On" : "🔇 Off"}
            </button>
          ))}
        </div>
      </section>

      <section className="card panel-pad" aria-labelledby="quality-heading">
        <h2 id="quality-heading" className="text-base font-semibold text-ink">
          3D quality tier
        </h2>
        <p className="mt-1 text-sm text-ink-muted">
          “Auto” probes your machine for a few seconds and never upgrades
          itself. Every tier keeps the full game playable. Alt+Shift+Q also
          cycles tiers anywhere.
        </p>
        <div className="mt-3 flex flex-wrap gap-2" role="radiogroup" aria-label="3D quality tier">
          {(["auto", "high", "medium", "low"] as const).map((q) => (
            <button
              key={q}
              type="button"
              role="radio"
              aria-checked={quality === q}
              className={`btn ${quality === q ? "btn-primary" : ""}`}
              onClick={() => setQuality(q)}
            >
              {q}
            </button>
          ))}
        </div>
      </section>

      <section className="card panel-pad" aria-labelledby="motion-heading">
        <h2 id="motion-heading" className="text-base font-semibold text-ink">
          Motion
        </h2>
        <p className="mt-1 text-sm text-ink-muted">
          “System” follows your OS reduced-motion setting. Reduced motion
          disables transitions and autoplay animations; simulation stepping
          always works.
        </p>
        <div className="mt-3 flex gap-2" role="radiogroup" aria-label="Motion preference">
          {(["system", "full", "reduced"] as const).map((mo) => (
            <button
              key={mo}
              type="button"
              role="radio"
              aria-checked={motion === mo}
              className={`btn ${motion === mo ? "btn-primary" : ""}`}
              onClick={() => setMotion(mo)}
            >
              {mo}
            </button>
          ))}
        </div>
      </section>

      <section className="card panel-pad" aria-labelledby="data-heading">
        <h2 id="data-heading" className="text-base font-semibold text-ink">
          Local data
        </h2>
        <p className="mt-1 text-sm text-ink-muted">
          Resetting erases lesson completion, quiz attempts, unlock state, XP,
          badges, codex and streaks — the whole save file. This cannot be
          undone.
        </p>
        {confirming ? (
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-bad/40 bg-bad/10 px-3 py-2">
            <span className="text-sm text-ink">Really erase all progress?</span>
            <button
              type="button"
              className="btn border-bad/60 text-xs"
              onClick={() => {
                resetProgress();
                resetGame();
                setConfirming(false);
              }}
            >
              Yes, reset everything
            </button>
            <button type="button" className="btn btn-ghost text-xs" onClick={() => setConfirming(false)}>
              Cancel
            </button>
          </div>
        ) : (
          <button type="button" className="btn mt-3 border-bad/40" onClick={() => setConfirming(true)}>
            Reset all progress…
          </button>
        )}
      </section>

      <section className="card panel-pad text-xs leading-relaxed text-ink-faint">
        <h2 className="text-base font-semibold text-ink">About this data</h2>
        <p className="mt-1">
          Progress lives under the <code className="font-mono">visual-os-academy-progress</code>{" "}
          localStorage key (versioned schema with defensive recovery) and
          settings under <code className="font-mono">visual-os-academy-settings</code>. No
          account, no server, no tracking.
        </p>
      </section>
    </div>
  );
}
