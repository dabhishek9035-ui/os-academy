"use client";

import { SimShell } from "./SimShell";
import {
  filesystemEngine,
  type FsAction,
  type FsState,
} from "@/modules/filesystems/engine";
import {
  diskEngine,
  type DiskAction,
  type DiskState,
} from "@/modules/io/disk-engine";
import type { SimAction } from "@/types";

// ---------------------------------------------------------------------------
// filesystem lab
// ---------------------------------------------------------------------------

export function FilesystemLab() {
  return (
    <SimShell
      engine={filesystemEngine}
      title="Filesystem Lab"
      description="Create, read and delete files; watch blocks, inodes and free space respond."
      toolbar={(sim) => (
        <select
          className="rounded-md border border-line bg-panel px-2 py-1 text-xs"
          value={sim.state.allocation}
          onChange={(e) => sim.dispatch({ type: "set-allocation", payload: e.target.value })}
          aria-label="Allocation method"
        >
          <option value="contiguous">Contiguous</option>
          <option value="linked">Linked</option>
          <option value="indexed">Indexed</option>
        </select>
      )}
      note="32 blocks; size limit 1–8 per file. Switching allocation method reformats the disk (files are wiped — like a real mkfs). Contiguous creates fail honestly when free space is fragmented; indexed allocation spends one block per file on the index."
      inspector={(sim) => <InodePanel state={sim.state} dispatch={sim.dispatch} />}
    >
      {(sim) => <FsViz state={sim.state} dispatch={sim.dispatch} />}
    </SimShell>
  );
}

type FsDispatch = (a: SimAction<FsAction>) => void;

function FsViz({ state, dispatch }: { state: FsState; dispatch: FsDispatch }) {
  const owner = new Map<string, string>();
  let colorIdx = 0;
  const palette = ["var(--p-blue)", "var(--p-green)", "var(--p-amber)", "var(--p-violet)", "var(--p-cyan)", "var(--p-pink)"];
  for (const f of state.files) {
    if (!owner.has(f.name)) owner.set(f.name, palette[colorIdx++ % palette.length]);
  }
  return (
    <div className="space-y-3">
      {state.error ? (
        <p role="alert" className="rounded-lg border border-bad/40 bg-bad/10 px-3 py-2 text-xs text-ink">
          {state.error}
        </p>
      ) : null}
      <div className="rounded-lg border border-line bg-bg-soft p-3">
        <span className="section-label">Block map ({state.allocation})</span>
        <div className="mt-2 grid grid-cols-8 gap-1 sm:grid-cols-16">
          {state.used.map((u, i) => {
            const file = state.files.find((f) => f.blocks.includes(i) || f.indexBlock === i);
            const isIndex = file?.indexBlock === i;
            return (
              <div
                key={i}
                className={`grid aspect-square place-items-center rounded border text-[9px] font-mono ${
                  u
                    ? isIndex
                      ? "border-warn/70 bg-warn/15 text-warn"
                      : "border-line text-ink"
                    : "border-dashed border-line/70 text-ink-faint"
                }`}
                style={u && file && !isIndex ? { background: owner.get(file.name), color: "var(--panel)" } : undefined}
                title={u ? `block ${i}: ${file?.name ?? "?"}${isIndex ? " (index)" : ""}` : `block ${i}: free`}
              >
                {i}
              </div>
            );
          })}
        </div>
        <p className="mt-1.5 text-[11px] text-ink-faint">
          Amber blocks are index blocks. Hover any block for its owner.
        </p>
      </div>

      <form
        className="flex flex-wrap items-center gap-2"
        action="#"
        onSubmit={(e) => {
          e.preventDefault();
          const input = (e.currentTarget.elements.namedItem("path") as HTMLInputElement);
          const size = (e.currentTarget.elements.namedItem("size") as HTMLInputElement);
          dispatch({ type: "create", payload: { path: input.value, sizeBlocks: Number(size.value) } });
          input.value = "";
        }}
      >
        <input
          name="path"
          className="w-40 rounded-md border border-line bg-panel px-2 py-1 text-xs"
          placeholder="/docs/notes.txt"
          aria-label="New file path"
        />
        <input
          name="size"
          type="number"
          min={1}
          max={8}
          defaultValue={2}
          className="w-16 rounded-md border border-line bg-panel px-2 py-1 text-xs"
          aria-label="Size in blocks"
        />
        <button type="submit" className="btn text-xs">
          create
        </button>
      </form>
    </div>
  );
}

