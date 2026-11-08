"use client";

import { useState } from "react";
import { useSettingsStore } from "@/lib/settings/store";
import { useProgressStore } from "@/lib/progress/store";
import { AccountPanel } from "@/components/settings/AccountPanel";

export default function SettingsPage() {
  const theme = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const motion = useSettingsStore((s) => s.motion);
  const setMotion = useSettingsStore((s) => s.setMotion);
  const ambient = useSettingsStore((s) => s.ambient);
  const setAmbient = useSettingsStore((s) => s.setAmbient);
  const resetProgress = useProgressStore((s) => s.resetProgress);
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-ink">Settings</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Everything runs locally by default. With cloud sync (your own
          Supabase project), signed-in progress is copied to your database and
          survives clearing site data.
        </p>
      </header>

      <AccountPanel />

      <section className="card panel-pad" aria-labelledby="theme-heading">
        <h2 id="theme-heading" className="text-base font-semibold text-ink">
          Theme
        </h2>
        <div className="mt-3 flex gap-2" role="radiogroup" aria-label="Theme">
          {(["light", "dark"] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="radio"
              aria-checked={theme === t}
              className={`btn ${theme === t ? "btn-primary" : ""}`}
              onClick={() => setTheme(t)}
            >
              {t === "dark" ? "Dark" : "Light (paper)"}
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

      <section className="card panel-pad" aria-labelledby="ambient-heading">
        <h2 id="ambient-heading" className="text-base font-semibold text-ink">
          3D background
        </h2>
        <p className="mt-1 text-sm text-ink-muted">
          A quiet contour-line field behind every page. It stays still when
          motion is reduced and switches itself off on low-power devices or
          without WebGL. Content never depends on it.
        </p>
        <div className="mt-3 flex gap-2" role="radiogroup" aria-label="3D background">
          {([true, false] as const).map((on) => (
            <button
              key={String(on)}
              type="button"
              role="radio"
              aria-checked={ambient === on}
              className={`btn ${ambient === on ? "btn-primary" : ""}`}
              onClick={() => setAmbient(on)}
            >
              {on ? "On" : "Off"}
            </button>
          ))}
        </div>
      </section>

      <section className="card panel-pad" aria-labelledby="data-heading">
        <h2 id="data-heading" className="text-base font-semibold text-ink">
          Local data
        </h2>
        <p className="mt-1 text-sm text-ink-muted">
          Resetting erases lesson completion, quiz attempts and unlock state.
          This cannot be undone.
        </p>
        {confirming ? (
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-bad/40 bg-bad/10 px-3 py-2">
            <span className="text-sm text-ink">Really erase all progress?</span>
            <button
              type="button"
              className="btn border-bad/60 text-xs"
              onClick={() => {
                resetProgress();
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
          tracking, no third parties — and nothing leaves this browser unless
          you sign in to cloud sync, which talks only to your own Supabase
          project.
        </p>
      </section>
    </div>
  );
}
