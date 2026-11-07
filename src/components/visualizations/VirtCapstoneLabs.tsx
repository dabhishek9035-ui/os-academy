"use client";

import { SimShell } from "./SimShell";
import {
  virtualizationEngine,
  multiprocEngine,
  VIRT_LAYERS,
  type VirtAction,
  type VirtState,
  type MultiAction,
  type MultiState,
} from "@/modules/virtualization/engine";
import { capstoneEngine, CAPSTONE_STAGES, type CapstoneAction, type CapstoneState } from "@/modules/capstone/engine";
import { processColor } from "@/types";
import type { SimAction } from "@/types";

// ---------------------------------------------------------------------------
// virtualization lab
// ---------------------------------------------------------------------------

export function VirtualizationLab() {
  return (
    <SimShell
      engine={virtualizationEngine}
      title="Virtualization Lab"
      description="Peel the layers of a VM and a container; overcommit the vCPUs and watch the hypervisor react."
      toolbar={(sim) => (
        <select
          className="rounded-md border border-line bg-panel px-2 py-1 text-xs"
          value={sim.state.mode}
          onChange={(e) => sim.dispatch({ type: "set-mode", payload: e.target.value })}
          aria-label="Isolation model"
        >
          <option value="vm">Virtual machine</option>
          <option value="container">Container</option>
        </select>
      )}
      note="Static teaching stacks; vCPU loads drift toward targets with a toy damped model. Overcommit = combined vCPU demand above host capacity — real hypervisors time-slice, balloon, or swap."
      compact
    >
      {(sim) => <VirtViz state={sim.state} dispatch={sim.dispatch} />}
    </SimShell>
  );
}

type VirtDispatch = (a: SimAction<VirtAction>) => void;