function InodePanel({ state, dispatch }: { state: FsState; dispatch: FsDispatch }) {
  return (
    <div className="rounded-lg border border-line bg-bg-soft p-3">
      <span className="section-label">Files (inode table)</span>
      {state.files.length === 0 ? (
        <p className="mt-1.5 text-xs text-ink-faint">Disk is empty — create a file.</p>
      ) : (
        <ul className="mt-1.5 space-y-1.5">
          {state.files.map((f) => (
            <li key={f.inode} className="rounded-md border border-line bg-panel px-2 py-1.5 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-ink">{f.name}</span>
                <span className="flex gap-1">
                  <button type="button" className="chip hover:border-accent/50" onClick={() => dispatch({ type: "read", payload: f.name })}>
                    read
                  </button>
                  <button type="button" className="chip hover:border-bad/60" onClick={() => dispatch({ type: "delete", payload: f.name })}>
                    delete
                  </button>
                </span>
              </div>
              <p className="mt-0.5 font-mono text-[10px] text-ink-faint">
                inode {f.inode} · {f.sizeBlocks} blk · {f.perms} · blocks [{f.blocks.join(", ")}]
                {f.indexBlock !== undefined ? ` +idx ${f.indexBlock}` : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
      {state.operationTrace.length > 0 ? (
        <p className="mt-2 font-mono text-[10px] text-accent">
          last read traced: {state.operationTrace.join(" → ")}
        </p>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// disk scheduling lab
// ---------------------------------------------------------------------------

const CYL_PX = 3.4;

export function DiskSchedulingLab() {
  return (
    <SimShell
      engine={diskEngine}
      missionSimId="disk-scheduling-lab"
      title="Disk Scheduling Lab"
      description="Race FCFS, SSTF, SCAN, C-SCAN, LOOK and C-LOOK over the same request queue."
      toolbar={(sim) => (
        <select
          className="rounded-md border border-line bg-panel px-2 py-1 text-xs"
          value={sim.state.algorithm}
          onChange={(e) => sim.dispatch({ type: "set-algorithm", payload: e.target.value })}
          aria-label="Disk algorithm"
        >
          {["fcfs", "sstf", "scan", "c-scan", "look", "c-look"].map((a) => (
            <option key={a} value={a}>
              {a.toUpperCase()}
            </option>
          ))}
        </select>
      )}
      note="200-cylinder disk; movement is measured in cylinders (no rotational latency or seek curve). C-SCAN counts the wrap as a full sweep; C-LOOK counts the jump to the lowest request. Total movement is computed for the whole run."
      inspector={(sim) => <DiskMetrics state={sim.state} />}
    >
      {(sim) => <DiskViz state={sim.state} dispatch={sim.dispatch} />}
    </SimShell>
  );
}

type DiskDispatch = (a: SimAction<DiskAction>) => void;

function DiskViz({ state, dispatch }: { state: DiskState; dispatch: DiskDispatch }) {
  const height = 190;
  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-line bg-bg-soft p-3">
        <svg viewBox={`0 0 240 ${height + 12}`} className="w-full" role="img" aria-label="Disk head path over cylinders">
          {/* vertical cylinder gridlines with labels along the bottom */}
          {Array.from({ length: 10 }, (_, i) => {
            const cyl = i * 20;
            const x = 30 + cyl * CYL_PX;
            return (
              <g key={i}>
                <line x1={x} y1={8} x2={x} y2={height - 12} stroke="var(--line)" strokeWidth={0.6} />
                <text x={x} y={height + 2} fontSize={8} fill="var(--ink-faint)" fontFamily="monospace" textAnchor="middle">
                  {cyl}
                </text>
              </g>
            );
          })}
          {/* pending request ticks */}
          {state.requests.map((r, i) => (
            <line
              key={`req-${i}`}
              x1={30 + r * CYL_PX}
              y1={8}
              x2={30 + r * CYL_PX}
              y2={height - 12}
              stroke="var(--line)"
              strokeWidth={1}
              strokeDasharray="2 3"
            />
          ))}
          {/* head path up to cursor */}
          <polyline
            points={state.schedule.path
              .slice(0, state.cursor + 1)
              .map((c, i) => `${30 + c * CYL_PX},${height - 14 - i * 18}`)
              .join(" ")}
            fill="none"
            stroke="var(--accent)"
            strokeWidth={1.8}
          />
          {state.schedule.path.slice(0, state.cursor + 1).map((c, i) => (
            <circle key={i} cx={30 + c * CYL_PX} cy={height - 14 - i * 18} r={3} fill="var(--accent)">
              <title>{`step ${i}: cylinder ${c}`}</title>
            </circle>
          ))}
        </svg>
        <p className="mt-1 text-[11px] text-ink-faint">
          Head starts at {state.schedule.path[0]}. Dashed lines are pending requests; the path climbs
          as each is serviced.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="section-label">Queue</span>
        {state.requests.map((r, i) => (
          <button
            key={`${r}-${i}`}
            type="button"
            className="chip hover:border-bad/60"
            title="Remove from queue"
            onClick={() => dispatch({ type: "remove-request", payload: i })}
          >
            {r} ✕
          </button>
        ))}
        <form
          action="#"
          className="flex items-center gap-1.5"
          onSubmit={(e) => {
            e.preventDefault();
            const input = e.currentTarget.elements.namedItem("cyl") as HTMLInputElement;
            dispatch({ type: "add-request", payload: Number(input.value) });
            input.value = "";
          }}
        >
          <input
            name="cyl"
            type="number"
            min={0}
            max={199}
            placeholder="cyl"
            className="w-16 rounded-md border border-line bg-panel px-2 py-1 text-xs"
            aria-label="Add cylinder request"
          />
          <button type="submit" className="btn text-xs">
            + request
          </button>
        </form>
        <button type="button" className="btn text-xs" onClick={() => dispatch({ type: "set-direction", payload: state.direction === "up" ? "down" : "up" })}>
          direction: {state.direction}
        </button>
      </div>
    </div>
  );
}

function DiskMetrics({ state }: { state: DiskState }) {
  return (
    <div className="rounded-lg border border-line bg-bg-soft p-3">
      <span className="section-label">Run</span>
      <dl className="mt-2 space-y-1 text-xs text-ink-muted">
        <div className="flex justify-between">
          <dt>Algorithm</dt>
          <dd className="font-mono">{state.algorithm.toUpperCase()}</dd>
        </div>
        <div className="flex justify-between">
          <dt>Service order</dt>
          <dd className="max-w-44 text-right font-mono text-[10px]">{state.schedule.order.join(", ")}</dd>
        </div>
        <div className="flex justify-between">
          <dt>Total movement</dt>
          <dd className="font-mono text-ink">{state.schedule.movement} cylinders</dd>
        </div>
        <div className="flex justify-between">
          <dt>Serviced</dt>
          <dd className="font-mono">
            {state.cursor}/{state.schedule.order.length}
          </dd>
        </div>
      </dl>
    </div>
  );
}
