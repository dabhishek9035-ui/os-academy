"use client";

import { SimShell } from "./SimShell";
import { bootEngine, BOOT_STAGES } from "@/modules/intro-computers-os/boot-engine";

export function BootSequence() {
  return (
    <SimShell
      engine={bootEngine}
      title="Boot Sequence Stepper"
      description="Watch control pass from firmware to bootloader to kernel to your login screen."
      compact
      note="A linear model of the common UEFI path; Secure Boot verification and initramfs unpacking are folded into single stages."
    >
      {(sim) => (
        <ol className="space-y-2">
          {BOOT_STAGES.map((s, i) => {
            const isCurrent = i === sim.state.stageIndex && !sim.state.done;
            const isPast = i < sim.state.stageIndex || sim.state.done;
            return (
              <li
                key={s.id}
                aria-current={isCurrent ? "step" : undefined}
                className={`rounded-lg border px-3 py-2.5 transition-colors ${
                  isCurrent
                    ? "border-accent bg-accent-soft"
                    : isPast
                      ? "border-line bg-panel-soft opacity-80"
                      : "border-line bg-panel-soft opacity-50"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-ink">
                    {i + 1}. {s.name}
                  </h3>
                  {isCurrent ? (
                    <span className="chip text-[10px]">running now</span>
                  ) : isPast ? (
                    <span className="chip text-[10px] text-ok">done</span>
                  ) : null}
                </div>
                <p className="mt-1 text-xs text-ink-muted">{s.what}</p>
                {isCurrent ? (
                  <div
                    className="mt-2 h-1 overflow-hidden rounded-full bg-panel"
                    role="progressbar"
                    aria-valuenow={Math.round(sim.state.progress * 100)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${s.name} progress`}
                  >
                    <div
                      className="h-full bg-accent transition-all"
                      style={{ width: `${sim.state.progress * 100}%` }}
                    />
                  </div>
                ) : null}
                <div className="mt-2 grid gap-2 text-xs sm:grid-cols-2">
                  <div>
                    <span className="section-label">Can</span>
                    <ul className="mt-1 list-disc pl-4 text-ink-muted">
                      {s.can.map((c) => (
                        <li key={c}>{c}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <span className="section-label">Cannot (yet)</span>
                    <ul className="mt-1 list-disc pl-4 text-ink-muted">
                      {s.cannot.map((c) => (
                        <li key={c}>{c}</li>
                      ))}
                    </ul>
                  </div>
                </div>
                <p className="mt-2 text-[11px] text-accent">Hands control to: {s.handsTo}</p>
              </li>
            );
          })}
        </ol>
      )}
    </SimShell>
  );
}
