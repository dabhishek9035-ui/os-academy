"use client";

import { SimShell } from "./SimShell";
import {
  computerEngine,
  PARTS,
  type ComputerAction,
  type ComputerState,
  type PartId,
} from "@/modules/intro-computers-os/computer-engine";
import type { SimAction } from "@/types";

const POS: Record<PartId, { x: number; y: number }> = {
  cpu: { x: 400, y: 210 },
  ram: { x: 180, y: 110 },
  disk: { x: 180, y: 310 },
  keyboard: { x: 630, y: 90 },
  screen: { x: 640, y: 210 },
  network: { x: 630, y: 330 },
};

const LINKS: [PartId, PartId][] = [
  ["cpu", "ram"],
  ["cpu", "disk"],
  ["cpu", "keyboard"],
  ["cpu", "screen"],
  ["cpu", "network"],
];

export function ComputerDiagram() {
  return (
    <SimShell
      engine={computerEngine}
      title="Computer Anatomy Explorer"
      description="Click a part to inspect it; send data between parts and watch it move."
      compact
      toolbar={(sim) => (
        <button
          type="button"
          className={`btn text-xs ${sim.state.viaOs ? "btn-primary" : "border-warn/60"}`}
          onClick={() => sim.dispatch({ type: "toggle-os" })}
          aria-pressed={!sim.state.viaOs}
        >
          OS broker: {sim.state.viaOs ? "ON" : "OFF (chaos)"}
        </button>
      )}
      note="Abstract 'data units' instead of real protocols; the OS toggle collapses kernel mediation into a single broker switch. Speeds are order-of-magnitude teaching values."
    >
      {(sim) => <Diagram state={sim.state} dispatch={sim.dispatch} />}
    </SimShell>
  );
}

function Diagram({
  state,
  dispatch,
}: {
  state: ComputerState;
  dispatch: (a: SimAction<ComputerAction>) => void;
}) {
  const selected = state.selected;
  return (
    <div className="space-y-3">
      <div className="grid gap-3 lg:grid-cols-[1fr_260px]">
        <div className="thin-scroll overflow-x-auto rounded-lg border border-line bg-bg-soft p-2">
          <svg viewBox="0 0 800 420" className="min-w-[560px]" role="img" aria-label="Diagram of computer parts connected to the CPU">
            {LINKS.map(([a, b]) => (
              <line
                key={`${a}-${b}`}
                x1={POS[a].x}
                y1={POS[a].y}
                x2={POS[b].x}
                y2={POS[b].y}
                stroke="var(--line)"
                strokeWidth={2}
              />
            ))}
            {/* in-flight transfers as moving dots */}
            {state.transfers.map((t) => {
              const a = POS[t.from];
              const b = POS[t.to];
              const x = a.x + (b.x - a.x) * t.progress;
              const y = a.y + (b.y - a.y) * t.progress;
              return (
                <g key={t.id}>
                  <circle
                    cx={x}
                    cy={y}
                    r={7}
                    fill={t.collided ? "rgb(var(--bad))" : "rgb(var(--accent))"}
                    opacity={0.9}
                  >
                    <title>{`${t.from} → ${t.to} (${Math.round(t.progress * 100)}%)`}</title>
                  </circle>
                  {t.collided ? (
                    <circle cx={x} cy={y} r={12} fill="none" stroke="rgb(var(--bad))" strokeWidth={1.5} />
                  ) : null}
                </g>
              );
            })}
            {/* OS broker bubble */}
            <g>
              <rect
                x={340}
                y={60}
                width={120}
                height={30}
                rx={8}
                fill="var(--panel)"
                stroke={state.viaOs ? "rgb(var(--accent))" : "var(--line)"}
                strokeDasharray={state.viaOs ? undefined : "4 3"}
              />
              <text x={400} y={79} textAnchor="middle" fontSize={12} fill={state.viaOs ? "rgb(var(--accent))" : "var(--ink-faint)"}>
                OS (kernel) {state.viaOs ? "arbitrating" : "bypassed"}
              </text>
            </g>
            {PARTS.map((p) => {
              const pos = POS[p.id];
              const isSel = selected === p.id;
              return (
                <g
                  key={p.id}
                  transform={`translate(${pos.x} ${pos.y})`}
                  className="cursor-pointer"
                  onClick={() => dispatch({ type: "select", payload: p.id })}
                  role="button"
                  tabIndex={0}
                  aria-label={`Select ${p.label}`}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") dispatch({ type: "select", payload: p.id });
                  }}
                >
                  <rect
                    x={-58}
                    y={-24}
                    width={116}
                    height={48}
                    rx={10}
                    fill="var(--panel)"
                    stroke={isSel ? "rgb(var(--accent))" : "var(--line)"}
                    strokeWidth={isSel ? 2 : 1.4}
                  />
                  <text textAnchor="middle" dy="5" fontSize={13} fill="var(--ink)" fontWeight={600}>
                    {p.label}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        <div className="space-y-3">
          {selected ? (
            <div className="rounded-lg border border-line bg-panel-soft px-3 py-2.5">
              {(() => {
                const info = PARTS.find((p) => p.id === selected)!;
                return (
                  <>
                    <h3 className="text-sm font-semibold text-ink">{info.label}</h3>
                    <p className="mt-1 text-xs text-ink-muted">{info.role}</p>
                    <p className="mt-1.5 font-mono text-xs text-accent">{info.speedLabel}</p>
                  </>
                );
              })()}
            </div>
          ) : null}
          <fieldset className="rounded-lg border border-line p-2.5">
            <legend className="section-label px-1">Send data from {selected ? PARTS.find((p) => p.id === selected)!.label : "…"}</legend>
            <div className="flex flex-wrap gap-1.5">
              {PARTS.filter((p) => p.id !== selected).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="chip hover:border-accent/50"
                  disabled={!selected}
                  onClick={() =>
                    dispatch({ type: "send", payload: { from: selected, to: p.id } })
                  }
                >
                  → {p.label}
                </button>
              ))}
            </div>
          </fieldset>
          <p className="text-xs text-ink-faint">
            Completed transfers: {state.completed}
            {state.collisions > 0 ? (
              <span className="text-bad"> · collisions: {state.collisions}</span>
            ) : null}
          </p>
        </div>
      </div>
    </div>
  );
}