function VirtViz({ state, dispatch }: { state: VirtState; dispatch: VirtDispatch }) {
  const layers = VIRT_LAYERS[state.mode];
  const total = state.vcpus.reduce((a, v) => a + v.load, 0);
  return (
    <div className="grid gap-3 sm:grid-cols-[1fr_240px]">
      <ol className="space-y-1.5">
        {layers.map((layer, i) => (
          <li
            key={layer}
            className={`rounded-lg border px-3 py-2 text-sm ${
              layer.includes("kernel")
                ? "border-accent/50 bg-accent-soft text-ink"
                : "border-line bg-panel-soft text-ink-muted"
            }`}
            style={{ marginLeft: i * 10 }}
          >
            {layer}
          </li>
        ))}
      </ol>
      <div className="space-y-2">
        <div className="rounded-lg border border-line bg-bg-soft p-3">
          <span className="section-label">vCPU loads</span>
          {state.vcpus.map((v) => (
            <label key={v.id} className="mt-2 block text-xs text-ink-muted">
              <span className="flex justify-between">
                <span>{v.id}</span>
                <span className="font-mono">{v.load}%</span>
              </span>
              <input
                type="range"
                min={0}
                max={100}
                value={v.target}
                onChange={(e) => dispatch({ type: "set-vcpu-load", payload: { id: v.id, target: Number(e.target.value) } })}
                className="mt-0.5 w-full accent-[rgb(var(--accent))]"
                aria-label={`${v.id} target load`}
              />
            </label>
          ))}
          <p className={`mt-2 rounded-md px-2 py-1 text-[11px] ${total > state.hostCpuCapacity ? "bg-warn/15 text-warn" : "text-ink-faint"}`}>
            demand {total}/{state.hostCpuCapacity}%
            {total > state.hostCpuCapacity ? " — OVERCOMMIT" : ""}
          </p>
        </div>
        <div className="rounded-lg border border-line bg-bg-soft p-3 text-[11px] leading-relaxed text-ink-muted">
          {state.mode === "vm" ? (
            <>
              <strong className="text-ink">VM:</strong> each guest boots its own kernel on emulated
              hardware. Strong isolation; heavy.
            </>
          ) : (
            <>
              <strong className="text-ink">Container:</strong> processes share the host kernel,
              isolated by namespaces/cgroups. Light; kernel bugs are shared infrastructure.
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// multiprocessor + real-time lab
// ---------------------------------------------------------------------------

export function MultiprocLab() {
  return (
    <SimShell
      engine={multiprocEngine}
      title="Multiprocessor Lab"
      description="Place tasks on multiple CPUs (longest-first) and meet real-time deadlines."
      toolbar={(sim) => (
        <div className="flex flex-wrap gap-1.5">
          {[1, 2, 3, 4].map((d) => (
            <button key={d} type="button" className="btn text-xs" onClick={() => sim.dispatch({ type: "add-task", payload: d })}>
              + task ({d})
            </button>
          ))}
        </div>
      )}
      note="List scheduling in LPT order (longest processing time first) on identical CPUs. The real-time panel below simulates EDF over one hyperperiod (deadline = period); deadline misses mean the task set is infeasible."
      inspector={(sim) => <RtPanel engineDispatch={sim.dispatch} state={sim.state} />}
    >
      {(sim) => <MpViz state={sim.state} />}
    </SimShell>
  );
}

function MpViz({ state }: { state: MultiState }) {
  const maxEnd = Math.max(1, ...state.tasks.map((t) => t.end ?? 0));
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        {state.cpus.map((c, i) => (
          <div key={c.id} className="flex items-center gap-2">
            <span className="w-12 font-mono text-xs text-ink-muted">{c.id}</span>
            <div className="relative h-6 grow overflow-hidden rounded border border-line bg-bg-soft">
              {state.tasks
                .filter((t) => t.start !== null && (t.end === null || state.clock <= (t.end ?? 0)))
                .filter((t) => state.cpus.findIndex((x) => x.task === t.id) === i)
                .map((t) => (
                  <div
                    key={t.id}
                    className="absolute top-0 h-full rounded-sm"
                    style={{
                      left: `${((t.start ?? 0) / maxEnd) * 100}%`,
                      width: `${(t.duration / maxEnd) * 100}%`,
                      background: processColor(Number(t.id.replace(/\D/g, "")) - 1),
                      opacity: t.end !== null ? 0.5 : 0.9,
                    }}
                    title={`${t.id}: ${t.start}→${t.end ?? "…"}`}
                  />
                ))}
            </div>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-1.5">
        <span className="section-label mr-1">Tasks</span>
        {state.tasks.map((t) => (
          <span key={t.id} className="chip text-[10px]">
            {t.id}({t.duration}) {t.end !== null ? `done@${t.end}` : t.start !== null ? "running" : "waiting"}
          </span>
        ))}
      </div>
    </div>
  );
}

function RtPanel({ state, engineDispatch }: { state: MultiState; engineDispatch: (a: SimAction<MultiAction>) => void }) {
  // The RT view lives with the multiproc lab for module 12; it reads the same
  // dispatch channel but drives the rt engine through a dedicated event.
  void state;
  return (
    <div className="rounded-lg border border-line bg-bg-soft p-3 text-xs text-ink-muted">
      <span className="section-label">Real-time (EDF)</span>
      <p className="mt-1.5 leading-relaxed">
        The RT simulator lives on the{" "}
        <a href="/playground/multiproc-lab" className="link">
          lab page
        </a>{" "}
        beside this panel — add a periodic task there to see deadline misses
        appear when utilization exceeds 1.
      </p>
      <button type="button" className="btn mt-2 text-xs" onClick={() => engineDispatch({ type: "tick" })}>
        step CPUs
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// capstone
// ---------------------------------------------------------------------------

export function CapstoneLab() {
  return (
    <SimShell
      engine={capstoneEngine}
      title="End-to-End Computer Simulator"
      description="Follow one program from load to exit — and see which subsystems show up at each stage."
      note="A guided narrative over simplified state; each stage links to the module that teaches it in depth."
      compact
    >
      {(sim) => <CapstoneViz state={sim.state} dispatch={sim.dispatch} />}
    </SimShell>
  );
}

type CapDispatch = (a: SimAction<CapstoneAction>) => void;

function CapstoneViz({ state, dispatch }: { state: CapstoneState; dispatch: CapDispatch }) {
  const stage = CAPSTONE_STAGES[Math.min(state.stageIndex, CAPSTONE_STAGES.length - 1)];
  return (
    <div className="grid gap-3 lg:grid-cols-[260px_1fr]">
      <ol className="space-y-1">
        {CAPSTONE_STAGES.map((s, i) => {
          const active = i === state.stageIndex && !state.done;
          const past = i < state.stageIndex || state.done;
          return (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => dispatch({ type: "jump", payload: i })}
                aria-current={active ? "step" : undefined}
                className={`w-full rounded-lg border px-3 py-1.5 text-left text-xs transition-colors ${
                  active
                    ? "border-accent bg-accent-soft text-ink"
                    : past
                      ? "border-line bg-panel-soft text-ink-faint"
                      : "border-line text-ink-muted hover:border-accent/40"
                }`}
              >
                {i + 1}. {s.title}
              </button>
            </li>
          );
        })}
      </ol>
      <div className="rounded-lg border border-line bg-bg-soft p-4">
        <h3 className="text-base font-semibold text-ink">{stage.title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">{stage.narrative}</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {stage.subsystems.map((s) => (
            <span key={s} className="chip text-[10px]">
              {s}
            </span>
          ))}
          <a href={`/lesson/${stage.lessonRef}`} className="chip text-[10px] hover:border-accent/50">
            lesson: {stage.lessonRef.split("/")[1]?.replace(/-/g, " ")} ↗
          </a>
        </div>
        {state.progress > 0 && !state.done ? (
          <div className="mt-3 h-1 overflow-hidden rounded-full bg-panel" aria-hidden>
            <div className="h-full bg-accent transition-all" style={{ width: `${state.progress * 100}%` }} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
