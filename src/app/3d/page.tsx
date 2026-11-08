"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useQualityTier } from "@/components/three/useQualityTier";
import { useSystemStore } from "@/lib/commands/system-store";
import { processColor } from "@/types";
import { CubeIcon } from "@/components/ui/icons";

/** Client-only: the R3F canvas is heavy and never needed for SSR. */
const SystemScene = dynamic(
  () => import("@/components/three/SystemScene").then((m) => m.SystemScene),
  { ssr: false, loading: () => <SceneLoading /> },
);

function SceneLoading() {
  return (
    <div className="absolute inset-0 grid place-items-center">
      <p className="text-sm text-ink-faint" role="status">
        Preparing the 3D scene…
      </p>
    </div>
  );
}

export default function ThreeDPage() {
  const { mounted, webgl, tier, reduced } = useQualityTier();
  const processes = useSystemStore((s) => s.processes.processes);
  const runningPid = useSystemStore((s) => s.processes.runningPid);
  const scheduling = useSystemStore((s) => s.scheduling);
  const dispatch = useSystemStore((s) => s.dispatch);
  const [beat, setBeat] = useState(false);

  // A gentle heartbeat advances the shared simulation so the scene lives.
  useEffect(() => {
    if (reduced) return;
    const id = window.setInterval(() => {
      dispatch("processes", { type: "tick" });
      setBeat((b) => !b);
    }, 1200);
    return () => window.clearInterval(id);
  }, [dispatch, reduced]);

  const live = useMemo(
    () => processes.filter((p) => p.state !== "terminated"),
    [processes],
  );

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="section-label flex items-center gap-1.5">
            <CubeIcon width={13} height={13} /> Immersive view
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-ink">The system in 3D</h1>
          <p className="mt-1.5 max-w-2xl text-sm text-ink-muted">
            The same simulation state as the 2D labs and the terminal, rendered
            as a landscape: the CPU core pulses while a process runs, one orb
            per live process (height = progress), RAM bars and the disk
            monolith at the edges. The 2D labs remain the source of truth —
            this view reads, it never rewrites.
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" className="btn text-xs" onClick={() => dispatch("processes", { type: "create", payload: { name: `app-${processes.length + 2}` } })}>
            + Spawn process
          </button>
          <Link href="/playground/terminal" className="btn text-xs">
            Drive it from the terminal
          </Link>
        </div>
      </header>

      <div className="relative h-[560px] overflow-hidden rounded-2xl border border-line bg-bg-soft sm:h-[480px]">
        {mounted && webgl ? (
          <SystemScene reduced={reduced} tier={tier} />
        ) : mounted ? (
          <div className="absolute inset-0 grid place-items-center bg-bg-soft">
            <div className="max-w-md px-6 text-center" role="status">
              <h2 className="text-sm font-semibold text-ink">WebGL is unavailable</h2>
              <p className="mt-2 text-sm text-ink-muted">
                No problem — the 3D view is an optional lens. Below is the same
                live state as a 2D panel; every lab in the course is fully 2D.
              </p>
            </div>
          </div>
        ) : null}

        {/* Solid, bordered panels over the scene: the DOM stays legible without blur or scrims. */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-3 p-4">
          <div className="card pointer-events-auto max-w-full px-4 py-3">
            <h2 className="section-label">Live processes</h2>
            {live.length === 0 ? (
              <p className="mt-1 text-xs text-ink-faint">None — spawn one to see an orb rise.</p>
            ) : (
              <ul className="mt-1.5 flex flex-wrap gap-2">
                {live.slice(0, 8).map((p, i) => (
                  <li
                    key={p.pid}
                    className="flex items-center gap-1.5 rounded-md border border-line bg-panel-soft px-2.5 py-1 text-xs"
                  >
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ background: processColor(i) }}
                      aria-hidden
                    />
                    <span className="font-mono text-ink">{p.pid}:{p.name}</span>
                    <span className={p.state === "running" ? "text-ok" : "text-ink-faint"}>{p.state}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="card pointer-events-auto px-4 py-3">
            <h2 className="section-label">Scheduler</h2>
            <p className="mt-1 font-mono text-xs text-ink">
              {scheduling.algorithm.toUpperCase()} · {scheduling.result.timeline.length} decisions
              {runningPid !== null ? " · CPU busy" : " · CPU idle"}
              {beat ? " ●" : " ○"}
            </p>
          </div>
        </div>
      </div>

      <p className="text-xs text-ink-faint">
        Quality tier detected: <span className="font-mono">{tier}</span> · motion:{" "}
        <span className="font-mono">{reduced ? "reduced" : "full"}</span>. The scene
        pauses effects under reduced-motion preferences and falls back to the
        panel above without WebGL.
      </p>
    </div>
  );
}
